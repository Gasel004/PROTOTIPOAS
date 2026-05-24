const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listar(req, res, next) {
  try {
    const u = req.user;
    let negIds = [];
    if (u.rol === 'productor') {
      const p = await prisma.productor.findUnique({ where:{usuario_id:u.id} });
      const negs = await prisma.negociacion.findMany({ where:{productor_id:p?.id}, select:{id:true} });
      negIds = negs.map(n=>n.id);
    } else {
      const c = await prisma.comprador.findUnique({ where:{usuario_id:u.id} });
      const negs = await prisma.negociacion.findMany({ where:{comprador_id:c?.id}, select:{id:true} });
      negIds = negs.map(n=>n.id);
    }
    const data = await prisma.entrega.findMany({
      where:{negociacion_id:{in:negIds}},
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
      orderBy:{created_at:'desc'}
    });
    res.json({ success:true, data });
  } catch(e) { next(e); }
}

async function obtener(req, res, next) {
  try {
    const data = await prisma.entrega.findUnique({ where:{id:Number(req.params.id)}, include:{confirmaciones:true,negociacion:true} });
    if (!data) return res.status(404).json({ success:false, message:'No encontrada' });
    res.json({ success:true, data });
  } catch(e) { next(e); }
}

async function crear(req, res, next) {
  try {
    const { negociacion_id, fecha_programada, lugar_entrega, notas } = req.body;
    const neg = await prisma.negociacion.findUnique({ where:{id:Number(negociacion_id)} });
    if (!neg || neg.estado !== 'aceptada') return res.status(400).json({ success:false, message:'La negociación no está en estado aceptada' });
    const existe = await prisma.entrega.findUnique({ where:{negociacion_id:Number(negociacion_id)} });
    if (existe) return res.status(409).json({ success:false, message:'Ya existe una entrega para esta negociación' });
    const data = await prisma.entrega.create({ data:{negociacion_id:Number(negociacion_id),fecha_programada:fecha_programada?new Date(fecha_programada):null,lugar_entrega,notas} });
    res.status(201).json({ success:true, data });
  } catch(e) { next(e); }
}

async function actualizar(req, res, next) {
  try {
    const { fecha_programada, lugar_entrega, estado, notas } = req.body;
    const data = await prisma.entrega.update({ where:{id:Number(req.params.id)}, data:{fecha_programada:fecha_programada?new Date(fecha_programada):undefined,lugar_entrega,estado,notas} });
    res.json({ success:true, data });
  } catch(e) { next(e); }
}

async function confirmar(req, res, next) {
  try {
    const entregaId = Number(req.params.id);
    const { observaciones } = req.body;
    const yaConfirmo = await prisma.confirmacionEntrega.findUnique({ where:{entrega_id_usuario_id:{entrega_id:entregaId,usuario_id:req.user.id}} });
    if (yaConfirmo?.confirmado) return res.status(400).json({ success:false, message:'Ya confirmó previamente esta entrega' });
    await prisma.confirmacionEntrega.upsert({ where:{entrega_id_usuario_id:{entrega_id:entregaId,usuario_id:req.user.id}}, create:{entrega_id:entregaId,usuario_id:req.user.id,rol_confirmador:req.user.rol,confirmado:true,observaciones,fecha_confirmacion:new Date()}, update:{confirmado:true,observaciones,fecha_confirmacion:new Date()} });
    // Verificar doble confirmación
    const confs = await prisma.confirmacionEntrega.findMany({ where:{entrega_id:entregaId,confirmado:true} });
    if (confs.length >= 2) {
      const entrega = await prisma.entrega.findUnique({ where:{id:entregaId} });
      await prisma.entrega.update({ where:{id:entregaId}, data:{estado:'entregado',fecha_realizada:new Date()} });
      await prisma.negociacion.update({ where:{id:entrega.negociacion_id}, data:{estado:'completada'} });
    }
    res.json({ success:true, message:'Confirmación registrada' });
  } catch(e) { next(e); }
}

module.exports = { listar, obtener, crear, actualizar, confirmar };
