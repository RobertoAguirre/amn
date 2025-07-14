const mongoose = require('mongoose');

const checadorEventoSchema = new mongoose.Schema({
  empleadoId: { type: String, required: true },
  empleadoNombre: { type: String, required: true },
  plantaId: { type: String, required: true },
  plantaNombre: { type: String, required: true },
  tipoEvento: { type: String, required: true },
  fechaHora: { type: Date, required: true },
  latitud: { type: Number, required: true },
  longitud: { type: Number, required: true },
  sincronizado: { type: Boolean, default: true }
}, {
  timestamps: true
});

checadorEventoSchema.index({ empleadoId: 1, fechaHora: 1 });

const ChecadorEvento = mongoose.model('ChecadorEvento', checadorEventoSchema);

module.exports = ChecadorEvento; 