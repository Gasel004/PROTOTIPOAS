const r = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { verificarToken } = require('../middleware/auth');
r.get('/:id', async (req, res) => {
  const data = await prisma.comprador.findUnique({ where:{id:Number(req.params.id)}, include:{usuario:{select:{nombre:true,email:true,telefono:true}}} });
  if (!data) return res.status(404).json({ success:false, message:'No encontrado' });
  res.json({ success:true, data });
});
r.put('/:id', verificarToken, async (req, res) => {
  const { razon_social,nit,municipio,departamento } = req.body;
  const data = await prisma.comprador.update({ where:{id:Number(req.params.id)}, data:{razon_social,nit,municipio,departamento} });
  if (req.body.nombre) await prisma.usuario.update({ where:{id:data.usuario_id}, data:{nombre:req.body.nombre,telefono:req.body.telefono} });
  res.json({ success:true, data });
});
module.exports = r;
