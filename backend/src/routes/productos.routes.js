const r = require('express').Router();
const prisma = require('../prisma');
const { verificarToken, soloRoles } = require('../middleware/auth');

r.get('/', async (req, res, next) => {
  try {
    const { categoria, activo } = req.query;
    const where = {};
    if (categoria) where.categoria = categoria;
    if (activo !== undefined) where.activo = activo === 'true';
    else where.activo = true;
    const data = await prisma.producto.findMany({ where, orderBy:{ nombre:'asc' } });
    res.json({ success:true, data });
  } catch(e) { next(e); }
});

r.get('/:id', async (req, res, next) => {
  try {
    const data = await prisma.producto.findUnique({ where:{ id:Number(req.params.id) } });
    if (!data) return res.status(404).json({ success:false, message:'Producto no encontrado' });
    res.json({ success:true, data });
  } catch(e) { next(e); }
});

r.post('/', verificarToken, soloRoles('asociacion'), async (req, res, next) => {
  try {
    const { nombre, categoria, unidad_medida, descripcion, activo=true } = req.body;
    if (!nombre || !unidad_medida) return res.status(400).json({ success:false, message:'Nombre y unidad de medida son requeridos' });
    const existe = await prisma.producto.findFirst({ where:{ nombre:{ equals:nombre.trim(), mode:'insensitive' } } });
    if (existe) return res.status(409).json({ success:false, message:'El producto ya existe en el catálogo' });
    const data = await prisma.producto.create({ data:{ nombre:nombre.trim(), categoria, unidad_medida, descripcion, activo:Boolean(activo) } });
    res.status(201).json({ success:true, data });
  } catch(e) { next(e); }
});

r.put('/:id', verificarToken, soloRoles('asociacion'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const actual = await prisma.producto.findUnique({ where:{ id } });
    if (!actual) return res.status(404).json({ success:false, message:'Producto no encontrado' });
    const { nombre, categoria, unidad_medida, descripcion, activo } = req.body;
    if (nombre && nombre.trim().toLowerCase() !== actual.nombre.toLowerCase()) {
      const duplicado = await prisma.producto.findFirst({ where:{ nombre:{ equals:nombre.trim(), mode:'insensitive' }, id:{ not:id } } });
      if (duplicado) return res.status(409).json({ success:false, message:'Ya existe otro producto con ese nombre' });
    }
    const data = await prisma.producto.update({
      where:{ id },
      data:{
        nombre:nombre?.trim(),
        categoria,
        unidad_medida,
        descripcion,
        activo: activo === undefined ? undefined : Boolean(activo),
      },
    });
    res.json({ success:true, data });
  } catch(e) { next(e); }
});

module.exports = r;
