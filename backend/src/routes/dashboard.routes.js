const r = require('express').Router();
const c = require('../controllers/dashboard.controller');
const { verificarToken, verificarUsuarioActivo, soloRoles } = require('../middleware/auth');

r.get('/stats', verificarToken, verificarUsuarioActivo, c.stats);
r.get('/estadisticas', verificarToken, verificarUsuarioActivo, soloRoles('asociacion'), c.estadisticas);

module.exports = r;
