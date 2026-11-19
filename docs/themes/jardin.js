/* Tema "Jardín de mariposas" — niña */
(function () {
  const butterfly = (x, y, s, c1, c2, delay) => `
    <g transform="translate(${x} ${y}) scale(${s})"><g class="bf" style="animation-delay:${delay || 0}s">
      <g class="wing" style="animation-delay:${delay || 0}s">
        <path d="M0 0 C-26 -44 -62 -30 -54 -2 C-50 14 -18 12 0 0Z" fill="${c1}"/>
        <path d="M0 3 C-24 10 -40 34 -22 42 C-9 47 -2 22 0 3Z" fill="${c2}"/>
        <circle cx="-34" cy="-14" r="5" fill="#fff" opacity=".7"/>
      </g>
      <g transform="scale(-1 1)"><g class="wing" style="animation-delay:${delay || 0}s">
        <path d="M0 0 C-26 -44 -62 -30 -54 -2 C-50 14 -18 12 0 0Z" fill="${c1}"/>
        <path d="M0 3 C-24 10 -40 34 -22 42 C-9 47 -2 22 0 3Z" fill="${c2}"/>
        <circle cx="-34" cy="-14" r="5" fill="#fff" opacity=".7"/>
      </g></g>
      <ellipse cx="0" cy="8" rx="3.4" ry="20" fill="#6b4a5e"/>
      <path d="M-1 -10 C-4 -20 -9 -26 -14 -28 M1 -10 C4 -20 9 -26 14 -28" stroke="#6b4a5e" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <circle cx="-14" cy="-28" r="2.2" fill="#6b4a5e"/><circle cx="14" cy="-28" r="2.2" fill="#6b4a5e"/>
    </g></g>`;

  const flower = (x, y, r, petal, center, rot) => {
    let p = '';
    for (let k = 0; k < 5; k++) {
      const a = (k * 72 + (rot || 0)) * Math.PI / 180;
      p += `<circle cx="${(x + Math.cos(a) * r).toFixed(1)}" cy="${(y + Math.sin(a) * r).toFixed(1)}" r="${(r * .92).toFixed(1)}" fill="${petal}"/>`;
    }
    return `<g class="fl">${p}<circle cx="${x}" cy="${y}" r="${(r * .62).toFixed(1)}" fill="${center}"/></g>`;
  };
  const leaf = (x, y, rot, s) => `<path transform="translate(${x} ${y}) rotate(${rot}) scale(${s || 1})" d="M0 0 C8 -14 26 -14 34 0 C26 14 8 14 0 0Z" fill="#9cc79a"/>`;

  const P = { pink: '#f7a8c4', rose: '#ee86ab', lilac: '#c9b2ec', peach: '#ffc9a8', gold: '#f6cf6b', white: '#fff7fa' };

  window.THEMES = window.THEMES || {};
  THEMES.jardin = {
    fonts: 'https://fonts.googleapis.com/css2?family=Pacifico&family=Sniglet:wght@400;800&family=Nunito:wght@400;600;700&display=swap',
    labels: {
      countdown: 'Faltan muy poquito',
      when: '¿Cuándo y dónde?',
      schedule: 'Así será el día',
      open: 'Abrir mi invitación 🦋',
      yes: '¡Sí, ahí estaré! 🦋',
    },
    confetti: [P.pink, P.rose, P.lilac, P.peach, P.gold, '#9cc79a'],
    confettiShapes: ['❀', '✿', '●', '♥'],

    hero() {
      return `<svg viewBox="0 0 300 260" role="img" aria-label="Mariposas en un jardín">
        <circle cx="150" cy="128" r="104" fill="#fde3ec"/>
        <circle cx="150" cy="128" r="104" fill="none" stroke="#f7c4d6" stroke-width="2" stroke-dasharray="2 7" stroke-linecap="round"/>
        <g class="vine-l">${leaf(46, 168, -110)}${leaf(40, 120, -70, .8)}${flower(46, 132, 8, P.lilac, P.gold, 10)}${flower(58, 86, 6, P.pink, P.gold)}</g>
        <g class="vine-r">${leaf(254, 168, -70)}${leaf(262, 120, -110, .8)}${flower(254, 132, 8, P.peach, P.gold, 30)}${flower(242, 86, 6, P.lilac, P.gold)}</g>
        ${leaf(62, 214, -150)}${leaf(222, 234, -20)}${leaf(120, 246, -170, .8)}${leaf(184, 248, -10, .8)}
        ${flower(70, 212, 13, P.pink, P.gold)}${flower(110, 232, 11, P.lilac, P.gold, 20)}${flower(150, 240, 15, P.rose, P.gold, 8)}${flower(192, 232, 11, P.peach, P.gold, 40)}${flower(232, 212, 13, P.pink, P.gold, 15)}
        ${flower(90, 196, 6, P.white, P.rose)}${flower(212, 196, 6, P.white, P.rose)}
        <g class="bf-main">${butterfly(150, 116, 1.25, P.rose, P.lilac, 0)}</g>
        <g class="bf-a">${butterfly(66, 44, .42, P.lilac, P.peach, .3)}</g>
        <g class="bf-b">${butterfly(242, 30, .36, P.peach, P.pink, .6)}</g>
        ${[[30, 70], [272, 74], [210, 170], [96, 160], [150, 18]].map(([x, y], k) => `<circle class="sp" style="animation-delay:${k * .4}s" cx="${x}" cy="${y}" r="3" fill="${P.gold}"/>`).join('')}
      </svg>`;
    },

    coverArt() {
      return `<svg viewBox="0 0 240 200" role="img" aria-label="Sobre con sello de mariposa">
        <rect x="16" y="50" width="208" height="136" rx="12" fill="#fffaf7" stroke="#f3c8d8" stroke-width="2"/>
        <path d="M16 186 L120 112 L224 186" fill="none" stroke="#f3c8d8" stroke-width="2"/>
        <path class="flap" d="M16 62 Q16 50 28 50 L212 50 Q224 50 224 62 L120 132 Z" fill="#fde3ec" stroke="#f3c8d8" stroke-width="2"/>
        <circle cx="120" cy="128" r="26" fill="#ee86ab"/><circle cx="120" cy="128" r="20" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.5" stroke-dasharray="3 3"/>
        ${butterfly(120, 126, .3, '#fff7fa', '#fde3ec', 0)}
        ${flower(34, 54, 9, P.lilac, P.gold)}${flower(206, 56, 8, P.peach, P.gold, 20)}${leaf(42, 66, 30, .7)}${leaf(196, 70, 150, .7)}
        <g class="bf-a">${butterfly(196, 20, .32, P.lilac, P.pink, .2)}</g>
      </svg>`;
    },

    deco: {
      countdown: `<svg viewBox="0 0 70 60" width="70" height="60">${flower(22, 30, 11, P.pink, P.gold)}${flower(46, 20, 8, P.lilac, P.gold, 20)}${leaf(36, 42, 20, .8)}</svg>`,
      when: `<svg viewBox="-40 -40 80 80" width="60" height="60">${butterfly(0, 0, .55, P.lilac, P.peach, .2)}</svg>`,
      schedule: `<svg viewBox="0 0 60 50" width="56" height="48">${flower(20, 26, 10, P.peach, P.gold)}${leaf(30, 36, -20, .7)}</svg>`,
      rsvp: `<svg viewBox="-40 -40 80 80" width="64" height="64">${butterfly(0, 0, .6, P.rose, P.lilac, .5)}</svg>`,
    },

    footer() {
      return `<svg class="foot-flowers" viewBox="0 0 240 40" width="200" aria-hidden="true">${leaf(60, 24, -160, .7)}${leaf(170, 24, -20, .7)}${flower(90, 22, 8, P.pink, P.gold)}${flower(120, 18, 10, P.rose, P.gold, 12)}${flower(150, 22, 8, P.lilac, P.gold)}</svg>`;
    },

    ambient(host) {
      if (host.dataset.ready) return; host.dataset.ready = '1';
      const colors = [P.pink, P.lilac, P.peach, '#ffd9e6'];
      let html = '<div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div>';
      for (let k = 0; k < 16; k++) {
        html += `<i class="petal" style="left:${Math.random() * 100}%;background:${colors[k % 4]};animation-delay:${(Math.random() * 14).toFixed(1)}s;animation-duration:${(11 + Math.random() * 8).toFixed(1)}s;--s:${(.6 + Math.random() * .8).toFixed(2)}"></i>`;
      }
      for (let k = 0; k < 3; k++) {
        html += `<div class="fly fly${k}"><svg viewBox="-40 -40 80 80" width="${34 - k * 6}" height="${34 - k * 6}">${butterfly(0, 0, .55, [P.rose, P.lilac, P.peach][k], [P.lilac, P.peach, P.pink][k], k * .2)}</svg></div>`;
      }
      host.innerHTML = html;
    },

    onOpen() {
      document.body.classList.add('bloom');
      setTimeout(() => document.body.classList.remove('bloom'), 1800);
    },
  };
})();
