const express = require('express');
const router = express.Router();
const ChecadorEvento = require('../models/ChecadorEvento');
const Geocerca = require('../models/Geocerca');

// Función para calcular distancia entre dos puntos (fórmula de Haversine)
function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distancia en metros
}

// Función para verificar si un punto está dentro de un polígono
function puntoEnPoligono(punto, poligono) {
  const x = punto.lng;
  const y = punto.lat;
  let dentro = false;

  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const xi = poligono[i].lng;
    const yi = poligono[i].lat;
    const xj = poligono[j].lng;
    const yj = poligono[j].lat;

    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      dentro = !dentro;
    }
  }
  return dentro;
}

// Función para verificar si un punto está dentro de una geocerca
async function verificarGeocerca(latitud, longitud) {
  try {
    const geocercas = await Geocerca.find();
    
    for (const geocerca of geocercas) {
      let dentro = false;
      
      if (geocerca.tipo === 'circulo' && geocerca.centro && geocerca.radio) {
        const distancia = calcularDistancia(
          latitud, longitud, 
          geocerca.centro.lat, geocerca.centro.lng
        );
        dentro = distancia <= geocerca.radio;
      } else if (geocerca.tipo === 'poligono' && geocerca.coordenadas) {
        dentro = puntoEnPoligono({ lat: latitud, lng: longitud }, geocerca.coordenadas);
      }
      
      if (dentro) {
        return {
          dentro: true,
          geocerca: {
            id: geocerca._id,
            nombre: geocerca.nombre,
            plantaId: geocerca.plantaId,
            tipo: geocerca.tipo
          }
        };
      }
    }
    
    return { dentro: false, geocerca: null };
  } catch (error) {
    console.error('Error verificando geocerca:', error);
    return { dentro: false, geocerca: null };
  }
}

// POST /api/checador/mvp - Recibe evento de ubicación y guarda en MongoDB
router.post('/mvp', async (req, res) => {
  try {
    const { latitud, longitud, empleadoId, empleadoNombre, tipoEvento } = req.body;
    
    // Verificar si está dentro de alguna geocerca
    const resultadoGeocerca = await verificarGeocerca(latitud, longitud);
    
    // Determinar el tipo de evento basado en la geocerca
    let tipoEventoFinal = tipoEvento;
    let plantaId = req.body.plantaId || null;
    let plantaNombre = req.body.plantaNombre || null;
    
    if (resultadoGeocerca.dentro) {
      plantaId = resultadoGeocerca.geocerca.plantaId;
      plantaNombre = resultadoGeocerca.geocerca.nombre;
      
      // Si no se especificó un tipo de evento, determinar automáticamente
      if (!tipoEvento || tipoEvento === 'ubicacion') {
        // Buscar el último evento del empleado para determinar si es entrada o salida
        const ultimoEvento = await ChecadorEvento.findOne({ 
          empleadoId: empleadoId 
        }).sort({ fechaHora: -1 });
        
        if (!ultimoEvento || !ultimoEvento.plantaId || ultimoEvento.plantaId !== plantaId) {
          tipoEventoFinal = 'entrada';
        } else {
          tipoEventoFinal = 'dentro';
        }
      }
    } else {
      // Si está fuera de todas las geocercas
      if (!tipoEvento || tipoEvento === 'ubicacion') {
        // Buscar el último evento del empleado
        const ultimoEvento = await ChecadorEvento.findOne({ 
          empleadoId: empleadoId 
        }).sort({ fechaHora: -1 });
        
        if (ultimoEvento && ultimoEvento.plantaId) {
          tipoEventoFinal = 'salida';
        } else {
          tipoEventoFinal = 'fuera';
        }
      }
    }

    const evento = new ChecadorEvento({
      empleadoId,
      empleadoNombre,
      plantaId,
      plantaNombre,
      tipoEvento: tipoEventoFinal,
      fechaHora: req.body.fechaHora ? new Date(req.body.fechaHora) : new Date(),
      latitud,
      longitud,
      sincronizado: true
    });
    
    await evento.save();
    
    // Log para depuración
    console.log('[Checador] Evento guardado en MongoDB:', {
      empleadoNombre: evento.empleadoNombre,
      tipoEvento: evento.tipoEvento,
      plantaNombre: evento.plantaNombre,
      latitud: evento.latitud,
      longitud: evento.longitud,
      dentroGeocerca: resultadoGeocerca.dentro
    });
    
    res.status(201).json({ 
      error: false, 
      message: 'Evento recibido', 
      data: evento,
      geocerca: resultadoGeocerca.geocerca
    });
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

// GET /api/checador/eventos-geocerca - Eventos específicos de entrada/salida de geocercas
router.get('/eventos-geocerca', async (req, res) => {
  try {
    const { fecha, empleadoId, plantaId } = req.query;
    let filtro = {
      tipoEvento: { $in: ['entrada', 'salida'] }
    };
    
    if (fecha) {
      const fechaInicio = new Date(fecha);
      const fechaFin = new Date(fecha);
      fechaFin.setDate(fechaFin.getDate() + 1);
      filtro.fechaHora = { $gte: fechaInicio, $lt: fechaFin };
    }
    
    if (empleadoId) {
      filtro.empleadoId = empleadoId;
    }
    
    if (plantaId) {
      filtro.plantaId = plantaId;
    }
    
    const eventos = await ChecadorEvento.find(filtro).sort({ fechaHora: -1 });
    res.json({ error: false, data: eventos });
  } catch (error) {
    res.status(500).json({ error: true, message: 'Error al obtener eventos de geocerca', details: error.message });
  }
});

// GET /api/checador/estadisticas - Estadísticas de eventos
router.get('/estadisticas', async (req, res) => {
  try {
    const { fecha } = req.query;
    let filtroFecha = {};
    
    if (fecha) {
      const fechaInicio = new Date(fecha);
      const fechaFin = new Date(fecha);
      fechaFin.setDate(fechaFin.getDate() + 1);
      filtroFecha = { fechaHora: { $gte: fechaInicio, $lt: fechaFin } };
    }
    
    const totalEventos = await ChecadorEvento.countDocuments(filtroFecha);
    const entradas = await ChecadorEvento.countDocuments({ ...filtroFecha, tipoEvento: 'entrada' });
    const salidas = await ChecadorEvento.countDocuments({ ...filtroFecha, tipoEvento: 'salida' });
    const dispositivosUnicos = await ChecadorEvento.distinct('empleadoId', filtroFecha);
    
    res.json({
      error: false,
      data: {
        totalEventos,
        entradas,
        salidas,
        dispositivosActivos: dispositivosUnicos.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: true, message: 'Error al obtener estadísticas', details: error.message });
  }
});

module.exports = router; 