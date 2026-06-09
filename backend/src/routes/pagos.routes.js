const r = require('express').Router();
const c = require('../controllers/pagos.controller');
const { verificarToken, verificarUsuarioActivo, verificarProductorActivo, verificarCompradorActivo, soloRoles } = require('../middleware/auth');

r.get('/',    verificarToken, verificarUsuarioActivo, soloRoles('productor', 'comprador'), c.listar);
r.get('/:id', verificarToken, verificarUsuarioActivo, soloRoles('productor', 'comprador'), c.obtener);
r.post('/',   verificarToken, verificarUsuarioActivo, verificarProductorActivo, verificarCompradorActivo, soloRoles('productor', 'comprador'), c.crear);
r.put('/:id', verificarToken, verificarUsuarioActivo, verificarProductorActivo, verificarCompradorActivo, soloRoles('productor', 'comprador'), c.actualizar);
module.exports = r;
