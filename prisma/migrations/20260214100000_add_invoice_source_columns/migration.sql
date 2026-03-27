-- Add source tracking columns to Invoice (were in schema but never migrated).
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "sourceImportId" TEXT;
