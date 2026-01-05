const { info } = require('../config');
module.exports = [
  {
    id: 'promo-01',
    activo: true,
    tipo: 'ad',
    tag: 'Publicidad',
    titulo: '¿Tienes un restaurante?',
    subtitulo: 'Únete a nuestra plataforma',
    cta: 'QUIERO UNIRME',
    url: `https://wa.me/${info.whatsapp}?text=Hola,%20quisiera%20añadir%20mi%20restaurante.`,
    imagen: '/assets/icon.png',
    gradiente: 'from-indigo-600 to-purple-600',
    prioridad: 2
  },
  {
    id: 'promo-02',
    activo: true,
    tipo: 'ad', // promo | ad
    tag: 'Publicidad',
    titulo: 'Donde Rober',
    subtitulo: 'Los mejores sancochos y ejecutivos.',
    cta: 'PEDIR AHORA',
    url: `https://wa.me/573014207914?text=La%20Promo%20Del%20Dia`,
    imagen: '/assets/ads/rober.jpg',
    gradiente: 'from-orange-500 to-red-600',
    prioridad: 1
  },
  {
    id: 'promo-03',
    activo: true,
    tipo: 'promo', // promo | ad
    tag: 'Promocion',
    titulo: 'Taylor Wok',
    subtitulo: 'Promo del Dia',
    cta: 'PEDIR AHORA',
    url: '/taylor_wok',
    imagen: '/assets/ads/promowok.png',
    gradiente: 'from-orange-500 to-red-600',
    prioridad: 1
  }
];