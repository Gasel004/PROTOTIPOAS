exports.uploadImagen = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se subió ningún archivo'
      });
    }

    const fs = require('fs');
    const { validateMagicBytes } = require('../middleware/upload');
    const buf = fs.readFileSync(req.file.path);
    if (!validateMagicBytes(buf, req.file.mimetype)) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({
        success: false,
        message: 'El archivo no coincide con el formato declarado'
      });
    }

    const fileUrl = `/uploads/productos/${req.file.filename}`;

    res.json({
      success: true,
      message: 'Imagen subida exitosamente',
      url: fileUrl
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al procesar la subida del archivo',
      error: error.message
    });
  }
};
