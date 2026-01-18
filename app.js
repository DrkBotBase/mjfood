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

const seoRouter = require('./routes/seo')
const User = require('./models/User');
const adminRoutes = require('./routes/admin');
const pedidosRouter = require('./routes/pedidos');
const jornadaRouter = require('./routes/jornada');
const estadisticasRouter = require('./routes/estadisticas');
const likesRoutes = require('./routes/likes');
app.use("/", seoRouter)
app.use("/push", require('./routes/push'));
app.use('/likes', likesRoutes);
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

    const now = Date.now();
    const DAY_48H = 48 * 60 * 60 * 1000;

    const users = await User.find(
      {},
      { restauranteId: 1, createdAt: 1, 'likes.count': 1 }
    ).lean();

    const usersMap = {};
    users.forEach(u => {
      usersMap[u.restauranteId] = {
        likes: u.likes?.count || 0,
        createdAt: u.createdAt
      };
    });

    function procesarHorario(schedule) {
      const ahora = moment().tz('America/Bogota');
      const dayOfWeek = ahora.day();
      const currentTime = parseInt(ahora.format('HHmm'));

      const hoy = schedule.find(s => s.day === dayOfWeek);
      const ayer = schedule.find(s => s.day === (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

      const checkIfOpen = (sched) => {
        if (sched && sched.open === '24h') return true;
        if (!sched || sched.open === 'closed') return false;

        const openTime = parseInt(sched.open.replace(':', ''));
        const closeTime = parseInt(sched.close.replace(':', ''));

        if (closeTime < openTime) {
          return currentTime >= openTime || currentTime < closeTime;
        }
        return currentTime >= openTime && currentTime < closeTime;
      };

      let estaAbierto = checkIfOpen(hoy) || (
        checkIfOpen(ayer) &&
        ayer.close.replace(':', '') < ayer.open.replace(':', '') &&
        currentTime < parseInt(ayer.close.replace(':', ''))
      );

      return {
        abierto: estaAbierto,
        aperturaStr: hoy?.open || 'Cerrado',
        cierreStr: hoy?.close || 'Cerrado'
      };
    }

    let restaurantesInfo = Object.values(menus)
      .filter(menu => !IDS_EXCLUIR.includes(menu.config.extension))
      .map(menu => {
        const config = menu.config;
        const schedule = menu.schedule || [];
        const horario = procesarHorario(schedule);

        const userData = usersMap[config.extension];
        const isNew = userData?.createdAt
          ? (now - new Date(userData.createdAt).getTime()) < DAY_48H
          : false;

        return {
          id: config.extension,
          name: config.nombre,
          address: config.direccion || '',
          phone: config.telefonoWhatsApp,
          logo: config.logoUrl,
          isOpen: horario.abierto,
          orden: parseInt(config.orden) || 0,
          category: config.category || 'general',
          likes: userData?.likes || 0,
          isNew,
          hours: {
            aperturaStr: horario.aperturaStr,
            cierreStr: horario.cierreStr,
            schedule
          }
        };
      });

    if (filter === 'open') restaurantesInfo = restaurantesInfo.filter(r => r.isOpen);
    if (filter === 'closed') restaurantesInfo = restaurantesInfo.filter(r => !r.isOpen);

    if (search) {
      const s = search.toLowerCase();
      restaurantesInfo = restaurantesInfo.filter(r => r.name.toLowerCase().includes(s));
    }

    if (sort === 'az') {
      restaurantesInfo.sort((a, b) => a.name.localeCompare(b.name));
    } 
    else if (sort === 'open') {
      restaurantesInfo.sort((a, b) => {
        if (a.isOpen && !b.isOpen) return -1;
        if (!a.isOpen && b.isOpen) return 1;
        return 0;
      });
    } 
    else {
      restaurantesInfo.sort((a, b) => b.likes - a.likes);
    }

    const totalItems = restaurantesInfo.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedRestaurants = restaurantesInfo.slice(startIndex, startIndex + itemsPerPage);

    const carouselAds = restaurantesInfo
      .filter(r => r.isNew)
      .slice(0, 5);
    
    const promociones = require('./data/promociones');
    const promosActivas = promociones
      .filter(p => p.activo)
      .sort((a, b) => a.prioridad - b.prioridad);

    res.render('home', {
      info,
      restaurantes: paginatedRestaurants,
      carouselAds,
      promosActivas,
      pagination: {
        currentPage,
        totalPages,
        hasPrev: currentPage > 1,
        hasNext: currentPage < totalPages
      },
      currentSort: sort || 'likes',
      currentFilter: filter || 'all',
      searchTerm: search || '',
      totalItems
    });

  } catch (error) {
    console.error('Error en /lista:', error);
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

app.get('/:restaurante', async (req, res) => {
  const restauranteData = menus[req.params.restaurante];
  const restauranteId = req.params.restaurante;
  
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
  
  const user = await User.findOne(
    { restauranteId },
    { 'likes.count': 1 }
  );

  res.render('menu', {
    info,
    menuData: restauranteData,
    // nuevo
    restauranteId,
    likes: user?.likes?.count || 0,
    //
    config: restauranteData.config,
    manifestUrl: `/${req.params.restaurante}/manifest.json`,
    pwa: {
      icon: `/assets/${restauranteData.config.extension}/icon.png` || '/assets/icon.png',
      themeColor: restauranteData.config.pwa?.theme_color || '#e0e5ec',
      description: restauranteData.config.pwa?.description || `Menú digital de ${restauranteData.config.nombre}`,
      shortName: restauranteData.config.pwa?.short_name || restauranteData.config.nombre
    },
    color: restauranteData.config?.color
  });
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
    theme_color: pwa.theme_color || "#e0e5ec",
    background_color: pwa.background_color || "#e0e5ec",
    display: pwa.display || "standalone",
    start_url: pwa.start_url || `/${req.params.restaurante}/`,
    scope: pwa.scope || `/${req.params.restaurante}/`,
    icons: pwa.icons || [{
      "src": `/assets/icon.png`,
      "sizes": "512x512",
      "type": "image/png"
    }],
    categories: pwa.categories || ["Restaurantes", "Menú Digital", "App Pedidos"],
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