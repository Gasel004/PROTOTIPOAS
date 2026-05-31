const r = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { verificarToken, soloRoles } = require('../middleware/auth');

async function asociacionActual(userId) {
  return prisma.asociacion.findUnique({ where:{ usuario_id:userId } });
}

r.get('/', async (req, res) => {
  const where = { activa:true };
  if (req.query.departamento) where.departamento = req.query.departamento;
  const data = await prisma.asociacion.findMany({ where, orderBy:{ nombre:'asc' } });
  res.json({ success:true, data });
});

r.post('/', verificarToken, soloRoles('asociacion'), async (req, res) => {
  const existente = await asociacionActual(req.user.id);
  if (existente) return res.status(409).json({ success:false, message:'Este usuario ya tiene un perfil de asociación' });
  const { nombre, nit, municipio, departamento, descripcion, activa=true } = req.body;
  if (!nombre) return res.status(400).json({ success:false, message:'El nombre de la asociación es requerido' });
  const data = await prisma.asociacion.create({ data:{ usuario_id:req.user.id, nombre, nit, municipio, departamento, descripcion, activa:Boolean(activa) } });
  res.status(201).json({ success:true, data });
});

r.get('/miembros', verificarToken, soloRoles('asociacion'), async (req, res) => {
  const asoc = await asociacionActual(req.user.id);
  if (!asoc) return res.status(404).json({ success:false, message:'Perfil de asociación no encontrado' });
  const data = await prisma.productor.findMany({
    where:{ asociacion_id:asoc.id },
    include:{
      usuario:{ select:{ nombre:true, telefono:true, activo:true, created_at:true } },
      _count:{ select:{ publicaciones:true, negociaciones:true } },
    },
    orderBy:{ created_at:'desc' },
  });
  res.json({ success:true, data });
});

// ── Suspender productor (temporal o definitivo) ──────────
r.put('/miembros/suspender/:id', verificarToken, soloRoles('asociacion'), async (req, res) => {
  const asoc = await asociacionActual(req.user.id);
  if (!asoc) return res.status(404).json({ success:false, message:'Perfil de asociación no encontrado' });

  const productor = await prisma.productor.findUnique({ where:{ id:Number(req.params.id) } });
  if (!productor || productor.asociacion_id !== asoc.id) {
    return res.status(404).json({ success:false, message:'Productor no encontrado en esta asociación' });
  }

  const { temporal, motivo, dias } = req.body;
  const suspendido_hasta = temporal && dias ? new Date(Date.now() + dias * 86400000) : null;
  const suspendido_definitivo = !temporal;

  await prisma.productor.update({
    where:{ id:productor.id },
    data:{ suspendido_hasta, suspendido_definitivo, suspension_motivo: motivo || null },
  });

  const tipo = temporal ? `suspendido por ${dias} día(s)` : 'suspendido definitivamente';
  res.json({ success:true, message:`Productor ${tipo}` });
});

// ── Reactivar productor ──────────────────────────────────
r.put('/miembros/reactivar/:id', verificarToken, soloRoles('asociacion'), async (req, res) => {
  const asoc = await asociacionActual(req.user.id);
  if (!asoc) return res.status(404).json({ success:false, message:'Perfil de asociación no encontrado' });

  const productor = await prisma.productor.findUnique({ where:{ id:Number(req.params.id) } });
  if (!productor || productor.asociacion_id !== asoc.id) {
    return res.status(404).json({ success:false, message:'Productor no encontrado en esta asociación' });
  }

  await prisma.productor.update({
    where:{ id:productor.id },
    data:{ suspendido_hasta: null, suspendido_definitivo: false, suspension_motivo: null },
  });

  res.json({ success:true, message:'Productor reactivado' });
});

// ── Calificaciones pendientes de moderación ──────────────
r.get('/calificaciones/pendientes', verificarToken, soloRoles('asociacion'), async (req, res) => {
  const asoc = await asociacionActual(req.user.id);
  if (!asoc) return res.status(404).json({ success:false, message:'Perfil de asociación no encontrado' });

  const productorIds = (await prisma.productor.findMany({
    where:{ asociacion_id: asoc.id },
    select:{ id: true },
  })).map(p => p.id);

  const negociacionIds = (await prisma.negociacion.findMany({
    where:{ productor_id: { in: productorIds } },
    select:{ id: true },
  })).map(n => n.id);

  const data = await prisma.calificacion.findMany({
    where:{
      negociacion_id: { in: negociacionIds },
      estado: 'pendiente',
    },
    include:{
      evaluador: { select:{ nombre: true, rol: true, telefono: true } },
      evaluado:  { select:{ nombre: true, rol: true, telefono: true } },
      negociacion: {
        select:{ id: true },
      },
    },
    orderBy:{ created_at: 'asc' },
  });

  res.json({ success:true, data });
});

// ── Validar que la calificación involucre a un productor de la asociación ──
async function verificarCalAsociacion(cal, userId) {
  if (cal.estado !== 'pendiente') throw Object.assign(new Error('La calificación ya fue revisada'), { status: 400 });
  const asoc = await asociacionActual(userId);
  if (!asoc) throw Object.assign(new Error('Perfil de asociación no encontrado'), { status: 404 });
  const negociacion = await prisma.negociacion.findUnique({ where:{ id: cal.negociacion_id } });
  if (!negociacion) throw Object.assign(new Error('Negociación no encontrada'), { status: 404 });
  const productor = await prisma.productor.findUnique({ where:{ id: negociacion.productor_id } });
  if (!productor || productor.asociacion_id !== asoc.id)
    throw Object.assign(new Error('Esta calificación no pertenece a un productor de tu asociación'), { status: 403 });
}

