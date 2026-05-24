const r = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { verificarToken } = require('../middleware/auth');
r.get('/', async (_req, res) => {
  const data = await prisma.asociacion.findMany({ where:{activa:true} });
  res.json({ success:true, data });
});
r.get('/:id', async (req, res) => {
  const data = await prisma.asociacion.findUnique({ where:{id:Number(req.params.id)}, include:{productores:true} });
  if (!data) return res.status(404).json({ success:false, message:'No encontrada' });
  res.json({ success:true, data });
});
r.put('/:id', verificarToken, async (req, res) => {
  const { nombre, nit, municipio, departamento, descripcion } = req.body;
  const id = Number(req.params.id);
  const actual = await prisma.asociacion.findFirst({ where:{ OR:[{ id }, { usuario_id:id }] } });
  if (!actual) return res.status(404).json({ success:false, message:'No encontrada' });
  const data = await prisma.asociacion.update({ where:{ id:actual.id }, data:{ nombre:nombre ?? actual.nombre, nit, municipio, departamento, descripcion } });
  if (req.body.nombre) await prisma.usuario.update({ where:{id:data.usuario_id}, data:{nombre:req.body.nombre,telefono:req.body.telefono} });
  res.json({ success:true, data });
});
module.exports = r;
