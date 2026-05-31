const r = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { verificarToken, soloRoles } = require('../middleware/auth');
r.get('/', async (req, res) => {
  const where = {};
  if (req.query.departamento) where.departamento = req.query.departamento;
  if (req.query.municipio) where.municipio = req.query.municipio;
  if (req.query.asociacion_id) where.asociacion_id = Number(req.query.asociacion_id);
  const data = await prisma.productor.findMany({ where, include:{usuario:{select:{nombre:true,telefono:true}}}, orderBy:{created_at:'desc'} });
  res.json({ success:true, data });
});
r.get('/:id', async (req, res) => {
  const data = await prisma.productor.findUnique({ where:{id:Number(req.params.id)}, include:{usuario:{select:{nombre:true,telefono:true}}} });
  if (!data) return res.status(404).json({ success:false, message:'No encontrado' });
  res.json({ success:true, data });
});
r.put('/:id', verificarToken, soloRoles('productor'), async (req, res) => {
  const { municipio,departamento,descripcion } = req.body;
  const id = Number(req.params.id);
  const actual = await prisma.productor.findFirst({
    where:{
      usuario_id:req.user.id,
      OR:[{ id }, { usuario_id:id }],
    },
  });
  if (!actual) return res.status(404).json({ success:false, message:'No encontrado' });
  const data = await prisma.productor.update({ where:{id:actual.id}, data:{municipio,departamento,descripcion} });
  const usuarioData = {};
  if (req.body.nombre) usuarioData.nombre = req.body.nombre;
  if (req.body.telefono) usuarioData.telefono = req.body.telefono;
  if (Object.keys(usuarioData).length) await prisma.usuario.update({ where:{id:data.usuario_id}, data:usuarioData });
  res.json({ success:true, data });
});
module.exports = r;
