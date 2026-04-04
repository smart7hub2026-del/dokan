import { useId } from 'react';
import { Store, Briefcase, CreditCard, Crown, LayoutDashboard } from 'lucide-react';
import { AUTH_HERO_SCENE_IMAGES } from './authSceneAssets';

export type AuthHeroScene = 'default' | 'login' | 'plan' | 'shop' | 'business' | 'payment';

type Props = {
  className?: string;
  /** برای جاسازی در ثبت‌نام / پرداخت بدون تکرار شعار پایین */
  hideCaption?: boolean;
  /** آیکون و عنوان هم‌رنگ هر مرحله — انیمیشن شناور */
  scene?: AuthHeroScene;
  /**
   * وقتی پشت کارت تصویر دیگری است (کلاژ ورود یا بلوک پرداخت)، لایهٔ تصویر کامل کارت را مخفی کن.
   */
  useSceneBackdrop?: boolean;
};

const SCENE_META: Record<
  AuthHeroScene,
  { Icon: typeof Store; label: string; sub: string }
> = {
  default: { Icon: LayoutDashboard, label: 'دکان‌یار', sub: 'فروش و انبار، ساده و سریع' },
  login: { Icon: LayoutDashboard, label: 'ورود امن', sub: 'همگام با سرور فروشگاه' },
  plan: { Icon: Crown, label: 'انتخاب طرح', sub: 'شروع حرفه‌ای با اشتراک' },
  shop: { Icon: Store, label: 'مشخصات فروشگاه', sub: 'نام، تماس و مدیر' },
  business: { Icon: Briefcase, label: 'نوع کسب‌وکار', sub: 'صنف و پایگاه داده' },
  payment: { Icon: CreditCard, label: 'روش پرداخت', sub: 'تسویه و فعال‌سازی' },
};

/**
 * کارت هرو: انیمیشن CSS + تصویر ثابت نمادین (فروشگاه / کسب‌وکار / پرداخت).
 */
export default function AuthHeroVideoCard({
  className = '',
  hideCaption = false,
  scene = 'default',
  useSceneBackdrop = true,
}: Props) {
  const { Icon, label, sub } = SCENE_META[scene] || SCENE_META.default;
  const gradId = `authHeroGrad-${useId().replace(/:/g, '')}`;
  const backdropSrc = AUTH_HERO_SCENE_IMAGES[scene] || AUTH_HERO_SCENE_IMAGES.default;

  return (
    <div
      className={`auth-hero-video-card relative overflow-hidden rounded-[2rem] border border-white/[0.12] bg-slate-950 shadow-[0_40px_100px_-24px_rgba(0,0,0,0.85)] ${className}`}
    >
      <div className="absolute inset-0 auth-hero-mesh" aria-hidden />
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="auth-hero-orb auth-hero-orb-a" />
        <div className="auth-hero-orb auth-hero-orb-b" />
        <div className="auth-hero-orb auth-hero-orb-c" />
        <svg className="auth-hero-spark-svg absolute inset-0 h-full w-full opacity-[0.35]" viewBox="0 0 400 240" preserveAspectRatio="none">
          <path
            className="auth-hero-spark-path"
            d="M0,180 Q80,40 160,120 T320,80 L400,60"
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgb(129, 140, 248)" stopOpacity="0.2" />
              <stop offset="50%" stopColor="rgb(34, 211, 238)" stopOpacity="0.9" />
              <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity="0.3" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {useSceneBackdrop && backdropSrc ? (
        <img
          src={backdropSrc}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-[0.48] transition-opacity duration-500"
          loading="lazy"
          decoding="async"
        />
      ) : null}

      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/55 to-indigo-950/25 pointer-events-none" />
      <div
        className="absolute inset-0 bg-[linear-gradient(105deg,transparent_30%,rgba(99,102,241,0.14)_50%,transparent_70%)] auth-hero-shine pointer-events-none"
        aria-hidden
      />

      <div className="relative z-[2] flex min-h-[inherit] flex-col">
        <div className="pointer-events-none flex flex-1 flex-col items-center justify-center px-6 pb-6 pt-10 text-center">
          <div className="auth-hero-scene-icon flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-3xl border border-cyan-400/30 bg-gradient-to-br from-indigo-500/25 to-cyan-500/15 shadow-lg shadow-indigo-900/40 ring-1 ring-white/10 sm:h-[5.25rem] sm:w-[5.25rem]">
            <Icon className="h-10 w-10 text-cyan-100 drop-shadow-md sm:h-12 sm:w-12" strokeWidth={1.35} aria-hidden />
          </div>
          <p className="mt-4 text-base font-black text-white drop-shadow-md sm:text-lg">{label}</p>
          <p className="mt-1 max-w-[16rem] text-xs font-bold leading-relaxed text-indigo-200/95 sm:text-sm">{sub}</p>
        </div>

        {!hideCaption && scene === 'default' ? (
          <div className="relative z-10 -mt-4 flex flex-col justify-end p-8 pb-8 sm:p-10">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200/90">دکان‌یار</p>
            <p className="mt-2 text-lg font-black text-white drop-shadow-md sm:text-xl">فروش و انبار، ساده و سریع</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
