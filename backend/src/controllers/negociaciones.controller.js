const prisma = require('../prisma');

// Estados válidos para ofertar precio (ambos roles)
const ESTADOS_NEGOCIABLES = ['pendiente', 'en_proceso', 'acuerdo_pendiente'];

// Estado siguiente al llegar a acuerdo de precio
// ya no pasa directo a 'aceptada', sino a 'acuerdo_pendiente' esperando doble confirmación
const TRANSICIONES = {
  pendiente:        ['en_proceso', 'rechazada', 'cancelada'],
  en_proceso:       ['rechazada', 'cancelada'],
  acuerdo_pendiente:['cancelada'],
  aceptada:         ['cancelada'],      // legacy, por si hay negociaciones antiguas
  en_transito:      ['cancelada'],
  rechazada:        [],
  completada:       [],
  cancelada:        [],
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
        pagos: { orderBy: { created_at: 'desc' }, take: 1 },
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
    // Validar que la cantidad solicitada no supere la disponible
    if (Number(cantidad_solicitada) > Number(pub.cantidad_disponible)) {
      return res.status(400).json({ success:false, message:`Solo hay ${Number(pub.cantidad_disponible)} ${pub.unidad_medida} disponibles. No puedes solicitar ${Number(cantidad_solicitada)}.` });
    }
    const existe = await prisma.negociacion.findFirst({ where:{ publicacion_id:Number(publicacion_id), comprador_id:comprador.id, estado:{ in:['pendiente','en_proceso','acuerdo_pendiente','en_transito'] } } });
    if (existe) return res.status(409).json({ success:false, message:'Ya existe una negociación activa para esta publicación' });
    const data = await prisma.negociacion.create({ data:{ publicacion_id:Number(publicacion_id), comprador_id:comprador.id, productor_id:pub.productor_id, cantidad_solicitada:Number(cantidad_solicitada), condiciones } });
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
    if (!esParticipante) return res.status(403).json({ success:false, message:'Sin permiso' });
    const { estado, condiciones, fecha_entrega_acordada } = req.body;
    if (!TRANSICIONES[neg.estado]?.includes(estado))
      return res.status(400).json({ success:false, message:'Transición de estado inválida' });
    const data = await prisma.negociacion.update({ where:{ id:neg.id }, data:{ estado, condiciones, fecha_entrega_acordada:fecha_entrega_acordada?new Date(fecha_entrega_acordada):undefined } });
    res.json({ success:true, data });
  } catch(e) { next(e); }
}

// ─────────────────────────────────────────────────────────────
// NUEVO: Cualquiera de los dos puede proponer un precio
// Cuando ambos coinciden en el mismo precio → pasa a acuerdo_pendiente
// ─────────────────────────────────────────────────────────────
async function ofertarPrecio(req, res, next) {
  try {
    const neg = await prisma.negociacion.findUnique({
      where: { id: Number(req.params.id) },
      include: { comprador: true, productor: true },
    });
    if (!neg) return res.status(404).json({ success:false, message:'No encontrada' });

    const esProductor = neg.productor.usuario_id === req.user.id;
    const esComprador = neg.comprador.usuario_id === req.user.id;
    if (!esProductor && !esComprador) return res.status(403).json({ success:false, message:'No eres participante de esta negociación' });

    if (!ESTADOS_NEGOCIABLES.includes(neg.estado)) {
      return res.status(400).json({ success:false, message:`No se puede ofertar en estado "${neg.estado}"` });
    }

    const { precio } = req.body;
    if (!precio || Number(precio) <= 0) return res.status(400).json({ success:false, message:'Precio inválido' });

    const precioNum = Number(precio);

    // Si el otro participante ya propuso este mismo precio → acuerdo
    const precioActual = neg.precio_acordado ? Number(neg.precio_acordado) : null;
    const hayAcuerdo = precioActual !== null && precioActual === precioNum;

    const data = await prisma.negociacion.update({
      where: { id: neg.id },
      data: {
        precio_acordado: precioNum,
        estado: hayAcuerdo ? 'acuerdo_pendiente' : (neg.estado === 'pendiente' ? 'en_proceso' : neg.estado),
        // Resetear confirmaciones si cambia el precio
        confirma_cierre_productor: false,
        confirma_cierre_comprador: false,
      },
    });

    // Notificar al otro participante
    const otroUsuarioId = esProductor ? neg.comprador.usuario_id : neg.productor.usuario_id;
    await prisma.notificacion.create({
      data: {
        usuario_id: otroUsuarioId,
        tipo: 'oferta_precio',
        titulo: hayAcuerdo ? '¡Acuerdo de precio alcanzado!' : 'Nueva oferta de precio',
        mensaje: hayAcuerdo
          ? `Se ha alcanzado un acuerdo a Q${precioNum}. Confirma el trato para proceder.`
          : `${esProductor ? 'El productor' : 'El comprador'} propone Q${precioNum} por unidad.`,
        referencia_id: neg.id,
      },
    });

    res.json({
      success: true,
      data,
      acuerdo: hayAcuerdo,
      message: hayAcuerdo
        ? '¡Precio acordado! Ambos deben confirmar para cerrar el trato.'
        : 'Oferta enviada. Esperando respuesta.',
    });
  } catch(e) { next(e); }
}

