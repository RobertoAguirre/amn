const express = require('express');
const router = express.Router();
const ChecadorEvento = require('../models/ChecadorEvento');
const Geocerca = require('../models/Geocerca');
const HorarioLaboral = require('../models/HorarioLaboral');
const ReglaNomina = require('../models/ReglaNomina');
const { generarNotificacionesAsistencia } = require('../utils/generarNotificaciones');

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

// Función auxiliar para obtener horario laboral de un empleado
async function obtenerHorarioLaboral(empleadoId, plantaId) {
  // Buscar horario específico del empleado
  let horario = await HorarioLaboral.findOne({
    empleadoId: empleadoId,
    plantaId: plantaId,
    activo: true
  });

  // Si no tiene horario específico, buscar horario general de la planta
  if (!horario) {
    horario = await HorarioLaboral.findOne({
      empleadoId: null,
      plantaId: plantaId,
      activo: true
    });
  }

  return horario;
}

// Función para calcular minutos de diferencia entre dos horas
function calcularMinutosDiferencia(hora1, hora2) {
  if (!hora1 || !hora2) return 0;
  const partes1 = hora1.split(':');
  const partes2 = hora2.split(':');
  if (partes1.length !== 2 || partes2.length !== 2) return 0;
  const [h1, m1] = partes1.map(Number);
  const [h2, m2] = partes2.map(Number);
  if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 0;
  return (h2 * 60 + m2) - (h1 * 60 + m1);
}

// Función para verificar si un día es laborable según el horario
function esDiaLaborable(fecha, horario) {
  if (!horario || !horario.diasLaborables || !Array.isArray(horario.diasLaborables)) {
    return false;
  }
  const diaSemana = fecha.getDay(); // 0=Domingo, 1=Lunes, etc.
  return horario.diasLaborables.includes(diaSemana);
}

// Función para obtener fecha en formato YYYY-MM-DD
function obtenerFechaString(fecha) {
  return fecha.toISOString().split('T')[0];
}

