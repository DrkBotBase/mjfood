require("dotenv")
module.exports = {
  info: {
    author: 'ianvanh',
    name_page: 'MJFOOD',
    desc: 'Tu portal de restaurantes',
    dominio: 'https://mjfood.top',
    colorTheme: '#0a0a0a',
    fb_app_id: '',
    logo: 'mjfood',
    colorBase: {
      text: '#333740',
      primary: '#6D5DFC',
      bg: '#e0e5ec',
      light: '#ffffff',
      dark: '#a3b1c6'
    }
  },
  PORT: process.env.PORT || 3000
};