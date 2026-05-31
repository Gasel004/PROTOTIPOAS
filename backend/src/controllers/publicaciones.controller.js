const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listar(req, res, next) {
  try {
    const { departamento, municipio, producto_id, categoria, precio_min, precio_max, page=1, limit=20 } = req.query;
    const where = { estado:'activa', eliminada:false };
    if (departamento) where.departamento = departamento;
    if (municipio)    where.municipio    = municipio;
    if (producto_id)  where.producto_id  = Number(producto_id);
    if (categoria)    where.producto = { categoria };
    if (precio_min || precio_max) where.precio_unitario = {};
    if (precio_min) where.precio_unitario.gte = Number(precio_min);
    if (precio_max) where.precio_unitario.lte = Number(precio_max);

    const [data, total] = await Promise.all([
      prisma.publicacion.findMany({ where, include:{ producto:true, productor:{ include:{ usuario:{ select:{ nombre:true } } } } }, skip:(Number(page)-1)*Number(limit), take:Number(limit), orderBy:{ created_at:'desc' } }),
      prisma.publicacion.count({ where }),
    ]);
    res.json({ success:true, data, pagination:{ page:Number(page), limit:Number(limit), total } });
  } catch(e) { next(e); }
}

async function misPublicaciones(req, res, next) {
  try {
    const productor = await prisma.productor.findUnique({ where:{ usuario_id: req.user.id } });
    if (!productor) return res.status(404).json({ success:false, message:'Perfil de productor no encontrado' });
    const data = await prisma.publicacion.findMany({
      where: { productor_id: productor.id, eliminada:false },
      include: { producto:true, negociaciones:{ select:{ id:true } } },
      orderBy: { created_at:'desc' },
    });
    res.json({ success:true, data });
  } catch(e) { next(e); }
}

async function obtener(req, res, next) {
  try {
    const data = await prisma.publicacion.findUnique({ where:{ id:Number(req.params.id) }, include:{ producto:true, productor:{ include:{ usuario:{ select:{ nombre:true, telefono:true } } } } } });
    if (!data || data.eliminada) return res.status(404).json({ success:false, message:'Publicación no encontrada' });
    res.json({ success:true, data });
  } catch(e) { next(e); }
}

async function crear(req, res, next) {
  try {
    const productor = await prisma.productor.findUnique({ where:{ usuario_id: req.user.id } });
    if (!productor) return res.status(404).json({ success:false, message:'Perfil de productor no encontrado' });
    const { producto_id, titulo, descripcion, cantidad_disponible, precio_unitario, unidad_medida, municipio, departamento, imagen_url } = req.body;
    if (!producto_id || !titulo || !cantidad_disponible || !precio_unitario || !unidad_medida)
      return res.status(400).json({ success:false, message:'Faltan campos requeridos' });
    const data = await prisma.publicacion.create({ data:{ productor_id:productor.id, producto_id:Number(producto_id), titulo, descripcion, cantidad_disponible:Number(cantidad_disponible), precio_unitario:Number(precio_unitario), unidad_medida, municipio, departamento, imagen_url } });
    res.status(201).json({ success:true, data });
  } catch(e) { next(e); }
}

async function actualizar(req, res, next) {
  try {
    const pub = await prisma.publicacion.findUnique({ where:{ id:Number(req.params.id) }, include:{ productor:true } });
    if (!pub || pub.eliminada) return res.status(404).json({ success:false, message:'No encontrada' });
    if (pub.productor.usuario_id !== req.user.id)
      return res.status(403).json({ success:false, message:'Sin permiso para editar esta publicación' });
    const { titulo, descripcion, cantidad_disponible, precio_unitario, municipio, departamento, imagen_url } = req.body;
    const data = await prisma.publicacion.update({ where:{ id:pub.id }, data:{ titulo, descripcion, cantidad_disponible:cantidad_disponible?Number(cantidad_disponible):undefined, precio_unitario:precio_unitario?Number(precio_unitario):undefined, municipio, departamento, imagen_url } });
    res.json({ success:true, data });
  } catch(e) { next(e); }
}

async function cambiarEstado(req, res, next) {
  try {
    const ESTADOS = ['activa','pausada','cerrada','vencida'];
    const { estado } = req.body;
    if (!ESTADOS.includes(estado)) return res.status(400).json({ success:false, message:'Estado inválido' });
    const pub = await prisma.publicacion.findUnique({ where:{ id:Number(req.params.id) }, include:{ productor:true } });
    if (!pub || pub.eliminada) return res.status(404).json({ success:false, message:'No encontrada' });
    if (pub.productor.usuario_id !== req.user.id)
      return res.status(403).json({ success:false, message:'Sin permiso' });
    const data = await prisma.publicacion.update({ where:{ id:pub.id }, data:{ estado } });
    res.json({ success:true, data });
  } catch(e) { next(e); }
}

async function eliminar(req, res, next) {
  try {
    const pub = await prisma.publicacion.findUnique({ where:{ id:Number(req.params.id) }, include:{ productor:true } });
    if (!pub || pub.eliminada) return res.status(404).json({ success:false, message:'No encontrada' });
    if (pub.productor.usuario_id !== req.user.id)
      return res.status(403).json({ success:false, message:'Sin permiso' });
    await prisma.publicacion.update({ where:{ id:pub.id }, data:{ estado:'cerrada', eliminada:true } });
    res.json({ success:true, message:'Publicación eliminada' });
  } catch(e) { next(e); }
}

module.exports = { listar, misPublicaciones, obtener, crear, actualizar, cambiarEstado, eliminar };
