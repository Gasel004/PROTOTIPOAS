const r = require('express').Router();
const c = require('../controllers/dashboard.controller');
const { verificarToken, verificarUsuarioActivo } = require('../middleware/auth');

r.get('/stats', verificarToken, verificarUsuarioActivo, c.stats);

module.exports = r;
