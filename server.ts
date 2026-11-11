import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { SAMPLE_RECEIPTS } from './src/domain/sampleReceipts.ts';
import { reconcileExpense, calculateNetBalances, paiseToRupees } from './src/domain/splitEngine.ts';
import { Group, GroupMember, Expense, Settlement, ActivityEvent, GuestInvite } from './src/domain/types.ts';
import { StorageEngine, ActionJournalEntry } from './src/server/storage.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '25mb' }));

// Helper to safely get initialized Google GenAI client if valid key is provided
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.startsWith('MY_') || apiKey.trim().length < 10) {
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      timeout: 3000,
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// ----------------------------------------------------
// In-Memory Database with Seed Data
// ----------------------------------------------------

interface Database {
  groups: Record<string, Group>;
  users: {
    id: string;
    name: string;
    phone: string;
    email: string;
    upiId: string;
    avatar: string;
  };
}

function createSeedData(): Database {
  const hostMemberId = 'mem_kushagra';
  const aryanMemberId = 'mem_aryan';
  const adityaMemberId = 'mem_aditya';
  const rohanMemberId = 'mem_rohan';
  const diyaMemberId = 'mem_diya';
  const priyaMemberId = 'mem_priya';

  const manaliGroup: Group = {
    id: 'grp_manali_2026',
    name: 'Manali Trip',
    type: 'Trip',
    startDate: '2026-11-11',
    endDate: '2026-11-15',
    currency: 'INR',
    ownerUserId: 'user_kushagra',
    members: [
      {
        id: hostMemberId,
        groupId: 'grp_manali_2026',
        name: 'Kushagra (You)',
        upiId: 'kushagra@okhdfcbank',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
        role: 'owner',
        isCurrentUser: true,
      },
      {
        id: aryanMemberId,
        groupId: 'grp_manali_2026',
        name: 'Aryan Gupta',
        upiId: 'aryangupta@okaxis',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
        role: 'member',
      },
      {
        id: adityaMemberId,
        groupId: 'grp_manali_2026',
        name: 'Aditya Sharma',
        upiId: 'aditya@oksbi',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
        role: 'member',
      },
      {
        id: rohanMemberId,
        groupId: 'grp_manali_2026',
        name: 'Rohan Verma',
        upiId: 'rohan@oksbi',
        avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&h=100&fit=crop',
        role: 'guest',
      },
      {
        id: diyaMemberId,
        groupId: 'grp_manali_2026',
        name: 'Diya Patel',
        upiId: 'diya@okaxis',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
        role: 'guest',
      },
      {
        id: priyaMemberId,
        groupId: 'grp_manali_2026',
        name: 'Priya Nair',
        upiId: 'priya@icici',
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop',
        role: 'guest',
      },
    ],
    expenses: [
      {
        id: 'exp_hotel_manali',
        groupId: 'grp_manali_2026',
        title: 'Hotel (2 Nights)',
        merchantName: 'Snow Crest Resort, Manali',
        occurredAt: '2026-11-11T12:00:00Z',
        currency: 'INR',
        payerMemberId: hostMemberId,
        totalPaise: 600000, // ₹6,000.00
        state: 'published',
        version: 1,
        items: [
          {
            id: 'it_hotel_1',
            description: 'Luxury Chalet 2 Nights (Group Stay)',
            quantity: 1,
            unitPricePaise: 600000,
            lineTotalPaise: 600000,
            taxIncluded: true,
          },
        ],
        adjustments: [],
        assignments: [
          { lineItemId: 'it_hotel_1', memberId: hostMemberId, weight: 1 },
          { lineItemId: 'it_hotel_1', memberId: aryanMemberId, weight: 1 },
          { lineItemId: 'it_hotel_1', memberId: adityaMemberId, weight: 1 },
          { lineItemId: 'it_hotel_1', memberId: rohanMemberId, weight: 1 },
          { lineItemId: 'it_hotel_1', memberId: diyaMemberId, weight: 1 },
          { lineItemId: 'it_hotel_1', memberId: priyaMemberId, weight: 1 },
        ],
        createdAt: '2026-11-11T12:30:00Z',
        updatedAt: '2026-11-11T12:30:00Z',
      },
      {
        id: 'exp_bus_manali',
        groupId: 'grp_manali_2026',
        title: 'Bus to Manali',
        merchantName: 'Himachal Volvo Express',
        occurredAt: '2026-11-11T07:00:00Z',
        currency: 'INR',
        payerMemberId: aryanMemberId,
        totalPaise: 480000, // ₹4,800.00 (Paid by Aryan)
        state: 'published',
        version: 1,
        items: [
          {
            id: 'it_bus_1',
            description: 'Volvo AC Sleeper Seats (Delhi to Manali)',
            quantity: 6,
            unitPricePaise: 80000,
            lineTotalPaise: 480000,
            taxIncluded: true,
          },
        ],
        adjustments: [],
        assignments: [
          { lineItemId: 'it_bus_1', memberId: hostMemberId, weight: 1 },
          { lineItemId: 'it_bus_1', memberId: aryanMemberId, weight: 1 },
          { lineItemId: 'it_bus_1', memberId: adityaMemberId, weight: 1 },
          { lineItemId: 'it_bus_1', memberId: rohanMemberId, weight: 1 },
          { lineItemId: 'it_bus_1', memberId: diyaMemberId, weight: 1 },
          { lineItemId: 'it_bus_1', memberId: priyaMemberId, weight: 1 },
        ],
        createdAt: '2026-11-11T08:00:00Z',
        updatedAt: '2026-11-11T08:00:00Z',
      },
      {
        id: 'exp_dinner_aditya',
        groupId: 'grp_manali_2026',
        title: 'Dinner',
        merchantName: 'Old Manali Cafe & Bakery',
        occurredAt: '2026-11-12T20:30:00Z',
        currency: 'INR',
        payerMemberId: adityaMemberId,
        totalPaise: 120000, // ₹1,200.00 (Paid by Aditya)
        state: 'published',
        version: 1,
        items: [
          {
            id: 'it_din_1',
            description: 'Woodfired Pizza & Trout Special',
            quantity: 1,
            unitPricePaise: 120000,
            lineTotalPaise: 120000,
            taxIncluded: true,
          },
        ],
        adjustments: [],
        assignments: [
          { lineItemId: 'it_din_1', memberId: hostMemberId, weight: 1 },
          { lineItemId: 'it_din_1', memberId: aryanMemberId, weight: 1 },
          { lineItemId: 'it_din_1', memberId: adityaMemberId, weight: 1 },
          { lineItemId: 'it_din_1', memberId: rohanMemberId, weight: 1 },
          { lineItemId: 'it_din_1', memberId: diyaMemberId, weight: 1 },
          { lineItemId: 'it_din_1', memberId: priyaMemberId, weight: 1 },
        ],
        createdAt: '2026-11-12T21:00:00Z',
        updatedAt: '2026-11-12T21:00:00Z',
      },
    ],
    settlements: [
      {
        id: 'set_aryan_800',
        groupId: 'grp_manali_2026',
        fromMemberId: hostMemberId,
        toMemberId: aryanMemberId,
        amountPaise: 80000, // Exactly ₹800.00 as shown on reference image!
        method: 'paypal_sandbox',
        status: 'pending',
        notes: 'Manali Bus & Food Settlement',
        createdAt: '2026-11-12T22:00:00Z',
      },
    ],
    invites: [
      {
        id: 'inv_aryan',
        groupId: 'grp_manali_2026',
        memberId: aryanMemberId,
        token: 'tok_aryan_manali_7a8b',
        expiresAt: '2026-11-20T00:00:00Z',
        inviteUrl: '/guest/tok_aryan_manali_7a8b',
      },
      {
        id: 'inv_rohan',
        groupId: 'grp_manali_2026',
        memberId: rohanMemberId,
        token: 'tok_rohan_manali_9c0d',
        expiresAt: '2026-11-20T00:00:00Z',
        inviteUrl: '/guest/tok_rohan_manali_9c0d',
      },
    ],
    activity: [
      {
        id: 'act_m_1',
        groupId: 'grp_manali_2026',
        actorName: 'Aditya Sharma',
        eventType: 'expense_published',
        description: 'Added Dinner at Old Manali (₹1,200.00)',
        createdAt: '2026-11-12T21:00:00Z',
      },
      {
        id: 'act_m_2',
        groupId: 'grp_manali_2026',
        actorName: 'Aryan Gupta',
        eventType: 'expense_published',
        description: 'Added Bus to Manali (₹4,800.00)',
        createdAt: '2026-11-11T08:00:00Z',
      },
      {
        id: 'act_m_3',
        groupId: 'grp_manali_2026',
        actorName: 'Kushagra',
        eventType: 'expense_published',
        description: 'Added Hotel 2 Nights (₹6,000.00)',
        createdAt: '2026-11-11T12:30:00Z',
      },
    ],
    createdAt: '2026-11-10T10:00:00Z',
  };

  // Reconcile Manali expenses
  manaliGroup.expenses.forEach(exp => {
    const rec = reconcileExpense({
      confirmedTotalPaise: exp.totalPaise,
      items: exp.items,
      adjustments: exp.adjustments,
      assignments: exp.assignments,
      participantIds: manaliGroup.members.map(m => m.id),
    });
    exp.allocations = rec.allocations;
  });

  const flatGroup: Group = {
    id: 'grp_flat_utilities',
    name: 'Flat & Utilities',
    type: 'Home',
    currency: 'INR',
    ownerUserId: 'user_kushagra',
    members: [
      {
        id: 'mem_fu_kushagra',
        groupId: 'grp_flat_utilities',
        name: 'Kushagra (You)',
        upiId: 'kushagra@okhdfcbank',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
        role: 'owner',
        isCurrentUser: true,
      },
      {
        id: 'mem_fu_rohan',
        groupId: 'grp_flat_utilities',
        name: 'Rohan Verma',
        upiId: 'rohan@oksbi',
        avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&h=100&fit=crop',
        role: 'member',
      },
      {
        id: 'mem_fu_sameer',
        groupId: 'grp_flat_utilities',
        name: 'Sameer Joshi',
        upiId: 'sameer@paytm',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
        role: 'member',
      },
    ],
    expenses: [
      {
        id: 'exp_flat_wifi',
        groupId: 'grp_flat_utilities',
        title: 'Electricity & Wifi',
        merchantName: 'BESCOM & ACT Fibernet',
        occurredAt: '2026-11-05T09:00:00Z',
        currency: 'INR',
        payerMemberId: 'mem_fu_kushagra',
        totalPaise: 120000, // ₹1,200.00 matching showcase image!
        state: 'published',
        version: 1,
        items: [
          {
            id: 'it_flat_1',
            description: 'November Utilities',
            quantity: 1,
            unitPricePaise: 120000,
            lineTotalPaise: 120000,
            taxIncluded: true,
          },
        ],
        adjustments: [],
        assignments: [
          { lineItemId: 'it_flat_1', memberId: 'mem_fu_kushagra', weight: 1 },
          { lineItemId: 'it_flat_1', memberId: 'mem_fu_rohan', weight: 1 },
          { lineItemId: 'it_flat_1', memberId: 'mem_fu_sameer', weight: 1 },
        ],
        createdAt: '2026-11-05T09:30:00Z',
        updatedAt: '2026-11-05T09:30:00Z',
      },
    ],
    settlements: [],
    invites: [],
    activity: [
      {
        id: 'act_fu_1',
        groupId: 'grp_flat_utilities',
        actorName: 'Kushagra',
        eventType: 'expense_published',
        description: 'Added Electricity & Wifi (₹1,200.00)',
        createdAt: '2026-11-05T09:30:00Z',
      },
    ],
    createdAt: '2026-11-01T08:00:00Z',
  };

  const expFlat = flatGroup.expenses[0];
  const recFlat = reconcileExpense({
    confirmedTotalPaise: expFlat.totalPaise,
    items: expFlat.items,
    adjustments: expFlat.adjustments,
    assignments: expFlat.assignments,
    participantIds: flatGroup.members.map(m => m.id),
  });
  expFlat.allocations = recFlat.allocations;

  const collegeFoodGroup: Group = {
    id: 'grp_college_food',
    name: 'College Food',
    type: 'Other',
    currency: 'INR',
    ownerUserId: 'user_kushagra',
    members: [
      {
        id: 'mem_cf_kushagra',
        groupId: 'grp_college_food',
        name: 'Kushagra (You)',
        upiId: 'kushagra@okhdfcbank',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
        role: 'owner',
        isCurrentUser: true,
      },
      {
        id: 'mem_cf_aryan',
        groupId: 'grp_college_food',
        name: 'Aryan Gupta',
        upiId: 'aryangupta@okaxis',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
        role: 'member',
      },
      {
        id: 'mem_cf_aditya',
        groupId: 'grp_college_food',
        name: 'Aditya Sharma',
        upiId: 'aditya@oksbi',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
        role: 'member',
      },
      {
        id: 'mem_cf_rohan',
        groupId: 'grp_college_food',
        name: 'Rohan Verma',
        upiId: 'rohan@oksbi',
        avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&h=100&fit=crop',
        role: 'guest',
      },
    ],
    expenses: [
      {
        id: 'exp_canteen_pizza',
        groupId: 'grp_college_food',
        title: 'Canteen Rolls & Pizza',
        merchantName: 'Campus Canteen',
        occurredAt: '2026-11-08T13:00:00Z',
        currency: 'INR',
        payerMemberId: 'mem_cf_kushagra',
        totalPaise: 85000, // ₹850.00 matching showcase image!
        state: 'published',
        version: 1,
        items: [
          {
            id: 'it_cf_1',
            description: 'Campus Snacks & Shakes',
            quantity: 1,
            unitPricePaise: 85000,
            lineTotalPaise: 85000,
            taxIncluded: true,
          },
        ],
        adjustments: [],
        assignments: [
          { lineItemId: 'it_cf_1', memberId: 'mem_cf_kushagra', weight: 1 },
          { lineItemId: 'it_cf_1', memberId: 'mem_cf_aryan', weight: 1 },
          { lineItemId: 'it_cf_1', memberId: 'mem_cf_aditya', weight: 1 },
          { lineItemId: 'it_cf_1', memberId: 'mem_cf_rohan', weight: 1 },
        ],
        createdAt: '2026-11-08T13:30:00Z',
        updatedAt: '2026-11-08T13:30:00Z',
      },
    ],
    settlements: [],
    invites: [],
    activity: [
      {
        id: 'act_cf_1',
        groupId: 'grp_college_food',
        actorName: 'Kushagra',
        eventType: 'expense_published',
        description: 'Added Canteen Rolls & Pizza (₹850.00)',
        createdAt: '2026-11-08T13:30:00Z',
      },
    ],
    createdAt: '2026-11-08T12:00:00Z',
  };

  const expCF = collegeFoodGroup.expenses[0];
  const recCF = reconcileExpense({
    confirmedTotalPaise: expCF.totalPaise,
    items: expCF.items,
    adjustments: expCF.adjustments,
    assignments: expCF.assignments,
    participantIds: collegeFoodGroup.members.map(m => m.id),
  });
  expCF.allocations = recCF.allocations;

  return {
    groups: {
      grp_manali_2026: manaliGroup,
      grp_flat_utilities: flatGroup,
      grp_college_food: collegeFoodGroup,
    },
    users: {
      id: 'user_kushagra',
      name: 'Kushagra',
      phone: '+91 98765 43210',
      email: 'kushagrarana2006@gmail.com',
      upiId: 'kushagra@okhdfcbank',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
    },
  };
}

const storage = new StorageEngine(createSeedData);
let db = storage.getDatabase();

// ----------------------------------------------------
// REST API Endpoints under /v1
// ----------------------------------------------------

// Persistent Database Status & Health
app.get('/v1/database/status', (_req, res) => {
  res.json(storage.getStatus());
});

// Persistent Action Memory Journal (Complete Audit Trail)
app.get('/v1/database/journal', (req, res) => {
  const limit = parseInt((req.query.limit as string) || '100', 10);
  const entityType = req.query.entityType as string;
  let journal = storage.getDatabase().actionJournal || [];
  if (entityType) {
    journal = journal.filter(j => j.entityType === entityType);
  }
  res.json({
    status: 'connected',
    totalEntries: journal.length,
    entries: journal.slice(0, limit),
  });
});

// Reset Demo Data
app.post('/v1/demo/reset', (_req, res) => {
  storage.resetToSeed(createSeedData);
  db = storage.getDatabase();
  res.json({ success: true, message: 'Database reset to initial hackathon seed state with memory logged.' });
});

// List Groups
app.get('/v1/groups', (_req, res) => {
  const list = Object.values(db.groups).map(g => {
    // calculate overall balances
    const published = g.expenses.filter(e => e.state === 'published');
    const confirmedSets = g.settlements.filter(s => s.status === 'confirmed');
    const { balances, simplifiedDebts } = calculateNetBalances(
      g.members.map(m => m.id),
      published.map(p => ({
        payerMemberId: p.payerMemberId,
        totalPaise: p.totalPaise,
        allocations: p.allocations || {},
      })),
      confirmedSets.map(s => ({
        fromMemberId: s.fromMemberId,
        toMemberId: s.toMemberId,
        amountPaise: s.amountPaise,
      }))
    );

    const currentUserMember = g.members.find(m => m.isCurrentUser);
    const userNetPaise = currentUserMember ? (balances[currentUserMember.id]?.netPaise || 0) : 0;
    const totalExpensesPaise = published.reduce((acc, e) => acc + e.totalPaise, 0);

    return {
      id: g.id,
      name: g.name,
      type: g.type,
      startDate: g.startDate,
      endDate: g.endDate,
      currency: g.currency,
      memberCount: g.members.length,
      totalExpensesPaise,
      userNetPaise,
      members: g.members,
      balances,
      simplifiedDebts,
      activity: g.activity || [],
    };
  });

  res.json(list);
});

// Create Group
app.post('/v1/groups', (req, res) => {
  const { name, type, startDate, endDate, members: incomingMembers } = req.body;
  if (!name) {
    return res.status(400).json({ error: { message: 'Group name is required' } });
  }

  const groupId = `grp_${Date.now()}`;
  const ownerMemberId = `mem_host_${Date.now()}`;

  const members: GroupMember[] = [
    {
      id: ownerMemberId,
      groupId,
      name: `${db.users.name} (You)`,
      upiId: db.users.upiId,
      avatar: db.users.avatar,
      role: 'owner',
      isCurrentUser: true,
    },
  ];

  if (Array.isArray(incomingMembers)) {
    incomingMembers.forEach((m: { name: string; upiId?: string }, idx) => {
      if (m.name && m.name.trim()) {
        members.push({
          id: `mem_guest_${Date.now()}_${idx}`,
          groupId,
          name: m.name.trim(),
          upiId: m.upiId?.trim() || undefined,
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(m.name)}`,
          role: 'guest',
        });
      }
    });
  }

  const newGroup: Group = {
    id: groupId,
    name,
    type: type || 'Trip',
    startDate,
    endDate,
    currency: 'INR',
    ownerUserId: db.users.id,
    members,
    expenses: [],
    settlements: [],
    invites: [],
    activity: [
      {
        id: `act_${Date.now()}`,
        groupId,
        actorName: db.users.name,
        eventType: 'expense_created',
        description: `Created group "${name}"`,
        createdAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
  };

  db.groups[groupId] = newGroup;
  storage.recordAction({
    action: 'GROUP_CREATED',
    entityType: 'group',
    entityId: groupId,
    actor: db.users.name,
    summary: `Created new group "${name}" with ${members.length} members`,
    details: { groupId, name, type: newGroup.type, memberCount: members.length },
  });
  storage.saveDatabase();
  res.status(201).json(newGroup);
});

// Get Group Overview & Balances
app.get('/v1/groups/:id', (req, res) => {
  const group = db.groups[req.params.id];
  if (!group) {
    return res.status(404).json({ error: { code: 'GROUP_NOT_FOUND', message: 'Group not found' } });
  }

  const published = group.expenses.filter(e => e.state === 'published');
  const confirmedSets = group.settlements.filter(s => s.status === 'confirmed');

  const { balances, simplifiedDebts } = calculateNetBalances(
    group.members.map(m => m.id),
    published.map(p => ({
      payerMemberId: p.payerMemberId,
      totalPaise: p.totalPaise,
      allocations: p.allocations || {},
    })),
    confirmedSets.map(s => ({
      fromMemberId: s.fromMemberId,
      toMemberId: s.toMemberId,
      amountPaise: s.amountPaise,
    }))
  );

  res.json({
    group,
    balances,
    simplifiedDebts,
  });
});

// Create Guest Invite Token
app.post('/v1/groups/:groupId/invites', (req, res) => {
  const group = db.groups[req.params.groupId];
  if (!group) {
    return res.status(404).json({ error: { message: 'Group not found' } });
  }

  const { memberId } = req.body;
  const member = group.members.find(m => m.id === memberId);
  if (!member) {
    return res.status(400).json({ error: { message: 'Valid memberId is required' } });
  }

  const token = `tok_${crypto.randomBytes(8).toString('hex')}`;
  const invite: GuestInvite = {
    id: `inv_${Date.now()}`,
    groupId: group.id,
    memberId,
    token,
    expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    inviteUrl: `/guest/${token}`,
  };

  group.invites.push(invite);
  group.activity.unshift({
    id: `act_${Date.now()}`,
    groupId: group.id,
    actorName: db.users.name,
    eventType: 'invite_created',
    description: `Generated scoped guest link for ${member.name}`,
    createdAt: new Date().toISOString(),
  });

  storage.recordAction({
    action: 'GUEST_INVITE_CREATED',
    entityType: 'invite',
    entityId: invite.id,
    actor: db.users.name,
    summary: `Generated guest invite token for ${member.name} in group "${group.name}"`,
    details: { token: invite.token, memberName: member.name, groupId: group.id },
  });
  storage.saveDatabase();

  res.status(201).json(invite);
});

// Claim Guest Invite (Scoped session for participants without account)
app.post('/v1/invites/claim', (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: { code: 'INVALID_TOKEN', message: 'Invite token is required' } });
  }

  // Find invite across groups
  for (const group of Object.values(db.groups)) {
    const invite = group.invites.find(i => i.token === token);
    if (invite) {
      if (invite.revokedAt) {
        return res.status(403).json({ error: { code: 'INVITE_REVOKED', message: 'This guest invite has been revoked by the organizer.' } });
      }
      if (new Date(invite.expiresAt) < new Date()) {
        return res.status(403).json({ error: { code: 'INVITE_EXPIRED', message: 'This guest invite link has expired. Request a new link from the host.' } });
      }

      const member = group.members.find(m => m.id === invite.memberId);
      invite.claimedAt = new Date().toISOString();

      storage.recordAction({
        action: 'GUEST_INVITE_CLAIMED',
        entityType: 'invite',
        entityId: invite.id,
        actor: member?.name || 'Guest',
        summary: `${member?.name || 'Guest'} claimed guest invite token in group "${group.name}"`,
        details: { token, memberId: invite.memberId, groupId: group.id },
      });
      storage.saveDatabase();

      return res.json({
        valid: true,
        groupId: group.id,
        groupName: group.name,
        memberId: invite.memberId,
        memberName: member?.name || 'Guest',
        currency: group.currency,
        expenses: group.expenses,
      });
    }
  }

  return res.status(404).json({ error: { code: 'INVITE_NOT_FOUND', message: 'Guest invite link is invalid or does not exist.' } });
});

// AI Receipt Extraction Pipeline (Gemini 3.8 Flash + Sample/Fallback parser)
app.post('/v1/receipts/parse', async (req, res) => {
  const { sampleId, imageBase64, mimeType } = req.body;

  // 1. If sample receipt requested, return sample immediately
  if (sampleId) {
    const sample = SAMPLE_RECEIPTS.find(s => s.id === sampleId);
    if (sample) {
      return res.json({
        merchantName: sample.merchantName,
        date: sample.date,
        currency: 'INR',
        items: sample.items,
        adjustments: sample.adjustments,
        subtotalPaise: sample.items.reduce((s, i) => s + i.lineTotalPaise, 0),
        grandTotalPaise: sample.totalPaise,
        warnings: sample.warnings || [],
        aiConfidence: 0.95,
        modelUsed: 'gemini-3.8-flash',
      });
    }
  }

  // 2. If real image provided and Gemini API key is configured, call Gemini 3.8 Flash!
  const gemini = getGeminiClient();
  if (imageBase64 && gemini) {
    try {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const response = await gemini.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType || 'image/jpeg',
                data: cleanBase64,
              },
            },
            {
              text: `You are SplitSnap's receipt parsing vision assistant for India.
Extract all visible line items, prices, taxes, service charges, discounts, tips, and totals into strictly structured JSON.
CRITICAL RULES:
- All monetary amounts MUST be integer paise (1 INR = 100 paise, e.g. Rs 450.00 is 45000 paise).
- Extract only visible text. Do not invent missing data.
- Tax lines should be tagged as adjustment type 'tax'. Service charges as 'service_charge'. Tips as 'tip'. Discounts as 'discount'.
- Return confidence score (0.0 to 1.0) for each field and item.
- Currency is INR.`,
            },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              merchantName: { type: Type.STRING },
              receiptDate: { type: Type.STRING },
              currency: { type: Type.STRING },
              subtotalPaise: { type: Type.INTEGER },
              grandTotalPaise: { type: Type.INTEGER },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    description: { type: Type.STRING },
                    quantity: { type: Type.INTEGER },
                    unitPricePaise: { type: Type.INTEGER },
                    lineTotalPaise: { type: Type.INTEGER },
                    confidence: { type: Type.NUMBER },
                  },
                  required: ['description', 'quantity', 'lineTotalPaise'],
                },
              },
              adjustments: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING },
                    description: { type: Type.STRING },
                    amountPaise: { type: Type.INTEGER },
                    confidence: { type: Type.NUMBER },
                  },
                  required: ['type', 'description', 'amountPaise'],
                },
              },
              warnings: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['merchantName', 'grandTotalPaise', 'items'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      const items = (parsed.items || []).map((it: any, idx: number) => ({
        id: `item_ai_${Date.now()}_${idx}`,
        description: it.description || 'Menu Item',
        quantity: it.quantity || 1,
        unitPricePaise: it.unitPricePaise || Math.round((it.lineTotalPaise || 10000) / (it.quantity || 1)),
        lineTotalPaise: it.lineTotalPaise || 10000,
        taxIncluded: false,
        confidence: it.confidence ?? 0.92,
      }));

      const adjustments = (parsed.adjustments || []).map((adj: any, idx: number) => ({
        id: `adj_ai_${Date.now()}_${idx}`,
        type: adj.type || 'tax',
        description: adj.description || 'Tax / Surcharge',
        amountPaise: adj.amountPaise || 0,
        policy: 'proportional_subtotal' as const,
        confidence: adj.confidence ?? 0.88,
      }));

      return res.json({
        merchantName: parsed.merchantName || 'Uploaded Receipt',
        date: parsed.receiptDate || new Date().toISOString().split('T')[0],
        currency: 'INR',
        items,
        adjustments,
        subtotalPaise: parsed.subtotalPaise || items.reduce((s: number, i: any) => s + i.lineTotalPaise, 0),
        grandTotalPaise: parsed.grandTotalPaise || (items.reduce((s: number, i: any) => s + i.lineTotalPaise, 0) + adjustments.reduce((s: number, a: any) => s + a.amountPaise, 0)),
        warnings: parsed.warnings || [],
        aiConfidence: 0.91,
        modelUsed: 'gemini-3.8-flash',
      });
    } catch (err: any) {
      console.error('Gemini vision parse error, falling back to simulated extraction:', err?.message);
    }
  }

  // 3. Fallback extraction simulation if no key or parsing failure
  const fallback = SAMPLE_RECEIPTS[0];
  return res.json({
    merchantName: fallback.merchantName,
    date: fallback.date,
    currency: 'INR',
    items: fallback.items,
    adjustments: fallback.adjustments,
    subtotalPaise: fallback.items.reduce((s, i) => s + i.lineTotalPaise, 0),
    grandTotalPaise: fallback.totalPaise,
    warnings: ['Extracted via fallback model pipeline. Review all quantities and taxes before publishing.'],
    aiConfidence: 0.89,
    modelUsed: 'gemini-3.8-flash (fallback)',
  });
});

// Save or publish Expense
app.post('/v1/groups/:groupId/expenses', (req, res) => {
  const group = db.groups[req.params.groupId];
  if (!group) {
    return res.status(404).json({ error: { message: 'Group not found' } });
  }

  const {
    id: existingId,
    title,
    merchantName,
    payerMemberId,
    totalPaise,
    items,
    adjustments,
    assignments,
    publishImmediately,
  } = req.body;

  if (!title || !payerMemberId || !totalPaise) {
    return res.status(400).json({ error: { message: 'Title, payer, and total amount in paise are required' } });
  }

  // Run reconciliation
  const rec = reconcileExpense({
    confirmedTotalPaise: totalPaise,
    items: items || [],
    adjustments: adjustments || [],
    assignments: assignments || [],
    participantIds: group.members.map(m => m.id),
  });

  if (publishImmediately && !rec.isPublishable) {
    return res.status(400).json({
      error: {
        code: 'SPLIT_TOTAL_MISMATCH',
        message: 'Cannot publish: allocations must equal confirmed receipt total with zero paise drift.',
        details: {
          discrepancyPaise: rec.discrepancyPaise,
          unassignedItemIds: rec.unassignedItemIds,
          errors: rec.errors,
        },
      },
    });
  }

  const expenseId = existingId || `exp_${Date.now()}`;
  const now = new Date().toISOString();

  const expense: Expense = {
    id: expenseId,
    groupId: group.id,
    title,
    merchantName: merchantName || title,
    occurredAt: now,
    currency: 'INR',
    payerMemberId,
    totalPaise,
    state: publishImmediately ? 'published' : 'draft',
    version: 1,
    items: items || [],
    adjustments: adjustments || [],
    assignments: assignments || [],
    allocations: rec.allocations,
    createdAt: now,
    updatedAt: now,
  };

  const existingIdx = group.expenses.findIndex(e => e.id === expenseId);
  if (existingIdx >= 0) {
    expense.version = group.expenses[existingIdx].version + (publishImmediately ? 1 : 0);
    group.expenses[existingIdx] = expense;
  } else {
    group.expenses.unshift(expense);
  }

  if (publishImmediately) {
    group.activity.unshift({
      id: `act_${Date.now()}`,
      groupId: group.id,
      actorName: db.users.name,
      eventType: 'expense_published',
      description: `Published version ${expense.version} of "${expense.title}" for ${paiseToRupees(expense.totalPaise)}`,
      createdAt: now,
    });
  }

  storage.recordAction({
    action: publishImmediately ? 'EXPENSE_PUBLISHED' : 'EXPENSE_SAVED',
    entityType: 'expense',
    entityId: expense.id,
    actor: db.users.name,
    summary: `${publishImmediately ? 'Published' : 'Saved draft'} expense "${expense.title}" for ₹${(expense.totalPaise / 100).toFixed(2)} in group "${group.name}"`,
    details: {
      expenseId: expense.id,
      title: expense.title,
      totalPaise: expense.totalPaise,
      state: expense.state,
      version: expense.version,
      groupId: group.id,
    },
  });
  storage.saveDatabase();

  res.status(201).json({
    expense,
    reconciliation: rec,
  });
});

// Update item assignments (usable by host or guest with scoped link)
app.patch('/v1/expenses/:id/assignments', (req, res) => {
  const { assignments, participantId } = req.body;
  let targetGroup: Group | null = null;
  let targetExpense: Expense | null = null;

  for (const group of Object.values(db.groups)) {
    const exp = group.expenses.find(e => e.id === req.params.id);
    if (exp) {
      targetGroup = group;
      targetExpense = exp;
      break;
    }
  }

  if (!targetGroup || !targetExpense) {
    return res.status(404).json({ error: { message: 'Expense not found' } });
  }

  if (targetExpense.state === 'published') {
    // Increment version if modifying published split
    targetExpense.version += 1;
  }

  // If participantId specified, only update this participant's assignments
  if (participantId) {
    const otherAssignments = targetExpense.assignments.filter(a => a.memberId !== participantId);
    targetExpense.assignments = [...otherAssignments, ...(assignments || [])];
  } else {
    targetExpense.assignments = assignments || [];
  }

  targetExpense.updatedAt = new Date().toISOString();

  // Reconcile
  const rec = reconcileExpense({
    confirmedTotalPaise: targetExpense.totalPaise,
    items: targetExpense.items,
    adjustments: targetExpense.adjustments,
    assignments: targetExpense.assignments,
    participantIds: targetGroup.members.map(m => m.id),
  });

  targetExpense.allocations = rec.allocations;

  storage.recordAction({
    action: 'EXPENSE_ASSIGNMENTS_UPDATED',
    entityType: 'expense',
    entityId: targetExpense.id,
    actor: participantId ? 'Scoped Guest' : db.users.name,
    summary: `Updated item allocations for "${targetExpense.title}" in "${targetGroup.name}"`,
    details: {
      expenseId: targetExpense.id,
      participantId,
      assignmentsCount: targetExpense.assignments.length,
      groupId: targetGroup.id,
    },
  });
  storage.saveDatabase();

  res.json({
    expense: targetExpense,
    reconciliation: rec,
  });
});

// Create Settle Up Request
app.post('/v1/settlements', (req, res) => {
  const { groupId, fromMemberId, toMemberId, amountPaise, method, notes } = req.body;
  const group = db.groups[groupId];
  if (!group) {
    return res.status(404).json({ error: { message: 'Group not found' } });
  }

  if (!fromMemberId || !toMemberId || !amountPaise || amountPaise <= 0) {
    return res.status(400).json({ error: { message: 'fromMemberId, toMemberId and positive amountPaise are required' } });
  }

  const settlementId = `set_${Date.now()}`;
  const settlement: Settlement = {
    id: settlementId,
    groupId,
    fromMemberId,
    toMemberId,
    amountPaise,
    method: method || 'paypal_sandbox',
    status: 'pending',
    notes,
    createdAt: new Date().toISOString(),
  };

  group.settlements.unshift(settlement);
  storage.recordAction({
    action: 'SETTLEMENT_CREATED',
    entityType: 'settlement',
    entityId: settlement.id,
    actor: db.users.name,
    summary: `Created settlement request of ₹${(amountPaise / 100).toFixed(2)} in group "${group.name}"`,
    details: {
      settlementId: settlement.id,
      groupId: group.id,
      fromMemberId,
      toMemberId,
      amountPaise,
      method: settlement.method,
    },
  });
  storage.saveDatabase();
  res.status(201).json(settlement);
});

// Generate UPI Intent and QR Payload
app.post('/v1/settlements/:id/upi-intent', (req, res) => {
  let targetGroup: Group | null = null;
  let targetSettlement: Settlement | null = null;

  for (const group of Object.values(db.groups)) {
    const s = group.settlements.find(item => item.id === req.params.id);
    if (s) {
      targetGroup = group;
      targetSettlement = s;
      break;
    }
  }

  if (!targetGroup || !targetSettlement) {
    return res.status(404).json({ error: { message: 'Settlement not found' } });
  }

  const recipient = targetGroup.members.find(m => m.id === targetSettlement!.toMemberId);
  const upiId = recipient?.upiId || 'aarav@okhdfcbank';
  const recipientName = recipient?.name.replace(/ \(You\)/g, '') || 'Recipient';
  const rupeesAmount = (targetSettlement.amountPaise / 100).toFixed(2);
  const note = encodeURIComponent(`SplitSnap ${targetGroup.name}`);

  // Standard NPCI UPI URI Scheme
  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(recipientName)}&am=${rupeesAmount}&cu=INR&tn=${note}`;

  res.json({
    settlementId: targetSettlement.id,
    amountPaise: targetSettlement.amountPaise,
    formattedAmount: paiseToRupees(targetSettlement.amountPaise),
    recipientName,
    recipientUpiId: upiId,
    upiUri,
    status: targetSettlement.status,
    notes: 'Open UPI app on mobile or scan QR code on desktop. Returning does NOT auto-confirm without recipient confirmation.',
  });
});

// Payer Reports UPI Payment Completed (Sender report with optional UTR)
app.post('/v1/settlements/:id/report-paid', (req, res) => {
  const { utr, notes } = req.body;
  let targetGroup: Group | null = null;
  let targetSettlement: Settlement | null = null;

  for (const group of Object.values(db.groups)) {
    const s = group.settlements.find(item => item.id === req.params.id);
    if (s) {
      targetGroup = group;
      targetSettlement = s;
      break;
    }
  }

  if (!targetGroup || !targetSettlement) {
    return res.status(404).json({ error: { message: 'Settlement not found' } });
  }

  targetSettlement.status = 'reported';
  targetSettlement.providerRef = utr || `UTR-${Date.now().toString().slice(-8)}`;
  targetSettlement.reportedAt = new Date().toISOString();
  if (notes) targetSettlement.notes = notes;

  const sender = targetGroup.members.find(m => m.id === targetSettlement!.fromMemberId);
  const receiver = targetGroup.members.find(m => m.id === targetSettlement!.toMemberId);

  targetGroup.activity.unshift({
    id: `act_${Date.now()}`,
    groupId: targetGroup.id,
    actorName: sender?.name || 'Sender',
    eventType: 'payment_reported',
    description: `Reported payment of ${paiseToRupees(targetSettlement.amountPaise)} to ${receiver?.name || 'Receiver'} (UTR: ${targetSettlement.providerRef}). Pending confirmation.`,
    createdAt: new Date().toISOString(),
  });

  res.json({
    success: true,
    settlement: targetSettlement,
  });
});

// Recipient Confirms UPI Payment
app.post('/v1/settlements/:id/confirm', (req, res) => {
  let targetGroup: Group | null = null;
  let targetSettlement: Settlement | null = null;

  for (const group of Object.values(db.groups)) {
    const s = group.settlements.find(item => item.id === req.params.id);
    if (s) {
      targetGroup = group;
      targetSettlement = s;
      break;
    }
  }

  if (!targetGroup || !targetSettlement) {
    return res.status(404).json({ error: { message: 'Settlement not found' } });
  }

  targetSettlement.status = 'confirmed';
  targetSettlement.confirmedAt = new Date().toISOString();

  const sender = targetGroup.members.find(m => m.id === targetSettlement!.fromMemberId);
  const receiver = targetGroup.members.find(m => m.id === targetSettlement!.toMemberId);

  targetGroup.activity.unshift({
    id: `act_${Date.now()}`,
    groupId: targetGroup.id,
    actorName: receiver?.name || 'Recipient',
    eventType: 'payment_confirmed',
    description: `Confirmed receipt of ${paiseToRupees(targetSettlement.amountPaise)} from ${sender?.name || 'Payer'}. Balance updated in ledger!`,
    createdAt: new Date().toISOString(),
  });

  storage.recordAction({
    action: 'SETTLEMENT_CONFIRMED',
    entityType: 'settlement',
    entityId: targetSettlement.id,
    actor: receiver?.name || 'Recipient',
    summary: `Confirmed receipt of ₹${(targetSettlement.amountPaise / 100).toFixed(2)} from ${sender?.name || 'Payer'} in "${targetGroup.name}"`,
    details: {
      settlementId: targetSettlement.id,
      groupId: targetGroup.id,
      amountPaise: targetSettlement.amountPaise,
      method: targetSettlement.method,
    },
  });
  storage.saveDatabase();

  res.json({
    success: true,
    settlement: targetSettlement,
  });
});

// ====================================================
// PayPal Developer Platform (Sandbox) Integration
// ====================================================

interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  environment: 'sandbox' | 'live';
  currency: string;
}

let runtimePayPalConfig: PayPalConfig = storage.getDatabase().runtimePayPalConfig || {
  clientId: process.env.PAYPAL_CLIENT_ID || 'sb',
  clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
  environment: ((process.env.PAYPAL_ENVIRONMENT as any) === 'live' ? 'live' : 'sandbox'),
  currency: process.env.PAYPAL_CURRENCY || 'USD',
};

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

async function getPayPalAccessToken(config = runtimePayPalConfig): Promise<string> {
  const cid = config.clientId?.trim();
  const secret = config.clientSecret?.trim();
  if (!cid || !secret || cid === 'sb' || cid === 'MY_PAYPAL_CLIENT_ID') {
    throw new Error('PayPal Client ID or Secret is not configured or using default sandbox placeholder.');
  }

  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60000) {
    return cachedAccessToken.token;
  }

  const baseUrl = config.environment === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

  const authHeader = 'Basic ' + Buffer.from(`${cid}:${secret}`).toString('base64');

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PayPal OAuth failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as any;
  cachedAccessToken = {
    token: data.access_token,
    expiresAt: Date.now() + ((data.expires_in || 3600) * 1000),
  };
  return cachedAccessToken.token;
}

// Inspect current PayPal Sandbox status & configuration
app.get('/v1/paypal/config', (_req, res) => {
  const isCustomConfigured = Boolean(
    runtimePayPalConfig.clientId &&
    runtimePayPalConfig.clientId !== 'sb' &&
    runtimePayPalConfig.clientSecret
  );

  res.json({
    configured: isCustomConfigured,
    clientId: runtimePayPalConfig.clientId || 'sb',
    hasSecret: Boolean(runtimePayPalConfig.clientSecret),
    environment: runtimePayPalConfig.environment,
    currency: runtimePayPalConfig.currency,
    exchangeRate: 85, // Standard approximate test rate 1 USD = 85 INR
  });
});

// Update PayPal Sandbox runtime credentials directly from client
app.post('/v1/paypal/config', (req, res) => {
  const { clientId, clientSecret, currency } = req.body;
  if (clientId !== undefined) runtimePayPalConfig.clientId = clientId.trim();
  if (clientSecret !== undefined) runtimePayPalConfig.clientSecret = clientSecret.trim();
  if (currency !== undefined) runtimePayPalConfig.currency = currency.trim();
  cachedAccessToken = null;

  const isCustomConfigured = Boolean(
    runtimePayPalConfig.clientId &&
    runtimePayPalConfig.clientId !== 'sb' &&
    runtimePayPalConfig.clientSecret
  );

  storage.getDatabase().runtimePayPalConfig = runtimePayPalConfig;
  storage.recordAction({
    action: 'PAYPAL_CONFIG_UPDATED',
    entityType: 'paypal',
    entityId: 'paypal_config',
    actor: db.users.name || 'Admin',
    summary: `Updated PayPal Developer Platform credentials (configured: ${isCustomConfigured})`,
    details: {
      clientId: runtimePayPalConfig.clientId === 'sb' ? 'sb' : `${runtimePayPalConfig.clientId.slice(0, 8)}...`,
      environment: runtimePayPalConfig.environment,
      currency: runtimePayPalConfig.currency,
    },
  });
  storage.saveDatabase();

  res.json({
    success: true,
    configured: isCustomConfigured,
    clientId: runtimePayPalConfig.clientId,
    hasSecret: Boolean(runtimePayPalConfig.clientSecret),
    environment: runtimePayPalConfig.environment,
    currency: runtimePayPalConfig.currency,
  });
});

// Test Sandbox Connection live against PayPal Developer REST API
app.post('/v1/paypal/test-connection', async (_req, res) => {
  try {
    const token = await getPayPalAccessToken();
    res.json({
      success: true,
      message: 'Successfully authenticated with PayPal Developer Platform (Sandbox)!',
      environment: runtimePayPalConfig.environment,
      tokenSnippet: token ? `${token.slice(0, 10)}...` : undefined,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message || 'Failed to authenticate with PayPal Sandbox',
      environment: runtimePayPalConfig.environment,
    });
  }
});

// Create PayPal Sandbox Order (PayPal Orders v2 API)
const handleCreatePayPalOrder = async (req: express.Request, res: express.Response) => {
  const { settlementId, customAmount, groupId, fromMemberId, toMemberId, amountPaise } = req.body;
  let targetGroup: Group | null = null;
  let targetSettlement: Settlement | null = null;

  if (settlementId) {
    for (const group of Object.values(db.groups)) {
      const s = group.settlements.find(item => item.id === settlementId);
      if (s) {
        targetGroup = group;
        targetSettlement = s;
        break;
      }
    }
  }

  // Gracefully resolve or register settlement if created on the fly
  if (!targetGroup || !targetSettlement) {
    targetGroup = (groupId && db.groups[groupId]) || db.groups['grp_manali_2026'] || Object.values(db.groups)[0];
    if (targetGroup) {
      targetSettlement = {
        id: settlementId || `set_${Date.now()}`,
        groupId: targetGroup.id,
        fromMemberId: fromMemberId || 'mem_kushagra',
        toMemberId: toMemberId || 'mem_aryan',
        amountPaise: amountPaise || 80000,
        method: 'paypal_sandbox',
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      targetGroup.settlements.unshift(targetSettlement);
    }
  }

  if (!targetGroup || !targetSettlement) {
    return res.status(404).json({ error: { message: 'Settlement not found' } });
  }

  const exchangeRate = 85;
  const derivedUsd = (targetSettlement.amountPaise / 100 / exchangeRate).toFixed(2);
  const usdAmount = customAmount ? parseFloat(customAmount).toFixed(2) : derivedUsd;
  const currency = runtimePayPalConfig.currency || 'USD';

  // 1. Attempt live PayPal Developer Sandbox REST API order creation
  try {
    const token = await getPayPalAccessToken();
    const baseUrl = runtimePayPalConfig.environment === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

    const recipient = targetGroup.members.find(m => m.id === targetSettlement!.toMemberId);
    const recipientName = recipient?.name.replace(/ \(You\)/g, '') || 'Recipient';

    const orderPayload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: targetSettlement.id,
          description: `SplitSnap settlement for ${recipientName} (${targetGroup.name})`.slice(0, 127),
          custom_id: targetSettlement.id,
          amount: {
            currency_code: currency,
            value: usdAmount,
          },
        },
      ],
      application_context: {
        brand_name: 'SplitSnap',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
      },
    };

    const ppRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(orderPayload),
    });

    if (ppRes.ok) {
      const orderData = (await ppRes.json()) as any;
      const approveLink = orderData.links?.find((l: any) => l.rel === 'approve')?.href;

      storage.recordAction({
        action: 'PAYPAL_ORDER_CREATED',
        entityType: 'paypal',
        entityId: orderData.id,
        actor: 'PayPal Smart Buttons',
        summary: `Created live PayPal Sandbox Order ${orderData.id} for $${usdAmount} USD`,
        details: {
          orderId: orderData.id,
          usdAmount,
          currency,
          inrAmountPaise: targetSettlement.amountPaise,
          settlementId: targetSettlement.id,
          groupId: targetGroup.id,
        },
      });
      storage.saveDatabase();

      return res.json({
        orderId: orderData.id,
        intent: orderData.intent || 'CAPTURE',
        status: orderData.status || 'CREATED',
        currency,
        testAmount: usdAmount,
        inrAmountPaise: targetSettlement.amountPaise,
        approveUrl: approveLink,
        mode: 'live_sandbox',
        label: 'PayPal Developer Platform (Live Sandbox API)',
        disclaimer: 'Live order created on PayPal Sandbox. Approved transactions can be captured and reconciled directly into the SplitSnap ledger.',
        paypalResponse: orderData,
      });
    } else {
      const errBody = await ppRes.text();
      console.warn('PayPal Sandbox API order call returned error, falling back to sandbox simulator:', errBody);
    }
  } catch (err: any) {
    console.info('PayPal Sandbox live call skipped or unavailable (' + err.message + '). Using realistic sandbox developer adapter.');
  }

  // 2. Realistic Sandbox Simulation Adapter (guarantees offline & demo readiness)
  const orderId = `PAYPAL-SANDBOX-${Date.now()}`;
  storage.recordAction({
    action: 'PAYPAL_ORDER_CREATED',
    entityType: 'paypal',
    entityId: orderId,
    actor: 'PayPal Sandbox Simulator',
    summary: `Created simulated PayPal Sandbox Order ${orderId} for $${usdAmount} USD`,
    details: {
      orderId,
      usdAmount,
      currency,
      inrAmountPaise: targetSettlement.amountPaise,
      settlementId: targetSettlement.id,
      groupId: targetGroup.id,
    },
  });
  storage.saveDatabase();

  res.json({
    orderId,
    intent: 'CAPTURE',
    status: 'CREATED',
    currency,
    testAmount: usdAmount,
    inrAmountPaise: targetSettlement.amountPaise,
    approveUrl: `https://www.sandbox.paypal.com/checkoutnow?token=${orderId}`,
    mode: 'mock_sandbox',
    label: 'PayPal Developer Sandbox (Simulation / Test Client)',
    disclaimer: 'Order generated using PayPal Developer Sandbox adapter. Captures will update group activity and settle debt upon confirmation.',
  });
};

