// procesarPedido.js (actualizado)
const ProcesarPedidoService = require('./services/procesarPedidoService');
const fs = require('fs').promises;
const path = require('path');
const { cargarMenusDesdeArchivos } = require('./recargarMenus');

async function procesarPedido(extension, customer) {
  try {
    const resultado = await ProcesarPedidoService.procesarPedido(extension, customer);
    const estadisticas = await RestauranteEstadisticas.findOne({ extension });
    if (estadisticas && estadisticas.totalPedidos % 10 === 0) {
      await actualizarOrdenRestaurante(extension, estadisticas);
    }
    return resultado;
  } catch (err) {
    console.error('❌ Error procesando pedido:', err.message);
    throw err;
  }
}
async function actualizarOrdenRestaurante(extension, estadisticas) {
  estadisticas.orden = Math.max(1, estadisticas.orden - 1);
  const filePath = path.join(__dirname, '..', 'data', 'menus', `${extension}.json`);
  try {
    const contenido = await fs.readFile(filePath, 'utf8');
    const menuData = JSON.parse(contenido);
    menuData.config.orden = estadisticas.orden;
    await fs.writeFile(filePath, JSON.stringify(menuData, null, 2), 'utf8');
    if (typeof cargarMenusDesdeArchivos === 'function') {
      global.menus = await cargarMenusDesdeArchivos();
    }
  } catch (err) {
    console.error(`⚠️ Error actualizando JSON:`, err.message);
  }
  await estadisticas.save();
}

module.exports = { procesarPedido };