// GET /api/checador/reporte-nomina - Reporte de tiempo trabajado para nómina con comparación de horarios
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

    const fechaInicioDate = new Date(fechaInicio);
    const fechaFinDate = new Date(fechaFin);
    fechaFinDate.setDate(fechaFinDate.getDate() + 1); // Incluir el día completo

    filtro.fechaHora = {
      $gte: fechaInicioDate,
      $lt: fechaFinDate
    };

    // Filtro por empleado
    if (empleadoId) {
      filtro.empleadoId = empleadoId;
    }

    if (empleadoNombre) {
      filtro.empleadoNombre = { $regex: empleadoNombre, $options: 'i' };
    }

    console.log('📊 [Nómina] Filtro final:', JSON.stringify(filtro, null, 2));

    // Obtener TODOS los eventos del período
    const eventos = await ChecadorEvento.find(filtro).sort({ fechaHora: 1 });
    console.log('📊 [Nómina] Eventos encontrados:', eventos.length);

    // Agrupar por empleado
    const reportePorEmpleado = new Map();

    eventos.forEach(evento => {
      if (!reportePorEmpleado.has(evento.empleadoId)) {
        reportePorEmpleado.set(evento.empleadoId, {
          empleadoId: evento.empleadoId,
          empleadoNombre: evento.empleadoNombre,
          plantaId: evento.plantaId,
          eventos: [],
          dias: new Map() // Agrupar eventos por día
        });
      }

      const reporte = reportePorEmpleado.get(evento.empleadoId);
      reporte.eventos.push(evento);

      // Agrupar por día
      const fechaEvento = new Date(evento.fechaHora);
      const fechaString = obtenerFechaString(fechaEvento);
      
      if (!reporte.dias.has(fechaString)) {
        reporte.dias.set(fechaString, {
          fecha: fechaString,
          eventos: [],
          entrada: null,
          salida: null,
          tiempoEnGeocerca: 0,
          tiempoComida: 0
        });
      }

      const dia = reporte.dias.get(fechaString);
      dia.eventos.push(evento);

      // Identificar entrada y salida
      if (evento.tipoEvento === 'entrada' && !dia.entrada) {
        dia.entrada = fechaEvento;
      }
      if (evento.tipoEvento === 'salida') {
        dia.salida = fechaEvento;
      }
    });

    // Calcular tiempos y comparar con horarios esperados
    const reporteFinal = await Promise.all(
      Array.from(reportePorEmpleado.values()).map(async (reporte) => {
        // Obtener horario laboral del empleado
        const horario = await obtenerHorarioLaboral(reporte.empleadoId, reporte.plantaId);

        let tiempoEnGeocercaTotal = 0; // en minutos
        let tiempoComidaTotal = 0;
        let tiempoEsperadoTotal = 0;
        let diasTrabajados = 0;
        let diasFaltados = 0;
        let tardanzas = 0;
        let salidasTempranas = 0;
        let horasExtra = 0; // en minutos
        let minutosTardanzaTotal = 0;
        let minutosSalidaTempranaTotal = 0;

        // Procesar cada día
        for (const [fechaString, dia] of reporte.dias.entries()) {
          const fechaDia = new Date(fechaString);
          
          // Si hay horario, verificar si es día laborable
          if (horario && esDiaLaborable(fechaDia, horario)) {
            const horasEsperadas = horario.horasEsperadasPorDia || 8;
            tiempoEsperadoTotal += horasEsperadas * 60; // Convertir a minutos

            // Calcular tiempo trabajado del día
            let tiempoEnGeocercaDia = 0;
            let tiempoComidaDia = 0;
            let inicioComida = null;
            let dentroGeocerca = false;
            let horaInicioPeriodo = null;

            // Recorrer eventos del día en orden cronológico
            for (let i = 0; i < dia.eventos.length; i++) {
              const evento = dia.eventos[i];
              const fechaEvento = new Date(evento.fechaHora);

              switch (evento.tipoEvento) {
                case 'entrada':
                  // Entrada: iniciar período de trabajo
                  if (!dentroGeocerca) {
                    dentroGeocerca = true;
                    horaInicioPeriodo = fechaEvento;
                  }
                  break;

                case 'dentro':
                  // Evento 'dentro' (ya estaba dentro, solo confirmación)
                  // No iniciar nuevo período si ya está dentro
                  if (!dentroGeocerca) {
                    dentroGeocerca = true;
                    horaInicioPeriodo = fechaEvento;
                  }
                  break;

                case 'salida':
                  // Salida: cerrar período de trabajo y sumar tiempo
                  if (dentroGeocerca && horaInicioPeriodo) {
                    const tiempoPeriodo = (fechaEvento - horaInicioPeriodo) / (1000 * 60);
                    tiempoEnGeocercaDia += tiempoPeriodo;
                    dentroGeocerca = false;
                    horaInicioPeriodo = null;
                  }
                  break;

                case 'fuera':
                  // Evento 'fuera' (ya estaba fuera, solo confirmación)
                  // Cerrar período si estaba dentro
                  if (dentroGeocerca && horaInicioPeriodo) {
                    const tiempoPeriodo = (fechaEvento - horaInicioPeriodo) / (1000 * 60);
                    tiempoEnGeocercaDia += tiempoPeriodo;
                    dentroGeocerca = false;
                    horaInicioPeriodo = null;
                  }
                  break;

                case 'comida':
                  // Inicio de comida: pausar trabajo si está dentro
                  if (dentroGeocerca && horaInicioPeriodo) {
                    // Cerrar período de trabajo antes de comida
                    const tiempoPeriodo = (fechaEvento - horaInicioPeriodo) / (1000 * 60);
                    tiempoEnGeocercaDia += tiempoPeriodo;
                    dentroGeocerca = false;
                    horaInicioPeriodo = null;
                  }
                  inicioComida = fechaEvento;
                  break;

                case 'reanudar_trabajo':
                  // Reanudar trabajo después de comida
                  if (inicioComida) {
                    const tiempoComidaPeriodo = (fechaEvento - inicioComida) / (1000 * 60);
                    tiempoComidaDia += tiempoComidaPeriodo;
                    inicioComida = null;
                  }
                  // Reiniciar período de trabajo
                  if (!dentroGeocerca) {
                    dentroGeocerca = true;
                    horaInicioPeriodo = fechaEvento;
                  }
                  break;
              }
            }

            // Si el día termina y el empleado sigue dentro, cerrar el período
            // Usar el último evento del día como fin del período
            if (dentroGeocerca && horaInicioPeriodo && dia.eventos.length > 0) {
              const ultimoEvento = dia.eventos[dia.eventos.length - 1];
              const fechaUltimoEvento = new Date(ultimoEvento.fechaHora);
              const tiempoPeriodo = (fechaUltimoEvento - horaInicioPeriodo) / (1000 * 60);
              tiempoEnGeocercaDia += tiempoPeriodo;
            }

            tiempoEnGeocercaTotal += tiempoEnGeocercaDia;
            tiempoComidaTotal += tiempoComidaDia;

            // Comparar con horario esperado
            if (dia.entrada && horario.horaEntrada) {
              diasTrabajados++;
              
              // Calcular hora esperada de entrada
              const [horaEntradaEsperada, minutoEntradaEsperado] = horario.horaEntrada.split(':').map(Number);
              if (!isNaN(horaEntradaEsperada) && !isNaN(minutoEntradaEsperado)) {
                const horaEntradaEsperadaDate = new Date(fechaDia);
                horaEntradaEsperadaDate.setHours(horaEntradaEsperada, minutoEntradaEsperado, 0, 0);

                // Calcular tardanza
                const minutosTardanza = (dia.entrada - horaEntradaEsperadaDate) / (1000 * 60);
                const tolerancia = horario.toleranciaEntrada || 15;
                if (minutosTardanza > tolerancia) {
                  tardanzas++;
                  minutosTardanzaTotal += minutosTardanza - tolerancia;
                  
                  // Generar notificación de tardanza
                  generarNotificacionesAsistencia(
                    reporte.empleadoId,
                    reporte.empleadoNombre,
                    reporte.plantaId,
                    fechaDia,
                    'tardanza',
                    { minutosTardanza: Math.round(minutosTardanza - tolerancia) }
                  ).catch(err => console.error('Error generando notificación de tardanza:', err));
                }
              }

              // Calcular salida temprana
              if (dia.salida && horario.horaSalida) {
                const [horaSalidaEsperada, minutoSalidaEsperado] = horario.horaSalida.split(':').map(Number);
                if (!isNaN(horaSalidaEsperada) && !isNaN(minutoSalidaEsperado)) {
                  const horaSalidaEsperadaDate = new Date(fechaDia);
                  horaSalidaEsperadaDate.setHours(horaSalidaEsperada, minutoSalidaEsperado, 0, 0);

                  const minutosSalidaTemprana = (horaSalidaEsperadaDate - dia.salida) / (1000 * 60);
                  if (minutosSalidaTemprana > 0) {
                    salidasTempranas++;
                    minutosSalidaTempranaTotal += minutosSalidaTemprana;
                    
                    // Generar notificación de salida temprana
                    generarNotificacionesAsistencia(
                      reporte.empleadoId,
                      reporte.empleadoNombre,
                      reporte.plantaId,
                      fechaDia,
                      'salida_temprana',
                      { minutosAntes: Math.round(minutosSalidaTemprana) }
                    ).catch(err => console.error('Error generando notificación de salida temprana:', err));
                  }
                }
              }

              // Calcular horas extra (tiempo trabajado > tiempo esperado)
              const tiempoEfectivoDia = tiempoEnGeocercaDia - tiempoComidaDia;
              const horasEsperadas = horario.horasEsperadasPorDia || 8;
              const tiempoEsperadoDia = horasEsperadas * 60;
              if (tiempoEfectivoDia > tiempoEsperadoDia) {
                horasExtra += tiempoEfectivoDia - tiempoEsperadoDia;
              }
            } else {
              // No hubo entrada, es falta
              diasFaltados++;
              
              // Generar notificación de falta
              generarNotificacionesAsistencia(
                reporte.empleadoId,
                reporte.empleadoNombre,
                reporte.plantaId,
                fechaDia,
                'falta',
                {}
              ).catch(err => console.error('Error generando notificación de falta:', err));
            }
          } else if (!horario) {
            // Si no hay horario configurado, solo calcular tiempos reales (compatibilidad)
            let tiempoEnGeocercaDia = 0;
            let tiempoComidaDia = 0;
            let inicioComida = null;
            let dentroGeocerca = false;
            let horaInicioPeriodo = null;

            for (let i = 0; i < dia.eventos.length; i++) {
              const evento = dia.eventos[i];
              const fechaEvento = new Date(evento.fechaHora);

              switch (evento.tipoEvento) {
                case 'entrada':
                  if (!dentroGeocerca) {
                    dentroGeocerca = true;
                    horaInicioPeriodo = fechaEvento;
                  }
                  break;

                case 'dentro':
                  if (!dentroGeocerca) {
                    dentroGeocerca = true;
                    horaInicioPeriodo = fechaEvento;
                  }
                  break;

                case 'salida':
                  if (dentroGeocerca && horaInicioPeriodo) {
                    const tiempoPeriodo = (fechaEvento - horaInicioPeriodo) / (1000 * 60);
                    tiempoEnGeocercaDia += tiempoPeriodo;
                    dentroGeocerca = false;
                    horaInicioPeriodo = null;
                  }
                  break;

                case 'fuera':
                  if (dentroGeocerca && horaInicioPeriodo) {
                    const tiempoPeriodo = (fechaEvento - horaInicioPeriodo) / (1000 * 60);
                    tiempoEnGeocercaDia += tiempoPeriodo;
                    dentroGeocerca = false;
                    horaInicioPeriodo = null;
                  }
                  break;

                case 'comida':
                  if (dentroGeocerca && horaInicioPeriodo) {
                    const tiempoPeriodo = (fechaEvento - horaInicioPeriodo) / (1000 * 60);
                    tiempoEnGeocercaDia += tiempoPeriodo;
                    dentroGeocerca = false;
                    horaInicioPeriodo = null;
                  }
                  inicioComida = fechaEvento;
                  break;

                case 'reanudar_trabajo':
                  if (inicioComida) {
                    const tiempoComidaPeriodo = (fechaEvento - inicioComida) / (1000 * 60);
                    tiempoComidaDia += tiempoComidaPeriodo;
                    inicioComida = null;
                  }
                  if (!dentroGeocerca) {
                    dentroGeocerca = true;
                    horaInicioPeriodo = fechaEvento;
                  }
                  break;
              }
            }

            // Si el día termina y el empleado sigue dentro, cerrar el período
            if (dentroGeocerca && horaInicioPeriodo && dia.eventos.length > 0) {
              const ultimoEvento = dia.eventos[dia.eventos.length - 1];
              const fechaUltimoEvento = new Date(ultimoEvento.fechaHora);
              const tiempoPeriodo = (fechaUltimoEvento - horaInicioPeriodo) / (1000 * 60);
              tiempoEnGeocercaDia += tiempoPeriodo;
            }

            tiempoEnGeocercaTotal += tiempoEnGeocercaDia;
            tiempoComidaTotal += tiempoComidaDia;
            if (dia.entrada) diasTrabajados++;
          }
        }

        // Determinar estado actual basado en el último evento
        let estadoActual = 'fuera';
        if (reporte.eventos.length > 0) {
          const ultimoEvento = reporte.eventos[reporte.eventos.length - 1];
          if (ultimoEvento.tipoEvento === 'entrada' || ultimoEvento.tipoEvento === 'dentro') {
            estadoActual = 'dentro';
          } else if (ultimoEvento.tipoEvento === 'salida' || ultimoEvento.tipoEvento === 'fuera') {
            estadoActual = 'fuera';
          }
        }

        return {
          empleadoId: reporte.empleadoId,
          empleadoNombre: reporte.empleadoNombre,
          plantaId: reporte.plantaId,
          // Tiempos reales (mantener compatibilidad con frontend)
          tiempoEnGeocercaHoras: Math.round((tiempoEnGeocercaTotal / 60) * 100) / 100,
          tiempoComidaHoras: Math.round((tiempoComidaTotal / 60) * 100) / 100,
          tiempoEfectivoHoras: Math.round(((tiempoEnGeocercaTotal - tiempoComidaTotal) / 60) * 100) / 100,
          // Estado actual (necesario para frontend)
          estadoActual: estadoActual,
          // Eventos (necesario para frontend - mostrar último evento)
          eventos: reporte.eventos,
          // Comparación con horario esperado (nuevos campos)
          tiempoEsperadoHoras: horario ? Math.round((tiempoEsperadoTotal / 60) * 100) / 100 : null,
          diferenciaHoras: horario ? Math.round(((tiempoEnGeocercaTotal - tiempoComidaTotal - tiempoEsperadoTotal) / 60) * 100) / 100 : null,
          // Asistencia (nuevos campos)
          diasTrabajados: diasTrabajados,
          diasFaltados: diasFaltados,
          tardanzas: tardanzas,
          minutosTardanzaTotal: Math.round(minutosTardanzaTotal),
          salidasTempranas: salidasTempranas,
          minutosSalidaTempranaTotal: Math.round(minutosSalidaTempranaTotal),
          // Horas extra (nuevos campos)
          horasExtra: Math.round((horasExtra / 60) * 100) / 100,
          minutosExtra: Math.round(horasExtra),
          // Información del horario (nuevos campos)
          tieneHorario: !!horario,
          horarioNombre: horario ? horario.nombre : null
        };
      })
    );

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

