require("dotenv").config()
const express = require('express');
const moment = require('moment-timezone');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const session = require('express-session');
const { info, PORT } = require('./config');

app.use((req, res, next) => {
  req.io = io;
  next();
});

io.on('connection', (socket) => {
  socket.on('joinRoom', (room) => {
    socket.join(room);
  });
  socket.on('disconnect', () => {});
  const pedidosController = require('./controllers/pedidosController');
  socket.on('nuevo:pedido', (pedidoData) => {
    pedidosController.registrarPedido(io, socket, pedidoData);
  });
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  const maintenance = process.env.MAINTENANCE === 'true';
  if (maintenance) {
    return res.status(503).render('mantenimiento', {
      name_page: 'MJFOOD - Fuera de servicio',
      message: 'Trabajamos para estar de vuelta pronto.',
      info
    });
  }
  next();
});

const { cargarMenusDesdeArchivos } = require('./utils/recargarMenus');

app.use(session({
  secret: process.env.SECRET_KEY,
  resave: false,
  saveUninitialized: true
}));

const adminRoutes = require('./routes/admin');
const pedidosRouter = require('./routes/pedidos');
const jornadaRouter = require('./routes/jornada');
const estadisticasRouter = require('./routes/estadisticas');
app.use('/admin', adminRoutes);
app.use('/pedidos', pedidosRouter);
app.use('/jornada', jornadaRouter);
app.use('/panel', estadisticasRouter);

