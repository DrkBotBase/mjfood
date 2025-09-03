const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

// Configuración
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Función para cargar todos los menús automáticamente
function cargarMenusAutomaticamente() {
  const menus = {};
  const menusPath = path.join(__dirname, 'data', 'menus');
  
  console.log('Buscando menús en:', menusPath);
  
  try {
    if (!fs.existsSync(menusPath)) {
      console.log('❌ La carpeta data/menus/ no existe');
      fs.mkdirSync(menusPath, { recursive: true });
      console.log('✅ Carpeta data/menus/ creada');
      return {};
    }
    
    const archivos = fs.readdirSync(menusPath);
    console.log('Archivos encontrados:', archivos);
    
    archivos.forEach(archivo => {
      if (archivo.endsWith('.json')) {
        try {
          const filePath = path.join(menusPath, archivo);
          const menuData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          
          if (menuData.config && menuData.config.extension) {
            const extension = menuData.config.extension;
            menus[extension] = menuData;
            console.log(`✅ ${archivo} → ${extension}`);
          } else {
            console.log(`⚠️  ${archivo} - No tiene extension válida`);
          }
        } catch (error) {
          console.log(`❌ Error cargando ${archivo}:`, error.message);
        }
      }
    });
    
    return menus;
  } catch (error) {
    console.log('❌ Error leyendo carpeta de menús:', error.message);
    return {};
  }
}

// Cargar menús al iniciar
const menus = cargarMenusAutomaticamente();

// Página de inicio con lista automática
app.get('/', (req, res) => {
  const restaurantesInfo = Object.keys(menus).map(key => {
    const config = menus[key].config;
    return {
      id: key,
      nombre: config.nombre,
      horario: `${config.horarioApertura}:00 - ${config.horarioCierre}:00`,
      telefono: config.telefonoWhatsApp
    };
  });
  
  res.render('index', {
    name_page: 'Nuestros Restaurantes',
    restaurantes: restaurantesInfo
  });
});

app.get('/:restaurante', (req, res) => {
    const { restaurante } = req.params;
    
    if (!menus[restaurante]) {
        return res.status(404).render('error', {
            message: 'Restaurante no encontrado',
            restaurantesDisponibles: Object.keys(menus).map(key => ({
                id: key,
                nombre: menus[key].config.nombre
            }))
        });
    }
    
    const restauranteData = menus[restaurante];
    
    res.render('menu', {
        name_page: restauranteData.config.nombre,
        restaurante: restaurante,
        restauranteConfig: restauranteData.config,
        menuData: restauranteData.menu,
        config: {
            horarioApertura: restauranteData.config.horarioApertura,
            horarioCierre: restauranteData.config.horarioCierre,
            colores: restauranteData.config.colores || {
                primario: "#10B981",
                secundario: "#F59E0B",
                fondo: "#2F384C",
                texto: "#F3F4F6"
            },
            // NUEVO: Pasar configuración de fondo
            fondo: restauranteData.config.fondo || {
                tipo: "color",
                valor: restauranteData.config.colores?.fondo || "#2F384C"
            },
            fuentes: restauranteData.config.fuentes,
            logo: restauranteData.config.logo || null
        }
    });
});
// Agrega esta ruta después de cargar los menús
app.get('/:restaurante/manifest.json', (req, res) => {
    const { restaurante } = req.params;
    
    if (!menus[restaurante]) {
        return res.status(404).json({ error: 'Restaurante no encontrado' });
    }
    
    const restauranteData = menus[restaurante];
    const pwaConfig = restauranteData.config.pwa || {};
    
    const manifest = {
        short_name: pwaConfig.short_name || restauranteData.config.nombre,
        name: pwaConfig.name || `${restauranteData.config.nombre} - Menú Digital`,
        description: pwaConfig.description || `App de pedidos para ${restauranteData.config.nombre}`,
        theme_color: pwaConfig.theme_color || "#10B981",
        background_color: pwaConfig.background_color || "#1F2937",
        display: pwaConfig.display || "standalone",
        orientation: pwaConfig.orientation || "portrait",
        scope: pwaConfig.scope || `/${restaurante}/`,
        start_url: pwaConfig.start_url || `/${restaurante}/`,
        icons: pwaConfig.icons || [
            {
                "src": "/assets/icons/icon-192x192.png",
                "sizes": "192x192",
                "type": "image/png",
                "purpose": "any maskable"
            }
        ],
        categories: pwaConfig.categories || ["food", "restaurant"],
        lang: pwaConfig.lang || "es"
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.json(manifest);
});

// Ruta para recargar menús sin reiniciar el servidor (útil durante desarrollo)
app.get('/admin/recargar-menus', (req, res) => {
  const nuevosMenus = cargarMenusAutomaticamente();
  Object.assign(menus, nuevosMenus);
  
  res.json({
    success: true,
    message: `Menús recargados. ${Object.keys(menus).length} restaurantes cargados`,
    restaurantes: Object.keys(menus)
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🍕 Servidor ejecutándose en http://localhost:${PORT}`);
  console.log('📋 Restaurantes cargados automáticamente:');
  
  Object.keys(menus).forEach(rest => {
    const config = menus[rest].config;
    console.log(`   → ${config.nombre}`);
    console.log(`     🌐 http://localhost:${PORT}/${rest}`);
    console.log(`     📞 WhatsApp: ${config.telefonoWhatsApp}`);
    console.log(`     ⏰ Horario: ${config.horarioApertura}:00-${config.horarioCierre}:00`);
    console.log(`     📊 Categorías: ${Object.keys(menus[rest].menu).length}`);
    console.log('     ──────────────────────────────');
  });
  
  console.log('\n🔄 Para recargar menús sin reiniciar: http://localhost:3000/admin/recargar-menus');
});
