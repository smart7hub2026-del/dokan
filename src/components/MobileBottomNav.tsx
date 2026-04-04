import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Building2,
  BarChart3,
  Wallet,
  Settings,
  Bell,
} from 'lucide-react';
type Role = 'super_admin' | 'admin' | 'seller' | 'stock_keeper' | 'accountant';
import { PAGE_TO_PATH } from '../config/pageRoutes';
import { NAV_ICON_COLORS, NAV_ROW_ACTIVE_DARK, NAV_ROW_ACTIVE_LIGHT } from '../config/navigationTheme';
import { useApp } from '../context/AppContext';

type NavDef = { page: string; icon: typeof LayoutDashboard; labelKey: string };

const ICON = 1.75;
const ICON_ACTIVE = 2;

/** موبایل فروشگاه: داشبورد، محصولات، فروش (وسط)، مشتری، تأیید فعالیت — بقیه فقط منو */
const SHOP_NAV_BEFORE: NavDef[] = [
  { page: 'dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  { page: 'products', icon: Package, labelKey: 'products' },
];
const SHOP_CENTER: NavDef = { page: 'sales', icon: ShoppingCart, labelKey: 'sales' };
const SHOP_NAV_AFTER: NavDef[] = [
  { page: 'customers', icon: Users, labelKey: 'customers' },
  { page: 'pending', icon: Bell, labelKey: 'pending_sales' },
];

/** ابرادمین: داشبورد، گزارش‌ها، دکان‌ها (وسط)، صورتحساب، تنظیمات */
const SUPER_NAV_BEFORE: NavDef[] = [
  { page: 'dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  { page: 'reports', icon: BarChart3, labelKey: 'reports' },
];
const SUPER_CENTER: NavDef = { page: 'tenants', icon: Building2, labelKey: 'tenants' };
const SUPER_NAV_AFTER: NavDef[] = [
  { page: 'billing', icon: Wallet, labelKey: 'billing' },
  { page: 'settings', icon: Settings, labelKey: 'settings' },
];

export default function MobileBottomNav({
  role,
  activePage,
  onNavigate,
}: {
  role: Role;
  activePage: string;
  onNavigate: (page: string) => void;
}) {
  const { t, isDark } = useApp();
  const isSuper = role === 'super_admin';
  const before = isSuper ? SUPER_NAV_BEFORE : SHOP_NAV_BEFORE;
  const center = isSuper ? SUPER_CENTER : SHOP_CENTER;
  const after = isSuper ? SUPER_NAV_AFTER : SHOP_NAV_AFTER;

  const bar = isDark
    ? 'border-white/10 bg-slate-950/92 backdrop-blur-xl shadow-[0_-8px_32px_rgba(0,0,0,0.35)]'
    : 'border-slate-200 bg-white/95 backdrop-blur-xl shadow-[0_-4px_24px_rgba(30,58,138,0.08)]';

  const renderSide = (item: NavDef) => {
    const path = PAGE_TO_PATH[item.page];
    if (!path) return null;
    const active = activePage === item.page;
    const Icon = item.icon;
    return (
      <button
        key={item.page}
        type="button"
        onClick={() => onNavigate(item.page)}
        className={`flex min-w-0 max-w-[4.25rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border px-0.5 py-1.5 transition-all ${
          active
            ? isDark
              ? `${NAV_ROW_ACTIVE_DARK[item.page] ?? 'bg-white/10 border-white/10'} font-bold text-white`
              : `${NAV_ROW_ACTIVE_LIGHT[item.page] ?? 'bg-slate-100 border-slate-200'} font-bold text-slate-900`
            : `border-transparent ${
                isDark
                  ? 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-200'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`
        }`}
      >
        <Icon
          size={20}
          strokeWidth={active ? ICON_ACTIVE : ICON}
          className={`shrink-0 ${NAV_ICON_COLORS[item.page] || (isDark ? 'text-slate-400' : 'text-slate-500')}`}
        />
        <span className="max-w-[4rem] truncate text-center text-[9px] font-bold leading-tight">{t(item.labelKey)}</span>
      </button>
    );
  };

  const renderFab = (item: NavDef) => {
    const path = PAGE_TO_PATH[item.page];
    if (!path) return null;
    const active = activePage === item.page;
    const Icon = item.icon;
    return (
      <button
        key={item.page}
        type="button"
        onClick={() => onNavigate(item.page)}
        className={`relative -mt-6 mb-0.5 flex min-w-[4.5rem] max-w-[5.25rem] flex-col items-center justify-center rounded-2xl border px-2.5 py-2 shadow-lg transition-all ${
          active
            ? isDark
              ? 'border-emerald-400/40 bg-emerald-600 text-white shadow-emerald-900/45'
              : 'border-blue-900/25 bg-[#1e3a8a] text-white shadow-blue-900/30'
            : isDark
              ? 'border-white/10 bg-slate-800 text-slate-100 shadow-black/30'
              : 'border-blue-200 bg-gradient-to-b from-[#1e40af] to-[#1e3a8a] text-white shadow-blue-900/25'
        }`}
      >
        <Icon size={28} strokeWidth={active ? ICON_ACTIVE : ICON} className="shrink-0" />
        <span className="mt-1 max-w-[4.5rem] truncate text-center text-[10px] font-extrabold leading-none">
          {t(item.labelKey)}
        </span>
      </button>
    );
  };

  return (
    <nav
      className={`fixed inset-x-0 bottom-0 z-40 border-t md:hidden ${bar}`}
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      dir="rtl"
    >
      <div className="mx-auto flex max-w-lg items-end justify-between gap-0.5 px-1 pt-1 min-h-[3.75rem]">
        <div className="flex min-w-0 flex-1 items-end justify-evenly">{before.map(renderSide)}</div>
        {renderFab(center)}
        <div className="flex min-w-0 flex-1 items-end justify-evenly">{after.map(renderSide)}</div>
      </div>
    </nav>
  );
}
