import AuthHeroVideoCard, { type AuthHeroScene } from './AuthHeroVideoCard';

/** کلاژ بصری: طلا/خرده‌فروشی، کتابفروشی، فروشگاه، داشبورد — بدون متن روی کارت */
const ROADMAP_IMAGES: string[] = [
  'https://images.unsplash.com/photo-1515562141207-7a88e7f0496b?q=80&w=900&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1524995997946-a7c3e46b3170?q=80&w=900&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1604719314766-6043e2d7d700?q=80&w=900&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=900&auto=format&fit=crop',
];

type Props = {
  className?: string;
  /** نسخهٔ باریک موبایل مرحلهٔ ۲ */
  compact?: boolean;
  heroScene?: AuthHeroScene;
};

/**
 * کارت هروی ورود: کلاژ تصویر + لایهٔ آیکون/متن AuthHero (بدون تصویر پس‌زمینهٔ تکراری).
 */
export default function LoginRoadmapHero({ className = '', compact = false, heroScene = 'login' }: Props) {
  const gap = compact ? 'gap-0.5 p-0.5 sm:gap-1 sm:p-1' : 'gap-1 p-1 sm:gap-1.5 sm:p-2';
  const innerR = compact ? 'rounded-xl sm:rounded-2xl' : 'rounded-[1.15rem] sm:rounded-[1.35rem]';

  return (
    <div
      className={`relative overflow-hidden rounded-[2rem] border border-white/[0.12] bg-slate-950 shadow-[0_40px_100px_-24px_rgba(0,0,0,0.85)] ${className}`}
    >
      <div className={`absolute inset-0 grid grid-cols-2 grid-rows-2 ${gap}`} aria-hidden>
        {ROADMAP_IMAGES.map((src, i) => (
          <div key={i} className={`relative min-h-0 overflow-hidden ${innerR}`}>
            <img
              src={src}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-[0.82]"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/25 via-transparent to-violet-900/35" />
          </div>
        ))}
      </div>
      <div className="relative z-[1] min-h-[inherit] h-full w-full">
        <AuthHeroVideoCard
          scene={heroScene}
          hideCaption
          useSceneBackdrop={false}
          className="min-h-[inherit] h-full w-full !rounded-none border-0 !bg-slate-950/40 !shadow-none backdrop-blur-[1px]"
        />
      </div>
    </div>
  );
}
