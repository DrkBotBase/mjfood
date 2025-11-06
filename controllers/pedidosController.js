const Pedido = require('../models/pedido');
const moment = require('moment-timezone');

exports.registrarPedido = async (io, socket, pedidoData) => {
  try {
    const {
      restauranteId,
      cliente,
      items,
      zonaEnvio,
      metodoPago,
      pagaCon,
      comentarios,
      subtotal,
      total,
    } = pedidoData;
    if (!restauranteId || !cliente || !items || !items.length) {
      throw new Error('Faltan datos obligatorios del pedido.');
    }
    const nuevoPedido = new Pedido({
      extension: restauranteId,
      phone: cliente.telefono,
      nombreCliente: cliente.nombre,
      direccion: cliente.direccion,
      valorPedido: subtotal,
      valorDomicilio: zonaEnvio.costo,
      valorTotal: total,
      metodoPago: metodoPago,
      pagaCon: pagaCon ? Number(pagaCon) : undefined,
      observacionGeneral: comentarios,
      items: items.map(item => ({
        nombre: item.nombre,
        cantidad: item.cantidad,
        precio: item.precio,
        variante: item.variantes ? item.variantes.join(', ') : '',
        observacion: item.instrucciones,
        subtotal: item.precio * item.cantidad,
      })),
      dia: moment().tz('America/Bogota').format('YYYY-MM-DD'),
      semana: moment().tz('America/Bogota').format('YYYY-WW'),
      mes: moment().tz('America/Bogota').format('YYYY-MM'),
    });
    const pedidoGuardado = await nuevoPedido.save();
    io.to(restauranteId).emit('pedido:nuevo', pedidoGuardado);
    if (socket) {
      socket.emit('pedido:registrado', { pedidoId: pedidoGuardado._id });
    }
    return pedidoGuardado;

  } catch (error) {
    console.error('Error detallado al registrar el pedido:', error);
    if (socket) {
      socket.emit('pedido:error', { message: 'No se pudo procesar tu pedido en este momento.' });
    }
    throw error;
  }
};