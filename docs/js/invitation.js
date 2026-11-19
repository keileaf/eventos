/* Página de invitación: estructura común + tema visual intercambiable (themes/<tema>.css/.js)
   Secciones (todas opcionales según la configuración del evento):
   portada · hero · cita · cuenta regresiva · padres/padrinos · cuándo y dónde (varios lugares, mapa, croquis)
   · itinerario · galería · vestimenta/regalos · confirmación · pie · música */
(function () {
  const { esc, $, $$ } = U;
  const state = { evento: null, invitado: null, theme: null, pending: null };

  async function boot() {
    const { e, i } = U.params();
    if (!e) return fail('Este enlace no contiene una invitación.');
    try {
      const data = await API.call('getInvitation', { e, i });
      state.evento = data.evento;
      state.invitado = data.invitado;
      const tema = (data.evento.tema || 'espacial').replace(/[^a-z0-9_-]/gi, '');
      await Promise.all([U.loadCss('themes/' + tema + '.css'), U.loadJs('themes/' + tema + '.js').catch(() => {})]);
      state.theme = (window.THEMES && THEMES[tema]) || {};
      if (state.theme.fonts) U.loadCss(state.theme.fonts);
      document.body.className = 'theme-' + tema;
      render();
    } catch (err) {
      fail(err.message || 'No pudimos cargar la invitación.');
    }
  }

  function fail(msg) {
    document.body.className = 'theme-none';
    $('#app').innerHTML = `<div class="fail"><div class="fail-emoji">💌</div><h1>Ups…</h1><p>${esc(msg)}</p><p class="muted">Revisa que el enlace esté completo o pide uno nuevo a quien te invitó.</p></div>`;
  }

  // Compatibilidad: "lugar" (uno) o "lugares" (varios)
  function places(cfg) {
    if (Array.isArray(cfg.lugares) && cfg.lugares.some(l => l && l.nombre)) return cfg.lugares.filter(l => l && l.nombre);
    return cfg.lugar && cfg.lugar.nombre ? [Object.assign({ titulo: '' }, cfg.lugar)] : [];
  }

  // ---------- Render ----------
  function render() {
    const cfg = state.evento.config || {};
    const th = state.theme;
    const inv = state.invitado;
    const fecha = U.parseDate(cfg.fecha);
    const L = th.labels || {};
    const lugares = places(cfg);
    const galeria = (cfg.galeria || []).map(U.img).filter(Boolean);
    const padres = (cfg.padres || []).filter(p => p && p.nombres && p.nombres.length);
    document.title = cfg.festejado ? 'Invitación · ' + cfg.festejado : 'Invitación';
    const tipoTxt = { cumpleanos: 'cumpleaños', xv: 'XV años', boda: 'boda', bautizo: 'bautizo' }[cfg.tipo] || 'celebración';

    $('#app').innerHTML = `
      ${cover(cfg, inv, th)}
      <main class="inv">
        <section class="hero">
          <div class="hero-art">${th.hero ? th.hero(cfg) : (U.img(cfg.fotoPortada) ? `<img class="hero-photo" src="${esc(U.img(cfg.fotoPortada))}" alt="">` : '')}</div>
          <p class="kicker">${esc(cfg.encabezado || '¡Estás invitado!')}</p>
          <h1 class="name">${esc(cfg.festejado || '')}</h1>
          ${th.hideAge ? '' : cfg.edad ? `<div class="age"><span class="age-label">cumple</span><span class="age-num">${esc(cfg.edad)}</span><span class="age-label">${Number(cfg.edad) === 1 ? 'año' : 'años'}</span></div>` : `<p class="age-label solo">${esc(tipoTxt)}</p>`}
          ${cfg.frase ? `<p class="lead">${esc(cfg.frase)}</p>` : ''}
          <div class="scroll-hint" aria-hidden="true"><span></span></div>
        </section>

        ${cfg.cita ? `<section class="quote reveal">${th.quoteOrnament || ''}<p>${esc(cfg.cita)}</p></section>` : ''}

        ${fecha ? `
        <section class="card countdown reveal">
          ${deco(th, 'countdown')}
          <h2 class="sec-title">${esc(L.countdown || 'Faltan')}</h2>
          <div class="cd" id="cd">
            ${['días', 'horas', 'min', 'seg'].map((l, k) => `<div class="cd-box"><span class="cd-num" data-k="${k}">--</span><span class="cd-lbl">${l}</span></div>`).join('')}
          </div>
        </section>` : ''}

        ${padres.length ? `
        <section class="card family reveal">
          ${deco(th, 'family')}
          <h2 class="sec-title">${esc(L.family || 'Con la bendición de')}</h2>
          <div class="family-grid">
            ${padres.map(p => `<div class="fam"><h3>${esc(p.titulo || '')}</h3>${p.nombres.map(n => `<p>${esc(n)}</p>`).join('')}</div>`).join('')}
          </div>
        </section>` : ''}

        ${fecha || lugares.length ? `
        <section class="card when reveal">
          ${deco(th, 'when')}
          <h2 class="sec-title">${esc(L.when || '¿Cuándo y dónde?')}</h2>
          ${fecha ? `<div class="info date-info"><div class="info-ico">${icon('cal')}</div><div><strong>${esc(U.fmtDate(fecha))}</strong><span>${esc(U.fmtTime(fecha))}</span></div></div>
          <div class="btn-row"><a class="btn ghost sm" href="${esc(gcal(cfg, fecha, lugares[0]))}" target="_blank" rel="noopener">${icon('plus')} Agregar al calendario</a></div>` : ''}
          ${lugares.map((l, k) => placeHtml(l, k)).join('')}
        </section>` : ''}

        ${Array.isArray(cfg.horario) && cfg.horario.length ? `
        <section class="card schedule reveal">
          ${deco(th, 'schedule')}
          <h2 class="sec-title">${esc(L.schedule || 'Itinerario')}</h2>
          <ol class="timeline">
            ${cfg.horario.map(h => `<li><span class="t-dot"></span><span class="t-time">${esc(h.hora)}</span><span class="t-text">${esc(h.texto)}</span></li>`).join('')}
          </ol>
        </section>` : ''}

        ${galeria.length ? `
        <section class="gallery reveal" aria-label="Galería de fotos">
          <h2 class="sec-title">${esc(L.gallery || 'Galería')}</h2>
          <div class="g-track" id="gTrack">
            ${galeria.map((src, k) => `<figure class="g-item"><button class="g-open" data-k="${k}" aria-label="Ver foto ${k + 1}"><img src="${esc(src)}" alt="Foto ${k + 1}" loading="lazy"></button></figure>`).join('')}
          </div>
          <div class="g-nav">
            <button class="g-arrow" data-d="-1" aria-label="Anterior">‹</button>
            <div class="g-dots">${galeria.map((_, k) => `<span class="${k ? '' : 'on'}"></span>`).join('')}</div>
            <button class="g-arrow" data-d="1" aria-label="Siguiente">›</button>
          </div>
        </section>` : ''}

        ${cfg.vestimenta || cfg.regalos ? `
        <section class="card notes reveal">
          ${deco(th, 'notes')}
          ${cfg.vestimenta ? `<div class="note"><div class="note-ico">${icon('shirt')}</div><h3>${esc(L.dress || 'Vestimenta')}</h3><p>${esc(cfg.vestimenta)}</p></div>` : ''}
          ${cfg.regalos ? `<div class="note"><div class="note-ico">${icon('gift')}</div><h3>${esc(L.gifts || 'Regalos')}</h3><p>${esc(cfg.regalos)}</p></div>` : ''}
        </section>` : ''}

        <section class="card rsvp reveal" id="rsvp">
          ${deco(th, 'rsvp')}
          <div id="rsvpBody">${rsvpHtml(cfg, inv)}</div>
        </section>

        <footer class="foot reveal">
          ${cfg.firma ? `<p class="firma">${esc(cfg.firma)}</p>` : ''}
          ${th.footer ? th.footer(cfg) : ''}
        </footer>
      </main>
      ${cfg.musica ? `<button class="music-btn" id="musicBtn" aria-label="Música" aria-pressed="false"><span class="m-ico">${icon('note')}</span><span class="m-bars"><i></i><i></i><i></i></span></button>` : ''}
      <div class="lightbox" id="lightbox" hidden>
        <button class="lb-close" aria-label="Cerrar">×</button>
        <button class="lb-arrow prev" aria-label="Anterior">‹</button>
        <img alt="">
        <button class="lb-arrow next" aria-label="Siguiente">›</button>
      </div>`;

    if (th.ambient) th.ambient($('#ambient'), cfg);
    if (cfg.musica) Music.init(cfg.musica);
    bindCover();
    bindRsvp();
    bindPlaces();
    bindGallery(galeria);
    startCountdown(fecha);
    reveal();
    document.body.classList.remove('loading');
  }

  function deco(th, where) { return th.deco && th.deco[where] ? `<div class="deco deco-${where}" aria-hidden="true">${th.deco[where]}</div>` : ''; }

  function placeHtml(l, k) {
    const croquis = U.img(l.croquis);
    const q = encodeURIComponent([l.nombre, l.direccion].filter(Boolean).join(', '));
    return `<div class="place" data-q="${esc(q)}">
      ${l.titulo ? `<p class="place-t">${esc(l.titulo)}</p>` : ''}
      <div class="info"><div class="info-ico">${icon('pin')}</div><div>
        <strong>${esc(l.nombre)}</strong>
        ${l.hora ? `<span class="place-h">${esc(l.hora)}</span>` : ''}
        <span>${esc(l.direccion || '')}</span>
      </div></div>
      <div class="btn-row">
        <a class="btn sm" href="${esc(safeUrl(l.mapa) || 'https://www.google.com/maps/search/?api=1&query=' + q)}" target="_blank" rel="noopener">${icon('nav')} Cómo llegar</a>
        <button class="btn ghost sm" data-map="${k}">${icon('map')} Ver mapa</button>
        ${croquis ? `<button class="btn ghost sm" data-croquis="${esc(croquis)}">${icon('sketch')} Croquis</button>` : ''}
      </div>
      <div class="map-box" hidden></div>
    </div>`;
  }

  function bindPlaces() {
    $$('[data-map]').forEach(b => b.addEventListener('click', () => {
      const place = b.closest('.place'); const box = $('.map-box', place);
      if (!box.hidden) { box.hidden = true; b.classList.remove('on'); return; }
      if (!box.firstChild) box.innerHTML = `<iframe title="Mapa" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=${place.dataset.q}&z=16&output=embed"></iframe>`;
      box.hidden = false; b.classList.add('on');
    }));
    $$('[data-croquis]').forEach(b => b.addEventListener('click', () => Lightbox.open([b.dataset.croquis], 0)));
  }

  // ---------- Galería + visor ----------
  function bindGallery(list) {
    const track = $('#gTrack'); if (!track) return;
    const dots = $$('.g-dots span');
    const items = $$('.g-item', track);
    const go = (d) => {
      const w = items[0].getBoundingClientRect().width + 14;
      track.scrollBy({ left: d * w, behavior: 'smooth' });
    };
    $$('.g-arrow').forEach(a => a.addEventListener('click', () => go(+a.dataset.d)));
    track.addEventListener('scroll', () => {
      const w = items[0].getBoundingClientRect().width + 14;
      const k = Math.round(track.scrollLeft / w);
      dots.forEach((d, j) => d.classList.toggle('on', j === k));
    }, { passive: true });
    $$('.g-open', track).forEach(b => b.addEventListener('click', () => Lightbox.open(list, +b.dataset.k)));
  }

  const Lightbox = {
    list: [], k: 0,
    open(list, k) {
      this.list = list; this.k = k;
      const lb = $('#lightbox'); lb.hidden = false; document.body.classList.add('lb-open');
      $('.lb-arrow.prev', lb).hidden = $('.lb-arrow.next', lb).hidden = list.length < 2;
      this.show();
      if (!lb.dataset.bound) {
        lb.dataset.bound = 1;
        lb.addEventListener('click', (e) => { if (e.target === lb || e.target.classList.contains('lb-close')) this.close(); });
        $('.lb-arrow.prev', lb).onclick = () => this.step(-1);
        $('.lb-arrow.next', lb).onclick = () => this.step(1);
        document.addEventListener('keydown', (e) => {
          if (lb.hidden) return;
          if (e.key === 'Escape') this.close(); if (e.key === 'ArrowLeft') this.step(-1); if (e.key === 'ArrowRight') this.step(1);
        });
        let x0 = null;
        lb.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
        lb.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) this.step(dx < 0 ? 1 : -1); x0 = null; });
      }
    },
    step(d) { this.k = (this.k + d + this.list.length) % this.list.length; this.show(); },
    show() { $('#lightbox img').src = this.list[this.k]; },
    close() { $('#lightbox').hidden = true; document.body.classList.remove('lb-open'); },
  };

  // ---------- Portada ----------
  function cover(cfg, inv, th) {
    return `<div class="cover" id="cover" role="dialog" aria-label="Abrir invitación">
      <div class="cover-inner">
        <div class="cover-art">${th.coverArt ? th.coverArt(cfg) : ''}</div>
        <p class="cover-kicker">${inv ? 'Invitación especial para' : 'Tienes una invitación'}</p>
        <h2 class="cover-name">${esc(inv ? inv.nombre : cfg.festejado || '')}</h2>
        <button class="btn cover-btn" id="openCover">${esc(th.labels?.open || 'Abrir invitación')}</button>
        ${cfg.musica ? '<p class="cover-music">♪ Esta invitación tiene música</p>' : ''}
      </div>
    </div>`;
  }
  function bindCover() {
    const c = $('#cover');
    document.body.classList.add('covered');
    $('#openCover').addEventListener('click', () => {
      c.classList.add('opening');
      document.body.classList.remove('covered');
      if (state.theme.onOpen) state.theme.onOpen();
      Music.play(); // el clic del invitado permite iniciar el audio
      setTimeout(() => c.remove(), 1100);
    });
  }

  // ---------- Confirmación (una sola vez) ----------
  function rsvpHtml(cfg, inv) {
    const limite = U.parseDate(cfg.fechaLimite);
    const cerrado = limite && Date.now() > limite.getTime() + 864e5 - 1;
    const limiteTxt = limite ? `<p class="small muted center">Confirma a más tardar el ${esc(limite.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' }))}.</p>` : '';

    if (!inv) {
      return `<h2 class="sec-title">Confirma tu asistencia</h2>
        <p>Esta es la vista general de la invitación. Cada invitado recibe un enlace personal para confirmar.</p>`;
    }
    const lugaresTxt = inv.lugares === 1 ? '1 lugar' : inv.lugares + ' lugares';
    const head = `<p class="rsvp-for">Invitación para</p>
      <h2 class="rsvp-name">${esc(inv.nombre)}</h2>
      <p class="rsvp-seats">Hemos reservado <strong>${lugaresTxt}</strong> especialmente para ti.</p>`;

    if (inv.estado && inv.estado !== 'pendiente') {
      const ok = inv.estado === 'confirmó';
      return `${head}
        <div class="rsvp-done ${ok ? 'yes' : 'no'}">
          <div class="rsvp-done-ico">${ok ? icon('check') : icon('heart')}</div>
          <p class="rsvp-done-title">${ok ? '¡Gracias por confirmar!' : 'Gracias por avisarnos'}</p>
          <p>${ok ? `Te esperamos: <strong>${inv.confirmados} ${inv.confirmados === 1 ? 'persona' : 'personas'}</strong>${inv.detalle.length ? ' (' + esc(inv.detalle.join(', ')) + ')' : ''}.` : '¡Te vamos a extrañar!'}</p>
          ${inv.mensaje ? `<blockquote>“${esc(inv.mensaje)}”</blockquote>` : ''}
        </div>
        <p class="small muted center">Tu respuesta quedó registrada. Si necesitas hacer algún cambio, comunícate con los anfitriones.</p>`;
    }

    if (cerrado) return `${head}<p class="muted">La fecha para confirmar ya pasó. Si tienes dudas, comunícate con los anfitriones.</p>`;

    // Paso 2: revisar antes de enviar (la respuesta es definitiva)
    if (state.pending) {
      const p = state.pending;
      const n = p.asistira ? (p.asisten ? p.asisten.length : p.cantidad) : 0;
      return `${head}
        <div class="rsvp-review">
          <p class="rsvp-done-title">${p.asistira ? '¿Confirmamos tu asistencia?' : '¿Enviamos que no podrás asistir?'}</p>
          ${p.asistira ? `<p><strong>${n} ${n === 1 ? 'persona' : 'personas'}</strong>${p.asisten ? ': ' + esc(p.asisten.join(', ')) : ''}</p>` : ''}
          ${p.mensaje ? `<blockquote>“${esc(p.mensaje)}”</blockquote>` : ''}
          <p class="small">Una vez enviada, <strong>tu respuesta ya no se podrá cambiar.</strong></p>
        </div>
        <div class="btn-col">
          <button class="btn big" id="rsvpSend">Sí, enviar respuesta</button>
          <button class="btn ghost" id="rsvpBack">Volver</button>
        </div>`;
    }

    const people = inv.personas.length
      ? `<div class="checks">${inv.personas.map((p, k) => `<label class="check"><input type="checkbox" name="p" value="${esc(p)}" ${k < inv.lugares ? 'checked' : ''}><span class="box"></span><span>${esc(p)}</span></label>`).join('')}</div>`
      : `<div class="stepper" data-max="${inv.lugares}">
          <span class="stepper-lbl">¿Cuántos asistirán?</span>
          <div class="stepper-ctl"><button type="button" class="step" data-d="-1" aria-label="Menos">−</button>
          <output id="qty">${inv.lugares}</output>
          <button type="button" class="step" data-d="1" aria-label="Más">+</button></div>
        </div>`;

    return `${head}
      <form class="rsvp-form" id="rsvpForm">
        ${people}
        <label class="field"><span>Mensaje para ${esc(cfg.festejado || 'los anfitriones')} (opcional)</span>
          <textarea name="mensaje" rows="2" maxlength="500" placeholder="¡Escribe algo bonito!"></textarea></label>
        <div class="btn-col">
          <button class="btn big" type="submit" data-v="si">${esc(state.theme.labels?.yes || '¡Ahí estaré!')}</button>
          <button class="btn ghost" type="submit" data-v="no">No podré asistir</button>
        </div>
        ${limiteTxt}
      </form>`;
  }

  function bindRsvp() {
    const box = $('#rsvp');
    const send = $('#rsvpSend');
    if (send) {
      send.addEventListener('click', async () => {
        $$('button', box).forEach(b => b.disabled = true);
        box.classList.add('busy');
        try {
          state.invitado = await API.call('rsvp', state.pending);
          state.pending = null;
          rerenderRsvp();
          if (state.invitado.estado === 'confirmó') celebrate();
        } catch (err) {
          U.toast(err.message, 'error');
          $$('button', box).forEach(b => b.disabled = false);
        } finally { box.classList.remove('busy'); }
      });
      $('#rsvpBack').addEventListener('click', () => { state.pending = null; rerenderRsvp(); });
      return;
    }
    const form = $('#rsvpForm');
    if (!form) return;
    $$('.step', form).forEach(b => b.addEventListener('click', () => {
      const o = $('#qty'); const max = +$('.stepper', form).dataset.max;
      o.textContent = Math.max(0, Math.min(max, +o.textContent + +b.dataset.d));
    }));
    let choice = 'si';
    $$('button[type=submit]', form).forEach(b => b.addEventListener('click', () => { choice = b.dataset.v; }));
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const asistira = choice === 'si';
      const body = { e: state.evento.id, i: state.invitado.token, asistira, mensaje: form.mensaje.value.trim() };
      if (state.invitado.personas.length) body.asisten = $$('input[name=p]:checked', form).map(x => x.value);
      else body.cantidad = +$('#qty').textContent;
      if (asistira && ((body.asisten && !body.asisten.length) || body.cantidad === 0)) {
        U.toast('Selecciona al menos a una persona, o elige “No podré asistir”.', 'warn'); return;
      }
      if (body.asisten && body.asisten.length > state.invitado.lugares) {
        U.toast('Solo hay ' + state.invitado.lugares + ' lugares reservados.', 'warn'); return;
      }
      state.pending = body;
      rerenderRsvp();
      $('#rsvp').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  function rerenderRsvp() {
    $('#rsvpBody').innerHTML = rsvpHtml(state.evento.config, state.invitado);
    bindRsvp();
  }

  // ---------- Música ----------
  const Music = {
    src: '', audio: null, synth: null, on: false,
    init(src) {
      this.src = src;
      const b = $('#musicBtn');
      b.addEventListener('click', () => this.on ? this.pause() : this.play());
      document.addEventListener('visibilitychange', () => { if (document.hidden && this.on) this.pause(true); else if (!document.hidden && this.resumeOnShow) { this.resumeOnShow = false; this.play(); } });
    },
    play() {
      if (!this.src) return;
      try {
        if (this.src === 'cajita') { (this.synth = this.synth || MusicBox()).start(); }
        else {
          if (!this.audio) { this.audio = new Audio(U.audio(this.src)); this.audio.loop = true; this.audio.volume = .6; }
          const p = this.audio.play(); if (p && p.catch) p.catch(() => this.set(false));
        }
        this.set(true);
      } catch (e) { this.set(false); }
    },
    pause(auto) {
      if (this.synth) this.synth.stop();
      if (this.audio) this.audio.pause();
      this.resumeOnShow = !!auto;
      this.set(false);
    },
    set(v) { this.on = v; const b = $('#musicBtn'); if (b) { b.classList.toggle('on', v); b.setAttribute('aria-pressed', v); } },
  };

  // Caja musical sintetizada (melodía original, sin archivos). Para música real usa un .mp3 en docs/musica/.
  function MusicBox() {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();
    const master = ctx.createGain(); master.gain.value = .16; master.connect(ctx.destination);
    const f = m => 440 * Math.pow(2, (m - 69) / 12);
    const chords = [[62, 66, 69], [59, 62, 66], [55, 59, 62], [57, 61, 64]]; // Re, Si m, Sol, La
    const lead = [[81, 78], [78, 74], [79, 74], [76, 73], [81, 83], [78, 81], [79, 76], [76, 74]];
    const eighth = 60 / 84 / 2;
    let step = 0, next = 0, timer = null;
    function bell(t, m, vol, len) {
      const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f(m); o2.type = 'sine'; o2.frequency.value = f(m) * 2.01;
      const g2 = ctx.createGain(); g2.gain.value = .25;
      o.connect(g); o2.connect(g2); g2.connect(g); g.connect(master);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .006); g.gain.exponentialRampToValueAtTime(.0001, t + len);
      o.start(t); o2.start(t); o.stop(t + len + .05); o2.stop(t + len + .05);
    }
    function schedule() {
      while (next < ctx.currentTime + .25) {
        const bar = Math.floor(step / 8) % 8, pos = step % 8, ch = chords[bar % 4];
        const pat = [ch[0], ch[2], ch[1] + 12, ch[2], ch[0] + 12, ch[2], ch[1] + 12, ch[2]];
        bell(next, pat[pos] + 12, .35, 1.1);
        if (pos === 0) bell(next, lead[bar][0], .55, 2.2);
        if (pos === 4) bell(next, lead[bar][1], .45, 1.8);
        next += eighth; step++;
      }
    }
    return {
      start() { if (ctx.state === 'suspended') ctx.resume(); next = ctx.currentTime + .05; clearInterval(timer); timer = setInterval(schedule, 80); schedule(); },
      stop() { clearInterval(timer); timer = null; ctx.suspend(); },
    };
  }

  // ---------- Cuenta regresiva ----------
  function startCountdown(fecha) {
    if (!fecha) return;
    const nums = $$('#cd .cd-num');
    const tick = () => {
      const ms = fecha - Date.now();
      if (ms <= 0) {
        const cd = $('#cd');
        if (cd) cd.outerHTML = `<p class="cd-done">${Date.now() - fecha < 864e5 ? '¡Hoy es el gran día! 🎉' : '¡Gracias por celebrar con nosotros!'}</p>`;
        return false;
      }
      const v = [Math.floor(ms / 864e5), Math.floor(ms / 36e5) % 24, Math.floor(ms / 6e4) % 60, Math.floor(ms / 1e3) % 60];
      nums.forEach((n, k) => { const t = String(v[k]).padStart(2, '0'); if (n.textContent !== t) { n.textContent = t; n.classList.remove('pop'); void n.offsetWidth; n.classList.add('pop'); } });
      return true;
    };
    if (tick()) { const id = setInterval(() => { if (!tick()) clearInterval(id); }, 1000); }
  }

  // ---------- Animaciones ----------
  function reveal() {
    const els = $$('.reveal');
    if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return; }
    const io = new IntersectionObserver((ents) => ents.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: 0.08 });
    els.forEach(e => io.observe(e));
  }

  function celebrate() {
    const colors = state.theme.confetti || ['#f6c945', '#ef7b7b', '#6fc2d0', '#9b8cf2'];
    const shapes = state.theme.confettiShapes || ['■', '●', '▲'];
    const host = document.createElement('div'); host.className = 'confetti'; document.body.appendChild(host);
    for (let k = 0; k < 70; k++) {
      const s = document.createElement('span');
      s.textContent = shapes[k % shapes.length];
      s.style.left = Math.random() * 100 + 'vw';
      s.style.color = colors[k % colors.length];
      s.style.fontSize = (10 + Math.random() * 16) + 'px';
      s.style.animationDelay = (Math.random() * 0.6) + 's';
      s.style.animationDuration = (2.2 + Math.random() * 1.8) + 's';
      s.style.setProperty('--drift', (Math.random() * 160 - 80) + 'px');
      host.appendChild(s);
    }
    setTimeout(() => host.remove(), 5000);
  }

  // ---------- Utilidades ----------
  function safeUrl(u) { return /^https?:\/\//i.test(u || '') ? u : ''; }
  function gcal(cfg, start, lugar) {
    const end = new Date(start.getTime() + (Number(cfg.duracionHoras) || 4) * 36e5);
    const f = d => d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + 'T' + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0') + '00';
    const titulo = cfg.titulo || (cfg.tipo === 'xv' ? 'XV años de ' : cfg.tipo === 'boda' ? 'Boda de ' : 'Fiesta de ') + (cfg.festejado || '');
    const q = new URLSearchParams({ action: 'TEMPLATE', text: titulo, dates: f(start) + '/' + f(end), location: lugar ? [lugar.nombre, lugar.direccion].filter(Boolean).join(', ') : '', details: cfg.frase || '' });
    return 'https://calendar.google.com/calendar/render?' + q.toString();
  }

  function icon(n) {
    const p = {
      cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
      pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
      nav: '<path d="M3 11l18-8-8 18-2-8-8-2z"/>',
      map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/>',
      sketch: '<path d="M4 20l4-1 11-11-3-3L5 16l-1 4zM14 6l3 3"/>',
      plus: '<path d="M12 5v14M5 12h14"/>',
      shirt: '<path d="M8 3l-5 3 2 5 3-1v11h8V10l3 1 2-5-5-3a4 4 0 0 1-8 0z"/>',
      gift: '<rect x="3" y="8" width="18" height="5" rx="1"/><path d="M5 13v8h14v-8M12 8v13M12 8S10.5 3 8 4s0 4 4 4zm0 0s1.5-5 4-4-0 4-4 4z"/>',
      check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
      heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
      note: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
    }[n] || '';
    return `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  }

  window.addEventListener('hashchange', () => { if (location.hash.includes('e=')) location.reload(); });
  boot();
})();