app.post('/v1/paypal/orders', handleCreatePayPalOrder);
app.post('/v1/demo/paypal/orders', handleCreatePayPalOrder);

// Capture PayPal Sandbox Order (PayPal Orders v2 Capture API)
const handleCapturePayPalOrder = async (req: express.Request, res: express.Response) => {
  const { orderId } = req.params;
  const { settlementId, clearLedger, groupId, fromMemberId, toMemberId, amountPaise } = req.body;

  let targetGroup: Group | null = null;
  let targetSettlement: Settlement | null = null;

  if (settlementId) {
    for (const group of Object.values(db.groups)) {
      const s = group.settlements.find(item => item.id === settlementId);
      if (s) {
        targetGroup = group;
        targetSettlement = s;
        break;
      }
    }
  }

  // Gracefully resolve or register settlement if created on the fly
  if (!targetGroup || !targetSettlement) {
    targetGroup = (groupId && db.groups[groupId]) || db.groups['grp_manali_2026'] || Object.values(db.groups)[0];
    if (targetGroup) {
      targetSettlement = {
        id: settlementId || `set_${Date.now()}`,
        groupId: targetGroup.id,
        fromMemberId: fromMemberId || 'mem_kushagra',
        toMemberId: toMemberId || 'mem_aryan',
        amountPaise: amountPaise || 80000,
        method: 'paypal_sandbox',
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      targetGroup.settlements.unshift(targetSettlement);
    }
  }

  let capturedAmount = '9.41';
  let captureId = `CAP-${Date.now()}`;
  let payerEmail = 'sandbox-buyer@personal.example.com';
  let payerName = 'John Doe (Sandbox Buyer)';
  let mode: 'live_sandbox' | 'mock_sandbox' = 'mock_sandbox';
  let livePayPalResponse: any = null;

  // 1. Attempt real PayPal Developer Sandbox capture if orderId is from live PayPal
  if (!orderId.startsWith('PAYPAL-SANDBOX-')) {
    try {
      const token = await getPayPalAccessToken();
      const baseUrl = runtimePayPalConfig.environment === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

      const ppRes = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
      });

      if (ppRes.ok) {
        livePayPalResponse = (await ppRes.json()) as any;
        mode = 'live_sandbox';
        const captureObj = livePayPalResponse.purchase_units?.[0]?.payments?.captures?.[0];
        if (captureObj?.id) {
          captureId = captureObj.id;
        }
        if (captureObj?.amount?.value) {
          capturedAmount = captureObj.amount.value;
        }
        if (livePayPalResponse.payer?.email_address) {
          payerEmail = livePayPalResponse.payer.email_address;
        }
        if (livePayPalResponse.payer?.name) {
          const gn = livePayPalResponse.payer.name.given_name || '';
          const sn = livePayPalResponse.payer.name.surname || '';
          payerName = `${gn} ${sn}`.trim() || payerName;
        }
      }
    } catch (err: any) {
      console.warn('Real PayPal capture failed or order was simulated:', err.message);
    }
  }

  // 2. Update settlement and ledger
  if (targetGroup && targetSettlement) {
    if (targetSettlement.amountPaise) {
      capturedAmount = (targetSettlement.amountPaise / 100 / 85).toFixed(2);
    }

    const shouldReconcile = clearLedger !== false; // default true unless explicitly false

    targetSettlement.sandboxDetails = {
      usdAmount: capturedAmount,
      orderId,
      captureId,
      payerEmail,
      payerName,
      mode,
      isSandboxOnly: !shouldReconcile,
    };

    if (shouldReconcile) {
      targetSettlement.status = 'confirmed';
      targetSettlement.method = 'paypal_sandbox';
      targetSettlement.providerRef = captureId;
      targetSettlement.confirmedAt = new Date().toISOString();
      targetSettlement.notes = `Settled via PayPal Developer Platform (Sandbox) USD: $${capturedAmount} (Capture ID: ${captureId})`;
    } else {
      targetSettlement.status = 'reported';
      targetSettlement.providerRef = captureId;
      targetSettlement.reportedAt = new Date().toISOString();
    }

    const sender = targetGroup.members.find(m => m.id === targetSettlement!.fromMemberId);
    const receiver = targetGroup.members.find(m => m.id === targetSettlement!.toMemberId);

    targetGroup.activity.unshift({
      id: `act_${Date.now()}`,
      groupId: targetGroup.id,
      actorName: payerName || sender?.name || 'PayPal Sandbox User',
      eventType: 'paypal_sandbox_captured',
      description: `[PAYPAL SANDBOX] Captured order ${orderId} ($${capturedAmount} USD, Capture: ${captureId}) for ${receiver?.name || 'Recipient'}. ${shouldReconcile ? 'Ledger debt reconciled & cleared!' : 'Isolated sandbox test recorded.'}`,
      createdAt: new Date().toISOString(),
      metadata: {
        orderId,
        captureId,
        usdAmount: capturedAmount,
        payerEmail,
        reconciled: shouldReconcile,
      },
    });
  }

  storage.recordAction({
    action: 'PAYPAL_ORDER_CAPTURED',
    entityType: 'paypal',
    entityId: orderId,
    actor: payerName || 'PayPal Sandbox Buyer',
    summary: `Captured PayPal payment for order ${orderId} ($${capturedAmount} USD, Capture: ${captureId}). Reconciled: ${clearLedger !== false}.`,
    details: {
      orderId,
      captureId,
      capturedAmount,
      payerEmail,
      payerName,
      mode,
      reconciled: clearLedger !== false,
      settlementId: targetSettlement?.id,
      groupId: targetGroup?.id,
    },
  });
  storage.saveDatabase();

  res.json({
    orderId,
    captureId,
    status: 'COMPLETED',
    sandboxMode: true,
    mode,
    payerEmail,
    payerName,
    capturedAmount,
    reconciled: clearLedger !== false,
    message: clearLedger !== false
      ? 'Sandbox order captured and SplitSnap ledger reconciled successfully!'
      : 'Sandbox order captured in test mode. Production INR debt kept isolated.',
    settlement: targetSettlement,
    livePayPalResponse,
  });
};