// ========== ENDPOINTS PARA GESTIÓN DE HORARIOS LABORALES ==========

// GET /api/checador/horarios - Obtener todos los horarios laborales
router.get('/horarios', async (req, res) => {
  try {
    const { empleadoId, plantaId, activo } = req.query;
    
    let filtro = {};
    if (empleadoId) filtro.empleadoId = empleadoId;
    if (plantaId) filtro.plantaId = plantaId;
    if (activo !== undefined) filtro.activo = activo === 'true';

    const horarios = await HorarioLaboral.find(filtro).sort({ createdAt: -1 });
    
    res.json({
      error: false,
      data: horarios,
      total: horarios.length
    });
  } catch (error) {
    console.error('❌ [Horarios] Error:', error);
    res.status(500).json({ error: true, message: 'Error al obtener horarios', details: error.message });
  }
});

// GET /api/checador/horarios/:id - Obtener un horario específico
router.get('/horarios/:id', async (req, res) => {
  try {
    const horario = await HorarioLaboral.findById(req.params.id);
    
    if (!horario) {
      return res.status(404).json({ error: true, message: 'Horario no encontrado' });
    }
    
    res.json({
      error: false,
      data: horario
    });
  } catch (error) {
    console.error('❌ [Horarios] Error:', error);
    res.status(500).json({ error: true, message: 'Error al obtener horario', details: error.message });
  }
});

