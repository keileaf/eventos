/* Tema "XV años · Rosa y oro" */
(function () {
  const flourish = (w) => `<svg class="xv-flourish" viewBox="0 0 240 30" width="${w || 180}" aria-hidden="true">
    <path d="M10 15 H90 M150 15 H230" stroke="url(#xvg)" stroke-width="1.4"/>
    <path d="M120 4 L126 15 L120 26 L114 15Z" fill="url(#xvg)"/>
    <path d="M90 15 C100 4 108 4 112 15 C108 26 100 26 90 15Z M150 15 C140 4 132 4 128 15 C132 26 140 26 150 15Z" fill="none" stroke="url(#xvg)" stroke-width="1.4"/>
    <circle cx="10" cy="15" r="2.5" fill="url(#xvg)"/><circle cx="230" cy="15" r="2.5" fill="url(#xvg)"/>
  </svg>`;

  const tiara = `<svg class="xv-tiara" viewBox="0 0 200 80" aria-hidden="true">
    <path d="M20 70 Q100 86 180 70 L172 40 L148 58 L134 22 L116 52 L100 6 L84 52 L66 22 L52 58 L28 40Z" fill="url(#xvg)" stroke="#9c7330" stroke-width="1.5"/>
    <circle cx="100" cy="24" r="7" fill="#f7d2d0" stroke="#c79b45" stroke-width="2"/>
    <circle cx="66" cy="38" r="4.5" fill="#fff" stroke="#c79b45" stroke-width="1.5"/><circle cx="134" cy="38" r="4.5" fill="#fff" stroke="#c79b45" stroke-width="1.5"/>
    ${Array.from({ length: 11 }, (_, k) => `<circle cx="${40 + k * 12}" cy="${72 - 5 * Math.sin(Math.PI * k / 10)}" r="3" fill="#fff"/>`).join('')}
  </svg>`;

  const branch = (side) => `<svg class="xv-branch ${side}" viewBox="0 0 80 260" aria-hidden="true">
    <path d="M60 255 C20 200 10 120 40 10" stroke="url(#xvg)" stroke-width="2" fill="none"/>
    ${[[40, 220, -40], [26, 180, -70], [22, 140, -50], [24, 100, -80], [32, 60, -60], [42, 26, -90]].map(([x, y, r], k) =>
      `<path transform="translate(${x} ${y}) rotate(${r + (k % 2 ? 140 : 0)})" d="M0 0 C6 -10 20 -10 26 0 C20 10 6 10 0 0Z" fill="url(#xvg)" opacity=".9"/>`).join('')}
    <circle cx="48" cy="150" r="7" fill="#f2c6c1"/><circle cx="34" cy="80" r="5" fill="#fff"/><circle cx="50" cy="196" r="5" fill="#f7dcd8"/>
  </svg>`;

  // degradado dorado compartido por todos los SVG de la página
  const defs = `<svg class="xv-defs" width="0" height="0" aria-hidden="true"><defs>
    <linearGradient id="xvg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#a77a30"/><stop offset=".45" stop-color="#f1d892"/><stop offset=".7" stop-color="#c79b45"/><stop offset="1" stop-color="#8f6524"/></linearGradient>
  </defs></svg>`;

  window.THEMES = window.THEMES || {};
  THEMES.xv = {
    fonts: 'https://fonts.googleapis.com/css2?family=Great+Vibes&family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Montserrat:wght@300;400;500&display=swap',
    hideAge: true,
    labels: {
      countdown: 'Cuenta regresiva',
      family: 'Con la bendición de',
      when: 'Ceremonia y recepción',
      schedule: 'Programa',
      gallery: 'Mis momentos',
      dress: 'Código de vestimenta',
      gifts: 'Mesa de regalos',
      open: 'Abrir invitación',
      yes: 'Confirmo mi asistencia',
    },
    confetti: ['#e9cf8c', '#c79b45', '#f2c6c1', '#ffffff', '#d99a94'],
    confettiShapes: ['✦', '♥', '●', '✧'],
    quoteOrnament: flourish(200),

    hero(cfg) {
      const foto = U.img(cfg.fotoPortada);
      return `${defs}<div class="xv-hero">
        ${tiara}
        <div class="xv-frame">
          ${branch('l')}${branch('r')}
          <div class="xv-arch">${foto ? `<img src="${U.esc(foto)}" alt="${U.esc(cfg.festejado || '')}">` : '<div class="xv-noimg">XV</div>'}</div>
          <div class="xv-badge"><span>XV</span></div>
        </div>
      </div>`;
    },

    coverArt(cfg) {
      const ini = String(cfg.festejado || 'XV').trim().charAt(0).toUpperCase();
      return `${defs}<svg viewBox="0 0 240 240" role="img" aria-label="Sello XV años">
        <circle cx="120" cy="120" r="108" fill="none" stroke="url(#xvg)" stroke-width="1.5"/>
        <circle cx="120" cy="120" r="98" fill="none" stroke="url(#xvg)" stroke-width="1" stroke-dasharray="1 6" stroke-linecap="round"/>
        ${Array.from({ length: 24 }, (_, k) => { const a = k * 15 * Math.PI / 180; const x = 120 + 108 * Math.cos(a), y = 120 + 108 * Math.sin(a); return `<path transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${k * 15 + 90})" d="M0 0 C3 -6 10 -6 13 0 C10 6 3 6 0 0Z" fill="url(#xvg)" opacity=".85"/>`; }).join('')}
        <circle cx="120" cy="120" r="78" fill="#fff9f6"/>
        <circle cx="120" cy="120" r="78" fill="none" stroke="#f0d3cf" stroke-width="6"/>
        <text x="120" y="142" text-anchor="middle" font-family="Great Vibes, cursive" font-size="78" fill="url(#xvg)">${U.esc(ini)}</text>
        <text x="120" y="178" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="18" letter-spacing="6" fill="#a8605a">XV</text>
      </svg>`;
    },

    deco: {},

    footer() { return flourish(160); },

    ambient(host) {
      if (host.dataset.ready) return; host.dataset.ready = '1';
      let html = '<div class="glow g1"></div><div class="glow g2"></div>';
      for (let k = 0; k < 40; k++) {
        const s = (Math.random() * 3 + 1.5).toFixed(1);
        html += `<i class="dust" style="left:${(Math.random() * 100).toFixed(1)}%;width:${s}px;height:${s}px;animation-delay:${(-Math.random() * 18).toFixed(1)}s;animation-duration:${(12 + Math.random() * 12).toFixed(1)}s"></i>`;
      }
      host.innerHTML = html;
    },

    onOpen() {
      document.body.classList.add('xv-open');
      setTimeout(() => document.body.classList.remove('xv-open'), 2000);
    },
  };
})();
