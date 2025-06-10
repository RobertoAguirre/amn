const express = require('express');
const multer = require('multer');
const router = express.Router();
const { auth } = require('../middleware/auth');

// Configuración de multer para firmas
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB máximo
  },
  fileFilter: (req, file, cb) => {
    // Aceptar solo imágenes
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'));
    }
  }
});

// POST /api/upload/firma
router.post('/firma', auth, upload.single('firma'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: true,
        message: 'No se ha proporcionado ningún archivo'
      });
    }

    // Convertir a base64
    const base64 = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;
    const firmaBase64 = `data:${mimeType};base64,${base64}`;

    res.json({
      error: false,
      message: 'Firma subida exitosamente',
      data: {
        firma: firmaBase64
      }
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: 'Error al subir firma',
      details: error.message
    });
  }
});

module.exports = router; 