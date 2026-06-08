/*
  Warnings:

  - You are about to drop the column `link` on the `productos` table. All the data in the column will be lost.
  - You are about to drop the column `proveedor_id` on the `productos` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "productos" DROP CONSTRAINT "productos_proveedor_id_fkey";

-- AlterTable
ALTER TABLE "precios" ADD COLUMN     "link" TEXT;

-- AlterTable
ALTER TABLE "productos" DROP COLUMN "link",
DROP COLUMN "proveedor_id",
ADD COLUMN     "imagen" TEXT;
