const express = require('express');
const router = express.Router();
const { info, PORT } = require('../config');

const { cargarMenusDesdeArchivos } = require('../utils/recargarMenus');

router.get('/sitemap.xml', async (req, res) => {
  try {
    const menus = await cargarMenusDesdeArchivos(); 
    const extensiones = Object.keys(menus);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://mjfood.top/</loc>
    <lastmod>2026-01-15</lastmod>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://mjfood.top/lista</loc>
    <lastmod>2026-01-15</lastmod>
    <priority>0.8</priority>
  </url>`;

    extensiones.forEach(slug => {
      const menu = menus[slug];
      const lastmod = menu.config.lastmod || "2026-01-15";

      xml += `
  <url>
    <loc>https://mjfood.top/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <priority>0.7</priority>
  </url>`;
    });

    xml += `\n</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(xml);

  } catch (error) {
    console.error("Error generando sitemap:", error);
    res.status(500).end();
  }
});

router.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send(
`User-agent: *
Allow: /
Allow: /assets/
Allow: /css/
Allow: /js/
Disallow: /admin/
Disallow: /login/
Disallow: /api/
Disallow: /temp/

Sitemap: ${info.dominio}/sitemap.xml`
    );
});


module.exports = router;