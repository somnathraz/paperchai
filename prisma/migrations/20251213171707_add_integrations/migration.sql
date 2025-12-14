-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('RETAINER', 'FIXED', 'HOURLY', 'MILESTONE');

-- CreateEnum
CREATE TYPE "BillingStrategy" AS ENUM ('PER_MILESTONE', 'SINGLE_INVOICE', 'RETAINER_MONTHLY', 'HOURLY_TIMESHEET');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'READY_FOR_INVOICE', 'INVOICED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MilestoneBillingTrigger" AS ENUM ('ON_CREATION', 'ON_COMPLETION', 'ON_APPROVAL', 'ON_FIXED_DATE');

-- CreateEnum
CREATE TYPE "ProjectDocumentSource" AS ENUM ('CONTRACT', 'PROPOSAL', 'SOW', 'EMAIL_EXPORT', 'CHAT_EXPORT', 'NOTE', 'OTHER');

-- CreateEnum
CREATE TYPE "ProjectDocumentAIStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('SLACK', 'NOTION');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "NotionImportType" AS ENUM ('PROJECT', 'CLIENT', 'TASK', 'INVOICE_DATA');

-- CreateEnum
CREATE TYPE "SlackImportType" AS ENUM ('THREAD_SUMMARY', 'SLASH_COMMAND', 'MESSAGE_REACTION');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ProjectStatus" ADD VALUE 'PLANNING';
ALTER TYPE "ProjectStatus" ADD VALUE 'ACTIVE';
ALTER TYPE "ProjectStatus" ADD VALUE 'ON_HOLD';
ALTER TYPE "ProjectStatus" ADD VALUE 'COMPLETED';
ALTER TYPE "ProjectStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "remindersEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "autoInvoiceEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autoRemindersEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "billableItems" JSONB,
ADD COLUMN     "billingStrategy" "BillingStrategy" NOT NULL DEFAULT 'SINGLE_INVOICE',
ADD COLUMN     "createdByUserId" TEXT,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'INR',
ADD COLUMN     "totalBudget" INTEGER,
ADD COLUMN     "type" "ProjectType" NOT NULL DEFAULT 'FIXED',
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "ProjectMilestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "expectedDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "billingTrigger" "MilestoneBillingTrigger" NOT NULL DEFAULT 'ON_COMPLETION',
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PLANNED',
    "invoiceId" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "autoInvoiceEnabled" BOOLEAN NOT NULL DEFAULT true,
    "autoRemindersEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastManualActionAt" TIMESTAMP(3),
    "manualActionType" TEXT,
    "skipAutomation" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDocument" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "clientId" TEXT,
    "workspaceId" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sourceType" "ProjectDocumentSource" NOT NULL DEFAULT 'OTHER',
    "aiStatus" "ProjectDocumentAIStatus" NOT NULL DEFAULT 'PENDING',
    "aiSummary" TEXT,
    "aiExtract" JSONB,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderSettings" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReminderSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceReminderSchedule" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "useDefaults" BOOLEAN NOT NULL DEFAULT true,
    "presetName" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceReminderSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceReminderStep" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "daysBeforeDue" INTEGER,
    "daysAfterDue" INTEGER,
    "offsetFromDueInMinutes" INTEGER NOT NULL,
    "sendAt" TIMESTAMP(3) NOT NULL,
    "emailTemplateId" TEXT,
    "notifyCreator" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceReminderStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'modern',
    "brandColor" TEXT NOT NULL DEFAULT '#0f172a',
    "logoUrl" TEXT,
    "usedFor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationConnection" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'CONNECTED',
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "providerWorkspaceId" TEXT,
    "providerWorkspaceName" TEXT,
    "scopes" TEXT,
    "config" JSONB,
    "lastError" TEXT,
    "lastErrorAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotionImport" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "notionDatabaseId" TEXT NOT NULL,
    "notionPageId" TEXT,
    "notionPageTitle" TEXT,
    "importType" "NotionImportType" NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "aiSummary" TEXT,
    "extractedData" JSONB,
    "projectId" TEXT,
    "clientId" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "syncEnabled" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotionImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlackImport" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "channelName" TEXT,
    "threadTs" TEXT,
    "messageTs" TEXT,
    "importType" "SlackImportType" NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "rawMessages" JSONB,
    "aiSummary" TEXT,
    "extractedData" JSONB,
    "confidenceScore" INTEGER,
    "invoiceId" TEXT,
    "projectId" TEXT,
    "clientId" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlackImport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReminderSettings_workspaceId_key" ON "ReminderSettings"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceReminderSchedule_invoiceId_key" ON "InvoiceReminderSchedule"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_workspaceId_slug_key" ON "EmailTemplate"("workspaceId", "slug");

-- CreateIndex
CREATE INDEX "IntegrationConnection_workspaceId_status_idx" ON "IntegrationConnection"("workspaceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationConnection_workspaceId_provider_key" ON "IntegrationConnection"("workspaceId", "provider");

-- CreateIndex
CREATE INDEX "NotionImport_connectionId_status_idx" ON "NotionImport"("connectionId", "status");

-- CreateIndex
CREATE INDEX "NotionImport_notionDatabaseId_idx" ON "NotionImport"("notionDatabaseId");

-- CreateIndex
CREATE INDEX "SlackImport_connectionId_status_idx" ON "SlackImport"("connectionId", "status");

-- CreateIndex
CREATE INDEX "SlackImport_channelId_threadTs_idx" ON "SlackImport"("channelId", "threadTs");

-- AddForeignKey
ALTER TABLE "ProjectMilestone" ADD CONSTRAINT "ProjectMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderSettings" ADD CONSTRAINT "ReminderSettings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceReminderSchedule" ADD CONSTRAINT "InvoiceReminderSchedule_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceReminderSchedule" ADD CONSTRAINT "InvoiceReminderSchedule_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceReminderStep" ADD CONSTRAINT "InvoiceReminderStep_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "InvoiceReminderSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceReminderStep" ADD CONSTRAINT "InvoiceReminderStep_emailTemplateId_fkey" FOREIGN KEY ("emailTemplateId") REFERENCES "EmailTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationConnection" ADD CONSTRAINT "IntegrationConnection_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotionImport" ADD CONSTRAINT "NotionImport_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlackImport" ADD CONSTRAINT "SlackImport_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
