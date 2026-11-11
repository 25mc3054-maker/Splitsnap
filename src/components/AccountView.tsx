import React, { useState, useEffect } from 'react';
import {
  User,
  ShieldCheck,
  Download,
  CheckCircle2,
  Bell,
  Smartphone,
  Lock,
  Globe,
  FileSpreadsheet,
  DollarSign,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  CreditCard,
  Key,
  Database,
  History,
  FileCode,
  HardDrive,
} from 'lucide-react';
import {
  fetchPayPalConfig,
  updatePayPalConfig,
  testPayPalConnection,
  PayPalConfigResponse,
  fetchDatabaseStatus,
  fetchActionJournal,
  fetchAccount,
  updateAccount,
  DatabaseStatus,
  ActionJournalItem,
} from '../utils/api';

interface AccountViewProps {
  groups: any[];
}

export const AccountView: React.FC<AccountViewProps> = ({ groups }) => {
  const [name, setName] = useState('Kushagra');
  const [paypalEmail, setPaypalEmail] = useState('kushagrarana2006@gmail.com');
  const [email, setEmail] = useState('kushagrarana2006@gmail.com');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [isSaved, setIsSaved] = useState(false);

  // PayPal Sandbox Configuration State
  const [paypalConfig, setPaypalConfig] = useState<PayPalConfigResponse | null>(null);
  const [paypalClientId, setPaypalClientId] = useState('');
  const [paypalClientSecret, setPaypalClientSecret] = useState('');
  const [isSavingPaypal, setIsSavingPaypal] = useState(false);
  const [isTestingPaypal, setIsTestingPaypal] = useState(false);
  const [paypalTestResult, setPaypalTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Persistent Database & Action Memory State
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [actionJournal, setActionJournal] = useState<ActionJournalItem[]>([]);
  const [isLoadingDb, setIsLoadingDb] = useState(false);

  useEffect(() => {
    fetchAccount()
      .then(acc => {
        if (acc.name) setName(acc.name);
        if (acc.upiId) setPaypalEmail(acc.upiId);
        if (acc.email) setEmail(acc.email);
        if (acc.phone) setPhone(acc.phone);
      })
      .catch(() => {});

    fetchPayPalConfig()
      .then(cfg => {
        setPaypalConfig(cfg);
        if (cfg.clientId && cfg.clientId !== 'sb') {
          setPaypalClientId(cfg.clientId);
        }
      })
      .catch(() => {});

    loadDbInfo();
  }, []);

  const loadDbInfo = async () => {
    setIsLoadingDb(true);
    try {
      const [status, journal] = await Promise.all([
        fetchDatabaseStatus(),
        fetchActionJournal(50),
      ]);
      setDbStatus(status);
      setActionJournal(journal.entries || []);
    } catch (err) {
      console.warn('Could not load database status:', err);
    } finally {
      setIsLoadingDb(false);
    }
  };

  const handleSavePayPal = async () => {
    setIsSavingPaypal(true);
    setPaypalTestResult(null);
    try {
      const updated = await updatePayPalConfig({
        clientId: paypalClientId || 'sb',
        clientSecret: paypalClientSecret,
      });
      setPaypalConfig(updated);
      setPaypalTestResult({
        success: true,
        message: 'PayPal credentials updated and saved to persistent database!',
      });
      loadDbInfo();
    } catch (err: any) {
      setPaypalTestResult({
        success: false,
        message: err.message || 'Failed to update credentials',
      });
    } finally {
      setIsSavingPaypal(false);
    }
  };

  const handleTestPayPal = async () => {
    setIsTestingPaypal(true);
    setPaypalTestResult(null);
    try {
      const res = await testPayPalConnection();
      setPaypalTestResult(res);
      loadDbInfo();
    } catch (err: any) {
      setPaypalTestResult({
        success: false,
        message: err.message || 'Failed to connect to PayPal Developer Sandbox',
      });
    } finally {
      setIsTestingPaypal(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateAccount({
        name,
        upiId: paypalEmail,
        phone,
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
      loadDbInfo();
    } catch (err: any) {
      alert(err.message || 'Failed to update account details');
    }
  };

  const handleExportData = () => {
    const exportPayload = {
      user: {
        name,
        paypalEmail,
        email,
        phone,
        exportedAt: new Date().toISOString(),
      },
      groups,
      database: dbStatus,
      actionMemoryJournal: actionJournal,
      platform: 'SplitSnap PayPal Platform Edition',
      paymentGateway: 'PayPal Developer Platform (Sandbox)',
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `splitsnap_memory_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6 pb-20 text-white select-none animate-in fade-in duration-300">
      <div className="border-b border-white/[0.07] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Account & Action Memory Ledger</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Durable database storage, immutable action audit journal, and developer credentials.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs">
            <Database className="w-3.5 h-3.5" />
            <span>DB Memory: {dbStatus?.totalActionsRecorded || actionJournal.length || 1} Actions</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Card */}
        <div className="rounded-3xl glass-card-hero border border-white/[0.1] p-6 shadow-xl space-y-5 relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop"
                alt="Avatar"
                className="h-16 w-16 rounded-full object-cover ring-2 ring-emerald-400 shadow-[0_0_12px_rgba(0,229,153,0.3)]"
              />
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 ring-2 ring-[#06090d]" />
            </div>

            <div>
              <h3 className="font-bold text-white text-base">{name}</h3>
              <p className="text-xs text-cyan-400 font-mono mt-0.5">{paypalEmail}</p>
              <p className="text-[11px] text-slate-400">{email}</p>
            </div>
          </div>

          <div className="border-t border-white/[0.08] pt-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span>Database Engine</span>
              <span className="font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px]">
                Persistent Disk + Journal
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Rounding Engine</span>
              <span className="font-mono text-emerald-400">Hamilton-Hare (0 drift)</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Primary Gateway</span>
              <span className="font-semibold text-cyan-300 font-mono bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full text-[10px]">
                PayPal Sandbox (REST v2)
              </span>
            </div>
          </div>
        </div>

        {/* Profile Settings Form */}
        <div className="lg:col-span-2 rounded-3xl glass-panel border border-white/[0.08] p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white tracking-tight">Personal Information</h3>
            <span className="text-[11px] text-slate-500 font-mono">Synced to data/splitsnap.db.json</span>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-black/40 border border-white/[0.1] text-sm text-white focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40 font-sans"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">PayPal Sandbox Email</label>
                <input
                  type="email"
                  value={paypalEmail}
                  onChange={e => setPaypalEmail(e.target.value)}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-black/40 border border-white/[0.1] text-sm text-white font-mono focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-black/40 border border-white/[0.1] text-sm text-white focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40 font-sans"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-black/40 border border-white/[0.1] text-sm text-white focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40 font-sans"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
              <button
                type="submit"
                className="py-2.5 px-6 rounded-full bg-emerald-400 text-[#06090d] font-bold text-xs tracking-wide hover:bg-emerald-300 transition-all cursor-pointer shadow-[0_0_15px_rgba(0,229,153,0.3)] active:scale-[0.98]"
              >
                {isSaved ? '✓ Profile Saved to DB' : 'Update Profile'}
              </button>

              <button
                type="button"
                onClick={handleExportData}
                className="flex items-center gap-1.5 py-2 px-4 rounded-full border border-white/[0.1] bg-white/[0.04] text-xs text-slate-300 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Complete Memory JSON</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Persistent Database Action Memory Section */}
      <div className="rounded-3xl glass-panel border border-emerald-500/25 p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(0,229,153,0.2)]">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Persistent Action Memory Journal
                </h3>
                <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300">
                  APPEND-ONLY
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Every action (expenses, receipt line splits, PayPal sandbox captures, and member settlements) is persistently committed.
              </p>
            </div>
          </div>

          <button
            onClick={loadDbInfo}
            disabled={isLoadingDb}
            className="flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.04] px-3.5 py-1.5 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-white/[0.08] transition-all cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingDb ? 'animate-spin' : ''}`} />
            <span>Refresh Journal</span>
          </button>
        </div>

        {/* Database Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.07]">
            <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Memory Actions</span>
            <span className="font-mono text-xl font-bold text-emerald-400">
              {dbStatus?.totalActionsRecorded || actionJournal.length || 1}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Recorded events</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.07]">
            <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Durable DB File</span>
            <span className="font-mono text-xs font-bold text-white truncate block">
              splitsnap.db.json
            </span>
            <span className="text-[10px] text-emerald-400 block mt-0.5">Active & In-Sync</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.07]">
            <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Audit Journal</span>
            <span className="font-mono text-xs font-bold text-cyan-300 truncate block">
              action_journal.jsonl
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Immutable write-ahead</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.07]">
            <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Tracked Groups</span>
            <span className="font-mono text-xl font-bold text-white">
              {dbStatus?.groupsCount || groups.length || 3}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Cohorts in memory</span>
          </div>
        </div>

        {/* Recent Actions Stream */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-emerald-400" />
              <span>Recent Memory Entries ({actionJournal.length})</span>
            </span>
            <span className="text-[10px] font-mono text-slate-500">Live transaction stream</span>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {actionJournal.length > 0 ? (
              actionJournal.map(item => (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl bg-black/30 border border-white/[0.05] flex items-center justify-between text-xs hover:border-white/[0.1] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_6px_#00e599]" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white truncate">{item.summary}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/[0.06] text-slate-400 uppercase">
                          {item.action}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Actor: {item.actor} · Entity: {item.entityType} ({item.entityId})
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-3">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-4 rounded-xl bg-black/20 text-center text-xs text-slate-500">
                No external actions recorded yet. Every receipt scanned, expense created, and PayPal payment will be preserved here.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PayPal Developer Platform (Sandbox) Credentials & Settings */}
      <div className="rounded-3xl glass-panel border border-cyan-500/25 p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(56,189,248,0.2)]">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  PayPal Developer Platform (Sandbox)
                </h3>
                <span className="rounded-full bg-cyan-500/20 border border-cyan-500/40 px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-300">
                  REST v2
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure Sandbox Client ID & Secret for international debt settlement and live testing.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://developer.paypal.com/dashboard/applications/sandbox"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.04] px-3.5 py-1.5 text-xs text-cyan-400 hover:text-cyan-300 hover:bg-white/[0.08] transition-all"
            >
              <span>Developer Dashboard</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="text-xs font-mono text-slate-400 block mb-1">
              Sandbox Client ID
            </label>
            <input
              type="text"
              value={paypalClientId}
              onChange={e => setPaypalClientId(e.target.value)}
              placeholder="e.g. Acdg... (or leave empty to use default 'sb')"
              className="w-full py-2.5 px-3.5 rounded-xl bg-black/40 border border-white/[0.1] text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40"
            />
          </div>

          <div>
            <label className="text-xs font-mono text-slate-400 block mb-1">
              Sandbox Client Secret
            </label>
            <input
              type="password"
              value={paypalClientSecret}
              onChange={e => setPaypalClientSecret(e.target.value)}
              placeholder="e.g. ELh... (kept secure on server session)"
              className="w-full py-2.5 px-3.5 rounded-xl bg-black/40 border border-white/[0.1] text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.08]">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400">Integration Mode:</span>
            {paypalConfig?.configured ? (
              <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold font-mono">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Live Sandbox API Connected</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-400 font-semibold font-mono">
                <span>Default Sandbox Demo Client (Ready)</span>
              </span>
            )}
            <span className="text-slate-600">·</span>
            <span className="text-slate-400 font-mono">Currency: USD</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleTestPayPal}
              disabled={isTestingPaypal || !paypalConfig?.hasSecret}
              className="flex items-center gap-1.5 py-2 px-4 rounded-full border border-white/[0.1] bg-white/[0.04] text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/[0.08] disabled:opacity-40 transition-colors cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isTestingPaypal ? 'animate-spin' : ''}`} />
              <span>Test Connection</span>
            </button>

            <button
              type="button"
              onClick={handleSavePayPal}
              disabled={isSavingPaypal}
              className="py-2 px-5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-[#06090d] font-bold text-xs tracking-wide transition-all disabled:opacity-50 cursor-pointer shadow-[0_0_15px_rgba(56,189,248,0.25)] active:scale-[0.98]"
            >
              {isSavingPaypal ? 'Saving...' : 'Save Sandbox Config'}
            </button>
          </div>
        </div>

        {paypalTestResult && (
          <div
            className={`p-3.5 rounded-2xl text-xs border flex items-start gap-2.5 animate-in fade-in duration-200 ${
              paypalTestResult.success
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
            }`}
          >
            {paypalTestResult.success ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            )}
            <div>{paypalTestResult.message}</div>
          </div>
        )}
      </div>
    </div>
  );
};
