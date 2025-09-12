const RestaurantePuntos = require('../models/restaurantes_puntos');
const fs = require('fs').promises;
const path = require('path');
const { cargarMenusDesdeArchivos } = require('./recargarMenus');

async function procesarPedido(extension, customer) {
  try {
    let registro = await RestaurantePuntos.findOne({ extension: extension });

    if (!registro) {
      // Primer pedido: crear registro en MongoDB
      registro = new RestaurantePuntos({
        extension: extension,
        puntos: 1,
        orden: 999,
        clientes: []
      });
      console.log(`🆕 Creado registro para restaurante ${extension}`);
    } else {
      registro.puntos += 1;
    }
    
    // Actualizar cliente
    let cliente = registro.clientes.find(c => c.phone === customer.phone);
    if (!cliente) {
      registro.clientes.push({
        phone: customer.phone,
        totalPedidos: 1,
        totalGastado: Number(customer.cashAmount) || 0
      });
    } else {
      cliente.totalPedidos += 1;
      cliente.totalGastado += Number(customer.cashAmount) || 0;
    }

    // Cada 10 pedidos: ajustar orden y actualizar JSON
    if (registro.puntos % 10 === 0) {
      registro.orden = Math.max(1, registro.orden - 1); // Mejora la posición (sube en la lista)
      console.log(`🎯 Restaurante ${extension} alcanzó ${registro.puntos} pedidos. Subiendo a orden ${registro.orden}`);

      // Actualizar JSON correspondiente
      const filePath = path.join(__dirname, '..', 'data', 'menus', `${extension}.json`);
      try {
        const contenido = await fs.readFile(filePath, 'utf8');
        const menuData = JSON.parse(contenido);
        menuData.config.orden = registro.orden;
        await fs.writeFile(filePath, JSON.stringify(menuData, null, 2), 'utf8');
        console.log(`📂 JSON de ${extension} actualizado con orden ${registro.orden}`);
      } catch (err) {
        console.error(`⚠️ No se pudo actualizar el JSON de ${extension}:`, err.message);
      }

      // Recargar menús en memoria
      if (typeof cargarMenusDesdeArchivos === 'function') {
        global.menus = await cargarMenusDesdeArchivos();
        console.log('🔄 Menús recargados automáticamente');
      }
    }

    await registro.save();
  } catch (err) {
    console.error('❌ Error procesando puntos del restaurante:', err.message);
  }
}

module.exports = { procesarPedido };