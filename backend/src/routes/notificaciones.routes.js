const r = require('express').Router();
const c = require('../controllers/notificaciones.controller');
const { verificarToken, verificarUsuarioActivo } = require('../middleware/auth');

r.get('/',                    verificarToken, verificarUsuarioActivo, c.listar);
r.patch('/:id/leer',          verificarToken, verificarUsuarioActivo, c.marcarUna);
r.patch('/leer-todas',        verificarToken, verificarUsuarioActivo, c.marcarTodas);
module.exports = r;
