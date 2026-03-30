-- CreateEnum
CREATE TYPE "RecurringPlanSourceType" AS ENUM ('FIXED_TEMPLATE', 'MILESTONES_READY', 'TIMESHEET_HOURS', 'MANUAL_REVIEW');

-- CreateEnum
CREATE TYPE "RecurringPlanIntervalUnit" AS ENUM ('DAYS', 'WEEKS', 'MONTHS');

-- CreateEnum
CREATE TYPE "RecurringPlanFallbackPolicy" AS ENUM ('SKIP_AND_NOTIFY', 'CREATE_ZERO_DRAFT', 'USE_MINIMUM_FEE');

-- CreateEnum
CREATE TYPE "RecurringPlanStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RecurringPlanRunStatus" AS ENUM ('PROCESSING', 'SUCCESS', 'SKIPPED', 'FAILED');

-- CreateTable
CREATE TABLE "RecurringInvoicePlan" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "sourceType" "RecurringPlanSourceType" NOT NULL,
    "status" "RecurringPlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "intervalUnit" "RecurringPlanIntervalUnit" NOT NULL,
    "intervalValue" INTEGER NOT NULL,
    "monthlyDay" INTEGER,
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastError" TEXT,
    "autoSend" BOOLEAN NOT NULL DEFAULT false,
    "approvalRequired" BOOLEAN NOT NULL DEFAULT true,
    "fallbackPolicy" "RecurringPlanFallbackPolicy" NOT NULL DEFAULT 'SKIP_AND_NOTIFY',
    "minimumFee" INTEGER,
    "dueDaysAfterIssue" INTEGER NOT NULL DEFAULT 7,
    "channel" TEXT NOT NULL DEFAULT 'email',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "snapshot" JSONB,
    "metadata" JSONB,
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringInvoicePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringInvoiceRunLog" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "runKey" TEXT NOT NULL,
    "status" "RecurringPlanRunStatus" NOT NULL,
    "message" TEXT,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurringInvoiceRunLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecurringInvoicePlan_workspaceId_status_nextRunAt_idx" ON "RecurringInvoicePlan"("workspaceId", "status", "nextRunAt");

-- CreateIndex
CREATE INDEX "RecurringInvoicePlan_clientId_idx" ON "RecurringInvoicePlan"("clientId");

-- CreateIndex
CREATE INDEX "RecurringInvoicePlan_projectId_idx" ON "RecurringInvoicePlan"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringInvoiceRunLog_runKey_key" ON "RecurringInvoiceRunLog"("runKey");

-- CreateIndex
CREATE INDEX "RecurringInvoiceRunLog_planId_createdAt_idx" ON "RecurringInvoiceRunLog"("planId", "createdAt");

-- CreateIndex
CREATE INDEX "RecurringInvoiceRunLog_workspaceId_createdAt_idx" ON "RecurringInvoiceRunLog"("workspaceId", "createdAt");

-- AddForeignKey
ALTER TABLE "RecurringInvoicePlan" ADD CONSTRAINT "RecurringInvoicePlan_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringInvoicePlan" ADD CONSTRAINT "RecurringInvoicePlan_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringInvoicePlan" ADD CONSTRAINT "RecurringInvoicePlan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringInvoiceRunLog" ADD CONSTRAINT "RecurringInvoiceRunLog_planId_fkey" FOREIGN KEY ("planId") REFERENCES "RecurringInvoicePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringInvoiceRunLog" ADD CONSTRAINT "RecurringInvoiceRunLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringInvoiceRunLog" ADD CONSTRAINT "RecurringInvoiceRunLog_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