// POST /api/checador/horarios - Crear un nuevo horario laboral
router.post('/horarios', async (req, res) => {
  try {
    const {
      empleadoId,
      plantaId,
      nombre,
      diasLaborables,
      horaEntrada,
      horaSalida,
      toleranciaEntrada,
      horaInicioComida,
      horaFinComida,
      duracionComidaEsperada,
      horasEsperadasPorDia,
      activo
    } = req.body;

    // Validaciones
    if (!plantaId || !nombre || !diasLaborables || !horaEntrada || !horaSalida || !horasEsperadasPorDia) {
      return res.status(400).json({
        error: true,
        message: 'Faltan campos requeridos: plantaId, nombre, diasLaborables, horaEntrada, horaSalida, horasEsperadasPorDia'
      });
    }

    // Validar que diasLaborables sea un array
    if (!Array.isArray(diasLaborables) || diasLaborables.length === 0) {
      return res.status(400).json({
        error: true,
        message: 'diasLaborables debe ser un array con al menos un día'
      });
    }

    // Validar formato de horas (HH:mm)
    const formatoHora = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!formatoHora.test(horaEntrada) || !formatoHora.test(horaSalida)) {
      return res.status(400).json({
        error: true,
        message: 'Formato de hora inválido. Use HH:mm (ej: 08:00)'
      });
    }

    const horario = new HorarioLaboral({
      empleadoId: empleadoId || null,
      plantaId,
      nombre,
      diasLaborables,
      horaEntrada,
      horaSalida,
      toleranciaEntrada: toleranciaEntrada || 15,
      horaInicioComida: horaInicioComida || null,
      horaFinComida: horaFinComida || null,
      duracionComidaEsperada: duracionComidaEsperada || 60,
      horasEsperadasPorDia,
      activo: activo !== undefined ? activo : true
    });

    await horario.save();

    console.log(`✅ [Horarios] Horario creado: ${horario.nombre} para ${empleadoId || 'todos'} en planta ${plantaId}`);

    res.status(201).json({
      error: false,
      message: 'Horario creado exitosamente',
      data: horario
    });
  } catch (error) {
    console.error('❌ [Horarios] Error:', error);
    res.status(500).json({ error: true, message: 'Error al crear horario', details: error.message });
  }
});

