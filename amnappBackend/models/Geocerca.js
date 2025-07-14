const mongoose = require('mongoose');

const geocercaSchema = new mongoose.Schema({
  nombre: { type: String, required: true }, // Nombre de la planta
  plantaId: { type: String, required: true },
  tipo: { type: String, enum: ['poligono', 'circulo'], required: true },
  // Para polígono: array de coordenadas [{lat, lng}]
  coordenadas: [{
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  }],
  // Para círculo: centro y radio
  centro: {
    lat: Number,
    lng: Number
  },
  radio: Number, // en metros
  createdAt: { type: Date, default: Date.now }
});

const Geocerca = mongoose.model('Geocerca', geocercaSchema);

module.exports = Geocerca; 