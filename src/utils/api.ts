import { Group, Settlement, Expense } from '../domain/types';

export async function fetchGroups(): Promise<any[]> {
  const res = await fetch('/v1/groups');
  if (!res.ok) throw new Error('Failed to fetch groups');
  return res.json();
}

export async function fetchGroup(id: string): Promise<{ group: Group; balances: any; simplifiedDebts: any[] }> {
  const res = await fetch(`/v1/groups/${id}`);
  if (!res.ok) throw new Error('Failed to fetch group');
  return res.json();
}

export async function createGroup(data: any): Promise<Group> {
  const res = await fetch('/v1/groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create group');
  return res.json();
}

export async function parseReceipt(body: { sampleId?: string; imageBase64?: string; mimeType?: string }): Promise<any> {
  const res = await fetch('/v1/receipts/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to parse receipt');
  }
  return res.json();
}

export async function saveExpense(groupId: string, data: any): Promise<{ expense: Expense; reconciliation: any }> {
  const res = await fetch(`/v1/groups/${groupId}/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to save expense');
  }
  return res.json();
}

export async function updateAssignments(expenseId: string, assignments: any[], participantId?: string): Promise<any> {
  const res = await fetch(`/v1/expenses/${expenseId}/assignments`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assignments, participantId }),
  });
  if (!res.ok) throw new Error('Failed to update assignments');
  return res.json();
}

export async function createInvite(groupId: string, memberId: string): Promise<any> {
  const res = await fetch(`/v1/groups/${groupId}/invites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId }),
  });
  if (!res.ok) throw new Error('Failed to create invite');
  return res.json();
}

export async function claimInvite(token: string): Promise<any> {
  const res = await fetch('/v1/invites/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Invalid invite');
  }
  return res.json();
}

export async function createSettlement(data: any): Promise<Settlement> {
  const res = await fetch('/v1/settlements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create settlement');
  return res.json();
}

export async function getUpiIntent(settlementId: string): Promise<any> {
  const res = await fetch(`/v1/settlements/${settlementId}/upi-intent`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to get UPI intent');
  return res.json();
}

export async function reportPaid(settlementId: string, utr?: string, notes?: string): Promise<any> {
  const res = await fetch(`/v1/settlements/${settlementId}/report-paid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ utr, notes }),
  });
  if (!res.ok) throw new Error('Failed to report payment');
  return res.json();
}

export async function confirmSettlement(settlementId: string): Promise<any> {
  const res = await fetch(`/v1/settlements/${settlementId}/confirm`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to confirm settlement');
  return res.json();
}

export interface PayPalConfigResponse {
  configured: boolean;
  clientId: string;
  hasSecret: boolean;
  environment: 'sandbox' | 'live';
  currency: string;
  exchangeRate: number;
}

export async function fetchPayPalConfig(): Promise<PayPalConfigResponse> {
  const res = await fetch('/v1/paypal/config');
  if (!res.ok) throw new Error('Failed to fetch PayPal config');
  return res.json();
}

export async function updatePayPalConfig(config: {
  clientId?: string;
  clientSecret?: string;
  currency?: string;
}): Promise<any> {
  const res = await fetch('/v1/paypal/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error('Failed to update PayPal config');
  return res.json();
}

export async function testPayPalConnection(): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/v1/paypal/test-connection', { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'PayPal Sandbox connection test failed');
  return data;
}

export async function createPayPalOrder(settlementId: string, customAmount?: string): Promise<any> {
  const res = await fetch('/v1/paypal/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settlementId, customAmount }),
  });
  if (!res.ok) throw new Error('Failed to create PayPal sandbox order');
  return res.json();
}

export async function capturePayPalOrder(
  orderId: string,
  settlementId: string,
  clearLedger: boolean = true
): Promise<any> {
  const res = await fetch(`/v1/paypal/orders/${orderId}/capture`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settlementId, clearLedger }),
  });
  if (!res.ok) throw new Error('Failed to capture PayPal sandbox order');
  return res.json();
}

export async function resetDemo(): Promise<any> {
  const res = await fetch('/v1/demo/reset', { method: 'POST' });
  return res.json();
}

export interface DatabaseStatus {
  status: string;
  driver: string;
  dbPath: string;
  journalPath: string;
  createdAt: string;
  lastSavedAt: string;
  groupsCount: number;
  totalExpenses: number;
  totalSettlements: number;
  actionsInMemory: number;
  totalActionsRecorded: number;
  journalSizeBytes: number;
}

export interface ActionJournalItem {
  id: string;
  timestamp: string;
  action: string;
  entityType: string;
  entityId: string;
  actor: string;
  summary: string;
  details?: Record<string, any>;
}

export async function fetchDatabaseStatus(): Promise<DatabaseStatus> {
  const res = await fetch('/v1/database/status');
  if (!res.ok) throw new Error('Failed to fetch database status');
  return res.json();
}

export async function fetchActionJournal(limit = 100, entityType?: string): Promise<{ status: string; totalEntries: number; entries: ActionJournalItem[] }> {
  const params = new URLSearchParams({ limit: limit.toString() });
  if (entityType) params.append('entityType', entityType);
  const res = await fetch(`/v1/database/journal?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch action journal');
  return res.json();
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export async function sendChatMessage(messages: ChatMessage[]): Promise<{ reply: string }> {
  const res = await fetch('/v1/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to send chat message');
  }
  return res.json();
}

export async function fetchAccount(): Promise<{ id: string; name: string; phone: string; email: string; upiId: string; avatar?: string }> {
  const res = await fetch('/v1/account');
  if (!res.ok) throw new Error('Failed to fetch account');
  return res.json();
}

export async function updateAccount(data: { name?: string; upiId?: string; phone?: string }): Promise<any> {
  const res = await fetch('/v1/account', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update account');
  return res.json();
}


