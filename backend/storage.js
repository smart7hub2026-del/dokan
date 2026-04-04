import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { validateShopCustomersArray } from './customerValidation.js';
import {
  loadStateByShopFromRelational,
  migrateLegacyStateByShopTx,
  persistStateByShopTx,
  preparePlatformStateBlob,
  refreshShopStateVersions,
  backfillCustomersFromShopPayload,
} from './stateByShopPersistence.js';

/** لوکال: Docker Compose (postgres:16). تست: معمولاً dokanyar_test از طریق env Vitest. */
const DEFAULT_DEV_DATABASE_URL =
  'postgresql://postgres:postgres@127.0.0.1:5432/dokanyar';

if (!String(process.env.DATABASE_URL || '').trim()) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'DATABASE_URL must be set to a PostgreSQL connection string (e.g. from Render Postgres or Neon).',
    );
  }
  process.env.DATABASE_URL = DEFAULT_DEV_DATABASE_URL;
}

const resolvedDatabaseUrl = String(process.env.DATABASE_URL || '').trim();
if (process.env.NODE_ENV === 'production' && resolvedDatabaseUrl) {
  const u = resolvedDatabaseUrl.toLowerCase();
  if (u.startsWith('file:') || u.startsWith('sqlite:')) {
    throw new Error(
      'DATABASE_URL in production must be PostgreSQL; file: or sqlite: URLs are not allowed (ephemeral disk would lose data).',
    );
  }
}

/** Prisma 7: اتصال PostgreSQL فقط با driver adapter (نه `new PrismaClient()` خالی). */
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: resolvedDatabaseUrl }),
});
let writeQueue = Promise.resolve();

/**
 * تراکنش تعاملی Prisma پیش‌فرض timeout=5000ms است؛ ذخیرهٔ پلتفرم (همهٔ Shop + stateByShop)
 * روی دادهٔ زیاد یا شبکهٔ کند (مثلاً Render) از آن بیشتر طول می‌کشد و ورود/ثبت‌نام خطا می‌دهد.
 */
const LONG_PRISMA_TRANSACTION = {
  maxWait: 30_000,
  timeout: 120_000,
};

/** تبدیل خطای یکتایی DB به پیام امن برای کاربر (بدون جزئیات فنی). */
function rethrowIfDuplicateActiveCustomerPhone(err) {
  if (!err || err.code !== 'P2002') throw err;
  const targets = Array.isArray(err.meta?.target) ? err.meta.target : [];
  const t = targets.map(String).join(' ').toLowerCase();
  const idx = String(err.meta?.constraint || err.meta?.modelName || '').toLowerCase();
  if (
    t.includes('phone_key') ||
    t.includes('phone') ||
    idx.includes('shop_customers') ||
    idx.includes('active_phone')
  ) {
    const e = new Error('DUPLICATE_ACTIVE_CUSTOMER_PHONE');
    e.code = 'DUPLICATE_CUSTOMER_PHONE';
    e.messageFa = 'در این دکان مشتری فعال دیگری با همین شماره موبایل ثبت شده است.';
    throw e;
  }
  throw err;
}

const PLATFORM_STATE_ID = 1;

/** جایگزینی کامل جداول Shop / ShopUser داخل تراکنش ارسالی. */
async function persistShopsFullReplaceTx(tx, shops) {
  const list = Array.isArray(shops) ? shops : [];
  await tx.shopUser.deleteMany();
  await tx.shop.deleteMany();
  for (const shop of list) {
    if (!shop || shop.code == null) continue;
    const code = String(shop.code).trim().toUpperCase();
    if (!code) continue;
    const tid = Number(shop.tenantId);
    if (!Number.isFinite(tid)) {
      throw new Error(`[storage] shop "${code}" has invalid tenantId`);
    }
    const users = Array.isArray(shop.users) ? shop.users : [];
    const { users: _drop, ...shopRest } = shop;
    /** ردیف Shop اول؛ سپس ShopUser با shopCode صریح — nested create گاهی FK را با adapter/pg خراب می‌کند */
    await tx.shop.create({
      data: {
        code,
        tenantId: tid,
        payload: { ...shopRest, code },
      },
    });
    if (users.length > 0) {
      await tx.shopUser.createMany({
        data: users.map((u) => {
          const id = Number(u.id);
          if (!Number.isFinite(id)) {
            throw new Error(`[storage] user in shop "${code}" has invalid id`);
          }
          return { id, shopCode: code, payload: u };
        }),
      });
    }
  }
}

