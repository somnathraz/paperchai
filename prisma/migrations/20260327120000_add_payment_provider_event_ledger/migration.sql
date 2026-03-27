-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "externalEventId" TEXT,
    "externalPaymentId" TEXT,
    "externalLinkId" TEXT,
    "externalRefundId" TEXT,
    "workspaceId" TEXT,
    "invoiceId" TEXT,
    "status" TEXT NOT NULL,
    "reason" TEXT,
    "signature" TEXT,
    "payload" JSONB,
    "result" JSONB,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "externalPaymentId" TEXT,
    "externalLinkId" TEXT,
    "externalRefundId" TEXT,
    "workspaceId" TEXT,
    "invoiceId" TEXT,
    "subscriptionId" TEXT,
    "amount" INTEGER,
    "currency" TEXT,
    "status" TEXT NOT NULL,
    "metadata" JSONB,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_eventKey_key" ON "WebhookEvent"("eventKey");

-- CreateIndex
CREATE INDEX "WebhookEvent_provider_eventType_createdAt_idx" ON "WebhookEvent"("provider", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_workspaceId_status_createdAt_idx" ON "WebhookEvent"("workspaceId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_invoiceId_status_createdAt_idx" ON "WebhookEvent"("invoiceId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvent_eventKey_key" ON "PaymentEvent"("eventKey");

-- CreateIndex
CREATE INDEX "PaymentEvent_provider_direction_createdAt_idx" ON "PaymentEvent"("provider", "direction", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentEvent_externalPaymentId_idx" ON "PaymentEvent"("externalPaymentId");

-- CreateIndex
CREATE INDEX "PaymentEvent_externalRefundId_idx" ON "PaymentEvent"("externalRefundId");

-- CreateIndex
CREATE INDEX "PaymentEvent_workspaceId_status_createdAt_idx" ON "PaymentEvent"("workspaceId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentEvent_invoiceId_status_createdAt_idx" ON "PaymentEvent"("invoiceId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
