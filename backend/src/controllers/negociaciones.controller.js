const prisma = require('../prisma');
const { Prisma } = require('@prisma/client');

//state machine para estados de negociacion
// - 'aceptada' se mantiene en el enum por compatibilidad con datos legacy,
//   pero ya no se usa como destino de una transición nueva: cuando ambas
//   partes confirman el precio, la negociación salta a 'en_transito'.
// - 'completada' es auto-derivada por el helper evaluarCierre() y nunca
//   puede ser target de un PATCH directo.
const TRANSICIONES = {
  pendiente:         ['en_proceso','en_transito','rechazada','cancelada'],
  en_proceso:        ['en_transito','rechazada','cancelada'],
  en_transito:       ['cancelada'],
  acuerdo_pendiente: ['en_transito','rechazada','cancelada'],
  aceptada:          ['en_transito','completada','cancelada'],
  rechazada:         [],
  completada:        [],
  cancelada:         [],
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
        entrega:true,
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
    const { publicacion_id, cantidad_solicitada, precio_acordado, condiciones } = req.body;
    if (!publicacion_id || !cantidad_solicitada) return res.status(400).json({ success:false, message:'Faltan campos requeridos' });

    const data = await prisma.$transaction(async (tx) => {
      const pub = await tx.publicacion.findUnique({ where:{ id:Number(publicacion_id) } });
      if (!pub || pub.eliminada || pub.estado !== 'activa') throw Object.assign(new Error('Publicación no disponible'), { status: 400 });
      if (Number(cantidad_solicitada) > Number(pub.cantidad_disponible)) throw Object.assign(new Error(`La cantidad solicitada (${cantidad_solicitada}) supera el disponible (${pub.cantidad_disponible})`), { status: 400 });

      const existe = await tx.negociacion.findFirst({ where:{ publicacion_id:Number(publicacion_id), comprador_id:comprador.id, estado:{ in:['pendiente','en_proceso','en_transito','aceptada','acuerdo_pendiente'] } } });
      if (existe) throw Object.assign(new Error('Ya existe una negociación activa para esta publicación'), { status: 409 });

      const tienePropuestaInicial = precio_acordado != null;
      const neg = await tx.negociacion.create({ data:{
        publicacion_id:Number(publicacion_id),
        comprador_id:comprador.id,
        productor_id:pub.productor_id,
        cantidad_solicitada:Number(cantidad_solicitada),
        precio_acordado: tienePropuestaInicial ? Number(precio_acordado) : undefined,
        confirmacion_comprador: tienePropuestaInicial,
        fecha_confirmacion_comprador: tienePropuestaInicial ? new Date() : undefined,
        condiciones,
      }});

      await tx.publicacion.update({ where:{ id:pub.id }, data:{ cantidad_disponible: { decrement: Number(cantidad_solicitada) } } });

      // Notificar al productor
      const prod = await tx.productor.findUnique({ where:{ id:pub.productor_id } });
      const tipoNotif = tienePropuestaInicial ? 'propuesta_precio' : 'nueva_negociacion';
      const tituloNotif = tienePropuestaInicial ? 'Nueva negociación con propuesta de precio' : 'Nueva solicitud de negociación';
      await tx.notificacion.create({ data:{ usuario_id:prod.usuario_id, tipo: tipoNotif, titulo: tituloNotif, mensaje:`Un comprador está interesado en: ${pub.titulo}`, referencia_id:neg.id } });

      // Confirmación al comprador
      await tx.notificacion.create({ data:{ usuario_id:comprador.usuario_id, tipo:'negociacion_creada', titulo:'Negociación iniciada', mensaje:`Has iniciado una negociación para: ${pub.titulo}. Espera la respuesta del productor.`, referencia_id:neg.id } });

      return neg;
    });

    res.status(201).json({ success:true, data });
  } catch(e) {
    if (e.status) return res.status(e.status).json({ success:false, message:e.message });
    next(e);
  }
}

