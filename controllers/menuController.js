const Menu = require('../models/Menu');

exports.getMenuAdmin = async (req, res) => {
    try {
        const { extension, role } = req.session.user;
        let menu;

        menu = await Menu.findOne({ restauranteId: extension });

        if (!menu) {
            menu = new Menu({
                restauranteId: extension,
                config: {
                    extension: extension,
                    nombre: 'Mi Restaurante',
                    color: {
                        text: "#e0e1e5",
                        primary: "#0cf106",
                        bg: "#17171b",
                        light: "#262222",
                        dark: "#000000"
                    }
                },
                menu: []
            });
            await menu.save();
        }

        res.redirect('/admin/panel');
    } catch (error) {
        console.error('Error al obtener menú:', error);
        res.status(500).send('Error interno del servidor');
    }
};

exports.updateMenuConfig = async (req, res) => {
    try {
        const { extension } = req.session.user;
        const configData = req.body;

        await Menu.findOneAndUpdate(
            { restauranteId: extension },
            { $set: { config: configData } },
            { new: true }
        );

        res.json({ success: true, message: 'Configuración actualizada.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar configuración.' });
    }
};

exports.addCategory = async (req, res) => {
    try {
        const { extension } = req.session.user;
        const { category } = req.body;

        await Menu.findOneAndUpdate(
            { restauranteId: extension },
            { $push: { menu: { category, items: [] } } }
        );

        res.json({ success: true, message: 'Categoría añadida.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al añadir categoría.' });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        const { extension } = req.session.user;
        const { categoryId } = req.params;

        await Menu.findOneAndUpdate(
            { restauranteId: extension },
            { $pull: { menu: { _id: categoryId } } }
        );

        res.json({ success: true, message: 'Categoría eliminada.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar categoría.' });
    }
}

exports.addItem = async (req, res) => {
    try {
        const { extension } = req.session.user;
        const { categoryId, item } = req.body;

        const menu = await Menu.findOne({ restauranteId: extension });
        let maxId = 0;
        menu.menu.forEach(cat => {
            cat.items.forEach(i => {
                if (i.id > maxId) maxId = i.id;
            });
        });
        item.id = maxId + 1;
        item.variants = item.variants || [];

        const updatedMenu = await Menu.findOneAndUpdate(
            { restauranteId: extension, "menu._id": categoryId },
            { $push: { "menu.$.items": item } },
            { new: true }
        );

        const addedItem = updatedMenu.menu.id(categoryId).items.find(i => i.id === item.id);

        res.json({ success: true, message: 'Producto añadido.', item: addedItem });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al añadir producto.' });
    }
};

exports.updateItem = async (req, res) => {
    try {
        const { extension } = req.session.user;
        const { categoryId, itemId, item } = req.body;

        const updateFields = {
            "menu.$[cat].items.$[itm].name": item.name,
            "menu.$[cat].items.$[itm].description": item.description,
            "menu.$[cat].items.$[itm].basePrice": item.basePrice,
            "menu.$[cat].items.$[itm].image": item.image
        };

        if (item.variants) {
            updateFields["menu.$[cat].items.$[itm].variants"] = item.variants;
        }

        await Menu.findOneAndUpdate(
            {
                restauranteId: extension,
                "menu._id": categoryId
            },
            {
                $set: updateFields
            },
            {
                arrayFilters: [
                    { "cat._id": categoryId },
                    { "itm.id": parseInt(itemId) }
                ]
            }
        );

        res.json({ success: true, message: 'Producto actualizado.', item: { id: parseInt(itemId), ...item } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar producto.' });
    }
};

exports.updateVariants = async (req, res) => {
    try {
        const { extension } = req.session.user;
        const { categoryId, itemId, variants } = req.body;

        await Menu.findOneAndUpdate(
            {
                restauranteId: extension,
                "menu._id": categoryId
            },
            {
                $set: {
                    "menu.$[cat].items.$[itm].variants": variants
                }
            },
            {
                arrayFilters: [
                    { "cat._id": categoryId },
                    { "itm.id": parseInt(itemId) }
                ],
                new: true
            }
        );

        res.json({ success: true, message: 'Variantes actualizadas.', variants });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar variantes.' });
    }
};

exports.deleteItem = async (req, res) => {
    try {
        const { extension } = req.session.user;
        const { categoryId, itemId } = req.params;

        await Menu.findOneAndUpdate(
            {
                restauranteId: extension,
                "menu._id": categoryId
            },
            {
                $pull: { "menu.$.items": { id: parseInt(itemId) } }
            }
        );

        res.json({ success: true, message: 'Producto eliminado.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar producto.' });
    }
};