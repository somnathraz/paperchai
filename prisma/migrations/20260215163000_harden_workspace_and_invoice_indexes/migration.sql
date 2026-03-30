-- Enforce workspace-scoped invoice number uniqueness and add hot-path indexes.
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_workspaceId_number_key"
ON "Invoice"("workspaceId", "number");

CREATE INDEX IF NOT EXISTS "Invoice_workspaceId_status_dueDate_idx"
ON "Invoice"("workspaceId", "status", "dueDate");

CREATE INDEX IF NOT EXISTS "Invoice_workspaceId_status_scheduledSendAt_idx"
ON "Invoice"("workspaceId", "status", "scheduledSendAt");

CREATE INDEX IF NOT EXISTS "Invoice_workspaceId_createdAt_idx"
ON "Invoice"("workspaceId", "createdAt");

CREATE INDEX IF NOT EXISTS "InvoiceReminderStep_status_sendAt_idx"
ON "InvoiceReminderStep"("status", "sendAt");