// ─────────────────────────────────────────────────────────────
// NUEVO: Doble confirmación de cierre
// Cuando ambos confirman → estado pasa a 'en_transito'
// ─────────────────────────────────────────────────────────────
async function confirmarCierre(req, res, next) {
  try {
    const neg = await prisma.negociacion.findUnique({
      where: { id: Number(req.params.id) },
      include: { comprador: true, productor: true },
    });
    if (!neg) return res.status(404).json({ success:false, message:'No encontrada' });

    const esProductor = neg.productor.usuario_id === req.user.id;
    const esComprador = neg.comprador.usuario_id === req.user.id;
    if (!esProductor && !esComprador) return res.status(403).json({ success:false, message:'Sin permiso' });

    if (neg.estado !== 'acuerdo_pendiente') {
      return res.status(400).json({ success:false, message:'No hay acuerdo pendiente de confirmar' });
    }

    // Verificar que no haya confirmado ya
    if (esProductor && neg.confirma_cierre_productor) {
      return res.status(400).json({ success:false, message:'Ya confirmaste el cierre' });
    }
    if (esComprador && neg.confirma_cierre_comprador) {
      return res.status(400).json({ success:false, message:'Ya confirmaste el cierre' });
    }

    const updateData = esProductor
      ? { confirma_cierre_productor: true }
      : { confirma_cierre_comprador: true };

    // Ver si con esta confirmación ya son ambos
    const ambosConfirman =
      (esProductor && neg.confirma_cierre_comprador) ||
      (esComprador && neg.confirma_cierre_productor);

    if (ambosConfirman) {
      // Pasar a EN_TRANSITO y crear la entrega
      const data = await prisma.negociacion.update({
        where: { id: neg.id },
        data: { ...updateData, estado: 'en_transito' },
      });
      await asegurarEntregaParaNegociacion(neg.id, { estado: 'en_transito' });

      // Notificar a ambos
      await prisma.notificacion.createMany({
        data: [
          { usuario_id: neg.productor.usuario_id, tipo: 'trato_cerrado', titulo: 'Trato cerrado — entrega en tránsito', mensaje: `El trato ha sido confirmado por ambas partes. La entrega está en camino.`, referencia_id: neg.id },
          { usuario_id: neg.comprador.usuario_id, tipo: 'trato_cerrado', titulo: 'Trato cerrado — entrega en tránsito', mensaje: `El trato ha sido confirmado por ambas partes. La entrega está en camino.`, referencia_id: neg.id },
        ],
      });

      return res.json({ success:true, data, estado: 'en_transito', message: '¡Trato cerrado! La entrega está en tránsito.' });
    }

    // Solo uno confirmó, esperar al otro
    const data = await prisma.negociacion.update({ where: { id: neg.id }, data: updateData });

    // Notificar al otro para que confirme
    const otroUsuarioId = esProductor ? neg.comprador.usuario_id : neg.productor.usuario_id;
    await prisma.notificacion.create({
      data: {
        usuario_id: otroUsuarioId,
        tipo: 'confirmar_cierre',
        titulo: 'Confirma el trato',
        mensaje: `${esProductor ? 'El productor' : 'El comprador'} ya confirmó el trato. Te toca a ti confirmar.`,
        referencia_id: neg.id,
      },
    });

    res.json({ success:true, data, message: 'Confirmación registrada. Esperando al otro participante.' });
  } catch(e) { next(e); }
}

