import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Kanban } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useStore } from '../store/useStore';
import { apiCrmGetDeals, apiCrmPostDeal, type CrmDealRow } from '../services/api';

export type CrmWorkspaceTab = 'deals';

const LS_SUPER_TARGET = 'crm_super_target_shop';

type CrmWorkspaceProps = {
  /** حالت تعبیه‌شده در هاب مشتریان: بدون تیتر اصلی و بدون ردیف تب‌های تکراری */
  embedded?: boolean;
  /** تب کنترل‌شده از والد (هاب) */
  tab?: CrmWorkspaceTab;
  onTabChange?: (t: CrmWorkspaceTab) => void;
};

export function CrmWorkspace({ embedded = false }: CrmWorkspaceProps) {
  const { t, isDark } = useApp();
  const authToken = useStore((s) => s.authToken);
  const currentUser = useStore((s) => s.currentUser);
  const shopCodeStore = useStore((s) => s.shopCode);
  const customers = useStore((s) => s.customers);

  const role = currentUser?.role;
  const allowed = role === 'admin' || role === 'super_admin';

  const [superTarget, setSuperTarget] = useState(() =>
    typeof localStorage !== 'undefined' ? localStorage.getItem(LS_SUPER_TARGET) || '' : '',
  );
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [deals, setDeals] = useState<CrmDealRow[]>([]);

  const [dealForm, setDealForm] = useState({ customerId: '', title: '', stage: 'lead', valueAfs: '', notes: '' });

  const effectiveShopParam = useMemo(() => {
    if (role === 'super_admin') return superTarget.trim().toUpperCase() || undefined;
    return undefined;
  }, [role, superTarget]);

  const shopBody = useMemo(() => {
    if (role === 'super_admin' && superTarget.trim()) return { shopCode: superTarget.trim().toUpperCase() };
    return {};
  }, [role, superTarget]);

  const persistSuperTarget = (v: string) => {
    setSuperTarget(v);
    try {
      localStorage.setItem(LS_SUPER_TARGET, v.trim().toUpperCase());
    } catch {
      /* ignore */
    }
  };

  const load = useCallback(async () => {
    if (!allowed || !authToken) return;
    if (role === 'super_admin' && !superTarget.trim()) {
      setErr(t('crm_super_shop_hint'));
      return;
    }
    setLoading(true);
    setErr(null);
    const tok = authToken || undefined;
    const sc = effectiveShopParam;
    try {
      const r = await apiCrmGetDeals(tok, sc);
      setDeals(r.deals || []);
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      setErr(m);
    } finally {
      setLoading(false);
    }
  }, [allowed, authToken, role, superTarget, effectiveShopParam, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const textColor = isDark ? 'text-white' : 'text-slate-800';
  const subText = isDark ? 'text-slate-400' : 'text-slate-500';
  const cardBg = isDark ? 'glass rounded-2xl border border-white/10' : 'bg-white border border-slate-200 rounded-2xl shadow-sm';
  const inputClass = isDark
    ? 'w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:border-indigo-500 outline-none'
    : 'w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 text-sm focus:border-indigo-500 outline-none';

  if (!allowed) {
    return (
      <div className={`p-6 rounded-2xl ${cardBg}`}>
        <p className={textColor}>{t('crm_access_denied')}</p>
      </div>
    );
  }

  const customerName = (id: number) => customers.find((c) => Number(c.id) === id)?.name || `#${id}`;

  return (
    <div className="space-y-6 fade-in">
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className={`text-2xl font-bold ${textColor}`}>{t('crm')}</h1>
            <p className={`${subText} text-sm mt-1`}>{t('crm_subtitle')}</p>
            {role !== 'super_admin' && (
              <p className={`${subText} text-xs mt-1`}>
                {shopCodeStore}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium btn-primary text-white disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {t('crm_refresh')}
          </button>
        </div>
      )}

      {embedded && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium btn-primary text-white disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {t('crm_refresh')}
          </button>
        </div>
      )}

      {role === 'super_admin' && (
        <div className={`p-4 ${cardBg} flex flex-wrap items-end gap-3`}>
          <div className="flex-1 min-w-[200px]">
            <label className={`block text-xs font-semibold mb-1 ${subText}`}>{t('crm_super_shop_hint')}</label>
            <input
              className={inputClass}
              value={superTarget}
              onChange={(e) => persistSuperTarget(e.target.value.toUpperCase())}
              placeholder="SHOP01"
            />
          </div>
          <button type="button" onClick={() => void load()} className="px-4 py-2 rounded-xl btn-primary text-white text-sm">
            {t('crm_apply')}
          </button>
        </div>
      )}

      {err && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-200 text-sm">
          {err}
        </div>
      )}

      {!embedded && (
        <div className={`flex items-center gap-2 ${textColor}`}>
          <Kanban size={20} className="text-indigo-500 shrink-0" />
          <span className="text-lg font-bold">{t('crm_tab_deals')}</span>
        </div>
      )}

      <div className={`p-4 ${cardBg} space-y-4`}>
          <form
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const cid = Number(dealForm.customerId);
              if (!Number.isFinite(cid) || !dealForm.title.trim()) return;
              try {
                await apiCrmPostDeal(
                  {
                    ...shopBody,
                    customerId: cid,
                    title: dealForm.title.trim(),
                    stage: dealForm.stage || 'lead',
                    valueAfs: Number(dealForm.valueAfs) || 0,
                    notes: dealForm.notes,
                  },
                  authToken || undefined,
                );
                setDealForm({ customerId: '', title: '', stage: 'lead', valueAfs: '', notes: '' });
                void load();
              } catch (er: unknown) {
                setErr(er instanceof Error ? er.message : String(er));
              }
            }}
          >
            <select
              className={inputClass}
              value={dealForm.customerId}
              onChange={(e) => setDealForm((f) => ({ ...f, customerId: e.target.value }))}
              required
            >
              <option value="">{t('customers')}</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (#{c.id})
                </option>
              ))}
            </select>
            <input
              className={inputClass}
              placeholder={t('name')}
              value={dealForm.title}
              onChange={(e) => setDealForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
            <input
              className={inputClass}
              placeholder={t('crm_tab_deals') + ' — stage'}
              value={dealForm.stage}
              onChange={(e) => setDealForm((f) => ({ ...f, stage: e.target.value }))}
            />
            <input
              className={inputClass}
              type="number"
              placeholder={t('price')}
              value={dealForm.valueAfs}
              onChange={(e) => setDealForm((f) => ({ ...f, valueAfs: e.target.value }))}
            />
            <input
              className={inputClass + ' md:col-span-2'}
              placeholder={t('notes')}
              value={dealForm.notes}
              onChange={(e) => setDealForm((f) => ({ ...f, notes: e.target.value }))}
            />
            <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium">
              {t('add')}
            </button>
          </form>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead>
                <tr className={subText}>
                  <th className="p-2">#</th>
                  <th className="p-2">{t('customers')}</th>
                  <th className="p-2">{t('name')}</th>
                  <th className="p-2">stage</th>
                  <th className="p-2">{t('price')}</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((d) => (
                  <tr key={d.id} className={`border-t ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                    <td className="p-2">{d.id}</td>
                    <td className="p-2">{customerName(d.customerId)}</td>
                    <td className="p-2">{d.title}</td>
                    <td className="p-2">{d.stage}</td>
                    <td className="p-2">{Number(d.valueAfs).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {deals.length === 0 && !loading && <p className={`${subText} text-center py-6`}>—</p>}
          </div>
        </div>
    </div>
  );
}

/** مسیر قدیمی `/crm` — ترجیحاً از `CustomersCrmHub` استفاده شود */
export default function CrmPage() {
  return <CrmWorkspace embedded={false} />;
}
