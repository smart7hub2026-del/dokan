import { useEffect, useState } from 'react';
import { Smartphone, Monitor, Apple, ChevronRight } from 'lucide-react';
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
          <p className="text-center text-slate-300 text-sm mb-8">هر سه مسیر کامل است: اندروید، iOS (نسخه وب‌اپ)، ویندوز</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <a
            href={DOWNLOAD_URLS.apk}
            download="dokanyar.apk"
            className="group min-h-[280px] flex flex-col items-center justify-center text-center gap-3 rounded-3xl border border-white/10 bg-white/[0.06] p-7 transition-all hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-label="دانلود اپ اندروید"
          >
            <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-900 shadow-lg ring-1 ring-white/20">
              <Smartphone size={44} className="text-white sm:w-[52px] sm:h-[52px]" strokeWidth={1.5} />
            </div>
            <span className="text-sm font-black text-emerald-200">Android APK</span>
            <span className="text-xs text-slate-300">دانلود مستقیم فایل نصب</span>
          </a>

          <a
            href={iosHref}
            target="_blank"
            rel="noopener noreferrer"
            className="group min-h-[280px] flex flex-col items-center justify-center text-center gap-3 rounded-3xl border border-white/10 bg-white/[0.06] p-7 transition-all hover:border-slate-400/40 hover:bg-white/[0.09] hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            aria-label="باز کردن در مرورگر برای نصب وب‌اپ آیفون"
          >
            <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-600 to-slate-900 shadow-lg ring-1 ring-white/15">
              <Apple size={44} className="text-white sm:w-[52px] sm:h-[52px]" strokeWidth={1.5} />
            </div>
            <span className="text-sm font-black text-slate-100">iPhone / iPad</span>
            <span className="text-xs text-slate-300">باز شدن نسخه وب برای Add to Home Screen</span>
          </a>

          <a
            href={DOWNLOAD_URLS.windowsSetup}
            download="Dokanyar-Setup.exe"
            className="group min-h-[280px] flex flex-col items-center justify-center text-center gap-3 rounded-3xl border border-white/10 bg-white/[0.06] p-7 transition-all hover:border-blue-500/40 hover:bg-blue-500/10 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            aria-label="دانلود نسخه ویندوز"
          >
            <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-950 shadow-lg ring-1 ring-white/20">
              <Monitor size={44} className="text-white sm:w-[52px] sm:h-[52px]" strokeWidth={1.5} />
            </div>
            <span className="text-sm font-black text-blue-100">Windows PC</span>
            <span className="text-xs text-slate-300">دانلود فایل Setup ویندوز</span>
          </a>
        </div>
        </div>
      </main>
    </div>
  );
}
