const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const RegistroIndividual = require('../models/RegistroIndividual');
const Turno = require('../models/Turno');
const ReporteMaterial = require('../models/ReporteMaterial');

// POST /api/sync/bulk
router.post('/bulk', auth, async (req, res) => {
  try {
    const { registros, turnos, reportes } = req.body;

    const resultados = {
      registros: { exitosos: 0, fallidos: 0, errores: [] },
      turnos: { exitosos: 0, fallidos: 0, errores: [] },
      reportes: { exitosos: 0, fallidos: 0, errores: [] }
    };

    // Sincronizar registros individuales
    if (Array.isArray(registros)) {
      for (const registro of registros) {
        try {
          if (registro.local_id) {
            const existente = await RegistroIndividual.findOne({ local_id: registro.local_id });
            if (existente) {
              resultados.registros.fallidos++;
              resultados.registros.errores.push({
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
          resultados.registros.exitosos++;
        } catch (error) {
          resultados.registros.fallidos++;
          resultados.registros.errores.push({
            local_id: registro.local_id,
            error: error.message
          });
        }
      }
    }

    // Sincronizar turnos
    if (Array.isArray(turnos)) {
      for (const turno of turnos) {
        try {
          if (turno.local_id) {
            const existente = await Turno.findOne({ local_id: turno.local_id });
            if (existente) {
              resultados.turnos.fallidos++;
              resultados.turnos.errores.push({
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
          resultados.turnos.exitosos++;
        } catch (error) {
          resultados.turnos.fallidos++;
          resultados.turnos.errores.push({
            local_id: turno.local_id,
            error: error.message
          });
        }
      }
    }

    // Sincronizar reportes
    if (Array.isArray(reportes)) {
      for (const reporte of reportes) {
        try {
          if (reporte.local_id) {
            const existente = await ReporteMaterial.findOne({ local_id: reporte.local_id });
            if (existente) {
              resultados.reportes.fallidos++;
              resultados.reportes.errores.push({
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
          resultados.reportes.exitosos++;
        } catch (error) {
          resultados.reportes.fallidos++;
          resultados.reportes.errores.push({
            local_id: reporte.local_id,
            error: error.message
          });
        }
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

// GET /api/sync/stats
router.get('/stats', auth, async (req, res) => {
  try {
    const [registros, turnos, reportes] = await Promise.all([
      RegistroIndividual.countDocuments({ operador_id: req.operador._id }),
      Turno.countDocuments({ operador_id: req.operador._id }),
      ReporteMaterial.countDocuments({ operador_id: req.operador._id })
    ]);

    const [registrosNoSync, turnosNoSync, reportesNoSync] = await Promise.all([
      RegistroIndividual.countDocuments({ operador_id: req.operador._id, sincronizado: false }),
      Turno.countDocuments({ operador_id: req.operador._id, sincronizado: false }),
      ReporteMaterial.countDocuments({ operador_id: req.operador._id, sincronizado: false })
    ]);

    res.json({
      error: false,
      data: {
        total: {
          registros,
          turnos,
          reportes
        },
        pendientes: {
          registros: registrosNoSync,
          turnos: turnosNoSync,
          reportes: reportesNoSync
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: 'Error al obtener estadísticas',
      details: error.message
    });
  }
});

module.exports = router; 