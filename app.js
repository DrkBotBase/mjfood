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
const passport = require('passport');
require('./config/passport')(passport);
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
  secret: process.env.SECRET_KEY || 'secret',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  if (req.isAuthenticated() && !req.session.user) {
    req.session.user = {
      extension: req.user.restauranteId,
      username: req.user.username,
      role: req.user.role
    };
  }
  next();
});

const seoRouter = require('./routes/seo')
const User = require('./models/User');
const Menu = require('./models/Menu');
const adminRoutes = require('./routes/admin');
const menuRoutes = require('./routes/menu');
const pedidosRouter = require('./routes/pedidos');
const jornadaRouter = require('./routes/jornada');
const estadisticasRouter = require('./routes/estadisticas');
const likesRoutes = require('./routes/likes');
app.use("/", seoRouter)
app.use("/push", require('./routes/push'));
app.use('/likes', likesRoutes);
app.use('/admin', adminRoutes);
app.use('/menu', menuRoutes);
app.use('/pedidos', pedidosRouter);
app.use('/jornada', jornadaRouter);
app.use('/panel', estadisticasRouter);

const IDS_EXCLUIR = ['demo', 'admin_panel'];
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

    const menus = await Menu.find({ restauranteId: { $nin: IDS_EXCLUIR } }).lean();

    let restaurantesInfo = menus.map(menu => {
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
      title: "Comida a domicilio",
      desc: "Encuentra los mejores restaurantes con entrega a domicilio cerca de tí. Deléitate con la mejor comida.",
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
    "scope": "/",
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
app.get('/demo', (req, res) => {
    const menuDemo = {
      "config": {
        "extension": "demo",
        "orden": "999",
        "color": {
          "text": "#e0e1e5",
          "primary": "#0cf106",
          "bg": "#17171b",
          "light": "#262222",
          "dark": "#000000"
        },
        "pwa": {
          "short_name": "MJ Street Prime",
          "name": "MJ Street Prime - Pedidos",
          "description": "Comida Urban-Premium.",
          "theme_color": "#17171b",
          "background_color": "#17171b",
          "display": "standalone",
          "orientation": "portrait",
          "icons": [
            {
              "src": "/assets/demo/icon.png",
              "sizes": "512x512",
              "type": "image/png"
            }
          ],
          "categories": ["food", "urban", "premium"],
          "lang": "es"
        },
        "nombre": "MJ Street Prime",
        "direccion": "Calle 94 # 51B",
        "telefonoWhatsApp": "17755107666",
        "logoUrl": "/assets/demo/banner.jpg",
        "taxRate": 0
      },
      "schedule": [
        { "day": 0, "open": "24h", "close": "24h" }, 
        { "day": 1, "open": "24h", "close": "24h" }, 
        { "day": 2, "open": "24h", "close": "24h" }, 
        { "day": 3, "open": "24h", "close": "24h" }, 
        { "day": 4, "open": "24h", "close": "24h" }, 
        { "day": 5, "open": "24h", "close": "24h" }, 
        { "day": 6, "open": "24h", "close": "24h" }
      ],
      "shippingZones": [
        { "name": "Villa Carolina", "price": 6000 },
        { "name": "Miramar", "price": 8000 },
        { "name": "Ciudad Mayorquín", "price": 8000 },
        { "name": "Villa Country", "price": 10000 },
        { "name": "Alameda del Río", "price": 12000 },
        { "name": "Villa Campestre", "price": 12000 },
        { "name": "El Prado", "price": 12000},
        { "name": "Otra (consultar)", "price": 0 }
      ],
      "paymentInfo": {
        "transfer": {
          "bankName": "Ahorros",
          "accountType": "Cuenta",
          "accountNumber": "08-0000-1234",
          "accountHolder": "MJFOOD"
        }
      },
      "menu": [
        {"category": "Signature Combos", "items": [
          {"id": 1, "name": "Combo Urban King", "description": "Doble Smash Burger OG + Papas Brutales + Bebida Urban 400ml", "basePrice": 36000, "image": "", "placeholder": "Descripción para el producto...", "variants": []},
          {"id": 2, "name": "Combo Mafia Supreme", "description": "Smash Bacon Mafia + Papas con cheddar + Bebida Premium Mix", "basePrice": 39000, "image": "", "placeholder": "Descripción para el producto...", "variants": []},
          {"id": 3, "name": "Combo Fire Bowl", "description": "Fire Chicken Bowl + Papas Brutales + Bebida Urban 400ml", "basePrice": 35000, "image": "", "placeholder": "Descripción para el producto...", "variants": []},
          {"id": 4, "name": "Combo La Truffle", "description": "Smash La Truffle + Papas finas + Bebida Premium", "basePrice": 42000, "image": "", "placeholder": "Descripción para el producto...", "variants": []},
          {"id": 5, "name": "Combo Dúo Trap", "description": "2 Smash OG + Papas Brutales XL + 2 Bebidas Urban 400ml", "basePrice": 58000, "image": "", "placeholder": "Descripción para el producto...", "variants": []}
        ]},
        {"category": "Smash Burgers", "items": [
          {"id": 6, "name": "Smash OG", "description": "Carne angus smash, doble cheddar, salsa house y pan brioche", "basePrice": 22000, "image": "", "placeholder": "Sin cebolla? Queso extra? etc...",
            "variants": [
              {"type": "radio", "name": "Nivel Picante", "options": [{"label": "Suave", "price": 0}, {"label": "Medio", "price": 0}, {"label": "🔥 Fuego", "price": 3000}]},
              {"type": "checkbox", "name": "Extras", "options": [{"label": "Extra Cheddar", "price": 4000}, {"label": "Bacon", "price": 5000}, {"label": "Guacamole", "price": 5000}]}
          ]},
          {"id": 7, "name": "Bacon Mafia", "description": "Smash caramelizada, tocineta ahumada, cheddar fundido, salsa secreta", "basePrice": 26000, "image": "", "placeholder": "Sin cebolla? Extra bacon? etc...",
            "variants": [
              {"type": "radio", "name": "Nivel Picante", "options": [{"label": "Suave", "price": 0}, {"label": "🔥 Medio", "price": 2000}, {"label": "🔥🔥 Mafia Fuego", "price": 4000}]},
              {"type": "checkbox", "name": "Extras", "options": [{"label": "Queso Extra", "price": 4000}, {"label": "Bacon Extra", "price": 5000}]}
          ]},
          {"id": 8, "name": "La Truffle", "description": "Salsa de trufa premium, queso gouda fundido, toque ahumado deluxe", "basePrice": 29000, "image": "", "placeholder": "Extra trufa? Sin salsa? etc...",
            "variants": [
              {"type": "radio", "name": "Nivel Picante", "options": [{"label": "Zero Picante", "price": 0}, {"label": "🔥 Suave", "price": 3000}]},
              {"type": "checkbox", "name": "Extras", "options": [{"label": "Extra Truffle", "price": 6000}, {"label": "Queso Doble", "price": 4000}]}
          ]},
          {"id": 9, "name": "Spicy Queen", "description": "Smash con jalapeño, cheddar flaming, salsa latin fuego", "basePrice": 28000, "image": "", "placeholder": "Sin picante? extra salsa? etc...",
            "variants": [
              {"type": "radio", "name": "Nivel Picante", "options": [{"label": "Zero picante", "price": 0}, {"label": "🔥 Medio", "price": 0}, {"label": "🔥🔥🔥 Insano", "price": 0}]}
          ]}
        ]},
        {"category": "Bowls & Street Meals", "items": [
          {"id": 10, "name": "Fire Chicken Bowl", "description": "Pollo ahumado, maíz dulce, aguacate, arroz frito urbano", "basePrice": 23000, "image": "", "placeholder": "Extra proteína? Sin cebolla? etc...",
            "variants": [
            {"type": "radio", "name": "Tamaño", "options": [{"label": "Personal", "price": 0}, {"label": "Grande", "price": 6000}]},
            {"type": "radio", "name": "Nivel Picante", "options": [{"label": "Suave", "price": 0}, {"label": "🔥 Medio", "price": 3000}, {"label": "🔥🔥🔥 Inmortal", "price": 5000}]},
            {"type": "checkbox", "name": "Extras", "options": [{"label": "Guacamole Premium", "price": 5000}, {"label": "Cheddar Fundido", "price": 4000}, {"label": "Bacon", "price": 5000}]}
          ]},
          {"id": 11, "name": "Carne Street Bowl", "description": "Carne a la parrilla, vegetales salteados, arroz latino con garlic butter", "basePrice": 24000, "image": "", "placeholder": "Extra bacon? menos arroz? etc...",
            "variants": [
              {"type": "radio", "name": "Tamaño", "options": [{"label": "Personal", "price": 0}, {"label": "Grande", "price": 6000}]},
              {"type": "checkbox", "name": "Extras", "options": [{"label": "Doble Carne", "price": 6000}, {"label": "Queso fundido", "price": 4000}]}
          ]},
          {"id": 12, "name": "Veggie Supreme", "description": "Mix vegetal con aguacate, champiñones grill y maíz dulce", "basePrice": 21000, "image": "", "placeholder": "Sin cebolla? extra aguacate? etc...",
            "variants": [
              {"type": "radio", "name": "Tamaño", "options": [{"label": "Personal", "price": 0}, {"label": "Grande", "price": 6000}]}
          ]}
        ]},
        {"category": "Postres Urbanos", "items": [
          {"id": 13, "name": "Churro Supreme", "description": "Churros artesanales con baño de dulce de leche & canela", "basePrice": 12000, "image": "", "placeholder": "Extra nutella? etc...", "variants": []},
          {"id": 14, "name": "Brownie Criminal", "description": "Brownie caliente con helado suave y fudge oscuro", "basePrice": 14000, "image": "", "placeholder": "Extra helado? etc...", "variants": []}
        ]},
        {"category": "Bebidas Urbanas", "items": [
          {"id": 15, "name": "Coca Cola 400ml", "description": "Botella fría", "basePrice": 4000, "image": "", "placeholder": "", "variants": []},
          {"id": 16, "name": "Limonada Fresa Frozen", "description": "Frozen estilo urbano, fresca, natural", "basePrice": 7000, "image": "", "placeholder": "", "variants": []},
          {"id": 17, "name": "Maracuyá Cold", "description": "Frappé de maracuyá natural", "basePrice": 7000, "image": "", "placeholder": "", "variants": []}
        ]},
        {"category": "Bebidas Premium & Mixology", "items": [
          {"id": 18, "name": "Michelada Latina", "description": "Versión urbana refrescante con borde sal-limón y fusión cítrica", "basePrice": 10000, "image": "", "placeholder": "", "variants": []},
          {"id": 19, "name": "Red Bull Fusión Tropical", "description": "Red Bull + maracuyá frost + aire frutal fresco", "basePrice": 14000, "image": "", "placeholder": "", "variants": []},
          {"id": 20, "name": "Limonada Negra Premium", "description": "Limonada con carbón activado detox y notas cítricas", "basePrice": 11000, "image": "", "placeholder": "", "variants": []}
        ]}
      ]
    }
  res.render('demo', {
    info,
    likes: '250',
    demo: menuDemo
  })
})
app.get('/ping', (req, res) => {
  res.send('Pong');
});

app.get('/:restaurante', async (req, res) => {
  const restauranteId = req.params.restaurante;
  const restauranteData = await Menu.findOne({ restauranteId }).lean();
  
  if (!restauranteData) {
    const menusActivos = await Menu.find({ restauranteId: { $nin: IDS_EXCLUIR } }).lean();
    const restaurantesDisponibles = menusActivos
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
    restauranteId,
    likes: user?.likes?.count || 0,
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
app.get('/:restaurante/manifest.json', async (req, res) => {
  const restauranteId = req.params.restaurante;
  const restauranteData = await Menu.findOne({ restauranteId }).lean();

  if (!restauranteData) {
    return res.status(404).json({ error: 'Restaurante no encontrado' });
  }

  const pwa = restauranteData.config?.pwa || {};
  const manifest = {
    short_name: pwa.short_name || restauranteData.config.nombre,
    name: pwa.name || `${restauranteData.config.nombre} - Menú Digital`,
    description: pwa.description || `App de pedidos para ${restauranteData.config.nombre}`,
    theme_color: pwa.theme_color || "#e0e5ec",
    background_color: pwa.background_color || "#e0e5ec",
    display: pwa.display || "standalone",
    start_url: pwa.start_url || `/${req.params.restaurante}/`,
    scope: "/",
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
  await sincronizarUsuarios();
  const menus = await Menu.find().lean();
  const ordenados = menus
    .sort((a, b) => (a.config.orden ?? 999) - (b.config.orden ?? 999))
    .map(menu => menu.config.extension);
  res.json({
    success: true,
    message: `Menús sincronizados en BD. ${ordenados.length} restaurantes procesados`,
    restaurantes: ordenados
  });
});

setInterval(() => {
  fetch(`${info.dominio}/ping`)
    .then(res => console.log('Ping interno enviado:', res.status))
    .catch(err => console.error('Error en el ping:', err.message));
}, 25 * 60 * 1000);

//const { sincronizarUsuarios } = require('./utils/syncUsers');

(async () => {
  const mongoose = require('mongoose');
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mjfood');

  //await sincronizarUsuarios();

  console.log(`Carga inicial y sincronización completada.`);

  server.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en el puerto: ${PORT}`);
  });
})();