-- Añadir campos de suspensión a la tabla compradores
ALTER TABLE "compradores"
  ADD COLUMN "suspendido_hasta"      TIMESTAMP(3),
  ADD COLUMN "suspension_motivo"     TEXT,
  ADD COLUMN "suspendido_definitivo" BOOLEAN NOT NULL DEFAULT false;

-- Crear tabla de auditoría
CREATE TABLE "auditoria" (
    "id"         SERIAL       NOT NULL,
    "accion"     VARCHAR(50)  NOT NULL,
    "entidad"    VARCHAR(50)  NOT NULL,
    "entidad_id" INTEGER      NOT NULL,
    "usuario_id" INTEGER      NOT NULL,
    "detalle"    VARCHAR(1000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- Índices
CREATE INDEX "auditoria_entidad_entidad_id_idx" ON "auditoria"("entidad", "entidad_id");
CREATE INDEX "auditoria_usuario_id_idx"          ON "auditoria"("usuario_id");
CREATE INDEX "auditoria_created_at_idx"          ON "auditoria"("created_at");
CREATE INDEX "auditoria_accion_idx"              ON "auditoria"("accion");

-- FK a usuarios
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_fkey"
  FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
