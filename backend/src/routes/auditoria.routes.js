const r = require('express').Router();
const prisma = require('../prisma');
const { verificarToken, verificarUsuarioActivo, soloRoles } = require('../middleware/auth');

r.get('/', verificarToken, verificarUsuarioActivo, soloRoles('asociacion'), async (req, res, next) => {
  try {
    const { accion, usuario, fecha_desde, fecha_hasta, page: p } = req.query;
    const where = {};
    if (accion) where.accion = accion;
    if (usuario) {
      const u = await prisma.usuario.findFirst({
        where: { OR: [{ nombre: { contains: usuario, mode: 'insensitive' } }, { telefono: { contains: usuario } }] },
        select: { id: true },
      });
      where.usuario_id = u ? u.id : -1;
    }
    if (fecha_desde || fecha_hasta) {
      where.created_at = {};
      if (fecha_desde) where.created_at.gte = new Date(fecha_desde);
      if (fecha_hasta) where.created_at.lte = new Date(fecha_hasta + 'T23:59:59.999Z');
    }

    const page = Math.max(1, Number(p) || 1);
    const limit = 50;
    const [data, total] = await Promise.all([
      prisma.auditoria.findMany({
        where,
        include: { usuario: { select: { nombre: true, telefono: true, rol: true } } },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditoria.count({ where }),
    ]);

    res.json({ success: true, data, total, page, totalPages: Math.ceil(total / limit) });
  } catch (e) { next(e); }
});

module.exports = r;
