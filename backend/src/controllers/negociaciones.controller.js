const prisma = require('../prisma');

//state machine para estados de negociacion
// - 'aceptada' se mantiene en el enum por compatibilidad con datos legacy,
//   pero ya no se usa como destino de una transición nueva: cuando ambas
//   partes confirman el precio, la negociación salta a 'en_transito'.
// - 'completada' es auto-derivada por el helper evaluarCierre() y nunca
//   puede ser target de un PATCH directo.
const TRANSICIONES = {
  pendiente:   ['en_proceso','en_transito','rechazada','cancelada'],
  en_proceso:  ['en_transito','rechazada','cancelada'],
  en_transito:['cancelada'],
  aceptada:    ['en_transito','completada','cancelada'],
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
    if (Number(cantidad_solicitada) > Number(pub.cantidad_disponible)) return res.status(400).json({ success:false, message:'La cantidad solicitada supera el disponible' });
    const existe = await prisma.negociacion.findFirst({ where:{ publicacion_id:Number(publicacion_id), comprador_id:comprador.id, estado:{ in:['pendiente','en_proceso','en_transito','aceptada'] } } });
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
    const esProductor = neg.productor.usuario_id === req.user.id;
    const esComprador = neg.comprador.usuario_id === req.user.id;
    if (!esProductor && !esComprador) return res.status(403).json({ success:false, message:'Sin permiso' });
    const { estado, precio_acordado, condiciones, fecha_entrega_acordada } = req.body;

    // 'completada' es auto-derivada; no se permite vía PATCH directo
    if (estado === 'completada') {
      return res.status(400).json({ success:false, message:'La negociación se completa automáticamente al confirmar entrega y pago' });
    }

    // 'en_transito' (o alias 'aceptada' por back-compat) cubre dos casos
    // distintos según si el body trae `precio_acordado`:
    //   - Con precio: es una NUEVA PROPUESTA del usuario actual (incluida
    //     la primera propuesta cuando ninguno había confirmado). Seteo mi
    //     bit, reseteo el del otro, actualizo precio. El estado NO
    //     transiciona: la negociación sigue en 'pendiente'/'en_proceso'
    //     esperando que la contraparte acepte o renegocie.
    //   - Sin precio: es una ACEPTACIÓN de la propuesta ya existente.
    //     Seteo mi bit, mantengo el del otro. Si ambos quedan confirmados,
    //     transiciono a 'en_transito' y creo la entrega.
    if (estado === 'en_transito' || estado === 'aceptada') {
      if (!TRANSICIONES[neg.estado]?.includes('en_transito'))
        return res.status(400).json({ success:false, message:'Transición de estado inválida' });

      const updateData = {
        condiciones,
        fecha_entrega_acordada: fecha_entrega_acordada ? new Date(fecha_entrega_acordada) : undefined,
      };
      let huboRenegociacion = false;

      if (precio_acordado != null) {
        // Renegociación / propuesta inicial
        huboRenegociacion = true;
        updateData.precio_acordado = Number(precio_acordado);
        if (esProductor) {
          updateData.confirmacion_productor = true;
          updateData.confirmacion_comprador = false;
          updateData.fecha_confirmacion_productor = new Date();
        } else {
          updateData.confirmacion_comprador = true;
          updateData.confirmacion_productor = false;
          updateData.fecha_confirmacion_comprador = new Date();
        }
      } else {
        // Aceptación
        if (esProductor) {
          updateData.confirmacion_productor = true;
          updateData.fecha_confirmacion_productor = neg.confirmacion_productor ? neg.fecha_confirmacion_productor : new Date();
        } else {
          updateData.confirmacion_comprador = true;
          updateData.fecha_confirmacion_comprador = neg.confirmacion_comprador ? neg.fecha_confirmacion_comprador : new Date();
        }
        const yaProductor = esProductor ? true : neg.confirmacion_productor;
        const yaComprador = esComprador ? true : neg.confirmacion_comprador;
        if (yaProductor && yaComprador && neg.estado !== 'en_transito') {
          updateData.estado = 'en_transito';
        }
      }

      const data = await prisma.negociacion.update({ where:{ id:neg.id }, data:updateData });

      if (updateData.estado === 'en_transito') {
        await asegurarEntregaParaNegociacion(neg.id, { fecha_entrega_acordada });
        await prisma.notificacion.create({ data:{ usuario_id:neg.comprador.usuario_id, tipo:'acuerdo_confirmado', titulo:'Acuerdo confirmado', mensaje:'El acuerdo fue confirmado por ambas partes. Pendiente de entrega y pago.', referencia_id:neg.id } });
        await prisma.notificacion.create({ data:{ usuario_id:neg.productor.usuario_id, tipo:'acuerdo_confirmado', titulo:'Acuerdo confirmado', mensaje:'El acuerdo fue confirmado por ambas partes. Pendiente de entrega y pago.', referencia_id:neg.id } });
      } else if (huboRenegociacion) {
        const otherUserId = esProductor ? neg.comprador.usuario_id : neg.productor.usuario_id;
        await prisma.notificacion.create({ data:{ usuario_id:otherUserId, tipo:'propuesta_precio', titulo:'Nueva propuesta de precio', mensaje:`Hay una nueva propuesta de precio para la negociación #${neg.id}.`, referencia_id:neg.id } }).catch(() => {});
      }
      return res.json({ success:true, data });
    }

    // Cualquier otra transición directa (rechazar, cancelar, etc.)
    if (!TRANSICIONES[neg.estado]?.includes(estado))
      return res.status(400).json({ success:false, message:'Transición de estado inválida' });
    const data = await prisma.negociacion.update({ where:{ id:neg.id }, data:{ estado, precio_acordado:precio_acordado?Number(precio_acordado):undefined, condiciones, fecha_entrega_acordada:fecha_entrega_acordada?new Date(fecha_entrega_acordada):undefined } });
    res.json({ success:true, data });
  } catch(e) { next(e); }
}

