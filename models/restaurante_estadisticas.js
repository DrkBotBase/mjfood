// models/restaurante_estadisticas.js
const mongoose = require('../utils/dbConnect');
const moment = require('moment-timezone');

const EstadisticasClienteSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  totalPedidos: { type: Number, default: 0 },
  totalGastado: { type: Number, default: 0 },
  ultimoPedido: { type: Date }
});

const RestauranteEstadisticasSchema = new mongoose.Schema({
  extension: { type: String, required: true, unique: true },
  totalPedidos: { type: Number, default: 0 },
  totalGastado: { type: Number, default: 0 },
  totalEfectivo: { type: Number, default: 0 },
  totalTransferencia: { type: Number, default: 0 },
  ultimaActualizacion: { 
    type: Date, 
    default: moment().tz('America/Bogota').toDate()
  },
  token: { type: String },
  clientes: [EstadisticasClienteSchema],
  estadisticasDiarias: [{
    dia: String,
    totalPedidos: Number,
    totalGastado: Number,
    totalEfectivo: Number,
    totalTransferencia: Number,
    fecha: Date
  }],
  estadisticasSemanales: [{
    semana: String,
    totalPedidos: Number,
    totalGastado: Number,
    totalEfectivo: Number,
    totalTransferencia: Number,
    fechaInicio: Date,
    fechaFin: Date
  }],
  estadisticasMensuales: [{
    mes: String,
    totalPedidos: Number,
    totalGastado: Number,
    totalEfectivo: Number,
    totalTransferencia: Number,
    fechaInicio: Date,
    fechaFin: Date
  }]
});

module.exports = mongoose.model('RestauranteEstadisticas', RestauranteEstadisticasSchema);