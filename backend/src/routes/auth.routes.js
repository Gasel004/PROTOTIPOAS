// ═══════════════════════════════════════════════════
// routes/auth.routes.js
// ═══════════════════════════════════════════════════
const router  = require('express').Router();
const ctrl    = require('../controllers/auth.controller');
const { verificarToken } = require('../middleware/auth');

router.post('/register', ctrl.register);
router.post('/login',    ctrl.login);
router.get('/me',        verificarToken, ctrl.me);

module.exports = router;

// ═══════════════════════════════════════════════════
// Se requieren los archivos de controller y service
// que se generan a continuación en archivos separados
// ═══════════════════════════════════════════════════
