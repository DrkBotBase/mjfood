// controllers/estadisticasController.js
const Pedido = require('../models/pedido');
const EstadisticasJornada = require('../models/estadisticas_jornada');
const RestauranteEstadisticas = require('../models/restaurante_estadisticas'); // si aún quieres usarlo
const moment = require('moment-timezone');

class EstadisticasController {
  async obtenerEstadisticasGenerales(req, res) {
    try {
      const { extension } = req.params;
      
      const estadisticas = await RestauranteEstadisticas.findOne({ extension });

      if (!estadisticas) {
        return res.status(404).json({
          message: 'No se encontraron estadísticas para este restaurante'
        });
      }

      res.json({
        totalPedidos: estadisticas.totalPedidos,
        totalGastado: estadisticas.totalGastado,
        totalClientes: estadisticas.clientes.length,
        ultimaActualizacion: estadisticas.ultimaActualizacion
      });

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async obtenerEstadisticasDiarias(req, res) {
    try {
      const { extension, fecha } = req.params;
      const fechaObj = fecha ? moment(fecha).tz('America/Bogota') : moment().tz('America/Bogota');

      const inicioDia = fechaObj.clone().startOf('day').toDate();
      const finDia = fechaObj.clone().endOf('day').toDate();

      const jornadasDia = await EstadisticasJornada.find({
        extension,
        fechaInicio: { $gte: inicioDia, $lte: finDia }
      });

      const totalPedidos = jornadasDia.reduce((sum, j) => sum + j.totalPedidos, 0);
      const totalGastado = jornadasDia.reduce((sum, j) => sum + j.totalGastado, 0);

      res.json({
        fecha: fechaObj.format('YYYY-MM-DD'),
        totalPedidos,
        totalGastado,
        jornadas: jornadasDia
      });

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async obtenerEstadisticasSemanales(req, res) {
    try {
      const { extension } = req.params;
      const inicioSemana = moment().tz('America/Bogota').startOf('week').toDate();
      const finSemana = moment().tz('America/Bogota').endOf('week').toDate();

      const jornadasSemana = await EstadisticasJornada.find({
        extension,
        fechaInicio: { $gte: inicioSemana, $lte: finSemana }
      });

      const totalPedidos = jornadasSemana.reduce((sum, j) => sum + j.totalPedidos, 0);
      const totalGastado = jornadasSemana.reduce((sum, j) => sum + j.totalGastado, 0);

      res.json({
        semana: moment().tz('America/Bogota').format('YYYY-WW'),
        totalPedidos,
        totalGastado,
        jornadas: jornadasSemana
      });

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async obtenerEstadisticasMensuales(req, res) {
    try {
      const { extension } = req.params;
      const inicioMes = moment().tz('America/Bogota').startOf('month').toDate();
      const finMes = moment().tz('America/Bogota').endOf('month').toDate();

      const jornadasMes = await EstadisticasJornada.find({
        extension,
        fechaInicio: { $gte: inicioMes, $lte: finMes }
      });

      const totalPedidos = jornadasMes.reduce((sum, j) => sum + j.totalPedidos, 0);
      const totalGastado = jornadasMes.reduce((sum, j) => sum + j.totalGastado, 0);

      res.json({
        mes: moment().tz('America/Bogota').format('YYYY-MM'),
        totalPedidos,
        totalGastado,
        jornadas: jornadasMes
      });

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async obtenerHistorialPedidos(req, res) {
    try {
      const { extension } = req.params;
      const { desde, hasta, limit = 50, page = 1 } = req.query;

      let filtro = { extension };

      if (desde && hasta) {
        filtro.fechaPedido = {
          $gte: new Date(desde),
          $lte: new Date(hasta)
        };
      }

      const skip = (page - 1) * limit;

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
          paginas: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new EstadisticasController();