import { useEffect, useState, useMemo, useCallback } from 'react';
import { Building2, AlertCircle, CheckCircle, DollarSign, Users, TrendingUp, CreditCard, Database, ScrollText } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useStore } from '../store/useStore';
import {
  apiGetTenants,
  apiGetSubscriptionPayments,
  apiMasterPlatformBackup,
  apiMasterPlatformSnapshotBlob,
  apiMasterLoginAudit,
  apiMasterBackupAudit,
  apiMasterPlatformRestore,
  apiGetAdminPayments,
  apiVerifyAdminPayment,
  apiGetMasterBranchRequests,
  apiApproveBranchRequest,
  apiRejectBranchRequest,
  type Tenant,
  type BranchRequestRow,
} from '../services/api';

const MASTER_RESTORE_PHRASE_HINT = 'DOKANYAR-AF-RESTORE-PLATFORM';
import { formatDateByCalendar, formatDateTimeByCalendar, formatMonthLabelByCalendar, type CalendarMode } from '../utils/dateFormat';

const StatCard = ({ icon: Icon, label, value, sub, color, subColor }: { icon: React.ElementType; label: string; value: string; sub?: string; color: string; subColor?: string }) => (
  <div className="stat-card glass rounded-2xl p-5 card-hover">
    <div className="flex items-start justify-between mb-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      {sub && <span className={`text-xs px-2 py-1 rounded-full ${subColor || 'badge-green'}`}>{sub}</span>}
    </div>
    <p className="text-2xl font-bold text-white mb-1">{value}</p>
    <p className="text-slate-400 text-sm">{label}</p>
  </div>
);

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color?: string }[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-dark rounded-xl p-3 text-sm">
        <p className="text-slate-300 mb-2">{label}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color }}>{p.name}: {Number(p.value).toLocaleString()}</p>
        ))}
      </div>
    );
  }
  return null;
};

type SubPayment = { amount?: number; created_at?: string; shop_code?: string };