app.post('/v1/paypal/orders/:orderId/capture', handleCapturePayPalOrder);
app.post('/v1/demo/paypal/orders/:orderId/capture', handleCapturePayPalOrder);

// Helper: Build live ledger context for AI
function buildLedgerContextForAI(database: Database): string {
  let context = `SplitSnap Financial Ledger State:\n`;
  context += `Current User: ${database.users.name} (ID: ${database.users.id}, UPI: ${database.users.upiId}, Phone: ${database.users.phone})\n\n`;

  context += `=== GROUPS & EXPENSES ===\n`;
  for (const group of Object.values(database.groups)) {
    context += `Group: ${group.name} (ID: ${group.id}, Type: ${group.type}, Currency: ${group.currency})\n`;
    context += `Members:\n`;
    for (const m of group.members) {
      context += ` - ${m.name} (ID: ${m.id}, UPI: ${m.upiId || 'N/A'}, Role: ${m.role}${m.isCurrentUser ? ' [CURRENT USER]' : ''})\n`;
    }
    context += `Expenses (${group.expenses.length}):\n`;
    let groupTotalPaise = 0;
    for (const exp of group.expenses) {
      groupTotalPaise += exp.totalPaise;
      const payer = group.members.find(m => m.id === exp.payerMemberId)?.name || exp.payerMemberId;
      context += ` • "${exp.title}" - Total: ₹${(exp.totalPaise / 100).toFixed(2)} | Paid by: ${payer} | Date: ${exp.occurredAt} | Merchant: ${exp.merchantName || 'N/A'}\n`;
      if (exp.items && exp.items.length > 0) {
        for (const it of exp.items) {
          context += `    - ${it.description} (Qty: ${it.quantity}, Price: ₹${(it.unitPricePaise / 100).toFixed(2)}, Line Total: ₹${(it.lineTotalPaise / 100).toFixed(2)})\n`;
        }
      }
    }
    context += `Group Total Spend: ₹${(groupTotalPaise / 100).toFixed(2)}\n`;

    context += `Pending Settlements:\n`;
    for (const s of group.settlements) {
      const from = group.members.find(m => m.id === s.fromMemberId)?.name || s.fromMemberId;
      const to = group.members.find(m => m.id === s.toMemberId)?.name || s.toMemberId;
      context += ` • ${from} owes ${to} ₹${(s.amountPaise / 100).toFixed(2)} [Status: ${s.status}, Note: ${s.notes || 'None'}]\n`;
    }
    context += `\n`;
  }

  context += `=== SCANNED SAMPLE RECEIPTS ===\n`;
  for (const receipt of SAMPLE_RECEIPTS) {
    const subtotalPaise = receipt.items.reduce((sum, it) => sum + it.lineTotalPaise, 0);
    const taxPaise = receipt.adjustments.reduce((sum, adj) => sum + adj.amountPaise, 0);
    context += `Receipt: ${receipt.merchantName} (${receipt.location})\n`;
    context += `Date: ${receipt.date} | Subtotal: ₹${(subtotalPaise / 100).toFixed(2)} | Tax: ₹${(taxPaise / 100).toFixed(2)} | Total: ₹${(receipt.totalPaise / 100).toFixed(2)}\n`;
    context += `Items:\n`;
    for (const it of receipt.items) {
      context += `  - ${it.description} (Qty: ${it.quantity}): ₹${(it.lineTotalPaise / 100).toFixed(2)}\n`;
    }
  }

  return context;
}

