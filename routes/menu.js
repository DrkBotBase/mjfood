const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const { isAuthenticated } = require('../middleware/auth');

router.get('/gestion', isAuthenticated, menuController.getMenuAdmin);
router.post('/config', isAuthenticated, menuController.updateMenuConfig);
router.post('/category', isAuthenticated, menuController.addCategory);
router.delete('/category/:categoryId', isAuthenticated, menuController.deleteCategory);
router.post('/item', isAuthenticated, menuController.addItem);
router.put('/item', isAuthenticated, menuController.updateItem);
router.put('/item/variants', isAuthenticated, menuController.updateVariants);
router.delete('/item/:categoryId/:itemId', isAuthenticated, menuController.deleteItem);

module.exports = router;