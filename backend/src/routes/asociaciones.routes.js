const r = require('express').Router();
const prisma = require('../prisma');
const { verificarToken, verificarUsuarioActivo, soloRoles } = require('../middleware/auth');
const { registrar: auditar } = require('../utils/auditoria');

async function asociacionActual(userId) {
  return prisma.asociacion.findUnique({ where:{ usuario_id:userId } });
}

async function notificarSuspension(usuarioId, temporal, dias, motivo) {
  const tipo = temporal ? `suspendida temporalmente por ${dias} día(s)` : 'suspendida definitivamente';
  await prisma.notificacion.create({
    data: {
      usuario_id: usuarioId,
      tipo: 'suspension',
      titulo: 'Cuenta suspendida por la asociación',
      mensaje: `Tu cuenta ha sido ${tipo}. Motivo: ${motivo || 'No especificado'}.`,
    },
  });
}

r.get('/', async (req, res, next) => {
  try {
    const where = { activa:true };
    if (req.query.departamento) where.departamento = req.query.departamento;
    const data = await prisma.asociacion.findMany({ where, orderBy:{ nombre:'asc' } });
    res.json({ success:true, data });
  } catch(e) { next(e); }
});

r.post('/', verificarToken, verificarUsuarioActivo, soloRoles('asociacion'), async (req, res, next) => {
  try {
    const existente = await asociacionActual(req.user.id);
    if (existente) return res.status(409).json({ success:false, message:'Este usuario ya tiene un perfil de asociación' });
    const { nombre, nit, municipio, departamento, descripcion, activa=true } = req.body;
    if (!nombre) return res.status(400).json({ success:false, message:'El nombre de la asociación es requerido' });
    const data = await prisma.asociacion.create({ data:{ usuario_id:req.user.id, nombre, nit, municipio, departamento, descripcion, activa:Boolean(activa) } });
    res.status(201).json({ success:true, data });
  } catch(e) { next(e); }
});

// ── Listar todos los usuarios del sistema (productores + compradores) ──
r.get('/usuarios', verificarToken, verificarUsuarioActivo, soloRoles('asociacion'), async (req, res, next) => {
  try {
    const { tipo, estado, busqueda } = req.query;
    const whereUsuario = {};
    if (busqueda) {
      whereUsuario.OR = [
        { nombre: { contains: busqueda, mode: 'insensitive' } },
        { telefono: { contains: busqueda, mode: 'insensitive' } },
      ];
    }

    const [productores, compradores] = await Promise.all([
      (!tipo || tipo === 'productor') ? prisma.productor.findMany({
        where: buildSuspensionFilter(estado),
        include: {
          usuario: { select: { id: true, nombre: true, telefono: true, activo: true, created_at: true, rol: true } },
          asociacion: { select: { nombre: true } },
        },
        orderBy: { created_at: 'desc' },
      }).then(rows => rows.filter(p => {
        if (!busqueda) return true;
        const n = p.usuario?.nombre?.toLowerCase() || '';
        const t = p.usuario?.telefono || '';
        return n.includes(busqueda.toLowerCase()) || t.includes(busqueda);
      })) : [],
      (!tipo || tipo === 'comprador') ? prisma.comprador.findMany({
        where: buildCompradorSuspensionFilter(estado),
        include: {
          usuario: { select: { id: true, nombre: true, telefono: true, activo: true, created_at: true, rol: true } },
        },
        orderBy: { created_at: 'desc' },
      }).then(rows => rows.filter(c => {
        if (!busqueda) return true;
        const n = c.usuario?.nombre?.toLowerCase() || '';
        const t = c.usuario?.telefono || '';
        return n.includes(busqueda.toLowerCase()) || t.includes(busqueda);
      })) : [],
    ]);

    const usuarios = [
      ...productores.map(p => ({ ...p, tipo: 'productor' })),
      ...compradores.map(c => ({ ...c, tipo: 'comprador' })),
    ];

    res.json({ success: true, data: usuarios, total: usuarios.length });
  } catch (e) { next(e); }
});

function buildSuspensionFilter(estado) {
  const now = new Date();
  if (estado === 'suspendido') return { OR: [{ suspendido_definitivo: true }, { suspendido_hasta: { gt: now } }] };
  if (estado === 'activo') return { suspendido_definitivo: false, OR: [{ suspendido_hasta: null }, { suspendido_hasta: { lte: now } }] };
  return {};
}

