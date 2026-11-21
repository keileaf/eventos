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
  TIPOS: { cumpleanos: 'Cumpleaños', xv: 'XV años', boda: 'Boda', bautizo: 'Bautizo', otro: 'Otro' },
};
