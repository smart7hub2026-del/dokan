/** تصاویر پس‌زمینهٔ احراز هویت — ترجیحاً انتزاعی/فناوری برای خوانایی متن */
export type PremiumAuthScene =
  | 'landing'
  | 'info'
  | 'creator'
  | 'login'
  | 'register'
  | 'payment-pending'
  | 'demo-limit';

export const SCENE_IMAGES: Record<PremiumAuthScene, string> = {
  landing:
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1920&auto=format&fit=crop',
  info: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1920&auto=format&fit=crop',
  creator: 'https://images.unsplash.com/photo-1542744095-fcf48d80b0fd?q=80&w=1920&auto=format&fit=crop',
  login:
    'https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=1920&auto=format&fit=crop',
  register:
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1920&auto=format&fit=crop',
  'payment-pending':
    'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=1920&auto=format&fit=crop',
  'demo-limit':
    'https://images.unsplash.com/photo-1556741533-f6acd647d2fb?q=80&w=1920&auto=format&fit=crop',
};

/** تصویر ثابت هر صحنهٔ کارت هرو — خرده‌فروشی، فروشگاه، کسب‌وکار، پرداخت (Unsplash) */
export const AUTH_HERO_SCENE_IMAGES: Record<
  'default' | 'login' | 'plan' | 'shop' | 'business' | 'payment',
  string
> = {
  default:
    'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=1200&auto=format&fit=crop',
  login:
    'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=1200&auto=format&fit=crop',
  plan: 'https://images.unsplash.com/photo-1556745757-8d76bdb6984b?q=80&w=1200&auto=format&fit=crop',
  shop: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1200&auto=format&fit=crop',
  business:
    'https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=1200&auto=format&fit=crop',
  payment:
    'https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=1200&auto=format&fit=crop',
};