function buildCompradorSuspensionFilter(estado) {
  const now = new Date();
  if (estado === 'suspendido') return { OR: [{ suspendido_definitivo: true }, { suspendido_hasta: { gt: now } }] };
  if (estado === 'activo') return { suspendido_definitivo: false, OR: [{ suspendido_hasta: null }, { suspendido_hasta: { lte: now } }] };
  return {};
}

// ── Miembros (productores y compradores vinculados a la asociación) ──
r.get('/miembros', verificarToken, verificarUsuarioActivo, soloRoles('asociacion'), async (req, res, next) => {
  try {
    const asoc = await asociacionActual(req.user.id);
    if (!asoc) return res.status(404).json({ success:false, message:'Perfil de asociación no encontrado' });

    const [productores, compradores] = await Promise.all([
      prisma.productor.findMany({
        where:{ asociacion_id:asoc.id },
        include:{
          usuario:{ select:{ nombre:true, telefono:true, activo:true, created_at:true } },
          _count:{ select:{ publicaciones:true, negociaciones:true } },
        },
        orderBy:{ created_at:'desc' },
      }),
      prisma.comprador.findMany({
        where:{ asociacion_id:asoc.id },
        include:{
          usuario:{ select:{ nombre:true, telefono:true, activo:true, created_at:true } },
        },
        orderBy:{ created_at:'desc' },
      }),
    ]);

    const miembros = [
      ...productores.map(p => ({ ...p, tipo: 'productor' })),
      ...compradores.map(c => ({ ...c, tipo: 'comprador' })),
    ];

    res.json({ success:true, data: miembros });
  } catch(e) { next(e); }
});

// ── Suspender productor (temporal o definitivo) ──
r.put('/miembros/suspender/:id', verificarToken, verificarUsuarioActivo, soloRoles('asociacion'), async (req, res, next) => {
  try {
    const asoc = await asociacionActual(req.user.id);
    if (!asoc) return res.status(404).json({ success:false, message:'Perfil de asociación no encontrado' });

    const productor = await prisma.productor.findUnique({ where:{ id:Number(req.params.id) }, include:{ usuario:{ select:{ id:true, nombre:true } } } });
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

    await notificarSuspension(productor.usuario.id, temporal, dias, motivo);

    await auditar({
      accion: 'suspension',
      entidad: 'productor',
      entidad_id: productor.id,
      usuario_id: req.user.id,
      detalle: { temporal, dias, motivo, suspendido_definitivo },
    });

    const tipo = temporal ? `suspendido por ${dias} día(s)` : 'suspendido definitivamente';
    res.json({ success:true, message:`Productor ${tipo}` });
  } catch(e) { next(e); }
});

// ── Reactivar productor ──
r.put('/miembros/reactivar/:id', verificarToken, verificarUsuarioActivo, soloRoles('asociacion'), async (req, res, next) => {
  try {
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

    await auditar({
      accion: 'reactivacion',
      entidad: 'productor',
      entidad_id: productor.id,
      usuario_id: req.user.id,
    });

    res.json({ success:true, message:'Productor reactivado' });
  } catch(e) { next(e); }
});

// ── Suspender comprador (temporal o definitivo) ──
r.put('/compradores/suspender/:id', verificarToken, verificarUsuarioActivo, soloRoles('asociacion'), async (req, res, next) => {
  try {
    const comprador = await prisma.comprador.findUnique({ where:{ id:Number(req.params.id) }, include:{ usuario:{ select:{ id:true, nombre:true } } } });
    if (!comprador) return res.status(404).json({ success:false, message:'Comprador no encontrado' });

    const { temporal, motivo, dias } = req.body;
    const suspendido_hasta = temporal && dias ? new Date(Date.now() + dias * 86400000) : null;
    const suspendido_definitivo = !temporal;

    await prisma.comprador.update({
      where:{ id:comprador.id },
      data:{ suspendido_hasta, suspendido_definitivo, suspension_motivo: motivo || null },
    });

    await notificarSuspension(comprador.usuario.id, temporal, dias, motivo);

    await auditar({
      accion: 'suspension',
      entidad: 'comprador',
      entidad_id: comprador.id,
      usuario_id: req.user.id,
      detalle: { temporal, dias, motivo, suspendido_definitivo },
    });

    const tipo = temporal ? `suspendido por ${dias} día(s)` : 'suspendido definitivamente';
    res.json({ success:true, message:`Comprador ${tipo}` });
  } catch(e) { next(e); }
});

