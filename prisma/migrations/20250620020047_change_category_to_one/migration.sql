/*
  Warnings:

  - You are about to drop the `_PostCategories` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `categoryId` to the `Post` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "_PostCategories" DROP CONSTRAINT "_PostCategories_A_fkey";

-- DropForeignKey
ALTER TABLE "_PostCategories" DROP CONSTRAINT "_PostCategories_B_fkey";

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "categoryId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "_PostCategories";

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
