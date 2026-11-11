import test from 'node:test';
import assert from 'node:assert/strict';
import {
  distributeLargestRemainder,
  reconcileExpense,
  calculateNetBalances,
  paiseToRupees,
  rupeesToPaise,
  LineItem,
  Adjustment,
  ItemAssignment,
} from './splitEngine';

test('paiseToRupees formats Indian currency correctly with decimals', () => {
  assert.equal(paiseToRupees(129900), '₹1,299.00');
  assert.equal(paiseToRupees(45000), '₹450.00');
  assert.equal(paiseToRupees(50), '₹0.50');
  assert.equal(paiseToRupees(15000000), '₹1,50,000.00'); // 1.5 Lakhs
  assert.equal(paiseToRupees(-25000), '-₹250.00');
});

test('rupeesToPaise parses correctly', () => {
  assert.equal(rupeesToPaise(1299), 129900);
  assert.equal(rupeesToPaise('₹1,299.00'), 129900);
  assert.equal(rupeesToPaise('54.50'), 5450);
});

test('distributeLargestRemainder distributes paise without loss or drift', () => {
  // Distribute 100 paise (₹1) among 3 people equally
  const recipients = [
    { id: 'user_a', weight: 1 },
    { id: 'user_b', weight: 1 },
    { id: 'user_c', weight: 1 },
  ];
  const res = distributeLargestRemainder(100, recipients);
  const sum = Object.values(res).reduce((a, b) => a + b, 0);

  assert.equal(sum, 100);
  // 100 / 3 = 33.333 -> two people get 33, one gets 34
  assert.equal(res['user_a'] + res['user_b'] + res['user_c'], 100);
  assert.ok(Object.values(res).every(val => val === 33 || val === 34));
});

test('PRD Example Reconciliation (Page 5): Exact 1299.00 paise sum with proportional tax and tip', () => {
  // PRD Page 5:
  // Paneer tikka ₹450.00 -> Guest A
  // Biryani ₹600.00 -> Guest B
  // Water ₹40.00 -> Guest C
  // Tax ₹54.50 -> Proportional to subtotals
  // Service charge ₹54.50 -> Proportional to subtotals
  // Tip ₹100.00 -> Proportional to subtotals
  // Total: ₹1,299.00

  const items: LineItem[] = [
    { id: 'item_1', description: 'Paneer tikka', quantity: 1, unitPricePaise: 45000, lineTotalPaise: 45000, taxIncluded: false },
    { id: 'item_2', description: 'Biryani', quantity: 1, unitPricePaise: 60000, lineTotalPaise: 60000, taxIncluded: false },
    { id: 'item_3', description: 'Water', quantity: 1, unitPricePaise: 4000, lineTotalPaise: 4000, taxIncluded: false },
  ];

  const adjustments: Adjustment[] = [
    { id: 'adj_1', type: 'tax', description: 'Tax', amountPaise: 5450, policy: 'proportional_subtotal' },
    { id: 'adj_2', type: 'service_charge', description: 'Service charge', amountPaise: 5450, policy: 'proportional_subtotal' },
    { id: 'adj_3', type: 'tip', description: 'Tip', amountPaise: 10000, policy: 'proportional_subtotal' },
  ];

  const assignments: ItemAssignment[] = [
    { lineItemId: 'item_1', memberId: 'guest_a', weight: 1 },
    { lineItemId: 'item_2', memberId: 'guest_b', weight: 1 },
    { lineItemId: 'item_3', memberId: 'guest_c', weight: 1 },
  ];

  const participantIds = ['guest_a', 'guest_b', 'guest_c'];
  const confirmedTotalPaise = 129900; // ₹1,299.00

  const result = reconcileExpense({
    confirmedTotalPaise,
    items,
    adjustments,
    assignments,
    participantIds,
  });

  assert.equal(result.isPublishable, true);
  assert.equal(result.discrepancyPaise, 0);
  assert.equal(result.unassignedItemIds.length, 0);
  assert.equal(result.allocatedTotalPaise, confirmedTotalPaise);

  const sumShares = Object.values(result.allocations).reduce((acc, a) => acc + a.totalPaise, 0);
  assert.equal(sumShares, confirmedTotalPaise, 'Total allocations must equal confirmed total exactly in paise');

  // Check guest C who ordered only water (₹40.00 subtotal)
  const guestC = result.allocations['guest_c'];
  assert.equal(guestC.itemsPaise, 4000);
  // Guest C's item is small (40 / 1090 = ~3.67%), so their tax and tip share is small and exact
  assert.ok(guestC.adjustmentsPaise > 0);
  assert.equal(guestC.totalPaise, guestC.itemsPaise + guestC.adjustmentsPaise);
});

