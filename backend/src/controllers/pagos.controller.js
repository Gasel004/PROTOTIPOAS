const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ESTADOS_PAGO = ['pendiente', 'completado', 'fallido', 'reembolsado'];
const METODOS_PAGO = ['efectivo', 'transferencia', 'cheque', 'otro'];

function participaEnNegociacion(negociacion, userId) {
  return negociacion?.productor?.usuario_id === userId || negociacion?.comprador?.usuario_id === userId;
}

async function obtenerNegociacionParticipante(negociacionId, userId) {
  const negociacion = await prisma.negociacion.findUnique({
    where:{ id:Number(negociacionId) },
    include:{ productor:true, comprador:true },
  });
  if (!negociacion) return { negociacion:null, participa:false };
  return { negociacion, participa:participaEnNegociacion(negociacion, userId) };
}

async function obtenerPagoParticipante(pagoId, userId) {
  const pago = await prisma.pago.findUnique({
    where:{ id:Number(pagoId) },
    include:{
      negociacion:{
        include:{
          publicacion:true,
          productor:true,
          comprador:true,
        },
      },
    },
  });
  if (!pago) return { pago:null, participa:false };
  return { pago, participa:participaEnNegociacion(pago.negociacion, userId) };
}

async function listar(req, res, next) {
  try {
    const { estado } = req.query;
    const where = {};
    if (estado) where.estado = estado;

    if (req.user.rol === 'productor') {
      const productor = await prisma.productor.findUnique({ where:{ usuario_id:req.user.id } });
      where.negociacion = { productor_id:productor?.id ?? 0 };
    } else if (req.user.rol === 'comprador') {
      const comprador = await prisma.comprador.findUnique({ where:{ usuario_id:req.user.id } });
      where.negociacion = { comprador_id:comprador?.id ?? 0 };
    }

    const data = await prisma.pago.findMany({
      where,
      include:{
        negociacion:{
          include:{
            publicacion:{select:{titulo:true}},
            comprador:{include:{usuario:{select:{nombre:true}}}},
            productor:{include:{usuario:{select:{nombre:true}}}},
          }
        }
      },
      orderBy:{created_at:'desc'}
    });
    res.json({ success:true, data });
  } catch(e) { next(e); }
}

async function obtener(req, res, next) {
  try {
    const { pago, participa } = await obtenerPagoParticipante(Number(req.params.id), req.user.id);
    if (!pago) return res.status(404).json({ success:false, message:'No encontrado' });
    if (!participa) return res.status(403).json({ success:false, message:'Sin permiso para consultar este pago' });
    res.json({ success:true, data:pago });
  } catch(e) { next(e); }
}

async function crear(req, res, next) {
  try {
    const { negociacion_id, monto, metodo_pago, referencia, fecha_pago, notas } = req.body;
    if (!negociacion_id || !monto || monto <= 0) return res.status(400).json({ success:false, message:'Datos inválidos' });
    const metodo = metodo_pago || 'efectivo';
    if (!METODOS_PAGO.includes(metodo)) return res.status(400).json({ success:false, message:'Método de pago inválido' });
    const { negociacion, participa } = await obtenerNegociacionParticipante(Number(negociacion_id), req.user.id);
    if (!negociacion) return res.status(404).json({ success:false, message:'Negociación no encontrada' });
    if (!participa) return res.status(403).json({ success:false, message:'Sin permiso para registrar pagos en esta negociación' });
    const data = await prisma.pago.create({ data:{negociacion_id:Number(negociacion_id),monto:Number(monto),metodo_pago:metodo,referencia,fecha_pago:fecha_pago?new Date(fecha_pago):null,notas,registrado_por:req.user.id} });
    res.status(201).json({ success:true, data });
  } catch(e) { next(e); }
}

async function actualizar(req, res, next) {
  try {
    const { estado, referencia, notas } = req.body;
    if (estado && !ESTADOS_PAGO.includes(estado)) return res.status(400).json({ success:false, message:'Estado de pago inválido' });
    const { pago, participa } = await obtenerPagoParticipante(Number(req.params.id), req.user.id);
    if (!pago) return res.status(404).json({ success:false, message:'No encontrado' });
    if (!participa) return res.status(403).json({ success:false, message:'Sin permiso para actualizar este pago' });
    const data = await prisma.pago.update({ where:{id:pago.id}, data:{estado,referencia,notas} });
    res.json({ success:true, data });
  } catch(e) { next(e); }
}

module.exports = { listar, obtener, crear, actualizar };
