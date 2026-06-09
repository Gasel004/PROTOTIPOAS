-- Añadir asociacion_id a la tabla compradores
ALTER TABLE "compradores"
  ADD COLUMN "asociacion_id" INTEGER;

-- FK a asociaciones
ALTER TABLE "compradores" ADD CONSTRAINT "compradores_asociacion_id_fkey"
  FOREIGN KEY ("asociacion_id") REFERENCES "asociaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
