const prisma = require('../prisma');
const { evaluarCierre } = require('./negociaciones.controller');

const ESTADOS_ENTREGA = ['pendiente', 'en_transito', 'entregado', 'con_problema'];

function participacion(negociacion, userId) {
  if (!negociacion) return { esProductor:false, esComprador:false };
  const esProductor = negociacion.productor?.usuario_id === userId;
  const esComprador = negociacion.comprador?.usuario_id === userId;
  return { esProductor, esComprador, participa:esProductor || esComprador };
}

async function obtenerEntregaParticipante(entregaId, userId) {
  const entrega = await prisma.entrega.findUnique({
    where:{ id:entregaId },
    include:{
      confirmaciones:true,
      negociacion:{
        include:{
          publicacion:{ select:{ titulo:true } },
          comprador:{ include:{ usuario:{ select:{ nombre:true } } } },
          productor:{ include:{ usuario:{ select:{ nombre:true } } } },
        },
      },
    },
  });
  if (!entrega) return { entrega:null };
  return { entrega, ...participacion(entrega.negociacion, userId) };
}

async function listar(req, res, next) {
  try {
    const u = req.user;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));
    let negIds = [];
    if (u.rol === 'productor') {
      const p = await prisma.productor.findUnique({ where:{usuario_id:u.id} });
      const negs = await prisma.negociacion.findMany({ where:{productor_id:p?.id ?? 0}, select:{id:true} });
      negIds = negs.map(n=>n.id);
    } else if (u.rol === 'comprador') {
      const c = await prisma.comprador.findUnique({ where:{usuario_id:u.id} });
      const negs = await prisma.negociacion.findMany({ where:{comprador_id:c?.id ?? 0}, select:{id:true} });
      negIds = negs.map(n=>n.id);
    }
    const where = {negociacion_id:{in:negIds}};
    const [data, total] = await Promise.all([
      prisma.entrega.findMany({
        where,
        include:{
          confirmaciones:true,
          negociacion:{
            include:{
              publicacion:{select:{titulo:true}},
              comprador:{include:{usuario:{select:{nombre:true}}}},
              productor:{include:{usuario:{select:{nombre:true}}}},
            }
          }
        },
        skip:(page-1)*limit,
        take:limit,
        orderBy:{created_at:'desc'}
      }),
      prisma.entrega.count({ where }),
    ]);
    res.json({ success:true, data, pagination:{ page, limit, total } });
  } catch(e) { next(e); }
}

async function obtener(req, res, next) {
  try {
    const { entrega, participa } = await obtenerEntregaParticipante(Number(req.params.id), req.user.id);
    if (!entrega) return res.status(404).json({ success:false, message:'No encontrada' });
    if (!participa) return res.status(403).json({ success:false, message:'Sin permiso para consultar esta entrega' });
    res.json({ success:true, data:entrega });
  } catch(e) { next(e); }
}

async function crear(req, res, next) {
  try {
    const { negociacion_id, fecha_programada, lugar_entrega, notas } = req.body;
    if (!negociacion_id) return res.status(400).json({ success:false, message:'La negociación es requerida' });
    const neg = await prisma.negociacion.findUnique({
      where:{ id:Number(negociacion_id) },
      include:{ productor:true, comprador:true },
    });
    if (!neg || (neg.estado !== 'en_transito' && neg.estado !== 'aceptada')) return res.status(400).json({ success:false, message:'La negociación aún no está en tránsito' });
    if (!participacion(neg, req.user.id).participa) {
      return res.status(403).json({ success:false, message:'Sin permiso para crear entrega en esta negociación' });
    }
    const existe = await prisma.entrega.findUnique({ where:{negociacion_id:Number(negociacion_id)} });
    if (existe) return res.status(409).json({ success:false, message:'Ya existe una entrega para esta negociación' });
    if (fecha_programada) {
      const fecha = new Date(fecha_programada);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      if (fecha < hoy) {
        return res.status(400).json({ success: false, message: 'La fecha de entrega no puede ser en el pasado' });
      }
    }
    const data = await prisma.entrega.create({ data:{negociacion_id:Number(negociacion_id),fecha_programada:fecha_programada?new Date(fecha_programada):null,lugar_entrega,notas} });
    res.status(201).json({ success:true, data });
  } catch(e) { next(e); }
}

