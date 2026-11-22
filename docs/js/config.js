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
    cuento: { nombre: 'Cuento del reino de invierno', para: 'Niña o niño · cumpleaños' },
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
  // Demos de la portada. El super usuario decide en el panel cuáles se muestran.
  DEMOS: [
    { id: 'mateo-6', i: 'Tz4hQ8nLs3Ve', cls: 'd1', tipo: 'Cumpleaños infantil', titulo: 'Mateo · 6 años', texto: 'Estilo cómic: el festejado es el héroe, con sus fotos y credencial QR.', em: '⚡' },
    { id: 'valentina-4', i: 'Jm4pXc7wRd2N', cls: 'd2', tipo: 'Cumpleaños infantil', titulo: 'Valentina · 4 años', texto: 'Un libro de cuentos que se abre, con nieve y su reino de invierno.', em: '❄️' },
    { id: 'camila-xv', i: 'Az4mQr8tLp2W', cls: 'd4', tipo: 'XV años', titulo: 'Camila Renata', texto: 'Sobre con sello de cera, sesión de fotos, pase con QR y lluvia de sobres.', em: '💙' },
    { id: 'sofia-xv', i: 'Xv3dLw9sTe4K', cls: 'd3', tipo: 'XV años', titulo: 'Sofía Valeria', texto: 'Rosa y oro, con padrinos, misa y recepción con croquis.', em: '👑' },
    { id: 'andrea-rodrigo', i: 'Bd5kRt8mWq3Z', cls: 'd5', tipo: 'Boda', titulo: 'Andrea & Rodrigo', texto: 'Fotos a pantalla completa, nuestra historia, hospedaje y preguntas frecuentes.', em: '💍' },
  ],
  // Precios de diseño (pago único, MXN)
  PRECIOS: { fiesta: 250, xv: 400, boda: 500 },
  TIPOS: { cumpleanos: 'Cumpleaños', xv: 'XV años', boda: 'Boda', bautizo: 'Bautizo', otro: 'Otro' },
};
