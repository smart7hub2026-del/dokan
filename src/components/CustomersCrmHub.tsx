import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, Kanban, type LucideIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useStore } from '../store/useStore';
import CustomersPage from './CustomersPage';
import { CrmWorkspace, type CrmWorkspaceTab } from './CrmPage';

const VIEW_LIST = 'list';
const CRM_VIEWS: CrmWorkspaceTab[] = ['deals'];
const LEGACY_CRM_VIEWS = new Set(['tasks', 'contacts', 'rfm']);

function parseView(raw: string | null): typeof VIEW_LIST | CrmWorkspaceTab {
  if (!raw || raw === VIEW_LIST) return VIEW_LIST;
  if (LEGACY_CRM_VIEWS.has(raw)) return 'deals';
  if (CRM_VIEWS.includes(raw as CrmWorkspaceTab)) return raw as CrmWorkspaceTab;
  return VIEW_LIST;
}

export default function CustomersCrmHub() {
  const { t, isDark } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUser = useStore((s) => s.currentUser);
  const role = currentUser?.role;
  const crmAllowed = role === 'admin' || role === 'super_admin';

  const viewParam = searchParams.get('view');
  const view = useMemo(() => parseView(viewParam), [viewParam]);

  const setView = useCallback(
    (next: typeof VIEW_LIST | CrmWorkspaceTab) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (next === VIEW_LIST) p.delete('view');
          else p.set('view', next);
          return p;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  useEffect(() => {
    if (!crmAllowed && view !== VIEW_LIST) setView(VIEW_LIST);
  }, [crmAllowed, view, setView]);

  useEffect(() => {
    const v = searchParams.get('view');
    if (v && LEGACY_CRM_VIEWS.has(v)) {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.set('view', 'deals');
          return p;
        },
        { replace: true },
      );
    }
  }, [searchParams, setSearchParams]);

  const customerDeepLink = searchParams.get('customer');
  useEffect(() => {
    if (customerDeepLink && /^\d+$/.test(customerDeepLink) && view !== VIEW_LIST) {
      setView(VIEW_LIST);
    }
  }, [customerDeepLink, view, setView]);

  const textColor = isDark ? 'text-white' : 'text-slate-800';
  const subText = isDark ? 'text-slate-400' : 'text-slate-500';

  const hubTabs: { id: typeof VIEW_LIST | CrmWorkspaceTab; label: string; icon: LucideIcon }[] = [
    { id: VIEW_LIST, label: t('customers_crm_tab_directory'), icon: Users },
    ...(crmAllowed ? ([{ id: 'deals' as const, label: t('crm_tab_deals'), icon: Kanban }] as const) : []),
  ];

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className={`text-2xl font-bold ${textColor}`}>{t('customers_crm_hub_title')}</h1>
        <p className={`${subText} text-sm mt-1`}>{t('customers_crm_hub_subtitle')}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {hubTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              view === id
                ? 'bg-indigo-600 text-white'
                : isDark
                  ? 'bg-white/5 text-slate-300 hover:bg-white/10'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {view === VIEW_LIST && <CustomersPage embedInHub />}

      {crmAllowed && view !== VIEW_LIST && <CrmWorkspace embedded />}
    </div>
  );
}
