// ============================================================
// SISTEMA LA ESPERANZA — Ejemplos de Pruebas Automatizadas
// Versión: 1.0.0 | Mayo 2026
// Framework: Jest + Supertest
//
// DOCUMENTACIÓN TÉCNICA
// Basado en el Plan_Pruebas_LaEsperanza.docx y
// Casos_Prueba_LaEsperanza.docx existentes.
// Estos son ejemplos de cómo deberían implementarse las
// pruebas para el proyecto.
//
// Para ejecutar: npm test (requiere Jest + Supertest instalados)
// ============================================================

const request = require('supertest');
const app     = require('../src/index'); // Asumiendo que exporta app

// ─── Datos de prueba ────────────────────────────────────────
const USUARIO_PRODUCTOR = {
  email: 'productor@test.com',
  password: 'Test1234!',
  nombre: 'Productor Test',
  rol: 'productor',
};
const USUARIO_COMPRADOR = {
  email: 'comprador@test.com',
  password: 'Test1234!',
  nombre: 'Comprador Test',
  rol: 'comprador',
};

let tokenProductor;
let tokenComprador;
let publicacionId;
let negociacionId;

// ============================================================
// MÓDULO: Autenticación
// ============================================================
describe('🔐 Auth — Registro y Login', () => {

  test('POST /api/v1/auth/register — debe registrar un nuevo usuario', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(USUARIO_PRODUCTOR)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user.rol).toBe('productor');
    tokenProductor = res.body.data.token;
  });

  test('POST /api/v1/auth/register — debe rechazar email duplicado', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(USUARIO_PRODUCTOR)
      .expect(409);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/registrado/i);
  });

  test('POST /api/v1/auth/register — debe rechazar datos incompletos', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'solo@email.com' })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  test('POST /api/v1/auth/login — debe autenticar con credenciales correctas', async () => {
    // Registrar comprador primero
    await request(app).post('/api/v1/auth/register').send(USUARIO_COMPRADOR);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: USUARIO_COMPRADOR.email, password: USUARIO_COMPRADOR.password })
      .expect(200);

    expect(res.body.data).toHaveProperty('token');
    tokenComprador = res.body.data.token;
  });

  test('POST /api/v1/auth/login — debe rechazar contraseña incorrecta', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: USUARIO_COMPRADOR.email, password: 'wrongpass' })
      .expect(401);

    expect(res.body.success).toBe(false);
  });

  test('POST /api/v1/auth/login — debe rechazar email inexistente', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'noexiste@test.com', password: 'Test1234!' })
      .expect(401);
  });

  test('GET /api/v1/auth/me — debe devolver datos del usuario autenticado', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${tokenProductor}`)
      .expect(200);

    expect(res.body.data.email).toBe(USUARIO_PRODUCTOR.email);
    expect(res.body.data).not.toHaveProperty('password_hash');
  });

  test('GET /api/v1/auth/me — debe rechazar sin token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .expect(401);

    expect(res.body.message).toMatch(/token/i);
  });
});

// ============================================================
// MÓDULO: Publicaciones
// ============================================================
describe('📋 Publicaciones — CRUD', () => {

  test('POST /api/v1/publicaciones — debe crear publicación (solo productor)', async () => {
    const res = await request(app)
      .post('/api/v1/publicaciones')
      .set('Authorization', `Bearer ${tokenProductor}`)
      .send({
        producto_id: 1,
        titulo: 'Maíz blanco de prueba',
        cantidad_disponible: 100,
        precio_unitario: 120,
        unidad_medida: 'quintal',
        departamento: 'Chiquimula',
        municipio: 'Chiquimula',
      })
      .expect(201);

    expect(res.body.data.titulo).toBe('Maíz blanco de prueba');
    publicacionId = res.body.data.id;
  });

  test('POST /api/v1/publicaciones — debe rechazar creación sin datos requeridos', async () => {
    const res = await request(app)
      .post('/api/v1/publicaciones')
      .set('Authorization', `Bearer ${tokenProductor}`)
      .send({ titulo: 'Incompleto' })
      .expect(400);
  });

  test('POST /api/v1/publicaciones — debe rechazar si no es productor', async () => {
    const res = await request(app)
      .post('/api/v1/publicaciones')
      .set('Authorization', `Bearer ${tokenComprador}`)
      .send({
        producto_id: 1,
        titulo: 'Intento de comprador',
        cantidad_disponible: 10,
        precio_unitario: 50,
        unidad_medida: 'quintal',
      })
      .expect(403);
  });

  test('GET /api/v1/publicaciones — debe listar publicaciones activas', async () => {
    const res = await request(app)
      .get('/api/v1/publicaciones')
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  test('GET /api/v1/publicaciones — debe filtrar por departamento', async () => {
    const res = await request(app)
      .get('/api/v1/publicaciones?departamento=Chiquimula')
      .expect(200);

    res.body.data.forEach(p => {
      expect(p.departamento).toBe('Chiquimula');
    });
  });

  test('GET /api/v1/publicaciones/:id — debe obtener detalle', async () => {
    const res = await request(app)
      .get(`/api/v1/publicaciones/${publicacionId}`)
      .expect(200);

    expect(res.body.data.id).toBe(publicacionId);
  });

  test('GET /api/v1/publicaciones/:id — debe devolver 404 si no existe', async () => {
    await request(app)
      .get('/api/v1/publicaciones/99999')
      .expect(404);
  });

  test('PUT /api/v1/publicaciones/:id — debe actualizar (solo dueño)', async () => {
    const res = await request(app)
      .put(`/api/v1/publicaciones/${publicacionId}`)
      .set('Authorization', `Bearer ${tokenProductor}`)
      .send({ titulo: 'Maíz actualizado', precio_unitario: 130 })
      .expect(200);

    expect(res.body.data.titulo).toBe('Maíz actualizado');
  });

  test('PUT /api/v1/publicaciones/:id — debe rechazar si no es el dueño', async () => {
    await request(app)
      .put(`/api/v1/publicaciones/${publicacionId}`)
      .set('Authorization', `Bearer ${tokenComprador}`)
      .send({ titulo: 'Intento ajeno' })
      .expect(403);
  });

  test('PATCH /api/v1/publicaciones/:id/estado — debe cambiar estado', async () => {
    const res = await request(app)
      .patch(`/api/v1/publicaciones/${publicacionId}/estado`)
      .set('Authorization', `Bearer ${tokenProductor}`)
      .send({ estado: 'pausada' })
      .expect(200);

    expect(res.body.data.estado).toBe('pausada');
  });

  test('PATCH /api/v1/publicaciones/:id/estado — debe rechazar estado inválido', async () => {
    await request(app)
      .patch(`/api/v1/publicaciones/${publicacionId}/estado`)
      .set('Authorization', `Bearer ${tokenProductor}`)
      .send({ estado: 'estado_invalido' })
      .expect(400);
  });
});

// ============================================================
// MÓDULO: Negociaciones
// ============================================================
describe('🤝 Negociaciones — Flujo completo', () => {

  test('POST /api/v1/negociaciones — debe crear negociación (solo comprador)', async () => {
    const res = await request(app)
      .post('/api/v1/negociaciones')
      .set('Authorization', `Bearer ${tokenComprador}`)
      .send({
        publicacion_id: publicacionId,
        cantidad_solicitada: 50,
        condiciones: 'Pago al contado, recojo en finca',
      })
      .expect(201);

    expect(res.body.data.estado).toBe('pendiente');
    negociacionId = res.body.data.id;
  });

  test('POST /api/v1/negociaciones — debe rechazar si publicación no está activa', async () => {
    const res = await request(app)
      .post('/api/v1/negociaciones')
      .set('Authorization', `Bearer ${tokenComprador}`)
      .send({
        publicacion_id: publicacionId,
        cantidad_solicitada: 10,
      })
      .expect(400); // La publicación está en "pausada"

    expect(res.body.message).toMatch(/no disponible/i);
  });

  test('GET /api/v1/negociaciones — productor ve sus negociaciones', async () => {
    // Primero reactivar publicación
    await request(app)
      .patch(`/api/v1/publicaciones/${publicacionId}/estado`)
      .set('Authorization', `Bearer ${tokenProductor}`)
      .send({ estado: 'activa' });

    // Crear negociación en publicación activa
    const negRes = await request(app)
      .post('/api/v1/negociaciones')
      .set('Authorization', `Bearer ${tokenComprador}`)
      .send({ publicacion_id: publicacionId, cantidad_solicitada: 30 });

    const res = await request(app)
      .get('/api/v1/negociaciones')
      .set('Authorization', `Bearer ${tokenProductor}`)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('PATCH /api/v1/negociaciones/:id/estado — productor puede aceptar', async () => {
    const res = await request(app)
      .patch(`/api/v1/negociaciones/${negociacionId}/estado`)
      .set('Authorization', `Bearer ${tokenProductor}`)
      .send({ estado: 'aceptada', precio_acordado: 120 })
      .expect(200);

    expect(res.body.data.estado).toBe('aceptada');
    expect(res.body.data.precio_acordado).toBe(120);
  });

  test('PATCH /api/v1/negociaciones/:id/estado — debe rechazar transición inválida', async () => {
    await request(app)
      .patch(`/api/v1/negociaciones/${negociacionId}/estado`)
      .set('Authorization', `Bearer ${tokenProductor}`)
      .send({ estado: 'pendiente' }) // No se puede volver a pendiente desde aceptada
      .expect(400);
  });

  test('GET /api/v1/negociaciones/:id — participante puede ver detalle', async () => {
    const res = await request(app)
      .get(`/api/v1/negociaciones/${negociacionId}`)
      .set('Authorization', `Bearer ${tokenComprador}`)
      .expect(200);

    expect(res.body.data.id).toBe(negociacionId);
  });

  test('GET /api/v1/negociaciones/:id — no participante NO puede ver', async () => {
    // Registrar un tercer usuario
    const userRes = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'otro@test.com', password: 'Test1234!', nombre: 'Otro', rol: 'comprador' });

    const otroToken = userRes.body.data.token;

    await request(app)
      .get(`/api/v1/negociaciones/${negociacionId}`)
      .set('Authorization', `Bearer ${otroToken}`)
      .expect(403);
  });
});

// ============================================================
// MÓDULO: Mensajes
// ============================================================
describe('💬 Mensajes — Chat en negociaciones', () => {

  test('POST /api/v1/negociaciones/:id/mensajes — debe enviar mensaje', async () => {
    const res = await request(app)
      .post(`/api/v1/negociaciones/${negociacionId}/mensajes`)
      .set('Authorization', `Bearer ${tokenProductor}`)
      .send({ contenido: 'Hola, gracias por tu interés' })
      .expect(201);

    expect(res.body.data.contenido).toBe('Hola, gracias por tu interés');
  });

  test('GET /api/v1/negociaciones/:id/mensajes — debe listar mensajes', async () => {
    const res = await request(app)
      .get(`/api/v1/negociaciones/${negociacionId}/mensajes`)
      .set('Authorization', `Bearer ${tokenComprador}`)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  test('POST /api/v1/negociaciones/:id/mensajes — debe rechazar contenido vacío', async () => {
    await request(app)
      .post(`/api/v1/negociaciones/${negociacionId}/mensajes`)
      .set('Authorization', `Bearer ${tokenProductor}`)
      .send({ contenido: '' })
      .expect(400);
  });
});

// ============================================================
// MÓDULO: Entregas
// ============================================================
describe('📦 Entregas — Gestión y confirmación', () => {

  let entregaId;

  test('POST /api/v1/entregas — debe crear entrega para negociación aceptada', async () => {
    const res = await request(app)
      .post('/api/v1/entregas')
      .set('Authorization', `Bearer ${tokenProductor}`)
      .send({
        negociacion_id: negociacionId,
        fecha_programada: '2025-06-01',
        lugar_entrega: 'Finca de prueba, Chiquimula',
      })
      .expect(201);

    expect(res.body.data.estado).toBe('pendiente');
    entregaId = res.body.data.id;
  });

  test('POST /api/v1/entregas — debe rechazar duplicado', async () => {
    await request(app)
      .post('/api/v1/entregas')
      .set('Authorization', `Bearer ${tokenProductor}`)
      .send({ negociacion_id: negociacionId })
      .expect(409);
  });

  test('POST /api/v1/entregas/:id/confirmar — primera confirmación (productor)', async () => {
    const res = await request(app)
      .post(`/api/v1/entregas/${entregaId}/confirmar`)
      .set('Authorization', `Bearer ${tokenProductor}`)
      .send({ observaciones: 'Producto en buen estado' })
      .expect(200);

    expect(res.body.message).toMatch(/confirmaci/i);
  });

  test('POST /api/v1/entregas/:id/confirmar — segunda confirmación (comprador) completa entrega', async () => {
    const res = await request(app)
      .post(`/api/v1/entregas/${entregaId}/confirmar`)
      .set('Authorization', `Bearer ${tokenComprador}`)
      .send({ observaciones: 'Todo correcto' })
      .expect(200);

    // Verificar que la entrega pasó a "entregado"
    const entregaRes = await request(app)
      .get(`/api/v1/entregas/${entregaId}`)
      .set('Authorization', `Bearer ${tokenProductor}`);

    expect(entregaRes.body.data.estado).toBe('entregado');

    // Verificar que la negociación pasó a "completada"
    const negRes = await request(app)
      .get(`/api/v1/negociaciones/${negociacionId}`)
      .set('Authorization', `Bearer ${tokenProductor}`);

    expect(negRes.body.data.estado).toBe('completada');
  });
});

// ============================================================
// MÓDULO: Pagos
// ============================================================
describe('💳 Pagos — Registro y estados', () => {

  test('POST /api/v1/pagos — debe registrar pago', async () => {
    const res = await request(app)
      .post('/api/v1/pagos')
      .set('Authorization', `Bearer ${tokenComprador}`)
      .send({
        negociacion_id: negociacionId,
        monto: 6000,
        metodo_pago: 'transferencia',
        referencia: 'TRF-TEST-001',
      })
      .expect(201);

    expect(res.body.data.monto).toBe(6000);
    expect(res.body.data.estado).toBe('pendiente');
  });

  test('POST /api/v1/pagos — debe rechazar monto inválido', async () => {
    await request(app)
      .post('/api/v1/pagos')
      .set('Authorization', `Bearer ${tokenComprador}`)
      .send({
        negociacion_id: negociacionId,
        monto: 0,
        metodo_pago: 'efectivo',
      })
      .expect(400);
  });

  test('PUT /api/v1/pagos/:id — debe cambiar estado a completado', async () => {
    const pagosRes = await request(app)
      .get('/api/v1/pagos')
      .set('Authorization', `Bearer ${tokenComprador}`);

    const pagoId = pagosRes.body.data[0]?.id;

    const res = await request(app)
      .put(`/api/v1/pagos/${pagoId}`)
      .set('Authorization', `Bearer ${tokenProductor}`)
      .send({ estado: 'completado' })
      .expect(200);

    expect(res.body.data.estado).toBe('completado');
  });
});

// ============================================================
// MÓDULO: Notificaciones
// ============================================================
describe('🔔 Notificaciones', () => {

  test('GET /api/v1/notificaciones — debe listar notificaciones del usuario', async () => {
    const res = await request(app)
      .get('/api/v1/notificaciones')
      .set('Authorization', `Bearer ${tokenProductor}`)
      .expect(200);

    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('noLeidas');
  });

  test('PATCH /api/v1/notificaciones/leer-todas — debe marcar todas como leídas', async () => {
    const res = await request(app)
      .patch('/api/v1/notificaciones/leer-todas')
      .set('Authorization', `Bearer ${tokenProductor}`)
      .expect(200);

    expect(res.body.actualizadas).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================
// MÓDULO: Control de Acceso (RBAC)
// ============================================================
describe('🛡️ RBAC — Control de acceso por roles', () => {

  test('Debe rechazar endpoints de productor si el usuario es comprador', async () => {
    await request(app)
      .post('/api/v1/publicaciones')
      .set('Authorization', `Bearer ${tokenComprador}`)
      .send({ titulo: 'Test', producto_id: 1, cantidad_disponible: 10, precio_unitario: 100, unidad_medida: 'qq' })
      .expect(403);
  });

  test('Debe rechazar creación de negociación si el usuario es productor', async () => {
    await request(app)
      .post('/api/v1/negociaciones')
      .set('Authorization', `Bearer ${tokenProductor}`)
      .send({ publicacion_id: 1, cantidad_solicitada: 10 })
      .expect(403);
  });

  test('Debe rechazar solicitudes sin token', async () => {
    await request(app)
      .get('/api/v1/negociaciones')
      .expect(401);
  });

  test('Debe rechazar token inválido', async () => {
    await request(app)
      .get('/api/v1/negociaciones')
      .set('Authorization', 'Bearer token_invalido')
      .expect(401);
  });
});

// ============================================================
// MÓDULO: Health Check
// ============================================================
describe('🏥 Health Check', () => {
  test('GET /api/v1/health — debe responder OK', async () => {
    const res = await request(app)
      .get('/api/v1/health')
      .expect(200);

    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('timestamp');
  });
});

// ============================================================
// NOTAS DE IMPLEMENTACIÓN
// ============================================================
// Para que estas pruebas funcionen se necesita:
//
// 1. Exportar `app` desde src/index.js:
//    module.exports = app;  // (además de app.listen)
//
// 2. Tener una BD de prueba separada (ej: .env.test)
//    DATABASE_URL=postgresql://user:pass@localhost:5432/laesperanza_test
//
// 3. Configurar Jest en package.json:
//    "jest": {
//      "testEnvironment": "node",
//      "setupFilesAfterSetup": ["./jest.setup.js"]
//    }
//
// 4. Crear un archivo jest.setup.js para:
//    - Ejecutar prisma db push antes de los tests
//    - Ejecutar seed con datos de prueba
//    - Limpiar BD entre cada suite de tests
//
// 5. Scripts en package.json:
//    "test": "NODE_ENV=test jest --detectOpenHandles --forceExit",
//    "test:watch": "NODE_ENV=test jest --watch"
// ============================================================
