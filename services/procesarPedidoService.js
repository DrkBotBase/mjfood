// services/procesarPedidoService.js
const Pedido = require('../models/pedido');
const Jornada = require('../models/Jornada');
const RestauranteEstadisticas = require('../models/restaurante_estadisticas');
const EstadisticasJornada = require('../models/EstadisticasJornada');
const moment = require('moment-timezone');

class ProcesarPedidoService {
  constructor() {
    this.timezone = 'America/Bogota';
    this.io = null;
  }
  setIO(ioInstance) {
    this.io = ioInstance;
  }
  calcularPeriodos() {
    const now = moment().tz(this.timezone);
    return {
      dia: now.format('YYYY-MM-DD'),
      semana: now.format('YYYY-WW'),
      mes: now.format('YYYY-MM'),
      fechaCompleta: now.toDate(),
      año: now.format('YYYY'),
      semanaNumero: now.isoWeek(),
      diaSemana: now.format('dddd')
    };
  }
  calcularPeriodosParaPedido(fechaPedido) {
    const fecha = moment(fechaPedido).tz(this.timezone);
    return {
      dia: fecha.format('YYYY-MM-DD'),
      semana: fecha.format('YYYY-WW'),
      mes: fecha.format('YYYY-MM'),
      fechaCompleta: fecha.toDate()
    };
  }
  async actualizarEstadisticaDiaria(estadisticas, periodos, valorPedido, metodoPago) {
    let estadisticaDia = estadisticas.estadisticasDiarias.find(e => e.dia === periodos.dia);
    if (estadisticaDia) {
      estadisticaDia.totalPedidos += 1;
      estadisticaDia.totalGastado += valorPedido;
      if (metodoPago === 'efectivo') {
        estadisticaDia.totalEfectivo += valorPedido;
      } else if (metodoPago === 'transferencia') {
        estadisticaDia.totalTransferencia += valorPedido;
      }
    } else {
      estadisticas.estadisticasDiarias.push({
        dia: periodos.dia,
        totalPedidos: 1,
        totalGastado: valorPedido,
        totalEfectivo: metodoPago === 'efectivo' ? valorPedido : 0,
        totalTransferencia: metodoPago === 'transferencia' ? valorPedido : 0,
        fecha: periodos.fechaCompleta
      });
    }
  }
  async actualizarEstadisticaSemanal(estadisticas, periodos, valorPedido, metodoPago) {
    const semanaActual = periodos.semana;
    let estadisticaSemana = estadisticas.estadisticasSemanales.find(e => e.semana === semanaActual);
    const inicioSemana = moment().tz(this.timezone).startOf('week');
    const finSemana = moment().tz(this.timezone).endOf('week');
    if (estadisticaSemana) {
      estadisticaSemana.totalPedidos += 1;
      estadisticaSemana.totalGastado += valorPedido;
      if (metodoPago === 'efectivo') {
        estadisticaSemana.totalEfectivo += valorPedido;
      } else if (metodoPago === 'transferencia') {
        estadisticaSemana.totalTransferencia += valorPedido;
      }
    } else {
      estadisticas.estadisticasSemanales.push({
        semana: semanaActual,
        totalPedidos: 1,
        totalGastado: valorPedido,
        totalEfectivo: metodoPago === 'efectivo' ? valorPedido : 0,
        totalTransferencia: metodoPago === 'transferencia' ? valorPedido : 0,
        fechaInicio: inicioSemana.toDate(),
        fechaFin: finSemana.toDate()
      });
    }
  }
  async actualizarEstadisticaMensual(estadisticas, periodos, valorPedido, metodoPago) {
    const mesActual = periodos.mes;
    let estadisticaMes = estadisticas.estadisticasMensuales.find(e => e.mes === mesActual);
    const inicioMes = moment().tz(this.timezone).startOf('month');
    const finMes = moment().tz(this.timezone).endOf('month');
    if (estadisticaMes) {
      estadisticaMes.totalPedidos += 1;
      estadisticaMes.totalGastado += valorPedido;
      if (metodoPago === 'efectivo') {
        estadisticaMes.totalEfectivo += valorPedido;
      } else if (metodoPago === 'transferencia') {
        estadisticaMes.totalTransferencia += valorPedido;
      }
    } else {
      estadisticas.estadisticasMensuales.push({
        mes: mesActual,
        totalPedidos: 1,
        totalGastado: valorPedido,
        totalEfectivo: metodoPago === 'efectivo' ? valorPedido : 0,
        totalTransferencia: metodoPago === 'transferencia' ? valorPedido : 0,
        fechaInicio: inicioMes.toDate(),
        fechaFin: finMes.toDate()
      });
    }
  }
  async actualizarEstadisticasSiAceptado(pedido) {
    try {
      const valorPedido = pedido.valorNeto || pedido.valorPedido || 0;
      const valorDomicilio = pedido.valorDomicilio || 0;
      const valorTotal = pedido.valorTotal || (valorPedido + valorDomicilio);
      const periodos = this.calcularPeriodosParaPedido(pedido.fechaPedido);
      let estadisticas = await RestauranteEstadisticas.findOne({ extension: pedido.extension });
      if (!estadisticas) {
        estadisticas = new RestauranteEstadisticas({
          extension: pedido.extension,
          totalPedidos: 0,
          totalGastado: 0,
          clientes: [],
          estadisticasDiarias: [],
          estadisticasSemanales: [],
          estadisticasMensuales: []
        });
      }
      estadisticas.totalPedidos += 1;
      estadisticas.totalGastado += valorTotal;
      estadisticas.ultimaActualizacion = moment().tz(this.timezone).toDate();
      if (pedido.metodoPago === 'efectivo') {
        estadisticas.totalEfectivo = (estadisticas.totalEfectivo || 0) + valorTotal;
      } else if (pedido.metodoPago === 'transferencia') {
        estadisticas.totalTransferencia = (estadisticas.totalTransferencia || 0) + valorTotal;
      }
      let cliente = estadisticas.clientes.find(c => c.phone === pedido.phone);
      if (!cliente) {
        estadisticas.clientes.push({
          phone: pedido.phone,
          totalPedidos: 1,
          totalGastado: valorTotal,
          ultimoPedido: moment().tz(this.timezone).toDate()
        });
      } else {
        cliente.totalPedidos += 1;
        cliente.totalGastado += valorTotal;
        cliente.ultimoPedido = moment().tz(this.timezone).toDate();
      }
      await this.actualizarEstadisticaDiaria(estadisticas, periodos, valorTotal, pedido.metodoPago);
      await this.actualizarEstadisticaSemanal(estadisticas, periodos, valorTotal, pedido.metodoPago);
      await this.actualizarEstadisticaMensual(estadisticas, periodos, valorTotal, pedido.metodoPago);
      await estadisticas.save();
      if (pedido.jornadaId) {
        let estadisticaJornada = await EstadisticasJornada.findOne({ jornadaId: pedido.jornadaId });
        if (!estadisticaJornada) {
          estadisticaJornada = new EstadisticasJornada({
            extension: pedido.extension,
            jornadaId: pedido.jornadaId,
            fechaInicio: moment().tz(this.timezone).toDate(),
            totalPedidos: 0,
            totalGastado: 0,
            clientes: []
          });
        }
        estadisticaJornada.totalPedidos += 1;
        estadisticaJornada.totalGastado += valorTotal;
        if (pedido.metodoPago === 'efectivo') {
          estadisticaJornada.totalEfectivo = (estadisticaJornada.totalEfectivo || 0) + valorTotal;
        } else if (pedido.metodoPago === 'transferencia') {
          estadisticaJornada.totalTransferencia = (estadisticaJornada.totalTransferencia || 0) + valorTotal;
        }
        let clienteJ = estadisticaJornada.clientes.find(c => c.phone === pedido.phone);
        if (!clienteJ) {
          estadisticaJornada.clientes.push({
            phone: pedido.phone,
            totalPedidos: 1,
            totalGastado: valorTotal,
            ultimoPedido: moment().tz(this.timezone).toDate()
          });
        } else {
          clienteJ.totalPedidos += 1;
          clienteJ.totalGastado += valorTotal;
          clienteJ.ultimoPedido = moment().tz(this.timezone).toDate();
        }
        estadisticaJornada.ultimaActualizacion = moment().tz(this.timezone).toDate();
        await estadisticaJornada.save();
      }
      return true;
    } catch (error) {
      console.error('❌ Error crítico actualizando estadísticas:', error);
      throw error;
    }
  }
  async procesarPedido(extension, customerData, io = null) {
    try {
      const periodos = this.calcularPeriodos();
      const valorPedido = Number(customerData.total) || 0;
      const jornadaActiva = await Jornada.findOne({ extension, estado: 'abierta' });
      const items = customerData.cart.map(item => ({
        categoria: item.category,
        nombre: item.name,
        variante: item.variante || '',
        precio: item.price,
        cantidad: item.quantity,
        observacion: item.observation || '',
        subtotal: item.price * item.quantity
      }));
      const nuevoPedido = new Pedido({
        extension,
        phone: customerData.phone,
        valorPedido,
        fechaPedido: periodos.fechaCompleta,
        dia: periodos.dia,
        semana: periodos.semana,
        mes: periodos.mes,
        nombreCliente: customerData.name,
        direccion: customerData.address,
        metodoPago: customerData.paymentMethod,
        pagaCon: customerData.paymentMethod === 'efectivo' ? Number(customerData.cashAmount) : null,
        observacionGeneral: customerData.observation || '',
        items: items,
        estado: 'pendiente',
        fechaActualizacion: moment().tz(this.timezone).toDate(),
        jornadaId: jornadaActiva ? jornadaActiva._id : null
      });
      await nuevoPedido.save();
      if (io) {
        io.to(extension).emit('nuevo-pedido', nuevoPedido);
      } else if (this.io) {
        this.io.to(extension).emit('nuevo-pedido', nuevoPedido);
      }
      return { success: true, pedido: nuevoPedido };
    } catch (error) {
      console.error('❌ Error procesando pedido:', error);
      throw error;
    }
  }
}

module.exports = new ProcesarPedidoService();