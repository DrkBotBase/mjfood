// controllers/adminController.js
const RestauranteEstadisticas = require('../models/restaurante_estadisticas');
const Pedido = require('../models/pedido');
const EstadisticasJornada = require('../models/EstadisticasJornada');
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

exports.postLogin = async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });

        if (user && bcrypt.compareSync(password, user.password)) {
            req.session.user = {
                extension: user.restauranteId,
                username: user.username
            };
            res.redirect('/admin/panel');
        } else {
            res.render('panel-login', {
                info: {
                    name_page: 'Login'
                },
                error: 'Credenciales incorrectas',
                restaurante: 'general'
            });
        }
    } catch (error) {
        console.error('Error en el login:', error);
        res.status(500).send('Error interno del servidor');
    }
};

exports.getPanel = async (req, res) => {
    try {
        const { extension } = req.session.user;
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
            }
        });
    } catch (error) {
        console.error('Error al obtener el panel:', error);
        res.status(500).send('Error interno del servidor');
    }
};

exports.logout = (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login');
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