export default function SuperAdminDashboard() {
  const authToken = useStore(s => s.authToken);
  const calendarMode = (useStore(s => s.shopSettings.date_calendar) || 'jalali') as CalendarMode;
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [payments, setPayments] = useState<SubPayment[]>([]);
  const [loadError, setLoadError] = useState('');
  const [backupMsg, setBackupMsg] = useState('');
  const [auditRows, setAuditRows] = useState<Record<string, unknown>[]>([]);
  const [auditError, setAuditError] = useState('');
  const [masterBackupAuditRows, setMasterBackupAuditRows] = useState<Record<string, unknown>[]>([]);
  const [masterAuditError, setMasterAuditError] = useState('');
  const [masterAuditQ, setMasterAuditQ] = useState('');
  const [restoreSnapshot, setRestoreSnapshot] = useState<Record<string, unknown> | null>(null);
  const [restoreAckLoss, setRestoreAckLoss] = useState(false);
  const [restoreAckTenants, setRestoreAckTenants] = useState(false);
  const [restorePhrase, setRestorePhrase] = useState('');
  const [restoreResetCode, setRestoreResetCode] = useState('');
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState('');
  const [opsBusy, setOpsBusy] = useState(false);
  const [adminPayments, setAdminPayments] = useState<Record<string, unknown>[]>([]);
  const [payOpsBusy, setPayOpsBusy] = useState(false);
  const [branchRequests, setBranchRequests] = useState<BranchRequestRow[]>([]);
  const [branchReqBusy, setBranchReqBusy] = useState(false);

  useEffect(() => {
    const tok = authToken || undefined;
    if (!tok) return;
    let canceled = false;
    (async () => {
      try {
        const [tr, pr] = await Promise.all([
          apiGetTenants(tok),
          apiGetSubscriptionPayments(undefined, tok),
        ]);
        const ap = await apiGetAdminPayments(tok);
        let br: BranchRequestRow[] = [];
        try {
          const bq = await apiGetMasterBranchRequests(tok);
          br = bq.requests || [];
        } catch {
          br = [];
        }
        if (canceled) return;
        setTenants(tr.tenants || []);
        setPayments((pr.payments as SubPayment[]) || []);
        setAdminPayments((ap.payments as unknown as Record<string, unknown>[]) || []);
        setBranchRequests(br);
        setLoadError('');
      } catch (e) {
        if (!canceled) setLoadError(e instanceof Error ? e.message : 'خطا در دریافت داده');
      }
    })();
    return () => { canceled = true; };
  }, [authToken]);

  const handlePlatformBackup = useCallback(async () => {
    const tok = authToken || undefined;
    if (!tok) return;
    setOpsBusy(true);
    setBackupMsg('');
    try {
      const r = await apiMasterPlatformBackup(tok);
      const hint = r.hint ? ` — ${r.hint}` : '';
      const sha = r.sha256 ? ` | SHA256 ${r.sha256.slice(0, 14)}…` : '';
      setBackupMsg(`پشتیبان روی سرور ذخیره شد${hint}: ${r.path}${sha}`);
    } catch (e) {
      setBackupMsg(e instanceof Error ? e.message : 'خطا در پشتیبان');
    } finally {
      setOpsBusy(false);
    }
  }, [authToken]);

  const loadLoginAudit = useCallback(async () => {
    const tok = authToken || undefined;
    if (!tok) return;
    setOpsBusy(true);
    setAuditError('');
    try {
      const r = await apiMasterLoginAudit(80, tok);
      setAuditRows(Array.isArray(r.entries) ? r.entries : []);
    } catch (e) {
      setAuditError(e instanceof Error ? e.message : 'خطا در دریافت لاگ');
      setAuditRows([]);
    } finally {
      setOpsBusy(false);
    }
  }, [authToken]);

  const loadMasterBackupAudit = useCallback(async () => {
    const tok = authToken || undefined;
    if (!tok) return;
    setOpsBusy(true);
    setMasterAuditError('');
    try {
      const r = await apiMasterBackupAudit({ q: masterAuditQ.trim() || undefined, limit: 80, token: tok });
      setMasterBackupAuditRows(Array.isArray(r.entries) ? r.entries : []);
    } catch (e) {
      setMasterAuditError(e instanceof Error ? e.message : 'خطا در لاگ بکاپ');
      setMasterBackupAuditRows([]);
    } finally {
      setOpsBusy(false);
    }
  }, [authToken, masterAuditQ]);

  const activeTenants = tenants.filter(t => t.status === 'active').length;
  const expiredTenants = tenants.filter(t => t.subscription_status === 'expired').length;
  const totalRevenue = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalUsers = tenants.reduce((s, t) => s + Number(t.users_count || 0), 0);
  const premiumTenants = tenants.filter(t => t.subscription_plan === 'premium').length;
  const salesToday = tenants.reduce((s, t) => s + Number(t.sales_today || 0), 0);
  const pendingPaymentQueue = adminPayments.filter((p) => {
    const st = String(p.pay_status || '');
    return !['approved', 'rejected'].includes(st);
  });

  const handleVerifyPayment = useCallback(async (id: number, decision: 'approve' | 'reject') => {
    if (!authToken) return;
    setPayOpsBusy(true);
    try {
      const res = await apiVerifyAdminPayment(id, decision, '', authToken);
      setAdminPayments((prev) =>
        prev.map((p) => (Number(p.id) === id ? (res.payment as unknown as Record<string, unknown>) : p))
      );
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'خطا در تایید پرداخت');
    } finally {
      setPayOpsBusy(false);
    }
  }, [authToken]);

  const chartData = useMemo(() => {
    const byMonth = new Map<string, { sales: number; tenants: number }>();
    payments.forEach((pay) => {
      const at = String(pay.created_at || '').slice(0, 7);
      if (at.length < 7) return;
      const cur = byMonth.get(at) || { sales: 0, tenants: 0 };
      cur.sales += Number(pay.amount || 0);
      byMonth.set(at, cur);
    });
    const keys = [...byMonth.keys()].sort().slice(-8);
    if (keys.length === 0) {
      const now = new Date();
      return Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        return { name: formatMonthLabelByCalendar(d.toISOString().slice(0, 7), calendarMode), sales: 0, tenants: 0 };
      });
    }
    return keys.map((k) => ({
      name: formatMonthLabelByCalendar(k, calendarMode),
      sales: byMonth.get(k)!.sales,
      tenants: Math.max(1, Math.round(byMonth.get(k)!.sales / 50000)),
    }));
  }, [payments, calendarMode]);

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">داشبورد ابرادمین</h1>
        <p className="text-slate-400 text-sm mt-1">دادهٔ زنده از API پلتفرم (دکان‌ها و پرداخت‌های اشتراک)</p>
        {loadError && <p className="text-rose-400 text-xs mt-2">{loadError}</p>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Building2} label="کل دکان‌ها" value={String(tenants.length)} sub={`${activeTenants} فعال`} color="bg-gradient-to-br from-indigo-500 to-indigo-600" />
        <StatCard icon={CheckCircle} label="دکان‌های فعال" value={String(activeTenants)} sub={`${premiumTenants} پریمیوم`} color="bg-gradient-to-br from-emerald-500 to-emerald-600" />
        <StatCard icon={AlertCircle} label="اشتراک منقضی" value={String(expiredTenants)} sub="پیگیری" subColor="badge-red" color="bg-gradient-to-br from-rose-500 to-rose-600" />
        <StatCard icon={DollarSign} label="جمع پرداخت‌های ثبت‌شده" value={`${totalRevenue.toLocaleString()} ؋`} color="bg-gradient-to-br from-amber-500 to-amber-600" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="کاربران (جمع users_count)" value={String(totalUsers)} color="bg-gradient-to-br from-purple-500 to-purple-600" />
        <StatCard icon={TrendingUp} label="فروش امروز (جمع sales_today)" value={`${salesToday.toLocaleString()} ؋`} color="bg-gradient-to-br from-teal-500 to-teal-600" />
        <StatCard icon={CreditCard} label="رکورد پرداخت اشتراک" value={String(payments.length)} color="bg-gradient-to-br from-pink-500 to-pink-600" />
        <StatCard icon={Building2} label="طرح پریمیوم" value={String(premiumTenants)} sub={`از ${tenants.length || 1} دکان`} color="bg-gradient-to-br from-cyan-600 to-cyan-800" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4">درآمد اشتراک (ماه)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="salesGradSa" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="sales" name="مبلغ" stroke="#6366f1" strokeWidth={2} fill="url(#salesGradSa)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4">دکان‌های جدید (شاخص ماهانه)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="tenants" name="شاخص" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass rounded-2xl p-5 border border-amber-500/25">
        <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
          <Building2 size={18} className="text-amber-400" />
          تأیید شعبهٔ جدید (درخواست از مدیران دکان)
        </h3>
        <p className="text-slate-500 text-xs mb-4 leading-relaxed">
          مدیر هر فروشگاه از تنظیمات → کاربران فروشگاه درخواست می‌فرستد. اینجا بررسی کنید؛ پس از تأیید، کد فروشگاه جدید را طبق فرایند داخلی در «مستأجرین» بسازید.
        </p>
        <div className="space-y-3 max-h-[420px] overflow-y-auto">
          {branchRequests.length === 0 ? (
            <p className="text-slate-500 text-sm py-4 text-center">درخواست معلقی نیست.</p>
          ) : (
            branchRequests.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-white/10 bg-slate-900/40 p-4 space-y-2 text-right"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-amber-200 font-mono text-sm" dir="ltr">
                    #{r.id} — از {r.from_shop_code}
                  </span>
                  <span className="text-slate-500 text-[10px]">{r.created_at?.replace('T', ' ').slice(0, 19)}</span>
                </div>
                {r.branch_title ? <p className="text-white font-bold text-sm">{r.branch_title}</p> : null}
                <p className="text-slate-300 text-xs whitespace-pre-wrap leading-relaxed">{r.message}</p>
                {r.contact_phone ? (
                  <p className="text-slate-400 text-xs">
                    تماس: <span dir="ltr">{r.contact_phone}</span>
                  </p>
                ) : null}
                {r.proposed_credentials_note ? (
                  <div className="rounded-lg bg-black/25 border border-white/10 p-2 text-[11px] text-slate-400 whitespace-pre-wrap">
                    یادداشت رمز/کاربری: {r.proposed_credentials_note}
                  </div>
                ) : null}
                {r.image_data_url ? (
                  <img src={r.image_data_url} alt="" className="max-h-40 rounded-lg border border-white/10 object-contain" />
                ) : null}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    disabled={branchReqBusy}
                    onClick={async () => {
                      if (!authToken) return;
                      setBranchReqBusy(true);
                      try {
                        await apiApproveBranchRequest(r.id, '', authToken);
                        setBranchRequests((prev) => prev.filter((x) => x.id !== r.id));
                      } catch (e) {
                        setLoadError(e instanceof Error ? e.message : 'خطا در تأیید');
                      } finally {
                        setBranchReqBusy(false);
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50"
                  >
                    تأیید (ثبت شد)
                  </button>
                  <button
                    type="button"
                    disabled={branchReqBusy}
                    onClick={async () => {
                      if (!authToken) return;
                      const reason = window.prompt('دلیل رد (اختیاری):') || '';
                      setBranchReqBusy(true);
                      try {
                        await apiRejectBranchRequest(r.id, reason, authToken);
                        setBranchRequests((prev) => prev.filter((x) => x.id !== r.id));
                      } catch (e) {
                        setLoadError(e instanceof Error ? e.message : 'خطا در رد');
                      } finally {
                        setBranchReqBusy(false);
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-500 text-white text-xs font-bold disabled:opacity-50"
                  >
                    رد
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-4">دکان‌ها</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {['نام', 'کد', 'مالک', 'طرح', 'پایان اشتراک', 'فروش امروز', 'وضعیت'].map(h => (
                  <th key={h} className="text-right text-slate-400 font-medium py-3 px-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {tenants.map(t => (
                <tr key={String(t.id)} className="table-row-hover">
                  <td className="py-3 px-3">
                    <p className="text-white font-medium">{t.shop_name}</p>
                    <p className="text-slate-500 text-xs">{t.shop_domain || t.shop_code}</p>
                  </td>
                  <td className="py-3 px-3 text-slate-300 font-mono text-xs">{t.shop_code}</td>
                  <td className="py-3 px-3 text-slate-300 text-sm">{t.owner_name}</td>
                  <td className="py-3 px-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${t.subscription_plan === 'premium' ? 'badge-purple' : 'badge-blue'}`}>
                      {t.subscription_plan === 'premium' ? 'پریمیوم' : 'پایه'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-400 text-xs">{formatDateByCalendar(t.subscription_end, calendarMode)}</td>
                  <td className="py-3 px-3 text-emerald-400 font-medium">{Number(t.sales_today || 0).toLocaleString()} ؋</td>
                  <td className="py-3 px-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      t.status === 'active' ? 'badge-green' : t.status === 'suspended' ? 'badge-red' : 'badge-yellow'
                    }`}>
                      {t.status === 'active' ? 'فعال' : t.status === 'suspended' ? 'معلق' : 'غیرفعال'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tenants.length === 0 && !loadError && (
            <p className="text-slate-500 text-sm text-center py-8">دکانی ثبت نشده یا توکن نامعتبر است.</p>
          )}
        </div>
      </div>

      <div className="glass rounded-2xl p-5 border border-indigo-500/20">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <CreditCard size={18} className="text-indigo-300" /> صف تایید پرداخت فروشگاه‌ها (واقعی)
        </h3>
        <div className="space-y-2">
          {pendingPaymentQueue.slice(0, 8).map((p) => (
            <div key={String(p.id)} className="rounded-xl border border-white/10 bg-white/5 p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-white text-sm font-bold truncate">
                  {String(p.owner_name || 'کاربر')} — {String(p.plan || '')}
                </p>
                <p className="text-slate-400 text-xs">
                  {Number(p.amount_afn || 0).toLocaleString()} ؋ | {String(p.pay_method || '')} | وضعیت: {String(p.pay_status || '')}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={payOpsBusy}
                  onClick={() => void handleVerifyPayment(Number(p.id), 'approve')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-60"
                >
                  تایید
                </button>
                <button
                  type="button"
                  disabled={payOpsBusy}
                  onClick={() => void handleVerifyPayment(Number(p.id), 'reject')}
                  className="px-3 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-500 text-white text-xs font-bold disabled:opacity-60"
                >
                  رد
                </button>
              </div>
            </div>
          ))}
          {pendingPaymentQueue.length === 0 && (
            <p className="text-slate-400 text-sm text-center py-4">در حال حاضر درخواست پرداختی در صف تایید وجود ندارد.</p>
          )}
        </div>
      </div>

      <div className="glass rounded-2xl p-5 border border-emerald-500/10">
        <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
          <Database size={18} className="text-emerald-400" /> عملیات پلتفرم
        </h3>
        <p className="text-slate-400 text-xs mb-4 leading-relaxed">
          روی PostgreSQL: اسنپ‌شات JSON در <span className="font-mono text-slate-300">server/backups/platform-*.json</span>
          {' '}— روی SQLite قدیمی: کپی <span className="font-mono">.db</span>. دکمهٔ دوم همان JSON را مستقیم در مرورگر دانلود می‌کند. لاگ ورود جداست.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={opsBusy || !authToken}
            onClick={() => void handlePlatformBackup()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold transition-colors"
          >
            <Database size={16} /> پشتیبان روی دیسک سرور
          </button>
          <button
            type="button"
            disabled={opsBusy || !authToken}
            onClick={async () => {
              const tok = authToken || undefined;
              if (!tok) return;
              setOpsBusy(true);
              setBackupMsg('');
              try {
                const blob = await apiMasterPlatformSnapshotBlob(tok);
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `dokanyar_platform_snapshot_${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
                setBackupMsg('اسنپ‌شات JSON پلتفرم دانلود شد.');
              } catch (e) {
                setBackupMsg(e instanceof Error ? e.message : 'خطا در دانلود');
              } finally {
                setOpsBusy(false);
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-white text-sm font-bold transition-colors"
          >
            <Database size={16} /> دانلود JSON در مرورگر
          </button>
          <button
            type="button"
            disabled={opsBusy || !authToken}
            onClick={() => void loadLoginAudit()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-white text-sm font-bold transition-colors"
          >
            <ScrollText size={16} /> نمایش لاگ ورود
          </button>
          <button
            type="button"
            disabled={opsBusy || !authToken}
            onClick={() => void loadMasterBackupAudit()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold transition-colors"
          >
            <ScrollText size={16} /> لاگ ممیزی بکاپ master
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <input
            type="search"
            value={masterAuditQ}
            onChange={(e) => setMasterAuditQ(e.target.value)}
            placeholder="جستجو در action / detail / دکان…"
            className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs placeholder:text-slate-500"
          />
        </div>
        {backupMsg && (
          <p className={`text-xs mt-3 font-medium ${backupMsg.includes('خطا') ? 'text-rose-400' : 'text-emerald-400'}`}>{backupMsg}</p>
        )}
        {auditError && <p className="text-rose-400 text-xs mt-3">{auditError}</p>}
        {masterAuditError && <p className="text-rose-400 text-xs mt-3">{masterAuditError}</p>}
        {masterBackupAuditRows.length > 0 && (
          <div className="mt-4 max-h-48 overflow-auto rounded-xl border border-indigo-500/20">
            <p className="text-indigo-200/90 text-[10px] font-bold px-2 py-1 bg-indigo-950/40">ممیزی بکاپ (جدا از settingsLogs)</p>
            <table className="w-full text-[10px]">
              <thead className="sticky top-0 bg-slate-800/95">
                <tr className="text-slate-400 text-right border-b border-white/10">
                  <th className="py-2 px-2">زمان</th>
                  <th className="py-2 px-2">action</th>
                  <th className="py-2 px-2">جزئیات</th>
                  <th className="py-2 px-2">دکان</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {masterBackupAuditRows.map((row) => (
                  <tr key={String(row.id ?? row.createdAt)}>
                    <td className="py-1.5 px-2 whitespace-nowrap">{formatDateTimeByCalendar(String(row.createdAt || ''), calendarMode)}</td>
                    <td className="py-1.5 px-2 font-mono text-indigo-200">{String(row.action || '')}</td>
                    <td className="py-1.5 px-2 max-w-[200px] truncate" title={String(row.detail || '')}>{String(row.detail || '')}</td>
                    <td className="py-1.5 px-2 font-mono">{String(row.actorShopCode || '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-6 rounded-xl border border-rose-500/25 bg-rose-950/20 p-4 space-y-3">
          <h4 className="text-rose-200 text-sm font-bold">بازیابی کامل پلتفرم از اسنپ‌شات JSON</h4>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            فقط همان فایل اسنپ‌شات کامل پلتفرم (مثلاً از «دانلود JSON»). این کار تمام دکان‌ها و دادهٔ عملیاتی را با فایل جایگزین می‌کند. کد ریست سیستم (از تنظیمات امنیتی) و عبارت دقیق زیر لازم است.
          </p>
          <input
            type="file"
            accept=".json,application/json"
            className="text-xs text-slate-300 w-full"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const reader = new FileReader();
              reader.onload = () => {
                try {
                  const o = JSON.parse(String(reader.result || '{}')) as Record<string, unknown>;
                  if (!Array.isArray(o.shops)) throw new Error('فایل اسنپ‌شات پلتفرم نیست (shops[] ندارد)');
                  setRestoreSnapshot(o);
                  setRestoreMsg('');
                } catch (ex) {
                  setRestoreSnapshot(null);
                  setRestoreMsg(ex instanceof Error ? ex.message : 'JSON نامعتبر');
                }
              };
              reader.readAsText(f);
            }}
          />
          <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
            <input type="checkbox" checked={restoreAckLoss} onChange={(e) => setRestoreAckLoss(e.target.checked)} />
            می‌دانم تمام دادهٔ فعلی سرور از بین می‌رود.
          </label>
          <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
            <input type="checkbox" checked={restoreAckTenants} onChange={(e) => setRestoreAckTenants(e.target.checked)} />
            فایل معتبر است و قصد جایگزینی همهٔ tenantها را دارم.
          </label>
          <div>
            <p className="text-[10px] text-slate-500 mb-1">عبارت تأیید (دقیقاً): <span className="font-mono text-amber-200/90">{MASTER_RESTORE_PHRASE_HINT}</span></p>
            <input
              type="text"
              value={restorePhrase}
              onChange={(e) => setRestorePhrase(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-mono"
              placeholder={MASTER_RESTORE_PHRASE_HINT}
              dir="ltr"
            />
          </div>
          <input
            type="password"
            value={restoreResetCode}
            onChange={(e) => setRestoreResetCode(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs"
            placeholder="کد ریست سیستم (از پنل امنیت)"
            dir="ltr"
          />
          <button
            type="button"
            disabled={restoreBusy || !authToken || !restoreSnapshot}
            onClick={async () => {
              const tok = authToken || undefined;
              if (!tok || !restoreSnapshot) return;
              setRestoreBusy(true);
              setRestoreMsg('');
              try {
                const r = await apiMasterPlatformRestore(
                  {
                    snapshot: restoreSnapshot,
                    acknowledgeTotalDataLoss: restoreAckLoss,
                    confirmReplaceAllTenants: restoreAckTenants,
                    typedPhrase: restorePhrase.trim(),
                    resetCode: restoreResetCode.trim(),
                  },
                  tok,
                );
                setRestoreMsg(r.message || 'بازیابی انجام شد.');
              } catch (e) {
                setRestoreMsg(e instanceof Error ? e.message : 'خطا');
              } finally {
                setRestoreBusy(false);
              }
            }}
            className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-sm font-bold"
          >
            {restoreBusy ? 'در حال بازیابی…' : 'اجرای بازیابی پلتفرم'}
          </button>
          {restoreMsg ? <p className={`text-xs ${restoreMsg.includes('خطا') || restoreMsg.includes('نادرست') || restoreMsg.includes('ناقص') ? 'text-rose-400' : 'text-emerald-400'}`}>{restoreMsg}</p> : null}
        </div>
        {auditRows.length > 0 && (
          <div className="mt-4 max-h-56 overflow-auto rounded-xl border border-white/10">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-800/95">
                <tr className="text-slate-400 text-right border-b border-white/10">
                  <th className="py-2 px-2">زمان</th>
                  <th className="py-2 px-2">دکان</th>
                  <th className="py-2 px-2">نقش</th>
                  <th className="py-2 px-2">روش</th>
                  <th className="py-2 px-2">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {auditRows.map((row) => (
                  <tr key={String(row.id ?? row.created_at)}>
                    <td className="py-1.5 px-2 whitespace-nowrap">{formatDateTimeByCalendar(String(row.created_at || ''), calendarMode)}</td>
                    <td className="py-1.5 px-2 font-mono">{String(row.shop_code || '')}</td>
                    <td className="py-1.5 px-2">{String(row.role || '')}</td>
                    <td className="py-1.5 px-2">{String(row.method || '')}</td>
                    <td className="py-1.5 px-2 font-mono text-[10px]">{String(row.ip || '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
