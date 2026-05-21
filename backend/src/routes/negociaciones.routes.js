const r = require('express').Router();
const c = require('../controllers/negociaciones.controller');
const m = require('../controllers/mensajes.controller');
const { verificarToken, soloRoles } = require('../middleware/auth');

r.get('/',                         verificarToken, c.listar);
r.get('/:id',                      verificarToken, c.obtener);
r.post('/',                        verificarToken, soloRoles('comprador'), c.crear);
r.patch('/:id/estado',             verificarToken, c.cambiarEstado);
r.get('/:id/mensajes',             verificarToken, m.listar);
r.post('/:id/mensajes',            verificarToken, m.enviar);
r.patch('/:id/mensajes/leer',      verificarToken, m.marcarLeidos);
module.exports = r;
