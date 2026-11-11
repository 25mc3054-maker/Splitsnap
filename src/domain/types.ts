import { LineItem, Adjustment, ItemAssignment, ParticipantAllocation } from './splitEngine';

export type GroupType = 'Trip' | 'Home' | 'Couple' | 'Other';

export interface GroupMember {
  id: string;
  groupId: string;
  name: string;
  upiId?: string;
  avatar: string;
  role: 'owner' | 'member' | 'guest';
  isCurrentUser?: boolean;
}

export interface GuestInvite {
  id: string;
  groupId: string;
  memberId: string;
  token: string;
  expiresAt: string;
  revokedAt?: string;
  claimedAt?: string;
  inviteUrl: string;
}

export interface Expense {
  id: string;
  groupId: string;
  title: string;
  merchantName: string;
  occurredAt: string;
  currency: 'INR';
  payerMemberId: string;
  totalPaise: number;
  state: 'draft' | 'published';
  version: number;
  items: LineItem[];
  adjustments: Adjustment[];
  assignments: ItemAssignment[];
  allocations?: Record<string, ParticipantAllocation>;
  receiptImage?: string;
  aiConfidence?: number;
  reconciliationWarnings?: string[];
  createdAt: string;
  updatedAt: string;
}

export type SettlementStatus = 'pending' | 'reported' | 'confirmed' | 'failed';
export type PaymentMethod = 'paypal_sandbox' | 'cash';

export interface Settlement {
  id: string;
  groupId: string;
  fromMemberId: string;
  toMemberId: string;
  amountPaise: number;
  method: PaymentMethod;
  status: SettlementStatus;
  providerRef?: string; // UTR or PayPal Order ID
  notes?: string;
  createdAt: string;
  reportedAt?: string;
  confirmedAt?: string;
  sandboxDetails?: {
    usdAmount: string;
    orderId: string;
    captureId?: string;
    payerEmail?: string;
    payerName?: string;
    mode?: 'live_sandbox' | 'mock_sandbox';
    isSandboxOnly: boolean;
  };
}

export interface ActivityEvent {
  id: string;
  groupId: string;
  actorName: string;
  eventType: 'expense_created' | 'expense_published' | 'expense_updated' | 'invite_created' | 'invite_claimed' | 'payment_reported' | 'payment_confirmed' | 'paypal_sandbox_captured';
  description: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface Group {
  id: string;
  name: string;
  type: GroupType;
  startDate?: string;
  endDate?: string;
  currency: 'INR';
  ownerUserId: string;
  members: GroupMember[];
  expenses: Expense[];
  settlements: Settlement[];
  invites: GuestInvite[];
  activity: ActivityEvent[];
  createdAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  upiId: string;
  avatar: string;
  locale: string;
}
