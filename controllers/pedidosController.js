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

    // 1. Validar datos (puedes añadir validaciones más exhaustivas)
    if (!restauranteId || !cliente || !items || !items.length) {
      throw new Error('Faltan datos obligatorios del pedido.');
    }

    // 2. Mapear datos al schema del Pedido
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
      // Campos de fecha y estado se llenan por defecto
      dia: moment().tz('America/Bogota').format('YYYY-MM-DD'),
      semana: moment().tz('America/Bogota').format('YYYY-WW'),
      mes: moment().tz('America/Bogota').format('YYYY-MM'),
    });

    // 3. Guardar en la base de datos
    const pedidoGuardado = await nuevoPedido.save();
    console.log('Pedido guardado con éxito:', pedidoGuardado._id);

    // 4. Notificar a través de Socket.io
    // Notificar al panel del restaurante
    io.to(restauranteId).emit('pedido:nuevo', pedidoGuardado);
    console.log(`Evento 'pedido:nuevo' emitido a la sala: ${restauranteId}`);

    // 5. Responder al cliente (diferente si es socket o http)
    if (socket) {
      // Si la petición vino por Socket.io, emitir evento de éxito
      socket.emit('pedido:registrado', { pedidoId: pedidoGuardado._id });
    }

    // Si la petición vino por HTTP, la ruta que llamó a esta función se encargará
    // de devolver la respuesta. Solo devolvemos el objeto.
    return pedidoGuardado;

  } catch (error) {
    console.error('Error detallado al registrar el pedido:', error);
    if (socket) {
      // Si fue por socket, emitir evento de error
      socket.emit('pedido:error', { message: 'No se pudo procesar tu pedido en este momento.' });
    }
    // Para HTTP, lanzar el error para que el 'catch' de la ruta lo maneje
    throw error;
  }
};