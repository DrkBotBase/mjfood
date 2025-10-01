// models/Jornada.js
const mongoose = require('mongoose');

const jornadaSchema = new mongoose.Schema({
  extension: { type: String, required: true }, // restaurante
  inicio: { type: Date, required: true },
  cierre: { type: Date },
  totalPedidos: { type: Number, default: 0 },
  totalVentas: { type: Number, default: 0 },
  estado: { type: String, enum: ['abierta', 'cerrada'], default: 'abierta' }
});

module.exports = mongoose.model('Jornada', jornadaSchema);