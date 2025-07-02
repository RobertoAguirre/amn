const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const Turno = require('../models/Turno');
const { auth, validateRequest } = require('../middleware/auth');

// Validaciones para turno
const turnoValidation = [
  body('cliente')
    .notEmpty().withMessage('El cliente es requerido')
    .isString().withMessage('El cliente debe ser texto'),
  body('turno')
    .notEmpty().withMessage('El turno es requerido')
    .isIn(['MATUTINO', 'VESPERTINO', 'NOCTURNO']).withMessage('Turno inválido'),
  body('piezas_turno')
    .notEmpty().withMessage('Las piezas del turno son requeridas')
    .isInt({ min: 0 }).withMessage('Las piezas deben ser un número positivo'),
  body('rechazos')
    .notEmpty().withMessage('Los rechazos son requeridos')
    .isInt({ min: 0 }).withMessage('Los rechazos deben ser un número positivo'),
  body('operativos_turno')
    .notEmpty().withMessage('Los operativos del turno son requeridos')
    .isInt({ min: 0 }).withMessage('Los operativos deben ser un número positivo'),
  body('tiempo_planta')
    .notEmpty().withMessage('El tiempo en planta es requerido')
    .isInt({ min: 0 }).withMessage('El tiempo debe ser un número positivo'),
  body('horas_producidas')
    .notEmpty().withMessage('Las horas producidas son requeridas')
    .isInt({ min: 0 }).withMessage('Las horas deben ser un número positivo'),
  body('documentos_turno')
    .notEmpty().withMessage('Los documentos del turno son requeridos')
    .isInt({ min: 0 }).withMessage('Los documentos deben ser un número positivo'),
  body('numero_reloj')
    .notEmpty().withMessage('El número de reloj es requerido')
    .isString().withMessage('El número de reloj debe ser texto'),
  body('ubicacion.latitud')
    .isFloat().withMessage('Latitud inválida'),
  body('ubicacion.longitud')
    .isFloat().withMessage('Longitud inválida')
];

// POST /api/turnos
router.post('/', auth, turnoValidation, validateRequest, async (req, res) => {
  try {
    const turno = new Turno({
      ...req.body,
      operador_id: req.operador._id
    });

    await turno.save();

    res.status(201).json({
      error: false,
      message: 'Turno creado exitosamente',
      data: turno
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: 'Error al crear turno',
      details: error.message
    });
  }
});

// GET /api/turnos
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const turnos = await Turno.find({ operador_id: req.operador._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Turno.countDocuments({ operador_id: req.operador._id });

    res.json({
      error: false,
      data: {
        turnos,
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
      message: 'Error al obtener turnos',
      details: error.message
    });
  }
});

// POST /api/turnos/bulk
router.post('/bulk', auth, async (req, res) => {
  try {
    const { turnos } = req.body;

    if (!Array.isArray(turnos)) {
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

    for (const turno of turnos) {
      try {
        // Verificar si ya existe por local_id
        if (turno.local_id) {
          const existente = await Turno.findOne({ local_id: turno.local_id });
          if (existente) {
            resultados.fallidos++;
            resultados.errores.push({
              local_id: turno.local_id,
              error: 'Turno duplicado'
            });
            continue;
          }
        }

        const nuevoTurno = new Turno({
          ...turno,
          operador_id: req.operador._id,
          sincronizado: true
        });

        await nuevoTurno.save();
        resultados.exitosos++;
      } catch (error) {
        resultados.fallidos++;
        resultados.errores.push({
          local_id: turno.local_id,
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

// Endpoint público para MVP (sin autenticación)
router.post('/mvp', async (req, res) => {
  try {
    const turno = new Turno({
      ...req.body,
      sincronizado: true
    });
    await turno.save();
    res.status(201).json({
      error: false,
      message: 'Turno creado (MVP)',
      data: turno
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: 'Error al crear turno (MVP)',
      details: error.message
    });
  }
});

// Endpoint público para MVP (sin autenticación) - obtener turnos
router.get('/mvp', async (req, res) => {
  try {
    const turnos = await Turno.find().sort({ fecha: -1 });
    res.json({
      error: false,
      data: turnos
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: 'Error al obtener turnos (MVP)',
      details: error.message
    });
  }
});

module.exports = router; 