async function persistShopsFullReplace(shops) {
  await prisma.$transaction(
    async (tx) => {
      await persistShopsFullReplaceTx(tx, shops);
    },
    LONG_PRISMA_TRANSACTION,
  );
}

async function loadShopsFromRelational() {
  const rows = await prisma.shop.findMany({
    include: { users: true },
    orderBy: { tenantId: 'asc' },
  });
  return rows.map((s) => {
    const uList = (s.users || [])
      .slice()
      .sort((a, b) => a.id - b.id)
      .map((u) => {
        const p = u.payload && typeof u.payload === 'object' ? u.payload : {};
        return { ...p, id: u.id };
      });
    const p = s.payload && typeof s.payload === 'object' ? s.payload : {};
    return {
      ...p,
      code: s.code,
      tenantId: s.tenantId,
      users: uList,
    };
  });
}

/**
 * اگر ردیفی در Shop هست → بارگذاری از PG.
 * وگرنه اگر در JSON هنوز shops[] هست → یک‌بار مهاجرت به PG و خالی کردن shops در سند state.
 */
async function hydrateShops(db) {
  const count = await prisma.shop.count();
  if (count > 0) {
    db.shops = await loadShopsFromRelational();
    return;
  }
  const fromJson = Array.isArray(db.shops) ? db.shops : [];
  if (fromJson.length > 0) {
    await persistShopsFullReplace(fromJson);
    const stateBlob = { ...db, shops: [] };
    await prisma.platformState.update({
      where: { id: PLATFORM_STATE_ID },
      data: { state: stateBlob },
    });
    db.shops = await loadShopsFromRelational();
    return;
  }
  db.shops = [];
}

/** stateByShop از جداول؛ مهاجرت یک‌باره از JSON قدیمی. */
async function hydrateStateByShop(db) {
  const n = await prisma.shopStateRow.count();
  const legacyRaw = db.stateByShop && typeof db.stateByShop === 'object' ? db.stateByShop : {};
  const legacy = { ...legacyRaw };
  if (n === 0 && Object.keys(legacy).length > 0) {
    await prisma.$transaction(
      async (tx) => {
        await migrateLegacyStateByShopTx(tx, db, legacy, PLATFORM_STATE_ID);
      },
      LONG_PRISMA_TRANSACTION,
    );
  }
  const n2 = await prisma.shopStateRow.count();
  if (n2 > 0) {
    await backfillCustomersFromShopPayload(prisma);
    db.stateByShop = await loadStateByShopFromRelational(prisma);
    await refreshShopStateVersions(prisma, db);
  } else {
    db.stateByShop = {};
    db.__shopStateVersions = {};
  }
}

const USE_DEV_DEFAULTS = process.env.NODE_ENV !== 'production';

/** یک رمز برای هر سه: سوپرادمین، کد ریست، pending — روی Render فقط همین را بگذار اگر سه متغیر جدا سخت است */
const seedBootstrap = String(process.env.SEED_BOOTSTRAP || '').trim();
const SEED_KEYS_FROM_BOOTSTRAP = new Set([
  'SEED_SUPERADMIN_PASSWORD',
  'SEED_RESET_CODE',
  'SEED_PENDING_USER_PASSWORD',
]);

const envOrDefault = (key, defaultValue) => {
  const raw = process.env[key];
  if (raw != null && String(raw).trim() !== '') return String(raw).trim();
  if (USE_DEV_DEFAULTS) return defaultValue;
  if (seedBootstrap && SEED_KEYS_FROM_BOOTSTRAP.has(key)) return seedBootstrap;
  throw new Error(
    `${key} is required in production. Render → Environment: set ${key} (no empty value) OR set SEED_BOOTSTRAP to one strong password for superadmin + reset + pending.`,
  );
};

