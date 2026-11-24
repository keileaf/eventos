/* Tema "Graduación · Azul y oro": birrete, diploma, letra Ψ (psicología) y birretes al aire. */
(function () {
  const esc = (s) => U.esc(s);

  const capSvg = (w, gold) => `<svg class="gr-cap" viewBox="0 0 240 170" width="${w || 120}" aria-hidden="true">
    <path d="M10 62 L120 16 L230 62 L120 108Z" fill="#530F0E" stroke="${gold || '#F3A0AA'}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M58 84 V126 Q120 160 182 126 V84 L120 108Z" fill="#6e1f1c"/>
    <circle cx="120" cy="62" r="7" fill="${gold || '#F3A0AA'}"/>
    <path class="gr-tassel" d="M120 62 Q176 70 194 78 V124" fill="none" stroke="${gold || '#F3A0AA'}" stroke-width="4" stroke-linecap="round"/>
    <path class="gr-tassel" d="M186 124 h16 l-4 28 h-8z" fill="${gold || '#F3A0AA'}"/>
  </svg>`;

  const laurel = (side) => {
    let s = `<svg class="gr-laurel ${side}" viewBox="0 0 80 200" aria-hidden="true"><path d="M60 196 C20 150 14 80 46 6" fill="none" stroke="#F3A0AA" stroke-width="2.5"/>`;
    for (let k = 0; k < 9; k++) {
      const t = k / 9, y = 190 - t * 175, x = 58 - Math.sin(t * Math.PI * .9) * 34 - t * 8;
      s += `<ellipse cx="${(x - 10).toFixed(1)}" cy="${y.toFixed(1)}" rx="11" ry="4.6" transform="rotate(-35 ${x.toFixed(1)} ${y.toFixed(1)})" fill="#F3A0AA"/>`;
      s += `<ellipse cx="${(x + 9).toFixed(1)}" cy="${(y - 6).toFixed(1)}" rx="11" ry="4.6" transform="rotate(35 ${x.toFixed(1)} ${(y - 6).toFixed(1)})" fill="#f5b5bd"/>`;
    }
    return s + '</svg>';
  };

  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  window.THEMES = window.THEMES || {};
  THEMES.graduacion = {
    fonts: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,800;1,600&family=Lato:wght@400;700;900&display=swap',
    fullHero: true,
    coverDelay: 1700,
    labels: {
      countdown: 'Faltan', family: 'Gracias a', when: '¿Cuándo y dónde?', schedule: 'Programa', story: 'Desde pequeña lo sabía',
      gallery: 'Recuerdos', dress: 'Código de vestimenta', gifts: 'Regalos', faq: 'Preguntas', social: 'Comparte el momento',
      photos: 'Comparte tus fotos', open: 'Abrir invitación', yes: '¡Ahí estaré!',
    },
    confetti: ['#F3A0AA', '#F8C9CF', '#530F0E', '#ffffff', '#c9727c'],
    confettiShapes: ['🎓', '✦', '●', '★'],
    quoteOrnament: '',
    storyOrnament: `<div class="gr-orn">${capSvg(64)}</div>`,

    hero(cfg) {
      const d = U.parseDate(cfg.fecha);
      const foto = U.img(cfg.fotoPortada);
      const year = d ? d.getFullYear() : '';
      const fotos = (cfg.historia || []).map(h => U.img(h.foto)).filter(Boolean).slice(0, 3);
      const dd = d ? String(d.getDate()).padStart(2, '0') + ' · ' + String(d.getMonth() + 1).padStart(2, '0') + ' · ' + String(year).slice(2) : '';
      return `<div class="ge-hero">
        <div class="ge-top"><span>${esc(cfg.encabezado || 'Cena de graduación')}</span><span class="ge-psi">Ψ</span></div>
        <p class="ge-gen">Generación</p>
        <div class="ge-year" ${foto ? `style="background-image:url('${esc(foto)}')"` : ''}>${esc(year)}</div>
        <div class="ge-year ge-year-line" aria-hidden="true">${esc(year)}</div>
        <h1 class="ge-name">${esc(cfg.festejado || '')}</h1>
        ${cfg.titulo ? `<p class="ge-era">en mi era de <b>${esc(cfg.titulo)}</b></p>` : ''}
        ${fotos.length ? `<div class="ge-strip">${fotos.map((f, k) => `<figure style="--r:${[-6, 3, -2][k]}deg"><img src="${esc(f)}" alt=""></figure>`).join('')}</div>` : ''}
        ${d ? `<div class="ge-ticket"><div><small>Fecha</small><b>${esc(dd)}</b></div><div><small>Hora</small><b>${esc(U.fmtTime(d))}</b></div><div><small>Día</small><b>${esc(d.toLocaleDateString('es-MX', { weekday: 'long' }))}</b></div></div>` : ''}
        ${cfg.frase ? `<p class="ge-lead">${esc(cfg.frase)}</p>` : ''}
      </div>`;
    },

    afterRender() {
      const y = document.querySelector('.ge-year:not(.ge-year-line)'), l = document.querySelector('.ge-year-line');
      if (y && l) l.style.marginTop = y.offsetTop + 'px';
    },

    // Portada: diploma enrollado con listón
    coverArt(cfg) {
      return `<div class="gr-dip" role="img" aria-label="Diploma">
        <div class="gr-paper"><p class="p1">Se otorga la presente invitación a</p><p class="p2">ti</p><p class="p3">para celebrar a ${esc(cfg.festejado || '')}</p><span class="gr-seal">Ψ</span></div>
        <div class="gr-roll top"></div><div class="gr-roll bot"></div>
        <div class="gr-ribbon"><i></i><i></i></div>
      </div>`;
    },

    deco: {
      countdown: `<span class="gr-d">${capSvg(70)}</span>`,
      rsvp: `<span class="gr-d">${capSvg(76)}</span>`,
    },

    footer() { return `<p class="gr-fin">¡Gracias por ser parte de este logro! 🎓</p>`; },

    ambient(host) {
      if (host.dataset.ready) return; host.dataset.ready = '1';
      let html = '<div class="gr-glow g1"></div><div class="gr-glow g2"></div>';
      for (let k = 0; k < 26; k++) {
        const s = (Math.random() * 3 + 2).toFixed(1);
        html += `<i class="gr-star" style="left:${(Math.random() * 100).toFixed(1)}%;top:${(Math.random() * 100).toFixed(1)}%;width:${s}px;height:${s}px;animation-delay:${(-Math.random() * 6).toFixed(1)}s"></i>`;
      }
      host.innerHTML = html;
    },

    // Al abrir: birretes al aire
    onOpen() {
      document.body.classList.add('gr-open');
      const box = document.createElement('div'); box.className = 'gr-toss';
      for (let k = 0; k < 9; k++) {
        const el = document.createElement('span');
        el.innerHTML = capSvg(44 + Math.random() * 30);
        el.style.left = (8 + Math.random() * 84) + 'vw';
        el.style.animationDelay = (Math.random() * .5) + 's';
        el.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
        box.appendChild(el);
      }
      document.body.appendChild(box);
      setTimeout(() => { box.remove(); document.body.classList.remove('gr-open'); }, 3200);
    },
  };
})();
