// routes/estadisticas.js
const express = require('express');
const router = express.Router();
const estadisticasController = require('../controllers/estadisticasController');

// Estadísticas generales
router.get('/:extension', estadisticasController.obtenerEstadisticasGenerales);

// Estadísticas por día
router.get('/:extension/dia/:fecha', estadisticasController.obtenerEstadisticasDiarias);

// Estadísticas semanales
router.get('/:extension/semana', estadisticasController.obtenerEstadisticasSemanales);

// Estadísticas mensuales
router.get('/:extension/mes', estadisticasController.obtenerEstadisticasMensuales);

// Historial de pedidos
router.get('/:extension/historial', estadisticasController.obtenerHistorialPedidos);

module.exports = router;