// ── Aprobar calificación ─────────────────────────────────
r.put('/calificaciones/:id/aprobar', verificarToken, soloRoles('asociacion'), async (req, res) => {
  try {
    const cal = await prisma.calificacion.findUnique({ where:{ id:Number(req.params.id) } });
    if (!cal) return res.status(404).json({ success:false, message:'Calificación no encontrada' });
    await verificarCalAsociacion(cal, req.user.id);

    await prisma.calificacion.update({
      where:{ id: cal.id },
      data:{ estado:'aprobada', revisada_por: req.user.id, reviewed_at: new Date() },
    });

    // Actualizar promedio del evaluado
    const evaluado = await prisma.usuario.findUnique({ where:{ id: cal.evaluado_id }, select:{ rol: true } });
    const aprobadas = await prisma.calificacion.findMany({
      where:{ evaluado_id: cal.evaluado_id, estado:'aprobada' },
      select:{ puntaje: true },
    });
    const promedio = aprobadas.reduce((s, c) => s + c.puntaje, 0) / (aprobadas.length || 1);

    if (evaluado?.rol === 'productor') {
      await prisma.productor.updateMany({
        where:{ usuario_id: cal.evaluado_id },
        data:{ calificacion: Math.round(promedio * 100) / 100 },
      });
    } else if (evaluado?.rol === 'comprador') {
      await prisma.comprador.updateMany({
        where:{ usuario_id: cal.evaluado_id },
        data:{ calificacion: Math.round(promedio * 100) / 100 },
      });
    }

    res.json({ success:true, message:'Calificación aprobada' });
  } catch (err) {
    const status = err.status ?? 500;
    res.status(status).json({ success:false, message: err.message ?? 'Error interno' });
  }
});

// ── Rechazar calificación ────────────────────────────────
r.put('/calificaciones/:id/rechazar', verificarToken, soloRoles('asociacion'), async (req, res) => {
  try {
    const cal = await prisma.calificacion.findUnique({ where:{ id:Number(req.params.id) } });
    if (!cal) return res.status(404).json({ success:false, message:'Calificación no encontrada' });
    await verificarCalAsociacion(cal, req.user.id);

    await prisma.calificacion.update({
      where:{ id: cal.id },
      data:{ estado:'rechazada', revisada_por: req.user.id, reviewed_at: new Date(), motivo_revision: req.body.motivo || null },
    });

    res.json({ success:true, message:'Calificación rechazada' });
  } catch (err) {
    const status = err.status ?? 500;
    res.status(status).json({ success:false, message: err.message ?? 'Error interno' });
  }
});

r.post('/miembros', verificarToken, soloRoles('asociacion'), async (req, res) => {
  const { telefono } = req.body;
  if (!telefono) return res.status(400).json({ success:false, message:'El teléfono del productor es requerido' });
  const asoc = await asociacionActual(req.user.id);
  if (!asoc) return res.status(404).json({ success:false, message:'Perfil de asociación no encontrado' });

  const usuario = await prisma.usuario.findUnique({ where:{ telefono }, include:{ productor:true } });
  if (!usuario || usuario.rol !== 'productor' || !usuario.productor) {
    return res.status(404).json({ success:false, message:'No se encontró un productor con ese teléfono' });
  }

  const data = await prisma.productor.update({
    where:{ id:usuario.productor.id },
    data:{ asociacion_id:asoc.id },
    include:{ usuario:{ select:{ nombre:true, telefono:true, activo:true, created_at:true } }, _count:{ select:{ publicaciones:true, negociaciones:true } } },
  });
  res.json({ success:true, data, message:'Productor vinculado a la asociación' });
});

r.delete('/miembros/:id', verificarToken, soloRoles('asociacion'), async (req, res) => {
  const asoc = await asociacionActual(req.user.id);
  if (!asoc) return res.status(404).json({ success:false, message:'Perfil de asociación no encontrado' });
  const productor = await prisma.productor.findUnique({ where:{ id:Number(req.params.id) } });
  if (!productor || productor.asociacion_id !== asoc.id) {
    return res.status(404).json({ success:false, message:'Productor no encontrado en esta asociación' });
  }
  await prisma.productor.update({ where:{ id:productor.id }, data:{ asociacion_id:null } });
  res.json({ success:true, message:'Productor removido de la asociación' });
});

r.get('/:id', async (req, res) => {
  const data = await prisma.asociacion.findUnique({
    where:{id:Number(req.params.id)},
    include:{ productores:{ include:{ usuario:{ select:{ nombre:true, telefono:true, activo:true } } } } }
  });
  if (!data) return res.status(404).json({ success:false, message:'No encontrada' });
  res.json({ success:true, data });
});

r.put('/:id', verificarToken, soloRoles('asociacion'), async (req, res) => {
  const { nombre, telefono, nit, municipio, departamento, descripcion, activa } = req.body;
  const id = Number(req.params.id);
  const actual = await prisma.asociacion.findFirst({
    where:{
      usuario_id:req.user.id,
      OR:[{ id }, { usuario_id:id }],
    },
  });
  if (!actual) return res.status(404).json({ success:false, message:'No encontrada' });
  const data = await prisma.asociacion.update({
    where:{ id:actual.id },
    data:{
      nombre:nombre ?? actual.nombre,
      nit,
      municipio,
      departamento,
      descripcion,
      activa: activa === undefined ? undefined : Boolean(activa),
    },
  });
  const usuarioData = {};
  if (nombre) usuarioData.nombre = nombre;
  if (telefono) usuarioData.telefono = telefono;
  if (Object.keys(usuarioData).length) {
    await prisma.usuario.update({ where:{ id:data.usuario_id }, data:usuarioData });
  }
  res.json({ success:true, data });
});

module.exports = r;
