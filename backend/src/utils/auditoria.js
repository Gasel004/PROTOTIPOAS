const prisma = require('../prisma');

async function registrar({ accion, entidad, entidad_id, usuario_id, detalle }) {
  try {
    await prisma.auditoria.create({
      data: {
        accion,
        entidad,
        entidad_id,
        usuario_id,
        detalle: detalle ? (typeof detalle === 'string' ? detalle : JSON.stringify(detalle)) : null,
      },
    });
  } catch (e) {
    console.error('[auditoria] Error al registrar:', e.message);
  }
}

module.exports = { registrar };
