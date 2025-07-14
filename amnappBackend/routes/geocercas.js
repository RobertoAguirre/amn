const express = require('express');
const router = express.Router();
const Geocerca = require('../models/Geocerca');

// POST /api/geocercas - Crear geocerca
router.post('/', async (req, res) => {
  try {
    const geocerca = new Geocerca(req.body);
    await geocerca.save();
    res.status(201).json({ error: false, message: 'Geocerca guardada', data: geocerca });
  } catch (error) {
    res.status(500).json({ error: true, message: 'Error al guardar geocerca', details: error.message });
  }
});

// GET /api/geocercas - Listar todas las geocercas
router.get('/', async (req, res) => {
  try {
    const geocercas = await Geocerca.find().sort({ createdAt: -1 });
    res.json({ error: false, data: geocercas });
  } catch (error) {
    res.status(500).json({ error: true, message: 'Error al obtener geocercas', details: error.message });
  }
});

module.exports = router; 