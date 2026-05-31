const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

//state machine para estados de negociacion
const TRANSICIONES = {
  pendiente:   ['en_proceso','aceptada','rechazada','cancelada'],
  en_proceso:  ['aceptada','rechazada','cancelada'],
  aceptada:    ['completada','cancelada'],
  rechazada:   [],
  completada:  [],
  cancelada:   [],
};

async function asegurarEntregaParaNegociacion(negociacionId, data = {}) {
  const existe = await prisma.entrega.findUnique({ where: { negociacion_id: negociacionId } });
  if (existe) return existe;

  const neg = await prisma.negociacion.findUnique({
    where: { id: negociacionId },
    include: { publicacion: true },
  });
  if (!neg) return null;

  const lugar = [neg.publicacion?.municipio, neg.publicacion?.departamento].filter(Boolean).join(', ');
  return prisma.entrega.create({
    data: {
      negociacion_id: negociacionId,
      fecha_programada: data.fecha_entrega_acordada ? new Date(data.fecha_entrega_acordada) : neg.fecha_entrega_acordada,
      lugar_entrega: data.lugar_entrega ?? (lugar || null),
      estado: data.estado ?? 'pendiente',
      notas: data.notas,
    },
  });
}

async function listar(req, res, next) {
  try {
    const { estado, page=1, limit=20 } = req.query;
    const u = req.user;
    let where = {};
    if (u.rol === 'comprador') {
      const c = await prisma.comprador.findUnique({ where:{ usuario_id:u.id } });
      where.comprador_id = c?.id ?? 0;
    } else if (u.rol === 'productor') {
      const p = await prisma.productor.findUnique({ where:{ usuario_id:u.id } });
      where.productor_id = p?.id ?? 0;
    } else if (u.rol === 'asociacion') {
      return res.status(403).json({ success:false, message:'La asociación no puede consultar negociaciones privadas' });
    }
    if (estado) where.estado = estado;
    const data = await prisma.negociacion.findMany({
      where,
      include:{
        publicacion:{ select:{ titulo:true, unidad_medida:true } },
        comprador:{ include:{ usuario:{ select:{ nombre:true } } } },
        productor:{ include:{ usuario:{ select:{ nombre:true } } } },
      },
      skip:(Number(page)-1)*Number(limit),
      take:Number(limit),
      orderBy:{ updated_at:'desc' }
    });
    res.json({ success:true, data });
  } catch(e) { next(e); }
}

async function obtener(req, res, next) {
  try {
    const neg = await prisma.negociacion.findUnique({
      where:{ id:Number(req.params.id) },
      include:{
        publicacion:true,
        comprador:{ include:{ usuario:{ select:{ nombre:true, telefono:true } } } },
        productor:{ include:{ usuario:{ select:{ nombre:true, telefono:true } } } },
      }
    });
    if (!neg) return res.status(404).json({ success:false, message:'No encontrada' });
    const esParticipante = neg.comprador.usuario_id === req.user.id || neg.productor.usuario_id === req.user.id;
    if (!esParticipante) return res.status(403).json({ success:false, message:'No es participante de esta negociación' });
    res.json({ success:true, data:neg });
  } catch(e) { next(e); }
}

async function crear(req, res, next) {
  try {
    const comprador = await prisma.comprador.findUnique({ where:{ usuario_id:req.user.id } });
    if (!comprador) return res.status(404).json({ success:false, message:'Perfil de comprador no encontrado' });
    const { publicacion_id, cantidad_solicitada, condiciones } = req.body;
    if (!publicacion_id || !cantidad_solicitada) return res.status(400).json({ success:false, message:'Faltan campos requeridos' });
    const pub = await prisma.publicacion.findUnique({ where:{ id:Number(publicacion_id) } });
    if (!pub || pub.eliminada || pub.estado !== 'activa') return res.status(400).json({ success:false, message:'Publicación no disponible' });
    const existe = await prisma.negociacion.findFirst({ where:{ publicacion_id:Number(publicacion_id), comprador_id:comprador.id, estado:{ in:['pendiente','en_proceso','aceptada'] } } });
    if (existe) return res.status(409).json({ success:false, message:'Ya existe una negociación activa para esta publicación' });
    const data = await prisma.negociacion.create({ data:{ publicacion_id:Number(publicacion_id), comprador_id:comprador.id, productor_id:pub.productor_id, cantidad_solicitada:Number(cantidad_solicitada), condiciones } });
    // Notificar al productor
    const prod = await prisma.productor.findUnique({ where:{ id:pub.productor_id } });
    await prisma.notificacion.create({ data:{ usuario_id:prod.usuario_id, tipo:'nueva_negociacion', titulo:'Nueva solicitud de negociación', mensaje:`Un comprador está interesado en: ${pub.titulo}`, referencia_id:data.id } });
    res.status(201).json({ success:true, data });
  } catch(e) { next(e); }
}

async function cambiarEstado(req, res, next) {
  try {
    const neg = await prisma.negociacion.findUnique({ where:{ id:Number(req.params.id) }, include:{ comprador:true, productor:true } });
    if (!neg) return res.status(404).json({ success:false, message:'No encontrada' });
    const esParticipante = neg.comprador.usuario_id === req.user.id || neg.productor.usuario_id === req.user.id;
    //validación de que el usuario sea parte de la negociación (comprador o productor)
    if (!esParticipante) return res.status(403).json({ success:false, message:'Sin permiso' });
    const { estado, precio_acordado, condiciones, fecha_entrega_acordada } = req.body;
    if (!TRANSICIONES[neg.estado]?.includes(estado))
      return res.status(400).json({ success:false, message:'Transición de estado inválida' });
    const data = await prisma.negociacion.update({ where:{ id:neg.id }, data:{ estado, precio_acordado:precio_acordado?Number(precio_acordado):undefined, condiciones, fecha_entrega_acordada:fecha_entrega_acordada?new Date(fecha_entrega_acordada):undefined } });
    if (estado === 'aceptada') {
      await asegurarEntregaParaNegociacion(neg.id, { fecha_entrega_acordada });
    }
    if (estado === 'completada') {
      const entrega = await asegurarEntregaParaNegociacion(neg.id, { fecha_entrega_acordada, estado:'entregado' });
      if (entrega?.estado !== 'entregado') {
        await prisma.entrega.update({ where:{ id:entrega.id }, data:{ estado:'entregado', fecha_realizada:new Date() } });
      }
    }
    res.json({ success:true, data });
  } catch(e) { next(e); }
}

module.exports = { listar, obtener, crear, cambiarEstado };
