const r = require('express').Router();
const c = require('../controllers/publicaciones.controller');
const { verificarToken, soloRoles } = require('../middleware/auth');

r.get('/',              c.listar);
r.get('/:id',          c.obtener);
r.post('/',            verificarToken, soloRoles('productor'), c.crear);
r.put('/:id',          verificarToken, soloRoles('productor'), c.actualizar);
r.patch('/:id/estado', verificarToken, soloRoles('productor'), c.cambiarEstado);
r.delete('/:id',       verificarToken, soloRoles('productor'), c.eliminar);
module.exports = r;
