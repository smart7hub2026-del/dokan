-- وضعیت کالا، ردیابی ویرایش، یکتایی SKU در هر فروشگاه (مقادیر NULL در sku تکراری محسوب نمی‌شوند)
ALTER TABLE "ShopProduct" ADD COLUMN IF NOT EXISTS "product_status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "ShopProduct" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ShopProduct" ADD COLUMN IF NOT EXISTS "updated_by" INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS "ShopProduct_shopCode_sku_key" ON "ShopProduct" ("shopCode", "sku");
