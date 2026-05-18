const r = require('express').Router();
const c = require('../controllers/notificaciones.controller');
const { verificarToken } = require('../middleware/auth');

r.get('/',                    verificarToken, c.listar);
r.patch('/:id/leer',          verificarToken, c.marcarUna);
r.patch('/leer-todas',        verificarToken, c.marcarTodas);
module.exports = r;
