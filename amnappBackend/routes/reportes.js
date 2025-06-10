const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const ReporteMaterial = require('../models/ReporteMaterial');
const { auth, validateRequest } = require('../middleware/auth');

// Validaciones para reporte de materiales
const reporteValidation = [
  body('cliente')
    .notEmpty().withMessage('El cliente es requerido')
    .isString().withMessage('El cliente debe ser texto'),
  body('descripcion_material')
    .notEmpty().withMessage('La descripción del material es requerida')
    .isString().withMessage('La descripción debe ser texto'),
  body('hora_llegada')
    .notEmpty().withMessage('La hora de llegada es requerida')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Formato de hora inválido (HH:MM)'),
  body('hora_salida')
    .notEmpty().withMessage('La hora de salida es requerida')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Formato de hora inválido (HH:MM)'),
  body('hora_inicio_sorteo')
    .notEmpty().withMessage('La hora de inicio de sorteo es requerida')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Formato de hora inválido (HH:MM)'),
  body('hora_fin_sorteo')
    .notEmpty().withMessage('La hora de fin de sorteo es requerida')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Formato de hora inválido (HH:MM)'),
  body('materiales')
    .isArray().withMessage('Los materiales deben ser un array')
    .notEmpty().withMessage('Debe haber al menos un material'),
  body('materiales.*.inspector')
    .notEmpty().withMessage('El inspector es requerido')
    .isString().withMessage('El inspector debe ser texto'),
  body('materiales.*.material_sorteado')
    .notEmpty().withMessage('El material sorteado es requerido')
    .isInt({ min: 0 }).withMessage('Debe ser un número positivo'),
  body('materiales.*.piezas_aceptadas')
    .notEmpty().withMessage('Las piezas aceptadas son requeridas')
    .isInt({ min: 0 }).withMessage('Debe ser un número positivo'),
  body('materiales.*.piezas_retrabajadas')
    .notEmpty().withMessage('Las piezas retrabajadas son requeridas')
    .isInt({ min: 0 }).withMessage('Debe ser un número positivo'),
  body('materiales.*.piezas_rechazadas')
    .notEmpty().withMessage('Las piezas rechazadas son requeridas')
    .isInt({ min: 0 }).withMessage('Debe ser un número positivo'),
  body('materiales.*.razon_rechazo')
    .notEmpty().withMessage('La razón del rechazo es requerida')
    .isString().withMessage('La razón debe ser texto'),
  body('firma_digital')
    .notEmpty().withMessage('La firma digital es requerida')
    .isString().withMessage('La firma debe ser texto'),
  body('ubicacion.latitud')
    .isFloat().withMessage('Latitud inválida'),
  body('ubicacion.longitud')
    .isFloat().withMessage('Longitud inválida')
];

// POST /api/reportes/materiales
router.post('/materiales', auth, reporteValidation, validateRequest, async (req, res) => {
  try {
    const reporte = new ReporteMaterial({
      ...req.body,
      operador_id: req.operador._id
    });

    await reporte.save();

    res.status(201).json({
      error: false,
      message: 'Reporte de materiales creado exitosamente',
      data: reporte
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: 'Error al crear reporte de materiales',
      details: error.message
    });
  }
});

// GET /api/reportes/materiales
router.get('/materiales', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const reportes = await ReporteMaterial.find({ operador_id: req.operador._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ReporteMaterial.countDocuments({ operador_id: req.operador._id });

    res.json({
      error: false,
      data: {
        reportes,
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
      message: 'Error al obtener reportes de materiales',
      details: error.message
    });
  }
});

// POST /api/reportes/materiales/bulk
router.post('/materiales/bulk', auth, async (req, res) => {
  try {
    const { reportes } = req.body;

    if (!Array.isArray(reportes)) {
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

    for (const reporte of reportes) {
      try {
        // Verificar si ya existe por local_id
        if (reporte.local_id) {
          const existente = await ReporteMaterial.findOne({ local_id: reporte.local_id });
          if (existente) {
            resultados.fallidos++;
            resultados.errores.push({
              local_id: reporte.local_id,
              error: 'Reporte duplicado'
            });
            continue;
          }
        }

        const nuevoReporte = new ReporteMaterial({
          ...reporte,
          operador_id: req.operador._id,
          sincronizado: true
        });

        await nuevoReporte.save();
        resultados.exitosos++;
      } catch (error) {
        resultados.fallidos++;
        resultados.errores.push({
          local_id: reporte.local_id,
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