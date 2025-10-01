const mongoose = require('mongoose');

const EstadisticasJornadaSchema = new mongoose.Schema({
  extension: { type: String, required: true },
  jornadaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Jornada', required: true },
  fechaInicio: { type: Date, required: true },
  fechaCierre: { type: Date },
  totalPedidos: { type: Number, default: 0 },
  totalGastado: { type: Number, default: 0 },
  totalEfectivo: { type: Number, default: 0 },
  totalTransferencia: { type: Number, default: 0 },
  clientes: [{
    phone: String,
    totalPedidos: { type: Number, default: 0 },
    totalGastado: { type: Number, default: 0 },
    ultimoPedido: Date
  }],
  ultimaActualizacion: { type: Date, default: Date.now }
});

module.exports = mongoose.model('EstadisticasJornada', EstadisticasJornadaSchema);