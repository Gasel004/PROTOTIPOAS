-- ============================================================
-- SISTEMA LA ESPERANZA — Script de Creación de Base de Datos
-- Versión: 1.0.0 | Mayo 2025
-- Motor: PostgreSQL 16
-- ============================================================

-- ── Extensiones ──────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- búsquedas por similitud

-- ── Tipos enumerados ─────────────────────────────────────
CREATE TYPE rol_usuario        AS ENUM ('productor', 'comprador', 'asociacion');
CREATE TYPE estado_publicacion AS ENUM ('activa', 'pausada', 'cerrada', 'vencida');
CREATE TYPE estado_negociacion AS ENUM ('pendiente', 'en_proceso', 'aceptada', 'rechazada', 'completada', 'cancelada');
CREATE TYPE estado_entrega     AS ENUM ('pendiente', 'en_transito', 'entregado', 'con_problema');
CREATE TYPE estado_pago        AS ENUM ('pendiente', 'completado', 'fallido', 'reembolsado');

-- ============================================================
-- TABLA: usuarios
-- Almacena credenciales y datos comunes de todos los usuarios
-- ============================================================
CREATE TABLE usuarios (
    id            SERIAL          PRIMARY KEY,
    nombre        VARCHAR(100)    NOT NULL,
    email         VARCHAR(150)    NOT NULL UNIQUE,
    password_hash VARCHAR(255)    NOT NULL,
    rol           rol_usuario     NOT NULL,
    telefono      VARCHAR(20),
    activo        BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_rol   ON usuarios(rol);

-- ============================================================
-- TABLA: asociaciones
-- Asociaciones de agricultores (deben crearse antes de productores)
-- ============================================================
CREATE TABLE asociaciones (
    id           SERIAL        PRIMARY KEY,
    usuario_id   INTEGER       NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre       VARCHAR(200)  NOT NULL,
    nit          VARCHAR(20)   UNIQUE,
    municipio    VARCHAR(100),
    departamento VARCHAR(100),
    descripcion  TEXT,
    activa       BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: productores
-- Extiende usuarios con datos específicos del rol productor
-- ============================================================
CREATE TABLE productores (
    id            SERIAL        PRIMARY KEY,
    usuario_id    INTEGER       NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    asociacion_id INTEGER       REFERENCES asociaciones(id),
    dpi           VARCHAR(20)   UNIQUE,
    municipio     VARCHAR(100),
    departamento  VARCHAR(100),
    hectareas     DECIMAL(8,2),
    descripcion   TEXT,
    calificacion  DECIMAL(3,2)  NOT NULL DEFAULT 0.00,
    created_at    TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_productores_departamento ON productores(departamento);
CREATE INDEX idx_productores_asociacion   ON productores(asociacion_id);

-- ============================================================
-- TABLA: compradores
-- Extiende usuarios con datos comerciales del rol comprador
-- ============================================================
CREATE TABLE compradores (
    id             SERIAL        PRIMARY KEY,
    usuario_id     INTEGER       NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    razon_social   VARCHAR(200),
    nit            VARCHAR(20)   UNIQUE,
    municipio      VARCHAR(100),
    departamento   VARCHAR(100),
    tipo_comprador VARCHAR(50),
    calificacion   DECIMAL(3,2)  NOT NULL DEFAULT 0.00,
    created_at     TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: productos
-- Catálogo de productos agrícolas disponibles en el sistema
-- ============================================================
CREATE TABLE productos (
    id            SERIAL        PRIMARY KEY,
    nombre        VARCHAR(150)  NOT NULL,
    categoria     VARCHAR(100),
    unidad_medida VARCHAR(30)   NOT NULL,
    descripcion   TEXT,
    activo        BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_productos_categoria ON productos(categoria);

-- ============================================================
-- TABLA: publicaciones
-- Ofertas de venta creadas por los productores
-- ============================================================
CREATE TABLE publicaciones (
    id                  SERIAL              PRIMARY KEY,
    productor_id        INTEGER             NOT NULL REFERENCES productores(id),
    producto_id         INTEGER             NOT NULL REFERENCES productos(id),
    titulo              VARCHAR(200)        NOT NULL,
    descripcion         TEXT,
    cantidad_disponible DECIMAL(10,2)       NOT NULL,
    precio_unitario     DECIMAL(10,2)       NOT NULL,
    unidad_medida       VARCHAR(30)         NOT NULL,
    municipio           VARCHAR(100),
    departamento        VARCHAR(100),
    fecha_cosecha       DATE,
    estado              estado_publicacion  NOT NULL DEFAULT 'activa',
    imagen_url          VARCHAR(500),
    created_at          TIMESTAMP           NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP           NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_publicaciones_estado       ON publicaciones(estado);
CREATE INDEX idx_publicaciones_departamento ON publicaciones(departamento);
CREATE INDEX idx_publicaciones_producto     ON publicaciones(producto_id);
CREATE INDEX idx_publicaciones_productor    ON publicaciones(productor_id);
CREATE INDEX idx_publicaciones_precio       ON publicaciones(precio_unitario);

-- ============================================================
-- TABLA: negociaciones
-- Proceso de negociación privada entre productor y comprador
-- ============================================================
CREATE TABLE negociaciones (
    id                     SERIAL              PRIMARY KEY,
    publicacion_id         INTEGER             NOT NULL REFERENCES publicaciones(id),
    comprador_id           INTEGER             NOT NULL REFERENCES compradores(id),
    productor_id           INTEGER             NOT NULL REFERENCES productores(id),
    cantidad_solicitada    DECIMAL(10,2)       NOT NULL,
    precio_acordado        DECIMAL(10,2),
    estado                 estado_negociacion  NOT NULL DEFAULT 'pendiente',
    condiciones            TEXT,
    fecha_entrega_acordada DATE,
    created_at             TIMESTAMP           NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMP           NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_negociaciones_comprador   ON negociaciones(comprador_id);
CREATE INDEX idx_negociaciones_productor   ON negociaciones(productor_id);
CREATE INDEX idx_negociaciones_estado      ON negociaciones(estado);
CREATE INDEX idx_negociaciones_publicacion ON negociaciones(publicacion_id);

-- ============================================================
-- TABLA: mensajes
-- Canal de mensajería privado dentro de cada negociación
-- ============================================================
CREATE TABLE mensajes (
    id             SERIAL     PRIMARY KEY,
    negociacion_id INTEGER    NOT NULL REFERENCES negociaciones(id) ON DELETE CASCADE,
    remitente_id   INTEGER    NOT NULL REFERENCES usuarios(id),
    contenido      TEXT       NOT NULL,
    leido          BOOLEAN    NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMP  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mensajes_negociacion ON mensajes(negociacion_id);
CREATE INDEX idx_mensajes_remitente   ON mensajes(remitente_id);

-- ============================================================
-- TABLA: entregas
-- Registro del proceso de entrega física del producto
-- ============================================================
CREATE TABLE entregas (
    id               SERIAL          PRIMARY KEY,
    negociacion_id   INTEGER         NOT NULL UNIQUE REFERENCES negociaciones(id),
    fecha_programada DATE,
    fecha_realizada  DATE,
    lugar_entrega    VARCHAR(300),
    estado           estado_entrega  NOT NULL DEFAULT 'pendiente',
    notas            TEXT,
    created_at       TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_entregas_estado ON entregas(estado);

-- ============================================================
-- TABLA: confirmaciones_entrega
-- Confirmación doble: productor Y comprador deben confirmar
-- ============================================================
CREATE TABLE confirmaciones_entrega (
    id                 SERIAL     PRIMARY KEY,
    entrega_id         INTEGER    NOT NULL REFERENCES entregas(id) ON DELETE CASCADE,
    usuario_id         INTEGER    NOT NULL REFERENCES usuarios(id),
    rol_confirmador    VARCHAR(20) NOT NULL,
    confirmado         BOOLEAN    NOT NULL DEFAULT FALSE,
    observaciones      TEXT,
    fecha_confirmacion TIMESTAMP,
    UNIQUE(entrega_id, usuario_id)
);

CREATE INDEX idx_confirmaciones_entrega ON confirmaciones_entrega(entrega_id);

-- ============================================================
-- TABLA: pagos
-- Registro de pagos asociados a negociaciones
-- ============================================================
CREATE TABLE pagos (
    id             SERIAL       PRIMARY KEY,
    negociacion_id INTEGER      NOT NULL REFERENCES negociaciones(id),
    monto          DECIMAL(12,2) NOT NULL,
    metodo_pago    VARCHAR(50)  NOT NULL,
    referencia     VARCHAR(200),
    estado         estado_pago  NOT NULL DEFAULT 'pendiente',
    fecha_pago     DATE,
    registrado_por INTEGER      REFERENCES usuarios(id),
    notas          TEXT,
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pagos_negociacion ON pagos(negociacion_id);
CREATE INDEX idx_pagos_estado      ON pagos(estado);

-- ============================================================
-- TABLA: notificaciones
-- Sistema de alertas internas del sistema
-- ============================================================
CREATE TABLE notificaciones (
    id            SERIAL     PRIMARY KEY,
    usuario_id    INTEGER    NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo          VARCHAR(50) NOT NULL,
    titulo        VARCHAR(200) NOT NULL,
    mensaje       TEXT       NOT NULL,
    leida         BOOLEAN    NOT NULL DEFAULT FALSE,
    referencia_id INTEGER,
    created_at    TIMESTAMP  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notificaciones_usuario ON notificaciones(usuario_id);
CREATE INDEX idx_notificaciones_leida   ON notificaciones(leida);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Trigger: actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION fn_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_usuarios_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

CREATE TRIGGER trg_publicaciones_updated_at
    BEFORE UPDATE ON publicaciones
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

CREATE TRIGGER trg_negociaciones_updated_at
    BEFORE UPDATE ON negociaciones
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

CREATE TRIGGER trg_entregas_updated_at
    BEFORE UPDATE ON entregas
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- Trigger: completar negociación automáticamente al confirmar ambas partes
CREATE OR REPLACE FUNCTION fn_verificar_doble_confirmacion()
RETURNS TRIGGER AS $$
DECLARE
    v_total_confirmaciones INTEGER;
    v_negociacion_id       INTEGER;
BEGIN
    IF NEW.confirmado = TRUE THEN
        SELECT COUNT(*) INTO v_total_confirmaciones
        FROM confirmaciones_entrega
        WHERE entrega_id = NEW.entrega_id AND confirmado = TRUE;

        IF v_total_confirmaciones >= 2 THEN
            UPDATE entregas
            SET estado = 'entregado', fecha_realizada = NOW()
            WHERE id = NEW.entrega_id;

            SELECT negociacion_id INTO v_negociacion_id
            FROM entregas WHERE id = NEW.entrega_id;

            UPDATE negociaciones
            SET estado = 'completada'
            WHERE id = v_negociacion_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_doble_confirmacion
    AFTER INSERT OR UPDATE ON confirmaciones_entrega
    FOR EACH ROW EXECUTE FUNCTION fn_verificar_doble_confirmacion();

-- ============================================================
-- VISTAS
-- ============================================================

-- Vista: publicaciones activas con datos del productor y producto
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
    pr.nombre      AS nombre_producto,
    pr.categoria   AS categoria_producto,
    u.nombre       AS nombre_productor,
    prod.calificacion AS calificacion_productor
FROM publicaciones p
JOIN productos  pr   ON p.producto_id  = pr.id
JOIN productores prod ON p.productor_id = prod.id
JOIN usuarios   u    ON prod.usuario_id = u.id
WHERE p.estado = 'activa';

-- Vista: resumen de negociaciones con participantes
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
JOIN publicaciones p  ON n.publicacion_id = p.id
JOIN compradores  c   ON n.comprador_id   = c.id
JOIN usuarios     uc  ON c.usuario_id     = uc.id
JOIN productores  pr  ON n.productor_id   = pr.id
JOIN usuarios     up  ON pr.usuario_id    = up.id;

-- ============================================================
-- FIN DEL SCRIPT
-- Sistema La Esperanza v1.0.0
-- ============================================================