const seedDatabase = () => {
  const superPasswordHash = bcrypt.hashSync(envOrDefault('SEED_SUPERADMIN_PASSWORD', 'super-secret-2026'), 10);
  const defaultResetCodeHash = bcrypt.hashSync(envOrDefault('SEED_RESET_CODE', '12345678'), 10);

  const shops = [
    {
      code: 'SUPERADMIN',
      name: 'Platform',
      tenantId: 0,
      passwordHash: superPasswordHash,
      users: [
        {
          id: 0,
          username: 'superadmin',
          full_name: 'مدیر پلتفرم',
          role: 'super_admin',
          passwordHash: superPasswordHash,
          status: 'active',
        },
      ],
    },
  ];

  /** در تست خودکار یک دکان نمونه لازم است؛ در dev/production پیش‌فرض فقط پلتفرم */
  if (process.env.NODE_ENV === 'test') {
    const shopPasswordHash = bcrypt.hashSync(envOrDefault('SEED_SHOP001_PASSWORD', 'shop123'), 10);
    const defaultRolePassword = envOrDefault('SEED_DEFAULT_ROLE_PASSWORD', '1234');
    const rolePasswords = {
      admin: bcrypt.hashSync(defaultRolePassword, 10),
      seller: bcrypt.hashSync(defaultRolePassword, 10),
      stock_keeper: bcrypt.hashSync(defaultRolePassword, 10),
      accountant: bcrypt.hashSync(defaultRolePassword, 10),
    };
    const pendingOnlyHash = bcrypt.hashSync(envOrDefault('SEED_PENDING_USER_PASSWORD', '__PENDING_SLOT__' + Math.random()), 10);
    shops.push({
      code: 'SHOP001',
      name: 'فروشگاه تست',
      tenantId: 1,
      passwordHash: shopPasswordHash,
      users: [
        { id: 1, username: 'admin', full_name: 'مدیر تست', role: 'admin', passwordHash: rolePasswords.admin, status: 'active' },
        { id: 2, username: '__pending_seller', full_name: 'فروشنده (معلق)', role: 'seller', passwordHash: pendingOnlyHash, status: 'pending' },
        { id: 3, username: '__pending_stock', full_name: 'انباردار (معلق)', role: 'stock_keeper', passwordHash: pendingOnlyHash, status: 'pending' },
        { id: 4, username: '__pending_accountant', full_name: 'حسابدار (معلق)', role: 'accountant', passwordHash: pendingOnlyHash, status: 'pending' },
      ],
    });
  }

  return {
    shops,
    stateByShop: {},
    shopConfigs: {},
    settingsLogs: [],
    paymentRequests: [],
    paymentEvents: [],
    broadcasts: [],
    systemSettings: {
      resetCodeHash: defaultResetCodeHash,
    },
  };
};

// Precompute the seeded database once.
// bcrypt.hashSync is relatively expensive; doing it on every request/test
// can push some endpoints past the vitest 5s default timeout.
const seededDatabase = seedDatabase();

/** نسخهٔ کاتالوگ — با تغییر فهرست صنوف این عدد را زیاد کنید تا دیتابیس‌های موجود همگام شوند */
const BUSINESS_TYPES_CATALOG_VERSION = 11;

