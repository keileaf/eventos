/* Tema "Aventura espacial" — niño */
(function () {
  const rocket = (id) => `
    <g class="rk">
      <g class="rk-flame">
        <path d="M134 168 Q150 238 166 168 Z" fill="#ff8a3d"/>
        <path d="M141 168 Q150 214 159 168 Z" fill="#ffd447"/>
      </g>
      <path d="M118 120 L92 172 L124 162 Z" fill="#ff5d73"/>
      <path d="M182 120 L208 172 L176 162 Z" fill="#ff5d73"/>
      <path d="M150 26 C178 52 186 100 182 164 L118 164 C114 100 122 52 150 26 Z" fill="url(#${id}b)"/>
      <path d="M150 26 C163 38 172 52 177 70 L123 70 C128 52 137 38 150 26 Z" fill="#ff5d73"/>
      <rect x="128" y="160" width="44" height="12" rx="4" fill="#7c86c7"/>
      <circle cx="150" cy="104" r="19" fill="#ffffff"/>
      <circle cx="150" cy="104" r="14" fill="url(#${id}w)"/>
      <path d="M143 98 a9 9 0 0 1 9 -4" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>
    </g>`;

  const defs = (id) => `
    <defs>
      <linearGradient id="${id}b" x1="0" x2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#cdd3f7"/></linearGradient>
      <radialGradient id="${id}w" cx=".35" cy=".35"><stop offset="0" stop-color="#8fe3ff"/><stop offset="1" stop-color="#2f6fd6"/></radialGradient>
      <radialGradient id="${id}p" cx=".3" cy=".3"><stop offset="0" stop-color="#c58cff"/><stop offset="1" stop-color="#5b3cc4"/></radialGradient>
      <radialGradient id="${id}m" cx=".35" cy=".35"><stop offset="0" stop-color="#fff6d8"/><stop offset="1" stop-color="#e2c98a"/></radialGradient>
    </defs>`;

  const sparkle = (x, y, s, d) => `<g transform="translate(${x} ${y}) scale(${s})"><path class="tw" style="animation-delay:${d}s" d="M0 -10 Q1.5 -1.5 10 0 Q1.5 1.5 0 10 Q-1.5 1.5 -10 0 Q-1.5 -1.5 0 -10Z" fill="#ffd447"/></g>`;

  window.THEMES = window.THEMES || {};
  THEMES.espacial = {
    fonts: 'https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;800&family=Fredoka:wght@400;500;600&display=swap',
    labels: {
      countdown: 'Cuenta regresiva para el despegue',
      when: 'Coordenadas de la misión',
      schedule: 'Plan de vuelo',
      open: 'Iniciar despegue 🚀',
      yes: '¡Me apunto a la misión! 🚀',
    },
    confetti: ['#ffd447', '#ff8a3d', '#ff5d73', '#8fd3ff', '#c58cff', '#ffffff'],
    confettiShapes: ['★', '✦', '●', '★'],

    hero(cfg) {
      return `<svg viewBox="0 0 300 260" role="img" aria-label="Cohete despegando">
        ${defs('h')}
        <g class="orbit"><ellipse cx="150" cy="130" rx="138" ry="44" fill="none" stroke="#8fd3ff" stroke-opacity=".25" stroke-width="2" stroke-dasharray="4 8"/></g>
        <g class="planet-a">
          <circle cx="54" cy="196" r="36" fill="url(#hp)"/>
          <path d="M30 186 q24 -8 50 4" stroke="#ffffff" stroke-opacity=".25" stroke-width="5" fill="none" stroke-linecap="round"/>
          <ellipse cx="54" cy="198" rx="60" ry="13" fill="none" stroke="#ffd447" stroke-width="5" transform="rotate(-14 54 198)"/>
        </g>
        <g class="planet-b">
          <circle cx="252" cy="54" r="22" fill="url(#hm)"/>
          <circle cx="245" cy="48" r="4" fill="#d4b56c"/><circle cx="259" cy="60" r="3" fill="#d4b56c"/><circle cx="256" cy="45" r="2" fill="#d4b56c"/>
        </g>
        ${sparkle(40, 50, 1, 0)}${sparkle(262, 160, .8, .7)}${sparkle(214, 226, .6, 1.3)}${sparkle(84, 110, .5, 1.9)}
        <g class="rk-float">${rocket('h')}</g>
      </svg>`;
    },

    coverArt() {
      return `<svg viewBox="0 0 240 240" role="img" aria-label="Ventana de nave espacial">
        ${defs('c')}
        <circle cx="120" cy="120" r="112" fill="#6c76c9"/>
        <circle cx="120" cy="120" r="100" fill="#0b1238"/>
        ${[[60, 70], [170, 60], [190, 150], [70, 170], [120, 40], [40, 120]].map(([x, y], k) => `<circle class="tw" style="animation-delay:${k * .3}s" cx="${x}" cy="${y}" r="2" fill="#fff"/>`).join('')}
        <circle cx="168" cy="168" r="20" fill="url(#cp)"/>
        <g transform="translate(36 22) scale(.56)"><g class="rk-float">${rocket('c')}</g></g>
        ${[0, 60, 120, 180, 240, 300].map(a => `<circle cx="${120 + 106 * Math.cos(a * Math.PI / 180)}" cy="${120 + 106 * Math.sin(a * Math.PI / 180)}" r="4" fill="#cdd3f7"/>`).join('')}
      </svg>`;
    },

    deco: {
      countdown: `<svg viewBox="0 0 60 60" width="58" height="58"><circle cx="30" cy="30" r="16" fill="#ff8a3d"/><ellipse cx="30" cy="30" rx="27" ry="7" fill="none" stroke="#ffd447" stroke-width="3" transform="rotate(-20 30 30)"/></svg>`,
      when: `<svg viewBox="0 0 70 50" width="70" height="50"><ellipse cx="35" cy="30" rx="30" ry="10" fill="#8fd3ff"/><path d="M18 28 a17 15 0 0 1 34 0z" fill="#c9f0ff" opacity=".85"/><circle cx="20" cy="33" r="2.5" fill="#ffd447"/><circle cx="35" cy="36" r="2.5" fill="#ffd447"/><circle cx="50" cy="33" r="2.5" fill="#ffd447"/></svg>`,
      rsvp: `<svg viewBox="0 0 64 64" width="64" height="64"><circle cx="32" cy="26" r="16" fill="#fff"/><rect x="22" y="20" width="20" height="13" rx="6" fill="#2f6fd6"/><rect x="20" y="38" width="24" height="20" rx="8" fill="#fff"/><rect x="27" y="43" width="10" height="6" rx="2" fill="#ff5d73"/></svg>`,
    },

    footer() {
      return `<p class="space-foot">Nos vemos en órbita ✦</p>`;
    },

    ambient(host) {
      if (host.dataset.ready) return; host.dataset.ready = '1';
      let html = '';
      for (let k = 0; k < 110; k++) {
        const s = Math.random() * 2.2 + .6;
        html += `<i class="star" style="left:${Math.random() * 100}%;top:${Math.random() * 100}%;width:${s}px;height:${s}px;animation-delay:${(Math.random() * 4).toFixed(2)}s;animation-duration:${(2 + Math.random() * 3).toFixed(2)}s"></i>`;
      }
      html += '<i class="shoot" style="top:12%;left:70%"></i><i class="shoot" style="top:40%;left:95%;animation-delay:4.5s"></i>';
      html += '<div class="neb n1"></div><div class="neb n2"></div>';
      host.innerHTML = html;
    },

    onOpen() {
      document.body.classList.add('launch');
      setTimeout(() => document.body.classList.remove('launch'), 1600);
    },
  };
})();