// ── Reactivar comprador ──
r.put('/compradores/reactivar/:id', verificarToken, verificarUsuarioActivo, soloRoles('asociacion'), async (req, res, next) => {
  try {
    const comprador = await prisma.comprador.findUnique({ where:{ id:Number(req.params.id) } });
    if (!comprador) return res.status(404).json({ success:false, message:'Comprador no encontrado' });

    await prisma.comprador.update({
      where:{ id:comprador.id },
      data:{ suspendido_hasta: null, suspendido_definitivo: false, suspension_motivo: null },
    });

    await auditar({
      accion: 'reactivacion',
      entidad: 'comprador',
      entidad_id: comprador.id,
      usuario_id: req.user.id,
    });

    res.json({ success:true, message:'Comprador reactivado' });
  } catch(e) { next(e); }
});

// ── Calificaciones pendientes de moderación ──
r.get('/calificaciones/pendientes', verificarToken, verificarUsuarioActivo, soloRoles('asociacion'), async (req, res, next) => {
  try {
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
  } catch(e) { next(e); }
});

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

r.put('/calificaciones/:id/aprobar', verificarToken, verificarUsuarioActivo, soloRoles('asociacion'), async (req, res, next) => {
  try {
    const cal = await prisma.calificacion.findUnique({ where:{ id:Number(req.params.id) } });
    if (!cal) return res.status(404).json({ success:false, message:'Calificación no encontrada' });
    await verificarCalAsociacion(cal, req.user.id);

    await prisma.calificacion.update({
      where:{ id: cal.id },
      data:{ estado:'aprobada', revisada_por: req.user.id, reviewed_at: new Date() },
    });

    const evaluado = await prisma.usuario.findUnique({ where:{ id: cal.evaluado_id }, select:{ rol: true } });
    const aprobadas = await prisma.calificacion.findMany({
      where:{ evaluado_id: cal.evaluado_id, estado:'aprobada' },
      select:{ puntaje: true },
    });
    const promedio = aprobadas.reduce((s, c) => s + c.puntaje, 0) / (aprobadas.length || 1);

    if (evaluado?.rol === 'productor') {
      await prisma.productor.updateMany({ where:{ usuario_id: cal.evaluado_id }, data:{ calificacion: Math.round(promedio * 100) / 100 } });
    } else if (evaluado?.rol === 'comprador') {
      await prisma.comprador.updateMany({ where:{ usuario_id: cal.evaluado_id }, data:{ calificacion: Math.round(promedio * 100) / 100 } });
    }

    res.json({ success:true, message:'Calificación aprobada' });
  } catch(e) { next(e); }
});

r.put('/calificaciones/:id/rechazar', verificarToken, verificarUsuarioActivo, soloRoles('asociacion'), async (req, res, next) => {
  try {
    const cal = await prisma.calificacion.findUnique({ where:{ id:Number(req.params.id) } });
    if (!cal) return res.status(404).json({ success:false, message:'Calificación no encontrada' });
    await verificarCalAsociacion(cal, req.user.id);

    const motivoRevision = req.body.motivo || null;
    await prisma.calificacion.update({
      where:{ id: cal.id },
      data:{ estado:'rechazada', revisada_por: req.user.id, reviewed_at: new Date(), motivo_revision: motivoRevision },
    });

    await auditar({
      accion: 'rechazo_calificacion',
      entidad: 'calificacion',
      entidad_id: cal.id,
      usuario_id: req.user.id,
      detalle: { motivo: motivoRevision },
    });

    res.json({ success:true, message:'Calificación rechazada' });
  } catch(e) { next(e); }
});

