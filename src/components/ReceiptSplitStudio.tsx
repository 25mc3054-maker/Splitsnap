import React, { useState } from 'react';
import {
  Upload,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Users,
  Receipt,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  FileText,
  DollarSign,
} from 'lucide-react';
import { SAMPLE_RECEIPTS, SampleReceipt } from '../domain/sampleReceipts';
import {
  LineItem,
  Adjustment,
  ItemAssignment,
  reconcileExpense,
  paiseToRupees,
  rupeesToPaise,
} from '../domain/splitEngine';
import { GroupMember } from '../domain/types';
import { parseReceipt, saveExpense } from '../utils/api';
import { useNotifications } from '../context/NotificationContext';

interface ReceiptSplitStudioProps {
  groupId: string;
  groupName?: string;
  members: GroupMember[];
  onComplete: () => void;
  onCancel: () => void;
}

export const ReceiptSplitStudio: React.FC<ReceiptSplitStudioProps> = ({
  groupId,
  groupName = 'Manali Trip',
  members,
  onComplete,
  onCancel,
}) => {
  const { notify } = useNotifications();
  // Step in workflow: 1: capture/upload, 2: review/correct, 3: assign items, 4: reconcile & publish
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const defaultSample = SAMPLE_RECEIPTS[0];
  // Receipt data
  const [merchantName, setMerchantName] = useState(defaultSample.merchantName);
  const [receiptDate, setReceiptDate] = useState(defaultSample.date);
  const [grandTotalPaise, setGrandTotalPaise] = useState(defaultSample.totalPaise);
  const [items, setItems] = useState<LineItem[]>(defaultSample.items);
  const [adjustments, setAdjustments] = useState<Adjustment[]>(defaultSample.adjustments);
  const [assignments, setAssignments] = useState<ItemAssignment[]>(() => {
    return defaultSample.items.map((it, idx) => ({
      lineItemId: it.id,
      memberId: members[idx % members.length]?.id || 'm0',
      weight: 1,
    }));
  });
  const defaultPayer = members.find(m => m.isCurrentUser) || members[0];
  const [payerMemberId, setPayerMemberId] = useState(defaultPayer?.id || members[0]?.id || '');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Load a sample receipt
  const handleSelectSample = async (sample: SampleReceipt) => {
    setIsParsing(true);
    setUploadError(null);
    try {
      const res = await parseReceipt({ sampleId: sample.id });
      setMerchantName(res.merchantName);
      setReceiptDate(res.date);
      setGrandTotalPaise(res.grandTotalPaise);
      setItems(res.items);
      setAdjustments(res.adjustments);
      setWarnings(res.warnings || []);

      // Reset assignments
      setAssignments([]);
      setStep(2); // move to human review
    } catch (err: any) {
      setUploadError(err.message || 'Failed to parse sample receipt');
    } finally {
      setIsParsing(false);
    }
  };

  // Upload custom receipt image
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const res = await parseReceipt({
          imageBase64: base64,
          mimeType: file.type,
        });

        setMerchantName(res.merchantName || 'Extracted Receipt');
        setReceiptDate(res.date || new Date().toISOString().split('T')[0]);
        setGrandTotalPaise(res.grandTotalPaise);
        setItems(res.items || []);
        setAdjustments(res.adjustments || []);
        setWarnings(res.warnings || []);
        setAssignments([]);
        setStep(2);
      } catch (err: any) {
        setUploadError(err.message || 'Vision parsing encountered an issue. Using manual entry.');
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Reconcile current state
  const reconciliation = reconcileExpense({
    confirmedTotalPaise: grandTotalPaise,
    items,
    adjustments,
    assignments,
    participantIds: members.map(m => m.id),
  });

  // Line item manipulation
  const handleUpdateItem = (id: string, field: keyof LineItem, value: any) => {
    setItems(prev =>
      prev.map(it => {
        if (it.id !== id) return it;
        const updated = { ...it, [field]: value };
        if (field === 'quantity' || field === 'unitPricePaise') {
          updated.lineTotalPaise = updated.quantity * updated.unitPricePaise;
        }
        return updated;
      })
    );
  };

  const handleAddItem = () => {
    const newItem: LineItem = {
      id: `it_${Date.now()}`,
      description: 'New Item',
      quantity: 1,
      unitPricePaise: 20000,
      lineTotalPaise: 20000,
      taxIncluded: false,
      confidence: 1.0,
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleDeleteItem = (id: string) => {
    setItems(prev => prev.filter(it => it.id !== id));
    setAssignments(prev => prev.filter(a => a.lineItemId !== id));
  };

  // Adjustments manipulation
  const handleAddAdjustment = () => {
    const newAdj: Adjustment = {
      id: `adj_${Date.now()}`,
      type: 'tax',
      description: 'GST (5%)',
      amountPaise: 5000,
      policy: 'proportional_subtotal',
      confidence: 1.0,
    };
    setAdjustments(prev => [...prev, newAdj]);
  };

  const handleDeleteAdjustment = (id: string) => {
    setAdjustments(prev => prev.filter(a => a.id !== id));
  };

  // Assignment toggle for a participant on an item
  const handleToggleAssignment = (lineItemId: string, memberId: string) => {
    setAssignments(prev => {
      const exists = prev.some(a => a.lineItemId === lineItemId && a.memberId === memberId);
      if (exists) {
        return prev.filter(a => !(a.lineItemId === lineItemId && a.memberId === memberId));
      } else {
        return [...prev, { lineItemId, memberId, weight: 1 }];
      }
    });
  };

  // Quick action: Assign all items equally among all members
  const handleAssignAllEqually = () => {
    const allAssignments: ItemAssignment[] = [];
    items.forEach(it => {
      members.forEach(m => {
        allAssignments.push({ lineItemId: it.id, memberId: m.id, weight: 1 });
      });
    });
    setAssignments(allAssignments);
  };

  // Final Publish
  const handlePublish = async () => {
    if (!reconciliation.isPublishable) return;
    setIsPublishing(true);
    try {
      await saveExpense(groupId, {
        title: merchantName,
        merchantName,
        payerMemberId,
        totalPaise: grandTotalPaise,
        items,
        adjustments,
        assignments,
        publishImmediately: true,
      });

      const payer = members.find(m => m.id === payerMemberId) || members[0];
      notify({
        type: 'expense_added',
        title: 'Receipt Published & Ledger Reconciled',
        message: `"${merchantName}" (${paiseToRupees(grandTotalPaise)}) published and split across attendees with zero paise drift.`,
        amountText: paiseToRupees(grandTotalPaise),
        actorName: `${payer?.name || 'Kushagra'}${payer?.isCurrentUser ? ' (You)' : ''}`,
        actorAvatar: payer?.avatar,
        groupId,
        groupName,
        actionType: 'expense',
      });

      onComplete();
    } catch (err: any) {
      alert(err.message || 'Failed to publish expense');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-20">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/10 text-teal-400">
              <Receipt className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-bold text-white">Receipt Splitting Studio</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Capture receipt, verify vision extraction, assign items to attendees, and freeze exact paise ledger.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-1.5 text-xs">
          {[
            { num: 1, label: 'Capture' },
            { num: 2, label: 'Review AI' },
            { num: 3, label: 'Assign' },
            { num: 4, label: 'Publish' },
          ].map(s => (
            <button
              key={s.num}
              onClick={() => {
                if (s.num <= step || (s.num === 3 && items.length > 0) || (s.num === 4 && assignments.length > 0)) {
                  setStep(s.num as any);
                }
              }}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                step === s.num
                  ? 'bg-teal-600 text-white font-semibold'
                  : s.num < step
                  ? 'bg-slate-800 text-teal-300'
                  : 'bg-slate-900 text-slate-500'
              }`}
            >
              <span>{s.num}.</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* STEP 1: CAPTURE / UPLOAD */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Upload card */}
          <div className="rounded-2xl border-2 border-dashed border-slate-800 bg-slate-900/40 p-8 text-center hover:border-teal-500/40 transition-colors">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-400 mb-4">
              <Upload className="h-7 w-7" />
            </div>
            <h3 className="text-base font-semibold text-white">Upload Receipt Photo</h3>
            <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
              Our server-side Gemini 3.8 Flash pipeline automatically extracts line items, taxes, discounts, and totals into integer paise.
            </p>

            <div className="mt-5">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-teal-900/30 hover:bg-teal-500 transition-colors">
                <Sparkles className="h-4 w-4" />
                <span>{isParsing ? 'Extracting with Gemini AI...' : 'Choose Receipt Image'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/heic"
                  onChange={handleFileUpload}
                  disabled={isParsing}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Quick Sample Receipts from PRD */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                Or pick a verified sample Indian receipt:
              </span>
              <span className="text-[11px] text-teal-400">1-click hackathon evaluation</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {SAMPLE_RECEIPTS.map(sample => (
                <button
                  key={sample.id}
                  onClick={() => handleSelectSample(sample)}
                  disabled={isParsing}
                  className="flex flex-col text-left rounded-xl border border-slate-800 bg-[#121926] p-4 hover:border-teal-500/50 hover:bg-slate-900 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white group-hover:text-teal-300 transition-colors">
                      {sample.merchantName}
                    </span>
                    <span className="font-mono text-xs font-bold text-teal-400">
                      {paiseToRupees(sample.totalPaise)}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">{sample.category} · {sample.location}</div>
                  <div className="mt-2 text-[11px] text-slate-500 line-clamp-2">
                    {sample.notes}
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-teal-400">
                    <span>Load & Extract</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {uploadError && (
            <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-xs text-red-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: HUMAN REVIEW & CORRECTION */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Bill Level Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Merchant / Title</label>
              <input
                type="text"
                value={merchantName}
                onChange={e => setMerchantName(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Date</label>
              <input
                type="date"
                value={receiptDate}
                onChange={e => setReceiptDate(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Confirmed Grand Total (INR)</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-slate-400">₹</span>
                <input
                  type="number"
                  step="0.01"
                  value={(grandTotalPaise / 100).toFixed(2)}
                  onChange={e => setGrandTotalPaise(rupeesToPaise(e.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 pl-7 pr-3 py-1.5 font-mono text-xs text-teal-400 font-bold focus:border-teal-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="rounded-xl border border-slate-800 bg-[#101725] overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Line Items</h3>
                <span className="text-[11px] text-slate-400">({items.length} items extracted)</span>
              </div>
              <button
                onClick={handleAddItem}
                className="flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:text-white transition-colors"
              >
                <Plus className="h-3 w-3" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="divide-y divide-slate-800/80">
              {items.map((item, idx) => (
                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 text-xs hover:bg-slate-900/30">
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-slate-500 font-mono w-4">{idx + 1}.</span>
                    <input
                      type="text"
                      value={item.description}
                      onChange={e => handleUpdateItem(item.id, 'description', e.target.value)}
                      className="flex-1 rounded border border-transparent bg-transparent px-2 py-1 text-white hover:border-slate-700 focus:border-teal-500 focus:bg-slate-800 focus:outline-none"
                    />
                    {item.confidence && (
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono shrink-0">
                        {Math.round(item.confidence * 100)}% conf
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-slate-400">
                      <span>Qty:</span>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={e => handleUpdateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-12 rounded border border-slate-700 bg-slate-800 px-1.5 py-1 text-center font-mono text-white"
                      />
                    </div>

                    <div className="flex items-center gap-1 text-slate-400">
                      <span>Unit: ₹</span>
                      <input
                        type="number"
                        step="0.01"
                        value={(item.unitPricePaise / 100).toFixed(2)}
                        onChange={e => handleUpdateItem(item.id, 'unitPricePaise', rupeesToPaise(e.target.value))}
                        className="w-20 rounded border border-slate-700 bg-slate-800 px-1.5 py-1 text-right font-mono text-white"
                      />
                    </div>

                    <div className="w-24 text-right font-mono font-bold text-teal-400">
                      {paiseToRupees(item.lineTotalPaise)}
                    </div>

                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-slate-500 hover:text-red-400 transition-colors p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Adjustments (Tax, Service Charge, Tips, Discounts) */}
          <div className="rounded-xl border border-slate-800 bg-[#101725] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Bill Adjustments & Taxes</h3>
                <p className="text-[11px] text-slate-400">
                  Allocated proportionally by item subtotals or equally per person.
                </p>
              </div>
              <button
                onClick={handleAddAdjustment}
                className="flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:text-white transition-colors"
              >
                <Plus className="h-3 w-3" />
                <span>Add Adjustment</span>
              </button>
            </div>

            <div className="space-y-2">
              {adjustments.map(adj => (
                <div key={adj.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-slate-800/80 bg-slate-900/50 p-2.5 text-xs">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="font-semibold text-slate-300">{adj.description}</span>
                    <span className="text-[10px] text-slate-500 uppercase">({adj.type})</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={adj.policy}
                      onChange={e => {
                        const val = e.target.value as any;
                        setAdjustments(prev => prev.map(a => a.id === adj.id ? { ...a, policy: val } : a));
                      }}
                      className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200 focus:border-teal-500 focus:outline-none"
                    >
                      <option value="proportional_subtotal">Proportional to Subtotals</option>
                      <option value="equal_all">Equal to All Attendees</option>
                    </select>

                    <div className="flex items-center gap-1">
                      <span className="text-slate-400">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        value={(adj.amountPaise / 100).toFixed(2)}
                        onChange={e => {
                          const val = rupeesToPaise(e.target.value);
                          setAdjustments(prev => prev.map(a => a.id === adj.id ? { ...a, amountPaise: val } : a));
                        }}
                        className="w-20 rounded border border-slate-700 bg-slate-800 px-1.5 py-1 text-right font-mono text-teal-400 font-bold"
                      />
                    </div>

                    <button
                      onClick={() => handleDeleteAdjustment(adj.id)}
                      className="text-slate-500 hover:text-red-400 transition-colors p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reconciliation check banner */}
          {reconciliation.warnings.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-300 space-y-1">
              {reconciliation.warnings.map((w, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-between border-t border-slate-800 pt-4">
            <button
              onClick={() => setStep(1)}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              ← Back to Upload
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-500 transition-colors"
            >
              <span>Continue to Item Assignment</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: MANUAL ITEM ASSIGNMENT */}
      {step === 3 && (
        <div className="space-y-6">
          {/* Quick bar & Payer selection */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Who paid the receipt?</label>
              <select
                value={payerMemberId}
                onChange={e => setPayerMemberId(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:border-teal-500 focus:outline-none"
              >
                {members.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.isCurrentUser ? '(You)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleAssignAllEqually}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
              >
                Quick: Split All Items Equally
              </button>
            </div>
          </div>

          {/* PRD Rule Notice */}
          <div className="rounded-lg border border-teal-500/20 bg-teal-950/20 p-3 text-xs text-teal-300 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              <strong>PRD Rule (FR 08):</strong> Guests manually choose the items they consumed; AI never assigns consumption. Shared dishes divide line amounts before adjustment allocation.
            </span>
          </div>

          {/* Items and Participant Toggles */}
          <div className="space-y-3">
            {items.map((item, idx) => {
              const itemAssignments = assignments.filter(a => a.lineItemId === item.id);
              const isUnassigned = itemAssignments.length === 0;

              return (
                <div
                  key={item.id}
                  className={`rounded-xl border p-4 transition-all ${
                    isUnassigned
                      ? 'border-amber-500/40 bg-amber-950/10'
                      : 'border-slate-800 bg-[#101725]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-500">{idx + 1}.</span>
                      <span className="font-semibold text-white text-sm">{item.description}</span>
                      <span className="text-xs text-slate-400">×{item.quantity}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-teal-400 text-sm">
                        {paiseToRupees(item.lineTotalPaise)}
                      </span>
                      {isUnassigned ? (
                        <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                          Unassigned
                        </span>
                      ) : (
                        <span className="rounded bg-teal-500/20 px-2 py-0.5 text-[11px] font-semibold text-teal-300">
                          {itemAssignments.length} {itemAssignments.length === 1 ? 'person' : 'sharing'} (
                          {paiseToRupees(Math.round(item.lineTotalPaise / itemAssignments.length))} each)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Member Selection Buttons */}
                  <div className="mt-3">
                    <span className="text-[11px] text-slate-400 block mb-2">Who consumed this item?</span>
                    <div className="flex flex-wrap gap-2">
                      {members.map(member => {
                        const isSelected = itemAssignments.some(a => a.memberId === member.id);
                        return (
                          <button
                            key={member.id}
                            onClick={() => handleToggleAssignment(item.id, member.id)}
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                              isSelected
                                ? 'bg-teal-600 text-white shadow-sm ring-1 ring-teal-400'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                            }`}
                          >
                            <span>{member.name}</span>
                            {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live Unallocated Tracker Meter */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs text-slate-400">Reconciliation Status:</span>
                <div className="flex items-center gap-2 mt-1">
                  {reconciliation.unassignedItemIds.length === 0 && reconciliation.discrepancyPaise === 0 ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" /> 100% Reconciled (Zero Paise Drift)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                      <AlertTriangle className="h-4 w-4" />
                      {reconciliation.unassignedItemIds.length > 0
                        ? `${reconciliation.unassignedItemIds.length} item(s) unassigned`
                        : `Discrepancy: ${paiseToRupees(reconciliation.discrepancyPaise)}`}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-6 font-mono text-xs">
                <div>
                  <div className="text-slate-500">Confirmed Total</div>
                  <div className="font-bold text-white">{paiseToRupees(grandTotalPaise)}</div>
                </div>
                <div>
                  <div className="text-slate-500">Allocated</div>
                  <div className="font-bold text-teal-400">{paiseToRupees(reconciliation.allocatedTotalPaise)}</div>
                </div>
                <div>
                  <div className="text-slate-500">Remaining</div>
                  <div className={`font-bold ${reconciliation.discrepancyPaise === 0 ? 'text-slate-400' : 'text-amber-400'}`}>
                    {paiseToRupees(reconciliation.discrepancyPaise)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Nav */}
          <div className="flex items-center justify-between border-t border-slate-800 pt-4">
            <button
              onClick={() => setStep(2)}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              ← Back to Review
            </button>
            <button
              onClick={() => setStep(4)}
              disabled={reconciliation.unassignedItemIds.length > 0}
              className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-500 disabled:opacity-50 transition-colors"
            >
              <span>View Reconciled Shares</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: RECONCILE & PUBLISH */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-[#101725] p-5">
            <h3 className="text-sm font-bold text-white mb-1">Final Reconciled Split Summary</h3>
            <p className="text-xs text-slate-400 mb-4">
              Review exact paise allocations per attendee before freezing version 1 into the group ledger.
            </p>

            <div className="divide-y divide-slate-800">
              {members.map(member => {
                const alloc = reconciliation.allocations[member.id];
                if (!alloc) return null;

                return (
                  <div key={member.id} className="py-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white">
                          {member.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-semibold text-white text-xs">{member.name}</span>
                          <span className="text-[11px] text-slate-400 ml-2">
                            (Items: {paiseToRupees(alloc.itemsPaise)} · Adjustments: {paiseToRupees(alloc.adjustmentsPaise)})
                          </span>
                        </div>
                      </div>

                      <div className="font-mono text-sm font-bold text-teal-400">
                        {paiseToRupees(alloc.totalPaise)}
                      </div>
                    </div>

                    {/* Breakdown of items */}
                    <div className="pl-9 space-y-1 text-[11px] text-slate-400">
                      {alloc.itemDetails.map((it, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>{it.description} ({it.portionDescription})</span>
                          <span className="font-mono text-slate-300">{paiseToRupees(it.paise)}</span>
                        </div>
                      ))}
                      {alloc.adjustmentDetails.map((adj, idx) => (
                        <div key={idx} className="flex justify-between text-slate-500">
                          <span>{adj.description} (proportional)</span>
                          <span className="font-mono">{paiseToRupees(adj.paise)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Zero paise drift certificate */}
            <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-4">
              <span className="text-xs font-semibold text-slate-300">Sum of All Published Shares:</span>
              <div className="font-mono text-base font-bold text-teal-400">
                {paiseToRupees(reconciliation.allocatedTotalPaise)}
              </div>
            </div>
          </div>

          {/* Publishing error if any */}
          {!reconciliation.isPublishable && (
            <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-xs text-red-300 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <strong>Publishing Blocked (PRD Invariant):</strong>
                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                  {reconciliation.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-between border-t border-slate-800 pt-4">
            <button
              onClick={() => setStep(3)}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              ← Back to Assignments
            </button>
            <button
              onClick={handlePublish}
              disabled={!reconciliation.isPublishable || isPublishing}
              className="flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-teal-900/40 hover:bg-teal-500 disabled:opacity-50 transition-colors"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isPublishing ? 'Freezing & Publishing...' : 'Freeze Split & Update Ledger'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