async function cambiarEstado(req, res, next) {
  try {
    const neg = await prisma.negociacion.findUnique({ where:{ id:Number(req.params.id) }, include:{ comprador:true, productor:true, publicacion:true } });
    if (!neg) return res.status(404).json({ success:false, message:'No encontrada' });
    const esProductor = neg.productor.usuario_id === req.user.id;
    const esComprador = neg.comprador.usuario_id === req.user.id;
    if (!esProductor && !esComprador) return res.status(403).json({ success:false, message:'Sin permiso' });
    const { estado, precio_acordado, cantidad_solicitada, condiciones, fecha_entrega_acordada } = req.body;

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
      let ajusteStock = 0;

      if (cantidad_solicitada !== undefined) {
        const nuevaCantidad = Number(cantidad_solicitada);
        if (!Number.isFinite(nuevaCantidad) || nuevaCantidad <= 0) {
          return res.status(400).json({ success: false, message: 'La cantidad debe ser un número positivo' });
        }
        const disponible = Number(neg.publicacion?.cantidad_disponible ?? 0) + Number(neg.cantidad_solicitada);
        if (nuevaCantidad > disponible) {
          return res.status(400).json({ success: false, message: `Solo hay ${disponible} ${neg.publicacion?.unidad_medida ?? 'unidades'} disponibles` });
        }
        if (nuevaCantidad !== Number(neg.cantidad_solicitada)) {
          huboRenegociacion = true;
          ajusteStock = Number(neg.cantidad_solicitada) - nuevaCantidad;
          updateData.cantidad_solicitada = nuevaCantidad;
        }
      }

      if (precio_acordado !== undefined) {
        // Renegociación / propuesta inicial
        // El comprador no puede re-proponer precio hasta que el productor haga una contrapropuesta
        if (esComprador && neg.confirmacion_comprador && !neg.confirmacion_productor) {
          return res.status(400).json({ success: false, message: 'Ya enviaste una propuesta de precio. Espera la respuesta del productor.' });
        }
        const precio = Number(precio_acordado);
        if (!Number.isFinite(precio) || precio <= 0) {
          return res.status(400).json({ success: false, message: 'El precio acordado debe ser un número positivo' });
        }
        huboRenegociacion = true;
        updateData.precio_acordado = precio;
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
        const yaProductor = neg.confirmacion_productor || esProductor;
        const yaComprador = neg.confirmacion_comprador || esComprador;
        if (yaProductor && yaComprador && neg.estado !== 'en_transito') {
          updateData.estado = 'en_transito';
        }
      }

      const data = await prisma.$transaction(async (tx) => {
        const updated = await tx.negociacion.update({ where:{ id:neg.id }, data:updateData });
        if (ajusteStock !== 0 && neg.publicacion) {
          await tx.publicacion.update({
            where: { id: neg.publicacion.id },
            data: { cantidad_disponible: { increment: ajusteStock } },
          });
        }
        return updated;
      });

      if (updateData.estado === 'en_transito') {
        await asegurarEntregaParaNegociacion(neg.id, { fecha_entrega_acordada });
        await prisma.notificacion.create({ data:{ usuario_id:neg.comprador.usuario_id, tipo:'acuerdo_confirmado', titulo:'Acuerdo confirmado', mensaje:'El acuerdo fue confirmado por ambas partes. Pendiente de entrega y pago.', referencia_id:neg.id } });
        await prisma.notificacion.create({ data:{ usuario_id:neg.productor.usuario_id, tipo:'acuerdo_confirmado', titulo:'Acuerdo confirmado', mensaje:'El acuerdo fue confirmado por ambas partes. Pendiente de entrega y pago.', referencia_id:neg.id } });
      } else if (huboRenegociacion) {
        // Notificar a ambas partes
        const quien = esProductor ? neg.productor.usuario_id : neg.comprador.usuario_id;
        const otro = esProductor ? neg.comprador.usuario_id : neg.productor.usuario_id;
        await prisma.notificacion.create({ data:{ usuario_id:otro, tipo:'renegociacion', titulo:'Nueva propuesta', mensaje:`La contraparte realizó una nueva propuesta para la negociación #${neg.id}.`, referencia_id:neg.id } }).catch(err => console.error('Error notif renegociacion otro:', err));
        await prisma.notificacion.create({ data:{ usuario_id:quien, tipo:'renegociacion', titulo:'Propuesta enviada', mensaje:`Enviaste una nueva propuesta para la negociación #${neg.id}.`, referencia_id:neg.id } }).catch(err => console.error('Error notif renegociacion quien:', err));
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
      comprador:{ include:{ usuario:{ select:{ id:true } } } },
      productor:{ include:{ usuario:{ select:{ id:true } } } },
    },
  });
  if (!neg) return null;
  if (neg.estado !== 'en_transito') return neg;
  if (neg.precio_acordado == null) return neg;
  if (!neg.entrega || neg.entrega.estado !== 'entregado') return neg;

  const totalPagado = neg.pagos
    .filter(p => p.estado === 'completado')
    .reduce((acc, p) => acc.plus(p.monto), new Prisma.Decimal(0));
  const totalEsperado = new Prisma.Decimal(neg.precio_acordado).mul(neg.cantidad_solicitada);
  if (totalPagado.lessThan(totalEsperado)) return neg;

  const result = await prisma.negociacion.updateMany({
    where:{ id:neg.id, estado:'en_transito' },
    data:{ estado:'completada' },
  });

  if (result.count === 0) return neg;

  // Notificar a ambas partes
  await prisma.notificacion.create({ data:{ usuario_id:neg.comprador?.usuario_id, tipo:'negociacion_completada', titulo:'Negociación completada', mensaje:'La negociación se completó: entrega confirmada y pago recibido.', referencia_id:neg.id } }).catch(() => {});
  await prisma.notificacion.create({ data:{ usuario_id:neg.productor?.usuario_id, tipo:'negociacion_completada', titulo:'Negociación completada', mensaje:'La negociación se completó: entrega confirmada y pago recibido.', referencia_id:neg.id } }).catch(() => {});

  const updated = await prisma.negociacion.findUnique({ where:{ id:neg.id } });
  return updated;
}