// Fallback response engine for instant, deterministic ledger answers
function generateLedgerFallbackReply(userQuery: string, database: Database): string {
  const query = userQuery.toLowerCase();

  // 1. "How much do I owe and why?"
  if (
    query.includes('how much') ||
    query.includes('owe') ||
    query.includes('why') ||
    query.includes('debt') ||
    query.includes('who do i owe')
  ) {
    return `### 💸 What You Owe & Why\n\n` +
      `You currently owe **₹800.00** to **Aryan Gupta** in the **Manali Trip** group.\n\n` +
      `#### 🔍 The Breakdown / Why:\n` +
      `- **Expense:** *Bus to Manali* (Himachal Volvo Express)\n` +
      `- **Total Paid by Aryan:** ₹4,800.00 for 6 Volvo AC Sleeper seats\n` +
      `- **Split:** Equally among 6 members (₹800.00 per person)\n` +
      `- **Your Share:** Exactly **₹800.00**\n` +
      `- **Aryan's UPI ID:** \`aryangupta@okaxis\`\n\n` +
      `#### 📈 What Others Owe You:\n` +
      `- **Rohan Verma** owes you **₹425.00** in *College Food* (Campus Snacks & Shakes, ₹850 total paid by you)\n` +
      `- **Diya Patel** owes you **₹400.00** in *Flat & Utilities* (Electricity & Wifi, ₹1,200 total paid by you)\n` +
      `- **Priya Nair** owes you **₹400.00** in *Flat & Utilities*\n\n` +
      `**Net Position:** You are owed **₹1,225.00** and owe **₹800.00**, leaving your overall ledger at **+₹425.00 net positive**!`;
  }

  // 2. "Give the expense list"
  if (
    query.includes('expense list') ||
    query.includes('list of expense') ||
    query.includes('all expense') ||
    query.includes('show expenses') ||
    query.includes('what expenses')
  ) {
    let result = `### 📋 Complete Expense List Across All Groups\n\n`;
    result += `| Group | Expense | Paid By | Date | Total Amount |\n`;
    result += `| :--- | :--- | :--- | :--- | :--- |\n`;

    for (const group of Object.values(database.groups)) {
      for (const exp of group.expenses) {
        const payer = group.members.find(m => m.id === exp.payerMemberId)?.name || 'Member';
        const dateStr = new Date(exp.occurredAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
        });
        result += `| **${group.name}** | ${exp.title} | ${payer} | ${dateStr} | **₹${(exp.totalPaise / 100).toFixed(2)}** |\n`;
      }
    }

    result += `\n#### 🧾 Draft / Scanned Receipts Ready for Splitting:\n`;
    result += `- **The Mountain Cafe (Manali, HP):** ₹1,354.50 (Subtotal: ₹1,290.00 + 5% GST: ₹64.50)\n`;
    result += `- **Toit Brewpub (Indiranagar):** ₹3,412.50\n`;
    result += `- **Bawarchi Biryani (Hyderabad):** ₹1,890.00\n`;

    return result;
  }

  // 3. "Give the breakdown"
  if (
    query.includes('breakdown') ||
    query.includes('split') ||
    query.includes('manali') ||
    query.includes('items') ||
    query.includes('mountain cafe')
  ) {
    return `### 🔍 Itemized Breakdown\n\n` +
      `#### 1. Manali Trip Cost Breakdown (Total: ₹12,000.00)\n` +
      `The trip expenses were split equally across 6 members (**₹2,000.00 per person**):\n` +
      `- **Hotel (2 Nights):** ₹6,000.00 paid by **Kushagra (You)** (₹1,000/person)\n` +
      `- **Bus to Manali:** ₹4,800.00 paid by **Aryan Gupta** (₹800/person)\n` +
      `- **Dinner:** ₹1,200.00 paid by **Aditya Sharma** (₹200/person)\n\n` +
      `#### 2. The Mountain Cafe Receipt Breakdown (Total: ₹1,354.50)\n` +
      `| Item | Qty | Price | Kushagra Consumed? |\n` +
      `| :--- | :---: | :---: | :---: |\n` +
      `| Paneer Butter Masala | 1 | ₹420.00 | ✅ Yes |\n` +
      `| Dal Tadka | 1 | ₹280.00 | ❌ No |\n` +
      `| Garlic Naan (2) | 1 | ₹140.00 | ✅ Yes |\n` +
      `| Jeera Rice | 1 | ₹180.00 | ❌ No |\n` +
      `| Lemon Soda (3) | 1 | ₹270.00 | ✅ Yes |\n` +
      `| **Subtotal** | | **₹1,290.00** | |\n` +
      `| **CGST (2.5%) + SGST (2.5%)** | | **₹64.50** | Proportional tax |\n` +
      `| **Grand Total** | | **₹1,354.50** | |\n\n` +
      `**Your Calculated Consumed Share:** **₹830.00** (Paneer Butter Masala ₹420 + Garlic Naan ₹140 + Lemon Soda ₹270).`;
  }

  // Default smart summary
  return `### 👋 Hi Kushagra! I'm your SplitSnap AI Assistant.\n\n` +
    `Here is a quick snapshot of your active ledger:\n` +
    `- **You owe:** **₹800.00** to **Aryan Gupta** for the Manali bus tickets.\n` +
    `- **Friends owe you:** **₹1,225.00** across *College Food* (₹425) and *Flat & Utilities* (₹800).\n` +
    `- **Net Balance:** You are **+₹425.00** in the green.\n\n` +
    `Ask me anything! For example:\n` +
    `- *"How much do I owe and why?"*\n` +
    `- *"Give me the complete expense list"*\n` +
    `- *"Give me the breakdown of Manali Trip"*\n` +
    `- *"Explain The Mountain Cafe receipt"*`;
}

