-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_category_id_fkey";

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "category_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
