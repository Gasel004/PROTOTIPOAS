const r = require('express').Router();
const c = require('../controllers/publicaciones.controller');
const { verificarToken, verificarUsuarioActivo, verificarProductorActivo, soloRoles } = require('../middleware/auth');

r.get('/',              c.listar);
r.get('/mis-publicaciones', verificarToken, verificarUsuarioActivo, soloRoles('productor'), c.misPublicaciones);
r.get('/:id',          c.obtener);
r.post('/',            verificarToken, verificarUsuarioActivo, verificarProductorActivo, soloRoles('productor'), c.crear);
r.put('/:id',          verificarToken, verificarUsuarioActivo, verificarProductorActivo, soloRoles('productor'), c.actualizar);
r.patch('/:id/estado', verificarToken, verificarUsuarioActivo, verificarProductorActivo, soloRoles('productor'), c.cambiarEstado);
r.delete('/:id',       verificarToken, verificarUsuarioActivo, verificarProductorActivo, soloRoles('productor'), c.eliminar);
module.exports = r;
