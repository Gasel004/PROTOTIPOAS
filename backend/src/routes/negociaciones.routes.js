const r = require('express').Router();
const c = require('../controllers/negociaciones.controller');
const m = require('../controllers/mensajes.controller');
const { verificarToken, soloRoles } = require('../middleware/auth');

r.get('/',                         verificarToken, c.listar);
r.get('/:id',                      verificarToken, c.obtener);
r.post('/',                        verificarToken, soloRoles('comprador'), c.crear);
r.patch('/:id/estado',             verificarToken, c.cambiarEstado);

// Nuevo: cualquiera de los dos puede ofertar precio
r.post('/:id/ofertar',             verificarToken, soloRoles('comprador', 'productor'), c.ofertarPrecio);

// Nuevo: doble confirmación de cierre (cuando hay acuerdo de precio)
r.post('/:id/confirmar-cierre',    verificarToken, soloRoles('comprador', 'productor'), c.confirmarCierre);

// Nuevo: doble confirmación de entrega (cuando está en tránsito)
r.post('/:id/confirmar-entrega',   verificarToken, soloRoles('comprador', 'productor'), c.confirmarEntrega);

r.get('/:id/mensajes',             verificarToken, m.listar);
r.post('/:id/mensajes',            verificarToken, m.enviar);
r.patch('/:id/mensajes/leer',      verificarToken, m.marcarLeidos);

module.exports = r;