test('Shared item split evenly between two participants', () => {
  const items: LineItem[] = [
    { id: 'item_share', description: 'Loaded Nachos Platter', quantity: 1, unitPricePaise: 50000, lineTotalPaise: 50000, taxIncluded: false },
  ];
  const adjustments: Adjustment[] = [];
  const assignments: ItemAssignment[] = [
    { lineItemId: 'item_share', memberId: 'user_1', weight: 1 },
    { lineItemId: 'item_share', memberId: 'user_2', weight: 1 },
  ];

  const result = reconcileExpense({
    confirmedTotalPaise: 50000,
    items,
    adjustments,
    assignments,
    participantIds: ['user_1', 'user_2'],
  });

  assert.equal(result.isPublishable, true);
  assert.equal(result.allocations['user_1'].totalPaise, 25000);
  assert.equal(result.allocations['user_2'].totalPaise, 25000);
});

test('Blocks publish when an item is unassigned', () => {
  const items: LineItem[] = [
    { id: 'item_1', description: 'Item 1', quantity: 1, unitPricePaise: 30000, lineTotalPaise: 30000, taxIncluded: false },
    { id: 'item_2', description: 'Item 2', quantity: 1, unitPricePaise: 20000, lineTotalPaise: 20000, taxIncluded: false },
  ];
  const assignments: ItemAssignment[] = [
    { lineItemId: 'item_1', memberId: 'user_1', weight: 1 },
    // item_2 is unassigned!
  ];

  const result = reconcileExpense({
    confirmedTotalPaise: 50000,
    items,
    adjustments: [],
    assignments,
    participantIds: ['user_1', 'user_2'],
  });

  assert.equal(result.isPublishable, false);
  assert.deepEqual(result.unassignedItemIds, ['item_2']);
  assert.equal(result.unassignedPaise, 20000);
});

test('Net balance and debt simplification calculation', () => {
  const memberIds = ['payer_host', 'member_b', 'member_c'];
  const expenses = [
    {
      payerMemberId: 'payer_host',
      totalPaise: 30000, // ₹300 paid by host
      allocations: {
        payer_host: { totalPaise: 10000 }, // owes ₹100
        member_b: { totalPaise: 10000 },   // owes ₹100
        member_c: { totalPaise: 10000 },   // owes ₹100
      },
    },
  ];

  const { balances, simplifiedDebts } = calculateNetBalances(memberIds, expenses, []);

  // Host paid 300, owes 100 -> net +200 (is owed ₹200)
  assert.equal(balances['payer_host'].netPaise, 20000);
  // Member B paid 0, owes 100 -> net -100 (owes ₹100)
  assert.equal(balances['member_b'].netPaise, -10000);
  // Member C paid 0, owes 100 -> net -100 (owes ₹100)
  assert.equal(balances['member_c'].netPaise, -10000);

  assert.equal(simplifiedDebts.length, 2);
  assert.equal(simplifiedDebts[0].toMemberId, 'payer_host');
  assert.equal(simplifiedDebts[0].amountPaise, 10000);
});

test('Direct non-itemized expense splits equally with zero paise drift', () => {
  const result = reconcileExpense({
    confirmedTotalPaise: 234000, // ₹2,340.00
    items: [],
    adjustments: [],
    assignments: [],
    participantIds: ['mem_1', 'mem_2', 'mem_3'],
  });

  assert.equal(result.isPublishable, true);
  assert.equal(result.discrepancyPaise, 0);
  assert.equal(result.allocatedTotalPaise, 234000);
  // 234000 / 3 = 78000 paise each (₹780.00)
  assert.equal(result.allocations['mem_1'].totalPaise, 78000);
  assert.equal(result.allocations['mem_2'].totalPaise, 78000);
  assert.equal(result.allocations['mem_3'].totalPaise, 78000);
});
