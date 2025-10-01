// models/pedido.js
const mongoose = require('../utils/dbConnect');
const moment = require('moment-timezone');

// models/pedido.js - Actualizar el schema
const PedidoSchema = new mongoose.Schema({
  extension: { type: String, required: true },
  phone: { type: String, required: true },
  valorPedido: { type: Number, required: true },
  valorDomicilio: { type: Number, default: 0 },
  valorTotal: { type: Number },
  fechaPedido: { 
    type: Date, 
    default: () => moment().tz('America/Bogota').toDate()
  },
  jornadaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Jornada' },
  dia: { type: String },
  semana: { type: String },
  mes: { type: String },
  nombreCliente: { type: String },
  direccion: { type: String },
  metodoPago: { type: String },
  pagaCon: { type: Number },
  observacionGeneral: { type: String },
  items: [{
    categoria: String,
    nombre: String,
    variante: String,
    precio: Number,
    cantidad: Number,
    observacion: String,
    subtotal: Number
  }],
  estado: { 
    type: String, 
    enum: ['pendiente', 'aceptado', 'rechazado', 'completado'],
    default: 'pendiente'
  },
  motivoRechazo: { type: String },
  fechaActualizacion: { type: Date }
});

PedidoSchema.index({ extension: 1, fechaPedido: 1 });
PedidoSchema.index({ extension: 1, dia: 1 });
PedidoSchema.index({ extension: 1, semana: 1 });
PedidoSchema.index({ extension: 1, mes: 1 });

module.exports = mongoose.model('Pedido', PedidoSchema);