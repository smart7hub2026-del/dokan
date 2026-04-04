/** آیکن Lucide — باید در WelcomePage در ONBOARDING_LUCIDE ثبت شود */
export type OnboardingLucideIconName =
  | 'ShoppingCart'
  | 'BookOpen'
  | 'Pill'
  | 'Smartphone'
  | 'UtensilsCrossed'
  | 'Gem'
  | 'Shirt'
  | 'Refrigerator'
  | 'BrickWall'
  | 'Car'
  | 'Croissant';

export type OnboardingBusinessTypeId = string;

export type OnboardingBusinessTypeDef = {
  id: OnboardingBusinessTypeId;
  lucideIcon: OnboardingLucideIconName;
  isActive: boolean;
  /** ثبت‌نام پولی / انتخاب در فرم — همه true */
  titleFa: string;
  titleEn: string;
  accent: string;
  /** صنوفی با ثبت‌نام آزمایشی ۳ روزه و دیتابیس دمو (برچسب «دمو ۳ روز» در UI) */
  demoDatabaseEnabled?: boolean;
  /** تصویر بالای کارت انتخاب صنف (ثبت‌نام / دمو) */
  cardCoverImage?: string;
};

export const ONBOARDING_BUSINESS_TYPES: OnboardingBusinessTypeDef[] = [
  {
    id: 'supermarket',
    lucideIcon: 'ShoppingCart',
    isActive: true,
    demoDatabaseEnabled: true,
    titleFa: 'فروشگاه عمومی',
    titleEn: 'General retail',
    accent: 'from-emerald-600/90 to-teal-900/90',
    cardCoverImage:
      'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'bookstore',
    lucideIcon: 'BookOpen',
    isActive: true,
    /** دیتابیس جدا: فقط جدول books — بدون مخلوط با products */
    demoDatabaseEnabled: true,
    titleFa: 'کتابفروشی',
    titleEn: 'Bookstore',
    accent: 'from-indigo-600/90 to-slate-900/90',
    cardCoverImage:
      'https://images.unsplash.com/photo-1524995997946-a7c3e46b3170?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'pharmacy',
    lucideIcon: 'Pill',
    isActive: false,
    titleFa: 'داروخانه',
    titleEn: 'Pharmacy',
    accent: 'from-cyan-600/90 to-blue-950/90',
  },
  {
    id: 'mobile_accessories',
    lucideIcon: 'Smartphone',
    isActive: false,
    titleFa: 'موبایل و لوازم جانبی',
    titleEn: 'Mobile & accessories',
    accent: 'from-violet-600/90 to-indigo-950/90',
  },
  {
    id: 'restaurant',
    lucideIcon: 'UtensilsCrossed',
    isActive: false,
    titleFa: 'رستوران و فست‌فود',
    titleEn: 'Restaurant & fast food',
    accent: 'from-orange-600/90 to-red-950/90',
  },
  {
    id: 'gold_jewelry',
    lucideIcon: 'Gem',
    isActive: true,
    demoDatabaseEnabled: true,
    titleFa: 'زرگری و طلا',
    titleEn: 'Gold & jewelry',
    accent: 'from-amber-500/90 to-yellow-950/90',
    cardCoverImage:
      'https://images.unsplash.com/photo-1515562141207-7a88e7f0496b?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'clothing',
    lucideIcon: 'Shirt',
    isActive: false,
    titleFa: 'پوشاک',
    titleEn: 'Clothing',
    accent: 'from-rose-600/90 to-fuchsia-950/90',
  },
  {
    id: 'home_appliances',
    lucideIcon: 'Refrigerator',
    isActive: false,
    titleFa: 'لوازم خانگی',
    titleEn: 'Home appliances',
    accent: 'from-sky-600/90 to-blue-950/90',
  },
  {
    id: 'hardware_building',
    lucideIcon: 'BrickWall',
    isActive: false,
    titleFa: 'آهن‌فروشی و مصالح ساختمانی',
    titleEn: 'Hardware & building materials',
    accent: 'from-stone-600/90 to-neutral-950/90',
  },
  {
    id: 'auto_parts',
    lucideIcon: 'Car',
    isActive: false,
    titleFa: 'لوازم موتر و لوازم یدکی',
    titleEn: 'Auto parts',
    accent: 'from-slate-700/90 to-slate-950/90',
  },
  {
    id: 'bakery',
    lucideIcon: 'Croissant',
    isActive: false,
    titleFa: 'نانوایی و شیرینی',
    titleEn: 'Bakery & confectionery',
    accent: 'from-amber-500/90 to-orange-900/90',
  },
];

export const DEFAULT_BUSINESS_TYPE: OnboardingBusinessTypeId = 'supermarket';

export const ACTIVE_BUSINESS_TYPE_IDS = new Set<OnboardingBusinessTypeId>(
  ONBOARDING_BUSINESS_TYPES.filter((b) => b.isActive).map((b) => b.id)
);

/** صنوفی که ثبت‌نام آزمایشی با دیتابیس برایشان فعال است */
export const DEMO_DATABASE_BUSINESS_TYPE_IDS = new Set<OnboardingBusinessTypeId>(
  ONBOARDING_BUSINESS_TYPES.filter((b) => b.demoDatabaseEnabled).map((b) => b.id)
);
