-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('Created', 'Updated', 'Deleted', 'Approved', 'Rejected');

-- CreateEnum
CREATE TYPE "AuditEntity" AS ENUM ('Project', 'Budget', 'Expense');

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "entity" "AuditEntity" NOT NULL,
    "entity_label" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "changes" JSONB NOT NULL,
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_project_id_created_at_idx" ON "AuditLog"("project_id", "created_at");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
