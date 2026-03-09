// middleware/auth.js
exports.isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated() || req.session.user) {
        return next();
    }
    res.redirect('/admin/login');
};
