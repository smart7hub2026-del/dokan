import { useEffect, useState } from 'react';
import { Smartphone, Monitor, Apple, ChevronRight, CheckCircle2, Shield } from 'lucide-react';
import { DOWNLOAD_URLS } from '../config/downloads';
import BrandLogo from './BrandLogo';

type Props = {
  onBack: () => void;
  onLogin: () => void;
  onRegister: () => void;
};

/**
 * صفحهٔ «دانلود» — فقط سه گزینه با آیکن (اندروید / iOS / ویندوز)
 */
export default function WelcomeDownloadPage({ onBack, onLogin, onRegister }: Props) {
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(typeof window !== 'undefined' ? window.location.origin : '');
  }, []);

  const iosHref = origin ? `${origin}/` : '/';

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-slate-950 font-vazir relative overscroll-none" dir="rtl">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.22),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.20),transparent_45%),linear-gradient(135deg,#020617,#0f172a,#020617)]" />
        <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,rgba(148,163,184,.15)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,.15)_1px,transparent_1px)] bg-[size:28px_28px]" />
      </div>
      <header className="relative z-20 border-b border-white/10 bg-black/30 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 border border-white/15"
              aria-label="بازگشت"
            >
              <ChevronRight size={20} />
            </button>
            <div className="flex items-center gap-2">
              <BrandLogo size={34} variant="header" />
              <h1 className="text-lg sm:text-xl font-black text-white">دانلود</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onLogin}
              className="px-4 py-2 rounded-xl text-sm font-bold text-white border border-white/20 hover:bg-white/10 transition-colors"
            >
              ورود
            </button>
            <button
              type="button"
              onClick={onRegister}
              className="px-4 py-2 rounded-xl text-sm font-black text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-900/30"
            >
              ثبت‌نام
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 min-h-0 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-6xl">
          <h2 className="text-center text-white font-black text-2xl sm:text-3xl mb-2">دانلود نسخه مناسب دستگاه شما</h2>
          <p className="text-center text-slate-300 text-sm mb-2 max-w-xl mx-auto leading-relaxed">
            همان حساب وب؛ فقط مسیر نصب بسته به سیستم‌عامل فرق می‌کند. فایل‌ها از سرور رسمی دکان‌یار ارائه می‌شوند.
          </p>
          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 mb-8">
            <Shield size={14} className="text-emerald-400/90 shrink-0" aria-hidden />
            <span>اتصال رمزنگاری‌شده (HTTPS) — همیشه از همین دامنه رسمی دانلود کنید</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          <a
            href={DOWNLOAD_URLS.apk}
            download="dokanyar.apk"
            className="group min-h-[220px] sm:min-h-[240px] flex flex-col items-center text-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.06] p-5 sm:p-6 transition-all hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:scale-[1.01] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-label="دانلود اپ اندروید"
          >
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-900 shadow-md ring-1 ring-white/20">
              <Smartphone size={26} className="text-white sm:w-7 sm:h-7" strokeWidth={1.75} />
            </div>
            <span className="text-sm font-black text-emerald-200 pt-1">Android APK</span>
            <span className="text-[11px] text-slate-400 leading-snug">نصب مستقیم · مناسب موبایل و تبلت اندروید</span>
            <ul className="mt-2 w-full text-right text-[11px] text-slate-500 space-y-1">
              <li className="flex items-start gap-1.5 justify-end">
                <span>بدون وابستگی به فروشگاه اپ</span>
                <CheckCircle2 size={14} className="text-emerald-500/80 shrink-0 mt-0.5" aria-hidden />
              </li>
              <li className="flex items-start gap-1.5 justify-end">
                <span>به‌روزرسانی از همین صفحه</span>
                <CheckCircle2 size={14} className="text-emerald-500/80 shrink-0 mt-0.5" aria-hidden />
              </li>
            </ul>
          </a>

          <a
            href={iosHref}
            target="_blank"
            rel="noopener noreferrer"
            className="group min-h-[220px] sm:min-h-[240px] flex flex-col items-center text-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.06] p-5 sm:p-6 transition-all hover:border-slate-400/40 hover:bg-white/[0.09] hover:scale-[1.01] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            aria-label="باز کردن در مرورگر برای نصب وب‌اپ آیفون"
          >
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl bg-gradient-to-br from-slate-600 to-slate-900 shadow-md ring-1 ring-white/15">
              <Apple size={26} className="text-white sm:w-7 sm:h-7" strokeWidth={1.75} />
            </div>
            <span className="text-sm font-black text-slate-100 pt-1">iPhone / iPad</span>
            <span className="text-[11px] text-slate-400 leading-snug">وب‌اپ PWA — افزودن به صفحهٔ اصلی از Safari</span>
            <ul className="mt-2 w-full text-right text-[11px] text-slate-500 space-y-1">
              <li className="flex items-start gap-1.5 justify-end">
                <span>بدون نیاز به اپ‌استور محلی</span>
                <CheckCircle2 size={14} className="text-slate-400 shrink-0 mt-0.5" aria-hidden />
              </li>
              <li className="flex items-start gap-1.5 justify-end">
                <span>همان دادهٔ حساب وب شما</span>
                <CheckCircle2 size={14} className="text-slate-400 shrink-0 mt-0.5" aria-hidden />
              </li>
            </ul>
          </a>

          <a
            href={DOWNLOAD_URLS.windowsSetup}
            download="Dokanyar-Setup.exe"
            className="group min-h-[220px] sm:min-h-[240px] flex flex-col items-center text-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.06] p-5 sm:p-6 transition-all hover:border-blue-500/40 hover:bg-blue-500/10 hover:scale-[1.01] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            aria-label="دانلود نسخه ویندوز"
          >
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-950 shadow-md ring-1 ring-white/20">
              <Monitor size={26} className="text-white sm:w-7 sm:h-7" strokeWidth={1.75} />
            </div>
            <span className="text-sm font-black text-blue-100 pt-1">Windows PC</span>
            <span className="text-[11px] text-slate-400 leading-snug">نصب‌کنندهٔ ویندوز · دسکتاپ کامل</span>
            <ul className="mt-2 w-full text-right text-[11px] text-slate-500 space-y-1">
              <li className="flex items-start gap-1.5 justify-end">
                <span>مناسب دفتر و صندوق ثابت</span>
                <CheckCircle2 size={14} className="text-blue-400/80 shrink-0 mt-0.5" aria-hidden />
              </li>
              <li className="flex items-start gap-1.5 justify-end">
                <span>به‌روزرسانی از طریق همین لینک</span>
                <CheckCircle2 size={14} className="text-blue-400/80 shrink-0 mt-0.5" aria-hidden />
              </li>
            </ul>
          </a>
        </div>
        </div>
      </main>
    </div>
  );
}