// PUT /api/checador/horarios/:id - Actualizar un horario laboral
router.put('/horarios/:id', async (req, res) => {
  try {
    const horario = await HorarioLaboral.findById(req.params.id);
    
    if (!horario) {
      return res.status(404).json({ error: true, message: 'Horario no encontrado' });
    }

    // Validar que diasLaborables sea un array si se proporciona
    if (req.body.diasLaborables !== undefined) {
      if (!Array.isArray(req.body.diasLaborables) || req.body.diasLaborables.length === 0) {
        return res.status(400).json({
          error: true,
          message: 'diasLaborables debe ser un array con al menos un día'
        });
      }
    }

    // Validar formato de horas si se proporcionan
    if (req.body.horaEntrada) {
      const formatoHora = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!formatoHora.test(req.body.horaEntrada)) {
        return res.status(400).json({
          error: true,
          message: 'Formato de horaEntrada inválido. Use HH:mm'
        });
      }
    }

    if (req.body.horaSalida) {
      const formatoHora = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!formatoHora.test(req.body.horaSalida)) {
        return res.status(400).json({
          error: true,
          message: 'Formato de horaSalida inválido. Use HH:mm'
        });
      }
    }

    // Actualizar campos
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        horario[key] = req.body[key];
      }
    });

    await horario.save();

    console.log(`✅ [Horarios] Horario actualizado: ${horario._id}`);

    res.json({
      error: false,
      message: 'Horario actualizado exitosamente',
      data: horario
    });
  } catch (error) {
    console.error('❌ [Horarios] Error:', error);
    res.status(500).json({ error: true, message: 'Error al actualizar horario', details: error.message });
  }
});