// ─────────────────────────────────────────────────────────────
// NUEVO: Doble confirmación de entrega
// Condiciones: pago completado Y pagado_al_productor = true
// Cuando ambos confirman → estado pasa a 'completada'
// ─────────────────────────────────────────────────────────────
async function confirmarEntrega(req, res, next) {
  try {
    const neg = await prisma.negociacion.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        comprador: true,
        productor: true,
        pagos: { where: { estado: 'completado', pagado_al_productor: true } },
      },
    });
    if (!neg) return res.status(404).json({ success:false, message:'No encontrada' });

    const esProductor = neg.productor.usuario_id === req.user.id;
    const esComprador = neg.comprador.usuario_id === req.user.id;
    if (!esProductor && !esComprador) return res.status(403).json({ success:false, message:'Sin permiso' });

    if (neg.estado !== 'en_transito') {
      return res.status(400).json({ success:false, message:'La negociación no está en tránsito' });
    }

    // CONDICIÓN: debe existir al menos un pago completado Y pagado al productor
    if (neg.pagos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se puede confirmar la entrega: el pago al productor aún no ha sido registrado.',
      });
    }

    // Verificar que no haya confirmado ya
    if (esProductor && neg.confirma_entrega_productor) {
      return res.status(400).json({ success:false, message:'Ya confirmaste la entrega' });
    }
    if (esComprador && neg.confirma_entrega_comprador) {
      return res.status(400).json({ success:false, message:'Ya confirmaste la entrega' });
    }

    const updateData = esProductor
      ? { confirma_entrega_productor: true }
      : { confirma_entrega_comprador: true };

    const ambosConfirman =
      (esProductor && neg.confirma_entrega_comprador) ||
      (esComprador && neg.confirma_entrega_productor);

    if (ambosConfirman) {
      const data = await prisma.negociacion.update({
        where: { id: neg.id },
        data: { ...updateData, estado: 'completada' },
      });

      // Actualizar la entrega a entregado
      const entrega = await prisma.entrega.findUnique({ where: { negociacion_id: neg.id } });
      if (entrega) {
        await prisma.entrega.update({
          where: { id: entrega.id },
          data: { estado: 'entregado', fecha_realizada: new Date() },
        });
      }

      // Notificar a ambos
      await prisma.notificacion.createMany({
        data: [
          { usuario_id: neg.productor.usuario_id, tipo: 'entrega_completada', titulo: '¡Entrega completada!', mensaje: 'Ambas partes confirmaron la entrega. La negociación está cerrada.', referencia_id: neg.id },
          { usuario_id: neg.comprador.usuario_id, tipo: 'entrega_completada', titulo: '¡Entrega completada!', mensaje: 'Ambas partes confirmaron la entrega. La negociación está cerrada.', referencia_id: neg.id },
        ],
      });

      // Descontar la cantidad de la publicación
      await prisma.publicacion.update({
        where: { id: neg.publicacion_id ?? data.publicacion_id },
        data: {
          cantidad_disponible: {
            decrement: Number(neg.cantidad_solicitada),
          },
        },
      });

      return res.json({ success:true, data, estado: 'completada', message: '¡Entrega completada! Negociación cerrada.' });
    }

    const data = await prisma.negociacion.update({ where: { id: neg.id }, data: updateData });

    const otroUsuarioId = esProductor ? neg.comprador.usuario_id : neg.productor.usuario_id;
    await prisma.notificacion.create({
      data: {
        usuario_id: otroUsuarioId,
        tipo: 'confirmar_entrega',
        titulo: 'Confirma la recepción de la entrega',
        mensaje: `${esProductor ? 'El productor' : 'El comprador'} ya confirmó la entrega. Confirma tu recepción.`,
        referencia_id: neg.id,
      },
    });

    res.json({ success:true, data, message: 'Confirmación de entrega registrada. Esperando al otro participante.' });
  } catch(e) { next(e); }
}

module.exports = { listar, obtener, crear, cambiarEstado, ofertarPrecio, confirmarCierre, confirmarEntrega };
