require('./utils/dbConnect');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const moment = require('moment-timezone');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  socket.on('joinRestaurante', (extension) => {
    socket.join(extension);
  });
  socket.on('disconnect', () => {});
});

const { info, PORT } = require('./config')
const { cargarMenusDesdeArchivos } = require('./utils/recargarMenus');
const RestauranteEstadisticas = require('./models/restaurante_estadisticas');
const Pedido = require('./models/pedido');
const ProcesarPedidoService = require('./services/procesarPedidoService');
const RestaurantePuntos = require('./models/restaurantes_puntos');


//const estadisticas = require('./routes/estadisticas');
const jornadaRouter = require('./routes/jornada');
const pedidosRouter = require('./routes/pedidos');
const ticketRoutes = require('./routes/tickets');
//app.use('/estadisticas', pedidosRouter);
app.use('/api/jornada', jornadaRouter);
app.use('/api/pedidos', pedidosRouter);
app.use('/facturas', ticketRoutes);

let menus = {};
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
    
    const idsExcluir = ['demo'];
    
    function procesarHorario(schedule) {
      const ahora = moment().tz('America/Bogota');
      const dayOfWeek = ahora.day();
      const currentTime = parseInt(ahora.format('HHmm'));
      
      const hoy = schedule.find(s => s.day === dayOfWeek);
      const ayer = schedule.find(s => s.day === (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      const checkIfOpen = (sched) => {
        if (!sched || sched.open === 'closed') return false;
        const openTime = parseInt(sched.open.replace(':', ''));
        const closeTime = parseInt(sched.close.replace(':', ''));
        if (isNaN(openTime) || isNaN(closeTime)) return false;
        
        if (closeTime < openTime) {
          return currentTime >= openTime || currentTime < closeTime;
        }
        return currentTime >= openTime && currentTime < closeTime;
      };
      
      let estaAbierto = false;
      if (checkIfOpen(hoy)) {
        estaAbierto = true;
      } else if (
        checkIfOpen(ayer) &&
        ayer.close.replace(':', '') < ayer.open.replace(':', '') &&
        currentTime < parseInt(ayer.close.replace(':', ''))
      ) {
        estaAbierto = true;
      }
      
      const aperturaStr = (!hoy || hoy.open === 'closed') ? 'Cerrado' : hoy.open;
      const cierreStr = (!hoy || hoy.open === 'closed') ? 'Cerrado' : hoy.close;
      
      return {
        abierto: estaAbierto,
        aperturaStr,
        cierreStr
      };
    }
    
    let restaurantesInfo = Object.values(menus)
      .filter(menu => !idsExcluir.includes(menu.config.extension))
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

app.post('/api/pedido/:extension', async (req, res) => {
  const { extension } = req.params;
  const customer = req.body;
  
  try {
    await ProcesarPedidoService.procesarPedido(extension, customer, req.io);
    res.json({ success: true, message: 'Pedido procesado correctamente' });
  } catch (err) {
    console.error('Error procesando pedido:', err);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});
app.get('/api/panel/:extension/estadisticas', async (req, res) => {
  const { extension } = req.params;
  const { token } = req.query;

  try {
    const restaurante = await RestauranteEstadisticas.findOne({ extension });
    if (!restaurante || !token || token !== restaurante.token) {
      return res.status(403).json({ error: 'Acceso no autorizado' });
    }

    const estadisticas = {
      totalPedidos: restaurante.totalPedidos,
      totalGastado: restaurante.totalGastado,
      totalClientes: restaurante.clientes.length,
      ultimaActualizacion: restaurante.ultimaActualizacion
    };

    res.json(estadisticas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get('/api/panel/:extension/ranking-clientes', async (req, res) => {
  const { extension } = req.params;
  const { token } = req.query;

  try {
    const restaurante = await RestauranteEstadisticas.findOne({ extension });
    if (!restaurante || !token || token !== restaurante.token) {
      return res.status(403).json({ error: 'Acceso no autorizado' });
    }
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
app.get('/api/panel/:extension/estadisticas-periodo', async (req, res) => {
    const { extension } = req.params;
    const { token, periodo } = req.query;
    try {
        const restaurante = await RestauranteEstadisticas.findOne({ extension });
        if (!restaurante || !token || token !== restaurante.token) {
            return res.status(403).json({ error: 'Acceso no autorizado' });
        }

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
app.get('/api/panel/:extension/historial-pedidos', async (req, res) => {
  const { extension } = req.params;
  const { token, page = 1, limit = 20, desde, hasta } = req.query;
  try {
    const restaurante = await RestauranteEstadisticas.findOne({ extension });
    if (!restaurante || !token || token !== restaurante.token) {
      return res.status(403).json({ error: 'Acceso no autorizado' });
    }

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
app.get('/:extension/panel', async (req, res) => {
  const { extension } = req.params;
  const { token } = req.query;
  try {
    let restaurante = await RestauranteEstadisticas.findOne({ extension });
    
    if (!restaurante) {
      const nuevoToken = require('crypto').randomBytes(20).toString('hex');
      
      restaurante = new RestauranteEstadisticas({
        extension: extension,
        nombre: `Restaurante ${extension}`,
        token: nuevoToken,
        totalPedidos: 0,
        totalGastado: 0,
        clientes: [],
        estadisticasDiarias: [],
        estadisticasSemanales: [],
        estadisticasMensuales: [],
        ultimaActualizacion: moment().tz('America/Bogota').toDate()
      });
      
      await restaurante.save();
      
      return res.render('panel-login', {
        extension: extension,
        token: nuevoToken,
        message: 'Restaurante creado automáticamente. Usa este token para acceder:'
      });
    }

    if (!token || token !== restaurante.token) {
      return res.render('panel-login', {
        extension: extension,
        //token: restaurante.token,
        error: token ? 'Token inválido' : 'Token requerido'
      });
    }

    const hoy = moment().tz('America/Bogota').format('YYYY-MM-DD');
    const estadisticasHoy = restaurante.estadisticasDiarias.find(d => d.dia === hoy) || {
      totalPedidos: 0,
      totalGastado: 0
    };

    const semanaActual = moment().tz('America/Bogota').format('YYYY-WW');
    const estadisticasSemana = restaurante.estadisticasSemanales.find(s => s.semana === semanaActual) || {
      totalPedidos: 0,
      totalGastado: 0
    };

    const mesActual = moment().tz('America/Bogota').format('YYYY-MM');
    const estadisticasMes = restaurante.estadisticasMensuales.find(m => m.mes === mesActual) || {
      totalPedidos: 0,
      totalGastado: 0
    };

    // Top 10 clientes
    const topClientes = restaurante.clientes
      .sort((a, b) => b.totalGastado - a.totalGastado)
      .slice(0, 10)
      .map((cliente, index) => ({
        posicion: index + 1,
        telefono: cliente.phone,
        totalPedidos: cliente.totalPedidos,
        totalGastado: cliente.totalGastado
      }));

    res.render('panel', {
      restaurante: extension,
      token: token,
      estadisticas: {
        generales: {
          totalPedidos: restaurante.totalPedidos,
          totalGastado: restaurante.totalGastado,
          totalClientes: restaurante.clientes.length
        },
        hoy: estadisticasHoy,
        semana: estadisticasSemana,
        mes: estadisticasMes
      },
      topClientes: topClientes,
      puntos: restaurante.totalPedidos,
      orden: 999,
      clientes: topClientes
    });

  } catch (error) {
    console.error('Error cargando panel:', error);
    res.status(500).render('error', { 
      info,
      name_page: 'error 404',
      message: 'Error interno del servidor',
      restaurantesDisponibles: []
    });
  }
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

(async () => {
  menus = await cargarMenusDesdeArchivos();
  console.log(`Carga inicial completada: ${Object.keys(menus).length} restaurantes cargados`);
  app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
  });
})();