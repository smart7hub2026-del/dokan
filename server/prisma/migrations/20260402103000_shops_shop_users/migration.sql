-- CreateTable
CREATE TABLE "Shop" (
    "code" TEXT NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "ShopUser" (
    "id" INTEGER NOT NULL,
    "shopCode" TEXT NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "ShopUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shop_tenantId_key" ON "Shop"("tenantId");

-- CreateIndex
CREATE INDEX "ShopUser_shopCode_idx" ON "ShopUser"("shopCode");

-- AddForeignKey
ALTER TABLE "ShopUser" ADD CONSTRAINT "ShopUser_shopCode_fkey" FOREIGN KEY ("shopCode") REFERENCES "Shop"("code") ON DELETE CASCADE ON UPDATE CASCADE;
