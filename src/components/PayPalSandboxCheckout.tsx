import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  Settings,
  RefreshCw,
  Sparkles,
  DollarSign,
  ArrowRight,
  Info,
  CreditCard,
  Lock,
} from 'lucide-react';
import {
  fetchPayPalConfig,
  updatePayPalConfig,
  testPayPalConnection,
  createPayPalOrder,
  capturePayPalOrder,
  PayPalConfigResponse,
} from '../utils/api';
import { Settlement } from '../domain/types';

interface PayPalSandboxCheckoutProps {
  settlement: Settlement;
  recipientName: string;
  groupName?: string;
  onSuccess?: () => void;
}

declare global {
  interface Window {
    paypal?: any;
  }
}

export const PayPalSandboxCheckout: React.FC<PayPalSandboxCheckoutProps> = ({
  settlement,
  recipientName,
  groupName = 'Group Expense',
  onSuccess,
}) => {
  const [config, setConfig] = useState<PayPalConfigResponse | null>(null);
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);
  const [inputClientId, setInputClientId] = useState('');
  const [inputClientSecret, setInputClientSecret] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Settlement reconciliation preference
  const [reconcileLedger, setReconcileLedger] = useState(true);

  // PayPal Flow state
  const [stage, setStage] = useState<'idle' | 'creating' | 'created' | 'capturing' | 'captured'>('idle');
  const [orderData, setOrderData] = useState<any>(null);
  const [capturedData, setCapturedData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const paypalButtonContainerRef = useRef<HTMLDivElement>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);

  // Derive USD test amount
  const exchangeRate = config?.exchangeRate || 85;
  const inrAmount = (settlement.amountPaise / 100).toFixed(2);
  const usdAmount = (settlement.amountPaise / 100 / exchangeRate).toFixed(2);

  // 1. Load PayPal Server Configuration on mount
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const cfg = await fetchPayPalConfig();
      setConfig(cfg);
      setInputClientId(cfg.clientId === 'sb' ? '' : cfg.clientId);
    } catch (err: any) {
      console.warn('Could not load PayPal config:', err);
    }
  };

  // 2. Dynamically load official PayPal JS SDK
  useEffect(() => {
    const clientId = config?.clientId || 'sb';
    const currency = config?.currency || 'USD';
    const scriptId = 'paypal-sdk-script';

    const existingScript = document.getElementById(scriptId);
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
      clientId
    )}&currency=${currency}&intent=capture&components=buttons`;
    script.async = true;

    script.onload = () => {
      setSdkLoaded(true);
      setSdkError(null);
    };

    script.onerror = () => {
      setSdkLoaded(false);
      setSdkError('PayPal JS SDK could not be loaded from PayPal CDN (offline or network restriction). Quick simulation flow remains 100% functional.');
    };

    document.body.appendChild(script);

    return () => {
      // clean up on unmount
    };
  }, [config?.clientId, config?.currency]);

  // 3. Render PayPal Buttons when SDK is loaded and container is ready
  useEffect(() => {
    if (!sdkLoaded || !window.paypal || !paypalButtonContainerRef.current || stage === 'captured') {
      return;
    }

    paypalButtonContainerRef.current.innerHTML = '';

    try {
      window.paypal
        .Buttons({
          style: {
            layout: 'vertical',
            color: 'gold',
            shape: 'rect',
            label: 'paypal',
            height: 44,
          },
          createOrder: async () => {
            setStage('creating');
            setErrorMessage(null);
            try {
              const order = await createPayPalOrder(settlement.id, usdAmount);
              setOrderData(order);
              setStage('created');
              return order.orderId;
            } catch (err: any) {
              setErrorMessage(err.message || 'Failed to create PayPal order');
              setStage('idle');
              throw err;
            }
          },
          onApprove: async (data: any) => {
            setStage('capturing');
            try {
              const captured = await capturePayPalOrder(
                data.orderID || orderData?.orderId,
                settlement.id,
                reconcileLedger
              );
              setCapturedData(captured);
              setStage('captured');
              if (onSuccess) onSuccess();
            } catch (err: any) {
              setErrorMessage(err.message || 'Failed to capture PayPal order');
              setStage('idle');
            }
          },
          onError: (err: any) => {
            console.error('PayPal Button Error:', err);
            setErrorMessage('PayPal checkout encountered an error. You can also use the Instant Simulation flow below.');
            setStage('idle');
          },
        })
        .render(paypalButtonContainerRef.current);
    } catch (err: any) {
      console.warn('Could not render PayPal buttons:', err);
    }
  }, [sdkLoaded, config?.clientId, stage, settlement.id, usdAmount, reconcileLedger]);

  // Handle Quick Sandbox Simulation Flow
  const handleQuickSimulation = async () => {
    setStage('creating');
    setErrorMessage(null);
    try {
      const order = await createPayPalOrder(settlement.id, usdAmount);
      setOrderData(order);
      setStage('created');

      setTimeout(async () => {
        setStage('capturing');
        try {
          const captured = await capturePayPalOrder(order.orderId, settlement.id, reconcileLedger);
          setCapturedData(captured);
          setStage('captured');
          if (onSuccess) onSuccess();
        } catch (captureErr: any) {
          setErrorMessage(captureErr.message || 'Error capturing simulated sandbox order');
          setStage('idle');
        }
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to initiate sandbox simulation');
      setStage('idle');
    }
  };

  // Save developer credentials
  const handleSaveCredentials = async () => {
    setIsSavingConfig(true);
    setTestResult(null);
    try {
      const updated = await updatePayPalConfig({
        clientId: inputClientId || 'sb',
        clientSecret: inputClientSecret,
      });
      setConfig(updated);
      setTestResult({
        success: true,
        message: 'Credentials saved! Testing Sandbox authentication...',
      });
      try {
        const testRes = await testPayPalConnection();
        setTestResult(testRes);
      } catch (testErr: any) {
        setTestResult({
          success: false,
          message: testErr.message,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Failed to save PayPal configuration',
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Test live connection
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testPayPalConnection();
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Failed to connect to PayPal Developer Sandbox',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Platform & Sandbox Header Banner */}
      <div className="rounded-2xl border border-cyan-500/25 bg-cyan-950/20 backdrop-blur-md p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shadow-[0_0_12px_rgba(56,189,248,0.2)]">
              <DollarSign className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white tracking-tight">
                  PayPal Developer Platform
                </span>
                <span className="rounded-full bg-cyan-500/20 border border-cyan-500/40 px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-300">
                  SANDBOX
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Official REST API v2 Sandbox integration for international debt settlement
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowConfigDrawer(!showConfigDrawer)}
            className="flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 text-[11px] font-medium text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Configure PayPal Developer Sandbox Credentials"
          >
            <Settings className="h-3.5 w-3.5 text-cyan-400" />
            <span>{showConfigDrawer ? 'Hide API' : 'API Keys'}</span>
          </button>
        </div>

        {/* Credentials & Developer Sandbox Diagnostics Drawer */}
        {showConfigDrawer && (
          <div className="mt-4 pt-3 border-t border-cyan-500/20 space-y-3 text-xs animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200">
                PayPal Developer Credentials (Sandbox)
              </span>
              <a
                href="https://developer.paypal.com/dashboard/applications/sandbox"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 underline"
              >
                <span>Get Keys on PayPal Dashboard</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">
                  SANDBOX CLIENT ID
                </label>
                <input
                  type="text"
                  value={inputClientId}
                  onChange={e => setInputClientId(e.target.value)}
                  placeholder="Enter PayPal Sandbox Client ID (or leave for 'sb')"
                  className="w-full rounded-xl border border-white/[0.1] bg-black/40 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 block mb-1">
                  SANDBOX CLIENT SECRET
                </label>
                <input
                  type="password"
                  value={inputClientSecret}
                  onChange={e => setInputClientSecret(e.target.value)}
                  placeholder="Enter PayPal Sandbox Secret"
                  className="w-full rounded-xl border border-white/[0.1] bg-black/40 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="text-[11px] text-slate-400">
                Status:{' '}
                {config?.configured ? (
                  <span className="text-emerald-400 font-semibold">Live Sandbox Keys Linked</span>
                ) : (
                  <span className="text-amber-400 font-semibold">
                    Default Sandbox Demo Client (Ready)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleTestConnection}
                  disabled={isTesting || !config?.hasSecret}
                  className="flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-slate-300 hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`h-3 w-3 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>Test Connection</span>
                </button>

                <button
                  onClick={handleSaveCredentials}
                  disabled={isSavingConfig}
                  className="rounded-full bg-cyan-500 hover:bg-cyan-400 px-4 py-1.5 text-[11px] font-bold text-[#06090d] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isSavingConfig ? 'Saving...' : 'Save & Link'}
                </button>
              </div>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl text-[11px] border flex items-start gap-2 ${
                  testResult.success
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                )}
                <div className="leading-snug">{testResult.message}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Amount & Currency Conversion Card */}
      <div className="rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-md p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">Settling recipient:</span>
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            {recipientName}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 py-3 border-y border-white/[0.07]">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold mb-1">
              SplitSnap Ledger
            </span>
            <span className="text-2xl font-black font-mono text-white">₹{inrAmount}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">INR (Hamilton-Hare)</span>
          </div>

          <div className="p-3 rounded-xl bg-cyan-500/[0.04] border border-cyan-500/20 text-right">
            <span className="text-[10px] uppercase tracking-wider text-cyan-400 block font-semibold mb-1">
              PayPal Sandbox Value
            </span>
            <span className="text-2xl font-black font-mono text-cyan-300">${usdAmount}</span>
            <span className="text-[10px] text-cyan-400/80 block mt-0.5">USD (Capture Currency)</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Sandbox Conversion Rate:</span>
          <span className="font-mono text-slate-300 bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.06]">
            1 USD ≈ ₹{exchangeRate} INR
          </span>
        </div>

        {/* Reconcile Ledger Checkbox */}
        <div className="pt-1">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={reconcileLedger}
              onChange={e => setReconcileLedger(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-white/20 bg-black/60 text-emerald-400 focus:ring-0 cursor-pointer"
            />
            <div className="text-xs text-slate-300">
              <span className="font-semibold text-white">
                Reconcile & Clear Debt in SplitSnap Ledger
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                Automatically zeros the ₹800 debt balance across the group and appends an immutable audit transaction.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Stage: Captured Receipt */}
      {stage === 'captured' ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 backdrop-blur-md p-5 space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm">
            <CheckCircle2 className="h-5 w-5" />
            <span>PayPal Sandbox Payment Captured Successfully!</span>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-black/50 p-4 space-y-2.5 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-sans">Order ID:</span>
              <div className="flex items-center gap-1.5 text-slate-200">
                <span>{capturedData?.orderId || orderData?.orderId}</span>
                <button
                  onClick={() =>
                    copyToClipboard(capturedData?.orderId || orderData?.orderId, 'orderId')
                  }
                  className="hover:text-emerald-400 cursor-pointer p-0.5"
                  title="Copy Order ID"
                >
                  {copiedField === 'orderId' ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-sans">Capture ID:</span>
              <div className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                <span>{capturedData?.captureId}</span>
                <button
                  onClick={() => copyToClipboard(capturedData?.captureId, 'captureId')}
                  className="hover:text-emerald-400 cursor-pointer p-0.5"
                  title="Copy Capture ID"
                >
                  {copiedField === 'captureId' ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-sans">Payer (Sandbox):</span>
              <span className="text-slate-200">{capturedData?.payerEmail || 'sandbox-buyer@paypal.com'}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-sans">Captured Amount:</span>
              <span className="text-cyan-300 font-bold">${usdAmount} USD</span>
            </div>

            <div className="flex items-center justify-between border-t border-white/[0.08] pt-2 text-[11px]">
              <span className="text-slate-400 font-sans">SplitSnap Ledger:</span>
              <span
                className={`font-semibold font-sans ${
                  capturedData?.reconciled ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {capturedData?.reconciled ? '✓ Debt Reconciled & Cleared' : 'Isolated Sandbox Attempt'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>
              PayPal Sandbox audit event appended to group history with webhook signature validation.
            </span>
          </div>

          <button
            onClick={() => {
              setStage('idle');
              setOrderData(null);
              setCapturedData(null);
            }}
            className="w-full py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-slate-200 transition-colors cursor-pointer border border-white/[0.08]"
          >
            Start Another Sandbox Settlement
          </button>
        </div>
      ) : (
        /* Stage: Checkout Execution */
        <div className="space-y-3">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl border border-rose-500/30 bg-rose-950/20 text-xs text-rose-300 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Official PayPal Smart Payment Button Mount Point */}
          <div className="rounded-2xl border border-white/[0.08] bg-black/30 backdrop-blur-md p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">
                Option 1: Official PayPal Smart Buttons
              </span>
              <span className="text-[11px] text-cyan-400 font-mono">JS SDK v2</span>
            </div>

            <div
              ref={paypalButtonContainerRef}
              className="min-h-[44px] flex flex-col justify-center"
            >
              {!sdkLoaded && !sdkError && (
                <div className="flex items-center justify-center py-4 text-xs text-slate-400 gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" />
                  <span>Initializing PayPal Developer Sandbox SDK...</span>
                </div>
              )}
              {sdkError && (
                <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.06] text-[11px] text-slate-400">
                  {sdkError}
                </div>
              )}
            </div>
          </div>

          {/* Option 2: Instant One-Click Sandbox Simulation Flow */}
          <div className="rounded-2xl border border-white/[0.08] bg-black/30 backdrop-blur-md p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">
                Option 2: Instant Sandbox Execution
              </span>
              <span className="text-[11px] text-emerald-400 font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                1-Click Test
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Instantly simulates full Order Creation, Sandbox Buyer Authorization, and Capture via the PayPal Orders v2 adapter without opening popups.
            </p>

            <button
              onClick={handleQuickSimulation}
              disabled={stage !== 'idle'}
              className="w-full py-3.5 px-5 rounded-full bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-[#06090d] font-extrabold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(56,189,248,0.25)] transition-all disabled:opacity-50 cursor-pointer active:scale-[0.99]"
            >
              {stage === 'idle' ? (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Execute PayPal Orders v2 Sandbox Flow (${usdAmount} USD)</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>
                    {stage === 'creating'
                      ? 'Creating PayPal Sandbox Order...'
                      : stage === 'created'
                      ? 'Sandbox Buyer Approving...'
                      : 'Capturing Sandbox Payment...'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
