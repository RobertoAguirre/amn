const mongoose = require('mongoose');

const notificacionSchema = new mongoose.Schema({
  tipo: {
    type: String,
    enum: ['tardanza', 'falta', 'salida_temprana', 'sin_entrada', 'horas_extra', 'evento_anomalo', 'sistema'],
    required: true
  },
  titulo: {
    type: String,
    required: true
  },
  mensaje: {
    type: String,
    required: true
  },
  empleadoId: {
    type: String,
    required: false,
    index: true
  },
  empleadoNombre: {
    type: String,
    required: false
  },
  plantaId: {
    type: String,
    required: false,
    index: true
  },
  fechaEvento: {
    type: Date,
    required: false
  },
  // Ruta a la que debe navegar cuando se hace clic
  rutaDestino: {
    type: String,
    required: false,
    default: '/nomina'
  },
  // Parámetros adicionales para la ruta (ej: query params)
  parametrosDestino: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  },
  leida: {
    type: Boolean,
    default: false,
    index: true
  },
  fechaLeida: {
    type: Date,
    required: false
  },
  prioridad: {
    type: String,
    enum: ['baja', 'media', 'alta', 'urgente'],
    default: 'media'
  },
  activa: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices para búsquedas eficientes
notificacionSchema.index({ leida: 1, createdAt: -1 });
notificacionSchema.index({ tipo: 1, leida: 1 });
notificacionSchema.index({ empleadoId: 1, leida: 1 });

const Notificacion = mongoose.model('Notificacion', notificacionSchema);

module.exports = Notificacion;

