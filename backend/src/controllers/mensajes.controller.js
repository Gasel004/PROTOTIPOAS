const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function esParticipante(negId, userId) {
  const neg = await prisma.negociacion.findUnique({ where:{id:negId}, include:{comprador:true,productor:true} });
  if (!neg) return false;
  return neg.comprador.usuario_id === userId || neg.productor.usuario_id === userId;
}

async function listar(req, res, next) {
  try {
    const negId = Number(req.params.id);
    if (!await esParticipante(negId, req.user.id))
      return res.status(403).json({ success:false, message:'Sin permiso' });
    const data = await prisma.mensaje.findMany({ where:{negociacion_id:negId}, include:{remitente:{select:{nombre:true}}}, orderBy:{created_at:'asc'} });
    res.json({ success:true, data });
  } catch(e) { next(e); }
}

async function enviar(req, res, next) {
  try {
    const negId = Number(req.params.id);
    if (!await esParticipante(negId, req.user.id))
      return res.status(403).json({ success:false, message:'Sin permiso' });
    const { contenido } = req.body;
    if (!contenido?.trim()) return res.status(400).json({ success:false, message:'El contenido no puede estar vacío' });
    const data = await prisma.mensaje.create({ data:{ negociacion_id:negId, remitente_id:req.user.id, contenido } });
    res.status(201).json({ success:true, data });
  } catch(e) { next(e); }
}

async function marcarLeidos(req, res, next) {
  try {
    const negId = Number(req.params.id);
    if (!await esParticipante(negId, req.user.id))
      return res.status(403).json({ success:false, message:'Sin permiso' });
    await prisma.mensaje.updateMany({ where:{ negociacion_id:negId, remitente_id:{ not:req.user.id }, leido:false }, data:{ leido:true } });
    res.json({ success:true, message:'Mensajes marcados como leídos' });
  } catch(e) { next(e); }
}

module.exports = { listar, enviar, marcarLeidos };