async function actualizar(req, res, next) {
  try {
    const { fecha_programada, lugar_entrega, estado, notas } = req.body;
    if (estado && !ESTADOS_ENTREGA.includes(estado)) return res.status(400).json({ success:false, message:'Estado de entrega inválido' });
    if (fecha_programada) {
      const fecha = new Date(fecha_programada);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      if (fecha < hoy) {
        return res.status(400).json({ success: false, message: 'La fecha de entrega no puede ser en el pasado' });
      }
    }
    const { entrega, participa } = await obtenerEntregaParticipante(Number(req.params.id), req.user.id);
    if (!entrega) return res.status(404).json({ success:false, message:'No encontrada' });
    if (!participa) return res.status(403).json({ success:false, message:'Sin permiso para actualizar esta entrega' });
    const data = await prisma.entrega.update({ where:{id:entrega.id}, data:{fecha_programada:fecha_programada?new Date(fecha_programada):undefined,lugar_entrega,estado,notas} });

    // Al marcar como enviado, el productor confirma automáticamente su parte
    if (estado === 'en_transito') {
      await prisma.confirmacionEntrega.upsert({
        where: { entrega_id_usuario_id: { entrega_id: entrega.id, usuario_id: req.user.id } },
        create: { entrega_id: entrega.id, usuario_id: req.user.id, rol_confirmador: 'productor', confirmado: true, fecha_confirmacion: new Date() },
        update: { confirmado: true, fecha_confirmacion: new Date() },
      });

      // Notificar al comprador que el producto fue enviado
      const compradorUserId = entrega.negociacion?.comprador?.usuario_id;
      if (compradorUserId) {
        await prisma.notificacion.create({
          data: {
            usuario_id: compradorUserId,
            tipo: 'entrega_enviada',
            titulo: 'Producto enviado',
            mensaje: `El productor ${entrega.negociacion.productor.usuario.nombre} marcó como enviado el pedido de la negociación #${entrega.negociacion_id}. Confirma la recepción cuando lo recibas.`,
            referencia_id: entrega.negociacion_id,
          },
        }).catch(err => console.error('Error creando notificación entrega_enviada:', err));
      }
    }

    res.json({ success:true, data });
  } catch(e) { next(e); }
}

async function confirmar(req, res, next) {
  try {
    const entregaId = Number(req.params.id);
    const { observaciones } = req.body;
    const { entrega, esProductor, esComprador, participa } = await obtenerEntregaParticipante(entregaId, req.user.id);
    if (!entrega) return res.status(404).json({ success:false, message:'Entrega no encontrada' });
    if (!participa) return res.status(403).json({ success:false, message:'Sin permiso para confirmar esta entrega' });
    if (entrega.estado === 'entregado') return res.status(400).json({ success:false, message:'La entrega ya fue completada' });
    if (entrega.estado === 'pendiente') return res.status(400).json({ success:false, message:'El productor aún no ha marcado el envío' });

    const rolConfirmador = esProductor ? 'productor' : esComprador ? 'comprador' : req.user.rol;
    const yaConfirmo = await prisma.confirmacionEntrega.findUnique({ where:{entrega_id_usuario_id:{entrega_id:entregaId,usuario_id:req.user.id}} });
    if (yaConfirmo?.confirmado) return res.status(400).json({ success:false, message:'Ya confirmó previamente esta entrega' });
    await prisma.confirmacionEntrega.upsert({
      where:{ entrega_id_usuario_id:{ entrega_id:entregaId, usuario_id:req.user.id } },
      create:{ entrega_id:entregaId, usuario_id:req.user.id, rol_confirmador:rolConfirmador, confirmado:true, observaciones, fecha_confirmacion:new Date() },
      update:{ confirmado:true, rol_confirmador:rolConfirmador, observaciones, fecha_confirmacion:new Date() },
    });
    // Verificar doble confirmación (productor ya confirmó al marcar enviado)
    const confs = await prisma.confirmacionEntrega.findMany({ where:{entrega_id:entregaId,confirmado:true} });
    const confirmoProductor = confs.some(c => c.rol_confirmador === 'productor');
    const confirmoComprador = confs.some(c => c.rol_confirmador === 'comprador');
    if (confirmoProductor && confirmoComprador) {
      await prisma.entrega.update({ where:{id:entregaId}, data:{estado:'entregado',fecha_realizada:new Date()} });

      // Notificar al productor que el comprador recibió y puede calificar
      const prodUserId = entrega.negociacion?.productor?.usuario_id;
      const compName = entrega.negociacion?.comprador?.usuario?.nombre;
      if (prodUserId && compName) {
        await prisma.notificacion.create({
          data: {
            usuario_id: prodUserId,
            tipo: 'calificar_comprador',
            titulo: 'Pedido recibido por el comprador',
            mensaje: `${compName} recibió el pedido de la negociación #${entrega.negociacion_id}. Deja una reseña en su perfil.`,
            referencia_id: entrega.negociacion_id,
          },
        }).catch(err => console.error('Error creando notificación calificar_comprador:', err));
      }

      // El cierre de la negociación lo decide el helper central
      await evaluarCierre(entrega.negociacion_id);
    }
    res.json({ success:true, message:'Confirmación registrada' });
  } catch(e) { next(e); }
}

module.exports = { listar, obtener, crear, actualizar, confirmar };
