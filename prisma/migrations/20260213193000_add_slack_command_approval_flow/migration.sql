-- CreateEnum
CREATE TYPE "IntegrationIdentityProvider" AS ENUM ('SLACK', 'WHATSAPP', 'NOTION', 'EMAIL');

-- CreateEnum
CREATE TYPE "BotCommandSource" AS ENUM ('SLACK', 'WHATSAPP', 'EMAIL', 'NOTION');

-- CreateEnum
CREATE TYPE "BotCommandStatus" AS ENUM ('RECEIVED', 'PARSED', 'REJECTED', 'EXECUTED', 'FAILED', 'DUPLICATE');

-- CreateEnum
CREATE TYPE "ApprovalEntityType" AS ENUM ('INVOICE');

-- CreateEnum
CREATE TYPE "ApprovalRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OutboundMessageProvider" AS ENUM ('SLACK', 'WHATSAPP', 'EMAIL');

-- CreateEnum
CREATE TYPE "OutboundMessageStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED', 'RETRYING');

-- CreateTable
CREATE TABLE "IntegrationIdentity" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" "IntegrationIdentityProvider" NOT NULL,
    "externalUserId" TEXT NOT NULL,
    "internalUserId" TEXT NOT NULL,
    "roleSnapshot" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotCommandEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "source" "BotCommandSource" NOT NULL,
    "status" "BotCommandStatus" NOT NULL DEFAULT 'RECEIVED',
    "externalEventId" TEXT,
    "providerWorkspaceId" TEXT,
    "actorExternalId" TEXT,
    "actorUserId" TEXT,
    "command" TEXT NOT NULL,
    "rawText" TEXT,
    "parsedData" JSONB,
    "channelId" TEXT,
    "threadTs" TEXT,
    "responseUrl" TEXT,
    "linkedInvoiceId" TEXT,
    "errorMessage" TEXT,
    "processedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotCommandEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "entityType" "ApprovalEntityType" NOT NULL DEFAULT 'INVOICE',
    "invoiceId" TEXT,
    "status" "ApprovalRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedByUserId" TEXT,
    "requestedByExternalId" TEXT,
    "approverUserId" TEXT,
    "decisionNote" TEXT,
    "source" TEXT,
    "metadata" JSONB,
    "expiresAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboundMessageLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" "OutboundMessageProvider" NOT NULL,
    "targetExternalId" TEXT NOT NULL,
    "messageType" TEXT NOT NULL,
    "payloadHash" TEXT,
    "providerMessageId" TEXT,
    "status" "OutboundMessageStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboundMessageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationIdentity_workspaceId_provider_externalUserId_key" ON "IntegrationIdentity"("workspaceId", "provider", "externalUserId");

-- CreateIndex
CREATE INDEX "IntegrationIdentity_workspaceId_provider_active_idx" ON "IntegrationIdentity"("workspaceId", "provider", "active");

-- CreateIndex
CREATE INDEX "IntegrationIdentity_internalUserId_active_idx" ON "IntegrationIdentity"("internalUserId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "BotCommandEvent_externalEventId_key" ON "BotCommandEvent"("externalEventId");

-- CreateIndex
CREATE INDEX "BotCommandEvent_workspaceId_source_status_createdAt_idx" ON "BotCommandEvent"("workspaceId", "source", "status", "createdAt");

-- CreateIndex
CREATE INDEX "BotCommandEvent_providerWorkspaceId_source_createdAt_idx" ON "BotCommandEvent"("providerWorkspaceId", "source", "createdAt");

-- CreateIndex
CREATE INDEX "ApprovalRequest_workspaceId_status_createdAt_idx" ON "ApprovalRequest"("workspaceId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ApprovalRequest_invoiceId_status_idx" ON "ApprovalRequest"("invoiceId", "status");

-- CreateIndex
CREATE INDEX "OutboundMessageLog_workspaceId_provider_createdAt_idx" ON "OutboundMessageLog"("workspaceId", "provider", "createdAt");

-- CreateIndex
CREATE INDEX "OutboundMessageLog_provider_status_createdAt_idx" ON "OutboundMessageLog"("provider", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "IntegrationIdentity" ADD CONSTRAINT "IntegrationIdentity_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationIdentity" ADD CONSTRAINT "IntegrationIdentity_internalUserId_fkey" FOREIGN KEY ("internalUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BotCommandEvent" ADD CONSTRAINT "BotCommandEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BotCommandEvent" ADD CONSTRAINT "BotCommandEvent_linkedInvoiceId_fkey" FOREIGN KEY ("linkedInvoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundMessageLog" ADD CONSTRAINT "OutboundMessageLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