// ---------------------------------------------------------------------------
// evaluarCierre(negociacionId)
//
// Cierra la negociación si y solo si se cumplen AMBAS condiciones:
//   (a) entrega en estado 'entregado'
//   (b) suma de pagos con estado 'completado' >= precio_acordado * cantidad
//
// Es idempotente. Llamar desde entregas.controller.js (al confirmar la
// entrega) y desde pagos.controller.js (al marcar un pago como completado).
// No-op si la negociación no está en 'en_transito' o si las condiciones
// todavía no se cumplen.
// ---------------------------------------------------------------------------
async function evaluarCierre(negociacionId) {
  const neg = await prisma.negociacion.findUnique({
    where:{ id:Number(negociacionId) },
    include:{
      entrega:{ include:{ confirmaciones:true } },
      pagos:true,
    },
  });
  if (!neg) return null;
  if (neg.estado !== 'en_transito') return neg;
  if (neg.precio_acordado == null) return neg;
  if (!neg.entrega || neg.entrega.estado !== 'entregado') return neg;

  const totalPagado = neg.pagos
    .filter(p => p.estado === 'completado')
    .reduce((acc, p) => acc + Number(p.monto), 0);
  const totalEsperado = Number(neg.precio_acordado) * Number(neg.cantidad_solicitada);
  if (totalPagado + 0.0001 < totalEsperado) return neg;

  const updated = await prisma.negociacion.update({
    where:{ id:neg.id },
    data:{ estado:'completada' },
  });

  // Notificar a ambas partes
  await prisma.notificacion.create({ data:{ usuario_id:neg.comprador?.usuario_id, tipo:'negociacion_completada', titulo:'Negociación completada', mensaje:'La negociación se completó: entrega confirmada y pago recibido.', referencia_id:neg.id } }).catch(() => {});
  await prisma.notificacion.create({ data:{ usuario_id:neg.productor?.usuario_id, tipo:'negociacion_completada', titulo:'Negociación completada', mensaje:'La negociación se completó: entrega confirmada y pago recibido.', referencia_id:neg.id } }).catch(() => {});

  return updated;
}

module.exports = { listar, obtener, crear, cambiarEstado, evaluarCierre };