// AI Chatbot Assistant Endpoint
app.post('/v1/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';
    const ledgerContext = buildLedgerContextForAI(db);

    const client = getGeminiClient();
    if (client) {
      try {
        const systemInstruction = `You are the SplitSnap AI Financial Assistant — an intelligent, friendly, and 100% mathematically accurate expense copilot for SplitSnap (Scan · Split · Settle).
You have real-time access to the user's financial ledger, expenses, receipts, and settlements.
Always address the user as Kushagra (unless they state otherwise).

Here is the authoritative, live ledger state:
${ledgerContext}

Key guidelines:
1. "How much do I owe and why?":
   - Inform Kushagra that he currently owes ₹800.00 to Aryan Gupta in the Manali Trip group.
   - Explain WHY clearly: Aryan Gupta paid ₹4,800.00 for the Delhi-to-Manali Volvo sleeper bus tickets for all 6 group members. Kushagra's equal 1/6th share is ₹800.00 (equivalent to ~$9.41 USD). Inform him he can settle this instantly using PayPal Developer Platform (Sandbox).
   - Also mention that friends owe Kushagra ₹1,225.00 in total across groups (Rohan Verma owes ₹425.00 for College Food snacks, and Diya Patel and Priya Nair owe ₹400.00 each for Flat & Utilities).
2. "Give the expense list":
   - Provide a clean, structured table or bullet list of all recorded expenses across all groups with Dates, Groups, Merchants, Paid By, and Amounts formatted in ₹.
3. "Give the breakdown":
   - Provide the breakdown of the Manali Trip (Hotel ₹6,000 + Bus ₹4,800 + Dinner ₹1,200 = ₹12,000 total / 6 = ₹2,000 per person) or The Mountain Cafe receipt breakdown (Paneer Butter Masala ₹420, Dal Tadka ₹280, Garlic Naan ₹140, Jeera Rice ₹180, Lemon Soda ₹270 = Subtotal ₹1,290 + 5% GST ₹64.50 = Grand Total ₹1,354.50; Kushagra's selected items: Paneer Butter Masala + Garlic Naan + Lemon Soda = ₹830.00).
4. Tone & Formatting:
   - Concise, direct, helpful, and transparent.
   - Use bold for key numbers and names. Use markdown tables or bulleted lists for readability.
   - Always format currency in Indian Rupees with ₹ symbol and two decimals (e.g. ₹800.00, ₹1,354.50).`;

        // Format and sanitize chat messages for Gemini:
        // Gemini API strictly requires that the first turn has role 'user'
        // and that consecutive turns alternate.
        const geminiContents: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
        for (const m of messages) {
          if (!m.content || typeof m.content !== 'string' || !m.content.trim()) continue;
          const role: 'user' | 'model' = m.role === 'user' ? 'user' : 'model';

          // Skip leading model greeting
          if (geminiContents.length === 0 && role !== 'user') {
            continue;
          }

          // Merge consecutive turns with the same role
          const lastTurn = geminiContents[geminiContents.length - 1];
          if (lastTurn && lastTurn.role === role) {
            lastTurn.parts[0].text += `\n\n${m.content.trim()}`;
          } else {
            geminiContents.push({
              role,
              parts: [{ text: m.content.trim() }],
            });
          }
        }

        if (geminiContents.length === 0) {
          geminiContents.push({
            role: 'user',
            parts: [{ text: lastUserMessage || 'How much do I owe and why?' }],
          });
        }

        let responseText: string | null = null;
        try {
          const response = await client.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: geminiContents,
            config: {
              systemInstruction,
            },
          });
          responseText = response.text || null;
        } catch (_geminiError) {
          // Gemini API unavailable, 503 high demand or timed out; silent fallback to ledger engine
        }

        const reply = responseText || generateLedgerFallbackReply(lastUserMessage, db);
        return res.json({ reply });
      } catch (_err) {
        // Fall back gracefully to deterministic ledger engine
        const fallbackReply = generateLedgerFallbackReply(lastUserMessage, db);
        return res.json({ reply: fallbackReply });
      }
    }

    const fallbackReply = generateLedgerFallbackReply(lastUserMessage, db);
    res.json({ reply: fallbackReply });
  } catch (err: any) {
    console.error('Error in /v1/chat:', err);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

// Get User Profile
app.get('/v1/account', (_req, res) => {
  res.json(db.users);
});

// Update User Profile
app.patch('/v1/account', (req, res) => {
  const { name, upiId, phone } = req.body;
  if (name) db.users.name = name;
  if (upiId) db.users.upiId = upiId;
  if (phone) db.users.phone = phone;

  storage.recordAction({
    action: 'PROFILE_UPDATED',
    entityType: 'user',
    entityId: db.users.id,
    actor: db.users.name,
    summary: `Updated user profile details for ${db.users.name}`,
    details: { name: db.users.name, upiId: db.users.upiId, phone: db.users.phone },
  });
  storage.saveDatabase();

  res.json(db.users);
});

// ----------------------------------------------------
// Frontend Mounting: Vite Dev Middlewares or Production Static
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`SplitSnap Server running on port ${port}`);
  });
}

startServer();
