/**
 * SplitSnap Domain Split Calculation Engine
 * 
 * Rules:
 * - All calculations run in integer paise (1 INR = 100 paise)
 * - Zero paise drift: sum(expense allocations) === confirmed expense total
 * - Deterministic largest-remainder rounding (Hamilton-Hare method)
 * - Tie-breaking by stable participant ID
 * - No floating point currency math
 */

export interface LineItem {
  id: string;
  description: string;
  quantity: number; // integer quantity
  unitPricePaise: number; // integer paise
  lineTotalPaise: number; // integer paise (quantity * unitPricePaise)
  taxIncluded: boolean;
  confidence?: number;
}

export type AdjustmentType = 'tax' | 'service_charge' | 'tip' | 'discount' | 'packaging' | 'other';

export type AllocationPolicy = 'proportional_subtotal' | 'equal_all' | 'selected_set' | 'explicit';

export interface Adjustment {
  id: string;
  type: AdjustmentType;
  description: string;
  amountPaise: number; // integer paise (positive for tax/tip/fee, negative for discount)
  policy: AllocationPolicy;
  eligibleMemberIds?: string[]; // for selected_set
  explicitSharesPaise?: Record<string, number>; // for explicit
  confidence?: number;
}

export interface ItemAssignment {
  lineItemId: string;
  memberId: string;
  // shareBps: basis points (10000 = 100%), or weight
  weight: number; 
}

export interface ParticipantAllocation {
  memberId: string;
  itemsPaise: number;
  itemDetails: { lineItemId: string; description: string; paise: number; portionDescription: string }[];
  adjustmentsPaise: number;
  adjustmentDetails: { adjustmentId: string; description: string; paise: number }[];
  totalPaise: number;
}

export interface ReconciliationResult {
  isPublishable: boolean;
  confirmedTotalPaise: number;
  allocatedTotalPaise: number;
  unassignedPaise: number;
  discrepancyPaise: number;
  unassignedItemIds: string[];
  allocations: Record<string, ParticipantAllocation>;
  errors: string[];
  warnings: string[];
}

/**
 * Format integer paise into standard Indian Rupee string (e.g. 129900 -> ₹1,299.00)
 */
export function paiseToRupees(paise: number): string {
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = Math.floor(absPaise / 100);
  const remainder = absPaise % 100;
  const paiseStr = remainder.toString().padStart(2, '0');

  // Format with Indian grouping (last 3 digits, then pairs of 2)
  const rupeesStr = rupees.toString();
  let formattedRupees = '';
  if (rupeesStr.length <= 3) {
    formattedRupees = rupeesStr;
  } else {
    const last3 = rupeesStr.slice(-3);
    const leading = rupeesStr.slice(0, -3);
    const grouped = leading.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    formattedRupees = `${grouped},${last3}`;
  }

  return `${isNegative ? '-' : ''}₹${formattedRupees}.${paiseStr}`;
}

/**
 * Parse a rupee string or number into integer paise
 */
