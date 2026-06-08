// ═══════════════════════════════════════════════════
// routes/auth.routes.js
// ═══════════════════════════════════════════════════
const router  = require('express').Router();
const ctrl    = require('../controllers/auth.controller');
const { verificarToken, verificarUsuarioActivo } = require('../middleware/auth');
const { loginRateLimiter } = require('../middleware/rateLimiter');

router.post('/register', ctrl.register);
router.post('/login',    loginRateLimiter, ctrl.login);
router.get('/me',        verificarToken, verificarUsuarioActivo, ctrl.me);
router.put('/password',  verificarToken, verificarUsuarioActivo, ctrl.cambiarPassword);

module.exports = router;

// ═══════════════════════════════════════════════════
// Se requieren los archivos de controller y service
// que se generan a continuación en archivos separados
// ═══════════════════════════════════════════════════
