const router = require('express').Router();
const ctrl = require('../controllers/uploads.controller');
const upload = require('../middleware/upload');
const { verificarToken } = require('../middleware/auth');

const multer = require('multer');

// Solo usuarios autenticados pueden subir fotos
router.post('/imagen', verificarToken, (req, res, next) => {
  upload.single('imagen')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ success: false, message: 'La imagen supera el tamaño máximo de 5MB' });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ success: false, message: 'Campo de archivo inesperado' });
      }
      return res.status(400).json({ success: false, message: err.message });
    }
    if (err) return res.status(400).json({ success: false, message: err.message });
    next();
  });
}, ctrl.uploadImagen);

module.exports = router;
