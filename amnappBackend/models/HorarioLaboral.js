const mongoose = require('mongoose');

const horarioLaboralSchema = new mongoose.Schema({
  empleadoId: {
    type: String,
    required: false, // Si es null, aplica a todos los empleados de la planta
    index: true
  },
  plantaId: {
    type: String,
    required: true,
    index: true
  },
  nombre: {
    type: String,
    required: true // Ej: "Turno Matutino", "Horario Personalizado"
  },
  // Días de la semana (0=Domingo, 1=Lunes, ..., 6=Sábado)
  diasLaborables: [{
    type: Number,
    enum: [0, 1, 2, 3, 4, 5, 6],
    required: true
  }],
  horaEntrada: {
    type: String, // Formato "HH:mm" (ej: "08:00")
    required: true
  },
  horaSalida: {
    type: String, // Formato "HH:mm" (ej: "17:00")
    required: true
  },
  // Tiempo de tolerancia para entrada (en minutos)
  toleranciaEntrada: {
    type: Number,
    default: 15 // 15 minutos de tolerancia
  },
  // Horario de descanso/comida
  horaInicioComida: {
    type: String, // Formato "HH:mm" (ej: "13:00")
    required: false
  },
  horaFinComida: {
    type: String, // Formato "HH:mm" (ej: "14:00")
    required: false
  },
  // Duración esperada de comida (en minutos)
  duracionComidaEsperada: {
    type: Number,
    default: 60 // 60 minutos
  },
  // Horas esperadas de trabajo por día (en horas)
  horasEsperadasPorDia: {
    type: Number,
    required: true,
    default: 8
  },
  activo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índice compuesto para búsquedas rápidas
horarioLaboralSchema.index({ empleadoId: 1, plantaId: 1, activo: 1 });

const HorarioLaboral = mongoose.model('HorarioLaboral', horarioLaboralSchema);

module.exports = HorarioLaboral;

