const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listar(req, res, next) {
  try {
    const { estado } = req.query;
    const where = {};
    if (estado) where.estado = estado;
    const data = await prisma.pago.findMany({ where, orderBy:{created_at:'desc'} });
    res.json({ success:true, data });
  } catch(e) { next(e); }
}

async function obtener(req, res, next) {
  try {
    const data = await prisma.pago.findUnique({ where:{id:Number(req.params.id)} });
    if (!data) return res.status(404).json({ success:false, message:'No encontrado' });
    res.json({ success:true, data });
  } catch(e) { next(e); }
}

async function crear(req, res, next) {
  try {
    const { negociacion_id, monto, metodo_pago, referencia, fecha_pago, notas } = req.body;
    if (!negociacion_id || !monto || monto <= 0) return res.status(400).json({ success:false, message:'Datos inválidos' });
    const data = await prisma.pago.create({ data:{negociacion_id:Number(negociacion_id),monto:Number(monto),metodo_pago,referencia,fecha_pago:fecha_pago?new Date(fecha_pago):null,notas,registrado_por:req.user.id} });
    res.status(201).json({ success:true, data });
  } catch(e) { next(e); }
}

async function actualizar(req, res, next) {
  try {
    const { estado, referencia, notas } = req.body;
    const data = await prisma.pago.update({ where:{id:Number(req.params.id)}, data:{estado,referencia,notas} });
    res.json({ success:true, data });
  } catch(e) { next(e); }
}

module.exports = { listar, obtener, crear, actualizar };
