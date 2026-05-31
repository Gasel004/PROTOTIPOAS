exports.uploadImagen = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se subió ningún archivo'
      });
    }

    // Retornamos la ruta relativa para ser consumida e indexada por el frontend
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
