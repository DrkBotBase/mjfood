const path = require('path');
const fs = require('fs').promises;

const menusPath = path.join(__dirname, '../data/menus');

async function cargarMenusDesdeArchivos() {
  const menusCargados = {};

  try {
    const archivos = await fs.readdir(menusPath);
    
    const archivosJson = archivos.filter(archivo => archivo.toLowerCase().endsWith('.json'));

    const resultados = await Promise.all(
      archivosJson.map(async (archivo) => {
        const filePath = path.join(menusPath, archivo);
        try {
          const contenido = await fs.readFile(filePath, 'utf8');
          const menuData = JSON.parse(contenido);

          if (menuData.config?.extension) {
            menusCargados[menuData.config.extension] = menuData;
          } else {
            console.warn(`⚠️  ${archivo} ignorado: falta 'config.extension'`);
          }
        } catch (err) {
          console.error(`❌ Error procesando ${archivo}:`, err.message);
        }
      })
    );

  } catch (err) {
    if (err.code === 'ENOENT') {
      console.warn('⚠️  Carpeta de menús no encontrada. Creándola...');
      await fs.mkdir(menusPath, { recursive: true });
    } else {
      console.error('❌ Error leyendo carpeta de menús:', err.message);
    }
  }

  return menusCargados;
}

module.exports = { cargarMenusDesdeArchivos };