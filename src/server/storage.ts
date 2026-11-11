import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Group, GroupMember, Expense, Settlement, ActivityEvent, GuestInvite } from '../domain/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'splitsnap.db.json');
const JOURNAL_FILE = path.join(DATA_DIR, 'action_journal.jsonl');

export interface ActionJournalEntry {
  id: string;
  timestamp: string;
  action: string;
  entityType: 'group' | 'expense' | 'settlement' | 'invite' | 'user' | 'paypal' | 'system';
  entityId: string;
  actor: string;
  summary: string;
  details?: Record<string, any>;
}

export interface PersistentDatabase {
  version: number;
  createdAt: string;
  lastSavedAt: string;
  totalActionsCount: number;
  groups: Record<string, Group>;
  users: {
    id: string;
    name: string;
    phone: string;
    email: string;
    upiId: string;
    avatar: string;
  };
  runtimePayPalConfig: {
    clientId: string;
    clientSecret: string;
    environment: 'sandbox' | 'live';
    currency: string;
    exchangeRate?: number;
  };
  actionJournal: ActionJournalEntry[];
}

export class StorageEngine {
  private db: PersistentDatabase;
  private isSaving: boolean = false;
  private savePending: boolean = false;

  constructor(seedFactory: () => { groups: Record<string, Group>; users: PersistentDatabase['users'] }) {
    this.ensureDirectory();
    this.db = this.loadOrInitialize(seedFactory);
  }

  private ensureDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadOrInitialize(seedFactory: () => { groups: Record<string, Group>; users: PersistentDatabase['users'] }): PersistentDatabase {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as PersistentDatabase;
        if (parsed && parsed.groups && parsed.users) {
          console.log(`[StorageEngine] Loaded database from ${DB_FILE} (${Object.keys(parsed.groups).length} groups, ${parsed.actionJournal?.length || 0} memory actions).`);
          return parsed;
        }
      } catch (err: any) {
        console.error('[StorageEngine] Error parsing existing db file, fallback to seed:', err?.message);
      }
    }

    // Initialize fresh seed data
    console.log('[StorageEngine] Creating new persistent database file at ' + DB_FILE);
    const seed = seedFactory();
    const initialEntry: ActionJournalEntry = {
      id: `act_init_${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'SYSTEM_INITIALIZED',
      entityType: 'system',
      entityId: 'sys_core',
      actor: 'System Engine',
      summary: 'Persistent SplitSnap Database initialized with Hamilton-Hare ledger groups.',
      details: {
        groupsCount: Object.keys(seed.groups).length,
        user: seed.users.name,
      },
    };

    const initialDb: PersistentDatabase = {
      version: 1,
      createdAt: new Date().toISOString(),
      lastSavedAt: new Date().toISOString(),
      totalActionsCount: 1,
      groups: seed.groups,
      users: seed.users,
      runtimePayPalConfig: {
        clientId: process.env.PAYPAL_CLIENT_ID || 'sb',
        clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
        environment: ((process.env.PAYPAL_ENVIRONMENT as any) === 'live' ? 'live' : 'sandbox'),
        currency: process.env.PAYPAL_CURRENCY || 'USD',
        exchangeRate: 85,
      },
      actionJournal: [initialEntry],
    };

    this.saveDirect(initialDb);
    this.appendJournalDirect(initialEntry);
    return initialDb;
  }

  public getDatabase(): PersistentDatabase {
    return this.db;
  }

  public recordAction(params: {
    action: string;
    entityType: ActionJournalEntry['entityType'];
    entityId: string;
    actor: string;
    summary: string;
    details?: Record<string, any>;
  }): ActionJournalEntry {
    const entry: ActionJournalEntry = {
      id: `act_mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      actor: params.actor,
      summary: params.summary,
      details: params.details || {},
    };

    this.db.totalActionsCount = (this.db.totalActionsCount || 0) + 1;
    if (!this.db.actionJournal) {
      this.db.actionJournal = [];
    }

    // Keep latest 300 entries in the memory JSON snapshot for fast API responses
    this.db.actionJournal.unshift(entry);
    if (this.db.actionJournal.length > 300) {
      this.db.actionJournal = this.db.actionJournal.slice(0, 300);
    }

    // Append to immutable disk journal line-by-line
    this.appendJournalDirect(entry);

    // Save snapshot
    this.saveDatabase();

    return entry;
  }

  public resetToSeed(seedFactory: () => { groups: Record<string, Group>; users: PersistentDatabase['users'] }): void {
    const seed = seedFactory();
    this.db.groups = seed.groups;
    this.db.users = seed.users;
    this.recordAction({
      action: 'DATABASE_RESET',
      entityType: 'system',
      entityId: 'sys_core',
      actor: this.db.users.name || 'User',
      summary: 'Reset database state to showcase demonstration seed.',
    });
  }

  public saveDatabase(): void {
    if (this.isSaving) {
      this.savePending = true;
      return;
    }

    this.isSaving = true;
    this.db.lastSavedAt = new Date().toISOString();

    try {
      this.saveDirect(this.db);
    } catch (err: any) {
      console.error('[StorageEngine] Failed to save database to disk:', err?.message);
    } finally {
      this.isSaving = false;
      if (this.savePending) {
        this.savePending = false;
        this.saveDatabase();
      }
    }
  }

  private saveDirect(dbState: PersistentDatabase): void {
    this.ensureDirectory();
    const tempFile = `${DB_FILE}.tmp`;
    const jsonStr = JSON.stringify(dbState, null, 2);
    fs.writeFileSync(tempFile, jsonStr, 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  }

  private appendJournalDirect(entry: ActionJournalEntry): void {
    try {
      this.ensureDirectory();
      const line = JSON.stringify(entry) + '\n';
      fs.appendFileSync(JOURNAL_FILE, line, 'utf-8');
    } catch (err: any) {
      console.warn('[StorageEngine] Failed to append to action journal:', err?.message);
    }
  }

  public getStatus() {
    let journalSize = 0;
    try {
      if (fs.existsSync(JOURNAL_FILE)) {
        journalSize = fs.statSync(JOURNAL_FILE).size;
      }
    } catch {}

    let totalExpenses = 0;
    let totalSettlements = 0;
    Object.values(this.db.groups).forEach(g => {
      totalExpenses += (g.expenses || []).length;
      totalSettlements += (g.settlements || []).length;
    });

    return {
      status: 'connected',
      driver: 'Persistent Durable JSON Ledger + Append-Only Action Journal',
      dbPath: 'data/splitsnap.db.json',
      journalPath: 'data/action_journal.jsonl',
      createdAt: this.db.createdAt,
      lastSavedAt: this.db.lastSavedAt,
      groupsCount: Object.keys(this.db.groups).length,
      totalExpenses,
      totalSettlements,
      actionsInMemory: this.db.actionJournal.length,
      totalActionsRecorded: this.db.totalActionsCount || this.db.actionJournal.length,
      journalSizeBytes: journalSize,
    };
  }
}

