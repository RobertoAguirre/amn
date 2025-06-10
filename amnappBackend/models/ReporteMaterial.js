const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  inspector: {
    type: String,
    required: true,
    trim: true
  },
  material_sorteado: {
    type: Number,
    required: true,
    min: 0
  },
  piezas_aceptadas: {
    type: Number,
    required: true,
    min: 0
  },
  piezas_retrabajadas: {
    type: Number,
    required: true,
    min: 0
  },
  piezas_rechazadas: {
    type: Number,
    required: true,
    min: 0
  },
  razon_rechazo: {
    type: String,
    required: true,
    trim: true
  }
});

const reporteMaterialSchema = new mongoose.Schema({
  local_id: {
    type: String,
    required: true
  },
  fecha: {
    type: Date,
    required: true
  },
  turno: {
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
  material: {
    tipo: {
      type: String,
      required: true
    },
    cantidad: {
      type: Number,
      required: true,
      min: 0
    },
    unidad: {
      type: String,
      required: true
    }
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
reporteMaterialSchema.index({ local_id: 1 }, { unique: true });
reporteMaterialSchema.index({ fecha: 1, turno: 1, linea: 1 });
reporteMaterialSchema.index({ sincronizado: 1 });

const ReporteMaterial = mongoose.model('ReporteMaterial', reporteMaterialSchema);

module.exports = ReporteMaterial; 