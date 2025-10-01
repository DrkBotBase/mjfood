// procesarPedido.js (actualizado)
const ProcesarPedidoService = require('./services/procesarPedidoService');
const fs = require('fs').promises;
const path = require('path');
const { cargarMenusDesdeArchivos } = require('./recargarMenus');

async function procesarPedido(extension, customer) {
  try {
    // Procesar el pedido con el nuevo servicio
    const resultado = await ProcesarPedidoService.procesarPedido(extension, customer);
    
    // Mantener la lógica original de actualización cada 10 pedidos
    const estadisticas = await RestauranteEstadisticas.findOne({ extension });
    
    if (estadisticas && estadisticas.totalPedidos % 10 === 0) {
      // Tu lógica existente para actualizar el orden
      await actualizarOrdenRestaurante(extension, estadisticas);
    }

    return resultado;

  } catch (err) {
    console.error('❌ Error procesando pedido:', err.message);
    throw err;
  }
}

async function actualizarOrdenRestaurante(extension, estadisticas) {
  // Mantener tu lógica original de actualización
  estadisticas.orden = Math.max(1, estadisticas.orden - 1);
  
  const filePath = path.join(__dirname, '..', 'data', 'menus', `${extension}.json`);
  try {
    const contenido = await fs.readFile(filePath, 'utf8');
    const menuData = JSON.parse(contenido);
    menuData.config.orden = estadisticas.orden;
    await fs.writeFile(filePath, JSON.stringify(menuData, null, 2), 'utf8');
    
    // Recargar menús
    if (typeof cargarMenusDesdeArchivos === 'function') {
      global.menus = await cargarMenusDesdeArchivos();
    }
  } catch (err) {
    console.error(`⚠️ Error actualizando JSON:`, err.message);
  }
  
  await estadisticas.save();
}

module.exports = { procesarPedido };