export function rupeesToPaise(input: string | number): number {
  if (typeof input === 'number') {
    return Math.round(input * 100);
  }
  const clean = input.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(clean);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

/**
 * Distribute an integer amount in paise among entities using weights and largest remainder rounding.
 * Guarantees exact sum equality: sum(result) === totalPaise
 */
export function distributeLargestRemainder(
  totalPaise: number,
  recipients: { id: string; weight: number }[]
): Record<string, number> {
  const result: Record<string, number> = {};
  if (recipients.length === 0 || totalPaise === 0) {
    recipients.forEach(r => { result[r.id] = 0; });
    return result;
  }

  const totalWeight = recipients.reduce((sum, r) => sum + r.weight, 0);
  if (totalWeight <= 0) {
    // If no weights, split equally among all
    const equalShare = Math.floor(totalPaise / recipients.length);
    let rem = totalPaise - equalShare * recipients.length;
    recipients.forEach((r, idx) => {
      result[r.id] = equalShare + (idx < rem ? 1 : 0);
    });
    return result;
  }

  // Calculate integer base and fractional remainder
  const isNegative = totalPaise < 0;
  const absTotal = Math.abs(totalPaise);
  let allocatedAbs = 0;

  const sharesWithRemainder: { id: string; base: number; remainder: number }[] = [];

  for (const r of recipients) {
    const exact = (absTotal * r.weight) / totalWeight;
    const base = Math.floor(exact);
    const rem = exact - base;
    sharesWithRemainder.push({ id: r.id, base, remainder: rem });
    allocatedAbs += base;
  }

  let remainingPaise = absTotal - allocatedAbs;

  // Sort by remainder descending, tie-break by stable ID
  sharesWithRemainder.sort((a, b) => {
    if (Math.abs(b.remainder - a.remainder) > 1e-9) {
      return b.remainder - a.remainder;
    }
    return a.id.localeCompare(b.id);
  });

  // Distribute remaining 1-paise units
  for (let i = 0; i < sharesWithRemainder.length; i++) {
    if (remainingPaise > 0) {
      sharesWithRemainder[i].base += 1;
      remainingPaise -= 1;
    }
    result[sharesWithRemainder[i].id] = isNegative ? -sharesWithRemainder[i].base : sharesWithRemainder[i].base;
  }

  return result;
}

/**
 * Reconcile receipt line items, assignments, adjustments and calculate exact participant shares
 */
export function reconcileExpense(params: {
  confirmedTotalPaise: number;
  items: LineItem[];
  adjustments: Adjustment[];
  assignments: ItemAssignment[];
  participantIds: string[];
}): ReconciliationResult {
  const { confirmedTotalPaise, items, adjustments, assignments, participantIds } = params;
  const errors: string[] = [];
  const warnings: string[] = [];

  // Initialize allocation structure for each participant
  const allocations: Record<string, ParticipantAllocation> = {};
  for (const id of participantIds) {
    allocations[id] = {
      memberId: id,
      itemsPaise: 0,
      itemDetails: [],
      adjustmentsPaise: 0,
      adjustmentDetails: [],
      totalPaise: 0,
    };
  }

  // Step 1: Assign line items to participants
  const unassignedItemIds: string[] = [];
  let allocatedItemsTotalPaise = 0;

  // If no line items or adjustments were provided, treat as direct equal/weighted split of confirmed total
  if (items.length === 0 && adjustments.length === 0 && confirmedTotalPaise > 0) {
    const activeParticipants = assignments.length > 0
      ? assignments.map(a => ({ id: a.memberId, weight: a.weight > 0 ? a.weight : 1 }))
      : participantIds.map(id => ({ id, weight: 1 }));

    const distributed = distributeLargestRemainder(confirmedTotalPaise, activeParticipants);

    let allocatedTotalPaise = 0;
    for (const [id, sharePaise] of Object.entries(distributed)) {
      if (allocations[id]) {
        allocations[id].itemsPaise = sharePaise;
        allocations[id].totalPaise = sharePaise;
        allocations[id].itemDetails.push({
          lineItemId: 'direct',
          description: 'Direct Group Split',
          paise: sharePaise,
          portionDescription: 'Equal/Weighted Share',
        });
        allocatedTotalPaise += sharePaise;
      }
    }

    return {
      isPublishable: allocatedTotalPaise === confirmedTotalPaise && errors.length === 0,
      confirmedTotalPaise,
      allocatedTotalPaise,
      unassignedPaise: 0,
      discrepancyPaise: confirmedTotalPaise - allocatedTotalPaise,
      unassignedItemIds: [],
      allocations,
      errors,
      warnings,
    };
  }

  for (const item of items) {
    const itemAssignments = assignments.filter(a => a.lineItemId === item.id);
    if (itemAssignments.length === 0) {
      unassignedItemIds.push(item.id);
      continue;
    }

    const totalWeight = itemAssignments.reduce((acc, a) => acc + a.weight, 0);
    const recipients = itemAssignments.map(a => ({ id: a.memberId, weight: a.weight }));
    const distributed = distributeLargestRemainder(item.lineTotalPaise, recipients);

    for (const a of itemAssignments) {
      const sharePaise = distributed[a.memberId] || 0;
      if (allocations[a.memberId]) {
        allocations[a.memberId].itemsPaise += sharePaise;
        allocatedItemsTotalPaise += sharePaise;

        let portionDesc = 'Full portion';
        if (itemAssignments.length > 1) {
          const pct = Math.round((a.weight / totalWeight) * 100);
          portionDesc = `Shared (${pct}% of ${itemAssignments.length} people)`;
        }

        allocations[a.memberId].itemDetails.push({
          lineItemId: item.id,
          description: item.description,
          paise: sharePaise,
          portionDescription: portionDesc,
        });
      }
    }
  }

  // Step 2: Allocate adjustments (tax, service charges, tips, discounts)
  let allocatedAdjustmentsTotalPaise = 0;

  for (const adj of adjustments) {
    let adjDistribution: Record<string, number> = {};

    if (adj.policy === 'proportional_subtotal') {
      // Proportional to each participant's item subtotals
      const subtotalRecipients = participantIds
        .map(id => ({ id, weight: allocations[id]?.itemsPaise || 0 }))
        .filter(r => r.weight > 0);

      if (subtotalRecipients.length > 0) {
        adjDistribution = distributeLargestRemainder(adj.amountPaise, subtotalRecipients);
      } else {
        // Fallback to equal split among all participants if nobody has items yet
        const allRecipients = participantIds.map(id => ({ id, weight: 1 }));
        adjDistribution = distributeLargestRemainder(adj.amountPaise, allRecipients);
      }
    } else if (adj.policy === 'equal_all') {
      const allRecipients = participantIds.map(id => ({ id, weight: 1 }));
      adjDistribution = distributeLargestRemainder(adj.amountPaise, allRecipients);
    } else if (adj.policy === 'selected_set') {
      const eligible = (adj.eligibleMemberIds && adj.eligibleMemberIds.length > 0)
        ? adj.eligibleMemberIds
        : participantIds;
      const eligibleRecipients = eligible.map(id => ({ id, weight: 1 }));
      adjDistribution = distributeLargestRemainder(adj.amountPaise, eligibleRecipients);
    } else if (adj.policy === 'explicit') {
      adjDistribution = adj.explicitSharesPaise || {};
    }

    for (const id of participantIds) {
      const sharePaise = adjDistribution[id] || 0;
      if (allocations[id]) {
        allocations[id].adjustmentsPaise += sharePaise;
        allocatedAdjustmentsTotalPaise += sharePaise;
        allocations[id].adjustmentDetails.push({
          adjustmentId: adj.id,
          description: adj.description,
          paise: sharePaise,
        });
      }
    }
  }

  // Step 3: Compute final totals
  let allocatedTotalPaise = 0;
  for (const id of participantIds) {
    allocations[id].totalPaise = allocations[id].itemsPaise + allocations[id].adjustmentsPaise;
    allocatedTotalPaise += allocations[id].totalPaise;
  }

  const itemsTotalPaise = items.reduce((sum, item) => sum + item.lineTotalPaise, 0);
  const adjustmentsTotalPaise = adjustments.reduce((sum, adj) => sum + adj.amountPaise, 0);
  const calculatedGrandTotalPaise = itemsTotalPaise + adjustmentsTotalPaise;

  const discrepancyPaise = confirmedTotalPaise - allocatedTotalPaise;
  const unassignedPaise = items
    .filter(i => unassignedItemIds.includes(i.id))
    .reduce((sum, i) => sum + i.lineTotalPaise, 0);

  // Validation errors
  if (unassignedItemIds.length > 0) {
    errors.push(`${unassignedItemIds.length} item(s) are not yet assigned to any participant.`);
  }

  if (calculatedGrandTotalPaise !== confirmedTotalPaise) {
    warnings.push(`Receipt line items + adjustments (₹${(calculatedGrandTotalPaise / 100).toFixed(2)}) do not match confirmed total (₹${(confirmedTotalPaise / 100).toFixed(2)}). Check tax or discount lines.`);
  }

  if (discrepancyPaise !== 0) {
    errors.push(`Split mismatch: Allocated amount differs from confirmed total by ${paiseToRupees(discrepancyPaise)}.`);
  }

  const isPublishable = unassignedItemIds.length === 0 && discrepancyPaise === 0 && errors.length === 0;

  return {
    isPublishable,
    confirmedTotalPaise,
    allocatedTotalPaise,
    unassignedPaise,
    discrepancyPaise,
    unassignedItemIds,
    allocations,
    errors,
    warnings,
  };
}

/**
 * Settle balances among members based on who paid and who was allocated expenses
 */
export interface BalanceSummary {
  memberId: string;
  paidPaise: number;
  owedPaise: number; // total allocated to them
  netPaise: number; // paid - owed. > 0 means they should receive money, < 0 means they owe
}

export interface SimplifiedDebt {
  fromMemberId: string;
  toMemberId: string;
  amountPaise: number;
}

export function calculateNetBalances(
  memberIds: string[],
  publishedExpenses: {
    payerMemberId: string;
    totalPaise: number;
    allocations: Record<string, { totalPaise: number }>;
  }[],
  confirmedSettlements: {
    fromMemberId: string;
    toMemberId: string;
    amountPaise: number;
  }[]
): {
  balances: Record<string, BalanceSummary>;
  simplifiedDebts: SimplifiedDebt[];
} {
  const balances: Record<string, BalanceSummary> = {};
  for (const id of memberIds) {
    balances[id] = {
      memberId: id,
      paidPaise: 0,
      owedPaise: 0,
      netPaise: 0,
    };
  }

  // Aggregate published expenses
  for (const exp of publishedExpenses) {
    if (balances[exp.payerMemberId]) {
      balances[exp.payerMemberId].paidPaise += exp.totalPaise;
    }
    for (const [mId, alloc] of Object.entries(exp.allocations)) {
      if (balances[mId]) {
        balances[mId].owedPaise += alloc.totalPaise;
      }
    }
  }

  // Apply confirmed settlements (settlement reduces the payer's debt and receiver's credit)
  for (const set of confirmedSettlements) {
    if (balances[set.fromMemberId]) {
      // Payer settled, so they effectively "paid" their share to the group
      balances[set.fromMemberId].paidPaise += set.amountPaise;
    }
    if (balances[set.toMemberId]) {
      // Receiver got money, so their net receivable decreases
      balances[set.toMemberId].owedPaise += set.amountPaise;
    }
  }

  // Calculate net
  for (const id of memberIds) {
    balances[id].netPaise = balances[id].paidPaise - balances[id].owedPaise;
  }

  // Calculate simplified debts
  // Positive net = debtors (they need to receive money from group)
  // Negative net = creditors (they owe money to group)
  const debtors: { id: string; amount: number }[] = [];
  const creditors: { id: string; amount: number }[] = [];

  for (const id of memberIds) {
    const net = balances[id].netPaise;
    if (net < 0) {
      debtors.push({ id, amount: Math.abs(net) }); // owes money
    } else if (net > 0) {
      creditors.push({ id, amount: net }); // is owed money
    }
  }

  const simplifiedDebts: SimplifiedDebt[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];
    const settled = Math.min(debtor.amount, creditor.amount);

    if (settled > 0) {
      simplifiedDebts.push({
        fromMemberId: debtor.id,
        toMemberId: creditor.id,
        amountPaise: settled,
      });
    }

    debtor.amount -= settled;
    creditor.amount -= settled;

    if (debtor.amount === 0) dIdx++;
    if (creditor.amount === 0) cIdx++;
  }

  return { balances, simplifiedDebts };
}
