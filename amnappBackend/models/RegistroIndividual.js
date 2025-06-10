const mongoose = require('mongoose');

const actividadSchema = new mongoose.Schema({
  actividad_codigo: {
    type: Number,
    required: true,
    min: 1,
    max: 7
  },
  hora_inicio: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  hora_fin: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  no_parte_curso: {
    type: String,
    required: true,
    trim: true
  }
});

const registroIndividualSchema = new mongoose.Schema({
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
  defectos: [{
    tipo: {
      type: String,
      required: true
    },
    cantidad: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  observaciones: String,
  firma_digital: {
    type: String,
    required: true
  },
  sincronizado: {
    type: Boolean,
    default: false
  },
  fecha_sincronizacion: Date,
  operador_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Operador',
    required: true
  },
  planta: {
    type: String,
    required: true,
    trim: true
  },
  inicio_turno: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  fin_turno: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  numero_reloj: {
    type: String,
    required: true,
    trim: true
  },
  inspector: {
    type: String,
    required: true,
    trim: true
  },
  actividades: [actividadSchema],
  ubicacion: {
    latitud: {
      type: Number,
      required: true
    },
    longitud: {
      type: Number,
      required: true
    }
  }
}, {
  timestamps: true
});

// Índices
registroIndividualSchema.index({ local_id: 1 }, { unique: true });
registroIndividualSchema.index({ fecha: 1, turno: 1, linea: 1 });
registroIndividualSchema.index({ sincronizado: 1 });

const RegistroIndividual = mongoose.model('RegistroIndividual', registroIndividualSchema);

module.exports = RegistroIndividual; 