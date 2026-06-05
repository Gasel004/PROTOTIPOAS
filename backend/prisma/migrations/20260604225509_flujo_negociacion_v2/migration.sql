-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EstadoNegociacion" ADD VALUE 'acuerdo_pendiente';
ALTER TYPE "EstadoNegociacion" ADD VALUE 'en_transito';

-- AlterTable
ALTER TABLE "negociaciones" ADD COLUMN     "confirma_cierre_comprador" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "confirma_cierre_productor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "confirma_entrega_comprador" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "confirma_entrega_productor" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "pagos" ADD COLUMN     "fecha_pago_productor" DATE,
ADD COLUMN     "pagado_al_productor" BOOLEAN NOT NULL DEFAULT false;
