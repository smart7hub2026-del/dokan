/**
 * لوگوی برند دکان‌یار — از public/brand-logo.png (پس‌زمینه هماهنگ با تم تیره سایت)
 */
const src = `${import.meta.env.BASE_URL}brand-logo.png`;

type Props = {
  size?: number;
  className?: string;
  /** برای هدر روشن: حلقه کمی پررنگ‌تر */
  variant?: 'default' | 'header';
};

export default function BrandLogo({ size = 48, className = '', variant = 'default' }: Props) {
  const ring = variant === 'header' ? 'ring-1 ring-white/20 shadow-md shadow-black/30' : 'ring-1 ring-white/10';
  return (
    <img
      src={src}
      alt="دکان یار"
      width={size}
      height={size}
      draggable={false}
      className={`shrink-0 rounded-2xl bg-[#0f172a] object-cover ${ring} ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
