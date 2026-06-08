const r = require('express').Router();
const c = require('../controllers/negociaciones.controller');
const m = require('../controllers/mensajes.controller');
const { verificarToken, verificarUsuarioActivo, verificarProductorActivo, soloRoles } = require('../middleware/auth');

r.get('/',                         verificarToken, verificarUsuarioActivo, c.listar);
r.get('/:id',                      verificarToken, verificarUsuarioActivo, c.obtener);
r.post('/',                        verificarToken, verificarUsuarioActivo, soloRoles('comprador'), c.crear);
r.patch('/:id/estado',             verificarToken, verificarUsuarioActivo, verificarProductorActivo, c.cambiarEstado);
r.post('/:id/calificar',           verificarToken, verificarUsuarioActivo, soloRoles('comprador', 'productor'), c.calificarContraparte);
r.get('/:id/mensajes',             verificarToken, verificarUsuarioActivo, m.listar);
r.post('/:id/mensajes',            verificarToken, verificarUsuarioActivo, m.enviar);
r.patch('/:id/mensajes/leer',      verificarToken, verificarUsuarioActivo, m.marcarLeidos);
module.exports = r;
