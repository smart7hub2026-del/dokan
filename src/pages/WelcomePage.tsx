import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronRight, ChevronLeft, Check, Phone, Mail,
  Globe, ArrowRight, X, Eye, EyeOff,
  Smartphone, CheckCircle, Lock,
  AlertTriangle,
  CreditCard, Banknote, LogIn, Crown,
  Facebook, Shield, ArrowRightLeft, Wallet, Github, Linkedin, Instagram,
  Gem, Shirt, ShoppingCart, Pill, UtensilsCrossed, Refrigerator,
  Croissant, Car, BrickWall, BookOpen,
  LifeBuoy, KeyRound, Headphones,
  type LucideIcon,
} from 'lucide-react';
import creatorConfig from '../config/creator.json';
import { apiInitHesabPay, apiRegisterPayment, apiCheckShop, apiGetPublicMeta, type ShopRole } from '../services/api';
import { useApp } from '../context/AppContext';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import ShopGateModal from '../components/ShopGateModal';
import WelcomeDownloadPage from '../components/WelcomeDownloadPage';
import BrandLogo from '../components/BrandLogo';
import AuthPremiumBackground from '../components/auth/AuthPremiumBackground';
import AuthHeroVideoCard from '../components/auth/AuthHeroVideoCard';
import LoginRoadmapHero from '../components/auth/LoginRoadmapHero';
import {
  ONBOARDING_BUSINESS_TYPES,
  DEFAULT_BUSINESS_TYPE,
  ACTIVE_BUSINESS_TYPE_IDS,
  DEMO_DATABASE_BUSINESS_TYPE_IDS,
  type OnboardingBusinessTypeId,
  type OnboardingLucideIconName,
} from '../data/onboardingBusinessTypes';
import ReCAPTCHA from 'react-google-recaptcha';
import { validatePasswordPolicy } from '../utils/passwordPolicy';

const ONBOARDING_LUCIDE: Record<OnboardingLucideIconName, LucideIcon> = {
  ShoppingCart,
  BookOpen,
  Pill,
  Smartphone,
  UtensilsCrossed,
  Gem,
  Shirt,
  Refrigerator,
  BrickWall,
  Car,
  Croissant,
};

type ViewType = 'landing' | 'download' | 'login' | 'register' | 'info' | 'payment-pending' | 'demo-limit' | 'demo-register';

interface WelcomePageProps {
  onLogin: (
    shopCode: string,
    shopPassword: string,
    role: string,
    rolePassword: string,
    captchaToken?: string,
    deviceName?: string,
    loginUsername?: string
  ) => boolean | Promise<{ ok: boolean; message?: string; code?: string; twoFactorRequired?: boolean; pendingToken?: string }>;
  onGoogleLogin: (email: string, fullName: string, deviceName?: string) => Promise<{ ok: boolean; message?: string; code?: string }>;
  onDemoLogin: (payload: {
    mode?: 'register' | 'login';
    phone?: string;
    password?: string;
    name?: string;
    familyName?: string;
    email?: string;
    idToken?: string;
    businessType?: string;
    captchaToken?: string;
    deviceName?: string;
  }) => Promise<
    | { ok: true }
    | {
        ok: true;
        registered: true;
        shopCode: string;
        shopPassword: string;
        adminFullName: string;
        adminUsername?: string;
        adminRoleTitle: string;
        adminRolePassword: string;
        message?: string;
      }
    | { ok: false; message?: string; code?: string }
  >;
  onTwoFactorVerify: (pendingToken: string, totpCode: string) => Promise<{ ok: boolean; message?: string; code?: string }>;
  /** باز کردن مستقیم از مسیرهای `/login` یا `/register` */
  initialAuthView?: ViewType | 'creator';
}

const REMEMBER_SHOP_CODE_KEY = 'dokanyar_remember_shop_code';
const REMEMBER_SHOP_PASSWORD_KEY = 'dokanyar_remember_shop_password';
const REMEMBER_LOGIN_USERNAME_KEY = 'dokanyar_remember_login_username';
const RECAPTCHA_SITE_KEY = String(import.meta.env.VITE_RECAPTCHA_SITE_KEY || '').trim();

function isPwaStandaloneClient(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
    if ((window.navigator as Navigator & { standalone?: boolean }).standalone) return true;
  } catch {
    /* ignore */
  }
  return false;
}

function formatAuthClientError(err: unknown): string {
  const e = err as Error & { status?: number; code?: string };
  const msg = (e?.message || '').trim();
  if (e.status === 429 || e.code === 'RATE_LIMITED') {
    return msg || 'تعداد درخواست بیش از حد است؛ کمی صبر کنید و دوباره تلاش کنید.';
  }
  return msg || 'خطا در ارتباط با سرور';
}

function normalizeLoginUsernameKey(s: string) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-')
    .replace(/_/g, '-');
}

const PAYMENT_INFO: Record<string, { image: string; description: string; steps: string[] }> = {
  bank_transfer: {
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=1200&auto=format&fit=crop',
    description: 'حواله بانکی امن‌ترین و رسمی‌ترین روش انتقال وجه در افغانستان است. از طریق شعب بانک‌های معتبر مانند بانک ملت، بانک کابل، آریانا بانک، یا صرافی‌های مجاز می‌توانید مبلغ را مستقیم به حساب دکان‌یار واریز کنید. این روش برای مبالغ بالا مطمئن‌ترین گزینه است.',
    steps: ['به نزدیک‌ترین شعبه بانک یا صرافی مجاز مراجعه کنید', 'شماره حساب دکان‌یار را به تلر ارائه دهید', 'مبلغ طرح انتخابی را واریز کنید', 'شماره رسید یا حواله را عکس بگیرید', 'شماره حواله و نام بانک را در فرم زیر وارد کنید'],
  },
  mpaisa: {
    image: 'https://images.unsplash.com/photo-1556741533-6e6a62bd8b49?q=80&w=1200&auto=format&fit=crop',
    description: 'M-Paisa نخستین و پرکاربردترین سرویس پرداخت موبایلی افغانستان است که توسط شرکت Roshan Telecom ارائه می‌شود. این سرویس به بیش از ۵ میلیون کاربر در سراسر کشور خدمات می‌دهد و بدون نیاز به حساب بانکی، تنها با یک خط Roshan قابل استفاده است. از طریق کد USSD *222# یا اپلیکیشن می‌توانید پرداخت کنید.',
    steps: ['کد *۲۲۲# را شماره‌گیری کنید یا اپ M-Paisa را باز کنید', 'گزینه «ارسال پول» یا Send Money را انتخاب کنید', 'شماره موبایل دکان‌یار (۰۷۹۵۰۷۴۱۷۵) را وارد کنید', 'مبلغ طرح را وارد و PIN خود را تأیید کنید', 'شماره مرجع (REF) تراکنش را در فرم وارد کنید'],
  },
  mhawala: {
    image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=1200&auto=format&fit=crop',
    description: 'M-Hawala سرویس حواله و انتقال موبایلی Etisalat Afghanistan (MTN) است که در بیشتر ولایات افغانستان در دسترس است. این سرویس با پوشش گسترده و کارمزد کم، یکی از محبوب‌ترین روش‌های انتقال وجه در مناطق دور از بانک است و هر مشترک Etisalat بدون ثبت‌نام جداگانه می‌تواند از آن استفاده کند.',
    steps: ['کد *888# را شماره‌گیری کنید یا اپ Etisalat را باز کنید', 'گزینه M-Hawala و سپس «ارسال پول» را انتخاب کنید', 'شماره دریافت‌کننده (۰۷۹۵۰۷۴۱۷۵) را وارد کنید', 'مبلغ را وارد کنید و با PIN تأیید کنید', 'کد رسید را در فرم زیر وارد نمایید'],
  },
  mymoney: {
    image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=1200&auto=format&fit=crop',
    description: 'MyMoney کیف پول دیجیتال شرکت AWCC (Afghan Wireless Communication Company) است. AWCC با بیش از ۶ میلیون مشترک، دومین اپراتور بزرگ افغانستان است. سرویس MyMoney امکان خرید آنلاین، پرداخت قبوض، انتقال پول فوری و دریافت حقوق را فراهم می‌کند و در شهرهای بزرگ کابل، هرات و مزارشریف بسیار رایج است.',
    steps: ['اپ MyMoney را دانلود و وارد حساب خود شوید', 'از منوی اصلی گزینه «انتقال پول» را بزنید', 'شماره AWCC دکان‌یار را وارد کنید', 'مبلغ طرح را وارد و تأیید کنید', 'شماره مرجع تراکنش را یادداشت و در فرم وارد کنید'],
  },
  atoma_pay: {
    image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=80&w=1200&auto=format&fit=crop',
    description: 'ATOMA Pay پلتفرم نوین پرداخت دیجیتال افغانستان است که با هدف ساده‌سازی معاملات تجاری آنلاین طراحی شده. این سرویس از کارت‌های بانکی، کیف پول‌های موبایلی و کیف پول داخلی ATOMA پشتیبانی می‌کند. مناسب برای کسب‌وکارهایی که به تجارت آنلاین روی آورده‌اند و دنبال راهکار پرداخت سریع و ایمن هستند.',
    steps: ['در سایت atoma.af ثبت‌نام یا وارد حساب خود شوید', 'کیف پول را به اندازه کافی شارژ کنید', 'گزینه «انتقال به تجار» را انتخاب کنید', 'شناسه دکان‌یار (DOKANYAR) را وارد کنید', 'کد تأیید پرداخت را در فرم زیر وارد نمایید'],
  },
  hesabpay: {
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1200&auto=format&fit=crop',
    description: 'HesabPay (hesab.com) پیشرفته‌ترین درگاه پرداخت دیجیتال افغانستان است که توسط شرکت Hesab ارائه می‌شود. این درگاه از تأیید خودکار پرداخت از طریق API و Webhook پشتیبانی می‌کند، یعنی پس از پرداخت، حساب شما بلافاصله و بدون انتظار برای تأیید دستی فعال می‌شود. مناسب برای کاربرانی که به پرداخت فوری و بدون دردسر اهمیت می‌دهند.',
    steps: ['روی دکمه «ثبت و پرداخت» در پایین فرم کلیک کنید', 'به درگاه امن HesabPay هدایت خواهید شد', 'روش پرداخت دلخواه خود را در HesabPay انتخاب کنید', 'پرداخت را تأیید کنید — حساب شما فوری فعال می‌شود'],
  },
  other_try: {
    image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?q=80&w=1200&auto=format&fit=crop',
    description:
      'مسیر پیش‌فرض: واتساپ و حواله‌های داخلی. با شمارهٔ ۰۷۹۵۰۷۴۱۷۵ در واتساپ یا تماس بگیرید؛ برای حواله به حساب یا صرافی، زمان واریز را با همان خط هماهنگ کنید. تیم پشتیبانی در صورت نیاز مسیر دقیق را برای منطقهٔ شما توضیح می‌دهد.',
    steps: [
      'واتساپ به ۰۷۹۵۰۷۴۱۷۵ — نام طرح و نام فروشگاه را بفرستید',
      'در صورت حوالهٔ داخلی، مبلغ و رسید را نگه دارید',
      'راهنمایی شمارهٔ مقصد یا صرافی را از پشتیبانی بگیرید',
      'پس از واریز، در کارت «جزئیات تراکنش» اطلاعات را تکمیل کنید',
    ],
  },
};

