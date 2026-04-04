-- CreateTable
CREATE TABLE "PlatformState" (
    "id" INTEGER NOT NULL,
    "state" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformState_pkey" PRIMARY KEY ("id")
);
