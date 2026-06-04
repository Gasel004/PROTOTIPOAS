-- =====================================================================
-- Migración: en_transito en EstadoNegociacion + columnas para doble
-- confirmación del precio.
--
-- Se divide del backfill intencionalmente: PostgreSQL 12+ rechaza usar
-- un valor recién agregado al enum dentro de la misma transacción
-- (error 55P04 "unsafe use of new value"). Este archivo solo añade
-- el valor y las columnas; el backfill de filas existentes se hace en
-- una migración separada posterior, ya con el valor commiteado.
-- =====================================================================

-- 1) Nuevo valor en el enum de estado de la negociación
ALTER TYPE "EstadoNegociacion" ADD VALUE 'en_transito';

-- 2) Nuevas columnas para la doble confirmación del precio
ALTER TABLE "negociaciones"
  ADD COLUMN "confirmacion_productor" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "confirmacion_comprador" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "fecha_confirmacion_productor" TIMESTAMP(3),
  ADD COLUMN "fecha_confirmacion_comprador" TIMESTAMP(3);
