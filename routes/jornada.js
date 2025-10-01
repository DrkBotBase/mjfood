// routes/jornada.js
const express = require('express');
const router = express.Router();
const Jornada = require('../models/Jornada');
const Pedido = require('../models/pedido');
const EstadisticasJornada = require('../models/EstadisticasJornada');
const moment = require('moment-timezone');

// Iniciar jornada
router.post('/iniciar', async (req, res) => {
  try {
    const { extension } = req.body;
    const timezone = 'America/Bogota';

    const jornadasAbiertas = await Jornada.find({ extension, estado: 'abierta' });

    for (const jornada of jornadasAbiertas) {
      const pedidos = await Pedido.find({ jornadaId: jornada._id, estado: 'aceptado' });

      let totalPedidos = pedidos.length;
      let totalGastado = 0;
      let totalEfectivo = 0;
      let totalTransferencia = 0;
      let clientesMap = new Map();

      pedidos.forEach(p => {
        const valorPedido = p.valorTotal || (p.valorPedido + (p.valorDomicilio || 0));
        totalGastado += valorPedido;

        if (p.metodoPago === 'efectivo') totalEfectivo += valorPedido;
        if (p.metodoPago === 'transferencia') totalTransferencia += valorPedido;

        if (!clientesMap.has(p.phone)) {
          clientesMap.set(p.phone, {
            phone: p.phone,
            totalPedidos: 0,
            totalGastado: 0,
            ultimoPedido: p.fechaPedido
          });
        }
        let cliente = clientesMap.get(p.phone);
        cliente.totalPedidos += 1;
        cliente.totalGastado += valorPedido;
        cliente.ultimoPedido = p.fechaPedido;
      });

      jornada.cierre = moment().tz(timezone).toDate();
      jornada.estado = 'cerrada';
      jornada.totalPedidos = totalPedidos;
      jornada.totalVentas = totalGastado;
      await jornada.save();

      let estadisticasJornada = await EstadisticasJornada.findOne({ jornadaId: jornada._id });
      if (!estadisticasJornada) {
        estadisticasJornada = new EstadisticasJornada({
          extension,
          jornadaId: jornada._id,
          fechaInicio: jornada.inicio,
          fechaCierre: jornada.cierre,
          totalPedidos,
          totalGastado,
          totalEfectivo,
          totalTransferencia,
          clientes: Array.from(clientesMap.values()),
          ultimaActualizacion: moment().tz(timezone).toDate()
        });
      } else {
        estadisticasJornada.fechaCierre = jornada.cierre;
        estadisticasJornada.totalPedidos = totalPedidos;
        estadisticasJornada.totalGastado = totalGastado;
        estadisticasJornada.totalEfectivo = totalEfectivo;
        estadisticasJornada.totalTransferencia = totalTransferencia;
        estadisticasJornada.clientes = Array.from(clientesMap.values());
        estadisticasJornada.ultimaActualizacion = moment().tz(timezone).toDate();
      }
      await estadisticasJornada.save();
    }

    const nuevaJornada = new Jornada({
      extension,
      inicio: moment().tz(timezone).toDate(),
      estado: 'abierta',
      totalPedidos: 0,
      totalVentas: 0
    });
    await nuevaJornada.save();

    const nuevaEstadistica = new EstadisticasJornada({
      extension,
      jornadaId: nuevaJornada._id,
      fechaInicio: nuevaJornada.inicio,
      totalPedidos: 0,
      totalGastado: 0,
      totalEfectivo: 0,
      totalTransferencia: 0,
      clientes: [],
      ultimaActualizacion: moment().tz(timezone).toDate()
    });
    await nuevaEstadistica.save();

    res.json({ ok: true, jornada: nuevaJornada, estadistica: nuevaEstadistica });

  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Cerrar jornada
router.post('/cerrar', async (req, res) => {
  try {
    const { extension } = req.body;
    const timezone = 'America/Bogota';

    let jornada = await Jornada.findOne({ extension, estado: 'abierta' });
    if (!jornada) {
      return res.status(404).json({ ok: false, message: 'No hay jornada abierta' });
    }

    const pedidos = await Pedido.find({ jornadaId: jornada._id, estado: 'aceptado' });

    let totalPedidos = pedidos.length;
    let totalGastado = 0;
    let totalEfectivo = 0;
    let totalTransferencia = 0;
    let clientesMap = new Map();

    pedidos.forEach(p => {
      const valorPedido = p.valorTotal || (p.valorPedido + (p.valorDomicilio || 0));
      totalGastado += valorPedido;

      if (p.metodoPago === 'efectivo') totalEfectivo += valorPedido;
      if (p.metodoPago === 'transferencia') totalTransferencia += valorPedido;

      if (!clientesMap.has(p.phone)) {
        clientesMap.set(p.phone, {
          phone: p.phone,
          totalPedidos: 0,
          totalGastado: 0,
          ultimoPedido: p.fechaPedido
        });
      }
      let cliente = clientesMap.get(p.phone);
      cliente.totalPedidos += 1;
      cliente.totalGastado += valorPedido;
      cliente.ultimoPedido = p.fechaPedido;
    });

    jornada.cierre = moment().tz(timezone).toDate();
    jornada.estado = 'cerrada';
    jornada.totalPedidos = totalPedidos;
    jornada.totalVentas = totalGastado;
    await jornada.save();

    let estadisticasJornada = await EstadisticasJornada.findOne({ jornadaId: jornada._id });
    if (!estadisticasJornada) {
      estadisticasJornada = new EstadisticasJornada({
        extension,
        jornadaId: jornada._id,
        fechaInicio: jornada.inicio,
        fechaCierre: jornada.cierre,
        totalPedidos,
        totalGastado,
        totalEfectivo,
        totalTransferencia,
        clientes: Array.from(clientesMap.values()),
        ultimaActualizacion: moment().tz(timezone).toDate()
      });
    } else {
      estadisticasJornada.fechaCierre = jornada.cierre;
      estadisticasJornada.totalPedidos = totalPedidos;
      estadisticasJornada.totalGastado = totalGastado;
      estadisticasJornada.totalEfectivo = totalEfectivo;
      estadisticasJornada.totalTransferencia = totalTransferencia;
      estadisticasJornada.clientes = Array.from(clientesMap.values());
      estadisticasJornada.ultimaActualizacion = moment().tz(timezone).toDate();
    }
    await estadisticasJornada.save();

    res.json({ ok: true, jornada, estadisticasJornada });

  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;