async function calificarContraparte(req, res, next) {
  try {
    const neg = await prisma.negociacion.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        comprador: { include: { usuario: { select: { id: true, nombre: true } } } },
        productor: { include: { usuario: { select: { id: true, nombre: true } } } },
        entrega: { include: { confirmaciones: true } },
      },
    });
    if (!neg) return res.status(404).json({ success: false, message: 'Negociación no encontrada' });

    const esProductor = neg.productor.usuario.id === req.user.id;
    const esComprador = neg.comprador.usuario.id === req.user.id;
    if (!esProductor && !esComprador) {
      return res.status(403).json({ success: false, message: 'No eres participante de esta negociación' });
    }

    if (!neg.entrega) {
      return res.status(400).json({ success: false, message: 'La negociación aún no tiene una entrega registrada' });
    }
    if (esProductor && neg.entrega.estado !== 'en_transito' && neg.entrega.estado !== 'entregado') {
      return res.status(400).json({ success: false, message: 'Debes marcar el envío antes de calificar al comprador' });
    }
    if (esComprador && neg.entrega.estado !== 'entregado') {
      return res.status(400).json({ success: false, message: 'Debes confirmar la recepción antes de calificar al productor' });
    }
    if (esComprador) {
      const productorEnvio = neg.entrega.confirmaciones?.some(c => c.rol_confirmador === 'productor' && c.confirmado);
      if (!productorEnvio) {
        return res.status(400).json({ success: false, message: 'El productor aún no ha marcado el envío. No puedes calificar todavía.' });
      }
    }

    const puntaje = Number(req.body.puntaje);
    if (!Number.isInteger(puntaje) || puntaje < 1 || puntaje > 5) {
      return res.status(400).json({ success: false, message: 'La calificación debe estar entre 1 y 5 estrellas' });
    }

    const evaluadoId = esProductor ? neg.comprador.usuario.id : neg.productor.usuario.id;
    const existente = await prisma.calificacion.findUnique({
      where: {
        negociacion_id_evaluador_id_evaluado_id: {
          negociacion_id: neg.id,
          evaluador_id: req.user.id,
          evaluado_id: evaluadoId,
        },
      },
    });
    if (existente) {
      return res.status(409).json({ success: false, message: 'Ya calificaste a este participante en esta negociación' });
    }

    const data = await prisma.calificacion.create({
      data: {
        negociacion_id: neg.id,
        evaluador_id: req.user.id,
        evaluado_id: evaluadoId,
        puntaje,
        comentario: req.body.comentario || null,
      },
    });

    // Cuando el productor califica al comprador, notificar al comprador
    if (esProductor) {
      await prisma.notificacion.create({
        data: {
          usuario_id: neg.comprador.usuario.id,
          tipo: 'calificacion_recibida',
          titulo: 'Nueva calificación recibida',
          mensaje: `${neg.productor.usuario.nombre} te ha calificado en la negociación #${neg.id}.`,
          referencia_id: neg.id,
        },
      }).catch(err => console.error('Error creando notificación calificacion_recibida:', err));
    }

    res.status(201).json({
      success: true,
      data,
      message: 'Calificación enviada. Quedará pendiente de revisión por la asociación.',
    });
  } catch (e) { next(e); }
}

module.exports = { listar, obtener, crear, cambiarEstado, evaluarCierre, calificarContraparte };
