const fs = require('fs/promises');
const path = require('path');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Menu = require('../models/Menu');
const { cargarMenusDesdeArchivos } = require('./recargarMenus');

async function sincronizarUsuarios() {
  try {
    const menus = await cargarMenusDesdeArchivos();
    const restaurantesIds = Object.keys(menus);

    for (const restauranteId of restaurantesIds) {
      if (restauranteId === 'demo') continue;

      // Ensure user exists
      const existingUser = await User.findOne({ restauranteId });
      if (!existingUser) {
        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        const newUser = new User({
          username: restauranteId,
          password: hashedPassword,
          restauranteId: restauranteId,
          role: 'restaurante'
        });
        await newUser.save();
        console.log(`===========================================`);
        console.log(`Nuevo usuario creado para ${restauranteId}`);
        console.log(`Username: ${restauranteId}`);
        console.log(`Password: ${tempPassword}`);
        console.log(`===========================================`);
      }

      // Sync menu data to MongoDB
      const menuData = menus[restauranteId];
      if (menuData) {
        // Ensure restauranteId is set on the document
        menuData.restauranteId = restauranteId;

        await Menu.findOneAndUpdate(
          { restauranteId: restauranteId },
          { $set: menuData },
          { upsert: true, new: true }
        );
        console.log(`Menú sincronizado para ${restauranteId}`);
      }
    }

    // Ensure a super admin exists
    const superAdmin = await User.findOne({ username: 'superadmin' });
    if (!superAdmin) {
      const adminPassword = process.env.ADMIN_PASSWORD || Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const newAdmin = new User({
        username: 'superadmin',
        password: hashedPassword,
        restauranteId: 'admin_panel',
        role: 'admin'
      });
      await newAdmin.save();
      console.log('Usuario superadmin creado.');
      if (!process.env.ADMIN_PASSWORD) {
        console.log(`===========================================`);
        console.log(`⚠️  Contraseña generada aleatoriamente para superadmin: ${adminPassword}`);
        console.log(`Por favor, anótala o cámbiala.`);
        console.log(`===========================================`);
      }
    }

  } catch (error) {
    console.error('Error al sincronizar usuarios y menús:', error);
  }
}

module.exports = { sincronizarUsuarios };
