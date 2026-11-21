/* Tema "XV años · Azul acuarela": flores en acuarela azul y rosa, hojas doradas, letra manuscrita */
(function () {
  const esc = (s) => U.esc(s);

  // ---------- Piezas de ilustración ----------
  const petal = (l, w) => `M0 0 C${-w} ${(-l * .35).toFixed(1)} ${(-w * .8).toFixed(1)} ${-l} 0 ${-l} C${(w * .8).toFixed(1)} ${-l} ${w} ${(-l * .35).toFixed(1)} 0 0Z`;

  function flower(x, y, r, g, rot) {
    rot = rot || 0;
    const ring = (n, l, w, op, off) => Array.from({ length: n }, (_, k) =>
      `<path transform="rotate(${(k * 360 / n + rot + off).toFixed(1)})" d="${petal(l, w)}" fill="url(#az${g})" opacity="${op}"/>`).join('');
    return `<g transform="translate(${x} ${y})">
      ${ring(8, r, r * .6, .55, 0)}${ring(7, r * .74, r * .48, .7, 22)}${ring(5, r * .48, r * .34, .85, 9)}
      <circle r="${(r * .2).toFixed(1)}" fill="url(#az${g}c)"/>
      <path d="M${(-r * .16).toFixed(1)} 0 a${(r * .16).toFixed(1)} ${(r * .16).toFixed(1)} 0 1 1 ${(r * .2).toFixed(1)} ${(r * .1).toFixed(1)}" fill="none" stroke="${g === 'P' ? '#c9808d' : '#4f6f9f'}" stroke-width="${(r * .04).toFixed(1)}" opacity=".7"/>
    </g>`;
  }
  const leafPath = (l) => `M0 0 C${(l * .3).toFixed(1)} ${(-l * .24).toFixed(1)} ${(l * .75).toFixed(1)} ${(-l * .2).toFixed(1)} ${l} 0 C${(l * .75).toFixed(1)} ${(l * .2).toFixed(1)} ${(l * .3).toFixed(1)} ${(l * .24).toFixed(1)} 0 0Z`;
  const leaf = (x, y, rot, l) => `<g transform="translate(${x} ${y}) rotate(${rot})"><path d="${leafPath(l)}" fill="url(#azL)" opacity=".8"/><path d="M0 0 L${l * .9} 0" stroke="#4f6f9f" stroke-width="1" opacity=".45"/></g>`;
  const gold = (x, y, rot, l) => `<g transform="translate(${x} ${y}) rotate(${rot})"><path d="${leafPath(l)}" fill="none" stroke="#c9a54a" stroke-width="1.4"/><path d="M0 0 Q${l * .5} ${l * .04} ${l * .92} 0" stroke="#c9a54a" stroke-width="1" fill="none"/>${[.3, .5, .7].map(t => `<path d="M${l * t} 0 l${l * .08} ${-l * .1} M${l * t} 0 l${l * .08} ${l * .1}" stroke="#c9a54a" stroke-width=".8"/>`).join('')}</g>`;
  const sprig = (x, y, rot, l) => {
    let s = `<g transform="translate(${x} ${y}) rotate(${rot})"><path d="M0 0 Q${l * .5} ${l * .08} ${l} 0" stroke="#6f8fbf" stroke-width="1.4" fill="none"/>`;
    for (let k = 1; k <= 5; k++) { const t = k / 6; s += `<ellipse cx="${l * t}" cy="${(k % 2 ? -1 : 1) * 7}" rx="7" ry="4" transform="rotate(${k % 2 ? -30 : 30} ${l * t} ${(k % 2 ? -1 : 1) * 7})" fill="#8fa8cc" opacity=".75"/>`; }
    return s + '</g>';
  };
  const berries = (x, y) => [[0, 0], [10, -6], [6, 9], [-8, 7]].map(([dx, dy]) => `<circle cx="${x + dx}" cy="${y + dy}" r="5.5" fill="#3d5a8a"/><circle cx="${x + dx - 1.6}" cy="${y + dy - 1.6}" r="1.6" fill="#fff" opacity=".6"/>`).join('');

  // Ramo de esquina (anclado arriba a la izquierda; abajo a la derecha se rota 180°)
  const corner = () => `<svg viewBox="0 0 320 320" aria-hidden="true"><g filter="url(#azWc)">
    ${gold(150, 70, 18, 120)}${gold(55, 165, 72, 115)}${gold(205, 22, -8, 90)}
    ${sprig(70, 140, 100, 170)}${sprig(140, 45, 5, 175)}
    ${leaf(110, 118, 38, 105)}${leaf(28, 225, 88, 90)}${leaf(225, 45, 8, 80)}${leaf(168, 110, 30, 70)}${leaf(90, 30, -20, 80)}
    ${flower(68, 62, 72, 'B', 10)}${flower(178, 30, 44, 'B', 40)}${flower(34, 178, 48, 'P', 20)}${flower(128, 128, 30, 'B', 0)}${flower(220, 82, 22, 'P', 15)}
    ${berries(206, 112)}${berries(262, 34)}
  </g></svg>`;

  const defs = `<svg class="az-defs" width="0" height="0" aria-hidden="true"><defs>
    <linearGradient id="azB" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#5f80b4"/><stop offset=".55" stop-color="#a9bfdf"/><stop offset="1" stop-color="#eef3fa"/></linearGradient>
    <linearGradient id="azP" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#d48c99"/><stop offset=".55" stop-color="#f1c6cd"/><stop offset="1" stop-color="#fdf1f3"/></linearGradient>
    <radialGradient id="azBc"><stop offset="0" stop-color="#4f6f9f"/><stop offset="1" stop-color="#8fa8cc"/></radialGradient>
    <radialGradient id="azPc"><stop offset="0" stop-color="#c47584"/><stop offset="1" stop-color="#eab3bd"/></radialGradient>
    <linearGradient id="azL" x1="0" x2="1"><stop offset="0" stop-color="#4f6f9f"/><stop offset="1" stop-color="#b3c6e0"/></linearGradient>
    <filter id="azWc" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="5"/></filter>
  </defs></svg>`;

  const MESES = ['ENE.', 'FEB.', 'MAR.', 'ABR.', 'MAYO', 'JUN.', 'JUL.', 'AGO.', 'SEPT.', 'OCT.', 'NOV.', 'DIC.'];

  window.THEMES = window.THEMES || {};
  THEMES['xv-azul'] = {
    fonts: 'https://fonts.googleapis.com/css2?family=Pinyon+Script&family=Cinzel:wght@400;500&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap',
    fullHero: true,
    labels: {
      countdown: 'Cuenta regresiva', family: 'Con la bendición de', when: 'Ceremonia y recepción',
      schedule: 'Programa', gallery: 'Mis recuerdos', dress: 'Código de vestimenta', gifts: 'Mesa de regalos',
      open: 'Abrir invitación', yes: 'Confirmo mi asistencia', social: 'Comparte tus recuerdos',
    },
    confetti: ['#8fa8cc', '#5f80b4', '#f1c6cd', '#c9a54a', '#ffffff'],
    confettiShapes: ['❀', '✦', '●', '♥'],
    quoteOrnament: `<svg class="az-orn" viewBox="0 0 200 20" width="170" aria-hidden="true"><path d="M10 10 H80 M120 10 H190" stroke="#c9a54a" stroke-width="1"/><circle cx="100" cy="10" r="4" fill="none" stroke="#c9a54a"/><circle cx="88" cy="10" r="1.8" fill="#c9a54a"/><circle cx="112" cy="10" r="1.8" fill="#c9a54a"/></svg>`,

    hero(cfg) {
      const d = U.parseDate(cfg.fecha);
      const foto = U.img(cfg.fotoPortada);
      const isXV = cfg.tipo === 'xv' || !cfg.tipo;
      const lugar = (Array.isArray(cfg.lugares) && cfg.lugares.find(l => l && l.nombre)) || cfg.lugar || {};
      const dia = d ? d.toLocaleDateString('es-MX', { weekday: 'long' }).toUpperCase() : '';
      const hora = d ? d.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' }).toUpperCase().replace(/\s/g, ' ') : '';
      return `${defs}<div class="az-hero">
        <div class="az-corner tl">${corner()}</div>
        <div class="az-corner br">${corner()}</div>
        ${isXV ? `<p class="az-xv">XV</p><p class="az-anos">años</p>` : `<p class="az-anos">${esc(cfg.encabezado || '')}</p>`}
        ${foto ? `<div class="az-photo"><img src="${esc(foto)}" alt="${esc(cfg.festejado || '')}"></div>` : ''}
        <h1 class="az-name">${esc(cfg.festejado || '')}</h1>
        ${cfg.frase ? `<p class="az-lead">${esc(cfg.frase)}</p>` : ''}
        ${d ? `<div class="az-date">
          <div class="az-month">${MESES[d.getMonth()]}</div>
          <div class="az-row"><span class="az-side">${esc(dia)}</span><span class="az-day">${d.getDate()}</span><span class="az-side">${esc(hora)}</span></div>
        </div>` : ''}
        ${lugar.nombre ? `<p class="az-place">${esc(lugar.nombre)}${lugar.direccion ? `<br><span>${esc(lugar.direccion)}</span>` : ''}</p>` : ''}
        <p class="az-cta">¡Te esperamos!</p>
      </div>`;
    },

    coverDelay: 2300,
    coverArt(cfg) {
      const ini = cfg.tipo === 'xv' || !cfg.tipo ? String(cfg.festejado || 'XV').trim().charAt(0).toUpperCase() : String(cfg.festejado || '').charAt(0);
      return `${defs}<div class="az-env" role="img" aria-label="Sobre con sello">
        <div class="az-env-back"></div>
        <div class="az-env-card"><span class="c-xv">XV</span><span class="c-name">${esc(String(cfg.festejado || '').split(' ')[0])}</span></div>
        <div class="az-env-front"><svg viewBox="0 0 320 120" preserveAspectRatio="none" aria-hidden="true"><g filter="url(#azWc)">${flower(26, 100, 26, 'B', 10)}${flower(64, 112, 16, 'P', 0)}${leaf(80, 96, -20, 34)}${gold(6, 76, -40, 40)}${flower(296, 104, 22, 'B', 30)}${leaf(262, 104, -160, 30)}${berries(276, 80)}</g></svg></div>
        <div class="az-env-flap"><div class="flap-in"></div></div>
        <button class="az-seal" type="button" aria-label="Abrir"><span>${esc(ini)}</span></button>
      </div>`;
    },

    deco: {
      rsvp: `<svg viewBox="0 0 120 60" width="120" height="60">${'<g filter="url(#azWc)">' + gold(18, 40, -20, 40) + gold(102, 40, -160, 40) + leaf(30, 34, -35, 34) + leaf(90, 34, -145, 34) + flower(60, 30, 20, 'B', 0) + flower(40, 40, 11, 'P', 10) + flower(80, 40, 11, 'P', 30) + '</g>'}</svg>`,
      family: `<svg viewBox="0 0 80 40" width="80" height="40">${'<g filter="url(#azWc)">' + gold(8, 30, -25, 30) + leaf(70, 30, -150, 28) + flower(40, 22, 14, 'B', 0) + '</g>'}</svg>`,
    },

    footer() {
      return `<div class="az-foot">${corner()}</div>`;
    },

    ambient(host) {
      if (host.dataset.ready) return; host.dataset.ready = '1';
      let html = '<div class="wash w1"></div><div class="wash w2"></div><div class="wash w3"></div>';
      const speck = (cx, cy) => {
        let s = '';
        for (let k = 0; k < 26; k++) {
          const r = Math.random() * 3 + 1;
          s += `<i class="speck" style="left:${(cx + (Math.random() - .5) * 22).toFixed(1)}%;top:${(cy + (Math.random() - .5) * 22).toFixed(1)}%;width:${r}px;height:${r}px;animation-delay:${(Math.random() * 4).toFixed(1)}s"></i>`;
        }
        return s;
      };
      host.innerHTML = html + speck(88, 18) + speck(10, 78);
    },

    onOpen() {
      document.body.classList.add('az-open');
      setTimeout(() => document.body.classList.remove('az-open'), 2200);
    },
  };
})();
