const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const RegistroIndividual = require('../models/RegistroIndividual');
const { auth, validateRequest } = require('../middleware/auth');

// Validaciones para registro individual
const registroValidation = [
  body('planta')
    .notEmpty().withMessage('La planta es requerida')
    .isString().withMessage('La planta debe ser texto'),
  body('inicio_turno')
    .notEmpty().withMessage('La hora de inicio es requerida')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Formato de hora inválido (HH:MM)'),
  body('fin_turno')
    .notEmpty().withMessage('La hora de fin es requerida')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Formato de hora inválido (HH:MM)'),
  body('numero_reloj')
    .notEmpty().withMessage('El número de reloj es requerido')
    .isString().withMessage('El número de reloj debe ser texto'),
  body('inspector')
    .notEmpty().withMessage('El inspector es requerido')
    .isString().withMessage('El inspector debe ser texto'),
  body('actividades')
    .isArray().withMessage('Las actividades deben ser un array')
    .notEmpty().withMessage('Debe haber al menos una actividad'),
  body('actividades.*.actividad_codigo')
    .isInt({ min: 1, max: 7 }).withMessage('Código de actividad inválido (1-7)'),
  body('actividades.*.hora_inicio')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Formato de hora inválido (HH:MM)'),
  body('actividades.*.hora_fin')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Formato de hora inválido (HH:MM)'),
  body('actividades.*.no_parte_curso')
    .notEmpty().withMessage('El número de parte es requerido')
    .isString().withMessage('El número de parte debe ser texto'),
  body('ubicacion.latitud')
    .isFloat().withMessage('Latitud inválida'),
  body('ubicacion.longitud')
    .isFloat().withMessage('Longitud inválida')
];

// POST /api/registro/individual
router.post('/individual', auth, registroValidation, validateRequest, async (req, res) => {
  try {
    const registro = new RegistroIndividual({
      ...req.body,
      operador_id: req.operador._id
    });

    await registro.save();

    res.status(201).json({
      error: false,
      message: 'Registro individual creado exitosamente',
      data: registro
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: 'Error al crear registro individual',
      details: error.message
    });
  }
});

// GET /api/registro/individual
router.get('/individual', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const registros = await RegistroIndividual.find({ operador_id: req.operador._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await RegistroIndividual.countDocuments({ operador_id: req.operador._id });

    res.json({
      error: false,
      data: {
        registros,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: 'Error al obtener registros individuales',
      details: error.message
    });
  }
});

// POST /api/registro/individual/bulk
router.post('/individual/bulk', auth, async (req, res) => {
  try {
    const { registros } = req.body;

    if (!Array.isArray(registros)) {
      return res.status(400).json({
        error: true,
        message: 'El formato de datos es inválido'
      });
    }

    const resultados = {
      exitosos: 0,
      fallidos: 0,
      errores: []
    };

    for (const registro of registros) {
      try {
        // Verificar si ya existe por local_id
        if (registro.local_id) {
          const existente = await RegistroIndividual.findOne({ local_id: registro.local_id });
          if (existente) {
            resultados.fallidos++;
            resultados.errores.push({
              local_id: registro.local_id,
              error: 'Registro duplicado'
            });
            continue;
          }
        }

        const nuevoRegistro = new RegistroIndividual({
          ...registro,
          operador_id: req.operador._id,
          sincronizado: true
        });

        await nuevoRegistro.save();
        resultados.exitosos++;
      } catch (error) {
        resultados.fallidos++;
        resultados.errores.push({
          local_id: registro.local_id,
          error: error.message
        });
      }
    }

    res.json({
      error: false,
      message: 'Sincronización completada',
      data: resultados
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: 'Error en sincronización masiva',
      details: error.message
    });
  }
});

module.exports = router; 