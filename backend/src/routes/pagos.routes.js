const r = require('express').Router();
const c = require('../controllers/pagos.controller');
const { verificarToken, soloRoles } = require('../middleware/auth');

r.get('/',    verificarToken, soloRoles('productor', 'comprador'), c.listar);
r.get('/:id', verificarToken, soloRoles('productor', 'comprador'), c.obtener);
r.post('/',   verificarToken, soloRoles('productor', 'comprador'), c.crear);
r.put('/:id', verificarToken, soloRoles('productor', 'comprador'), c.actualizar);

// Nuevo: marcar que el productor recibió su pago (desbloquea confirmación de entrega)
r.post('/:id/pagar-productor', verificarToken, soloRoles('productor', 'comprador'), c.marcarPagadoAlProductor);

module.exports = r;
