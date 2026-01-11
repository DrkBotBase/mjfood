const express = require('express');
const router = express.Router();
const { info, PORT } = require('../config');

const rutasSitemap = [
    { url: '/', lastmod: '2026-01-11', priority: '1.0' },
    { url: '/lista', lastmod: '2026-01-11', priority: '0.7' },
    //{ url: '/contacto', lastmod: '2026-01-11', priority: '0.8' },
];

router.get('/sitemap.xml', (req, res) => {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    rutasSitemap.forEach(ruta => {
        xml += `
        <url>
            <loc>${info.dominio}${ruta.url}</loc>
            <lastmod>${ruta.lastmod}</lastmod>
            <priority>${ruta.priority}</priority>
        </url>`;
    });

    xml += `</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(xml);
});

router.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send(`User-agent: *\nAllow: /\nSitemap: ${info.dominio}/sitemap.xml`);
});

module.exports = router;
