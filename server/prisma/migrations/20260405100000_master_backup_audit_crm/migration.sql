-- ممیزی بکاپ master
CREATE TABLE "master_backup_audit_logs" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '',
    "actor_shop_code" TEXT,
    "actor_sub" TEXT,
    "ip" TEXT,
    "meta" JSONB,

    CONSTRAINT "master_backup_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "master_backup_audit_logs_created_at_idx" ON "master_backup_audit_logs"("created_at" DESC);
CREATE INDEX "master_backup_audit_logs_action_idx" ON "master_backup_audit_logs"("action");

-- CRM سروری
CREATE TABLE "shop_crm_deals" (
    "id" SERIAL NOT NULL,
    "shop_code" TEXT NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'lead',
    "value_afs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_crm_deals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "shop_crm_deals_shop_code_idx" ON "shop_crm_deals"("shop_code");
CREATE INDEX "shop_crm_deals_shop_code_stage_idx" ON "shop_crm_deals"("shop_code", "stage");

CREATE TABLE "shop_crm_tasks" (
    "id" SERIAL NOT NULL,
    "shop_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "due_at" TIMESTAMP(3),
    "done" BOOLEAN NOT NULL DEFAULT false,
    "customer_id" INTEGER,
    "deal_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_crm_tasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "shop_crm_tasks_shop_code_idx" ON "shop_crm_tasks"("shop_code");
CREATE INDEX "shop_crm_tasks_shop_code_done_idx" ON "shop_crm_tasks"("shop_code", "done");

CREATE TABLE "shop_crm_contact_logs" (
    "id" SERIAL NOT NULL,
    "shop_code" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_crm_contact_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "shop_crm_contact_logs_shop_code_idx" ON "shop_crm_contact_logs"("shop_code");
CREATE INDEX "shop_crm_contact_logs_shop_code_customer_id_idx" ON "shop_crm_contact_logs"("shop_code", "customer_id");

CREATE TABLE "shop_crm_email_templates" (
    "id" SERIAL NOT NULL,
    "shop_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body_html" TEXT NOT NULL,

    CONSTRAINT "shop_crm_email_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "shop_crm_email_templates_shop_code_name_key" ON "shop_crm_email_templates"("shop_code", "name");
CREATE INDEX "shop_crm_email_templates_shop_code_idx" ON "shop_crm_email_templates"("shop_code");

-- یکتایی جزئی: شماره فعال (غیرآرشیو) به ازای هر دکان
CREATE UNIQUE INDEX "shop_customers_active_phone_uidx"
ON "shop_customers" ("shop_code", "phone_key")
WHERE ("archived_at" IS NULL OR "archived_at" = '');
