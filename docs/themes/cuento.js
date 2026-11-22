/* Tema "Cuento del reino de invierno": libro de cuentos original, copos de nieve, plata y lila.
   Diseño propio: no usa personajes, nombres ni elementos de películas. */
(function () {
  const esc = (s) => U.esc(s);

  // Copo de nieve de 6 brazos
  function flake(size, stroke) {
    const arm = `<path d="M0 0 V-40 M0 -14 l-8 -8 M0 -14 l8 -8 M0 -26 l-6 -6 M0 -26 l6 -6 M0 -36 l-4 -3 M0 -36 l4 -3"/>`;
    return `<svg class="ct-flake" viewBox="-46 -46 92 92" width="${size || 40}" height="${size || 40}" aria-hidden="true"><g fill="none" stroke="${stroke || 'currentColor'}" stroke-width="3.2" stroke-linecap="round">${[0, 60, 120, 180, 240, 300].map(r => `<g transform="rotate(${r})">${arm}</g>`).join('')}<circle r="5"/></g></svg>`;
  }
  // Viñeta de esquina para las páginas
  const corner = (cls) => `<svg class="ct-corner ${cls}" viewBox="0 0 60 60" aria-hidden="true"><path d="M4 56 V22 Q4 4 22 4 H56" fill="none" stroke="#b7a4e0" stroke-width="2"/><path d="M12 56 V26 Q12 12 26 12 H56" fill="none" stroke="#c9d9ef" stroke-width="1.5"/><circle cx="22" cy="22" r="3.5" fill="#b7a4e0"/></svg>`;
  const divider = `<div class="ct-div" aria-hidden="true"><span></span>${flake(22, '#9fb6dc')}<span></span></div>`;

  window.THEMES = window.THEMES || {};
  THEMES.cuento = {
    fonts: 'https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Nunito:wght@600;700&display=swap',
    fullHero: true,
    coverDelay: 1900,
    labels: {
      countdown: 'Capítulo I · Faltan', family: 'Con amor de', when: 'Capítulo II · El castillo', schedule: 'Capítulo III · La aventura',
      gallery: 'Ilustraciones', dress: 'Atuendo del reino', gifts: 'Regalos', faq: 'Preguntas del reino', social: 'Recuerdos del reino',
      open: 'Abrir el cuento', yes: '¡Iré al reino!',
    },
    confetti: ['#ffffff', '#c9d9ef', '#b7a4e0', '#9fb6dc', '#e6eef9'],
    confettiShapes: ['❄', '✦', '❅', '●'],
    quoteOrnament: divider,

    hero(cfg) {
      const d = U.parseDate(cfg.fecha);
      const foto = U.img(cfg.fotoPortada);
      const nombre = String(cfg.festejado || '');
      const first = nombre.charAt(0), rest = nombre.slice(1);
      const fecha = d ? d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
      return `<div class="ct-hero">
        <article class="ct-page">
          ${corner('tl')}${corner('tr')}${corner('bl')}${corner('br')}
          <p class="ct-kicker">${esc(cfg.encabezado || 'Érase una vez…')}</p>
          ${foto ? `<div class="ct-frame"><img src="${esc(foto)}" alt="${esc(nombre)}">${flake(34, '#fff')}</div>` : ''}
          <h1 class="ct-title"><span class="ct-cap">${esc(first)}</span>${esc(rest)}</h1>
          ${cfg.edad ? `<p class="ct-age"><span>cumple</span><b>${esc(cfg.edad)}</b><span>${Number(cfg.edad) === 1 ? 'año' : 'años'}</span></p>` : ''}
          ${divider}
          ${cfg.frase ? `<p class="ct-lead">${esc(cfg.frase)}</p>` : ''}
          ${d ? `<p class="ct-date">${esc(fecha.charAt(0).toUpperCase() + fecha.slice(1))} · ${esc(U.fmtTime(d))}</p>` : ''}
          <p class="ct-turn">Pasa la página ❅</p>
        </article>
      </div>`;
    },

    // Portada: libro cerrado que se abre
    coverArt(cfg) {
      return `<div class="ct-book" role="img" aria-label="Libro de cuentos">
        <div class="ct-pages"></div>
        <div class="ct-inner"><p>Érase una vez…</p></div>
        <div class="ct-front">
          <div class="ct-front-in">
            ${flake(46, '#e9f0fb')}
            <p class="ct-f-k">El cuento de</p>
            <p class="ct-f-n">${esc(cfg.festejado || '')}</p>
            <p class="ct-f-s">y el reino de invierno</p>
            <div class="ct-f-line"></div>
          </div>
        </div>
      </div>`;
    },

    deco: {
      countdown: `<span class="ct-d">${flake(46, '#9fb6dc')}</span>`,
      rsvp: `<span class="ct-d">${flake(52, '#b7a4e0')}</span>`,
    },

    footer() { return `${divider}<p class="ct-fin">…y vivieron felices para siempre.</p>`; },

    ambient(host) {
      if (host.dataset.ready) return; host.dataset.ready = '1';
      let html = '<div class="ct-aurora a1"></div><div class="ct-aurora a2"></div>';
      for (let k = 0; k < 40; k++) {
        const s = (Math.random() * 14 + 6).toFixed(0), big = Math.random() < .25;
        html += `<i class="ct-snow ${big ? 'big' : ''}" style="left:${(Math.random() * 100).toFixed(1)}%;animation-delay:${(-Math.random() * 18).toFixed(1)}s;animation-duration:${(10 + Math.random() * 12).toFixed(1)}s;font-size:${big ? s * 1.6 : s}px;--sway:${(Math.random() * 60 - 30).toFixed(0)}px">${big ? '❄' : '•'}</i>`;
      }
      host.innerHTML = html;
    },

    onOpen() {
      document.body.classList.add('ct-open');
      setTimeout(() => document.body.classList.remove('ct-open'), 2200);
    },
  };
})();
