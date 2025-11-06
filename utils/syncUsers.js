const fs = require('fs/promises');
const path = require('path');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { cargarMenusDesdeArchivos } = require('./recargarMenus');

async function sincronizarUsuarios() {
  try {
    const menus = await cargarMenusDesdeArchivos();
    const restaurantesIds = Object.keys(menus);
    for (const restauranteId of restaurantesIds) {
      if (restauranteId === 'demo') continue;
      const existingUser = await User.findOne({ restauranteId });
      if (!existingUser) {
        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        const newUser = new User({
          username: restauranteId,
          password: hashedPassword,
          restauranteId: restauranteId,
          role: 'admin'
        });
        await newUser.save();
        console.log(`===========================================`);
        console.log(`Nuevo usuario creado para ${restauranteId}`);
        console.log(`Username: ${restauranteId}`);
        console.log(`Password: ${tempPassword}`);
        console.log(`===========================================`);
      }
    }
  } catch (error) {
    console.error('Error al sincronizar usuarios:', error);
  }
}

module.exports = { sincronizarUsuarios };
