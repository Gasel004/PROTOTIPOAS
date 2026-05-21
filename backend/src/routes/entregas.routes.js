const r = require('express').Router();
const c = require('../controllers/entregas.controller');
const { verificarToken } = require('../middleware/auth');

r.get('/',              verificarToken, c.listar);
r.get('/:id',           verificarToken, c.obtener);
r.post('/',             verificarToken, c.crear);
r.put('/:id',           verificarToken, c.actualizar);
r.post('/:id/confirmar',verificarToken, c.confirmar);
module.exports = r;
