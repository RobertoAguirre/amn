const mongoose = require('mongoose');

const turnoSchema = new mongoose.Schema({
  local_id: {
    type: String,
    required: true
  },
  fecha: {
    type: Date,
    required: true
  },
  tipo: {
    type: String,
    required: true,
    enum: ['mañana', 'tarde', 'noche']
  },
  operador: {
    type: String,
    required: true
  },
  supervisor: {
    type: String,
    required: true
  },
  linea: {
    type: String,
    required: true
  },
  producto: {
    type: String,
    required: true
  },
  lote: {
    type: String,
    required: true
  },
  cantidad_producida: {
    type: Number,
    required: true,
    min: 0
  },
  cantidad_rechazada: {
    type: Number,
    required: true,
    min: 0
  },
  observaciones: String,
  firma_digital: {
    type: String,
    required: true
  },
  sincronizado: {
    type: Boolean,
    default: false
  },
  fecha_sincronizacion: Date
}, {
  timestamps: true
});

// Índices
turnoSchema.index({ local_id: 1 }, { unique: true });
turnoSchema.index({ fecha: 1, tipo: 1, linea: 1 });
turnoSchema.index({ sincronizado: 1 });

module.exports = mongoose.model('Turno', turnoSchema); 