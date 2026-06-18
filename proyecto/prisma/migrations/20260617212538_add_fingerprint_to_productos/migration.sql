-- AlterTable
ALTER TABLE "productos" ADD COLUMN     "fingerprint" TEXT;

-- CreateIndex
CREATE INDEX "productos_fingerprint_idx" ON "productos"("fingerprint");
