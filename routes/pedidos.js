// routes/pedidos.js
const express = require('express');
const router = express.Router();
const moment = require('moment-timezone');
const Pedido = require('../models/pedido');
const Jornada = require('../models/Jornada');
const ProcesarPedidoService = require('../services/procesarPedidoService');
const RestauranteEstadisticas = require('../models/restaurante_estadisticas');

// Middleware para validar token
const validarToken = async (req, res, next) => {
    try {
        const { token } = req.query;
        const { extension } = req.params;
        
        const restaurante = await RestauranteEstadisticas.findOne({ extension });
        
        if (!restaurante || !token || token !== restaurante.token) {
            return res.status(403).json({ error: 'Acceso no autorizado' });
        }
        
        req.restaurante = restaurante;
        next();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Obtener pedidos pendientes
router.get('/:extension/pendientes', async (req, res) => {
    try {
        const { extension } = req.params;
        
        const pedidos = await Pedido.find({ 
            extension, 
            estado: 'pendiente' 
        }).sort({ fechaPedido: -1 });
        
        res.json(pedidos);
    } catch (error) {
        console.error('Error obteniendo pedidos pendientes:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Aceptar pedido
router.put('/:id/aceptar', async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.query;
    const { valorDomicilio } = req.body;

    const pedido = await Pedido.findById(id);
    if (!pedido) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const restaurante = await RestauranteEstadisticas.findOne({ extension: pedido.extension });
    if (!restaurante || !token || token !== restaurante.token) {
      return res.status(403).json({ error: 'Acceso no autorizado' });
    }

    const jornadaActiva = await Jornada.findOne({ extension: pedido.extension, estado: 'abierta' });
    if (!jornadaActiva) {
      return res.status(400).json({ error: 'No hay jornada iniciada. No se pueden aceptar pedidos.' });
    }

    const domicilio = valorDomicilio !== undefined ? Number(valorDomicilio) : pedido.valorDomicilio || 0;
    const valorTotal = Number(pedido.valorPedido) + domicilio;

    const pedidoActualizado = await Pedido.findByIdAndUpdate(
      id,
      { 
        estado: 'aceptado',
        valorDomicilio: domicilio,
        valorTotal: valorTotal,
        jornadaId: jornadaActiva._id,
        fechaActualizacion: moment().tz('America/Bogota').toDate()
      },
      { new: true }
    );

    try {
      await ProcesarPedidoService.actualizarEstadisticasSiAceptado(pedidoActualizado);
      console.log('✅ Estadísticas actualizadas para pedido:', pedidoActualizado._id);
    
      if (pedidoActualizado.jornadaId) {
        await Jornada.findByIdAndUpdate(
          pedidoActualizado.jornadaId,
          {
            $inc: {
              totalPedidos: 1,
              totalVentas: pedidoActualizado.valorTotal || 0
            }
          }
        );
      }
    } catch (statsError) {
      console.error('❌ Error actualizando estadísticas:', statsError);
    }

    if (req.io) {
      req.io.to(pedido.extension).emit('pedido-aceptado', pedidoActualizado);
    }

    res.json({ 
      success: true, 
      pedido: pedidoActualizado,
      message: 'Pedido aceptado correctamente'
    });

  } catch (error) {
    console.error('Error aceptando pedido:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rechazar pedido
router.put('/:id/rechazar', async (req, res) => {
    try {
        const { id } = req.params;
        const { token, motivo } = req.query;

        const pedido = await Pedido.findById(id);
        if (!pedido) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

        const restaurante = await RestauranteEstadisticas.findOne({ 
            extension: pedido.extension 
        });
        
        if (!restaurante || !token || token !== restaurante.token) {
            return res.status(403).json({ error: 'Acceso no autorizado' });
        }

        const pedidoActualizado = await Pedido.findByIdAndUpdate(
            id,
            { 
                estado: 'rechazado',
                motivoRechazo: motivo || 'Sin motivo especificado',
                fechaActualizacion: new Date()
            },
            { new: true }
        );

        if (req.io) {
            req.io.to(pedido.extension).emit('pedido-rechazado', pedidoActualizado);
        }

        res.json({ success: true, pedido: pedidoActualizado });
    } catch (error) {
        console.error('Error rechazando pedido:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;