r.post('/miembros', verificarToken, verificarUsuarioActivo, soloRoles('asociacion'), async (req, res, next) => {
  try {
    const { telefono, tipo } = req.body;
    if (!telefono) return res.status(400).json({ success:false, message:'El teléfono es requerido' });
    const asoc = await asociacionActual(req.user.id);
    if (!asoc) return res.status(404).json({ success:false, message:'Perfil de asociación no encontrado' });

    const usuario = await prisma.usuario.findUnique({ where:{ telefono }, include:{ productor:true, comprador:true } });
    if (!usuario) return res.status(404).json({ success:false, message:'No se encontró un usuario con ese teléfono' });

    if ((tipo === 'comprador' || usuario.rol === 'comprador') && usuario.comprador) {
      if (usuario.comprador.asociacion_id) {
        return res.status(409).json({ success:false, message:'Este comprador ya está vinculado a una asociación' });
      }
      const data = await prisma.comprador.update({
        where:{ id:usuario.comprador.id },
        data:{ asociacion_id:asoc.id },
        include:{ usuario:{ select:{ nombre:true, telefono:true, activo:true, created_at:true } } },
      });
      return res.json({ success:true, data: { ...data, tipo: 'comprador' }, message:'Comprador vinculado a la asociación' });
    }

    if (usuario.rol === 'productor' && usuario.productor) {
      if (usuario.productor.asociacion_id) {
        return res.status(409).json({ success:false, message:'Este productor ya está vinculado a una asociación' });
      }
      const data = await prisma.productor.update({
        where:{ id:usuario.productor.id },
        data:{ asociacion_id:asoc.id },
        include:{ usuario:{ select:{ nombre:true, telefono:true, activo:true, created_at:true } }, _count:{ select:{ publicaciones:true, negociaciones:true } } },
      });
      return res.json({ success:true, data: { ...data, tipo: 'productor' }, message:'Productor vinculado a la asociación' });
    }

    return res.status(400).json({ success:false, message:'El usuario no tiene un perfil de productor o comprador' });
  } catch(e) { next(e); }
});

r.delete('/miembros/:id', verificarToken, verificarUsuarioActivo, soloRoles('asociacion'), async (req, res, next) => {
  try {
    const asoc = await asociacionActual(req.user.id);
    if (!asoc) return res.status(404).json({ success:false, message:'Perfil de asociación no encontrado' });
    const entityId = Number(req.params.id);
    const { tipo } = req.query;

    if (tipo === 'comprador') {
      const comprador = await prisma.comprador.findFirst({ where:{ id: entityId, asociacion_id: asoc.id } });
      if (!comprador) return res.status(404).json({ success:false, message:'Comprador no encontrado en esta asociación' });
      await prisma.comprador.update({ where:{ id: comprador.id }, data:{ asociacion_id: null } });
      return res.json({ success:true, message:'Comprador removido de la asociación' });
    }

    const productor = await prisma.productor.findFirst({ where:{ id: entityId, asociacion_id: asoc.id } });
    if (!productor) return res.status(404).json({ success:false, message:'Productor no encontrado en esta asociación' });
    await prisma.productor.update({ where:{ id: productor.id }, data:{ asociacion_id: null } });
    res.json({ success:true, message:'Productor removido de la asociación' });
  } catch(e) { next(e); }
});

r.get('/:id', async (req, res, next) => {
  try {
    const data = await prisma.asociacion.findUnique({
      where:{id:Number(req.params.id)},
      include:{ productores:{ include:{ usuario:{ select:{ nombre:true, activo:true } } } } }
    });
    if (!data) return res.status(404).json({ success:false, message:'No encontrada' });
    res.json({ success:true, data });
  } catch(e) { next(e); }
});

r.put('/:id', verificarToken, verificarUsuarioActivo, soloRoles('asociacion'), async (req, res, next) => {
  try {
    const { nombre, telefono, nit, municipio, departamento, descripcion, activa } = req.body;
    const id = Number(req.params.id);
    const actual = await prisma.asociacion.findFirst({
      where:{
        usuario_id:req.user.id,
        OR:[{ id }, { usuario_id:id }],
      },
    });
    if (!actual) return res.status(404).json({ success:false, message:'No encontrada' });

    const usuarioData = {};
    if (nombre) usuarioData.nombre = nombre;
    if (telefono) usuarioData.telefono = telefono;

    const data = await prisma.$transaction(async (tx) => {
      const updated = await tx.asociacion.update({
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
      if (Object.keys(usuarioData).length) {
        await tx.usuario.update({ where:{ id:updated.usuario_id }, data:usuarioData });
      }
      return updated;
    });

    res.json({ success:true, data });
  } catch(e) { next(e); }
});

module.exports = r;
