const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function stats(req, res, next) {
  try {
    const { rol, id } = req.user;

    if (rol === 'productor') {
      const productor = await prisma.productor.findUnique({ where: { usuario_id: id } });
      if (!productor) return res.status(404).json({ success: false, message: 'Perfil de productor no encontrado' });

      const [publicaciones, negociaciones_activas, entregas_pendientes, pagos] = await Promise.all([
        prisma.publicacion.count({ where: { productor_id: productor.id, estado: 'activa' } }),
        prisma.negociacion.count({ where: { productor_id: productor.id, estado: { in: ['pendiente', 'en_proceso', 'aceptada'] } } }),
        prisma.entrega.count({ where: { estado: { in: ['pendiente', 'en_transito'] }, negociacion: { productor_id: productor.id } } }),
        prisma.pago.findMany({ where: { estado: 'completado', negociacion: { productor_id: productor.id } }, select: { monto: true } }),
      ]);

      const ingresos_mes = pagos.reduce((sum, p) => sum + Number(p.monto), 0);
      return res.json({ publicaciones, negociaciones_activas, entregas_pendientes, ingresos_mes });
    }

    if (rol === 'comprador') {
      const comprador = await prisma.comprador.findUnique({ where: { usuario_id: id } });
      if (!comprador) return res.status(404).json({ success: false, message: 'Perfil de comprador no encontrado' });

      const [publicaciones_vistas, negociaciones_activas, entregas_pendientes, pagos] = await Promise.all([
        prisma.publicacion.count({ where: { estado: 'activa' } }),
        prisma.negociacion.count({ where: { comprador_id: comprador.id, estado: { in: ['pendiente', 'en_proceso', 'aceptada'] } } }),
        prisma.entrega.count({ where: { estado: { in: ['pendiente', 'en_transito'] }, negociacion: { comprador_id: comprador.id } } }),
        prisma.pago.findMany({ where: { estado: 'completado', negociacion: { comprador_id: comprador.id } }, select: { monto: true } }),
      ]);

      const gasto_mes = pagos.reduce((sum, p) => sum + Number(p.monto), 0);
      return res.json({ publicaciones_vistas, negociaciones_activas, entregas_pendientes, gasto_mes });
    }

    const asociacion = await prisma.asociacion.findUnique({ where: { usuario_id: id } });
    const productores = await prisma.productor.findMany({
      where: asociacion ? { asociacion_id: asociacion.id } : {},
      select: { id: true },
    });
    const productorIds = productores.map(p => p.id);
    const whereProductores = productorIds.length ? { productor_id: { in: productorIds } } : {};

    const [miembros, publicaciones_activas, negociaciones_activas, pagos] = await Promise.all([
      prisma.productor.count({ where: asociacion ? { asociacion_id: asociacion.id } : {} }),
      prisma.publicacion.count({ where: { ...whereProductores, estado: 'activa' } }),
      prisma.negociacion.count({ where: { ...whereProductores, estado: { in: ['pendiente', 'en_proceso', 'aceptada'] } } }),
      prisma.pago.findMany({ where: { estado: 'completado', negociacion: whereProductores }, select: { monto: true } }),
    ]);
    const valor_negociado = pagos.reduce((sum, p) => sum + Number(p.monto), 0);

    res.json({ miembros, publicaciones_activas, negociaciones_activas, valor_negociado });
  } catch (e) {
    next(e);
  }
}

module.exports = { stats };
