const r = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { verificarToken } = require('../middleware/auth');
r.get('/', async (_req, res) => {
  const data = await prisma.productor.findMany({ include:{usuario:{select:{nombre:true,telefono:true}}} });
  res.json({ success:true, data });
});
r.get('/:id', async (req, res) => {
  const data = await prisma.productor.findUnique({ where:{id:Number(req.params.id)}, include:{usuario:{select:{nombre:true,telefono:true}}} });
  if (!data) return res.status(404).json({ success:false, message:'No encontrado' });
  res.json({ success:true, data });
});
r.put('/:id', verificarToken, async (req, res) => {
  const { municipio,departamento,descripcion } = req.body;
  const id = Number(req.params.id);
  const actual = await prisma.productor.findFirst({ where:{ OR:[{ id }, { usuario_id:id }] } });
  if (!actual) return res.status(404).json({ success:false, message:'No encontrado' });
  const data = await prisma.productor.update({ where:{id:actual.id}, data:{municipio,departamento,descripcion} });
  if (req.body.nombre) await prisma.usuario.update({ where:{id:data.usuario_id}, data:{nombre:req.body.nombre,telefono:req.body.telefono} });
  res.json({ success:true, data });
});
module.exports = r;
