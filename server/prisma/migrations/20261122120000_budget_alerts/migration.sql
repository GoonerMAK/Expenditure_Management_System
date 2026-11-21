-- CreateEnum
CREATE TYPE "BudgetAlertLevel" AS ENUM ('Threshold', 'OverBudget');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "alert_threshold" INTEGER NOT NULL DEFAULT 80,
ADD COLUMN     "budget_alert_level" "BudgetAlertLevel";

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "project_id" TEXT,
    "project_name" TEXT NOT NULL,
    "level" "BudgetAlertLevel" NOT NULL,
    "threshold" INTEGER NOT NULL,
    "budget" DOUBLE PRECISION NOT NULL,
    "spent" DOUBLE PRECISION NOT NULL,
    "percent_used" DOUBLE PRECISION,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_user_id_created_at_idx" ON "Notification"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

