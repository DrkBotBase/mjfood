// routes/estadisticas.js
const express = require('express');
const router = express.Router();
const estadisticasController = require('../controllers/estadisticasController');
const RestauranteEstadisticas = require('../models/restaurante_estadisticas');
const Pedido = require('../models/pedido');
const moment = require('moment-timezone');

router.get('/:extension/estadisticas', estadisticasController.obtenerEstadisticasGenerales);
router.get('/:extension/dia/:fecha', estadisticasController.obtenerEstadisticasDiarias);
router.get('/:extension/semana', estadisticasController.obtenerEstadisticasSemanales);
router.get('/:extension/mes', estadisticasController.obtenerEstadisticasMensuales);
router.get('/:extension/historial', estadisticasController.obtenerHistorialPedidos);
router.get('/:extension/ranking-clientes', async (req, res) => {
  const { extension } = req.params;
  try {
    const restaurante = await RestauranteEstadisticas.findOne({ extension });
    const ranking = restaurante.clientes
      .sort((a, b) => b.totalGastado - a.totalGastado)
      .map((cliente, index) => ({
        posicion: index + 1,
        telefono: cliente.phone,
        totalPedidos: cliente.totalPedidos,
        totalGastado: cliente.totalGastado,
        ultimoPedido: cliente.ultimoPedido
      }));

    res.json(ranking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.get('/:extension/estadisticas-periodo', async (req, res) => {
    const { extension } = req.params;
    const { periodo } = req.query;
    try {
        const restaurante = await RestauranteEstadisticas.findOne({ extension });
        let datos;
        const now = moment().tz('America/Bogota');
        switch (periodo) {
            case 'hoy':
                const hoy = now.format('YYYY-MM-DD');
                const estadisticaHoy = restaurante.estadisticasDiarias.find(d => d.dia === hoy) || {
                    totalPedidos: 0,
                    totalGastado: 0,
                    efectivo: 0,
                    transferencia: 0
                };
                datos = estadisticaHoy;
                break;

            case 'semana':
                const semana = now.format('YYYY-WW');
                const estadisticaSemana = restaurante.estadisticasSemanales.find(s => s.semana === semana) || {
                    semana,
                    totalPedidos: 0,
                    totalGastado: 0,
                    efectivo: 0,
                    transferencia: 0
                };
                datos = estadisticaSemana;
                break;

            case 'mes':
                const mes = now.format('YYYY-MM');
                const estadisticaMes = restaurante.estadisticasMensuales.find(m => m.mes === mes) || {
                    mes,
                    totalPedidos: 0,
                    totalGastado: 0,
                    efectivo: 0,
                    transferencia: 0
                };
                datos = estadisticaMes;
                break;

            default:
                return res.status(400).json({ error: 'Período no válido' });
        }

        res.json(datos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/:extension/historial-pedidos', async (req, res) => {
  const { extension } = req.params;
  const { page = 1, limit = 20, desde, hasta } = req.query;
  try {
    const restaurante = await RestauranteEstadisticas.findOne({ extension });

    const skip = (page - 1) * limit;
    let filtro = { extension };

    if (desde && hasta) {
      filtro.fechaPedido = {
        $gte: new Date(desde),
        $lte: new Date(hasta)
      };
    }

    const pedidos = await Pedido.find(filtro)
      .sort({ fechaPedido: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Pedido.countDocuments(filtro);

    res.json({
      pedidos,
      paginacion: {
        pagina: parseInt(page),
        limite: parseInt(limit),
        total,
        totalPaginas: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;