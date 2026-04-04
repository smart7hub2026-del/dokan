/**
 * چک‌لیست عملی امنیت و زیرساخت — برای مدیر فروشگاه و تیم میزبان.
 * بخشی از وضعیت (HTTPS مرورگر، 2FA) در UI از محیط فعلی محاسبه می‌شود.
 */
export type OperationalCheckAutoStatus = 'https' | 'twoFactor';

export type OperationalCheckLink = {
  label: string;
  /** مسیر داخلی یا هش داخل همان صفحه (مثلاً #security-password) */
  to: string;
};

export type OperationalSecurityItem = {
  id: string;
  title: string;
  description: string;
  autoStatus?: OperationalCheckAutoStatus;
  links?: OperationalCheckLink[];
};

export const OPERATIONAL_SECURITY_CHECKLIST: OperationalSecurityItem[] = [
  {
    id: 'https',
    title: 'HTTPS روی دامنهٔ اصلی',
    description:
      'فرانت و API روی HTTPS سرو شوند؛ کوکی و توکن احراز هویت روی HTTP ارسال نشود. در production، اگر پروکسی هدر x-forwarded-proto را درست بفرستد، درخواست‌های صریح HTTP به API رد می‌شوند.',
    autoStatus: 'https',
  },
  {
    id: 'passwords',
    title: 'رمزهای قوی و عدم اشتراک حساب',
    description:
      'برای ادمین پلتفرم و مدیر هر فروشگاه رمز قوی تعریف کنید؛ از یک حساب مشترک برای چند نفر پرهیز کنید و نقش‌ها را در بخش کاربران جدا نگه دارید.',
    links: [{ label: 'تغییر رمز در همین صفحه', to: '#security-password' }],
  },
  {
    id: 'backup',
    title: 'بکاپ منظم دیتابیس و تست بازیابی',
    description:
      'خروجی پشتیبان را دوره‌ای بگیرید؛ زمان‌بندی و نگهداری چند نسخه روی میزبان اختصاصی را پیکربندی کنید و حداقل یک بار بازیابی را آزمایش کنید.',
    links: [{ label: 'تب پشتیبان در تنظیمات', to: '/settings?section=backup' }],
  },
  {
    id: 'secrets',
    title: 'رازها فقط در محیط اجرا (env)',
    description:
      'کلید API، رشتهٔ اتصال دیتابیس، رمز رمزنگاری بکاپ و هر راز دیگر در مخزن کد یا باندل فرانت قرار نگیرد؛ فقط در متغیرهای محیطی سرور یا سکوی میزبانی تنظیم شود.',
  },
  {
    id: 'tenant',
    title: 'جداسازی دادهٔ مستأجرها و دسترسی API',
    description:
      'هر درخواست باید با shopId/tenant درست و نقش مناسب اعتبارسنجی شود؛ دوره‌ای نقش‌ها و مسیرهای حساس API را مرور کنید.',
    links: [{ label: 'معماری و امنیت', to: '/architecture' }],
  },
  {
    id: 'two-factor-logs',
    title: '۲FA و لاگ رویدادهای امنیتی',
    description:
      'در صورت امکان احراز دو مرحله‌ای را برای حساس‌ترین حساب‌ها فعال کنید؛ رویدادهای مهم (ورود ناموفق، تغییر رمز، بکاپ) در سطح سرور لاگ و نگه‌داری شوند.',
    autoStatus: 'twoFactor',
    links: [{ label: 'فعال‌سازی ۲FA', to: '#security-2fa' }],
  },
  {
    id: 'deps-transparency',
    title: 'وابستگی‌ها و هم‌راستایی با شفافیت',
    description:
      'وابستگی‌های npm را به‌روز نگه دارید و با ابزارهای امنیتی (مثلاً npm audit) بررسی کنید؛ یک بار فهرست شفافیت پایین همین صفحه را با وضعیت واقعی سرور تطبیق دهید.',
    links: [{ label: 'بخش شفافیت معماری', to: '#security-transparency' }],
  },
];
