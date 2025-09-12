require('./utils/dbConnect');
const express = require('express');
const mongoose = require('mongoose');
const moment = require('moment-timezone');
const path = require('path');
const app = express();

const { info, PORT } = require('./config')
const { cargarMenusDesdeArchivos } = require('./utils/recargarMenus');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

const RestaurantePuntos = require('./models/restaurantes_puntos');
let menus = {};

app.get('/', async (req, res) => {
  try {
    const { sort, filter, search, page = 1, limit = 6 } = req.query;
    const currentPage = parseInt(page);
    const itemsPerPage = parseInt(limit);
    
    const puntosDB = await RestaurantePuntos.find().lean();
    const puntosMap = Object.fromEntries(puntosDB.map(r => [r.extension, r.puntos || 0]));
    
    let restaurantesInfo = Object.values(menus)
      .map(menu => {
        const horario = procesarHorario(menu.config);
        
        // Obtener hora actual en zona horaria de Colombia
        const ahora = moment().tz('America/Bogota');
        const horaActual = ahora.hours() + (ahora.minutes() / 60);
        
        let estaAbierto = false;
        if (horario.cierreDecimal < horario.aperturaDecimal) {
          // Horario que cruza medianoche (ej: 20:00 a 02:00)
          estaAbierto = horaActual >= horario.aperturaDecimal || horaActual < (horario.cierreDecimal - 24);
        } else {
          // Horario normal (ej: 08:00 a 22:00)
          estaAbierto = horaActual >= horario.aperturaDecimal && horaActual < horario.cierreDecimal;
        }
        
        return {
          id: menu.config.extension,
          name: menu.config.nombre,
          hours: horario,
          address: menu.config.direccion || '',
          phone: menu.config.telefonoWhatsApp,
          logo: menu.config.logoUrl || '/assets/fondos/mjfood.png',
          isOpen: estaAbierto,
          popularity: puntosMap[menu.config.extension] || 0,
          category: menu.config.category || 'general',
          priceRange: menu.config.priceRange || 2, // Valor medio por defecto
          services: menu.config.services || [],
          tags: menu.config.tags || []
        };
      });

    // filtros
    if (filter === 'open') {
      restaurantesInfo = restaurantesInfo.filter(r => r.isOpen);
    } else if (filter === 'closed') {
      restaurantesInfo = restaurantesInfo.filter(r => !r.isOpen);
    }

    // búsqueda
    if (search) {
      const searchTerm = search.toLowerCase();
      restaurantesInfo = restaurantesInfo.filter(r => 
        r.name.toLowerCase().includes(searchTerm)
      );
    }

    // ordenamiento
    if (sort === 'az') {
      restaurantesInfo.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'open') {
      restaurantesInfo.sort((a, b) => {
        if (a.isOpen && !b.isOpen) return -1;
        if (!a.isOpen && b.isOpen) return 1;
        return 0;
      });
    } else {
      //restaurantesInfo.sort((a, b) => b.popularity - a.popularity);
      restaurantesInfo.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Calcular paginación
    const totalItems = restaurantesInfo.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const paginatedRestaurants = restaurantesInfo.slice(startIndex, endIndex);
    
    res.render('index', { 
      info,
      restaurantes: paginatedRestaurants,
      pagination: {
        currentPage: currentPage,
        totalPages: totalPages,
        hasPrev: currentPage > 1,
        hasNext: currentPage < totalPages,
        prevPage: currentPage - 1,
        nextPage: currentPage + 1
      },
      currentSort: sort || 'popularity',
      currentFilter: filter || 'all',
      searchTerm: search || '',
      totalItems: totalItems
    });
  } catch (error) {
    console.error('Error en la ruta principal:', error);
    res.status(500).render('error', {
      message: 'Error al cargar los restaurantes',
      restaurantesDisponibles: []
    });
  }
});
app.get('/manifest.json', (req, res) => {
  const manifest = {
    short_name: info.name_page,
    name: `${info.name_page} - Directorio`,
    description: info.desc,
    theme_color: info.colorTheme,
    background_color: info.colorTheme,
    "display": "standalone",
    "orientation": "portrait",
    "start_url": "/",
    "scope": "/",
    "icons": [
      {
        "src": "/assets/fondos/mjfood.png",
        "sizes": "512x512",
        "type": "image/png"
      }
    ],
    "categories": ["food", "restaurant"],
    "lang": "es"
  };
  
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(manifest));
});

