const Notificacion = require('../models/Notificacion');

/**
 * Genera notificaciones automáticas basadas en eventos de asistencia
 */
async function generarNotificacionesAsistencia(empleadoId, empleadoNombre, plantaId, fechaEvento, tipoEvento, detalles) {
  try {
    let notificacion = null;

    switch (tipoEvento) {
      case 'tardanza':
        notificacion = await Notificacion.create({
          tipo: 'tardanza',
          titulo: `Tardanza: ${empleadoNombre}`,
          mensaje: `El empleado ${empleadoNombre} llegó tarde el ${new Date(fechaEvento).toLocaleDateString('es-MX')}. ${detalles.minutosTardanza ? `Retraso: ${detalles.minutosTardanza} minutos.` : ''}`,
          empleadoId,
          empleadoNombre,
          plantaId,
          fechaEvento: new Date(fechaEvento),
          rutaDestino: '/nomina',
          parametrosDestino: {
            empleadoNombre: empleadoNombre,
            fechaInicio: new Date(fechaEvento).toISOString().split('T')[0],
            fechaFin: new Date(fechaEvento).toISOString().split('T')[0]
          },
          prioridad: detalles.minutosTardanza > 30 ? 'alta' : 'media',
          activa: true,
          leida: false
        });
        break;

      case 'falta':
        notificacion = await Notificacion.create({
          tipo: 'falta',
          titulo: `Falta: ${empleadoNombre}`,
          mensaje: `El empleado ${empleadoNombre} no registró entrada el ${new Date(fechaEvento).toLocaleDateString('es-MX')}.`,
          empleadoId,
          empleadoNombre,
          plantaId,
          fechaEvento: new Date(fechaEvento),
          rutaDestino: '/nomina',
          parametrosDestino: {
            empleadoNombre: empleadoNombre,
            fechaInicio: new Date(fechaEvento).toISOString().split('T')[0],
            fechaFin: new Date(fechaEvento).toISOString().split('T')[0]
          },
          prioridad: 'alta',
          activa: true,
          leida: false
        });
        break;

      case 'salida_temprana':
        notificacion = await Notificacion.create({
          tipo: 'salida_temprana',
          titulo: `Salida Temprana: ${empleadoNombre}`,
          mensaje: `El empleado ${empleadoNombre} salió antes de tiempo el ${new Date(fechaEvento).toLocaleDateString('es-MX')}. ${detalles.minutosAntes ? `Se fue ${detalles.minutosAntes} minutos antes.` : ''}`,
          empleadoId,
          empleadoNombre,
          plantaId,
          fechaEvento: new Date(fechaEvento),
          rutaDestino: '/nomina',
          parametrosDestino: {
            empleadoNombre: empleadoNombre,
            fechaInicio: new Date(fechaEvento).toISOString().split('T')[0],
            fechaFin: new Date(fechaEvento).toISOString().split('T')[0]
          },
          prioridad: 'media',
          activa: true,
          leida: false
        });
        break;

      case 'sin_entrada':
        // Verificar si ya existe una notificación de "sin entrada" para este empleado y fecha
        const existeNotificacion = await Notificacion.findOne({
          tipo: 'sin_entrada',
          empleadoId,
          fechaEvento: {
            $gte: new Date(fechaEvento).setHours(0, 0, 0, 0),
            $lt: new Date(fechaEvento).setHours(23, 59, 59, 999)
          },
          activa: true,
          leida: false
        });

        if (!existeNotificacion) {
          notificacion = await Notificacion.create({
            tipo: 'sin_entrada',
            titulo: `Sin Entrada: ${empleadoNombre}`,
            mensaje: `El empleado ${empleadoNombre} no ha registrado entrada hoy (${new Date().toLocaleDateString('es-MX')}).`,
            empleadoId,
            empleadoNombre,
            plantaId,
            fechaEvento: new Date(),
            rutaDestino: '/nomina',
            parametrosDestino: {
              empleadoNombre: empleadoNombre,
              fechaInicio: new Date().toISOString().split('T')[0],
              fechaFin: new Date().toISOString().split('T')[0]
            },
            prioridad: 'alta',
            activa: true,
            leida: false
          });
        }
        break;
    }

    if (notificacion) {
      console.log(`✅ [Notificaciones] Notificación creada: ${notificacion.tipo} - ${empleadoNombre}`);
    }

    return notificacion;
  } catch (error) {
    console.error('❌ [Notificaciones] Error generando notificación:', error);
    return null;
  }
}

/**
 * Verifica y genera notificaciones para empleados que deberían haber llegado pero no lo han hecho
 */
async function verificarEntradasPendientes(horarios, horaActual) {
  try {
    const notificaciones = [];
    
    // Esta función se puede llamar periódicamente para verificar entradas pendientes
    // Por ahora, la lógica se puede implementar según necesidades específicas
    
    return notificaciones;
  } catch (error) {
    console.error('❌ [Notificaciones] Error verificando entradas pendientes:', error);
    return [];
  }
}

module.exports = {
  generarNotificacionesAsistencia,
  verificarEntradasPendientes
};

