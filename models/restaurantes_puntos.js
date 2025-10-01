const mongoose = require('../utils/dbConnect');
const moment = require('moment-timezone');

const ClienteSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  totalPedidos: { type: Number, default: 0 }, // número de veces que pidió
  totalGastado: { type: Number, default: 0 }  // acumulado en $
});

const RestaurantePuntosSchema = new mongoose.Schema({
  extension: { type: String, required: true, unique: true }, // ID restaurante
  puntos: { type: Number, default: 0 }, // contador global de pedidos
  orden: { type: Number, default: 999 }, // ranking de restaurantes
  ultimaActualizacion: { 
    type: Date,
    default: () => moment().tz('America/Bogota').toDate()
  },
  token: { type: String },
  clientes: [ClienteSchema] // lista de clientes únicos
});

module.exports = mongoose.model('RestaurantePuntos', RestaurantePuntosSchema);