app.get('/:restaurante', (req, res) => {
  const restauranteData = menus[req.params.restaurante];
 
  if (!restauranteData) {
    const restaurantesDisponibles = Object.values(menus)
      .sort((a, b) => (a.config.orden ?? 999) - (b.config.orden ?? 999))
      .map(menu => ({
        id: menu.config.extension,
        nombre: menu.config.nombre
      }));

    return res.status(404).render('error', {
      message: 'Restaurante no encontrado',
      restaurantesDisponibles
    });
  }

  const horarioNormalizado = procesarHorario(restauranteData.config);

  res.render('menu', {
    name_page: restauranteData.config.nombre,
    restaurante: req.params.restaurante,
    restauranteConfig: restauranteData.config,
    menuData: restauranteData.menu,
    config: restauranteData.config,
    horarioRestaurante: horarioNormalizado
  });
});
app.get('/:restaurante/sw.js', (req, res) => {
  const extension = req.params.restaurante;
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
    // Service Worker para el restaurante ${extension}
    const CACHE_NAME = 'restaurant-${extension}-v1';
    const urlsToCache = [
      '/restaurant/${extension}',
      '/js/pwa-handler.js',
      '/assets/icons/icon-192x192.png',
      '/assets/icons/icon-512x512.png'
    ];

    self.addEventListener('install', event => {
      event.waitUntil(
        caches.open(CACHE_NAME)
          .then(cache => cache.addAll(urlsToCache))
      );
    });

    self.addEventListener('fetch', event => {
      event.respondWith(
        caches.match(event.request)
          .then(response => response || fetch(event.request))
      );
    });
    
    // Manejar mensajes desde la app
    self.addEventListener('message', event => {
      if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
      }
    });
  `);
});
app.get('/:restaurante/manifest.json', (req, res) => {
  const restauranteData = menus[req.params.restaurante];
  if (!restauranteData) {
    return res.status(404).json({ error: 'Restaurante no encontrado' });
  }

  const pwaConfig = restauranteData.config.pwa || {};
  const manifest = {
    short_name: pwaConfig.short_name || restauranteData.config.nombre,
    name: pwaConfig.name || `${restauranteData.config.nombre} - Menú Digital`,
    description: pwaConfig.description || `App de pedidos para ${restauranteData.config.nombre}`,
    theme_color: pwaConfig.theme_color || "#0a0a0aff",
    background_color: pwaConfig.background_color || "#0a0a0aff",
    display: pwaConfig.display || "standalone",
    start_url: pwaConfig.start_url || `/${req.params.restaurante}/`,
    scope: pwaConfig.scope || `/${req.params.restaurante}/`,
    icons: pwaConfig.icons || [{
      "src": `/assets/fondos/mjfood.png`,
      "sizes": "512x512",
      "type": "image/png"
    }],
    categories: pwaConfig.categories || ["food", "restaurant"],
    lang: pwaConfig.lang || "es"
  };

  res.json(manifest);
});

const { procesarPedido } = require('./utils/procesarPedido');
app.post('/api/pedido/:extension', express.json(), async (req, res) => {
  const { extension } = req.params;
  const customer = req.body;
  
  try {
    await procesarPedido(extension, customer);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// admin
app.get('/admin/recargar-menus', async (req, res) => {
  console.log('\n🔄 Recargando menús manualmente...');
  menus = await cargarMenusDesdeArchivos();

  const ordenados = Object.values(menus)
    .sort((a, b) => (a.config.orden ?? 999) - (b.config.orden ?? 999))
    .map(menu => menu.config.extension);

  res.json({
    success: true,
    message: `Menús recargados. ${ordenados.length} restaurantes cargados`,
    restaurantes: ordenados
  });
});
/*app.get('/admin/clientes/:extension', async (req, res) => {
  const { extension } = req.params;
  const registro = await RestaurantePuntos.findOne({ extension }).lean();

  if (!registro) {
    return res.json({ success: false, message: 'Restaurante no encontrado' });
  }

  const ranking = registro.clientes
    .sort((a, b) => b.totalGastado - a.totalGastado) // por dinero gastado
    .map(c => ({
      phone: c.phone,
      pedidos: c.totalPedidos,
      gastado: c.totalGastado
    }));

  res.json({ success: true, clientes: ranking });
});*/
app.get('/:extension/panel', async (req, res) => {
  const { extension } = req.params;
  const { token } = req.query;

  const registro = await RestaurantePuntos.findOne({ extension }).lean();

  if (!registro) {
    return res.status(404).send('Restaurante no encontrado');
  }

  // Validar token
  if (!token || token !== registro.token) {
    return res.status(403).send('Acceso denegado. Token inválido');
  }

  // Ordenar clientes por dinero gastado
  const ranking = registro.clientes
    .sort((a, b) => b.totalGastado - a.totalGastado)
    .map((c, i) => ({
      pos: i + 1,
      phone: c.phone,
      pedidos: c.totalPedidos,
      gastado: c.totalGastado
    }));

  res.render('panel', {
    restaurante: registro.extension,
    puntos: registro.puntos,
    orden: registro.orden,
    clientes: ranking
  });
});

app.get('/ping', (req, res) => {
  res.send('Pong');
});

setInterval(() => {
  fetch(`${info.dominio}/ping`)
    .then(res => console.log('Ping interno enviado:', res.status))
    .catch(err => console.error('Error en el ping:', err.message));
}, 14 * 60 * 1000);

function parseHoraToDecimal(horaStr) {
  const [horas, minutos] = horaStr.replace(':', '.').split('.').map(Number);
  return horas + (minutos / 60);
}
function formatHora(horaDecimal) {
  const horas = Math.floor(horaDecimal % 24);
  const minutos = Math.round((horaDecimal - Math.floor(horaDecimal)) * 60);
  return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
}
function procesarHorario(config) {
  let apertura = parseHoraToDecimal(config.horarioApertura);
  let cierre = parseHoraToDecimal(config.horarioCierre);

  if (cierre < apertura) {
    cierre += 24;
  }

  return {
    aperturaDecimal: apertura,
    cierreDecimal: cierre,
    aperturaStr: formatHora(apertura),
    cierreStr: formatHora(cierre)
  };
}

(async () => {
  menus = await cargarMenusDesdeArchivos();
  console.log(`Carga inicial completada: ${Object.keys(menus).length} restaurantes cargados`);

  app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
  });
})();