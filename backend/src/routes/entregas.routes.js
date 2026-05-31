const r = require('express').Router();
const c = require('../controllers/entregas.controller');
const { verificarToken, soloRoles } = require('../middleware/auth');

r.get('/',              verificarToken, soloRoles('productor', 'comprador'), c.listar);
r.get('/:id',           verificarToken, soloRoles('productor', 'comprador'), c.obtener);
r.post('/',             verificarToken, soloRoles('productor', 'comprador'), c.crear);
r.put('/:id',           verificarToken, soloRoles('productor', 'comprador'), c.actualizar);
r.post('/:id/confirmar',verificarToken, soloRoles('productor', 'comprador'), c.confirmar);
module.exports = r;
