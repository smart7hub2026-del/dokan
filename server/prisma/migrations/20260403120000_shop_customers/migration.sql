-- CreateTable
CREATE TABLE "shop_customers" (
    "shop_code" TEXT NOT NULL,
    "id" INTEGER NOT NULL,
    "phone_key" TEXT NOT NULL,
    "customer_code" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "whatsapp" TEXT,
    "email" TEXT,
    "address" TEXT NOT NULL DEFAULT '',
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_purchases" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "reminder_enabled" BOOLEAN NOT NULL DEFAULT true,
    "reminder_days_before" INTEGER NOT NULL DEFAULT 3,
    "archived_at" TEXT,
    "marketing_consent" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TEXT,
    "tenant_id" INTEGER NOT NULL DEFAULT 0,
    "extra" JSONB,

    CONSTRAINT "shop_customers_pkey" PRIMARY KEY ("shop_code","id")
);

CREATE INDEX "shop_customers_shop_code_idx" ON "shop_customers"("shop_code");
CREATE INDEX "shop_customers_shop_code_phone_key_idx" ON "shop_customers"("shop_code", "phone_key");
