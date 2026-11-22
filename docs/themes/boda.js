/* Tema "Boda · Jardín al atardecer": foto a pantalla completa, olivo, marfil, azul marino y dorado */
(function () {
  const esc = (s) => U.esc(s);

  // Rama de olivo en trazo fino (estilo grabado)
  function olive(len, leaves, flip) {
    let s = `<path d="M0 0 Q${len * .5} ${flip ? 10 : -10} ${len} 0" stroke="#7d8f6e" stroke-width="1.3" fill="none"/>`;
    for (let k = 1; k <= leaves; k++) {
      const t = k / (leaves + 1), x = len * t, y = (flip ? 10 : -10) * 4 * t * (1 - t) * .5;
      const ang = (k % 2 ? -1 : 1) * 38;
      s += `<ellipse cx="${(x + 9).toFixed(1)}" cy="${y.toFixed(1)}" rx="10" ry="3.4" transform="rotate(${ang} ${x.toFixed(1)} ${y.toFixed(1)})" fill="#a7b597" fill-opacity=".55" stroke="#7d8f6e" stroke-width=".9"/>`;
      if (k % 3 === 0) s += `<circle cx="${(x + 3).toFixed(1)}" cy="${(y + (k % 2 ? 7 : -7)).toFixed(1)}" r="2.6" fill="#55663f"/>`;
    }
    return s;
  }
  const sprig = (w) => `<svg class="bd-sprig" viewBox="-6 -22 252 44" width="${w || 180}" aria-hidden="true">
    <g transform="translate(118 0) scale(-1 1)">${olive(110, 7)}</g><g transform="translate(128 0)">${olive(110, 7, 1)}</g>
    <circle cx="123" cy="0" r="3.2" fill="#b8955a"/></svg>`;

  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const initials = (n) => String(n || '').split(/\s*(?:&|\by\b)\s*/i).map(x => x.trim().charAt(0).toUpperCase()).filter(Boolean).slice(0, 2);

  window.THEMES = window.THEMES || {};
  THEMES.boda = {
    fonts: 'https://fonts.googleapis.com/css2?family=Allura&family=Italiana&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap',
    fullHero: true,
    labels: {
      countdown: 'Faltan', family: 'Con la bendición de', when: 'Ceremonia y recepción', schedule: 'Itinerario',
      gallery: 'Nosotros', story: 'Nuestra historia', dress: 'Código de vestimenta', gifts: 'Mesa de regalos',
      open: 'Abrir invitación', yes: 'Confirmo con gusto', faq: 'Preguntas frecuentes', stay: 'Hospedaje', social: 'Comparte el momento',
    },
    confetti: ['#b8955a', '#e9dcc2', '#7d8f6e', '#ffffff', '#1f2f4d'],
    confettiShapes: ['❦', '✦', '●', '♥'],
    quoteOrnament: sprig(160),
    storyOrnament: sprig(140),

    hero(cfg) {
      const d = U.parseDate(cfg.fecha);
      const foto = U.img(cfg.fotoPortada);
      const dia = d ? d.toLocaleDateString('es-MX', { weekday: 'long' }) : '';
      return `<div class="bd-hero ${foto ? 'has-photo' : ''}">
        ${foto ? `<div class="bd-photo ${U.img(cfg.fotoPortadaMovil) ? 'has-m' : ''}" style="background-image:url('${esc(foto)}')"></div>${U.img(cfg.fotoPortadaMovil) ? `<div class="bd-photo bd-photo-m" style="background-image:url('${esc(U.img(cfg.fotoPortadaMovil))}')"></div>` : ''}<div class="bd-shade"></div>` : ''}
        <div class="bd-hero-in">
          <p class="bd-kicker">${esc(cfg.encabezado || 'Nos casamos')}</p>
          <h1 class="bd-names">${esc(cfg.festejado || '')}</h1>
          ${d ? `<p class="bd-date"><span>${esc(dia)}</span><b>${d.getDate()}</b><span>${MESES[d.getMonth()]} ${d.getFullYear()}</span></p>` : ''}
          ${cfg.frase ? `<p class="bd-lead">${esc(cfg.frase)}</p>` : ''}
        </div>
        <div class="bd-scroll" aria-hidden="true">Desliza<span></span></div>
      </div>`;
    },

    coverDelay: 2300,
    coverArt(cfg) {
      const ini = initials(cfg.festejado);
      const d = U.parseDate(cfg.fecha);
      return `<div class="bd-env" role="img" aria-label="Sobre con sello de cera">
        <div class="bd-env-back"></div>
        <div class="bd-env-card"><span class="c-k">Nos casamos</span><span class="c-n">${esc(cfg.festejado || '')}</span>${d ? `<span class="c-d">${d.getDate()} · ${MESES[d.getMonth()]} · ${d.getFullYear()}</span>` : ''}</div>
        <div class="bd-env-front"><svg viewBox="-6 -22 252 44" class="bd-env-sprig" aria-hidden="true"><g transform="translate(118 0) scale(-1 1)">${olive(110, 7)}</g><g transform="translate(128 0)">${olive(110, 7, 1)}</g></svg></div>
        <div class="bd-env-flap"><div class="flap-in"></div></div>
        <button class="bd-seal" type="button" aria-label="Abrir"><span>${esc(ini.join('') || '♥')}</span></button>
      </div>`;
    },

    deco: {},

    footer(cfg) {
      return sprig(170);
    },

    ambient(host) {
      if (host.dataset.ready) return; host.dataset.ready = '1';
      let html = '<div class="leak l1"></div><div class="leak l2"></div>';
      for (let k = 0; k < 16; k++) {
        const s = (Math.random() * 10 + 6).toFixed(0);
        html += `<i class="bokeh" style="left:${(Math.random() * 100).toFixed(1)}%;top:${(Math.random() * 100).toFixed(1)}%;width:${s}px;height:${s}px;animation-delay:${(-Math.random() * 20).toFixed(1)}s;animation-duration:${(16 + Math.random() * 14).toFixed(1)}s"></i>`;
      }
      host.innerHTML = html;
    },

    onOpen() {
      document.body.classList.add('bd-open');
      setTimeout(() => document.body.classList.remove('bd-open'), 2600);
    },
  };
})();
