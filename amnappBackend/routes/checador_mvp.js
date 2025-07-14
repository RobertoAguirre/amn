const express = require('express');
const router = express.Router();
const ChecadorEvento = require('../models/ChecadorEvento');

// POST /api/checador/mvp - Recibe evento de ubicación y guarda en MongoDB
router.post('/mvp', async (req, res) => {
  try {
    const evento = new ChecadorEvento({
      ...req.body,
      fechaHora: req.body.fechaHora ? new Date(req.body.fechaHora) : new Date(),
      sincronizado: true
    });
    await evento.save();
    // Log para depuración
    console.log('[Checador] Evento guardado en MongoDB:', {
      empleadoNombre: evento.empleadoNombre,
      tipoEvento: evento.tipoEvento,
      latitud: evento.latitud,
      longitud: evento.longitud
    });
    res.status(201).json({ error: false, message: 'Evento recibido', data: evento });
  } catch (error) {
    res.status(500).json({ error: true, message: 'Error al guardar evento', details: error.message });
  }
});

// GET /api/checador/mvp - Devuelve todos los eventos desde MongoDB
router.get('/mvp', async (req, res) => {
  try {
    const eventos = await ChecadorEvento.find().sort({ fechaHora: -1 });
    res.json({ error: false, data: eventos });
  } catch (error) {
    res.status(500).json({ error: true, message: 'Error al obtener eventos', details: error.message });
  }
});

module.exports = router; 