// DELETE /api/checador/horarios/:id - Eliminar un horario laboral
router.delete('/horarios/:id', async (req, res) => {
  try {
    const horario = await HorarioLaboral.findById(req.params.id);
    
    if (!horario) {
      return res.status(404).json({ error: true, message: 'Horario no encontrado' });
    }

    await horario.deleteOne();

    console.log(`✅ [Horarios] Horario eliminado: ${horario._id}`);

    res.json({
      error: false,
      message: 'Horario eliminado exitosamente'
    });
  } catch (error) {
    console.error('❌ [Horarios] Error:', error);
    res.status(500).json({ error: true, message: 'Error al eliminar horario', details: error.message });
  }
});

// ============================================
// ENDPOINTS PARA AJUSTES MANUALES DE EVENTOS
// ============================================

// GET /api/checador/eventos/:id - Obtener un evento específico
router.get('/eventos/:id', async (req, res) => {
  try {
    const evento = await ChecadorEvento.findById(req.params.id);
    
    if (!evento) {
      return res.status(404).json({ error: true, message: 'Evento no encontrado' });
    }
    
    res.json({
      error: false,
      data: evento
    });
  } catch (error) {
    console.error('❌ [Eventos] Error:', error);
    res.status(500).json({ error: true, message: 'Error al obtener evento', details: error.message });
  }
});

