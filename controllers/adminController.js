const RestauranteEstadisticas = require('../models/restaurante_estadisticas');
const Pedido = require('../models/pedido');
const EstadisticasJornada = require('../models/EstadisticasJornada');
const Menu = require('../models/Menu');
const moment = require('moment-timezone');

exports.getLogin = (req, res) => {
    res.render('panel-login', {
        info: {
            name_page: 'Login',
        },
        error: null,
        restaurante: 'general'
    });
};

const User = require('../models/User');
const bcrypt = require('bcryptjs');

const passport = require('passport');

exports.postLogin = (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            console.error('Error en el login:', err);
            return res.status(500).send('Error interno del servidor');
        }
        if (!user) {
            return res.render('panel-login', {
                info: { name_page: 'Login' },
                error: info ? info.message : 'Credenciales incorrectas',
                restaurante: 'general'
            });
        }
        req.logIn(user, (err) => {
            if (err) {
                console.error('Error en req.logIn:', err);
                return res.status(500).send('Error interno del servidor');
            }
            req.session.user = {
                extension: user.restauranteId,
                username: user.username,
                role: user.role
            };
            res.redirect('/admin/panel');
        });
    })(req, res, next);
};

exports.getPanel = async (req, res) => {
    try {
        const { extension, role } = req.session.user;
        const estadisticas = await RestauranteEstadisticas.findOne({ extension });
        const inicioMes = moment().tz('America/Bogota').startOf('month').toDate();
        const finMes = moment().tz('America/Bogota').endOf('month').toDate();
        const jornadasMes = await EstadisticasJornada.find({
            extension,
            fechaInicio: { $gte: inicioMes, $lte: finMes }
        });
        const totalPedidosMes = jornadasMes.reduce((sum, j) => sum + j.totalPedidos, 0);
        const totalGastadoMes = jornadasMes.reduce((sum, j) => sum + j.totalGastado, 0);
        const rankingClientes = await Pedido.aggregate([
            { $match: { extension } },
            { $group: {
                _id: '$phone',
                totalPedidos: { $sum: 1 },
                totalGastado: { $sum: '$valorTotal' }
            }},
            { $sort: { totalGastado: -1 } },
            { $limit: 10 }
        ]);
        const historialPedidos = await Pedido.find({ extension })
            .sort({ fechaPedido: -1 })
            .limit(10);

        const menuData = await Menu.findOne({ restauranteId: extension }).lean() || {};
        
        res.render('panel', {
            info: {
                name_page: 'Panel de Control',
            },
            restaurante: extension,
            extension,
            estadisticas: {
                totalPedidos: estadisticas ? estadisticas.totalPedidos : 0,
                totalGastado: estadisticas ? estadisticas.totalGastado : 0,
                totalClientes: estadisticas ? estadisticas.clientes.length : 0
            },
            periodo: {
                totalPedidos: totalPedidosMes,
                totalGastado: totalGastadoMes
            },
            rankingClientes,
            historialPedidos: {
                pedidos: historialPedidos,
                paginacion: {
                    pagina: 1,
                    limite: 10,
                    total: await Pedido.countDocuments({ extension }),
                    paginas: Math.ceil(await Pedido.countDocuments({ extension }) / 10)
                }
            },
            menuData: menuData,
            userRole: role
        });
    } catch (error) {
        console.error('Error al obtener el panel:', error);
        res.status(500).send('Error interno del servidor');
    }
};

exports.logout = (req, res) => {
    req.logout(() => {
        req.session.destroy();
        res.redirect('/admin/login');
    });
};

exports.getRegister = (req, res) => {
    if (req.session.user.role !== 'admin') {
        return res.status(403).send('Acceso denegado. Solo administradores pueden registrar restaurantes.');
    }
    res.render('register', {
        info: { name_page: 'Registro de Restaurante' },
        error: null,
        success: null,
        restaurante: req.session.user.extension
    });
};

exports.postRegister = async (req, res) => {
    if (req.session.user.role !== 'admin') {
        return res.status(403).send('Acceso denegado.');
    }

    const { username, password, restauranteId } = req.body;

    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.render('register', {
                info: { name_page: 'Registro de Restaurante' },
                error: 'El nombre de usuario ya existe',
                success: null,
                restaurante: req.session.user.extension
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            username,
            password: hashedPassword,
            restauranteId,
            role: 'restaurante'
        });
        await newUser.save();
        
        const menuData = crearMenuPorDefecto(restauranteId, username);
        const newMenu = new Menu(menuData);
        await newMenu.save();

        res.render('register', {
            info: { name_page: 'Registro de Restaurante' },
            error: null,
            success: 'Restaurante registrado exitosamente',
            restaurante: req.session.user.extension
        });
    } catch (error) {
        console.error('Error en el registro:', error);
        res.status(500).render('register', {
            info: { name_page: 'Registro de Restaurante' },
            error: 'Error interno del servidor',
            success: null,
            restaurante: req.session.user.extension
        });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { username } = req.session.user;
        const { passwordActual, passwordNuevo } = req.body;

        const user = await User.findOne({ username });

        if (!user || !bcrypt.compareSync(passwordActual, user.password)) {
            return res.status(403).json({ error: 'La contraseña actual es incorrecta.' });
        }

        user.password = bcrypt.hashSync(passwordNuevo, 10);
        await user.save();

        res.json({ message: 'Contraseña actualizada correctamente.' });

    } catch (error) {
        console.error('Error al cambiar la contraseña:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

function crearMenuPorDefecto(restauranteId, nombreRestaurante) {
    const extension = restauranteId.toLowerCase().replace(/\s+/g, '_');
    
    return {
        restauranteId: restauranteId,
        config: {
            extension: extension,
            orden: "999",
            color: {
                text: "#e0e1e5",
                primary: "#0cf106",
                bg: "#17171b",
                light: "#262222",
                dark: "#000000"
            },
            pwa: {
                short_name: nombreRestaurante.substring(0, 15) || "Mi Restaurante",
                name: nombreRestaurante + " - Pedidos",
                description: "Realiza tus pedidos online de manera fácil y rápida. Disfruta de nuestros deliciosos platos en la comodidad de tu hogar.",
                theme_color: "#17171b",
                background_color: "#17171b",
                display: "standalone",
                orientation: "portrait",
                icons: [
                    {
                        src: "/assets/icon.png",
                        sizes: "512x512",
                        type: "image/png"
                    }
                ],
                categories: ["Restaurante", "Comida", "Domicilios"],
                lang: "es"
            },
            nombre: nombreRestaurante,
            direccion: "direccíon por definir",
            telefonoWhatsApp: "",
            logoUrl: "/assets/banner.jpg",
            taxRate: 0
        },
        schedule: [
            { day: 0, open: "11:30", close: "22:00" },
            { day: 1, open: "11:30", close: "22:00" },
            { day: 2, open: "11:30", close: "22:00" },
            { day: 3, open: "11:30", close: "22:00" },
            { day: 4, open: "11:30", close: "22:00" },
            { day: 5, open: "11:30", close: "22:00" },
            { day: 6, open: "11:30", close: "22:00" }
        ],
        shippingZones: [{ "name": "Otra (consultar)", "price": 0 }],
        paymentInfo: {
            transfer: {
                bankName: "Por definir",
                accountType: "Cuenta",
                accountNumber: "",
                accountHolder: ""
            }
        },
        activeCategory: "",
        menu: []
    };
}