const WelcomePage: React.FC<WelcomePageProps> = ({ onLogin, onGoogleLogin, onDemoLogin, onTwoFactorVerify, initialAuthView }) => {
  const { t, isOnline } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [suspendedGate, setSuspendedGate] = useState<{ open: boolean; message?: string }>({ open: false });
  const [view, setView] = useState<ViewType | 'creator'>(() => {
    if (initialAuthView === 'login') return 'login';
    if (initialAuthView === 'register') return 'register';
    if (typeof window !== 'undefined' && isPwaStandaloneClient()) return 'login';
    return 'landing';
  });
  const [registerStep, setRegisterStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  useEffect(() => {
    if (searchParams.get('renew') === '1') {
      setView('register');
      setRegisterStep(1);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const [trialQuickSignup, setTrialQuickSignup] = useState(true);
  useEffect(() => {
    let alive = true;
    void apiGetPublicMeta().then((m) => {
      if (alive) setTrialQuickSignup(Boolean(m.trial_quick_signup_enabled));
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (view === 'demo-register' && !trialQuickSignup) {
      setView('register');
      setRegisterStep(1);
      setDemoError('');
    }
  }, [view, trialQuickSignup]);

  // Demo register / login (موبایل + رمز، بدون کد پیامک)
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState('');
  const [demoPhone, setDemoPhone] = useState('');
  const [demoPassword, setDemoPassword] = useState('');
  const [demoPassword2, setDemoPassword2] = useState('');
  const [demoName, setDemoName] = useState('');
  const [demoFamily, setDemoFamily] = useState('');
  const [demoOptionalEmail, setDemoOptionalEmail] = useState('');
  const [showDemoPwd, setShowDemoPwd] = useState(false);
  const [demoRegisterCredentials, setDemoRegisterCredentials] = useState<null | {
    shopCode: string;
    shopPassword: string;
    adminFullName: string;
    adminUsername: string;
    adminRoleTitle: string;
    adminRolePassword: string;
  }>(null);
  const [demoRegPhase, setDemoRegPhase] = useState<'form' | 'business'>('form');
  const [demoBusinessType, setDemoBusinessType] = useState<OnboardingBusinessTypeId>(DEFAULT_BUSINESS_TYPE);

  const validateDemoFormFields = () => {
    const phone = demoPhone.replace(/\D/g, '');
    if (phone.length < 9) {
      setDemoError('شماره موبایل را درست وارد کنید (حداقل ۹ رقم)');
      return false;
    }
    const demoPassErr = validatePasswordPolicy(demoPassword);
    if (demoPassErr) {
      setDemoError(demoPassErr);
      return false;
    }
    if (!demoName.trim() || !demoFamily.trim()) {
      setDemoError('نام و نام خانوادگی الزامی است');
      return false;
    }
    if (demoPassword !== demoPassword2) {
      setDemoError('تکرار رمز با رمز اول یکسان نیست');
      return false;
    }
    return true;
  };

  const goDemoBusinessStep = () => {
    setDemoError('');
    if (!validateDemoFormFields()) return;
    setDemoRegPhase('business');
  };

  const handleDemoRegisterApi = async () => {
    setDemoError('');
    if (!DEMO_DATABASE_BUSINESS_TYPE_IDS.has(demoBusinessType)) {
      setDemoError(
        'ثبت‌نام آزمایشی با دیتابیس فقط برای صنوفی است که برچسب «دمو ۳ روز» دارند؛ بقیه از طرح‌های پولی.',
      );
      return;
    }
    if (!validateDemoFormFields()) {
      setDemoRegPhase('form');
      return;
    }
    if (RECAPTCHA_SITE_KEY && !demoCaptchaToken) {
      setDemoError('لطفاً کپچا را تکمیل کنید');
      return;
    }
    const phone = demoPhone.replace(/\D/g, '');
    setIsDemoLoading(true);
    try {
      const payload = {
        mode: 'register' as const,
        phone,
        password: demoPassword,
        name: demoName.trim(),
        familyName: demoFamily.trim(),
        businessType: demoBusinessType,
        captchaToken: demoCaptchaToken || undefined,
        deviceName: deviceNameInput || undefined,
        ...(demoOptionalEmail.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(demoOptionalEmail.trim())
          ? { email: demoOptionalEmail.trim().toLowerCase() }
          : {}),
      };
      const res = await onDemoLogin(payload);
      if (res.ok && 'registered' in res && res.registered) {
        setDemoRegisterCredentials({
          shopCode: res.shopCode,
          shopPassword: res.shopPassword,
          adminFullName: res.adminFullName,
          adminUsername: res.adminUsername ?? `admin-${String(res.shopCode).toLowerCase()}`,
          adminRoleTitle: res.adminRoleTitle,
          adminRolePassword: res.adminRolePassword,
        });
        setDemoRegPhase('form');
        return;
      }
      if (!res.ok) {
        if (res.code === 'SHOP_SUSPENDED') {
          setSuspendedGate({ open: true, message: res.message });
        } else {
          setDemoError(res.message || 'خطا در ثبت‌نام');
        }
      }
    } catch (e: unknown) {
      setDemoError(formatAuthClientError(e));
    } finally {
      setIsDemoLoading(false);
    }
  };

  // Login state
  const [selectedRole, setSelectedRole] = useState('admin');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Two-step login state
  const [loginStep, setLoginStep] = useState<1 | 2>(1);
  const [shopCodeInput, setShopCodeInput] = useState('');
  const [shopPassInput, setShopPassInput] = useState('');
  /** نام کاربری انگلیسی — در مرحلهٔ ۲ ورود وارد و تأیید می‌شود */
  const [loginUsernameInput, setLoginUsernameInput] = useState('');
  const [rolePassInput, setRolePassInput] = useState('');
  /** نقش‌های فعال فروشگاه پس از check-shop — تا قبل از تطبیق نام کاربری در مرحلهٔ ۲ */
  const [loginShopRolesPool, setLoginShopRolesPool] = useState<ShopRole[]>([]);
  const [loginStep2UsernameOk, setLoginStep2UsernameOk] = useState(false);
  const [loginCaptchaToken, setLoginCaptchaToken] = useState('');
  const [demoCaptchaToken, setDemoCaptchaToken] = useState('');
  const loginCaptchaRef = useRef<ReCAPTCHA | null>(null);
  const demoCaptchaRef = useRef<ReCAPTCHA | null>(null);
  const [shopRolesResult, setShopRolesResult] = useState<ShopRole[]>([]);
  /** عنوان نقش مدیر از تنظیمات دکان — بعد از check-shop پر می‌شود */
  const [adminRoleTitleFromShop, setAdminRoleTitleFromShop] = useState('admin');
  const [shopNameResult, setShopNameResult] = useState('');
  const [isCheckingShop, setIsCheckingShop] = useState(false);
  const [checkShopError, setCheckShopError] = useState('');
  const [showRolePassInput, setShowRolePassInput] = useState(false);
  const [deviceNameInput, setDeviceNameInput] = useState(() => {
    if (typeof window === 'undefined') return '';
    const ua = String(window.navigator.userAgent || '').toLowerCase();
    if (ua.includes('iphone')) return 'My iPhone';
    if (ua.includes('android')) return 'My Android';
    if (ua.includes('windows')) return 'Office Laptop';
    if (ua.includes('mac')) return 'My Mac';
    return '';
  });
  const [rememberShopCode, setRememberShopCode] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  /** پیش‌پر کد دکان از query: ?shop= یا ?shopCode= (مثلاً لینک از پشتیبانی) */
  useEffect(() => {
    if (view !== 'login') return;
    const q = searchParams.get('shop') || searchParams.get('shopCode');
    if (!q?.trim()) return;
    setShopCodeInput((prev) => {
      const next = q.trim().toUpperCase();
      if (prev.trim().toUpperCase() === next) return prev;
      return next;
    });
  }, [view, searchParams]);

  useEffect(() => {
    if (view !== 'login') return;
    setAdminRoleTitleFromShop('admin');
    try {
      const c = localStorage.getItem(REMEMBER_SHOP_CODE_KEY);
      const p = localStorage.getItem(REMEMBER_SHOP_PASSWORD_KEY);
      if (c) {
        setShopCodeInput((prev) => (prev.trim() ? prev : c));
        setRememberShopCode(true);
      }
      if (p && c) {
        setShopPassInput((prev) => (prev.trim() ? prev : p));
      }
      const u = localStorage.getItem(REMEMBER_LOGIN_USERNAME_KEY);
      if (u) setLoginUsernameInput((prev) => (prev.trim() ? prev : u));
    } catch {
      /* ignore */
    }
  }, [view]);

  /** با تیک «مرا به خاطر بسپار»، کد و رمز فروشگاه در localStorage نگه داشته می‌شود */
  useEffect(() => {
    if (view !== 'login' || !rememberShopCode) return;
    const t = window.setTimeout(() => {
      try {
        const code = shopCodeInput.trim();
        if (code) localStorage.setItem(REMEMBER_SHOP_CODE_KEY, code.toUpperCase());
        if (shopPassInput) localStorage.setItem(REMEMBER_SHOP_PASSWORD_KEY, shopPassInput);
        const lu = loginUsernameInput.trim();
        if (lu) localStorage.setItem(REMEMBER_LOGIN_USERNAME_KEY, lu);
      } catch {
        /* ignore */
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, [view, rememberShopCode, shopCodeInput, shopPassInput, loginUsernameInput]);

  /** PWA نصب‌شده: مستقیم ورود؛ اگر کد/رمز فروشگاه ذخیره شده، از مرحلهٔ رمز نقش شروع شود (مناسب آفلاین نسبی) */
  useEffect(() => {
    if (view !== 'login') return;
    if (!isPwaStandaloneClient()) return;
    try {
      const c = localStorage.getItem(REMEMBER_SHOP_CODE_KEY);
      const p = localStorage.getItem(REMEMBER_SHOP_PASSWORD_KEY);
      if (c && p) {
        setLoginStep(2);
        setShopNameResult((prev) => (prev.trim() ? prev : `فروشگاه ${c}`));
      }
    } catch {
      /* ignore */
    }
  }, [view]);

  const handleCheckShop = async () => {
    if (!shopCodeInput.trim() || !shopPassInput.trim()) {
      setCheckShopError('کد فروشگاه و رمز عبور الزامی است');
      return;
    }
    setCheckShopError('');
    setIsCheckingShop(true);
    try {
      const res = await apiCheckShop(shopCodeInput.trim(), shopPassInput.trim());
      const step1CodeUpper = shopCodeInput.trim().toUpperCase();
      const rolesForUi =
        step1CodeUpper === 'SUPERADMIN'
          ? res.roles.filter((r) => r.role === 'super_admin')
          : res.roles.filter((r) => r.role !== 'super_admin');
      setShopNameResult(res.shopName);
      setAdminRoleTitleFromShop(String(res.admin_role_name || 'admin').trim() || 'admin');

      const normalizedCode = shopCodeInput.trim().toUpperCase();
      try {
        if (rememberShopCode) {
          localStorage.setItem(REMEMBER_SHOP_CODE_KEY, normalizedCode);
          localStorage.setItem(REMEMBER_SHOP_PASSWORD_KEY, shopPassInput.trim());
        } else {
          localStorage.removeItem(REMEMBER_SHOP_CODE_KEY);
          localStorage.removeItem(REMEMBER_SHOP_PASSWORD_KEY);
          localStorage.removeItem(REMEMBER_LOGIN_USERNAME_KEY);
        }
      } catch {
        /* ignore */
      }

      if (rolesForUi.length === 0) {
        setCheckShopError(
          'هیچ کاربر فعالی برای این فروشگاه ثبت نشده. مدیر دکان از تنظیمات → کاربران فروشگاه، نقش‌ها را فعال کند و برای هر نقش رمز تعیین کند.',
        );
        return;
      }

      setLoginShopRolesPool(rolesForUi);
      setLoginError('');
      setRolePassInput('');

      if (step1CodeUpper === 'SUPERADMIN') {
        const superRow = rolesForUi.find((r) => r.role === 'super_admin');
        if (!superRow) {
          setCheckShopError('کاربر ابرادمین فعال برای این دکان یافت نشد.');
          return;
        }
        const un = (String(superRow.username || 'superadmin').trim() || 'superadmin');
        setLoginUsernameInput(un);
        setShopRolesResult([superRow]);
        setSelectedRole('super_admin');
        setLoginStep2UsernameOk(true);
        try {
          if (rememberShopCode) {
            localStorage.setItem(REMEMBER_LOGIN_USERNAME_KEY, un);
          }
        } catch {
          /* ignore */
        }
      } else {
        setShopRolesResult([]);
        setLoginStep2UsernameOk(false);
      }

      setLoginStep(2);
    } catch (err: unknown) {
      const e = err as Error & { code?: string };
      if (e.code === 'SHOP_SUSPENDED') {
        setSuspendedGate({ open: true, message: e.message });
      } else {
        setCheckShopError(formatAuthClientError(err));
      }
    } finally {
      setIsCheckingShop(false);
    }
  };

  const handleConfirmStep2Username = () => {
    setLoginError('');
    const uRaw = loginUsernameInput.trim();
    if (!uRaw) {
      setLoginError('نام نقش (نام کاربری انگلیسی) الزامی است');
      return;
    }
    if (!/^[a-zA-Z0-9@._-]{2,80}$/.test(uRaw)) {
      setLoginError('نام نقش: فقط حروف انگلیسی، اعداد و . _ - @ (۲ تا ۸۰ کاراکتر).');
      return;
    }
    const lu = normalizeLoginUsernameKey(uRaw);
    const codeUpper = shopCodeInput.trim().toUpperCase();
    const matches = loginShopRolesPool.filter((r) => {
      const un = normalizeLoginUsernameKey(r.username || '');
      if (un && un === lu) return true;
      if (r.role === 'admin') {
        const alias = normalizeLoginUsernameKey(`admin-${codeUpper.toLowerCase()}`);
        if (lu === alias) return true;
      }
      if (r.role === 'super_admin' && lu === 'superadmin') return true;
      return false;
    });
    if (matches.length === 0) {
      setLoginError(
        'این نام نقش با هیچ نقش فعال این فروشگاه مطابقت ندارد. نام کاربری هر نقش در تنظیمات → کاربران فروشگاه (و در پنل ادمین برای هر دکان) ثبت شده است.',
      );
      return;
    }
    const picked = matches[0];
    setShopRolesResult([picked]);
    setSelectedRole(picked.role);
    setLoginStep2UsernameOk(true);
    try {
      if (rememberShopCode) {
        localStorage.setItem(REMEMBER_LOGIN_USERNAME_KEY, uRaw);
      }
    } catch {
      /* ignore */
    }
  };

  const handleRoleLogin = async () => {
    setLoginError('');
    setIsLoggingIn(true);
    try {
      if (!loginStep2UsernameOk || shopRolesResult.length === 0) {
        setLoginError('ابتدا نام نقش را در همین صفحه تأیید کنید');
        return;
      }
      if (RECAPTCHA_SITE_KEY && !loginCaptchaToken) {
        setLoginError('لطفاً کپچا را تکمیل کنید');
        return;
      }
      const result = await onLogin(
        shopCodeInput.trim(),
        shopPassInput.trim(),
        selectedRole,
        rolePassInput,
        loginCaptchaToken || undefined,
        deviceNameInput || undefined,
        loginUsernameInput.trim() || undefined
      );
      if (typeof result === 'boolean') {
        if (!result) setLoginError('رمز نقش اشتباه است');
      } else if (result && !result.ok) {
        if (result.twoFactorRequired && result.pendingToken) {
          setTwoFactorRequired(true);
          setPendingToken2fa(result.pendingToken);
          setTotpCode('');
          setTotpError('');
        } else if (result.code === 'SHOP_SUSPENDED') {
          setSuspendedGate({ open: true, message: result.message });
        } else {
          setLoginError(result.message || 'خطا در ورود');
        }
      }
    } catch (err: unknown) {
      setLoginError(formatAuthClientError(err));
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 2FA challenge state
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [pendingToken2fa, setPendingToken2fa] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [totpError, setTotpError] = useState('');
  const [isTotpLoading, setIsTotpLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleMode, setGoogleMode] = useState<'login' | 'register'>('login');
  const [googleName, setGoogleName] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleError, setGoogleError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (!initialAuthView) return;
    if (initialAuthView === 'register') setRegisterStep(1);
    if (initialAuthView === 'login') {
      setLoginStep(1);
      setLoginShopRolesPool([]);
      setLoginStep2UsernameOk(false);
      setTwoFactorRequired(false);
      setTotpCode('');
      setTotpError('');
    }
    setView(initialAuthView as ViewType | 'creator');
  }, [initialAuthView]);

  // Register state (پرداخت — چندمرحله‌ای)
  interface RegisterData {
    plan: string;
    payMethod: string;
    shopName: string;
    ownerFirstName: string;
    ownerFamily: string;
    phone: string;
    email: string;
    password: string;
    password2: string;
    businessType: OnboardingBusinessTypeId;
  }

  const [regData, setRegData] = useState<RegisterData>({
    plan: 'basic_monthly',
    payMethod: 'other_try',
    shopName: '',
    ownerFirstName: '',
    ownerFamily: '',
    phone: '',
    email: '',
    password: '',
    password2: '',
    businessType: DEFAULT_BUSINESS_TYPE,
  });
  const [showRegisterPwd, setShowRegisterPwd] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [paymentValues, setPaymentValues] = useState<Record<string, string>>({});
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [createdPayment, setCreatedPayment] = useState<{ id: number; status: string; checkoutUrl?: string | null } | null>(null);
  /** false = پیش‌فرض واتساپ و حواله داخلی؛ true = انتخاب بانک، موبایل‌پیسه و … */
  const [registerPayUseAdvancedMethods, setRegisterPayUseAdvancedMethods] = useState(false);

  const cardBg = 'bg-black/30 backdrop-blur-lg border border-white/10 shadow-2xl';
  const textPrimary = 'text-white';
  const textSecondary = 'text-slate-300';
  const inputCls = 'bg-white/5 border-2 border-white/10 text-white placeholder-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 transition-all';
  const primaryBtn = 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 transition-all';
  const secondaryBtn = 'bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all shadow-sm';


  const handleTotpVerify = async () => {
    if (!totpCode.trim()) { setTotpError('کد Google Authenticator را وارد کنید'); return; }
    setTotpError('');
    setIsTotpLoading(true);
    try {
      const res = await onTwoFactorVerify(pendingToken2fa, totpCode.trim());
      if (!res.ok) {
        if (res.code === 'SHOP_SUSPENDED') {
          setSuspendedGate({ open: true, message: res.message });
        } else {
          setTotpError(res.message || 'کد نادرست است');
        }
      }
    } catch {
      setTotpError('خطا در تأیید کد');
    } finally {
      setIsTotpLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setGoogleError('');
    if (!googleName.trim() || !googleEmail.trim()) {
      setGoogleError('نام و ایمیل الزامی است');
      return;
    }
    setGoogleLoading(true);
    const res = await onGoogleLogin(googleEmail.trim(), googleName.trim(), deviceNameInput || undefined);
    if (!res.ok) {
      if (res.code === 'SHOP_SUSPENDED') {
        setSuspendedGate({ open: true, message: res.message });
      } else {
        setGoogleError(res.message || 'خطا در ورود با گوگل');
      }
      setGoogleLoading(false);
      return;
    }
    setShowGoogleModal(false);
    setGoogleName('');
    setGoogleEmail('');
    setGoogleLoading(false);
  };

  const handleSubmitPayment = async () => {
    setPaymentError('');
    const fullOwner = `${regData.ownerFirstName} ${regData.ownerFamily}`.trim();
    if (!regData.shopName.trim() || !fullOwner || !regData.phone.trim()) {
      setRegisterStep(2);
      setPaymentError('مشخصات فروشگاه ناقص است؛ مراحل قبل را تکمیل کنید.');
      return;
    }
    if (validatePasswordPolicy(regData.password) || regData.password !== regData.password2) {
      setRegisterStep(2);
      setPaymentError('رمز عبور و تکرار آن را در مرحلهٔ مشخصات بررسی کنید.');
      return;
    }
    if (!ACTIVE_BUSINESS_TYPE_IDS.has(regData.businessType)) {
      setRegisterStep(3);
      setPaymentError('نوع کسب‌وکار فعال انتخاب نشده است.');
      return;
    }
    const databasePreset = `af_erp_empty_${regData.businessType}`;
    setIsSubmittingPayment(true);
    try {
      const method = paymentMethods.find((m) => m.id === regData.payMethod) || paymentMethods[0];
      const meta: Record<string, string> = {
        shop_name: regData.shopName.trim(),
        owner_phone: regData.phone.replace(/\D/g, ''),
        business_type: regData.businessType,
        database_preset: databasePreset,
        desired_admin_password: regData.password,
      };
      method.fields.forEach((f) => {
        const val = String(paymentValues[f.name] || '').trim();
        if (val) meta[f.name] = val;
      });
      if (method.id === 'other_try') {
        meta.message = 'manual_contact_requested';
      }
      const res = await apiRegisterPayment({
        ownerName: fullOwner,
        email: regData.email.trim() || undefined,
        plan: regData.plan,
        payMethod: regData.payMethod,
        paymentMeta: meta,
      });

      let checkoutUrl = res.payment.gateway_checkout_url || null;
      if (res.payment.pay_method === 'hesabpay') {
        try {
          const init = await apiInitHesabPay(res.payment.id);
          checkoutUrl = init.checkoutUrl;
        } catch {
          void 0;
        }
      }
      setCreatedPayment({ id: res.payment.id, status: res.payment.pay_status, checkoutUrl });
      setView('payment-pending');
    } catch (e) {
      setPaymentError(e instanceof Error ? e.message : 'خطا در ثبت پرداخت');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const googleModal = showGoogleModal ? (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4" dir="rtl">
      <div className={`w-full max-w-md rounded-2xl border ${cardBg} p-6 shadow-2xl relative overflow-hidden`}>
        <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className={`text-lg font-bold ${textPrimary}`}>{googleMode === 'register' ? 'ثبت نام با گوگل' : 'ورود با گوگل'}</h3>
              <p className={`text-xs mt-1 ${textSecondary}`}>اطلاعات گوگل را وارد کنید</p>
            </div>
            <button onClick={() => setShowGoogleModal(false)} className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors border border-white/10">
              <X size={16} />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className={`text-sm font-semibold block mb-1.5 ${textSecondary}`}>نام کامل</label>
              <input
                value={googleName}
                onChange={e => setGoogleName(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors ${inputCls}`}
                placeholder="مثال: محمد احمدی"
              />
            </div>
            <div>
              <label className={`text-sm font-semibold block mb-1.5 ${textSecondary}`}>ایمیل گوگل</label>
              <input
                value={googleEmail}
                onChange={e => setGoogleEmail(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors ${inputCls}`}
                placeholder="example@gmail.com"
                dir="ltr"
              />
            </div>
            {googleError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                {googleError}
              </div>
            )}
            <button
              onClick={handleGoogleAuth}
              disabled={googleLoading}
              className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 ${primaryBtn}`}
            >
              {googleLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                  ادامه
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  const plans = [
    {
      id: 'free', name: 'آزمایشی رایگان', nameEn: 'Free trial',
      price: '۰ افغانی', period: '۳ روز',
      color: 'slate', badge: '۳ روز',
      features: [
        'ثبت‌نام با موبایل + رمز (بدون کد پیامک)',
        '۳ روز دسترسی کامل به امکانات',
        'ورود مجدد با همان شماره و رمز',
        'داده‌های شما ذخیره می‌شود (مثل حساب رسمی)',
        'SKU یکتا در هر فروشگاه (بر پایه بارکد)، وضعیت کالا و زمان آخرین ویرایش در سرور',
        'پایگاه PostgreSQL با جداول مجزا و همگام‌سازی خوش‌بینانه',
        'پس از اتمام: تمدید از طریق اشتراک یا پشتیبانی',
      ]
    },
    {
      id: 'basic_monthly', name: 'ماهانه پایه', nameEn: 'Basic Monthly',
      price: '۹۹۹ افغانی', period: 'ماهانه',
      color: 'blue', badge: 'اقتصادی',
      features: [
        '۴ کاربر (مدیر + ۳ نقش مجزا)',
        'حداکثر ۲۰۰۰ محصول در انبار',
        'حداکثر ۲۵۰ مشتری وفادار',
        'SKU یکتا، وضعیت کالا (فعال / پیش‌نویس / متوقف)، فیلدهای audit',
        'چند انبار نام‌گذاری‌شده با تفکیک موجودی در فرم محصول',
        'پشتیبانی استاندارد تیکتی',
        'چاپ فاکتور (۴ سایز استاندارد)',
        'بکاپ‌گیری خودکار هفتگی روی PostgreSQL',
      ]
    },
    {
      id: 'basic_annual', name: 'سالانه پایه', nameEn: 'Basic Annual',
      price: '۶۴۹۹ افغانی', period: 'سالانه',
      color: 'indigo', badge: 'به صرفه ترین',
      features: [
        'تمام امکانات طرح پایه ماهانه',
        'صرفه‌جویی ۳۰٪ در هزینه سالانه',
        'پشتیبانی اولویت‌دار تلفنی',
        'حداکثر ۵۰۰۰ محصول در انبار',
        'SKU یکتا و یکپارچگی داده در جداول رابطه‌ای',
        'بکاپ‌گیری خودکار روزانه',
        'امنیت SSL و رمزنگاری داده‌ها',
      ]
    },
    {
      id: 'premium_annual', name: 'سالانه پرمیوم', nameEn: 'Premium Annual',
      price: '۹۹۹۹ افغانی', period: 'سالانه',
      color: 'emerald', badge: 'پیشنهادی دکان یار',
      features: [
        'کاربران نامحدود (بدون محدودیت)',
        'محصولات نامحدود (بدون محدودیت)',
        'مشتریان نامحدود (بدون محدودیت)',
        'SKU یکتا، audit کامل، آماده مقیاس‌پذیری روی PostgreSQL',
        'پشتیبانی ۲۴/۷ اختصاصی VIP',
        'گزارش‌گیری پیشرفته + نمودارهای تحلیلی',
        'سیستم حسابداری کامل و حرفه‌ای',
        'API اختصاصی برای اتصال به سایت',
        'احراز هویت دوعاملی (2FA)',
      ]
    },
  ];

  interface PaymentMethodField {
    name: string;
    label: string;
    placeholder: string;
    type: string;
  }

  interface PaymentMethod {
    id: string;
    icon: React.ReactNode;
    name: string;
    company: string;
    color: string;
    number: string;
    fields: PaymentMethodField[];
    hint?: string;
  }

  const paymentMethods: PaymentMethod[] = [
    {
      id: 'bank_transfer',
      icon: <Banknote className="text-emerald-500" />,
      name: 'حواله بانکی',
      company: 'بانک‌ها و صرافی‌های معتبر افغانستان',
      color: 'bg-emerald-500/10',
      number: 'AC-0098-4452-879',
      fields: [
        { name: 'transfer_number', label: 'شماره حواله', placeholder: 'مثال: TR-123456', type: 'text' },
        { name: 'bank_name', label: 'نام بانک یا صرافی', placeholder: 'مثال: بانک ملی، صرافی برادران...', type: 'text' }
      ]
    },
    {
      id: 'mpaisa',
      icon: <Smartphone className="text-blue-500" />,
      name: 'M-Paisa',
      company: 'Roshan Telecom — موبایل پیسه',
      color: 'bg-blue-500/10',
      number: '0700-740-740',
      fields: [
        { name: 'mpaisa_number', label: 'شماره موبایل فرستنده', placeholder: '07XX-XXX-XXX', type: 'text' },
        { name: 'mpaisa_ref', label: 'کد مرجع تراکنش', placeholder: 'REF-123456', type: 'text' }
      ],
      hint: 'قدیمی‌ترین و گسترده‌ترین سرویس پرداخت موبایلی در افغانستان'
    },
    {
      id: 'mhawala',
      icon: <ArrowRightLeft className="text-sky-500" />,
      name: 'M-Hawala',
      company: 'Etisalat Afghanistan — حواله موبایلی',
      color: 'bg-sky-500/10',
      number: '0790-074-175',
      fields: [
        { name: 'mhawala_number', label: 'شماره موبایل فرستنده', placeholder: '07XX-XXX-XXX', type: 'text' },
        { name: 'mhawala_ref', label: 'کد رسید تراکنش', placeholder: 'ET-654321', type: 'text' }
      ],
      hint: 'پرکاربردترین سرویس حواله موبایلی نزد مردم افغانستان'
    },
    {
      id: 'mymoney',
      icon: <Wallet className="text-indigo-500" />,
      name: 'MyMoney',
      company: 'AWCC (Afghan Wireless) — کیف پول دیجیتال',
      color: 'bg-indigo-500/10',
      number: '0700-507-4175',
      fields: [
        { name: 'mymoney_number', label: 'شماره AWCC فرستنده', placeholder: '07XX-XXX-XXX', type: 'text' },
        { name: 'mymoney_ref', label: 'شماره مرجع پرداخت', placeholder: 'AW-776655', type: 'text' }
      ],
      hint: 'مناسب برای کاربران شبکه Afghan Wireless در شهرهای بزرگ'
    },
    {
      id: 'atoma_pay',
      icon: <CreditCard className="text-cyan-500" />,
      name: 'ATOMA Pay',
      company: 'ATOMA Digital Payments — پرداخت آنلاین',
      color: 'bg-cyan-500/10',
      number: 'ATOMA-DOKANYAR',
      fields: [
        { name: 'atoma_wallet', label: 'شماره کاربری یا موبایل', placeholder: '07XX-XXX-XXX', type: 'text' },
        { name: 'atoma_ref', label: 'کد تأیید پرداخت', placeholder: 'AT-998877', type: 'text' }
      ],
      hint: 'پلتفرم نوظهور پرداخت دیجیتال برای معاملات آنلاین داخل افغانستان'
    },
    {
      id: 'hesabpay',
      icon: <Globe className="text-teal-500" />,
      name: 'HesabPay',
      company: 'hesab.com — درگاه تأیید خودکار',
      color: 'bg-teal-500/10',
      number: 'HESABPAY-GATEWAY',
      fields: [
        { name: 'hesabpay_tx', label: 'شناسه تراکنش HesabPay', placeholder: 'HP-XXXXXX', type: 'text' }
      ],
      hint: 'تنها درگاه با تأیید خودکار از طریق API و Webhook'
    },
    {
      id: 'other_try',
      icon: <Phone className="text-violet-500" />,
      name: 'پشتیبانی مستقیم',
      company: 'SmartHub Digital Solutions — ۰۷۹۵۰۷۴۱۷۵',
      color: 'bg-violet-500/10',
      number: '0795074175',
      fields: [],
      hint: 'از طریق تلفن یا واتساپ با تیم ما روش مناسب شما را پیدا می‌کنیم'
    }
  ];

  const selectedPayment = paymentMethods.find(p => p.id === regData.payMethod);
  const visiblePlans = trialQuickSignup ? plans : plans.filter((p) => p.id !== 'free');
  const selectedPlan = visiblePlans.find(p => p.id === regData.plan) || visiblePlans[0] || plans[1];

  const suspendedGateModal = (
    <ShopGateModal
      open={suspendedGate.open}
      variant="suspended"
      message={suspendedGate.message}
      onGoPayment={() => { setSuspendedGate({ open: false }); navigate('/?renew=1'); }}
    />
  );

  // DEMO: ثبت‌نام / ورود با موبایل + رمز (بدون SMS/OTP)
  if (view === 'demo-register') {
    return (
      <>
        {suspendedGateModal}
      <div className="min-h-screen font-vazir relative flex items-center justify-center p-4 overflow-hidden" dir="rtl">
        <AuthPremiumBackground scene="demo-limit" />
        <div
          className={`relative z-10 w-full mx-auto ${
            demoRegisterCredentials || demoRegPhase === 'business' ? 'max-w-6xl' : 'max-w-md'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              setView('register');
              setRegisterStep(1);
              setDemoError('');
              setDemoRegisterCredentials(null);
              setDemoRegPhase('form');
            }}
            className="flex items-center gap-2 mb-6 text-sm font-bold text-slate-200 hover:text-white transition-colors bg-white/10 px-4 py-2 rounded-xl shadow-sm border border-white/10 mr-0"
          >
            <ChevronRight size={18} /><span>بازگشت به طرح‌ها</span>
          </button>

          <div className="bg-black/40 backdrop-blur-lg border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600/80 to-blue-600/80 px-6 py-5 text-right relative overflow-hidden">
              <div className="relative z-10">
                <div className="text-3xl mb-2">🚀</div>
                <h2 className="text-xl font-black text-white">ثبت‌نام آزمایشی رایگان — ۳ روز</h2>
                <p className="text-indigo-100 text-xs mt-2 opacity-90 leading-relaxed">
                  {demoRegPhase === 'business'
                    ? 'فروشگاه عمومی، کتابفروشی و زرگری/طلا هر کدام دیتابیس و نمونهٔ کالا/کتاب/طلا جدا دارند — با هم قاطی نمی‌شوند.'
                    : 'ابتدا مشخصات را وارد کنید؛ سپس یکی از صنوف با برچسب «دمو ۳ روز» را انتخاب کنید.'}
                </p>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-4 text-right">
              {demoRegisterCredentials ? (
                <div className="space-y-4 max-w-xl mx-auto">
                  <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30">
                    <p className="text-emerald-200 text-sm font-black mb-4">ثبت‌نام موفق — موارد زیر را یادداشت کنید</p>
                    <div className="space-y-3">
                      <div>
                        <p className="text-slate-400 text-xs font-bold">کد فروشگاه</p>
                        <p className="text-white font-mono font-black text-lg tracking-wider text-left mt-1" dir="ltr">{demoRegisterCredentials.shopCode}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs font-bold">رمز عبور فروشگاه</p>
                        <p className="text-white font-mono font-black text-base break-all text-left mt-1" dir="ltr">{demoRegisterCredentials.shopPassword}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs font-bold">نام مدیر</p>
                        <p className="text-white font-bold text-base mt-1">{demoRegisterCredentials.adminFullName}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs font-bold">نام کاربری انگلیسی مدیر (مرحلهٔ دوم ورود)</p>
                        <p className="text-cyan-200 font-mono font-black text-base break-all text-left mt-1" dir="ltr">
                          {demoRegisterCredentials.adminUsername}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs font-bold">رمز نقش مدیر (در ورود زیر «مدیر دکان»)</p>
                        <p className="text-amber-200 font-mono font-black text-base break-all text-left mt-1" dir="ltr">{demoRegisterCredentials.adminRolePassword}</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    نقش‌های فروشنده، انباردار و حسابدار به‌صورت پیش‌فرض در ورود نمایش داده نمی‌شوند تا مدیر از تنظیمات → کاربران فروشگاه آن‌ها را فعال و رمز تعیین کند.
                  </p>
                  <p className="text-slate-500 text-[11px] leading-relaxed border-t border-white/10 pt-3">
                    <b className="text-slate-400">مدیر هر دکان (دیمو)</b> فقط پنل همان فروشگاه را می‌بیند. با دکمهٔ زیر به صفحهٔ ورود بروید و اطلاعات نمایش‌داده‌شده در همین کارت را وارد کنید.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShopCodeInput(demoRegisterCredentials.shopCode);
                      setShopPassInput(demoRegisterCredentials.shopPassword);
                      setLoginUsernameInput(demoRegisterCredentials.adminUsername);
                      setDemoRegisterCredentials(null);
                      setDemoError('');
                      setDemoRegPhase('form');
                      setView('login');
                      setLoginStep(1);
                      setLoginShopRolesPool([]);
                      setLoginStep2UsernameOk(false);
                    }}
                    className="w-full py-3.5 rounded-xl text-base font-black flex items-center justify-center gap-2 bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20"
                  >
                    رفتن به ورود <LogIn size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDemoRegisterCredentials(null);
                      setDemoRegPhase('form');
                    }}
                    className="w-full text-slate-400 hover:text-white text-sm text-center"
                  >
                    بازگشت به فرم ثبت‌نام
                  </button>
                </div>
              ) : demoRegPhase === 'business' ? (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-white text-lg font-black mb-0.5">نوع کسب‌وکار</h3>
                    <p className="text-slate-500 text-[11px]">
                      چند صنف با دمو ۳ روزه فعال است؛ بقیهٔ کارت‌ها «بزودی» یا «طرح کامل» هستند.
                    </p>
                  </div>
                  {demoError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-bold flex items-center gap-2 flex-row-reverse text-right">
                      <AlertTriangle size={16} className="shrink-0" /> <span>{demoError}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                    {ONBOARDING_BUSINESS_TYPES.filter((bt) => bt.isActive).map((bt) => {
                      const IconComp = ONBOARDING_LUCIDE[bt.lucideIcon];
                      const sel = demoBusinessType === bt.id;
                      const demoDb = DEMO_DATABASE_BUSINESS_TYPE_IDS.has(bt.id);
                      return (
                        <button
                          key={bt.id}
                          type="button"
                          onClick={() => {
                            if (!bt.isActive) return;
                            setDemoError('');
                            setDemoBusinessType(bt.id);
                          }}
                          disabled={!bt.isActive}
                          className={`group relative flex flex-col overflow-hidden rounded-2xl border p-0 text-right transition-all duration-300 ${
                            sel
                              ? 'border-indigo-400/80 bg-slate-900/80 shadow-xl shadow-indigo-900/30 ring-1 ring-indigo-400/40 hover:-translate-y-1'
                              : bt.isActive
                                ? 'border-white/10 bg-white/[0.04] hover:border-indigo-400/45 hover:bg-white/[0.07] hover:-translate-y-1 hover:shadow-lg'
                                : 'border-white/10 bg-white/[0.03] opacity-60 cursor-not-allowed'
                          }`}
                        >
                          <div className="relative h-32 sm:h-36 w-full shrink-0">
                            {bt.cardCoverImage ? (
                              <img
                                src={bt.cardCoverImage}
                                alt=""
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                                loading="lazy"
                              />
                            ) : (
                              <div className={`h-full w-full bg-gradient-to-br ${bt.accent}`} />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/25 to-transparent" />
                            {sel ? (
                              <span className="absolute top-2 left-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white text-[11px] font-black shadow-lg ring-2 ring-white/20">
                                ✓
                              </span>
                            ) : null}
                            {!bt.isActive ? (
                              <span className="absolute top-2 left-2 z-10 rounded-lg bg-slate-950/90 px-2 py-0.5 text-[8px] font-black text-slate-200 ring-1 ring-slate-500/50">
                                بزودی
                              </span>
                            ) : !demoDb ? (
                              <span className="absolute top-2 left-2 z-10 rounded-lg bg-amber-950/95 px-2 py-0.5 text-[8px] font-black text-amber-100 ring-1 ring-amber-400/40">
                                طرح کامل
                              </span>
                            ) : (
                              <span className="absolute top-2 left-2 z-10 rounded-lg bg-emerald-950/95 px-2 py-0.5 text-[8px] font-black text-emerald-100 ring-1 ring-emerald-400/40">
                                دمو ۳ روز
                              </span>
                            )}
                          </div>
                          <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-3.5">
                            <div
                              className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${bt.accent} shadow-md ring-1 ring-white/15`}
                            >
                              <IconComp size={20} className="text-white drop-shadow-md" strokeWidth={1.75} />
                            </div>
                            <p className="text-white font-black text-sm sm:text-base leading-snug tracking-tight">
                              {bt.titleFa}
                            </p>
                            <p className="text-slate-500 text-[10px] sm:text-[11px] font-mono truncate" dir="ltr">
                              {bt.titleEn}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => { setDemoRegPhase('form'); setDemoError(''); }}
                      className="flex-1 py-3 rounded-xl border border-white/20 text-slate-200 font-bold hover:bg-white/5"
                    >
                      بازگشت به فرم
                    </button>
                    {RECAPTCHA_SITE_KEY ? (
                      <div className="flex w-full sm:w-auto justify-center">
                        <ReCAPTCHA
                          ref={demoCaptchaRef}
                          sitekey={RECAPTCHA_SITE_KEY}
                          theme="dark"
                          onChange={(token) => setDemoCaptchaToken(token || '')}
                          onExpired={() => setDemoCaptchaToken('')}
                        />
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void handleDemoRegisterApi()}
                      disabled={isDemoLoading}
                      className="flex-1 py-3.5 rounded-xl text-base font-black flex items-center justify-center gap-2 bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-60 shadow-lg"
                    >
                      {isDemoLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>ایجاد حساب و دریافت کدها <Check size={18} /></>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {demoError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-bold flex items-center gap-2 flex-row-reverse text-right">
                      <AlertTriangle size={16} className="shrink-0" /> <span>{demoError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">نام</label>
                      <input value={demoName} onChange={e => setDemoName(e.target.value)} placeholder="نام"
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border-2 border-white/10 text-white text-sm outline-none focus:border-indigo-400 text-right" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">نام خانوادگی</label>
                      <input value={demoFamily} onChange={e => setDemoFamily(e.target.value)} placeholder="نام خانوادگی"
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border-2 border-white/10 text-white text-sm outline-none focus:border-indigo-400 text-right" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">ایمیل (اختیاری)</label>
                    <input type="email" value={demoOptionalEmail} onChange={e => setDemoOptionalEmail(e.target.value)} placeholder="example@gmail.com" dir="ltr"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border-2 border-white/10 text-white text-sm outline-none focus:border-indigo-400 text-left" />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">شماره موبایل</label>
                    <input value={demoPhone} onChange={e => setDemoPhone(e.target.value)} placeholder="مثلاً 07xxxxxxx" dir="ltr"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border-2 border-white/10 text-white text-sm outline-none focus:border-indigo-400 font-bold text-left"
                      inputMode="tel" autoComplete="tel" />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">رمز عبور قوی (حداقل ۸ کاراکتر + حرف بزرگ + عدد + کاراکتر ویژه) — همان «رمز نقش مدیر» در ورود</label>
                    <div className="relative">
                      <input type={showDemoPwd ? 'text' : 'password'} value={demoPassword} onChange={e => setDemoPassword(e.target.value)}
                        className="w-full px-4 py-3 pl-12 rounded-xl bg-white/5 border-2 border-white/10 text-white text-sm outline-none focus:border-indigo-400 text-left" dir="ltr" autoComplete="new-password" />
                      <button type="button" onClick={() => setShowDemoPwd(!showDemoPwd)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                        {showDemoPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">تکرار رمز</label>
                    <input type={showDemoPwd ? 'text' : 'password'} value={demoPassword2} onChange={e => setDemoPassword2(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border-2 border-white/10 text-white text-sm outline-none focus:border-indigo-400 text-left" dir="ltr" autoComplete="new-password" />
                  </div>

                  <button
                    type="button"
                    onClick={goDemoBusinessStep}
                    className="w-full py-3.5 rounded-xl text-base font-black flex items-center justify-center gap-2 bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20"
                  >
                    ادامه — انتخاب نوع کسب‌وکار <ChevronLeft size={18} />
                  </button>

                  <p className="text-slate-500 text-[10px] leading-relaxed text-right">
                    ۳ روز آزمایشی؛ پس از دریافت کدها از «ورود» وارد شوید. فقط مدیر دکان در ورود دیده می‌شود تا نقش‌های دیگر را خودتان فعال کنید.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
        {googleModal}
      </div>
      </>
    );
  }

  // DEMO LIMIT PAGE
  if (view === 'demo-limit') {
    return (
      <div className={`min-h-screen font-vazir relative flex items-center justify-center p-4 overflow-hidden`} dir="rtl">
        <AuthPremiumBackground scene="demo-limit" />
        <div className="relative z-10 w-full max-w-md">
          <div className={`p-8 rounded-3xl ${cardBg} text-center`}>
            <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/10">
              <Lock size={40} className="text-blue-400" />
            </div>
            <h2 className={`text-2xl font-black mb-3 ${textPrimary}`}>نیاز به اشتراک</h2>
            <p className={`text-sm mb-6 ${textSecondary} leading-7`}>
              برای استفادهٔ پایدار از این بخش، طرح اشتراک یا فعال‌سازی حساب کامل لازم است.<br />
              تیم پشتیبانی می‌تواند در انتخاب طرح راهنمایی کند.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => { setRegisterStep(1); setView('register'); }}
                className={`w-full py-4 rounded-xl text-lg flex items-center justify-center gap-2 ${primaryBtn}`}
              >
                <Crown size={20} />
                مشاهده طرح‌های اشتراک
              </button>
              <button
                onClick={() => { setGoogleMode('login'); setShowGoogleModal(true); }}
                className="w-full py-3 rounded-xl text-sm font-bold bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all flex items-center justify-center gap-2"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" />
                ورود با Google
              </button>
              <button
                onClick={() => setView('landing')}
                className={`w-full py-3 rounded-xl text-sm font-bold ${secondaryBtn}`}
              >
                بازگشت به صفحه اصلی
              </button>
            </div>
            <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
              <p className={`text-xs ${textSecondary} mb-3 font-black uppercase tracking-widest`}>طرح‌های اشتراک:</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-indigo-500/20 bg-black/20 shadow-sm">
                  <p className="text-indigo-400 font-black">پایه</p>
                  <p className="text-white text-xl font-black mt-1">۶۴۹۹ افغانی</p>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">سالانه</p>
                  <p className="text-[10px] text-emerald-300 mt-1 font-bold">سال‌های بعد ۳۰٪ تخفیف</p>
                </div>
                <div className="p-3 rounded-xl border border-blue-500/20 bg-black/20 shadow-sm">
                  <p className="text-blue-400 font-black">پریمیوم</p>
                  <p className="text-white text-xl font-black mt-1">۹۹۹۹ افغانی</p>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">سالانه</p>
                  <p className="text-[10px] text-emerald-300 mt-1 font-bold">سال‌های بعد ۳۰٪ تخفیف</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PAYMENT PENDING PAGE
  if (view === 'payment-pending') {
    return (
      <div className={`min-h-screen font-vazir relative flex items-center justify-center p-4 overflow-hidden`} dir="rtl">
        <AuthPremiumBackground scene="payment-pending" />
        <div className="relative z-10 w-full max-w-lg">
          <div className={`p-8 sm:p-12 rounded-[2.5rem] ${cardBg} text-center relative overflow-hidden`}>
            {/* Background Decorative Element */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full" />
            
            <div className="relative z-10">
              <div className="w-24 h-24 rounded-3xl bg-blue-500/20 flex items-center justify-center mx-auto mb-8 shadow-xl shadow-blue-500/10 animate-bounce">
                <Banknote size={48} className="text-blue-400" />
              </div>
              
              <h2 className={`text-3xl font-black mb-4 ${textPrimary} tracking-tight`}>در انتظار تأیید پرداخت</h2>
              
              <div className="p-4 rounded-2xl mb-8 text-sm bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold leading-relaxed flex items-center gap-3">
                <Mail size={20} className="shrink-0" />
                ایمیل تأیید ثبت‌نام برای شما ارسال شد. لطفاً صندوق ورودی (Inbox) خود را بررسی کنید.
              </div>
              
              <p className={`text-base mb-10 ${textSecondary} leading-loose`}>
                درخواست شما با موفقیت ثبت شد. <br />
                پس از واریز وجه، لطفاً رسید را از طریق راه‌های زیر برای ما ارسال کنید تا حساب شما در کمترین زمان ممکن توسط تیم <span className="text-indigo-400 font-black">دکان یار</span> فعال شود.
              </p>

              <div className="p-6 rounded-3xl mb-8 text-right bg-black/20 border border-white/10 shadow-inner">
                <p className="text-white font-black text-sm mb-6 flex items-center gap-3">
                  <CheckCircle size={20} className="text-emerald-400" /> جزئیات پرداخت انتخابی
                </p>
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <span className={textSecondary}>روش پرداخت:</span>
                    <div className="flex items-center gap-2">
                      {selectedPayment?.icon}
                      <span className={`${textPrimary} font-black`}>{selectedPayment?.name}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <span className={textSecondary}>شماره حساب / موبایل:</span>
                    <span className="text-indigo-400 font-black text-lg tracking-wider bg-black/20 px-3 py-1 rounded-xl border border-white/10">{selectedPayment?.number}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <span className={textSecondary}>به نام:</span>
                    <span className={`${textPrimary} font-black`}>پلتفرم دکان یار</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className={textSecondary}>مبلغ نهایی:</span>
                    <div className="text-left">
                      <span className="text-white font-black text-2xl">{selectedPlan.price}</span>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedPlan.period}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex flex-col items-center gap-2">
                  <Mail size={24} className="text-blue-400" />
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">ارسال به ایمیل</p>
                  <p className="text-xs font-black text-blue-100">dokanyar2026@gmail.com</p>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col items-center gap-2">
                  <Smartphone size={24} className="text-emerald-400" />
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">ارسال به واتساپ</p>
                  <p className="text-xs font-black text-emerald-100" dir="ltr">0795074175</p>
                </div>
              </div>

              {createdPayment && (
                <div className="mb-8 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 px-5 py-4 text-right">
                  <p className="text-indigo-200 text-sm font-bold">شناسه درخواست پرداخت: #{createdPayment.id}</p>
                  <p className="text-indigo-300 text-xs mt-1">وضعیت: {createdPayment.status}</p>
                  {createdPayment.checkoutUrl && (
                    <a
                      href={createdPayment.checkoutUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex mt-3 text-xs font-bold text-blue-300 hover:text-blue-200 underline"
                    >
                      رفتن به درگاه HesabPay (Sandbox)
                    </a>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setView('login')}
                  className={`w-full py-4 rounded-2xl text-lg font-black flex items-center justify-center gap-3 ${primaryBtn}`}
                >
                  <LogIn size={22} /> ورود به حساب
                </button>
                <button
                  onClick={() => setView('landing')}
                  className={`w-full py-4 rounded-2xl text-sm font-bold ${secondaryBtn}`}
                >
                  بازگشت به صفحه اصلی
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // LANDING PAGE
  if (view === 'landing') {
    return (
      <>
        {suspendedGateModal}
      <div className={`min-h-screen font-vazir selection:bg-indigo-100 selection:text-indigo-900 relative flex flex-col overflow-hidden`} dir="rtl">
        <AuthPremiumBackground scene="landing" />
        <div className="absolute inset-0 pointer-events-none opacity-40" aria-hidden>
          <div className="absolute inset-0 bg-[linear-gradient(to_left,rgba(99,102,241,.07)_1px,transparent_1px)] bg-[size:64px_100%]" />
        </div>

        <header className="relative z-50 w-full">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 md:py-8">
            {/* موبایل: لوگو + نام دکان‌یار گوشه راست؛ ورود / درباره در وسط؛ ثبت‌نام */}
            <div className="flex md:hidden flex-col gap-4 pt-1">
              <div className="flex items-center justify-end pr-0.5">
                <BrandLogo size={40} variant="header" className="drop-shadow-lg" />
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm font-bold text-white flex-wrap">
                  <button type="button" onClick={() => setView('info')} className="p-0 m-0 bg-transparent border-0 shadow-none hover:text-white/90 active:scale-[0.98] transition-all">
                    {t('about_us')}
                  </button>
                  <span className="text-white/25 select-none" aria-hidden>|</span>
                  <button type="button" onClick={() => setView('download')} className="p-0 m-0 bg-transparent border-0 shadow-none hover:text-emerald-300 active:scale-[0.98] transition-all">
                    دانلود
                  </button>
                  <span className="text-white/25 select-none" aria-hidden>|</span>
                  <Link to="/login" className="p-0 m-0 text-inherit bg-transparent font-bold hover:text-white/90 active:scale-[0.98] transition-all">
                    {t('login')}
                  </Link>
                </div>
                <Link
                  to="/register"
                  className="text-xs font-black text-white px-5 py-2 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:opacity-95 transition-opacity shadow-lg shadow-indigo-900/40"
                >
                  {t('register')}
                </Link>
              </div>
            </div>

            <div className="hidden md:flex items-center justify-between">
              <div className="flex items-center gap-4 group cursor-pointer">
                <BrandLogo size={56} variant="header" className="drop-shadow-lg" />
              </div>
              <div className="flex items-center gap-8">
                <nav className="flex items-center gap-6">
                  <button type="button" onClick={() => setView('info')} className="text-sm font-bold text-white hover:text-white/80 transition-all hover:scale-105">
                    {t('about_us')}
                  </button>
                  <button type="button" onClick={() => setView('download')} className="text-sm font-bold text-emerald-300 hover:text-emerald-200 transition-all hover:scale-105">
                    دانلود
                  </button>
                  <Link to="/login" className="text-sm font-bold text-white hover:text-white/80 transition-all hover:scale-105">
                    {t('login')}
                  </Link>
                </nav>
                <Link
                  to="/register"
                  className="group relative px-8 py-3.5 rounded-full text-base font-black text-white overflow-hidden transition-all duration-500 hover:shadow-[0_0_50px_rgba(79,70,229,0.5)] hover:-translate-y-1 active:scale-95"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 animate-gradient-x" />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/20 transition-opacity" />
                  <span className="relative flex items-center gap-1.5">
                    {t('register')} <ArrowRight size={16} className="group-hover:translate-x-[-4px] transition-transform" />
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Hero */}
        <main className="relative z-10 flex flex-1 flex-col justify-center px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-10">
          <div className="mx-auto w-full max-w-6xl">
            <div className="mb-10 text-center sm:mb-14">
              <h2 className="mb-6 bg-gradient-to-b from-white via-white to-slate-400 bg-clip-text text-4xl font-black leading-[1.12] tracking-tight text-transparent drop-shadow-sm sm:mb-8 sm:text-6xl md:text-7xl lg:text-8xl animate-fade-in-up animation-delay-200">
                {t('app_name')}
              </h2>
              <p className="mx-auto max-w-2xl text-base font-medium leading-relaxed text-slate-200/90 sm:text-xl md:text-2xl animate-fade-in-up animation-delay-400">
                {t('welcome_hero_body')}
              </p>
            </div>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-500 sm:mt-14">
              <Link to="/privacy" className="font-bold transition-colors hover:text-white">
                {t('legal_privacy')}
              </Link>
              <span className="text-white/15" aria-hidden>
                |
              </span>
              <Link to="/terms" className="font-bold transition-colors hover:text-white">
                {t('legal_terms')}
              </Link>
            </div>
          </div>
        </main>

        {googleModal}
      </div>
      </>
    );
  }

  // INFO PAGE
  if (view === 'info') {
    return (
      <div className="min-h-screen font-vazir relative overflow-hidden" dir="rtl">
        <AuthPremiumBackground scene="info" />

        {/* Full-width hero image */}
        <div className="absolute top-0 inset-x-0 h-72 sm:h-80 z-0 overflow-hidden">
          <div className="absolute inset-0 bg-cover bg-center"
            style={{backgroundImage: 'url(https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1887&auto=format&fit=crop)'}} />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/70 to-slate-900" />
        </div>

        {/* Header */}
        <header className="relative z-10">
          <div className="max-w-5xl mx-auto px-4 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setView('landing')} className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors border border-white/20">
                <ChevronRight size={20} />
              </button>
              <BrandLogo size={40} variant="header" />
              <span className="font-extrabold text-xl text-white">{t('welcome_about_title')}</span>
            </div>
            <Link to="/login" className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 inline-flex items-center justify-center">
              {t('welcome_login_panel')}
            </Link>
          </div>
        </header>

        {/* Hero text over image */}
        <div className="relative z-10 text-center pt-6 pb-32 px-4">
          <h1 className="text-4xl sm:text-6xl font-black text-white mb-4">{t('app_name')}</h1>
          <p className="text-lg text-indigo-200 max-w-2xl mx-auto leading-relaxed">
            {t('welcome_info_subtitle')}
          </p>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 pb-16 -mt-20">
          {/* Intro card */}
          <div className="p-8 rounded-3xl bg-black/40 backdrop-blur-lg border border-white/10 mb-8 text-slate-200 leading-loose text-justify">
            <p className="text-lg font-bold text-white mb-4">
              {t('welcome_info_intro')}
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">
              {t('welcome_info_detail')}
            </p>
          </div>

          {/* Continuous feature text */}
          <div className="p-8 rounded-3xl bg-black/30 backdrop-blur-sm border border-white/10 mb-8 leading-loose text-slate-200 text-sm space-y-4 text-justify">
            <p>
              <strong className="text-white">مدیریت فروش:</strong> ثبت فاکتور، پرداخت نسیه، مدیریت تخفیف و گزارش‌گیری جامع. تراکنش‌ها و اقدامات کارکنان (فروش، انبار، حسابداری و …) تا تأیید مدیر در بخش «تأیید فعالیت» نهایی می‌شوند؛ در صورت مغایرت امکان رد یا پیگیری وجود دارد.
            </p>
            <p>
              <strong className="text-white">مدیریت مشتریان:</strong> سوابق خرید، بدهی‌ها، یادآوری خودکار و سیستم کارت وفاداری. ابزارهای هوشمند یادآوری به شما کمک می‌کند تا اعلان‌های مربوط به بدهی‌ها را در زمان مناسب دریافت کنید و پیگیری موثری داشته باشید.
            </p>
            <p>
              <strong className="text-white">مدیریت انبار:</strong> کنترل کامل موجودی، پشتیبانی از بارکد، ردیابی تاریخ انقضا و سریال کالاها. اطلاعات انبار به صورت لحظه‌ای به‌روزرسانی می‌شود و هشدارهای موجودی پایین به طور خودکار ارسال می‌گردد.
            </p>
            <p>
              <strong className="text-white">سیستم چاپ فاکتور:</strong> پشتیبانی از ۴ اندازه استاندارد کاغذ (58mm، 80mm، A5 و A4). امکان تنظیم هدر و فوتر فاکتور شامل نام فروشگاه، آدرس، تلفن و پیام تشکر. تنظیمات ذخیره می‌شوند تا در استفاده‌های بعدی نیازی به تنظیم مجدد نباشد.
            </p>
            <p>
              <strong className="text-white">امنیت و سطوح دسترسی:</strong> سیستم دارای ۴ سطح دسترسی مجزا است — مدیر (دسترسی کامل)، حسابدار (اطلاعات مالی)، انباردار (کنترل کالا)، و فروشنده (ثبت فاکتور). هر نقش با رمز جداگانه محافظت می‌شود و دسترسی به اطلاعات حساس محدود می‌گردد.
            </p>
            <p>
              <strong className="text-white">گزارش‌های جامع:</strong> نمودارهای فروش، تحلیل سود و زیان، وضعیت بدهی‌ها و گزارش موجودی انبار به صورت بصری و قابل صادرکردن. خدمات این مجموعه شامل طراحی سیستم‌های مدیریتی، توسعه وب‌سایت، اپلیکیشن موبایل و زیرساخت داده نیز می‌باشد.
            </p>
            <p>
              <strong className="text-white">پایگاه داده و ذخیره‌سازی:</strong> دادهٔ عملیاتی هر فروشگاه در <strong className="text-indigo-200">PostgreSQL</strong> نگهداری می‌شود؛ محصولات، فاکتورها، مشتریان و کتاب‌ها در جداول جدا با کلیدهای ترکیبی فروشگاه، قابل پشتیبان‌گیری و بازیابی هستند. برای هر محصول در هر فروشگاه <strong className="text-indigo-200">SKU (بارکد) یکتا</strong> در سطح دیتابیس اعمال می‌شود، <strong className="text-indigo-200">وضعیت کالا</strong> (مثلاً فعال یا متوقف) و <strong className="text-indigo-200">زمان و کاربر آخرین ویرایش</strong> ثبت می‌شود. ذخیرهٔ متمرکز state فروشگاه با <strong className="text-indigo-200">نسخهٔ خوش‌بینانه (optimistic locking)</strong> از تداخل همزمان جلوگیری می‌کند؛ بکاپ‌های برنامه‌ریزی‌شده روی همین زیرساخت توصیه می‌شود.
            </p>
          </div>

          {/* Footer CTA */}
          <div className="p-8 rounded-3xl bg-black/30 backdrop-blur-sm border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-slate-300 text-sm leading-7">
                با احترام،{' '}
                <button type="button" onClick={() => setView('creator')} className="text-white font-black hover:text-indigo-200 transition-colors p-0 m-0 bg-transparent border-0 shadow-none underline-offset-4 hover:underline">
                  {creatorConfig.name}
                </button>
                {' '}— توسعه‌دهنده دکان‌یار
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setView('register')} className="px-6 py-3 rounded-xl font-black text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20">
                شروع کنید
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // CREATOR PAGE — پروفایل ساده، بدون باکس‌های تزئینی دور نام
  if (view === 'creator') {
    return (
      <div className="min-h-screen font-vazir relative overflow-hidden" dir="rtl">
        <AuthPremiumBackground scene="creator" />

        <div className="relative z-10 min-h-screen flex flex-col">
          <div className="px-4 sm:px-8 pt-5 pb-3">
            <button
              type="button"
              onClick={() => setView('info')}
              className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-xs sm:text-sm font-bold transition-colors p-0 bg-transparent border-0"
            >
              <ChevronRight size={16} /> بازگشت به درباره ما
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center px-4 py-6">
            <div className="w-full max-w-xl">
              <div className="text-center mb-8">
                <div className="mx-auto mb-4 h-24 w-24 sm:h-28 sm:w-28 rounded-full overflow-hidden ring-2 ring-white/25 shadow-xl bg-slate-900">
                  <img
                    src={(creatorConfig as { profile_image?: string }).profile_image || '/creator-profile.png'}
                    alt={creatorConfig.name}
                    className="h-full w-full object-cover object-center"
                    loading="lazy"
                  />
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white mb-1">{creatorConfig.name}</h1>
                <p className="text-indigo-300/90 text-xs sm:text-sm font-semibold">{creatorConfig.title}</p>
              </div>

              <div className="space-y-4 text-slate-300 text-sm sm:text-[15px] leading-8">
                <p>
                  توسعه‌دهنده نرم‌افزار و بنیان‌گذار SmartHub Digital Solutions؛ تمرکز بر ساده‌سازی سیستم‌های مدیریت کسب‌وکار برای دکان‌های واقعی.
                </p>
                <p>
                  <span className="text-white font-semibold">دکان‌یار</span> برای پوشش همان نیازها ساخته شده: فروش، انبار، بدهی و گزارش، بدون پیچیدگی اضافه.
                </p>
                <p className="text-slate-400 text-xs sm:text-sm">
                  مسیر پیش رو: یکپارچگی بیشتر با پرداخت‌های محلی، گزارش‌های هوشمندتر و تجربهٔ موبایل قوی‌تر.
                </p>
              </div>

              <div className="mt-10 pt-6">
                <p className="text-slate-500 text-[10px] text-center mb-4 font-bold tracking-widest">تماس و شبکه‌های اجتماعی</p>
                <div className="flex flex-wrap justify-center gap-4 sm:gap-5">
                  {(() => {
                    const s = (creatorConfig as {
                      social?: {
                        phone?: string;
                        linkedin?: string;
                        tiktok?: string;
                        facebook?: string;
                        instagram?: string;
                        github?: string;
                      };
                    }).social;
                    const phone = (s?.phone || '+93795074175').replace(/\D/g, '');
                    const wa = phone.startsWith('0') ? `https://wa.me/${phone.replace(/^0/, '93')}` : `https://wa.me/${phone}`;
                    return (
                      <>
                  <a
                    href={`tel:${s?.phone || '+93795074175'}`}
                    title="تلفن"
                    className="text-slate-400 hover:text-emerald-400 transition-colors p-2"
                  >
                    <Phone size={22} />
                  </a>
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="WhatsApp"
                    className="text-slate-400 hover:text-green-400 transition-colors p-2"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[22px] h-[22px]">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </a>
                  <a
                    href={s?.linkedin || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="لینکدین"
                    className="text-slate-400 hover:text-sky-400 transition-colors p-2"
                  >
                    <Linkedin size={22} />
                  </a>
                  <a
                    href={s?.tiktok || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="تیک‌تاک"
                    className="text-slate-400 hover:text-fuchsia-400 transition-colors p-2"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[22px] h-[22px]" aria-hidden>
                      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64v-3.4a6.14 6.14 0 00-1-.05 6.33 6.33 0 106.33 6.33v-7.06a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.99z" />
                    </svg>
                  </a>
                  <a
                    href={s?.facebook || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="فیسبوک"
                    className="text-slate-400 hover:text-blue-400 transition-colors p-2"
                  >
                    <Facebook size={22} />
                  </a>
                  <a
                    href={s?.instagram || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="اینستاگرام"
                    className="text-slate-400 hover:text-pink-400 transition-colors p-2"
                  >
                    <Instagram size={22} />
                  </a>
                  <a
                    href={s?.github || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="گیت‌هاب"
                    className="text-slate-400 hover:text-slate-200 transition-colors p-2"
                  >
                    <Github size={22} />
                  </a>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // DOWNLOAD PAGE (اندروید / iOS / ویندوز — تمام‌قد روی viewport، بدون نوار سفید پایین)
  if (view === 'download') {
    return (
      <>
        {suspendedGateModal}
        <div
          className="fixed inset-0 z-[20] flex min-h-0 flex-col overflow-hidden bg-slate-950 font-vazir overscroll-none"
          dir="rtl"
        >
          <WelcomeDownloadPage
            onBack={() => setView('landing')}
            onLogin={() => {
              setView('login');
              setLoginStep(1);
              setLoginShopRolesPool([]);
              setLoginStep2UsernameOk(false);
            }}
            onRegister={() => {
              setRegisterStep(1);
              setView('register');
            }}
          />
        </div>
        {googleModal}
      </>
    );
  }

  // LOGIN PAGE
  if (view === 'login') {
    const isPlatformSuperShop = shopCodeInput.trim().toUpperCase() === 'SUPERADMIN';
    const roleLabels: Record<string, string> = {
      super_admin: 'ابرادمین پلتفرم',
      admin: adminRoleTitleFromShop.trim() || 'admin',
      seller: 'فروشنده',
      stock_keeper: 'انباردار',
      accountant: 'حسابدار',
    };
    const supportWaDigits = String(creatorConfig.social?.phone || '0795074175').replace(/\D/g, '');
    const supportWhatsAppUrl = `https://wa.me/${supportWaDigits || '93795074175'}`;
    return (
      <>
        {suspendedGateModal}
      <div className="relative flex min-h-screen flex-col justify-center overflow-hidden p-4 pb-10 font-vazir lg:py-12" dir="rtl">
        <AuthPremiumBackground scene="login" />
        <div className="pointer-events-none absolute right-4 top-4 z-20 flex items-center md:hidden">
          <BrandLogo size={36} variant="header" className="drop-shadow-md" />
        </div>
        <div className="relative z-10 mx-auto grid w-full max-w-7xl flex-1 items-center gap-8 px-1 sm:px-2 lg:grid-cols-[minmax(280px,1.25fr)_minmax(300px,0.95fr)] lg:gap-10 xl:max-w-[88rem] xl:gap-14">
          <div className="order-2 hidden min-h-[520px] lg:order-1 lg:flex lg:items-stretch">
            <LoginRoadmapHero className="h-full min-h-[520px] w-full xl:min-h-[600px]" />
          </div>
          <div className="order-1 mx-auto mt-6 w-full max-w-md space-y-4 lg:order-2 lg:mt-0 lg:max-w-[420px] lg:justify-self-start lg:ps-4 xl:ps-8 lg:-translate-x-2 xl:-translate-x-4">
          <div className="auth-form-shell overflow-hidden rounded-[1.75rem] shadow-2xl shadow-black/40 min-h-[28rem] sm:min-h-[30rem] flex flex-col">
            <div className="relative h-32 w-full shrink-0 sm:h-36">
              <img
                src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=1200&auto=format&fit=crop"
                alt=""
                className="h-full w-full object-cover"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-l from-slate-950/95 via-slate-950/55 to-slate-950/25" />
            </div>
            {isPwaStandaloneClient() && !isOnline ? (
              <div className="mx-3 mt-2 rounded-xl border border-amber-400/35 bg-amber-500/15 px-3 py-2 text-[10px] text-amber-50 leading-relaxed text-center">
                PWA بدون اینترنت: با «مرا به خاطر بسپار» مستقیم به مرحلهٔ رمز نقش می‌روید؛ در غیر این صورت برای تأیید کد فروشگاه به شبکه نیاز است.
              </div>
            ) : null}
            <div className="p-8 sm:p-10 flex flex-col flex-1">
              <div className="text-center mb-6 sm:mb-8">
                <div className="hidden md:inline-flex mb-3 sm:mb-4 transform scale-[0.82] sm:scale-100 origin-center">
                  <BrandLogo size={56} variant="header" />
                </div>
                <h2 className="text-lg sm:text-2xl font-black text-white">ورود به دکان یار</h2>
                {!twoFactorRequired && loginStep === 1 && (
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black bg-indigo-500 text-white">۱</div>
                      <div className="h-0.5 w-8 rounded-full bg-white/10" />
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black bg-white/10 text-slate-400">۲</div>
                    </div>
                    <p className="text-[10px] text-slate-500 text-center font-bold">۱ — کد و رمز فروشگاه</p>
                  </div>
                )}
                {!twoFactorRequired && loginStep === 2 && (
                  <p className="mt-3 text-[10px] text-slate-500 text-center font-bold">
                    {isPlatformSuperShop ? '۲ — رمز ابرادمین' : '۲ — نام نقش و رمز نقش'}
                  </p>
                )}
              </div>

              {/* ── 2FA challenge ─────────────────────────── */}
              {twoFactorRequired && (
                <div className="space-y-5 text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <Shield size={32} className="text-indigo-400" />
                  </div>
                  <h3 className="text-xl font-black text-white">تأیید هویت دو مرحله‌ای</h3>
                  <p className="text-sm text-slate-300">اپ Google Authenticator را باز کرده و کد ۶ رقمی مربوط به Dokanyar را وارد کنید.</p>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">{t('login_2fa_why')}</p>
                  {totpError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-bold flex items-center gap-3">
                      <AlertTriangle size={18} /> {totpError}
                    </div>
                  )}
                  <input type="text" inputMode="numeric" maxLength={6} value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="• • • • • •"
                    className="w-full px-5 py-4 rounded-xl bg-white/5 border-2 border-white/10 text-white text-3xl font-black tracking-[0.5em] text-center outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 transition-all"
                    dir="ltr" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleTotpVerify()} />
                  <button type="button" onClick={handleTotpVerify}
                    disabled={isTotpLoading || totpCode.length !== 6}
                    className="w-full py-4 rounded-xl text-lg font-black flex items-center justify-center gap-3 bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-60 transition-all shadow-lg shadow-indigo-500/20">
                    {isTotpLoading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Shield size={20} /> تأیید کد</>}
                  </button>
                  <button type="button" onClick={() => { setTwoFactorRequired(false); setTotpCode(''); setTotpError(''); }}
                    className="text-slate-400 hover:text-white text-sm transition-colors">
                    بازگشت به ورود
                  </button>
                </div>
              )}

              {/* ── Step 1: کد و رمز فروشگاه ─────────── */}
              {!twoFactorRequired && loginStep === 1 && (
                <div className="space-y-5">
                  {checkShopError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-bold flex items-center gap-3">
                      <AlertTriangle size={18} /> {checkShopError}
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-200 block">کد فروشگاه</label>
                    <input
                      value={shopCodeInput}
                      onChange={e => { setShopCodeInput(e.target.value); setCheckShopError(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleCheckShop()}
                      className="w-full px-5 py-3.5 rounded-xl bg-white/5 border-2 border-white/10 text-white text-lg font-bold tracking-widest text-center outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 transition-all"
                      placeholder="مثال: SHOP001"
                      dir="ltr"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-200 block">رمز عبور فروشگاه</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={shopPassInput}
                        onChange={e => { setShopPassInput(e.target.value); setCheckShopError(''); }}
                        onKeyDown={e => e.key === 'Enter' && handleCheckShop()}
                        className="w-full px-5 py-3.5 rounded-xl bg-white/5 border-2 border-white/10 text-white text-lg font-bold tracking-widest text-center outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 transition-all"
                        dir="ltr" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>
                  <label className="flex items-center gap-2.5 cursor-pointer justify-center text-slate-300 text-sm select-none">
                    <input
                      type="checkbox"
                      checked={rememberShopCode}
                      onChange={(e) => {
                        const on = e.target.checked;
                        setRememberShopCode(on);
                        if (!on) {
                          try {
                            localStorage.removeItem(REMEMBER_SHOP_CODE_KEY);
                            localStorage.removeItem(REMEMBER_SHOP_PASSWORD_KEY);
                            localStorage.removeItem(REMEMBER_LOGIN_USERNAME_KEY);
                          } catch {
                            /* ignore */
                          }
                        }
                      }}
                      className="rounded border-white/25 bg-white/10 text-indigo-600 focus:ring-indigo-500/40 w-4 h-4"
                    />
                    مرا به خاطر بسپار (روی این دستگاه)
                  </label>
                  <div className="flex items-center justify-center gap-5 text-xs flex-wrap">
                    <button type="button" onClick={() => setShowForgotModal(true)} className="text-indigo-300 hover:text-indigo-200 font-bold flex items-center gap-1.5 transition-colors">
                      <KeyRound size={15} /> فراموشی رمز
                    </button>
                    <a href={supportWhatsAppUrl} target="_blank" rel="noreferrer" className="text-emerald-300 hover:text-emerald-200 font-bold flex items-center gap-1.5 transition-colors">
                      <Headphones size={15} /> پشتیبانی
                    </a>
                  </div>
                  <button type="button" onClick={handleCheckShop} disabled={isCheckingShop}
                    className="w-full py-4 rounded-xl text-lg font-black flex items-center justify-center gap-3 bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-60 transition-all shadow-lg shadow-indigo-500/20">
                    {isCheckingShop
                      ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <>ادامه <ChevronLeft size={22} /></>}
                  </button>
                  <button type="button" onClick={() => setView('landing')} className="w-full text-center text-slate-400 hover:text-white text-sm transition-colors">
                    بازگشت
                  </button>
                </div>
              )}

              {/* ── Step 2: نام کاربری (انگلیسی) + رمز نقش ─── */}
              {!twoFactorRequired && loginStep === 2 && (
                <div className="space-y-5 flex-1 flex flex-col">
                  <div className="text-center p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-2">
                    <p className="text-indigo-300 text-xs font-bold">فروشگاه تأیید شد</p>
                    <p className="text-white font-black text-lg">{shopNameResult}</p>
                    {loginStep2UsernameOk && shopRolesResult[0] ? (
                      <p className="text-slate-300 text-sm font-bold pt-1 border-t border-white/10">
                        نقش: <span className="text-white">{roleLabels[selectedRole] || selectedRole}</span>
                        {shopRolesResult[0].full_name ? (
                          <span className="text-slate-400 font-normal text-xs mr-2">({shopRolesResult[0].full_name})</span>
                        ) : null}
                      </p>
                    ) : (
                      <p className="text-slate-400 text-xs font-bold leading-relaxed pt-1 border-t border-white/10">
                        نام کاربری انگلیسی همان نقش را وارد و تأیید کنید تا نقش نمایش داده شود.
                      </p>
                    )}
                    {isPlatformSuperShop && loginStep2UsernameOk ? (
                      <p className="text-emerald-200/90 text-[11px] leading-relaxed font-bold pt-1 border-t border-white/10">
                        ورود ابرادمین: نام کاربری سرور به‌صورت خودکار تأیید شد — فقط رمز نقش را وارد کنید.
                      </p>
                    ) : null}
                  </div>

                  {!loginStep2UsernameOk ? (
                    <>
                      <p className="text-slate-300 text-sm text-center leading-relaxed">
                        <strong className="text-white">نام نقش</strong> را وارد کنید{' '}
                        <span className="text-slate-500">(همان نام کاربری انگلیسی نقش در سرور)</span>.
                      </p>
                      {loginError && (
                        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-bold flex items-center gap-3">
                          <AlertTriangle size={18} /> {loginError}
                        </div>
                      )}
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-200 block">نام نقش (نام کاربری انگلیسی)</label>
                        <input
                          value={loginUsernameInput}
                          onChange={(e) => {
                            setLoginUsernameInput(e.target.value);
                            setLoginError('');
                          }}
                          onKeyDown={(e) => e.key === 'Enter' && handleConfirmStep2Username()}
                          className="w-full px-5 py-3.5 rounded-xl bg-white/5 border-2 border-white/10 text-white text-base font-bold tracking-wide text-center outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 transition-all"
                          placeholder=""
                          dir="ltr"
                          autoFocus
                          autoComplete="username"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleConfirmStep2Username()}
                        className="w-full py-4 rounded-xl text-lg font-black flex items-center justify-center gap-3 bg-indigo-600 text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20"
                      >
                        تأیید نام کاربری و ادامه <ChevronLeft size={22} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLoginStep(1);
                          setLoginError('');
                          setLoginShopRolesPool([]);
                          setLoginStep2UsernameOk(false);
                          setShopRolesResult([]);
                        }}
                        className="w-full text-center text-slate-400 hover:text-white text-sm transition-colors"
                      >
                        بازگشت به کد فروشگاه
                      </button>
                    </>
                  ) : (
                    <>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-200 block">نام نقش</label>
                    <input
                      readOnly
                      value={loginUsernameInput}
                      className="w-full px-5 py-3.5 rounded-xl bg-white/5 border-2 border-white/10 text-white text-base font-bold tracking-wide text-center outline-none cursor-default opacity-95"
                      placeholder=""
                      dir="ltr"
                      autoComplete="username"
                      aria-readonly="true"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setLoginStep2UsernameOk(false);
                        setShopRolesResult([]);
                        setRolePassInput('');
                        setLoginError('');
                      }}
                      className="text-xs font-bold text-indigo-300 hover:text-indigo-200 transition-colors w-full text-center"
                    >
                      تغییر نام نقش
                    </button>
                  </div>

                  {loginError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-bold flex items-center gap-3">
                      <AlertTriangle size={18} /> {loginError}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-200 block">رمز نقش</label>
                    <div className="relative">
                      <input
                        type={showRolePassInput ? 'text' : 'password'}
                        value={rolePassInput}
                        onChange={e => { setRolePassInput(e.target.value); setLoginError(''); }}
                        onKeyDown={e => e.key === 'Enter' && !isLoggingIn && handleRoleLogin()}
                        className="w-full px-5 py-3.5 rounded-xl bg-white/5 border-2 border-white/10 text-white text-lg font-bold tracking-widest text-center outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 transition-all"
                        dir="ltr" placeholder="••••••" autoFocus={loginStep2UsernameOk} />
                      <button type="button" onClick={() => setShowRolePassInput(!showRolePassInput)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                        {showRolePassInput ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-200 block">نام دستگاه (اختیاری)</label>
                    <input
                      type="text"
                      value={deviceNameInput}
                      onChange={(e) => setDeviceNameInput(e.target.value)}
                      placeholder="مثال: Office Laptop"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-indigo-400"
                    />
                  </div>
                  {RECAPTCHA_SITE_KEY ? (
                    <div className="space-y-1">
                      <div className="flex justify-center py-1">
                        <ReCAPTCHA
                          ref={loginCaptchaRef}
                          sitekey={RECAPTCHA_SITE_KEY}
                          theme="dark"
                          onChange={(token) => setLoginCaptchaToken(token || '')}
                          onExpired={() => setLoginCaptchaToken('')}
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 text-center leading-relaxed px-1">{t('login_captcha_hint')}</p>
                    </div>
                  ) : null}

                  <button type="button" onClick={handleRoleLogin}
                    disabled={
                      isLoggingIn ||
                      !loginStep2UsernameOk ||
                      !rolePassInput.trim() ||
                      shopRolesResult.length === 0 ||
                      (shopRolesResult[0]?.status === 'inactive')
                    }
                    className="w-full py-4 rounded-xl text-lg font-black flex items-center justify-center gap-3 bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-60 transition-all shadow-lg shadow-indigo-500/20">
                    {isLoggingIn
                      ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <>ورود <LogIn size={22} /></>}
                  </button>

                  <button type="button" onClick={() => { setLoginStep(1); setLoginError(''); setRolePassInput(''); setShopRolesResult([]); setLoginShopRolesPool([]); setLoginStep2UsernameOk(false); }}
                    className="w-full text-center text-slate-400 hover:text-white text-sm transition-colors">
                    تغییر فروشگاه / نام کاربری
                  </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          </div>
          {googleModal}
        </div>
      </div>
      {showForgotModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowForgotModal(false)}
        >
          <div
            className="bg-slate-900 border border-white/15 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            dir="rtl"
          >
            <div className="flex items-center gap-2 text-white font-black mb-3">
              <KeyRound className="text-amber-400 shrink-0" size={22} />
              بازیابی رمز عبور
            </div>
            <p className="text-slate-300 text-sm leading-relaxed mb-4">
              رمز <strong className="text-white">فروشگاه</strong> و رمز هر <strong className="text-white">نقش</strong> جدا هستند. بازنشانی خودکار از طریق ایمیل در نسخهٔ فعلی فعال نیست؛ مسیرهای پیشنهادی:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-xs text-slate-400 mb-4 text-right leading-relaxed">
              <li>از مدیر همان فروشگاه بخواهید در <strong className="text-slate-200">تنظیمات → کاربران فروشگاه</strong> رمز نقش را عوض کند.</li>
              <li>برای حساب جدید، از <Link to="/register" onClick={() => setShowForgotModal(false)} className="text-indigo-300 font-bold hover:underline">ثبت‌نام</Link> استفاده کنید.</li>
              <li>درخواست کمک از <strong className="text-slate-200">پشتیبانی دکان‌یار</strong> (واتساپ).</li>
            </ol>
            <div className="flex flex-col gap-2">
              <a
                href={supportWhatsAppUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600/30 border border-emerald-500/40 text-emerald-100 text-sm font-black hover:bg-emerald-600/50 transition-colors"
              >
                <LifeBuoy size={18} /> تماس با پشتیبانی (واتساپ)
              </a>
              <Link
                to="/register"
                onClick={() => setShowForgotModal(false)}
                className="text-center py-2.5 rounded-xl border border-white/15 text-sm font-bold text-indigo-200 hover:bg-white/5 transition-colors"
              >
                رفتن به ثبت‌نام
              </Link>
              <button type="button" onClick={() => setShowForgotModal(false)} className="py-2.5 text-slate-400 text-sm hover:text-white transition-colors">
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
      </>
    );
  }

  // REGISTER PAGE
  if (view === 'register') {
    const stepLabels = ['انتخاب طرح', 'مشخصات فروشگاه', 'نوع کسب‌وکار', 'روش پرداخت'];

    return (
      <div className={`min-h-screen font-vazir selection:bg-indigo-100 selection:text-indigo-900 relative overflow-hidden`} dir="rtl">
        <AuthPremiumBackground scene="register" />
        <header className="relative z-10 bg-black/20 backdrop-blur-sm border-b border-white/10">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-4 min-w-0">
              <button onClick={() => setView('landing')} className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors border border-white/20 shrink-0">
                <ChevronRight size={20} />
              </button>
              <span className={`font-extrabold text-xl text-white truncate`}>درخواست حساب جدید</span>
            </div>
            <button
              type="button"
              onClick={() => setView('download')}
              className="shrink-0 text-sm font-bold text-emerald-300 hover:text-emerald-200 border border-emerald-500/40 rounded-xl px-3 py-2 bg-emerald-500/10"
            >
              دانلود اپ
            </button>
          </div>
        </header>

        <div
          className={`relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 gap-8 px-4 py-10 transition-all duration-500 xl:items-start ${
            registerStep === 1 || registerStep === 4
              ? ''
              : 'xl:grid-cols-[minmax(360px,480px)_minmax(0,1fr)] xl:gap-12'
          }`}
        >
          {registerStep > 1 && registerStep !== 4 ? (
            <div className="order-2 hidden w-full max-w-[min(100%,420px)] min-h-[min(48vh,380px)] mx-auto xl:order-1 xl:mx-0 xl:block xl:max-w-[min(100%,440px)] xl:min-h-0">
              <div className="sticky top-10">
                <AuthHeroVideoCard
                  scene={registerStep === 2 ? 'shop' : registerStep === 3 ? 'business' : 'plan'}
                  className="aspect-[4/5] min-h-[min(48vh,380px)] w-full xl:aspect-auto xl:min-h-[min(68vh,560px)] 2xl:min-h-[min(72vh,620px)]"
                />
              </div>
            </div>
          ) : null}
          <div
            className={`order-1 mx-auto w-full min-w-0 xl:order-2 ${
              registerStep === 1 ? 'max-w-6xl' : registerStep === 4 ? 'max-w-7xl' : 'max-w-5xl'
            } xl:mx-0 xl:max-w-none ${
              registerStep === 1 || registerStep === 4 ? '' : 'xl:ps-6 xl:translate-x-0'
            }`}
          >
          {/* Progress */}
          <div className="mb-10 px-2 max-w-5xl mx-auto xl:max-w-none">
            <div className="flex items-start justify-between gap-1 sm:gap-2 relative">
              <div className="absolute top-4 sm:top-5 left-4 right-4 sm:left-8 sm:right-8 h-1 bg-white/10 rounded-full -z-10" />
              <div
                className="absolute top-4 sm:top-5 right-4 sm:right-8 h-1 bg-indigo-500 rounded-full -z-10 transition-all duration-500"
                style={{ width: `${((registerStep - 1) / 3) * 100}%`, maxWidth: 'calc(100% - 2rem)' }}
              />
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex flex-col items-center flex-1 min-w-0">
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[11px] sm:text-sm font-bold transition-all duration-300 shadow-sm ${
                      registerStep >= s ? 'bg-indigo-600 text-white ring-2 sm:ring-4 ring-indigo-900/50' : 'bg-black/20 text-slate-300 border border-white/10'
                    }`}
                  >
                    {registerStep > s ? <Check size={16} className="sm:w-[18px] sm:h-[18px]" /> : s}
                  </div>
                  <span
                    className={`text-[9px] sm:text-xs font-bold mt-2 text-center leading-tight px-0.5 transition-colors ${registerStep >= s ? 'text-white' : 'text-slate-500'}`}
                  >
                    {stepLabels[s - 1]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {registerStep !== 4 ? (
          <div className={`p-6 sm:p-10 rounded-3xl auth-form-shell border border-white/10`}>
            {/* Step 1 - Pricing */}
            {registerStep === 1 && (
              <div className="animate-fadeIn text-center">
                <h3 className={`text-3xl font-black mb-3 text-white`}>طرح‌های اشتراک</h3>
                <p className={`text-sm mb-10 text-slate-300`}>انتخاب طرح مناسب برای نیاز شما</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {visiblePlans.map(plan => {
                    const isSelected = regData.plan === plan.id;
                    const isPremium = plan.id === 'premium_annual';
                    
                    return (
                      <div key={plan.id} 
                        className={`flex flex-col p-6 rounded-3xl border-2 text-center transition-all duration-300 relative overflow-hidden group hover:-translate-y-2 hover:shadow-2xl ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-500/10 shadow-xl shadow-indigo-500/20 scale-105 z-10'
                            : 'border-white/10 bg-black/40 hover:border-indigo-500/50 hover:bg-white/5'
                        }`}>
                        {isSelected && (
                          <div className="absolute top-0 right-0 w-20 h-20 overflow-hidden z-10 pointer-events-none">
                            <div className="absolute transform rotate-45 bg-indigo-500 text-white text-[10px] font-bold py-1 right-[-45px] top-[15px] w-[120px] text-center shadow-lg">انتخاب شده</div>
                          </div>
                        )}
                        
                        <div className="mb-4">
                          <div className="h-6 mb-3">
                            {plan.badge && <span className={`inline-block text-[10px] px-3 py-1 rounded-full font-black tracking-widest uppercase ${isPremium ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white/10 text-slate-200'}`}>{plan.badge}</span>}
                          </div>
                          <h4 className={`font-black text-xl mb-1 ${isSelected ? 'text-white' : 'text-slate-100'}`}>{plan.name}</h4>
                          <span className={`text-xs font-bold ${isSelected ? 'text-indigo-300' : 'text-slate-400'}`}>{plan.nameEn}</span>
                        </div>
                        
                        <div className="mb-6 flex items-baseline justify-center gap-1">
                          <span className={`font-black text-4xl ${isSelected ? 'text-indigo-400' : 'text-emerald-400'}`}>{plan.price}</span>
                          <span className={`text-sm font-bold ${isSelected ? 'text-indigo-500' : 'text-slate-500'}`}>/ {plan.period}</span>
                        </div>
                        
                        <div className="flex flex-col gap-3 mb-8 flex-1 text-right">
                          {plan.features.map((f, i) => (
                            <span key={i} className={`text-xs font-bold flex items-start gap-2 ${isSelected ? 'text-indigo-100' : 'text-slate-300'}`}>
                              <Check size={14} className={`shrink-0 mt-0.5 ${isSelected ? 'text-indigo-400' : 'text-emerald-500'}`} /> {f}
                            </span>
                          ))}
                        </div>
                        
                        <button 
                          onClick={() => {
                            setRegData({ ...regData, plan: plan.id });
                            if (plan.id === 'free') {
                              setDemoError('');
                              setDemoRegisterCredentials(null);
                              setDemoRegPhase('form');
                              setDemoBusinessType(DEFAULT_BUSINESS_TYPE);
                              setView('demo-register');
                            } else {
                              setRegisterStep(2);
                            }
                          }}
                          className={`w-full py-3.5 rounded-xl text-sm font-black transition-all mt-auto ${
                            isSelected 
                              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-500' 
                              : isPremium
                                ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-500/20'
                                : 'bg-white/10 text-white hover:bg-indigo-600 hover:text-white border border-white/10 hover:border-indigo-500'
                          }`}
                        >
                          {plan.id === 'free' ? `🚀 ${t('demo_free')}` : `انتخاب ${plan.name}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2 — مشخصات فروشگاه (مشابه ثبت‌نام آزمایشی) */}
            {registerStep === 2 && (
              <div className="animate-fadeIn">
                <div className="flex items-center gap-3 mb-2">
                  <button type="button" onClick={() => setRegisterStep(1)} className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10 transition-colors">
                    <ChevronRight size={20} />
                  </button>
                  <h3 className="text-2xl font-extrabold text-white">مشخصات فروشگاه و مدیر</h3>
                </div>
                <p className="text-sm mb-6 text-slate-300 leading-relaxed">
                  نام فروشگاه، موبایل، رمز مدیر و در صورت تمایل ایمیل را وارد کنید؛ سپس نوع کسب‌وکار و پایگاه داده را انتخاب می‌کنید و به پرداخت می‌روید.
                </p>

                <div className="space-y-4 mb-8">
                  <div>
                    <label className="text-sm font-bold block mb-2 text-slate-200">نام فروشگاه</label>
                    <input
                      value={regData.shopName}
                      onChange={(e) => setRegData({ ...regData, shopName: e.target.value })}
                      className={`w-full px-4 py-3.5 rounded-xl text-sm bg-white/5 border-2 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 transition-all ${formErrors.shopName ? 'border-rose-500/50' : ''}`}
                      placeholder=""
                    />
                    {formErrors.shopName && <p className="text-xs text-rose-400 mt-1.5">{formErrors.shopName}</p>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-bold block mb-2 text-slate-200">نام</label>
                      <input
                        value={regData.ownerFirstName}
                        onChange={(e) => setRegData({ ...regData, ownerFirstName: e.target.value })}
                        className={`w-full px-4 py-3.5 rounded-xl text-sm bg-white/5 border-2 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-400 transition-all ${formErrors.ownerFirstName ? 'border-rose-500/50' : ''}`}
                        placeholder=""
                      />
                      {formErrors.ownerFirstName && <p className="text-xs text-rose-400 mt-1.5">{formErrors.ownerFirstName}</p>}
                    </div>
                    <div>
                      <label className="text-sm font-bold block mb-2 text-slate-200">نام خانوادگی</label>
                      <input
                        value={regData.ownerFamily}
                        onChange={(e) => setRegData({ ...regData, ownerFamily: e.target.value })}
                        className={`w-full px-4 py-3.5 rounded-xl text-sm bg-white/5 border-2 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-400 transition-all ${formErrors.ownerFamily ? 'border-rose-500/50' : ''}`}
                        placeholder=""
                      />
                      {formErrors.ownerFamily && <p className="text-xs text-rose-400 mt-1.5">{formErrors.ownerFamily}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-bold block mb-2 text-slate-200">شماره موبایل</label>
                    <input
                      value={regData.phone}
                      onChange={(e) => setRegData({ ...regData, phone: e.target.value })}
                      className={`w-full px-4 py-3.5 rounded-xl text-sm bg-white/5 border-2 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-400 text-left transition-all ${formErrors.phone ? 'border-rose-500/50' : ''}`}
                      placeholder="07xxxxxxx"
                      dir="ltr"
                      inputMode="tel"
                      autoComplete="tel"
                    />
                    {formErrors.phone && <p className="text-xs text-rose-400 mt-1.5">{formErrors.phone}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-bold block mb-2 text-slate-200">ایمیل (اختیاری)</label>
                    <input
                      type="email"
                      value={regData.email}
                      onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                      className={`w-full px-4 py-3.5 rounded-xl text-sm bg-white/5 border-2 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-400 text-left transition-all ${formErrors.email ? 'border-rose-500/50' : ''}`}
                      placeholder=""
                      dir="ltr"
                    />
                    {formErrors.email && <p className="text-xs text-rose-400 mt-1.5">{formErrors.email}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-bold block mb-2 text-slate-200">رمز مدیر / ورود (حداقل ۸ کاراکتر و قوی)</label>
                    <div className="relative">
                      <input
                        type={showRegisterPwd ? 'text' : 'password'}
                        value={regData.password}
                        onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                        className={`w-full px-4 py-3.5 pl-12 rounded-xl text-sm bg-white/5 border-2 border-white/10 text-white placeholder:text-slate-400 focus:border-indigo-400 text-left transition-all ${formErrors.password ? 'border-rose-500/50' : ''}`}
                        dir="ltr"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegisterPwd(!showRegisterPwd)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showRegisterPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {formErrors.password && <p className="text-xs text-rose-400 mt-1.5">{formErrors.password}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-bold block mb-2 text-slate-200">تکرار رمز</label>
                    <input
                      type={showRegisterPwd ? 'text' : 'password'}
                      value={regData.password2}
                      onChange={(e) => setRegData({ ...regData, password2: e.target.value })}
                      className={`w-full px-4 py-3.5 rounded-xl text-sm bg-white/5 border-2 border-white/10 text-white placeholder:text-slate-400 focus:border-indigo-400 text-left transition-all ${formErrors.password2 ? 'border-rose-500/50' : ''}`}
                      dir="ltr"
                      autoComplete="new-password"
                    />
                    {formErrors.password2 && <p className="text-xs text-rose-400 mt-1.5">{formErrors.password2}</p>}
                  </div>
                </div>

                <div className="flex gap-4">
                  <button type="button" onClick={() => setRegisterStep(1)} className="flex-1 py-4 rounded-xl font-bold flex items-center justify-center gap-2 bg-white/10 text-white hover:bg-white/20 border border-white/20">
                    <ChevronRight size={20} /> بازگشت
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const errors: Record<string, string> = {};
                      if (!regData.shopName.trim()) errors.shopName = 'نام فروشگاه الزامی است';
                      if (!regData.ownerFirstName.trim()) errors.ownerFirstName = 'نام الزامی است';
                      if (!regData.ownerFamily.trim()) errors.ownerFamily = 'نام خانوادگی الزامی است';
                      const phoneDigits = regData.phone.replace(/\D/g, '');
                      if (phoneDigits.length < 9) errors.phone = 'شماره موبایل معتبر وارد کنید';
                      if (regData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regData.email.trim())) errors.email = 'فرمت ایمیل نادرست است';
                      const passErr = validatePasswordPolicy(regData.password);
                      if (passErr) errors.password = passErr;
                      if (regData.password !== regData.password2) errors.password2 = 'تکرار رمز با رمز اول یکسان نیست';
                      if (Object.keys(errors).length > 0) {
                        setFormErrors(errors);
                        return;
                      }
                      setFormErrors({});
                      setRegisterStep(3);
                    }}
                    className="flex-1 py-4 rounded-xl font-bold flex items-center justify-center gap-2 bg-indigo-600 text-white hover:bg-indigo-500"
                  >
                    ادامه <ChevronLeft size={20} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3 — نوع کسب‌وکار */}
            {registerStep === 3 && (
              <div className="animate-fadeIn space-y-5">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setRegisterStep(2)} className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10 transition-colors">
                    <ChevronRight size={20} />
                  </button>
                  <div>
                    <h3 className="text-xl font-black text-white">نوع کسب‌وکار</h3>
                    <p className="text-slate-400 text-sm mt-1 leading-relaxed">
                      نوع کسب‌وکار را انتخاب کنید؛ سپس روش پرداخت را مشخص می‌کنید. پس از تأیید پرداخت، کد فروشگاه و رمزها برای شما صادر می‌شود.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  {ONBOARDING_BUSINESS_TYPES.filter((bt) => bt.isActive).map((bt) => {
                    const IconComp = ONBOARDING_LUCIDE[bt.lucideIcon];
                    const sel = regData.businessType === bt.id;
                    return (
                      <button
                        key={bt.id}
                        type="button"
                        onClick={() => {
                          if (!bt.isActive) return;
                          setRegData({ ...regData, businessType: bt.id });
                        }}
                        disabled={!bt.isActive}
                        className={`group relative flex flex-col overflow-hidden rounded-2xl border p-0 text-right transition-all duration-300 ${
                          sel
                            ? 'border-indigo-400/80 bg-slate-900/80 shadow-xl ring-1 ring-indigo-400/40 hover:-translate-y-1'
                            : bt.isActive
                              ? 'border-white/10 bg-white/[0.04] hover:border-indigo-400/45 hover:bg-white/[0.07] hover:-translate-y-1 hover:shadow-lg'
                              : 'border-white/10 bg-white/[0.03] opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <div className="relative h-32 sm:h-36 w-full shrink-0">
                          {bt.cardCoverImage ? (
                            <img
                              src={bt.cardCoverImage}
                              alt=""
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                              loading="lazy"
                            />
                          ) : (
                            <div className={`h-full w-full bg-gradient-to-br ${bt.accent}`} />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/25 to-transparent" />
                          {sel ? (
                            <span className="absolute top-2 left-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white text-[11px] font-black shadow-lg ring-2 ring-white/20">
                              ✓
                            </span>
                          ) : null}
                          {!bt.isActive ? (
                            <span className="absolute top-2 left-2 z-10 rounded-lg bg-slate-950/90 px-2 py-0.5 text-[8px] font-black text-slate-200 ring-1 ring-slate-500/50">
                              بزودی
                            </span>
                          ) : null}
                        </div>
                        <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-3.5">
                          <div
                            className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${bt.accent} shadow-md ring-1 ring-white/15`}
                          >
                            <IconComp size={20} className="text-white drop-shadow-md" strokeWidth={1.75} />
                          </div>
                          <p className="text-white font-black text-sm sm:text-base leading-snug">{bt.titleFa}</p>
                          <p className="text-slate-500 text-[10px] sm:text-[11px] font-mono truncate" dir="ltr">
                            {bt.titleEn}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setRegisterStep(2)} className="flex-1 py-3.5 rounded-xl font-bold bg-white/10 text-white hover:bg-white/20 border border-white/20 text-sm flex items-center justify-center gap-2">
                    <ChevronRight size={18} /> بازگشت
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!ACTIVE_BUSINESS_TYPE_IDS.has(regData.businessType)) return;
                      setRegisterPayUseAdvancedMethods(false);
                      setRegData((prev) => ({ ...prev, payMethod: 'other_try' }));
                      setRegisterStep(4);
                    }}
                    className="flex-1 py-3.5 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-500 text-sm flex items-center justify-center gap-2"
                  >
                    ادامه <ChevronLeft size={18} />
                  </button>
                </div>
              </div>
            )}

          </div>
          ) : (() => {
              const methodColors: Record<string, { accent: string; glow: string }> = {
                bank_transfer: { accent: '#10b981', glow: 'rgba(16,185,129,0.25)' },
                mpaisa: { accent: '#3b82f6', glow: 'rgba(59,130,246,0.25)' },
                mhawala: { accent: '#60a5fa', glow: 'rgba(96,165,250,0.25)' },
                mymoney: { accent: '#818cf8', glow: 'rgba(129,140,248,0.25)' },
                atoma_pay: { accent: '#22d3ee', glow: 'rgba(34,211,238,0.25)' },
                hesabpay: { accent: '#2dd4bf', glow: 'rgba(45,212,191,0.25)' },
                other_try: { accent: '#a78bfa', glow: 'rgba(167,139,250,0.25)' },
              };
              const mc = methodColors[regData.payMethod] || methodColors.other_try;
              const info = PAYMENT_INFO[regData.payMethod];
              const heroImageUrl = info?.image || PAYMENT_INFO.other_try.image;
              const defaultWa = '0795074175';
              const payInputCls =
                'w-full px-5 py-3.5 rounded-xl bg-white/5 border-2 border-white/10 text-white text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400';
              const advancedMethodChoices = paymentMethods.filter((m) => m.id !== 'other_try');
              return (
                <div className="animate-fadeIn mx-auto w-full max-w-6xl min-w-0 xl:max-w-[88rem]">
                  <div
                    className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:justify-between lg:gap-8 xl:gap-10"
                    dir="ltr"
                  >
                    {/* چپ: فقط خلاصه + فیلدهای تراکنش (طبق درخواست) */}
                    <div className="flex w-full flex-shrink-0 flex-col gap-4 lg:w-[400px] xl:w-[420px]">
                      <div className="auth-form-shell w-full rounded-2xl border border-white/10 bg-white/[0.04] p-3 shadow-lg shadow-black/20 sm:p-3.5">
                        <p className="text-center text-[10px] font-black uppercase tracking-widest text-indigo-300/90">خلاصه سفارش</p>
                        <p className="mt-1 text-center text-sm font-black leading-snug text-white sm:text-[0.95rem]">
                          {selectedPlan.name}
                        </p>
                        <p className="text-center text-[11px] text-slate-400">
                          <span dir="ltr" className="font-bold text-slate-200">
                            {selectedPlan.price}
                          </span>
                          <span className="text-slate-500"> / {selectedPlan.period}</span>
                        </p>
                        <p className="mt-1.5 truncate border-t border-white/10 pt-1.5 text-center text-[10px] text-slate-500">
                          فروشگاه:{' '}
                          <span className="font-medium text-slate-300" title={regData.shopName || ''}>
                            {regData.shopName || '—'}
                          </span>
                        </p>
                      </div>

                      {paymentError ? (
                        <div className="flex items-center gap-3 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2.5 text-xs font-bold text-rose-200 sm:text-sm">
                          <AlertTriangle size={16} className="shrink-0 sm:size-[18px]" /> {paymentError}
                        </div>
                      ) : null}

                      <div className="auth-form-shell space-y-4 rounded-[1.75rem] border border-white/10 p-5 shadow-xl shadow-black/30 sm:p-6">
                        <div className="flex items-start gap-2 border-b border-white/10 pb-3">
                          <button
                            type="button"
                            onClick={() => setRegisterStep(3)}
                            className="mt-0.5 shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/10"
                            aria-label="بازگشت"
                          >
                            <ChevronRight size={18} />
                          </button>
                          <div className="min-w-0 flex-1 text-right">
                            <h3 className="text-sm font-black text-white">جزئیات تراکنش شما</h3>
                            <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">
                              روش را از کارت‌های سمت راست انتخاب کنید؛ رسید یا شناسه را اینجا وارد کنید.
                            </p>
                          </div>
                        </div>
                        {selectedPayment?.id === 'other_try' ? (
                          <p className="text-center text-[11px] leading-relaxed text-slate-400">
                            پس از تماس یا واریز، در صورت نیاز یادداشت کوتاه بگذارید؛ یا برای روش دیگر همان فیلدهای رسید را پر کنید.
                          </p>
                        ) : null}
                        {selectedPayment && selectedPayment.fields.length > 0 ? (
                          <div className="space-y-3">
                            {selectedPayment.fields.map((field) => (
                              <div key={field.name} className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-200 sm:text-sm">{field.label}</label>
                                <input
                                  type={field.type}
                                  value={paymentValues[field.name] || ''}
                                  onChange={(e) => setPaymentValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
                                  placeholder={field.placeholder}
                                  className={payInputCls}
                                  dir="ltr"
                                />
                              </div>
                            ))}
                          </div>
                        ) : selectedPayment?.id !== 'other_try' ? (
                          <p className="text-center text-xs text-slate-400"> پس از واریز، در صورت نیاز با پشتیبانی هماهنگ کنید.</p>
                        ) : null}

                        <div className="space-y-2 border-t border-white/10 pt-4">
                          <button
                            type="button"
                            onClick={() => setRegisterStep(3)}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 py-3 text-sm font-bold text-white transition-colors hover:bg-white/20"
                          >
                            <ChevronRight size={18} /> بازگشت به نوع کسب‌وکار
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleSubmitPayment()}
                            disabled={isSubmittingPayment}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-base font-black text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-500 disabled:opacity-60 sm:py-4 sm:text-lg"
                          >
                            {isSubmittingPayment ? (
                              <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            ) : (
                              <>
                                <Check size={20} strokeWidth={2.5} /> تأیید و ارسال درخواست پرداخت
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="min-w-0 flex-1" dir="rtl">
                      <div className="auth-form-shell space-y-4 rounded-[1.75rem] border border-white/10 p-4 shadow-2xl shadow-black/35 sm:p-6 xl:sticky xl:top-6">
                        <div className="border-b border-white/10 pb-3 text-center">
                          <div className="mb-1 hidden justify-center sm:flex">
                            <BrandLogo size={40} variant="header" />
                          </div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300/90">دکان‌یار</p>
                          <h2 className="mt-1 text-base font-black text-white sm:text-lg">انتخاب روش پرداخت</h2>
                          <p className="mx-auto mt-1.5 max-w-md text-[11px] leading-relaxed text-slate-400">
                            روی کارت بزنید؛ توضیح و شمارهٔ واریز همان‌جا نمایش داده می‌شود.
                          </p>
                          <div className="mt-3 flex items-center justify-center gap-1.5 sm:gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-black text-white sm:h-6 sm:w-6">
                              ✓
                            </span>
                            <span className="h-0.5 w-4 rounded-full bg-emerald-500/80 sm:w-6" />
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-black text-white sm:h-6 sm:w-6">
                              ✓
                            </span>
                            <span className="h-0.5 w-4 rounded-full bg-indigo-500 sm:w-6" />
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-[9px] font-black text-white sm:h-6 sm:w-6">
                              ۳
                            </span>
                          </div>
                          <p className="mt-1 text-[9px] font-bold text-slate-500">مرحله پرداخت</p>
                        </div>

                        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                          <button
                            type="button"
                            onClick={() => setRegisterStep(3)}
                            className="shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/10"
                            aria-label="بازگشت"
                          >
                            <ChevronRight size={18} />
                          </button>
                          <p className="text-xs font-bold text-slate-300">مسیر پرداخت</p>
                        </div>

                        <div>
                          <p className="mb-2 text-[10px] font-bold text-slate-500">واتساپ / حواله داخلی یا سایر روش‌ها — {defaultWa}</p>
                          <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/12 bg-black/40 p-1">
                            <button
                              type="button"
                              className={`rounded-lg py-2.5 px-1.5 text-[11px] font-black leading-tight transition-all sm:text-xs ${
                                !registerPayUseAdvancedMethods
                                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
                              }`}
                              onClick={() => {
                                setRegisterPayUseAdvancedMethods(false);
                                setRegData((p) => ({ ...p, payMethod: 'other_try' }));
                              }}
                            >
                              واتساپ و حواله داخلی
                            </button>
                            <button
                              type="button"
                              className={`rounded-lg py-2.5 px-1.5 text-[11px] font-black leading-tight transition-all sm:text-xs ${
                                registerPayUseAdvancedMethods
                                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
                              }`}
                              onClick={() => {
                                setRegisterPayUseAdvancedMethods(true);
                                setRegData((p) => ({ ...p, payMethod: 'bank_transfer' }));
                              }}
                            >
                              سایر روش‌ها
                            </button>
                          </div>
                        </div>

                        {registerPayUseAdvancedMethods ? (
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                            {advancedMethodChoices.map((method) => {
                              const sel = regData.payMethod === method.id;
                              const imgUrl = PAYMENT_INFO[method.id]?.image || PAYMENT_INFO.bank_transfer.image;
                              const col = methodColors[method.id] || methodColors.bank_transfer;
                              return (
                                <button
                                  key={method.id}
                                  type="button"
                                  onClick={() => setRegData((p) => ({ ...p, payMethod: method.id }))}
                                  className={`group relative min-h-[7.75rem] overflow-hidden rounded-[1.75rem] border text-right shadow-xl transition-all duration-300 sm:min-h-[8.5rem] ${
                                    sel
                                      ? 'border-indigo-400/80 bg-white/[0.08] ring-2 ring-indigo-400/35 shadow-indigo-900/20'
                                      : 'border-white/10 bg-white/[0.04] hover:border-indigo-400/45 hover:bg-white/[0.07]'
                                  }`}
                                  style={{ boxShadow: sel ? `0 16px 48px -12px ${col.glow}` : undefined }}
                                >
                                  <img
                                    src={imgUrl}
                                    alt=""
                                    className="absolute inset-0 h-full w-full object-cover opacity-45 transition-opacity duration-300 group-hover:opacity-55"
                                    loading="lazy"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-900/75 to-slate-900/35" />
                                  <div className="relative z-[1] flex h-full min-h-[7.75rem] flex-col justify-end p-3.5 text-right sm:min-h-[8.5rem] sm:p-4">
                                    <p className="text-[11px] font-black leading-snug text-white sm:text-xs">{method.name}</p>
                                    <p className="mt-1 line-clamp-2 text-[9px] font-bold text-slate-300 sm:text-[10px]">{method.company}</p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setRegisterPayUseAdvancedMethods(false);
                              setRegData((p) => ({ ...p, payMethod: 'other_try' }));
                            }}
                            className={`relative min-h-[9rem] w-full overflow-hidden rounded-[1.75rem] border text-right shadow-xl transition-all duration-300 sm:min-h-[10rem] ${
                              regData.payMethod === 'other_try'
                                ? 'border-indigo-400/80 bg-white/[0.08] ring-2 ring-indigo-400/35'
                                : 'border-white/10 bg-white/[0.04] hover:border-indigo-400/45 hover:bg-white/[0.07]'
                            }`}
                          >
                            <img
                              src={PAYMENT_INFO.other_try.image}
                              alt=""
                              className="absolute inset-0 h-full w-full object-cover opacity-40 transition-opacity duration-300 hover:opacity-50"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-indigo-950/65 to-transparent" />
                            <div className="relative z-[1] flex min-h-[9rem] flex-col justify-end p-4 text-right sm:min-h-[10rem] sm:p-5">
                              <p className="text-sm font-black text-white sm:text-base">پشتیبانی و واتساپ</p>
                              <p className="mt-1.5 text-[11px] font-bold text-slate-300">پشتیبانی مستقیم — {defaultWa}</p>
                            </div>
                          </button>
                        )}

                        <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                          <label className="block text-xs font-bold text-slate-200">مقصد / شناسه واریز</label>
                          <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-left">
                            <p className="font-mono text-sm font-black tracking-wide break-all text-white" dir="ltr">
                              {selectedPayment?.id === 'other_try' ? defaultWa : selectedPayment?.number}
                            </p>
                          </div>
                          {selectedPayment ? (
                            <p className="text-center text-[11px] font-bold text-slate-400">{selectedPayment.name}</p>
                          ) : null}
                          {selectedPayment?.id === 'other_try' ? (
                            <a
                              href={`https://wa.me/93${defaultWa.replace(/^0/, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2 rounded-lg border border-emerald-500/35 bg-emerald-500/10 py-2 text-[11px] font-bold text-emerald-200 transition-colors hover:bg-emerald-500/20"
                            >
                              باز کردن واتساپ همین شماره
                            </a>
                          ) : null}
                        </div>

                        {info ? (
                          <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3.5 sm:p-4">
                            <p className="text-justify text-[11px] leading-7 text-slate-300 sm:text-sm">{info.description}</p>
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">مراحل پیشنهادی</p>
                            <ol className="space-y-2">
                              {info.steps.map((st, i) => (
                                <li key={i} className="flex gap-2 text-[11px] leading-relaxed text-slate-300 sm:text-sm">
                                  <span
                                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-black"
                                    style={{ backgroundColor: `${mc.accent}22`, color: mc.accent }}
                                  >
                                    {i + 1}
                                  </span>
                                  <span className="pt-0.5">{st}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        ) : null}
                        {selectedPayment?.hint ? (
                          <p className="text-center text-[10px] leading-relaxed text-slate-500 sm:text-[11px]">{selectedPayment.hint}</p>
                        ) : null}
                        {selectedPayment?.id === 'other_try' ? (
                          <div className="space-y-2 rounded-xl border border-violet-500/25 bg-violet-500/10 p-3.5">
                            <p className="text-xs font-black text-violet-200">پشتیبانی مستقیم</p>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-200 sm:text-sm">
                              <span className="flex items-center gap-1.5" dir="ltr">
                                <Phone size={14} className="text-violet-400" />
                                {defaultWa}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Facebook size={14} className="text-blue-400" />
                                Smarthub digital solutions
                              </span>
                            </div>
                          </div>
                        ) : null}

                        <div className="relative mt-1 min-h-[200px] overflow-hidden rounded-xl border border-white/10 sm:min-h-[240px]">
                          <img
                            src={heroImageUrl}
                            alt=""
                            className="pay-method-card-media pointer-events-none absolute inset-0 h-full w-full object-cover opacity-85"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-slate-950/35" aria-hidden />
                          <div className="relative z-10 flex min-h-[200px] flex-col sm:min-h-[240px]">
                            <AuthHeroVideoCard
                              scene="payment"
                              hideCaption
                              useSceneBackdrop={false}
                              className="min-h-[inherit] flex-1 border-0 !bg-slate-950/40 shadow-none backdrop-blur-[2px]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
        </div>
        </div>
        {googleModal}
      </div>
    );
  }

  return null;
};

export default WelcomePage;