let menus = {};
const IDS_EXCLUIR = ['demo'];
app.get('/', (req,res) => {
  try {
    res.render('index', {
      info
    });
  } catch (e) {
    console.error('Error en la ruta principal: ', e);
    res.status(500).render('error', {
      info,
      name_page: 'server error',
      message: 'Error interno.',
      restaurantesDisponibles: []
    });
  }
});
app.get('/lista', async (req, res) => {
  try {
    const { sort, filter, search, page = 1, limit = 6 } = req.query;
    const currentPage = parseInt(page);
    const itemsPerPage = parseInt(limit);
    
    function procesarHorario(schedule) {
        const ahora = moment().tz('America/Bogota');
        const dayOfWeek = ahora.day();
        const currentTime = parseInt(ahora.format('HHmm'));
        
        const hoy = schedule.find(s => s.day === dayOfWeek);
        const ayer = schedule.find(s => s.day === (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    
        const checkIfOpen = (sched) => {
            if (sched && sched.open === '24h') {
                return true;
            }
            
            if (!sched || sched.open === 'closed') {
                return false;
            }
            
            const openTime = parseInt(sched.open.replace(':', ''));
            const closeTime = parseInt(sched.close.replace(':', ''));
            if (isNaN(openTime) || isNaN(closeTime)) return false;
            
            if (closeTime < openTime) {
                return currentTime >= openTime || currentTime < closeTime;
            }
            return currentTime >= openTime && currentTime < closeTime;
        };
        
        let estaAbierto = false;
        
        if (hoy && hoy.open === '24h') {
            estaAbierto = true;
        } 
        
        else if (checkIfOpen(hoy)) {
            estaAbierto = true;
        } 
        
        else if (
            checkIfOpen(ayer) &&
            ayer.open !== '24h' &&
            ayer.close.replace(':', '') < ayer.open.replace(':', '') &&
            currentTime < parseInt(ayer.close.replace(':', ''))
        ) {
            estaAbierto = true;
        }
        
        let aperturaStr, cierreStr;
        
        if (!hoy || hoy.open === 'closed') {
            aperturaStr = 'Cerrado';
            cierreStr = 'Cerrado';
        } else if (hoy.open === '24h') {
            aperturaStr = '24 horas';
            cierreStr = '24 horas';
        } else {
            aperturaStr = hoy.open;
            cierreStr = hoy.close;
        }
        
        return {
            abierto: estaAbierto,
            aperturaStr,
            cierreStr
        };
    }
    
    let restaurantesInfo = Object.values(menus)
      .filter(menu => !IDS_EXCLUIR.includes(menu.config.extension))
      .map(menu => {
        const config = menu.config;
        const schedule = menu.schedule || [];
        
        const horario = procesarHorario(schedule);
        
        return {
          id: config.extension,
          name: config.nombre,
          address: config.direccion || '',
          phone: config.telefonoWhatsApp,
          logo: config.logoUrl || '/assets/banner.png',
          isOpen: horario.abierto,
          orden: parseInt(config.orden) || 0,
          category: config.category || 'general',
          hours: {
            aperturaStr: horario.aperturaStr,
            cierreStr: horario.cierreStr,
            schedule
          }
        };
      });
      
    if (filter === 'open') {
      restaurantesInfo = restaurantesInfo.filter(r => r.isOpen);
    } else if (filter === 'closed') {
      restaurantesInfo = restaurantesInfo.filter(r => !r.isOpen);
    }
    
    if (search) {
      const searchTerm = search.toLowerCase();
      restaurantesInfo = restaurantesInfo.filter(r => 
        r.name.toLowerCase().includes(searchTerm)
      );
    }

    if (sort === 'az') {
      restaurantesInfo.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'open') {
      restaurantesInfo.sort((a, b) => {
        if (a.isOpen && !b.isOpen) return -1;
        if (!a.isOpen && b.isOpen) return 1;
        return 0;
      });
    } else {
      restaurantesInfo.sort((a, b) => a.orden - b.orden);
    }
    
    const totalItems = restaurantesInfo.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const paginatedRestaurants = restaurantesInfo.slice(startIndex, endIndex);

    res.render('lista', {
      info,
      restaurantes: paginatedRestaurants,
      pagination: {
        currentPage,
        totalPages,
        hasPrev: currentPage > 1,
        hasNext: currentPage < totalPages,
        prevPage: currentPage - 1,
        nextPage: currentPage + 1
      },
      currentSort: sort || 'orden',
      currentFilter: filter || 'all',
      searchTerm: search || '',
      totalItems
    });

  } catch (error) {
    console.error('Error en la ruta lista:', error);
    res.status(500).render('error', {
      info,
      name_page: 'server error',
      message: 'Error al cargar los restaurantes',
      restaurantesDisponibles: []
    });
  }
});
app.get('/lista/manifest.json', (req, res) => {
  const manifest = {
    short_name: info.name_page,
    name: `${info.name_page} - Directorio`,
    description: info.desc,
    theme_color: info.colorTheme,
    background_color: info.colorTheme,
    "display": "standalone",
    "orientation": "portrait",
    "start_url": "/lista",
    "scope": "/lista",
    "icons": [
      {
        "src": "/assets/icon.png",
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
app.get('/ping', (req, res) => {
  res.send('Pong');
});
app.get('/publi', (req, res) => {
  res.render('iframe', {info});
});

app.get('/:restaurante', (req, res) => {
  const restauranteData = menus[req.params.restaurante];
  
  if (!restauranteData) {
    const restaurantesDisponibles = Object.values(menus)
      .filter(menu => !IDS_EXCLUIR.includes(menu.config.extension))
      .sort((a, b) => (a.config.orden ?? 999) - (b.config.orden ?? 999))
      .map(menu => ({
        id: menu.config.extension,
        nombre: menu.config.nombre
      }));
      
    return res.status(404).render('error', {
      info,
      name_page: 'error 404',
      message: 'Restaurante no encontrado',
      restaurantesDisponibles
    });
  }

  res.render('menu', {
    info,
    menuData: restauranteData,
    config: restauranteData.config,
    manifestUrl: `/${req.params.restaurante}/manifest.json`,
    pwa: {
      icon: `/assets/${restauranteData.config.extension}/icon.png`,
      themeColor: restauranteData.config.pwa?.theme_color || '#ffffff',
      description: restauranteData.config.pwa?.description || `Menú digital de ${restauranteData.config.nombre}`,
      shortName: restauranteData.config.pwa?.short_name || restauranteData.config.nombre
    },
    color: restauranteData.config?.color
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
      '/assets/${extension}/icon.png'
      '/assets/${extension}/banner.png'
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

  const pwa = restauranteData.config.pwa || {};
  const manifest = {
    short_name: pwa.short_name || restauranteData.config.nombre,
    name: pwa.name || `${restauranteData.config.nombre} - Menú Digital`,
    description: pwa.description || `App de pedidos para ${restauranteData.config.nombre}`,
    theme_color: pwa.theme_color || "#0a0a0aff",
    background_color: pwa.background_color || "#0a0a0aff",
    display: pwa.display || "standalone",
    start_url: pwa.start_url || `/${req.params.restaurante}/`,
    scope: pwa.scope || `/${req.params.restaurante}/`,
    icons: pwa.icons || [{
      "src": `/assets/icon.png`,
      "sizes": "512x512",
      "type": "image/png"
    }],
    categories: pwa.categories || ["food", "restaurant"],
    lang: pwa.lang || "es"
  };

  res.json(manifest);
});

app.get('/admin/recargar-menus', async (req, res) => {
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

setInterval(() => {
  fetch(`${info.dominio}/ping`)
    .then(res => console.log('Ping interno enviado:', res.status))
    .catch(err => console.error('Error en el ping:', err.message));
}, 14 * 60 * 1000);

const { sincronizarUsuarios } = require('./utils/syncUsers');

(async () => {
  menus = await cargarMenusDesdeArchivos();
  console.log(`Carga inicial completada: ${Object.keys(menus).length} restaurantes cargados`);

  await sincronizarUsuarios();

  server.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
  });
})();