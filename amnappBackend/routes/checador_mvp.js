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

    // Usar hora local de México
    let fechaHora;
    if (req.body.fechaHora) {
      fechaHora = new Date(req.body.fechaHora);
      console.log(`🕐 [Checador] Fecha recibida del cliente: ${fechaHora.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}`);
    } else {
      // Crear fecha en zona horaria de México y convertir a UTC para MongoDB
      const ahora = new Date();
      const horaMexico = new Date(ahora.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
      fechaHora = new Date(horaMexico.getTime() + (6 * 60 * 60 * 1000)); // Ajustar a UTC
      console.log(`🕐 [Checador] Fecha generada en servidor (México): ${ahora.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}`);
      console.log(`🕐 [Checador] Fecha guardada en BD (UTC): ${fechaHora.toISOString()}`);
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
    console.log(`📊 [Checador] Total eventos en BD: ${eventos.length}`);
    if (eventos.length > 0) {
      console.log(`📊 [Checador] Último evento: ${eventos[0].empleadoNombre} - ${eventos[0].tipoEvento} - ${eventos[0].fechaHora}`);
    }
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
    const { fecha, fechaInicio, fechaFin } = req.query;
    let filtroFecha = {};
    
    if (fecha) {
      // Filtro por fecha específica
      const fechaInicio = new Date(fecha);
      const fechaFin = new Date(fecha);
      fechaFin.setDate(fechaFin.getDate() + 1);
      filtroFecha = { fechaHora: { $gte: fechaInicio, $lt: fechaFin } };
    } else if (fechaInicio || fechaFin) {
      // Filtro por rango de fechas
      filtroFecha.fechaHora = {};
      if (fechaInicio) {
        filtroFecha.fechaHora.$gte = new Date(fechaInicio);
      }
      if (fechaFin) {
        const fechaFinAjustada = new Date(fechaFin);
        fechaFinAjustada.setDate(fechaFinAjustada.getDate() + 1);
        filtroFecha.fechaHora.$lt = fechaFinAjustada;
      }
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

// GET /api/checador/dispositivos-activos - Obtener dispositivos activos con última ubicación
router.get('/dispositivos-activos', async (req, res) => {
  try {
    // Obtener la última ubicación de cada dispositivo
    const dispositivos = await ChecadorEvento.aggregate([
      {
        $sort: { fechaHora: -1 }
      },
      {
        $group: {
          _id: '$empleadoId',
          empleadoId: { $first: '$empleadoId' },
          empleadoNombre: { $first: '$empleadoNombre' },
          ultimaUbicacion: { $first: '$$ROOT' },
          totalEventos: { $sum: 1 }
        }
      },
      {
        $sort: { 'ultimaUbicacion.fechaHora': -1 }
      }
    ]);

    // Enriquecer con información de estado actual
    const dispositivosEnriquecidos = dispositivos.map(dispositivo => {
      const ultimoEvento = dispositivo.ultimaUbicacion;
      let estadoActual = 'fuera';
      
      if (ultimoEvento.tipoEvento === 'entrada' || ultimoEvento.tipoEvento === 'dentro') {
        estadoActual = 'dentro';
      } else if (ultimoEvento.tipoEvento === 'salida' || ultimoEvento.tipoEvento === 'fuera') {
        estadoActual = 'fuera';
      }

      return {
        ...dispositivo,
        estadoActual,
        ultimaUbicacion: {
          latitud: ultimoEvento.latitud,
          longitud: ultimoEvento.longitud,
          fechaHora: ultimoEvento.fechaHora,
          tipoEvento: ultimoEvento.tipoEvento,
          plantaId: ultimoEvento.plantaId,
          plantaNombre: ultimoEvento.plantaNombre
        }
      };
    });

    res.json({
      error: false,
      data: dispositivosEnriquecidos
    });
  } catch (error) {
    res.status(500).json({ error: true, message: 'Error al obtener dispositivos activos', details: error.message });
  }
});

// GET /api/checador/eventos-filtrados - Eventos con filtros avanzados
router.get('/eventos-filtrados', async (req, res) => {
  try {
    const { 
      fechaInicio, 
      fechaFin, 
      empleadoId, 
      empleadoNombre, 
      plantaId, 
      tipoEvento,
      limit = 100,
      skip = 0
    } = req.query;

    let filtro = {};

    // Filtro por rango de fechas
    if (fechaInicio || fechaFin) {
      filtro.fechaHora = {};
      if (fechaInicio) {
        filtro.fechaHora.$gte = new Date(fechaInicio);
      }
      if (fechaFin) {
        const fechaFinAjustada = new Date(fechaFin);
        fechaFinAjustada.setDate(fechaFinAjustada.getDate() + 1);
        filtro.fechaHora.$lt = fechaFinAjustada;
      }
    }

    // Filtro por empleado
    if (empleadoId) {
      filtro.empleadoId = empleadoId;
    }

    if (empleadoNombre) {
      filtro.empleadoNombre = { $regex: empleadoNombre, $options: 'i' };
    }

    // Filtro por planta
    if (plantaId) {
      filtro.plantaId = plantaId;
    }

    // Filtro por tipo de evento
    if (tipoEvento) {
      if (Array.isArray(tipoEvento)) {
        filtro.tipoEvento = { $in: tipoEvento };
      } else {
        filtro.tipoEvento = tipoEvento;
      }
    }

    const eventos = await ChecadorEvento.find(filtro)
      .sort({ fechaHora: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await ChecadorEvento.countDocuments(filtro);

    res.json({
      error: false,
      data: eventos,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });
  } catch (error) {
    res.status(500).json({ error: true, message: 'Error al obtener eventos filtrados', details: error.message });
  }
});

// GET /api/checador/reporte-nomina - Reporte de tiempo trabajado para nómina
router.get('/reporte-nomina', async (req, res) => {
  try {
    const { 
      fechaInicio, 
      fechaFin, 
      empleadoId, 
      empleadoNombre 
    } = req.query;

    console.log('📊 [Nómina] Solicitud recibida:', { fechaInicio, fechaFin, empleadoId, empleadoNombre });

    let filtro = {};

    // Filtro por rango de fechas (obligatorio)
    if (!fechaInicio || !fechaFin) {
      console.log('❌ [Nómina] Fechas faltantes');
      return res.status(400).json({ 
        error: true, 
        message: 'Se requieren fechaInicio y fechaFin' 
      });
    }

    filtro.fechaHora = {
      $gte: new Date(fechaInicio),
      $lt: new Date(new Date(fechaFin).setDate(new Date(fechaFin).getDate() + 1))
    };

    // Filtro por empleado
    if (empleadoId) {
      filtro.empleadoId = empleadoId;
    }

    if (empleadoNombre) {
      filtro.empleadoNombre = { $regex: empleadoNombre, $options: 'i' };
    }

    console.log('📊 [Nómina] Filtro final:', JSON.stringify(filtro, null, 2));

    // Obtener TODOS los eventos del período (sin filtrar por tipo)
    const eventos = await ChecadorEvento.find(filtro).sort({ fechaHora: 1 });

    console.log('📊 [Nómina] Eventos encontrados:', eventos.length);

    // Agrupar por empleado
    const reportePorEmpleado = new Map();

    eventos.forEach(evento => {
      if (!reportePorEmpleado.has(evento.empleadoId)) {
        reportePorEmpleado.set(evento.empleadoId, {
          empleadoId: evento.empleadoId,
          empleadoNombre: evento.empleadoNombre,
          eventos: [],
          tiempoEnGeocerca: 0, // en minutos
          tiempoComida: 0,     // en minutos
          estadoActual: 'fuera'
        });
      }

      const reporte = reportePorEmpleado.get(evento.empleadoId);
      reporte.eventos.push(evento);

      // Determinar estado actual basado en el último evento
      if (evento.tipoEvento === 'entrada' || evento.tipoEvento === 'dentro') {
        reporte.estadoActual = 'dentro';
      } else if (evento.tipoEvento === 'salida' || evento.tipoEvento === 'fuera') {
        reporte.estadoActual = 'fuera';
      }
    });

    // Calcular tiempos para cada empleado
    const reporteFinal = Array.from(reportePorEmpleado.values()).map(reporte => {
      let tiempoEnGeocerca = 0;
      let tiempoComida = 0;
      let inicioComida = null;

      // Recorrer eventos en orden cronológico
      for (let i = 0; i < reporte.eventos.length; i++) {
        const evento = reporte.eventos[i];
        const fechaEvento = new Date(evento.fechaHora);

        switch (evento.tipoEvento) {
          case 'entrada':
            // Buscar la siguiente salida
            for (let j = i + 1; j < reporte.eventos.length; j++) {
              const siguienteEvento = reporte.eventos[j];
              if (siguienteEvento.tipoEvento === 'salida') {
                const tiempoEnPlanta = (new Date(siguienteEvento.fechaHora) - fechaEvento) / (1000 * 60);
                tiempoEnGeocerca += tiempoEnPlanta;
                break;
              }
            }
            break;

          case 'comida':
            inicioComida = fechaEvento;
            break;

          case 'reanudar_trabajo':
            if (inicioComida) {
              const tiempoComidaPeriodo = (fechaEvento - inicioComida) / (1000 * 60);
              tiempoComida += tiempoComidaPeriodo;
              inicioComida = null;
            }
            break;
        }
      }

      return {
        ...reporte,
        tiempoEnGeocercaHoras: Math.round((tiempoEnGeocerca / 60) * 100) / 100,
        tiempoComidaHoras: Math.round((tiempoComida / 60) * 100) / 100,
        tiempoEfectivoHoras: Math.round(((tiempoEnGeocerca - tiempoComida) / 60) * 100) / 100
      };
    });

    console.log('✅ [Nómina] Reporte generado exitosamente');

    res.json({
      error: false,
      data: reporteFinal,
      total: reporteFinal.length
    });
  } catch (error) {
    console.error('❌ [Nómina] Error:', error);
    res.status(500).json({ error: true, message: 'Error al generar reporte de nómina', details: error.message });
  }
});

// GET /api/checador/test - Endpoint de prueba para verificar datos
router.get('/test', async (req, res) => {
  try {
    const totalEventos = await ChecadorEvento.countDocuments();
    const eventosRecientes = await ChecadorEvento.find()
      .sort({ fechaHora: -1 })
      .limit(5);
    
    const tiposEventos = await ChecadorEvento.distinct('tipoEvento');
    const empleados = await ChecadorEvento.distinct('empleadoNombre');
    
    res.json({
      error: false,
      data: {
        totalEventos,
        tiposEventos,
        empleados,
        eventosRecientes: eventosRecientes.map(e => ({
          empleado: e.empleadoNombre,
          tipo: e.tipoEvento,
          fecha: e.fechaHora,
          planta: e.plantaNombre
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ error: true, message: 'Error en test', details: error.message });
  }
});

// GET /api/checador/empleados - Obtener lista de empleados para el dropdown
router.get('/empleados', async (req, res) => {
  try {
    console.log('👥 [Empleados] Obteniendo lista de empleados...');
    
    const empleados = await ChecadorEvento.aggregate([
      {
        $group: {
          _id: '$empleadoId',
          empleadoNombre: { $first: '$empleadoNombre' },
          ultimoEvento: { $max: '$fechaHora' }
        }
      },
      {
        $sort: { empleadoNombre: 1 }
      }
    ]);
    
    console.log(`✅ [Empleados] ${empleados.length} empleados encontrados`);
    
    res.json({
      error: false,
      data: empleados.map(emp => ({
        empleadoId: emp._id,
        empleadoNombre: emp.empleadoNombre,
        ultimoEvento: emp.ultimoEvento
      }))
    });
  } catch (error) {
    console.error('❌ [Empleados] Error:', error);
    res.status(500).json({ error: true, message: 'Error al obtener empleados', details: error.message });
  }
});

// GET /api/checador/historial-movimiento - Obtener historial de movimiento de un empleado
router.get('/historial-movimiento', async (req, res) => {
  try {
    const { empleadoId, fechaInicio, fechaFin } = req.query;
    
    console.log('🗺️ [Historial] Obteniendo historial de movimiento:', { empleadoId, fechaInicio, fechaFin });
    
    if (!empleadoId || !fechaInicio || !fechaFin) {
      return res.status(400).json({
        error: true,
        message: 'Se requieren empleadoId, fechaInicio y fechaFin'
      });
    }
    
    const filtro = {
      empleadoId: empleadoId,
      fechaHora: {
        $gte: new Date(fechaInicio),
        $lt: new Date(new Date(fechaFin).setDate(new Date(fechaFin).getDate() + 1))
      }
    };
    
    console.log('🔍 [Historial] Filtro aplicado:', JSON.stringify(filtro, null, 2));
    
    const eventos = await ChecadorEvento.find(filtro)
      .sort({ fechaHora: 1 })
      .select('fechaHora latitud longitud tipoEvento plantaNombre empleadoNombre');
    
    console.log(`✅ [Historial] ${eventos.length} eventos encontrados para el empleado`);
    
    // Mapear eventos con colores según tipo
    const eventosConColores = eventos.map(evento => {
      let color = '#666666'; // Color por defecto (gris)
      let icono = '📍';
      const tipoEvento = evento.tipoEvento;
      
      if (tipoEvento === 'entrada' || tipoEvento === 'Inicio de trabajo') {
        color = '#28a745'; // Verde
        icono = '🟢';
      } else if (tipoEvento === 'salida' || tipoEvento === 'Cierre') {
        color = '#dc3545'; // Rojo
        icono = '🔴';
      } else if (tipoEvento === 'Comida') {
        color = '#ffc107'; // Amarillo
        icono = '🍽️';
      } else if (tipoEvento === 'reanudar_trabajo' || tipoEvento === 'Reanudar trabajo') {
        color = '#17a2b8'; // Azul
        icono = '⏰';
      } else if (tipoEvento === 'dentro') {
        color = '#6f42c1'; // Púrpura
        icono = '🟣';
      } else if (tipoEvento === 'fuera') {
        color = '#fd7e14'; // Naranja
        icono = '🟠';
      } else if (tipoEvento === 'Ubicación automática') {
        color = '#6c757d'; // Gris
        icono = '📍';
      }
      
      return {
        fechaHora: evento.fechaHora,
        latitud: evento.latitud,
        longitud: evento.longitud,
        tipoEvento: evento.tipoEvento,
        plantaNombre: evento.plantaNombre,
        empleadoNombre: evento.empleadoNombre,
        color: color,
        icono: icono,
        popup: `${icono} ${evento.tipoEvento.toUpperCase()}<br>${evento.plantaNombre || 'Sin planta'}<br>${new Date(evento.fechaHora).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}`
      };
    });
    
    res.json({
      error: false,
      data: eventosConColores,
      total: eventosConColores.length,
      empleado: eventos.length > 0 ? eventos[0].empleadoNombre : 'Desconocido'
    });
  } catch (error) {
    console.error('❌ [Historial] Error:', error);
    res.status(500).json({ error: true, message: 'Error al obtener historial de movimiento', details: error.message });
  }
});

// DELETE /api/checador/limpiar-empleado - Eliminar todos los eventos de un empleado específico
router.delete('/limpiar-empleado/:empleadoId', async (req, res) => {
  try {
    const { empleadoId } = req.params;
    
    console.log(`🗑️ [Limpiar] Eliminando todos los eventos del empleado ${empleadoId}...`);
    
    const resultado = await ChecadorEvento.deleteMany({ empleadoId: empleadoId });
    
    console.log(`✅ [Limpiar] ${resultado.deletedCount} eventos eliminados del empleado ${empleadoId}`);
    
    res.json({
      error: false,
      message: `${resultado.deletedCount} eventos eliminados del empleado ${empleadoId}`,
      deletedCount: resultado.deletedCount
    });
  } catch (error) {
    console.error('❌ [Limpiar] Error:', error);
    res.status(500).json({ error: true, message: 'Error al eliminar eventos', details: error.message });
  }
});

module.exports = router; 