/** ده صنف اولویت‌دار افغانستان؛ metadata برای توسعهٔ ماژول‌های اختصاصی هر tenant */
const DEFAULT_BUSINESS_TYPES = [
  {
    id: 1,
    name: 'سوپرمارکت',
    code: 'supermarket',
    icon: '🏪',
    is_active: true,
    features: ['expiry', 'barcode', 'category', 'bulk_discount', 'stock'],
    metadata: {
      specialty_fa:
        'تاریخ انقضا، بارکدخوان، تخفیف گروهی، دسته‌بندی محصولات',
      region: 'AF',
    },
  },
  {
    id: 2,
    name: 'داروخانه',
    code: 'pharmacy',
    icon: '💊',
    is_active: false,
    features: ['expiry', 'batch', 'prescription', 'stock'],
    metadata: {
      specialty_fa: 'انقضا با هشدار، نسخه پزشکی، واحد دوز (قرص/بسته)، هشدار کمبود موجودی',
      region: 'AF',
    },
  },
  {
    id: 3,
    name: 'موبایل و لوازم جانبی',
    code: 'mobile_accessories',
    icon: '📱',
    is_active: false,
    features: ['serial', 'warranty', 'imei', 'barcode'],
    metadata: {
      specialty_fa: 'IMEI/سریال، گارانتی، لوازم جانبی، برند و مدل',
      region: 'AF',
    },
  },
  {
    id: 4,
    name: 'رستوران و فست‌فود',
    code: 'restaurant',
    icon: '🍽️',
    is_active: false,
    features: ['table', 'recipe', 'wholesale'],
    metadata: {
      specialty_fa: 'منو (غذا و نوشیدنی)، سفارش آنلاین، میز و سالن، پیک و تحویل',
      region: 'AF',
    },
  },
  {
    id: 5,
    name: 'زرگری و طلا',
    code: 'gold_jewelry',
    icon: '💍',
    is_active: true,
    features: ['karat', 'weight', 'serial'],
    metadata: {
      specialty_fa: 'عیار ۱۸/۲۱/۲۴، وزن گرم و مثقال، اجرت ساخت، قیمت روز طلا (افغانستان)',
      region: 'AF',
    },
  },
  {
    id: 6,
    name: 'پوشاک',
    code: 'clothing',
    icon: '👔',
    is_active: false,
    features: ['size', 'color', 'brand', 'barcode'],
    metadata: {
      specialty_fa: 'سایز و رنگ، فصل، برند، تخفیف collection',
      region: 'AF',
    },
  },
  {
    id: 7,
    name: 'لوازم خانگی',
    code: 'home_appliances',
    icon: '🏠',
    is_active: false,
    features: ['serial', 'warranty', 'barcode'],
    metadata: {
      specialty_fa: 'سریال و گارانتی، مدل و برند، خدمات پس از فروش',
      region: 'AF',
    },
  },
  {
    id: 8,
    name: 'آهن‌فروشی و مصالح ساختمانی',
    code: 'hardware_building',
    icon: '🧱',
    is_active: false,
    features: ['weight', 'wholesale', 'stock'],
    metadata: {
      specialty_fa: 'واحد کیلو/تن/متر، شماره بارنامه، قرارداد پروژه',
      region: 'AF',
    },
  },
  {
    id: 9,
    name: 'لوازم موتر و لوازم یدکی',
    code: 'auto_parts',
    icon: '🚗',
    is_active: false,
    features: ['serial', 'brand', 'barcode'],
    metadata: {
      specialty_fa: 'سازگاری با مدل موتر، شماره فنی (OEM)، انبار چند شعبه',
      region: 'AF',
    },
  },
  {
    id: 10,
    name: 'نانوایی و شیرینی',
    code: 'bakery',
    icon: '🥐',
    is_active: false,
    features: ['expiry', 'batch', 'recipe'],
    metadata: {
      specialty_fa: 'دسته نان و شیرینی، تولید روزانه، پیش‌سفارش، تاریخ تولید',
      region: 'AF',
    },
  },
];

const nextUserIdAcrossShops = (db) => {
  const ids = (db.shops || []).flatMap((s) =>
    (Array.isArray(s.users) ? s.users : []).map((u) => Number(u.id) || 0)
  );
  return ids.length ? Math.max(...ids) + 1 : 1;
};

const PENDING_ROLE_SLOTS = [
  { role: 'seller', full_name: 'فروشنده (معلق)', userPrefix: '__pending_seller' },
  { role: 'stock_keeper', full_name: 'انباردار (معلق)', userPrefix: '__pending_stock' },
  { role: 'accountant', full_name: 'حسابدار (معلق)', userPrefix: '__pending_accountant' },
];

/** اسلات‌های seller/stock/accountant + حداکثر یک active به ازای هر نقش */
const ensureShopRoleSlots = (db) => {
  let changed = false;
  if (!Array.isArray(db.shops)) return changed;
  const pendingPass = envOrDefault('SEED_PENDING_USER_PASSWORD', `__PENDING__${Date.now()}`);
  const placeholderHash = bcrypt.hashSync(pendingPass, 10);
  let nid = nextUserIdAcrossShops(db);

  for (const shop of db.shops) {
    if (shop.code === 'SUPERADMIN') continue;
    if (!Array.isArray(shop.users)) shop.users = [];

    for (const { role, full_name, userPrefix } of PENDING_ROLE_SLOTS) {
      const exists = shop.users.some((u) => u.role === role);
      if (!exists) {
        const codeSafe = String(shop.code || 'SHOP').toUpperCase().replace(/[^A-Z0-9]/g, '_');
        shop.users.push({
          id: nid++,
          username: `${userPrefix}_${codeSafe}`.toLowerCase(),
          full_name,
          role,
          passwordHash: placeholderHash,
          status: 'pending',
        });
        changed = true;
      }
    }

    for (const role of ['admin', 'seller', 'stock_keeper', 'accountant']) {
      const actives = shop.users.filter((u) => u.role === role && u.status === 'active');
      if (actives.length > 1) {
        actives.slice(1).forEach((u) => {
          u.status = 'inactive';
          changed = true;
        });
      }
    }
  }
  return changed;
};

