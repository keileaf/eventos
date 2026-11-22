// Configuración del sitio.
// API_URL: pega aquí la URL de tu Aplicación web de Apps Script (termina en /exec).
// Si la dejas vacía, el sitio funciona en MODO DEMO (datos de ejemplo guardados en tu navegador).
window.APP_CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbw4qQmVWNbgdWMq1J9PbYlxi1HmKTVYZoGPGzXEPSzLgtXY8cL4b3dB7i2NY6raBy1V/exec',
  // Temas disponibles: la clave es el nombre de la carpeta/archivo en /themes
  TEMAS: {
    espacial: { nombre: 'Aventura espacial', para: 'Niño · cumpleaños' },
    heroe: { nombre: 'Héroe (cómic)', para: 'Niño o niña · cumpleaños' },
    jardin: { nombre: 'Jardín de mariposas', para: 'Niña · cumpleaños' },
    xv: { nombre: 'XV años · Rosa y oro', para: 'Quince años' },
    'xv-azul': { nombre: 'XV años · Azul acuarela', para: 'Quince años' },
    boda: { nombre: 'Boda · Jardín al atardecer', para: 'Boda' },
  },
  // Contacto y redes de la portada. Deja vacía una red para ocultar su botón.
  CONTACTO: {
    whatsapp: '+52 664 218 1185',
    instagram: '',   // ej. 'https://instagram.com/tu_usuario'
    tiktok: '',      // ej. 'https://tiktok.com/@tu_usuario'
    facebook: '',    // ej. 'https://facebook.com/tu_pagina'
  },
  // Precios de diseño (pago único, MXN)
  PRECIOS: { fiesta: 250, xv: 400, boda: 500 },
  TIPOS: { cumpleanos: 'Cumpleaños', xv: 'XV años', boda: 'Boda', bautizo: 'Bautizo', otro: 'Otro' },
};
