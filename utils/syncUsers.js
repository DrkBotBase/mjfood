// utils/syncUsers.js
const crypto = require('crypto');
const RestauranteEstadisticas = require('../models/restaurante_estadisticas');
const { cargarMenusDesdeArchivos } = require('./recargarMenus');

// Genera un token aleatorio y seguro
function generarToken(longitud = 12) {
    return crypto.randomBytes(longitud).toString('hex');
}

async function sincronizarUsuarios() {
    console.log('🔄 Inciando sincronización de usuarios...');

    try {
        // 1. Cargar todos los menús desde los archivos
        const menus = await cargarMenusDesdeArchivos();
        const extensionesDeMenus = Object.keys(menus);

        // 2. Obtener todos los usuarios existentes de la base de datos
        const usuariosExistentes = await RestauranteEstadisticas.find({}, 'extension');
        const extensionesExistentes = usuariosExistentes.map(u => u.extension);

        // 3. Encontrar qué restaurantes no tienen un usuario creado
        const nuevasExtensiones = extensionesDeMenus.filter(
            ext => !extensionesExistentes.includes(ext)
        );

        if (nuevasExtensiones.length === 0) {
            console.log('✅ Todos los restaurantes ya tienen un usuario.');
            return;
        }

        console.log(`🆕 Se encontraron ${nuevasExtensiones.length} restaurantes nuevos. Creando usuarios...`);

        // 4. Crear los nuevos usuarios en la base de datos
        for (const extension of nuevasExtensiones) {
            const nuevoToken = generarToken();
            const nombreRestaurante = menus[extension]?.config?.nombre || extension;

            const nuevoUsuario = new RestauranteEstadisticas({
                extension: extension,
                token: nuevoToken,
                nombre: nombreRestaurante,
                totalPedidos: 0,
                totalGastado: 0,
                clientes: []
            });

            await nuevoUsuario.save();

            // 5. Mostrar la información sensible en la consola para el administrador
            console.log('--------------------------------------------------');
            console.log(`✨ Usuario creado para: ${nombreRestaurante}`);
            console.log(`   - Usuario (extensión): ${extension}`);
            console.log(`   - Contraseña (token): ${nuevoToken}`);
            console.log('--------------------------------------------------');
        }

        console.log('✅ Sincronización de usuarios completada.');

    } catch (error) {
        console.error('🔥 Error durante la sincronización de usuarios:', error);
    }
}

module.exports = { sincronizarUsuarios };
