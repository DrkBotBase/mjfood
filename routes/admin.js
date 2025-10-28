// routes/admin.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAuthenticated } = require('../middleware/auth');

router.get('/login', adminController.getLogin);
router.post('/login', adminController.postLogin);
router.get('/panel', isAuthenticated, adminController.getPanel);
router.get('/logout', adminController.logout);

// Nueva ruta para cambiar el token/contraseña
router.post('/cambiar-token', isAuthenticated, adminController.cambiarToken);

module.exports = router;
