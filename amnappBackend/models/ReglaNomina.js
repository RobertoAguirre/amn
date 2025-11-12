const mongoose = require('mongoose');

const reglaNominaSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true // Ej: "Descuento por tardanza", "Bono por puntualidad"
  },
  tipo: {
    type: String,
    enum: ['descuento', 'bono', 'multa', 'bonificacion'],
    required: true
  },
  // Aplicable a: 'todos', 'planta', 'empleado'
  aplicableA: {
    type: String,
    enum: ['todos', 'planta', 'empleado'],
    default: 'todos'
  },
  plantaId: {
    type: String,
    required: false
  },
  empleadoId: {
    type: String,
    required: false
  },
  // Condiciones
  condicion: {
    tipo: {
      type: String,
      enum: ['tardanza', 'falta', 'salida_temprana', 'horas_extra', 'puntualidad', 'asistencia_perfecta'],
      required: true
    },
    // Para tardanza: minutos de retraso mínimo
    minutosMinimo: {
      type: Number,
      default: 0
    },
    // Para falta: días consecutivos
    diasConsecutivos: {
      type: Number,
      default: 0
    },
    // Para horas extra: horas mínimas
    horasMinimas: {
      type: Number,
      default: 0
    }
  },
  // Valor del descuento/bono
  valor: {
    tipo: {
      type: String,
      enum: ['porcentaje', 'fijo', 'por_minuto', 'por_hora'],
      required: true
    },
    cantidad: {
      type: Number,
      required: true
    }
  },
  // Descripción
  descripcion: {
    type: String,
    required: false
  },
  activo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const ReglaNomina = mongoose.model('ReglaNomina', reglaNominaSchema);

module.exports = ReglaNomina;

