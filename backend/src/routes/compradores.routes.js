const r = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { verificarToken, soloRoles } = require('../middleware/auth');
r.get('/:id', async (req, res) => {
  const data = await prisma.comprador.findUnique({ where:{id:Number(req.params.id)}, include:{usuario:{select:{nombre:true,telefono:true}}} });
  if (!data) return res.status(404).json({ success:false, message:'No encontrado' });
  res.json({ success:true, data });
});
r.put('/:id', verificarToken, soloRoles('comprador'), async (req, res) => {
  const { razon_social,nit,municipio,departamento } = req.body;
  const id = Number(req.params.id);
  const actual = await prisma.comprador.findFirst({
    where:{
      usuario_id:req.user.id,
      OR:[{ id }, { usuario_id:id }],
    },
  });
  if (!actual) return res.status(404).json({ success:false, message:'No encontrado' });
  const data = await prisma.comprador.update({ where:{id:actual.id}, data:{razon_social,nit,municipio,departamento} });
  const usuarioData = {};
  if (req.body.nombre) usuarioData.nombre = req.body.nombre;
  if (req.body.telefono) usuarioData.telefono = req.body.telefono;
  if (Object.keys(usuarioData).length) await prisma.usuario.update({ where:{id:data.usuario_id}, data:usuarioData });
  res.json({ success:true, data });
});
module.exports = r;
