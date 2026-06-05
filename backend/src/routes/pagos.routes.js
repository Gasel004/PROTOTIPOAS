const r = require('express').Router();
const c = require('../controllers/pagos.controller');
const { verificarToken, soloRoles } = require('../middleware/auth');

r.get('/',    verificarToken, soloRoles('productor', 'comprador'), c.listar);
r.get('/:id', verificarToken, soloRoles('productor', 'comprador'), c.obtener);
r.post('/',   verificarToken, soloRoles('productor', 'comprador'), c.crear);
r.put('/:id', verificarToken, soloRoles('productor', 'comprador'), c.actualizar);

// SOLO PRODUCTOR puede marcar que recibio el pago
r.post('/:id/pagar-productor', verificarToken, soloRoles('productor'), c.marcarPagadoAlProductor);

module.exports = r;