const ensurePlatformState = async () => {
  await prisma.platformState.upsert({
    where: { id: PLATFORM_STATE_ID },
    create: { id: PLATFORM_STATE_ID, state: seededDatabase, version: 0 },
    update: {},
  });
};

export const loadDatabase = async () => {
  await ensurePlatformState();
  const row = await prisma.platformState.findUnique({
    where: { id: PLATFORM_STATE_ID },
  });

  // Prisma returns JSON as a JS value.
  const db = (row && row.state) ? row.state : {};

  await hydrateShops(db);
  await hydrateStateByShop(db);

  const pvRow = await prisma.platformState.findUnique({
    where: { id: PLATFORM_STATE_ID },
    select: { version: true },
  });
  db.__platformVersion = pvRow?.version ?? 0;

  let changed = false;
  if (!db.systemSettings || typeof db.systemSettings !== 'object') {
    db.systemSettings = {};
    changed = true;
  }
  if (!db.systemSettings.resetCodeHash) {
    db.systemSettings.resetCodeHash = bcrypt.hashSync(envOrDefault('SEED_RESET_CODE', '12345678'), 10);
    changed = true;
  }
  if (!db.shopConfigs || typeof db.shopConfigs !== 'object') {
    db.shopConfigs = {};
    changed = true;
  }
  if (!Array.isArray(db.settingsLogs)) {
    db.settingsLogs = [];
    changed = true;
  }
  if (!db.systemSettings.businessTypesCatalogVersion) {
    db.systemSettings.businessTypesCatalogVersion = 0;
    changed = true;
  }
  if (db.systemSettings.businessTypesCatalogVersion !== BUSINESS_TYPES_CATALOG_VERSION) {
    db.businessTypes = JSON.parse(JSON.stringify(DEFAULT_BUSINESS_TYPES));
    db.systemSettings.businessTypesCatalogVersion = BUSINESS_TYPES_CATALOG_VERSION;
    changed = true;
  } else if (!Array.isArray(db.businessTypes)) {
    db.businessTypes = JSON.parse(JSON.stringify(DEFAULT_BUSINESS_TYPES));
    changed = true;
  }
  if (!Array.isArray(db.supportTickets)) {
    db.supportTickets = [];
    changed = true;
  }
  if (!Array.isArray(db.loginAuditLog)) {
    db.loginAuditLog = [];
    changed = true;
  }
  if (!Array.isArray(db.paymentRequests)) {
    db.paymentRequests = [];
    changed = true;
  }
  for (const shop of Array.isArray(db.shops) ? db.shops : []) {
    if (!shop || typeof shop !== 'object') continue;
    const rec = shop.admin_credential_record;
    if (rec && typeof rec === 'object') {
      if ('shop_password_plain' in rec) {
        delete rec.shop_password_plain;
        changed = true;
      }
      if ('admin_role_password_plain' in rec) {
        delete rec.admin_role_password_plain;
        changed = true;
      }
    }
  }
  for (const payment of Array.isArray(db.paymentRequests) ? db.paymentRequests : []) {
    if (!payment || typeof payment !== 'object') continue;
    if ('plain_credentials' in payment) {
      delete payment.plain_credentials;
      changed = true;
    }
  }
  if (!Array.isArray(db.paymentEvents)) {
    db.paymentEvents = [];
    changed = true;
  }
  if (!Array.isArray(db.broadcasts)) {
    db.broadcasts = [];
    changed = true;
  }
  if (!Array.isArray(db.branchRequests)) {
    db.branchRequests = [];
    changed = true;
  }
  if (ensureShopRoleSlots(db)) {
    changed = true;
  }
  if (changed) {
    await saveDatabase(db);
  }
  return db;
};

/**
 * بازیابی کامل پلتفرم از اسنپ‌شات JSON (همان خروجی loadDatabase پس از دانلود ابرادمین).
 * تمام جداول دکان و stateByShop از نو نوشته می‌شود.
 */
