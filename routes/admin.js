// routes/admin.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAuthenticated } = require('../middleware/auth');

router.get('/login', adminController.getLogin);
router.post('/login', adminController.postLogin);
router.get('/panel', isAuthenticated, adminController.getPanel);
router.get('/logout', adminController.logout);
router.post('/change-password', isAuthenticated, adminController.changePassword);

router.get('/register', isAuthenticated, adminController.getRegister);
router.post('/register', isAuthenticated, adminController.postRegister);

module.exports = router;
