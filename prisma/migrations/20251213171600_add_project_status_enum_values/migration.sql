-- Add ProjectStatus enum values in a separate migration so they are committed
-- before 20251213171707_add_integrations uses them (PostgreSQL requirement).
ALTER TYPE "ProjectStatus" ADD VALUE 'PLANNING';
ALTER TYPE "ProjectStatus" ADD VALUE 'ACTIVE';
ALTER TYPE "ProjectStatus" ADD VALUE 'ON_HOLD';
ALTER TYPE "ProjectStatus" ADD VALUE 'COMPLETED';
ALTER TYPE "ProjectStatus" ADD VALUE 'CANCELLED';