// PUT /api/checador/eventos/:id - Editar un evento
router.put('/eventos/:id', async (req, res) => {
  try {
    const evento = await ChecadorEvento.findById(req.params.id);
    
    if (!evento) {
      return res.status(404).json({ error: true, message: 'Evento no encontrado' });
    }

    const {
      empleadoId,
      empleadoNombre,
      plantaId,
      plantaNombre,
      tipoEvento,
      fechaHora,
      latitud,
      longitud
    } = req.body;

    // Validaciones
    if (tipoEvento && !['entrada', 'salida', 'dentro', 'fuera', 'comida', 'reanudar_trabajo', 'ubicacion'].includes(tipoEvento)) {
      return res.status(400).json({
        error: true,
        message: 'Tipo de evento inválido. Debe ser: entrada, salida, dentro, fuera, comida, reanudar_trabajo, ubicacion'
      });
    }

    if (fechaHora) {
      const fecha = new Date(fechaHora);
      if (isNaN(fecha.getTime())) {
        return res.status(400).json({
          error: true,
          message: 'Fecha/Hora inválida'
        });
      }
    }

    if (latitud !== undefined && (isNaN(latitud) || latitud < -90 || latitud > 90)) {
      return res.status(400).json({
        error: true,
        message: 'Latitud inválida. Debe estar entre -90 y 90'
      });
    }

    if (longitud !== undefined && (isNaN(longitud) || longitud < -180 || longitud > 180)) {
      return res.status(400).json({
        error: true,
        message: 'Longitud inválida. Debe estar entre -180 y 180'
      });
    }

    // Actualizar campos
    if (empleadoId !== undefined) evento.empleadoId = empleadoId;
    if (empleadoNombre !== undefined) evento.empleadoNombre = empleadoNombre;
    if (plantaId !== undefined) evento.plantaId = plantaId;
    if (plantaNombre !== undefined) evento.plantaNombre = plantaNombre;
    if (tipoEvento !== undefined) evento.tipoEvento = tipoEvento;
    if (fechaHora !== undefined) evento.fechaHora = new Date(fechaHora);
    if (latitud !== undefined) evento.latitud = latitud;
    if (longitud !== undefined) evento.longitud = longitud;

    await evento.save();

    console.log(`✅ [Eventos] Evento actualizado: ${evento._id} - ${evento.empleadoNombre} - ${evento.tipoEvento}`);

    res.json({
      error: false,
      message: 'Evento actualizado exitosamente',
      data: evento
    });
  } catch (error) {
    console.error('❌ [Eventos] Error:', error);
    res.status(500).json({ error: true, message: 'Error al actualizar evento', details: error.message });
  }
});

// DELETE /api/checador/eventos/:id - Eliminar un evento
router.delete('/eventos/:id', async (req, res) => {
  try {
    const evento = await ChecadorEvento.findById(req.params.id);
    
    if (!evento) {
      return res.status(404).json({ error: true, message: 'Evento no encontrado' });
    }

    const eventoInfo = {
      id: evento._id,
      empleado: evento.empleadoNombre,
      tipo: evento.tipoEvento,
      fecha: evento.fechaHora
    };

    await evento.deleteOne();

    console.log(`✅ [Eventos] Evento eliminado: ${eventoInfo.id} - ${eventoInfo.empleado} - ${eventoInfo.tipo}`);

    res.json({
      error: false,
      message: 'Evento eliminado exitosamente',
      data: eventoInfo
    });
  } catch (error) {
    console.error('❌ [Eventos] Error:', error);
    res.status(500).json({ error: true, message: 'Error al eliminar evento', details: error.message });
  }
});

module.exports = router; 