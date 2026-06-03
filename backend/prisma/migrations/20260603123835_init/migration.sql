-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('productor', 'comprador', 'asociacion');

-- CreateEnum
CREATE TYPE "EstadoPublicacion" AS ENUM ('activa', 'pausada', 'cerrada', 'vencida');

-- CreateEnum
CREATE TYPE "EstadoNegociacion" AS ENUM ('pendiente', 'en_proceso', 'aceptada', 'rechazada', 'completada', 'cancelada');

-- CreateEnum
CREATE TYPE "EstadoEntrega" AS ENUM ('pendiente', 'en_transito', 'entregado', 'con_problema');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('pendiente', 'completado', 'fallido', 'reembolsado');

-- CreateEnum
CREATE TYPE "EstadoCalificacion" AS ENUM ('pendiente', 'aprobada', 'rechazada');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "telefono" VARCHAR(20) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "rol" "Rol" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productores" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "asociacion_id" INTEGER,
    "dpi" VARCHAR(20),
    "municipio" VARCHAR(100),
    "departamento" VARCHAR(100),
    "hectareas" DECIMAL(8,2),
    "descripcion" TEXT,
    "calificacion" DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    "suspendido_hasta" TIMESTAMP(3),
    "suspension_motivo" TEXT,
    "suspendido_definitivo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "productores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compradores" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "razon_social" VARCHAR(200),
    "nit" VARCHAR(20),
    "municipio" VARCHAR(100),
    "departamento" VARCHAR(100),
    "tipo_comprador" VARCHAR(50),
    "calificacion" DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compradores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asociaciones" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "nit" VARCHAR(20),
    "municipio" VARCHAR(100),
    "departamento" VARCHAR(100),
    "descripcion" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asociaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "categoria" VARCHAR(100),
    "unidad_medida" VARCHAR(30) NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publicaciones" (
    "id" SERIAL NOT NULL,
    "productor_id" INTEGER NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "titulo" VARCHAR(200) NOT NULL,
    "descripcion" TEXT,
    "cantidad_disponible" DECIMAL(10,2) NOT NULL,
    "precio_unitario" DECIMAL(10,2) NOT NULL,
    "unidad_medida" VARCHAR(30) NOT NULL,
    "municipio" VARCHAR(100),
    "departamento" VARCHAR(100),
    "fecha_cosecha" DATE,
    "estado" "EstadoPublicacion" NOT NULL DEFAULT 'activa',
    "eliminada" BOOLEAN NOT NULL DEFAULT false,
    "imagen_url" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publicaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "negociaciones" (
    "id" SERIAL NOT NULL,
    "publicacion_id" INTEGER NOT NULL,
    "comprador_id" INTEGER NOT NULL,
    "productor_id" INTEGER NOT NULL,
    "cantidad_solicitada" DECIMAL(10,2) NOT NULL,
    "precio_acordado" DECIMAL(10,2),
    "estado" "EstadoNegociacion" NOT NULL DEFAULT 'pendiente',
    "condiciones" TEXT,
    "fecha_entrega_acordada" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "negociaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensajes" (
    "id" SERIAL NOT NULL,
    "negociacion_id" INTEGER NOT NULL,
    "remitente_id" INTEGER NOT NULL,
    "contenido" TEXT NOT NULL,
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensajes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entregas" (
    "id" SERIAL NOT NULL,
    "negociacion_id" INTEGER NOT NULL,
    "fecha_programada" DATE,
    "fecha_realizada" DATE,
    "lugar_entrega" VARCHAR(300),
    "estado" "EstadoEntrega" NOT NULL DEFAULT 'pendiente',
    "notas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entregas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "confirmaciones_entrega" (
    "id" SERIAL NOT NULL,
    "entrega_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "rol_confirmador" VARCHAR(20) NOT NULL,
    "confirmado" BOOLEAN NOT NULL DEFAULT false,
    "observaciones" TEXT,
    "fecha_confirmacion" TIMESTAMP(3),

    CONSTRAINT "confirmaciones_entrega_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id" SERIAL NOT NULL,
    "negociacion_id" INTEGER NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "metodo_pago" VARCHAR(50) NOT NULL,
    "referencia" VARCHAR(200),
    "estado" "EstadoPago" NOT NULL DEFAULT 'pendiente',
    "fecha_pago" DATE,
    "registrado_por" INTEGER,
    "notas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificaciones" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "tipo" VARCHAR(50) NOT NULL,
    "titulo" VARCHAR(200) NOT NULL,
    "mensaje" TEXT NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "referencia_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calificaciones" (
    "id" SERIAL NOT NULL,
    "negociacion_id" INTEGER NOT NULL,
    "evaluador_id" INTEGER NOT NULL,
    "evaluado_id" INTEGER NOT NULL,
    "puntaje" INTEGER NOT NULL,
    "comentario" TEXT,
    "estado" "EstadoCalificacion" NOT NULL DEFAULT 'pendiente',
    "revisada_por" INTEGER,
    "motivo_revision" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),

    CONSTRAINT "calificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_telefono_key" ON "usuarios"("telefono");

-- CreateIndex
CREATE UNIQUE INDEX "productores_usuario_id_key" ON "productores"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "productores_dpi_key" ON "productores"("dpi");

-- CreateIndex
CREATE UNIQUE INDEX "compradores_usuario_id_key" ON "compradores"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "compradores_nit_key" ON "compradores"("nit");

-- CreateIndex
CREATE UNIQUE INDEX "asociaciones_usuario_id_key" ON "asociaciones"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "asociaciones_nit_key" ON "asociaciones"("nit");

-- CreateIndex
CREATE INDEX "publicaciones_estado_idx" ON "publicaciones"("estado");

-- CreateIndex
CREATE INDEX "publicaciones_eliminada_idx" ON "publicaciones"("eliminada");

-- CreateIndex
CREATE INDEX "publicaciones_departamento_idx" ON "publicaciones"("departamento");

-- CreateIndex
CREATE INDEX "publicaciones_municipio_idx" ON "publicaciones"("municipio");

-- CreateIndex
CREATE INDEX "publicaciones_productor_id_estado_idx" ON "publicaciones"("productor_id", "estado");

-- CreateIndex
CREATE INDEX "publicaciones_producto_id_estado_idx" ON "publicaciones"("producto_id", "estado");

-- CreateIndex
CREATE INDEX "negociaciones_estado_idx" ON "negociaciones"("estado");

-- CreateIndex
CREATE INDEX "negociaciones_comprador_id_estado_idx" ON "negociaciones"("comprador_id", "estado");

-- CreateIndex
CREATE INDEX "negociaciones_productor_id_estado_idx" ON "negociaciones"("productor_id", "estado");

-- CreateIndex
CREATE INDEX "mensajes_negociacion_id_leido_idx" ON "mensajes"("negociacion_id", "leido");

-- CreateIndex
CREATE INDEX "mensajes_remitente_id_idx" ON "mensajes"("remitente_id");

-- CreateIndex
CREATE INDEX "mensajes_leido_idx" ON "mensajes"("leido");

-- CreateIndex
CREATE UNIQUE INDEX "entregas_negociacion_id_key" ON "entregas"("negociacion_id");

-- CreateIndex
CREATE INDEX "entregas_negociacion_id_estado_idx" ON "entregas"("negociacion_id", "estado");

-- CreateIndex
CREATE INDEX "entregas_estado_idx" ON "entregas"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "confirmaciones_entrega_entrega_id_usuario_id_key" ON "confirmaciones_entrega"("entrega_id", "usuario_id");

-- CreateIndex
CREATE INDEX "pagos_negociacion_id_idx" ON "pagos"("negociacion_id");

-- CreateIndex
CREATE INDEX "pagos_estado_negociacion_id_idx" ON "pagos"("estado", "negociacion_id");

-- CreateIndex
CREATE INDEX "notificaciones_usuario_id_leida_idx" ON "notificaciones"("usuario_id", "leida");

-- CreateIndex
CREATE INDEX "notificaciones_usuario_id_created_at_idx" ON "notificaciones"("usuario_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "calificaciones_negociacion_id_evaluador_id_evaluado_id_key" ON "calificaciones"("negociacion_id", "evaluador_id", "evaluado_id");

-- AddForeignKey
ALTER TABLE "productores" ADD CONSTRAINT "productores_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productores" ADD CONSTRAINT "productores_asociacion_id_fkey" FOREIGN KEY ("asociacion_id") REFERENCES "asociaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compradores" ADD CONSTRAINT "compradores_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asociaciones" ADD CONSTRAINT "asociaciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publicaciones" ADD CONSTRAINT "publicaciones_productor_id_fkey" FOREIGN KEY ("productor_id") REFERENCES "productores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publicaciones" ADD CONSTRAINT "publicaciones_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negociaciones" ADD CONSTRAINT "negociaciones_publicacion_id_fkey" FOREIGN KEY ("publicacion_id") REFERENCES "publicaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negociaciones" ADD CONSTRAINT "negociaciones_comprador_id_fkey" FOREIGN KEY ("comprador_id") REFERENCES "compradores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negociaciones" ADD CONSTRAINT "negociaciones_productor_id_fkey" FOREIGN KEY ("productor_id") REFERENCES "productores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_negociacion_id_fkey" FOREIGN KEY ("negociacion_id") REFERENCES "negociaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_remitente_id_fkey" FOREIGN KEY ("remitente_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_negociacion_id_fkey" FOREIGN KEY ("negociacion_id") REFERENCES "negociaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "confirmaciones_entrega" ADD CONSTRAINT "confirmaciones_entrega_entrega_id_fkey" FOREIGN KEY ("entrega_id") REFERENCES "entregas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "confirmaciones_entrega" ADD CONSTRAINT "confirmaciones_entrega_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_negociacion_id_fkey" FOREIGN KEY ("negociacion_id") REFERENCES "negociaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calificaciones" ADD CONSTRAINT "calificaciones_negociacion_id_fkey" FOREIGN KEY ("negociacion_id") REFERENCES "negociaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calificaciones" ADD CONSTRAINT "calificaciones_evaluador_id_fkey" FOREIGN KEY ("evaluador_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calificaciones" ADD CONSTRAINT "calificaciones_evaluado_id_fkey" FOREIGN KEY ("evaluado_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calificaciones" ADD CONSTRAINT "calificaciones_revisada_por_fkey" FOREIGN KEY ("revisada_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
