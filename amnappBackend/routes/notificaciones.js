const express = require('express');
const router = express.Router();
const Notificacion = require('../models/Notificacion');

// GET /api/notificaciones - Obtener notificaciones (con filtros opcionales)
router.get('/', async (req, res) => {
  try {
    const { leida, tipo, empleadoId, plantaId, limit = 50, skip = 0 } = req.query;
    
    let filtro = { activa: true };
    
    if (leida !== undefined) {
      filtro.leida = leida === 'true';
    }
    
    if (tipo) {
      filtro.tipo = tipo;
    }
    
    if (empleadoId) {
      filtro.empleadoId = empleadoId;
    }
    
    if (plantaId) {
      filtro.plantaId = plantaId;
    }

    const notificaciones = await Notificacion.find(filtro)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Notificacion.countDocuments(filtro);
    const noLeidas = await Notificacion.countDocuments({ ...filtro, leida: false });

    res.json({
      error: false,
      data: notificaciones,
      total,
      noLeidas,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });
  } catch (error) {
    console.error('❌ [Notificaciones] Error:', error);
    res.status(500).json({ error: true, message: 'Error al obtener notificaciones', details: error.message });
  }
});

// GET /api/notificaciones/contador - Obtener solo el contador de no leídas
router.get('/contador', async (req, res) => {
  try {
    const noLeidas = await Notificacion.countDocuments({ leida: false, activa: true });
    
    res.json({
      error: false,
      contador: noLeidas
    });
  } catch (error) {
    console.error('❌ [Notificaciones] Error:', error);
    res.status(500).json({ error: true, message: 'Error al obtener contador', details: error.message });
  }
});

// PUT /api/notificaciones/:id/leer - Marcar una notificación como leída
router.put('/:id/leer', async (req, res) => {
  try {
    const notificacion = await Notificacion.findById(req.params.id);
    
    if (!notificacion) {
      return res.status(404).json({ error: true, message: 'Notificación no encontrada' });
    }

    notificacion.leida = true;
    notificacion.fechaLeida = new Date();
    await notificacion.save();

    console.log(`✅ [Notificaciones] Notificación marcada como leída: ${notificacion._id}`);

    res.json({
      error: false,
      message: 'Notificación marcada como leída',
      data: notificacion
    });
  } catch (error) {
    console.error('❌ [Notificaciones] Error:', error);
    res.status(500).json({ error: true, message: 'Error al marcar notificación', details: error.message });
  }
});

// PUT /api/notificaciones/leer-todas - Marcar todas las notificaciones como leídas
router.put('/leer-todas', async (req, res) => {
  try {
    const resultado = await Notificacion.updateMany(
      { leida: false, activa: true },
      { 
        $set: { 
          leida: true, 
          fechaLeida: new Date() 
        } 
      }
    );

    console.log(`✅ [Notificaciones] ${resultado.modifiedCount} notificaciones marcadas como leídas`);

    res.json({
      error: false,
      message: `${resultado.modifiedCount} notificaciones marcadas como leídas`,
      actualizadas: resultado.modifiedCount
    });
  } catch (error) {
    console.error('❌ [Notificaciones] Error:', error);
    res.status(500).json({ error: true, message: 'Error al marcar notificaciones', details: error.message });
  }
});

// DELETE /api/notificaciones/:id - Eliminar una notificación
router.delete('/:id', async (req, res) => {
  try {
    const notificacion = await Notificacion.findById(req.params.id);
    
    if (!notificacion) {
      return res.status(404).json({ error: true, message: 'Notificación no encontrada' });
    }

    // En lugar de eliminar, marcamos como inactiva
    notificacion.activa = false;
    await notificacion.save();

    console.log(`✅ [Notificaciones] Notificación eliminada: ${notificacion._id}`);

    res.json({
      error: false,
      message: 'Notificación eliminada exitosamente'
    });
  } catch (error) {
    console.error('❌ [Notificaciones] Error:', error);
    res.status(500).json({ error: true, message: 'Error al eliminar notificación', details: error.message });
  }
});

// POST /api/notificaciones - Crear una notificación manualmente (para pruebas o admin)
router.post('/', async (req, res) => {
  try {
    const {
      tipo,
      titulo,
      mensaje,
      empleadoId,
      empleadoNombre,
      plantaId,
      fechaEvento,
      rutaDestino,
      parametrosDestino,
      prioridad
    } = req.body;

    if (!tipo || !titulo || !mensaje) {
      return res.status(400).json({
        error: true,
        message: 'Faltan campos requeridos: tipo, titulo, mensaje'
      });
    }

    const notificacion = new Notificacion({
      tipo,
      titulo,
      mensaje,
      empleadoId: empleadoId || null,
      empleadoNombre: empleadoNombre || null,
      plantaId: plantaId || null,
      fechaEvento: fechaEvento ? new Date(fechaEvento) : null,
      rutaDestino: rutaDestino || '/nomina',
      parametrosDestino: parametrosDestino || null,
      prioridad: prioridad || 'media',
      activa: true,
      leida: false
    });

    await notificacion.save();

    console.log(`✅ [Notificaciones] Notificación creada: ${notificacion._id} - ${titulo}`);

    res.status(201).json({
      error: false,
      message: 'Notificación creada exitosamente',
      data: notificacion
    });
  } catch (error) {
    console.error('❌ [Notificaciones] Error:', error);
    res.status(500).json({ error: true, message: 'Error al crear notificación', details: error.message });
  }
});

module.exports = router;

