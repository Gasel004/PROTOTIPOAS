const r = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
r.get('/', async (_req, res) => {
  const data = await prisma.producto.findMany({ where:{activo:true}, orderBy:{nombre:'asc'} });
  res.json({ success:true, data });
});
module.exports = r;
