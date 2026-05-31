const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listar(req, res, next) {
  try {
    const { leida, tipo, page=1, limit=30 } = req.query;
    const where = { usuario_id:req.user.id };
    if (leida !== undefined) where.leida = leida === 'true';
    if (tipo) where.tipo = tipo;
    const data = await prisma.notificacion.findMany({ where, orderBy:{created_at:'desc'}, skip:(page-1)*limit, take:Number(limit) });
    const noLeidas = await prisma.notificacion.count({ where:{usuario_id:req.user.id,leida:false} });
    res.json({ success:true, data, noLeidas });
  } catch(e) { next(e); }
}

async function marcarUna(req, res, next) {
  try {
    const { count } = await prisma.notificacion.updateMany({
      where:{ id:Number(req.params.id), usuario_id:req.user.id },
      data:{ leida:true },
    });
    if (!count) return res.status(404).json({ success:false, message:'Notificación no encontrada' });
    res.json({ success:true });
  } catch(e) { next(e); }
}

async function marcarTodas(req, res, next) {
  try {
    const { count } = await prisma.notificacion.updateMany({ where:{usuario_id:req.user.id,leida:false}, data:{leida:true} });
    res.json({ success:true, actualizadas:count });
  } catch(e) { next(e); }
}

module.exports = { listar, marcarUna, marcarTodas };
