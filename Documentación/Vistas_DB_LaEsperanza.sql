-- ============================================================
-- SISTEMA LA ESPERANZA — Vistas de Base de Datos
-- Versión: 1.0.0 | Mayo 2025
-- Motor: PostgreSQL 16
--
-- DOCUMENTACIÓN TÉCNICA
-- Estas vistas están definidas en el modelo de datos original
-- (Diagrama ER y schema.sql) pero NO fueron implementadas
-- en el schema de Prisma del proyecto.
-- Se documentan aquí para referencia en implementación futura.
-- ============================================================

-- ============================================================
-- VISTA: v_publicaciones_activas
-- Descripción: Muestra todas las publicaciones activas con
--              datos del productor y producto.
-- Uso: Dashboard principal y listado de publicaciones.
-- ============================================================
CREATE OR REPLACE VIEW v_publicaciones_activas AS
SELECT
    p.id,
    p.titulo,
    p.precio_unitario,
    p.cantidad_disponible,
    p.unidad_medida,
    p.departamento,
    p.municipio,
    p.fecha_cosecha,
    p.imagen_url,
    p.created_at,
    pr.nombre         AS nombre_producto,
    pr.categoria      AS categoria_producto,
    u.nombre          AS nombre_productor,
    prod.calificacion AS calificacion_productor
FROM publicaciones p
JOIN productos    pr   ON p.producto_id  = pr.id
JOIN productores  prod ON p.productor_id = prod.id
JOIN usuarios     u    ON prod.usuario_id = u.id
WHERE p.estado = 'activa';

COMMENT ON VIEW v_publicaciones_activas IS
'Publicaciones activas con información combinada de producto y productor';

COMMENT ON COLUMN v_publicaciones_activas.nombre_productor IS
'Nombre del productor desde la tabla usuarios';


-- ============================================================
-- VISTA: v_negociaciones_resumen
-- Descripción: Resumen de negociaciones con nombres de
--              participantes y publicación asociada.
-- Uso: Listados de negociaciones para dashboard y reportes.
-- ============================================================
CREATE OR REPLACE VIEW v_negociaciones_resumen AS
SELECT
    n.id,
    n.estado,
    n.cantidad_solicitada,
    n.precio_acordado,
    n.fecha_entrega_acordada,
    n.created_at,
    p.titulo          AS titulo_publicacion,
    uc.nombre         AS nombre_comprador,
    up.nombre         AS nombre_productor
FROM negociaciones n
JOIN publicaciones p   ON n.publicacion_id = p.id
JOIN compradores  c    ON n.comprador_id   = c.id
JOIN usuarios     uc   ON c.usuario_id     = uc.id
JOIN productores  pr   ON n.productor_id   = pr.id
JOIN usuarios     up   ON pr.usuario_id    = up.id;

COMMENT ON VIEW v_negociaciones_resumen IS
'Resumen de negociaciones con participantes y publicación';


-- ============================================================
-- VISTA ADICIONAL: v_entregas_pendientes
-- Descripción: Entregas pendientes con datos de negociación
--              y participantes para seguimiento.
-- Uso: Módulo de entregas, dashboard.
-- ============================================================
CREATE OR REPLACE VIEW v_entregas_pendientes AS
SELECT
    e.id,
    e.fecha_programada,
    e.fecha_realizada,
    e.lugar_entrega,
    e.estado           AS estado_entrega,
    e.notas,
    n.id               AS negociacion_id,
    n.estado           AS estado_negociacion,
    p.titulo           AS titulo_publicacion,
    up.nombre          AS nombre_productor,
    uc.nombre          AS nombre_comprador,
    (SELECT COUNT(*) FROM confirmaciones_entrega ce
     WHERE ce.entrega_id = e.id AND ce.confirmado = TRUE) AS confirmaciones_recibidas
FROM entregas e
JOIN negociaciones n  ON e.negociacion_id = n.id
JOIN publicaciones p  ON n.publicacion_id = p.id
JOIN productores pr   ON n.productor_id   = pr.id
JOIN usuarios up      ON pr.usuario_id    = up.id
JOIN compradores c    ON n.comprador_id   = c.id
JOIN usuarios uc      ON c.usuario_id     = uc.id;

COMMENT ON VIEW v_entregas_pendientes IS
'Entregas con detalle de negociación, participantes y conteo de confirmaciones';


-- ============================================================
-- VISTA ADICIONAL: v_pagos_resumen
-- Descripción: Pagos agrupados por estado con totales.
-- Uso: Reportes financieros, dashboard.
-- ============================================================
CREATE OR REPLACE VIEW v_pagos_resumen AS
SELECT
    p.estado,
    COUNT(*)                            AS cantidad_pagos,
    SUM(p.monto)                        AS monto_total,
    MIN(p.fecha_pago)                   AS primer_pago,
    MAX(p.fecha_pago)                   AS ultimo_pago,
    AVG(p.monto)                        AS monto_promedio
FROM pagos p
GROUP BY p.estado
ORDER BY p.estado;

COMMENT ON VIEW v_pagos_resumen IS
'Resumen de pagos agrupados por estado con métricas agregadas';


-- ============================================================
-- NOTAS DE IMPLEMENTACIÓN
-- ============================================================
-- Para agregar estas vistas al proyecto real se debe:
--
-- 1. Crear un archivo de migración SQL raw en Prisma:
--    prisma/migrations/<timestamp>_vistas/migration.sql
--
-- 2. O ejecutar manualmente contra la BD:
--    psql -U <user> -d <database> -f Vistas_DB_LaEsperanza.sql
--
-- 3. Si se usa Prisma, agregar en schema.prisma:
--    model v_publicaciones_activas {
--      // Definición como view (Prisma 5+ soporta views)
--      @@map("v_publicaciones_activas")
--    }
--
-- 4. Extensión recomendada (documentada pero no implementada):
--    CREATE EXTENSION IF NOT EXISTS "pg_trgm";
--    Esta extensión permite búsquedas por similitud de texto
--    para la funcionalidad de búsqueda en publicaciones.
-- ============================================================
