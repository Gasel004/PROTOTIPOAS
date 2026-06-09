const prisma = require('../prisma');

async function stats(req, res, next) {
  try {
    const { rol, id } = req.user;

    if (rol === 'productor') {
      const productor = await prisma.productor.findUnique({ where: { usuario_id: id } });
      if (!productor) return res.status(404).json({ success: false, message: 'Perfil de productor no encontrado' });

      const [publicaciones, negociaciones_activas, entregas_pendientes, pagos] = await Promise.all([
        prisma.publicacion.count({ where: { productor_id: productor.id, estado: 'activa', eliminada:false } }),
        prisma.negociacion.count({ where: { productor_id: productor.id, estado: { in: ['pendiente', 'en_proceso', 'acuerdo_pendiente', 'aceptada'] } } }),
        prisma.entrega.count({ where: { estado: { in: ['pendiente', 'en_transito'] }, negociacion: { productor_id: productor.id } } }),
        prisma.pago.aggregate({ where: { estado: 'completado', negociacion: { productor_id: productor.id } }, _sum: { monto: true } }),
      ]);

      const ingresos_mes = Number(pagos._sum.monto ?? 0);
      return res.json({ publicaciones, negociaciones_activas, entregas_pendientes, ingresos_mes });
    }

    if (rol === 'comprador') {
      const comprador = await prisma.comprador.findUnique({ where: { usuario_id: id } });
      if (!comprador) return res.status(404).json({ success: false, message: 'Perfil de comprador no encontrado' });

      const [publicaciones_vistas, negociaciones_activas, entregas_pendientes, pagos] = await Promise.all([
        prisma.publicacion.count({ where: { estado: 'activa', eliminada:false } }),
        prisma.negociacion.count({ where: { comprador_id: comprador.id, estado: { in: ['pendiente', 'en_proceso', 'acuerdo_pendiente', 'aceptada'] } } }),
        prisma.entrega.count({ where: { estado: { in: ['pendiente', 'en_transito'] }, negociacion: { comprador_id: comprador.id } } }),
        prisma.pago.aggregate({ where: { estado: 'completado', negociacion: { comprador_id: comprador.id } }, _sum: { monto: true } }),
      ]);

      const gasto_mes = Number(pagos._sum.monto ?? 0);
      return res.json({ publicaciones_vistas, negociaciones_activas, entregas_pendientes, gasto_mes });
    }

    const asociacion = await prisma.asociacion.findUnique({ where: { usuario_id: id } });
    if (!asociacion) {
      return res.status(404).json({ success: false, message: 'Perfil de asociación no encontrado' });
    }
    const productores = await prisma.productor.findMany({
      where: { asociacion_id: asociacion.id },
      select: { id: true },
    });
    const productorIds = productores.map(p => p.id);
    const whereProductores = { productor_id: { in: productorIds } };

    const [miembros, publicaciones_activas, negociaciones_activas, productos_activos, notificaciones_no_leidas, pagos] = await Promise.all([
      prisma.productor.count({ where: { asociacion_id: asociacion.id } }),
      prisma.publicacion.count({ where: { ...whereProductores, estado: 'activa', eliminada:false } }),
      prisma.negociacion.count({ where: { ...whereProductores, estado: { in: ['pendiente', 'en_proceso', 'acuerdo_pendiente', 'aceptada'] } } }),
      prisma.producto.count({ where:{ activo:true } }),
      prisma.notificacion.count({ where:{ usuario_id:id, leida:false } }),
      prisma.pago.aggregate({ where: { estado: 'completado', negociacion: whereProductores }, _sum: { monto: true } }),
    ]);
    const valor_negociado = Number(pagos._sum.monto ?? 0);

    res.json({ miembros, publicaciones_activas, negociaciones_activas, productos_activos, notificaciones_no_leidas, valor_negociado });
  } catch (e) {
    next(e);
  }
}

async function estadisticas(req, res, next) {
  try {
    const { periodo, categoria } = req.query;
    const whereNegociacion = { estado: 'completada' };
    const wherePago = { estado: 'completado' };

    if (periodo) {
      const [year, month] = periodo.split('-').map(Number);
      const inicio = new Date(year, (month || 1) - 1, 1);
      const fin = month
        ? new Date(year, month, 0, 23, 59, 59, 999)
        : new Date(year, 11, 31, 23, 59, 59, 999);
      wherePago.fecha_pago = { gte: inicio, lte: fin };
    }

    const whereProducto = {};
    if (categoria) whereProducto.categoria = categoria;

    const productos = await prisma.producto.findMany({
      where: whereProducto,
      select: { id: true, nombre: true, categoria: true, unidad_medida: true },
      orderBy: { nombre: 'asc' },
    });

    const negociaciones = await prisma.negociacion.findMany({
      where: whereNegociacion,
      select: { id: true, cantidad_solicitada: true, publicacion: { select: { producto_id: true } } },
    });

    const pagos = await prisma.pago.findMany({
      where: { ...wherePago, negociacion_id: { in: negociaciones.map(n => n.id) } },
      select: { negociacion_id: true, monto: true },
    });

    const pagosPorNegociacion = {};
    for (const p of pagos) {
      pagosPorNegociacion[p.negociacion_id] = (pagosPorNegociacion[p.negociacion_id] || 0) + Number(p.monto);
    }

    const datosPorProducto = {};
    for (const n of negociaciones) {
      const productoId = n.publicacion.producto_id;
      if (!datosPorProducto[productoId]) {
        datosPorProducto[productoId] = { volumen: 0, valor_total: 0, transacciones: 0 };
      }
      datosPorProducto[productoId].volumen += Number(n.cantidad_solicitada);
      datosPorProducto[productoId].valor_total += (pagosPorNegociacion[n.id] || 0);
      datosPorProducto[productoId].transacciones += 1;
    }

    const resultado = productos
      .filter(p => datosPorProducto[p.id])
      .map(p => ({
        producto_id: p.id,
        producto_nombre: p.nombre,
        categoria: p.categoria ?? 'Sin categoría',
        unidad_medida: p.unidad_medida,
        volumen: Math.round(datosPorProducto[p.id].volumen * 100) / 100,
        valor_total: Math.round(datosPorProducto[p.id].valor_total * 100) / 100,
        transacciones: datosPorProducto[p.id].transacciones,
      }))
      .sort((a, b) => b.valor_total - a.valor_total);

    const totales = resultado.reduce(
      (acc, r) => ({
        volumen_total: acc.volumen_total + r.volumen,
        valor_total: acc.valor_total + r.valor_total,
        transacciones_totales: acc.transacciones_totales + r.transacciones,
      }),
      { volumen_total: 0, valor_total: 0, transacciones_totales: 0 }
    );

    res.json({
      success: true,
      data: { productos: resultado, totales },
    });
  } catch (e) {
    next(e);
  }
}

module.exports = { stats, estadisticas };
