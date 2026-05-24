const r = require('express').Router();
const c = require('../controllers/dashboard.controller');
const { verificarToken } = require('../middleware/auth');

r.get('/stats', verificarToken, c.stats);

module.exports = r;