export async function restorePlatformFromMasterSnapshot(snapshotIn) {
  const snap =
    snapshotIn && typeof snapshotIn === 'object'
      ? JSON.parse(JSON.stringify(snapshotIn))
      : null;
  if (!snap) throw new Error('اسنپ‌شات نامعتبر است');
  delete snap.__platformVersion;
  delete snap.__shopStateVersions;
  if (!Array.isArray(snap.shops)) throw new Error('snapshot.shops باید آرایه باشد');
  const sb = snap.stateByShop && typeof snap.stateByShop === 'object' ? snap.stateByShop : {};
  for (const shop of snap.shops) {
    const code = shop?.code;
    if (!code || code === 'SUPERADMIN') continue;
    const st = sb[code];
    if (st && Array.isArray(st.customers)) {
      validateShopCustomersArray(st.customers);
    }
  }
  try {
    await prisma.$transaction(
      async (tx) => {
        await tx.shopCrmEmailTemplate.deleteMany();
        await tx.shopCrmContactLog.deleteMany();
        await tx.shopCrmTask.deleteMany();
        await tx.shopCrmDeal.deleteMany();
        await tx.shopBook.deleteMany();
        await tx.shopInvoice.deleteMany();
        await tx.shopProduct.deleteMany();
        await tx.shopCustomer.deleteMany();
        await tx.shopStateRow.deleteMany();
        await tx.shopUser.deleteMany();
        await tx.shop.deleteMany();
        const dbWorking = { ...snap, shops: snap.shops, stateByShop: sb };
        await persistShopsFullReplaceTx(tx, dbWorking.shops);
        await persistStateByShopTx(tx, dbWorking, {});
        const blob = preparePlatformStateBlob(dbWorking);
        const pRow = await tx.platformState.findUnique({ where: { id: PLATFORM_STATE_ID } });
        await tx.platformState.update({
          where: { id: PLATFORM_STATE_ID },
          data: { state: blob, version: (pRow?.version ?? 0) + 1 },
        });
      },
      LONG_PRISMA_TRANSACTION,
    );
  } catch (err) {
    rethrowIfDuplicateActiveCustomerPhone(err);
  }
}

export const saveDatabase = async (db) => {
  const shops = Array.isArray(db.shops) ? db.shops : [];
  if (shops.length === 0) {
    const n = await prisma.shop.count();
    if (n > 0) {
      throw new Error(
        '[storage] saveDatabase: shops[] is empty but Shop table has rows — refusing to wipe tenants.',
      );
    }
  }
  const nextWrite = writeQueue.then(async () => {
    try {
      await prisma.$transaction(
        async (tx) => {
          const pRow = await tx.platformState.findUnique({ where: { id: PLATFORM_STATE_ID } });
          const expectedPv = db.__platformVersion ?? 0;
          if ((pRow?.version ?? 0) !== expectedPv) {
            throw new Error('STORAGE_CONFLICT:PLATFORM');
          }
          await persistShopsFullReplaceTx(tx, shops);
          await persistStateByShopTx(tx, db, db.__shopStateVersions || {});
          const stateBlob = preparePlatformStateBlob(db);
          await tx.platformState.update({
            where: { id: PLATFORM_STATE_ID },
            data: { state: stateBlob, version: expectedPv + 1 },
          });
        },
        LONG_PRISMA_TRANSACTION,
      );
      db.__platformVersion = (db.__platformVersion ?? 0) + 1;
      await refreshShopStateVersions(prisma, db);
    } catch (err) {
      rethrowIfDuplicateActiveCustomerPhone(err);
    }
  });
  writeQueue = nextWrite.catch(() => {});
  await nextWrite;
};

export const resetDatabase = async () => {
  await prisma.$transaction(
    async (tx) => {
      await tx.masterBackupAuditLog.deleteMany();
      await tx.shopCrmEmailTemplate.deleteMany();
      await tx.shopCrmContactLog.deleteMany();
      await tx.shopCrmTask.deleteMany();
      await tx.shopCrmDeal.deleteMany();
      await tx.shopBook.deleteMany();
      await tx.shopInvoice.deleteMany();
      await tx.shopProduct.deleteMany();
      await tx.shopCustomer.deleteMany();
      await tx.shopStateRow.deleteMany();
      await tx.shopUser.deleteMany();
      await tx.shop.deleteMany();
      await tx.platformState.upsert({
        where: { id: PLATFORM_STATE_ID },
        create: { id: PLATFORM_STATE_ID, state: seededDatabase, version: 0 },
        update: { state: seededDatabase, version: 0 },
      });
    },
    LONG_PRISMA_TRANSACTION,
  );
};

export { prisma };
