import { useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useToast } from './Toast';
import { User } from '../App';
import { apiPatchMe } from '../services/api';
import {
  UserCircle,
  ChevronLeft,
  Printer,
  WifiOff,
  MessageSquare,
  UserCog,
  Smartphone,
  Shield,
  KeyRound,
  ScrollText,
  Webhook,
  Percent,
  Clock,
  ChevronRight,
} from 'lucide-react';
import SecurityPage from './SecurityPage';
import BackupPage from './BackupPage';
import UsersPage from './UsersPage';
import BranchRequestShopPanel from './BranchRequestShopPanel';
import WarehouseBinsSettingsPanel from './WarehouseBinsSettingsPanel';
import PrintSettingsPage from './PrintSettingsPage';
import OfflinePage from './OfflinePage';
import SupportPage from './SupportPage';
import ActiveSessionsPage from './ActiveSessionsPage';
import { useStore } from '../store/useStore';
import creatorConfig from '../config/creator.json';

type SettingsTab =
  | 'general'
  | 'profile'
  | 'security'
  | 'sessions'
  | 'backup'
  | 'users'
  | 'print'
  | 'offline'
  | 'support';

export default function SettingsPage({
  currentUser,
  authToken,
}: {
  currentUser: User;
  authToken: string | null;
}) {
  const { t, isDark } = useApp();
  const { success, error } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const patchCurrentUser = useStore(s => s.patchCurrentUser);
  const shopSettings = useStore(s => s.shopSettings);
  const updateShopSettings = useStore(s => s.updateShopSettings);
  const [profileName, setProfileName] = useState(currentUser.full_name);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    setProfileName(currentUser.full_name);
  }, [currentUser]);

  const isSuper = currentUser.role === 'super_admin';
  const shopSettingsTabs = !isSuper;

  const validTabs = useMemo(() => {
    const ids: SettingsTab[] = [
      'general',
      'profile',
      ...(currentUser.role === 'admin' ? (['users'] as const) : []),
      ...(shopSettingsTabs ? (['print', 'offline', 'support'] as const) : (['support'] as const)),
      'security',
      'sessions',
      'backup',
    ];
    return new Set(ids);
  }, [currentUser.role, shopSettingsTabs]);

  useEffect(() => {
    const s = searchParams.get('section') as SettingsTab | null;
    if (!s || !validTabs.has(s)) return;
    setActiveTab(s);
  }, [searchParams, validTabs]);

  const goTab = useCallback(
    (id: SettingsTab) => {
      setActiveTab(id);
      if (id === 'general') setSearchParams({});
      else setSearchParams({ section: id });
    },
    [setSearchParams]
  );

  const handleSaveProfile = async () => {
    if (currentUser.role === 'super_admin') return;
    if (!authToken) {
      error(t('error'), t('login'));
      return;
    }
    setSavingProfile(true);
    try {
      const res = await apiPatchMe({ full_name: profileName.trim() }, authToken);
      patchCurrentUser({
        full_name: res.user.full_name,
      } as Parameters<typeof patchCurrentUser>[0]);
      success(t('profile_saved'), '');
    } catch (e) {
      error(t('error'), e instanceof Error ? e.message : String(e));
    } finally {
      setSavingProfile(false);
    }
  };

  const tabs: { id: SettingsTab; label: string; icon?: ReactNode }[] = [
    { id: 'general', label: t('tab_general') },
    { id: 'profile', label: t('profile_tab') },
    ...(currentUser.role === 'admin' ? [{ id: 'users' as const, label: t('shop_users'), icon: <UserCog size={14} /> }] : []),
    ...(shopSettingsTabs
      ? [
          { id: 'print' as const, label: t('print_settings'), icon: <Printer size={14} /> },
          { id: 'offline' as const, label: t('offline_mode'), icon: <WifiOff size={14} /> },
          { id: 'support' as const, label: t('support'), icon: <MessageSquare size={14} /> },
        ]
      : [{ id: 'support' as const, label: t('support'), icon: <MessageSquare size={14} /> }]),
    { id: 'security', label: t('tab_security') },
    { id: 'sessions', label: t('sessions'), icon: <Smartphone size={14} /> },
    { id: 'backup', label: t('tab_backup') },
  ];

  return (
    <div className="space-y-6 fade-in max-w-5xl mx-auto pb-4 md:pb-0 min-h-0">
      <div>
        <h1 className="text-2xl font-bold text-white">{t('settings')}</h1>
        <p className="text-slate-400 text-sm mt-1">{t('manage_account_settings')}</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-white/10">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => goTab(tab.id)}
            className={`px-4 py-2.5 rounded-t-lg text-sm font-medium whitespace-nowrap transition-colors inline-flex items-center gap-1.5 ${
              activeTab === tab.id
                ? 'bg-emerald-500/10 text-emerald-400 border-b-2 border-emerald-500'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="pt-2">
        {activeTab === 'general' && (
          <div className="space-y-6">
            <p className="text-slate-400 text-sm leading-relaxed max-w-3xl">
              در این تب مشخصات حساب، تقویم نمایش تاریخ در پنل، و نمای کلی قابلیت‌های سازمانی را می‌بینید. زبان، ارز و تم ظاهری از منوی اصلی «زبان و ارز» تغییر می‌کنند.
            </p>
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 space-y-4">
              <h2 className="text-white font-semibold">اطلاعات کاربر</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  ['نام کامل', currentUser.full_name],
                  ['نقش', currentUser.role === 'super_admin' ? t('role_super_admin') : currentUser.role === 'admin' ? t('role_admin') : currentUser.role === 'seller' ? t('role_seller') : currentUser.role === 'accountant' ? t('role_accountant') : t('role_stock_keeper')],
                  ['وضعیت', currentUser.status === 'active' ? 'فعال' : 'غیرفعال'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <label className="text-slate-400 text-xs block mb-1">{k}</label>
                    <div className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm">{v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 space-y-3 max-w-xl">
              <h2 className="text-white font-semibold">تغییر رمز عبور</h2>
              <p className="text-slate-400 text-xs">
                تغییر واقعی رمز از طریق API در تب «{t('tab_security')}» انجام می‌شود (حداقل ۸ کاراکتر، حرف بزرگ، عدد و کاراکتر ویژه).
              </p>
              <button
                type="button"
                onClick={() => goTab('security')}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                برو به {t('tab_security')}
              </button>
            </div>

            {!isSuper && (
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 space-y-4">
                <h2 className="text-white font-semibold">تنظیم تاریخ</h2>
                <p className="text-slate-400 text-xs">انتخاب کنید تاریخ‌ها در پنل به میلادی نمایش داده شوند یا شمسی (حمل، ثور، جوزا...).</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: 'jalali', title: 'شمسی', sample: '۱۴۰۵/۰۲/۱۸ — حمل، ثور، جوزا' },
                    { key: 'gregorian', title: 'میلادی', sample: '2026-05-08 — Apr, May, Jun' },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => updateShopSettings({ date_calendar: opt.key as 'gregorian' | 'jalali' })}
                      className={`rounded-xl border px-4 py-3 text-right transition-all ${
                        (shopSettings.date_calendar || 'jalali') === opt.key
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                          : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <p className="font-bold text-sm">{opt.title}</p>
                      <p className="text-xs text-slate-400 mt-1">{opt.sample}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentUser.role === 'admin' && !isSuper && <WarehouseBinsSettingsPanel />}

            {!isSuper && (
              <div
                className={`rounded-2xl p-6 space-y-5 border ${
                  isDark
                    ? 'bg-slate-800/40 border-indigo-500/25'
                    : 'bg-gradient-to-br from-slate-50 to-indigo-50/40 border-indigo-200/80 shadow-sm'
                }`}
              >
                <div>
                  <h2 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    آمادگی سطح Enterprise
                  </h2>
                  <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    ماژول‌های زیر برای سازمان‌های بزرگ‌تر طراحی شده‌اند؛ بخشی در همین برنامه در دسترس است و بقیه در نقشهٔ توسعه فعال می‌شوند.
                  </p>
                </div>
                <div className="grid gap-3 sm:gap-4">
                  {(
                    [
                      {
                        icon: Shield,
                        title: 'RBAC پیشرفته',
                        body: 'نقش‌های از پیش تعریف‌شده (مدیر، فروشنده، انباردار، حسابدار) فعال است. کنترل ریز per-page و per-action برای نسخهٔ سازمانی در حال تکمیل است.',
                        action: { label: 'کاربران و نقش‌ها', tab: 'users' as const },
                        tone: 'violet',
                        badge: 'partial' as const,
                      },
                      {
                        icon: KeyRound,
                        title: 'سیاست رمز و نشست',
                        body: 'اعتبارسنجی رمز قوی، احراز دو مرحله‌ای و مدیریت نشست در تب امنیت و نشست‌های فعال در دسترس است؛ انقضای اجباری نشست و قفل پس از تلاش ناموفق روی سرور قابل سخت‌گیری بیشتر است.',
                        action: { label: 'امنیت', tab: 'security' as const },
                        tone: 'emerald',
                        badge: 'partial' as const,
                      },
                      {
                        icon: ScrollText,
                        title: 'Audit و ردپای تنظیمات',
                        body: 'لاگ اقدامات حساس تنظیمات و بکاپ در سرور ثبت می‌شود؛ گزارش جستجوپذیر سراسری برای همهٔ دکان‌ها در پنل ابرادمین توسعه می‌یابد.',
                        action: { label: 'پشتیبان‌گیری', tab: 'backup' as const },
                        tone: 'amber',
                        badge: 'partial' as const,
                      },
                      {
                        icon: Webhook,
                        title: 'وب‌هوک و API',
                        body: 'یکپارچگی پرداخت (مثلاً HesabPay) و مسیرهای REST برای فروشگاه فعال است؛ صدور API Key اختصاصی فروشگاه و وب‌هوک رویدادها برای نسخهٔ تجاری برنامه‌ریزی شده است.',
                        action: { label: 'پشتیبانی', tab: 'support' as const },
                        tone: 'sky',
                        badge: 'partial' as const,
                      },
                      {
                        icon: Percent,
                        title: 'مالیات و چند ارز',
                        body: 'چند ارز و نرخ تبدیل در «زبان و ارز» مدیریت می‌شود؛ قوانین مالیاتی پیچیده و چند نرخ همزمان روی فاکتور در نقشهٔ محصول است.',
                        action: { label: 'زبان و ارز از منو', tab: null },
                        tone: 'rose',
                        badge: 'partial' as const,
                      },
                      {
                        icon: Clock,
                        title: 'بکاپ زمان‌بندی‌شده',
                        body: 'بکاپ دستی و خروجی JSON/پایگاه از تب پشتیبان در دسترس است؛ زمان‌بندی خودکار، نگهداری چند نسخه و اعلان خطا به مدیر در نسخهٔ میزبان اختصاصی اضافه می‌شود.',
                        action: { label: 'پشتیبان‌گیری', tab: 'backup' as const },
                        tone: 'cyan',
                        badge: 'planned' as const,
                      },
                    ] as const
                  ).map((row) => {
                    const Icon = row.icon;
                    const ring =
                      row.tone === 'violet'
                        ? isDark
                          ? 'border-violet-500/25 bg-violet-500/[0.07]'
                          : 'border-violet-200 bg-white'
                        : row.tone === 'emerald'
                          ? isDark
                            ? 'border-emerald-500/25 bg-emerald-500/[0.06]'
                            : 'border-emerald-200 bg-white'
                          : row.tone === 'amber'
                            ? isDark
                              ? 'border-amber-500/25 bg-amber-500/[0.06]'
                              : 'border-amber-200 bg-white'
                            : row.tone === 'sky'
                              ? isDark
                                ? 'border-sky-500/25 bg-sky-500/[0.06]'
                                : 'border-sky-200 bg-white'
                              : row.tone === 'rose'
                                ? isDark
                                  ? 'border-rose-500/25 bg-rose-500/[0.06]'
                                  : 'border-rose-200 bg-white'
                                : isDark
                                  ? 'border-cyan-500/25 bg-cyan-500/[0.06]'
                                  : 'border-cyan-200 bg-white';
                    const iconBg =
                      row.tone === 'violet'
                        ? isDark
                          ? 'bg-violet-500/20 text-violet-300'
                          : 'bg-violet-100 text-violet-700'
                        : row.tone === 'emerald'
                          ? isDark
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-emerald-100 text-emerald-700'
                          : row.tone === 'amber'
                            ? isDark
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-amber-100 text-amber-800'
                            : row.tone === 'sky'
                              ? isDark
                                ? 'bg-sky-500/20 text-sky-300'
                                : 'bg-sky-100 text-sky-800'
                              : row.tone === 'rose'
                                ? isDark
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : 'bg-rose-100 text-rose-800'
                                : isDark
                                  ? 'bg-cyan-500/20 text-cyan-300'
                                  : 'bg-cyan-100 text-cyan-800';
                    return (
                      <div
                        key={row.title}
                        className={`rounded-2xl border p-4 flex flex-col sm:flex-row gap-3 sm:gap-4 ${ring}`}
                      >
                        <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                          <Icon size={22} strokeWidth={1.75} />
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{row.title}</h3>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                row.badge === 'planned'
                                  ? isDark
                                    ? 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/25'
                                    : 'bg-amber-100 text-amber-900 ring-1 ring-amber-200'
                                  : isDark
                                    ? 'bg-white/10 text-slate-300'
                                    : 'bg-slate-200/80 text-slate-700'
                              }`}
                            >
                              {row.badge === 'planned' ? 'آیندهٔ محصول' : 'بخشی فعال / توسعه'}
                            </span>
                          </div>
                          <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            {row.body}
                          </p>
                          {row.action.tab ? (
                            <button
                              type="button"
                              onClick={() => goTab(row.action.tab!)}
                              className={`inline-flex items-center gap-1 text-xs font-bold mt-1 ${
                                isDark ? 'text-indigo-300 hover:text-indigo-200' : 'text-indigo-700 hover:text-indigo-900'
                              }`}
                            >
                              {row.action.label}
                              <ChevronRight size={14} className="rotate-180" />
                            </button>
                          ) : (
                            <p className={`text-[11px] font-semibold ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                              از منوی اصلی: {row.action.label}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {currentUser.role === 'super_admin' && (
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 space-y-4">
                <h2 className="text-white font-semibold">مرجع پلتفرم (فقط خواندنی)</h2>
                <p className="text-slate-400 text-xs leading-relaxed">
                  رمز ابرادمین و تنظیمات حیاتی در <strong className="text-slate-200">متغیرهای محیطی سرور</strong> (مثلاً{' '}
                  <span className="font-mono text-[10px]" dir="ltr">SEED_SUPERADMIN_PASSWORD</span>
                  ) ذخیره می‌شوند؛ این فرم دیگر ذخیرهٔ ساختگی نشان نمی‌دهد.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-400 text-xs block mb-1">ارز پیش‌فرض نمایشی</label>
                    <div className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm">AFN</div>
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs block mb-1">تلفن پشتیبانی (creator.json)</label>
                    <div className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm" dir="ltr">
                      {String(creatorConfig.social?.phone || '—')}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-slate-400 text-xs block mb-1">نسخهٔ فرانت‌اند (build)</label>
                    <div className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 text-sm font-mono" dir="ltr">
                      {__APP_VERSION__}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-6 max-w-xl">
            {currentUser.role === 'super_admin' ? (
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 space-y-4 text-slate-300 text-sm leading-relaxed">
                <p className="text-white font-semibold text-base">پروفایل ابرادمین</p>
                <p>{t('profile_super_readonly')}</p>
                <p className="text-slate-400 text-xs">
                  نام نمایشی و سیاست‌های حساس در سطح پلتفرم از مسیرهای تخصصی (مدیریت دکان‌ها، اعلان، بکاپ) انجام می‌شود؛ رمز و ۲FA در تب امنیت.
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-500/20 transition-colors"
                  >
                    داشبورد
                  </Link>
                  <Link
                    to="/tenants"
                    className="inline-flex items-center justify-center rounded-xl border border-white/15 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-white/5 transition-colors"
                  >
                    مدیریت دکان‌ها
                  </Link>
                  <Link
                    to="/settings?section=security"
                    className="inline-flex items-center justify-center rounded-xl border border-white/15 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-white/5 transition-colors"
                  >
                    امنیت و ۲FA
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 space-y-4">
                  <h2 className="text-white font-semibold flex items-center gap-2">
                    <UserCircle size={18} /> {t('profile_tab')}
                  </h2>
                  <p className="text-slate-400 text-xs">{t('profile_prefs_hint')}</p>
                  <div>
                    <label className="text-slate-400 text-xs block mb-1">{t('profile_display_name')}</label>
                    <input
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-emerald-500"
                    />
                  </div>
                  {currentUser.role === 'admin' && (
                    <div>
                      <label className="text-slate-400 text-xs block mb-1">عنوان نمایشی نقش مدیر در پنل (پیش‌فرض: admin)</label>
                      <p className="text-slate-500 text-[10px] leading-relaxed mb-2">
                        این فقط برچسب نمایشی است؛ نام کاربری واقعیِ ورود برای مدیر در «کاربران فروشگاه» تنظیم می‌شود و با <span className="font-mono" dir="ltr">admin-کدکوچک</span> قابل استفاده است.
                      </p>
                      <input
                        value={shopSettings.admin_role_name || 'admin'}
                        onChange={(e) => updateShopSettings({ admin_role_name: e.target.value || 'admin' })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-emerald-500"
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={savingProfile}
                    onClick={() => void handleSaveProfile()}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {savingProfile ? t('loading') : t('profile_save')}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => goTab('security')}
                  className="w-full sm:w-auto flex items-center gap-2 text-emerald-400 text-sm hover:text-emerald-300"
                >
                  <ChevronLeft size={16} className="rotate-180" />
                  {t('profile_link_security')}
                </button>
              </>
            )}
          </div>
        )}

        {activeTab === 'users' && currentUser.role === 'admin' && (
          <div className="space-y-4">
            <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
              مدیریت حرفه‌ای تیم فروشگاه: هر نقش رمز جدا، نام کاربری انگلیسی، و وضعیت فعال/معلق دارد. تغییرات از طریق API سرور ذخیره می‌شود و در ورود دو مرحله‌ای اعمال می‌گردد.
            </p>
            <BranchRequestShopPanel />
            <UsersPage embedded />
          </div>
        )}

        {activeTab === 'print' && shopSettingsTabs && (
          <div className="space-y-4">
            <p className="text-slate-400 text-sm leading-relaxed max-w-3xl">
              هویت بصری دکان روی فاکتور و پیش‌نمایش چاپ: لوگو، بنر، شماره تماس، پایگاه کاغذ حرارتی/A4 و گزینه‌های نمایش روی رسید.
            </p>
            <PrintSettingsPage />
          </div>
        )}
        {activeTab === 'offline' && shopSettingsTabs && (
          <div className="space-y-4">
            <p className="text-slate-400 text-sm leading-relaxed max-w-3xl">
              رفتار پنل هنگام قطع اینترنت و همگام‌سازی بعدی با سرور؛ مناسب کار در مغازه با اتصال ناپایدار.
            </p>
            <OfflinePage />
          </div>
        )}
        {activeTab === 'support' && (
          <div className="space-y-4">
            <p className="text-slate-400 text-sm leading-relaxed max-w-3xl">
              ثبت تیکت برای تیم پلتفرم، پیگیری وضعیت، و در نقش ابرادمین پاسخ‌گویی متمرکز به همهٔ دکان‌ها.
            </p>
            <SupportPage />
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-4">
            <SecurityPage twoFactorEnabled={currentUser.two_factor_enabled} />
          </div>
        )}
        {activeTab === 'sessions' && (
          <div className="max-w-5xl pb-6 md:pb-0 space-y-4">
            <p className="text-slate-400 text-sm leading-relaxed max-w-3xl">
              نشست‌های فعال روی دستگاه‌ها و مراجع اخیر؛ برای امنیت پس از کار روی رایانه اشتراکی، نشست‌های غیرضروری را ببندید.
            </p>
            <ActiveSessionsPage embedded />
          </div>
        )}
        {activeTab === 'backup' && (
          <div className="space-y-4">
            <p className="text-slate-400 text-sm leading-relaxed max-w-3xl">
              خروجی پشتیبان دکان، تاریخچه عملیات، و در نقش ابرادمین ابزارهای پشتیبان در سطح پلتفرم؛ زمان‌بندی خودکار معمولاً روی میزبان اختصاصی پیکربندی می‌شود.
            </p>
            <BackupPage />
          </div>
        )}
      </div>

    </div>
  );
}