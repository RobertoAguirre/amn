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
    
    console.log(`📍 [Geocerca] Verificando ubicación ${latitud}, ${longitud} contra ${geocercas.length} geocercas`);
    
    for (const geocerca of geocercas) {
      let dentro = false;
      
      if (geocerca.tipo === 'circulo' && geocerca.centro && geocerca.radio) {
        const distancia = calcularDistancia(
          latitud, longitud, 
          geocerca.centro.lat, geocerca.centro.lng
        );
        dentro = distancia <= geocerca.radio;
        console.log(`📍 [Geocerca] ${geocerca.nombre}: distancia=${distancia.toFixed(1)}m, radio=${geocerca.radio}m, dentro=${dentro}`);
      } else if (geocerca.tipo === 'poligono' && geocerca.coordenadas) {
        dentro = puntoEnPoligono({ lat: latitud, lng: longitud }, geocerca.coordenadas);
        console.log(`📍 [Geocerca] ${geocerca.nombre}: polígono, dentro=${dentro}`);
      }
      
      if (dentro) {
        console.log(`✅ [Geocerca] Dispositivo DENTRO de: ${geocerca.nombre}`);
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
    
    console.log(`❌ [Geocerca] Dispositivo FUERA de todas las geocercas`);
    return { dentro: false, geocerca: null };
  } catch (error) {
    console.error('❌ [Geocerca] Error verificando geocerca:', error);
    return { dentro: false, geocerca: null };
  }
}

// Función para determinar el tipo de evento basado en el historial
async function determinarTipoEvento(empleadoId, plantaId, resultadoGeocerca) {
  try {
    // Buscar el último evento del empleado
    const ultimoEvento = await ChecadorEvento.findOne({ 
      empleadoId: empleadoId 
    }).sort({ fechaHora: -1 });
    
    if (!ultimoEvento) {
      // Primer evento del empleado
      return resultadoGeocerca.dentro ? 'entrada' : 'fuera';
    }
    
    const ultimaPlantaId = ultimoEvento.plantaId;
    const ultimoTipo = ultimoEvento.tipoEvento;
    
    // Si está dentro de una geocerca
    if (resultadoGeocerca.dentro) {
      if (!ultimaPlantaId || ultimaPlantaId !== plantaId) {
        // Cambió de planta o estaba fuera
        return 'entrada';
      } else if (ultimoTipo === 'salida' || ultimoTipo === 'fuera') {
        // Estaba fuera y ahora está dentro
        return 'entrada';
      } else {
        // Ya estaba dentro de la misma planta
        return 'dentro';
      }
    } else {
      // Está fuera de todas las geocercas
      if (ultimaPlantaId && ultimoTipo !== 'salida' && ultimoTipo !== 'fuera') {
        // Estaba dentro de una planta y ahora está fuera
        return 'salida';
      } else {
        // Ya estaba fuera
        return 'fuera';
      }
    }
  } catch (error) {
    console.error('Error determinando tipo de evento:', error);
    return resultadoGeocerca.dentro ? 'entrada' : 'fuera';
  }
}

// POST /api/checador/mvp - Recibe evento de ubicación y guarda en MongoDB
router.post('/mvp', async (req, res) => {
  try {
    const { latitud, longitud, empleadoId, empleadoNombre, tipoEvento } = req.body;
    
    console.log(`📍 [Checador] Evento recibido: ${empleadoNombre} (${empleadoId}) en ${latitud}, ${longitud}`);
    console.log(`📍 [Checador] Precisión GPS: ${req.body.precision || 'N/A'} metros`);
    console.log(`📍 [Checador] Tipo evento original: ${tipoEvento || 'N/A'}`);
    
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
        tipoEventoFinal = await determinarTipoEvento(empleadoId, plantaId, resultadoGeocerca);
      }
    } else {
      // Si está fuera de todas las geocercas
      if (!tipoEvento || tipoEvento === 'ubicacion') {
        tipoEventoFinal = await determinarTipoEvento(empleadoId, null, resultadoGeocerca);
      }
    }

    // Usar hora local de México (UTC-6) con mejor manejo
    let fechaHora;
    if (req.body.fechaHora) {
      fechaHora = new Date(req.body.fechaHora);
      console.log(`🕐 [Checador] Fecha recibida del cliente: ${fechaHora.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}`);
    } else {
      fechaHora = new Date(Date.now() - (6 * 60 * 60 * 1000)); // UTC-6
      console.log(`🕐 [Checador] Fecha generada en servidor: ${fechaHora.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}`);
    }

    const evento = new ChecadorEvento({
      empleadoId,
      empleadoNombre,
      plantaId,
      plantaNombre,
      tipoEvento: tipoEventoFinal,
      fechaHora: fechaHora,
      latitud,
      longitud,
      sincronizado: true
    });
    
    await evento.save();
    
    // Log detallado para depuración
    console.log(`✅ [Checador] Evento guardado:`, {
      empleado: evento.empleadoNombre,
      tipoEvento: evento.tipoEvento,
      planta: evento.plantaNombre || 'N/A',
      ubicacion: `${evento.latitud}, ${evento.longitud}`,
      precision: req.body.precision || 'N/A',
      fechaHora: evento.fechaHora.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }),
      dentroGeocerca: resultadoGeocerca.dentro,
      geocerca: resultadoGeocerca.geocerca?.nombre || 'N/A',
      tipoEventoDeterminado: tipoEventoFinal
    });
    
    res.status(201).json({ 
      error: false, 
      message: 'Evento recibido', 
      data: evento,
      geocerca: resultadoGeocerca.geocerca,
      tipoEventoDeterminado: tipoEventoFinal
    });
  } catch (error) {
    console.error('❌ [Checador] Error al guardar evento:', error);
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