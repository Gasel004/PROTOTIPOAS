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
module.exports = r;
