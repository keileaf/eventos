/* Tema "Súper héroe" — estilo cómic original: el festejado es el héroe.
   (No usa personajes con derechos de autor: emblema, colores y efectos propios.) */
(function () {
  const esc = (s) => U.esc(s);

  // Estallido de cómic (estrella dentada) con texto
  function burst(text, fill, w, rot) {
    let pts = '';
    for (let k = 0; k < 24; k++) {
      const a = k * Math.PI / 12, r = k % 2 ? 62 : 92;
      pts += (100 + r * Math.cos(a)).toFixed(1) + ',' + (100 + r * Math.sin(a) * .78).toFixed(1) + ' ';
    }
    return `<svg class="hr-burst" viewBox="0 0 200 200" width="${w || 140}" style="transform:rotate(${rot || -8}deg)" aria-hidden="true">
      <polygon points="${pts}" fill="#1b1340" transform="translate(6 6)"/>
      <polygon points="${pts}" fill="${fill || '#ffd23f'}" stroke="#1b1340" stroke-width="5" stroke-linejoin="round"/>
      <text x="100" y="114" text-anchor="middle" font-family="Bangers, Impact, sans-serif" font-size="${Math.min(46, Math.round(230 / Math.max(3, String(text).length)))}" fill="#1b1340" letter-spacing="1">${esc(text)}</text>
    </svg>`;
  }

  // Emblema propio: escudo con rayo y la inicial
  function emblem(ini, w) {
    return `<svg class="hr-emblem" viewBox="0 0 200 220" width="${w || 170}" role="img" aria-label="Emblema">
      <path d="M100 8 L188 40 L176 132 Q160 186 100 212 Q40 186 24 132 L12 40 Z" fill="#1b1340" transform="translate(5 5)"/>
      <path d="M100 8 L188 40 L176 132 Q160 186 100 212 Q40 186 24 132 L12 40 Z" fill="#ffd23f" stroke="#1b1340" stroke-width="6" stroke-linejoin="round"/>
      <path d="M100 26 L170 52 L160 128 Q147 172 100 194 Q53 172 40 128 L30 52 Z" fill="#6c3bd1"/>
      <path class="hr-bolt" d="M118 36 L70 122 L102 122 L82 186 L138 92 L106 92 L128 36 Z" fill="#ff6b35" stroke="#1b1340" stroke-width="5" stroke-linejoin="round"/>
      <circle cx="148" cy="62" r="20" fill="#22d3ee" stroke="#1b1340" stroke-width="4"/>
      <text x="148" y="71" text-anchor="middle" font-family="Bangers, Impact, sans-serif" font-size="26" fill="#1b1340">${esc(ini)}</text>
    </svg>`;
  }

  const speedLines = () => `<svg class="hr-speed" viewBox="0 0 400 400" preserveAspectRatio="none" aria-hidden="true">${Array.from({ length: 36 }, (_, k) => {
    const a = k * 10 * Math.PI / 180; return `<path d="M200 200 L${(200 + 420 * Math.cos(a - .03)).toFixed(0)} ${(200 + 420 * Math.sin(a - .03)).toFixed(0)} L${(200 + 420 * Math.cos(a + .03)).toFixed(0)} ${(200 + 420 * Math.sin(a + .03)).toFixed(0)}Z" fill="#fff" opacity="${k % 2 ? .1 : .18}"/>`;
  }).join('')}</svg>`;

  const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

  window.THEMES = window.THEMES || {};
  THEMES.heroe = {
    fonts: 'https://fonts.googleapis.com/css2?family=Bangers&family=Nunito:wght@600;800;900&display=swap',
    fullHero: true,
    coverDelay: 1300,
    labels: {
      countdown: '¡Cuenta regresiva!', when: 'Base secreta', schedule: 'Misiones del día', gallery: 'Archivo del héroe',
      dress: '¡Ven de héroe!', gifts: 'Regalos', faq: 'Preguntas', social: 'Fotos de la misión',
      open: '¡Activar misión!', yes: '¡Me uno al equipo!',
    },
    confetti: ['#ffd23f', '#ff6b35', '#22d3ee', '#6c3bd1', '#ffffff'],
    confettiShapes: ['★', '⚡', '●', '✦'],
    quoteOrnament: '',

    hero(cfg) {
      const d = U.parseDate(cfg.fecha);
      const foto = U.img(cfg.fotoPortada);
      const ini = String(cfg.festejado || 'H').charAt(0).toUpperCase();
      return `<div class="hr-hero">
        ${speedLines()}
        <div class="hr-dots"></div>
        <p class="hr-issue">EDICIÓN ESPECIAL · Nº ${esc(cfg.edad || '1')}</p>
        <h1 class="hr-title">${cfg.prefijo ? `<span>${esc(String(cfg.prefijo).toUpperCase())}</span>` : ''}<b>${esc(String(cfg.festejado || '').toUpperCase())}</b></h1>
        <div class="hr-panel">
          ${foto ? `<img src="${esc(foto)}" alt="${esc(cfg.festejado || '')}">` : emblem(ini, 200)}
          <div class="hr-bubble">${esc(cfg.encabezado || '¡Ven a mi fiesta!')}</div>
          <div class="hr-b1">${burst('¡POW!', '#ffd23f', 110, -12)}</div>
        </div>
        <div class="hr-age">${emblem(ini, 96)}<div><span>¡CUMPLE</span><b>${esc(cfg.edad || '')}</b><span>AÑOS!</span></div></div>
        ${d ? `<div class="hr-date"><b>${d.getDate()}</b><span>${MESES[d.getMonth()]}<br>${d.getFullYear()}</span><i>${esc(U.fmtTime(d))}</i></div>` : ''}
        ${cfg.frase ? `<p class="hr-lead">${esc(cfg.frase)}</p>` : ''}
      </div>`;
    },

    coverArt(cfg) {
      const ini = String(cfg.festejado || 'H').charAt(0).toUpperCase();
      return `<div class="hr-cover">${speedLines()}${emblem(ini, 190)}<div class="hr-cb">${burst('¡ALERTA!', '#ff6b35', 150, 10)}</div></div>`;
    },

    deco: {
      countdown: burst('¡YA!', '#22d3ee', 90, 12),
      rsvp: burst('¡ZAS!', '#ffd23f', 100, -10),
      schedule: burst('¡BAM!', '#ff6b35', 90, 8),
    },

    footer(cfg) {
      return `<p class="hr-foot">${esc('¡CONTINUARÁ…!')}</p>`;
    },

    ambient(host) {
      if (host.dataset.ready) return; host.dataset.ready = '1';
      let html = '<div class="hr-bg-dots"></div>';
      const words = ['¡POW!', '¡BAM!', '¡ZAS!', '¡WOW!', '⚡', '★'];
      for (let k = 0; k < 10; k++) {
        html += `<i class="hr-float" style="left:${(Math.random() * 92).toFixed(1)}%;top:${(Math.random() * 100).toFixed(1)}%;animation-delay:${(-Math.random() * 12).toFixed(1)}s;font-size:${(14 + Math.random() * 16).toFixed(0)}px">${words[k % words.length]}</i>`;
      }
      host.innerHTML = html;
    },

    onOpen() {
      document.body.classList.add('hr-open');
      const f = document.createElement('div'); f.className = 'hr-flash'; document.body.appendChild(f);
      setTimeout(() => f.remove(), 900);
      setTimeout(() => document.body.classList.remove('hr-open'), 1800);
    },
  };
})();
