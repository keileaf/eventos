/* Panel: super usuario (todos los eventos y usuarios) y cliente (sus eventos e invitados) */
(function () {
  const { esc, $, $$ } = U;
  const CFG = window.APP_CONFIG;
  const S = { me: null, events: [], users: [], ev: null, guests: [], q: '', filter: 'todos', openGuest: null };
  const view = $('#view');

  // ---------- Arranque / rutas (#eventos, #usuarios, #ev-<id>) ----------
  async function route() {
    S.me = API.session();
    if (!S.me) return renderLogin();
    const h = location.hash.replace('#', '');
    try {
      if (h.startsWith('ev-')) return await openEvent(h.slice(3));
      S.events = await API.call('myEvents');
      if (S.me.rol !== 'admin' && S.events.length === 1) { location.replace('#ev-' + S.events[0].id); return; }
      if (h === 'usuarios' && S.me.rol === 'admin') { S.users = await API.call('listUsers'); return renderUsers(); }
      return renderEvents();
    } catch (err) { handleErr(err); }
  }
  window.addEventListener('hashchange', route);

  function handleErr(err) {
    if (err.expired) { U.toast(err.message, 'warn'); return renderLogin(); }
    U.toast(err.message || 'Error', 'error');
  }

  if (API.isDemo) {
    const bar = $('#demoBar'); bar.hidden = false;
    bar.innerHTML = `<strong>Panel de ejemplo</strong> · datos ficticios que solo existen en este navegador; no afectan ningún evento real. <button id="resetDemo" class="link">Reiniciar ejemplo</button>${API.forcedDemo ? ' · <a class="link" href="panel.html">Ir al panel real</a>' : ''}`;
    $('#resetDemo').onclick = () => { API.resetDemo(); API.setSession(null); location.hash = ''; route(); U.toast('Demo reiniciada', 'ok'); };
  }

  // ---------- Login ----------
  function renderLogin() {
    view.innerHTML = `
      <div class="login-wrap">
        <h1 class="brand">Invitaciones</h1>
        <form class="card login" id="loginForm">
          <label>Usuario<input name="usuario" autocomplete="username" required></label>
          <label>Contraseña<input name="password" type="password" autocomplete="current-password" required></label>
          <button class="btn primary block" type="submit">Entrar</button>
          <p class="hint">¿Olvidaste tu contraseña? Pídele al administrador que la restablezca.</p>
        </form>
      </div>`;
    $('#loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target; const b = $('button', f); b.disabled = true; b.textContent = 'Entrando…';
      try {
        const s = await API.call('login', { usuario: f.usuario.value, password: f.password.value });
        API.setSession(s); location.hash = ''; route();
      } catch (err) { U.toast(err.message, 'error'); b.disabled = false; b.textContent = 'Entrar'; }
    });
  }

  async function logout() {
    try { await API.call('logout'); } catch (e) {}
    API.setSession(null); location.hash = ''; renderLogin();
  }

  function topbar(title, extra) {
    return `<header class="top">
      <div class="top-l">${extra || ''}<h1 class="brand sm">${esc(title)}</h1></div>
      <div class="top-r">
        <span class="who">${esc(S.me.usuario)}${S.me.rol === 'admin' ? ' · <b>super usuario</b>' : ''}</span>
        <button class="btn sm" data-act="refresh">Actualizar</button>
        <button class="btn sm" data-act="logout">Salir</button>
      </div>
    </header>`;
  }
  function bindTop() {
    $$('[data-act=logout]').forEach(b => b.onclick = logout);
    $$('[data-act=refresh]').forEach(b => b.onclick = () => { route(); U.toast('Actualizado', 'ok'); });
  }

  // ---------- Lista de eventos ----------
  function renderEvents() {
    const admin = S.me.rol === 'admin';
    view.innerHTML = `
      ${topbar(admin ? 'Panel general' : 'Mis eventos')}
      ${admin ? `<nav class="tabs"><a href="#eventos" class="on">Eventos</a><a href="#usuarios">Usuarios</a></nav>` : ''}
      <div class="grid ${admin ? 'two' : ''}">
        <section>
          <h2 class="sec">Eventos (${S.events.length})</h2>
          <div class="ev-list">${S.events.length ? S.events.map(evCard).join('') : '<p class="empty">Aún no hay eventos.</p>'}</div>
        </section>
        ${admin ? `<section><h2 class="sec">Nuevo evento</h2>${newEventForm()}
          <h2 class="sec">Demos en la página principal</h2>
          <div class="card" id="demosBox"><p class="meta">Cargando…</p></div></section>` : ''}
      </div>`;
    bindTop();
    $$('[data-archive]').forEach(b => b.onclick = () => confirmBtn(b, async () => {
      await API.call('deleteEvent', { e: b.dataset.archive }); U.toast('Evento archivado', 'ok'); route();
    }));
    $$('[data-restore]').forEach(b => b.onclick = async () => {
      try { await API.call('updateEvent', { e: b.dataset.restore, activo: true }); route(); } catch (e) { handleErr(e); }
    });
    if (admin) { bindNewEvent(); renderDemoToggles(); }
  }

  function evCard(ev) {
    const c = ev.config || {}; const r = ev.resumen || {};
    const pct = r.invitaciones ? Math.round(r.confirmaron / r.invitaciones * 100) : 0;
    const fecha = U.parseDate(c.fecha);
    return `<article class="card ev ${ev.activo ? '' : 'off'}">
      <div class="ev-head">
        <div><h3>${esc(c.festejado || ev.id)} ${c.edad ? `<small>${esc(c.edad)} años</small>` : ''}</h3>
        <p class="meta">${esc(CFG.TIPOS[c.tipo] || 'Evento')} · ${esc(CFG.TEMAS[ev.tema]?.nombre || ev.tema)}${fecha ? ' · ' + esc(fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })) : ''}</p>
        ${S.me.rol === 'admin' ? `<p class="meta">Cliente: <b>${esc(ev.propietario)}</b> · hoja <code>EV_${esc(ev.id)}</code></p>` : ''}</div>
        ${ev.activo ? '' : '<span class="badge gray">archivado</span>'}
      </div>
      <div class="bar"><span style="width:${pct}%"></span></div>
      <p class="meta">${r.invitaciones || 0} invitaciones · ${r.confirmaron || 0} confirmaron · ${r.personas || 0}/${r.lugares || 0} lugares</p>
      <div class="actions">
        <a class="btn sm primary" href="#ev-${esc(ev.id)}">Abrir</a>
        <a class="btn sm" href="${esc(U.inviteUrl(ev.id))}" target="_blank">Ver invitación</a>
        ${S.me.rol === 'admin' ? (ev.activo ? `<button class="btn sm danger" data-archive="${esc(ev.id)}">Archivar</button>` : `<button class="btn sm" data-restore="${esc(ev.id)}">Reactivar</button>`) : ''}
      </div>
    </article>`;
  }

  async function renderDemoToggles() {
    const box = $('#demosBox'); if (!box) return;
    let ocultas = [];
    try { ocultas = ((await API.call('getSite')) || {}).demosOcultas || []; } catch (e) {}
    box.innerHTML = `<p class="hint">Activa las demos que quieres mostrar en la portada. Se guarda al instante.</p>
      ${(CFG.DEMOS || []).map(d => `<label class="tg-row"><span><b>${esc(d.titulo)}</b><br><span class="meta">${esc(d.tipo)}</span></span>
        <span class="tg"><input type="checkbox" data-demo="${esc(d.id)}" ${ocultas.includes(d.id) ? '' : 'checked'}><i></i></span></label>`).join('')}
      <a class="btn sm" href="index.html" target="_blank">Ver página principal</a>`;
    $$('[data-demo]', box).forEach(cb => cb.onchange = async () => {
      const hidden = $$('[data-demo]', box).filter(x => !x.checked).map(x => x.dataset.demo);
      try { await API.call('saveSite', { demosOcultas: hidden }); U.toast(cb.checked ? 'Demo visible en la portada' : 'Demo oculta de la portada', 'ok'); }
      catch (err) { cb.checked = !cb.checked; handleErr(err); }
    });
  }

  function newEventForm() {
    const clientes = (S.events.map(e => e.propietario)).filter((v, i, a) => v && a.indexOf(v) === i);
    return `<form class="card form" id="newEv">
      <div class="row2"><label>Festejado(a)<input name="festejado" required placeholder="Mateo"></label>
      <label>Edad<input name="edad" type="number" min="0" max="120" placeholder="6"></label></div>
      <div class="row2"><label>Tipo<select name="tipo">${Object.entries(CFG.TIPOS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
      <label>Diseño<select name="tema">${Object.entries(CFG.TEMAS).map(([k, v]) => `<option value="${k}">${esc(v.nombre)}</option>`).join('')}</select></label></div>
      <label>Fecha y hora<input name="fecha" type="datetime-local" required></label>
      <fieldset><legend>Cliente (festejador)</legend>
        <label class="inline"><input type="radio" name="cli" value="nuevo" checked> Crear usuario nuevo</label>
        <label class="inline"><input type="radio" name="cli" value="existente"> Usuario existente</label>
        <div class="cli-nuevo">
          <div class="row2"><label>Usuario<input name="nu_usuario" placeholder="familia.perez"></label>
          <label>Contraseña<input name="nu_pass" placeholder="mín. 6 caracteres"></label></div>
          <label>Nombre<input name="nu_nombre" placeholder="Laura y Pedro"></label>
        </div>
        <div class="cli-existente" hidden><label>Usuario<input name="propietario" list="clis" placeholder="usuario"></label>
          <datalist id="clis">${clientes.map(c => `<option value="${esc(c)}">`).join('')}</datalist></div>
      </fieldset>
      <button class="btn primary block">Crear evento</button>
      <p class="hint">Se crea una hoja nueva <code>EV_…</code> en la hoja de cálculo para los invitados de este evento.</p>
    </form>`;
  }

  function bindNewEvent() {
    const f = $('#newEv');
    $$('input[name=cli]', f).forEach(r => r.onchange = () => {
      const nuevo = f.cli.value === 'nuevo';
      $('.cli-nuevo', f).hidden = !nuevo; $('.cli-existente', f).hidden = nuevo;
    });
    f.onsubmit = async (e) => {
      e.preventDefault();
      const t = CFG.TEMAS[f.tema.value];
      const config = defaultConfig(f.festejado.value.trim(), f.edad.value, f.tipo.value, f.fecha.value, f.tema.value);
      const body = { tema: f.tema.value, config };
      if (f.cli.value === 'nuevo') body.nuevoCliente = { usuario: f.nu_usuario.value, password: f.nu_pass.value, nombre: f.nu_nombre.value };
      else body.propietario = f.propietario.value;
      try {
        const ev = await API.call('createEvent', body);
        U.toast('Evento creado (' + (t ? t.nombre : f.tema.value) + ')', 'ok');
        location.hash = 'ev-' + ev.id;
      } catch (err) { handleErr(err); }
    };
  }

  function defaultConfig(festejado, edad, tipo, fecha, tema) {
    const d = U.parseDate(fecha); const lim = d ? new Date(d.getTime() - 10 * 864e5) : null;
    const espacial = tema === 'espacial';
    if (tipo === 'boda') return {
      tipo, festejado, edad: '', encabezado: 'Nos casamos',
      frase: 'Con la bendición de Dios y de nuestros padres, queremos compartir contigo el día en que uniremos nuestras vidas.',
      cita: '', fecha, duracionHoras: 8, fotoPortada: '', galeria: [], historia: [], pase: true, rsvpPreguntas: { alergias: true, cancion: true },
      faq: [{ p: '¿Pueden ir niños?', r: '' }, { p: '¿Habrá estacionamiento?', r: '' }],
      musica: 'https://upload.wikimedia.org/wikipedia/commons/c/c6/Canon_in_D_Major_(ISRC_USUAN1100301).mp3', musicaCredito: 'Canon in D Major — Kevin MacLeod (incompetech.com), CC BY 3.0',
      padres: [{ titulo: 'Padres de la novia', nombres: [] }, { titulo: 'Padres del novio', nombres: [] }, { titulo: 'Padrinos', nombres: [] }],
      lugares: [{ titulo: 'Ceremonia religiosa', hora: '', nombre: '', direccion: '', mapa: '', croquis: '' }, { titulo: 'Recepción', hora: '', nombre: '', direccion: '', mapa: '', croquis: '' }],
      horario: [], vestimenta: 'Formal', regalos: '', firma: '',
      fechaLimite: lim ? lim.toISOString().slice(0, 10) : '',
      whatsapp: '¡Hola {nombre}! 💍 Nos casamos y nos encantaría que nos acompañes. Aquí está tu invitación: {enlace}',
    };
    if (tipo === 'xv') return {
      tipo, festejado, edad: '', encabezado: 'Mis XV años',
      frase: 'Hay momentos que se esperan toda la vida. Quiero compartir contigo el inicio de esta nueva etapa.',
      cita: '', fecha, duracionHoras: 7, fotoPortada: '', galeria: [], musica: 'cajita', pase: true,
      padres: [{ titulo: 'Mis padres', nombres: [] }, { titulo: 'Mis padrinos', nombres: [] }],
      lugares: [{ titulo: 'Misa de acción de gracias', hora: '', nombre: '', direccion: '', mapa: '', croquis: '' }, { titulo: 'Recepción', hora: '', nombre: '', direccion: '', mapa: '', croquis: '' }],
      horario: [], vestimenta: 'Formal', regalos: '', firma: '',
      fechaLimite: lim ? lim.toISOString().slice(0, 10) : '',
      whatsapp: '¡Hola {nombre}! ✨ Con mucha ilusión te invito a mis XV años. Aquí está tu invitación: {enlace}',
    };
    return {
      tipo, festejado, edad: edad ? Number(edad) : '',
      encabezado: tipo === 'cumpleanos' ? (espacial ? '¡Prepárate para despegar!' : '¡Estás invitado!') : '¡Estás invitado!',
      frase: tipo === 'cumpleanos' ? `${festejado} cumple ${edad || ''} años y queremos celebrarlo contigo.` : `Acompáñanos a celebrar a ${festejado}.`,
      fecha, duracionHoras: 4,
      lugar: { nombre: '', direccion: '', mapa: '' },
      horario: [], vestimenta: '', regalos: '', firma: '',
      fechaLimite: lim ? lim.toISOString().slice(0, 10) : '',
      whatsapp: '¡Hola {nombre}! 🎉 Te invitamos a celebrar a {festejado}. Aquí está tu invitación: {enlace}',
    };
  }

  // ---------- Usuarios (admin) ----------
  function renderUsers() {
    view.innerHTML = `
      ${topbar('Panel general')}
      <nav class="tabs"><a href="#eventos">Eventos</a><a href="#usuarios" class="on">Usuarios</a></nav>
      <div class="grid two">
        <section><h2 class="sec">Usuarios (${S.users.length})</h2>
          <div class="card list">${S.users.map(u => `
            <div class="urow">
              <div><b>${esc(u.usuario)}</b> <span class="badge ${u.rol === 'admin' ? 'teal' : 'gray'}">${esc(u.rol)}</span><br><span class="meta">${esc(u.nombre || '')}</span></div>
              <div class="actions">
                <button class="btn sm" data-reset="${esc(u.usuario)}">Nueva contraseña</button>
                ${u.usuario !== S.me.usuario ? `<button class="btn sm danger" data-del="${esc(u.usuario)}">Eliminar</button>` : ''}
              </div>
            </div>`).join('')}
          </div>
        </section>
        <section><h2 class="sec">Nuevo usuario</h2>
          <form class="card form" id="newUser">
            <div class="row2"><label>Usuario<input name="usuario" required></label><label>Contraseña<input name="password" required minlength="6"></label></div>
            <label>Nombre<input name="nombre"></label>
            <label>Rol<select name="rol"><option value="cliente">Cliente (festejador)</option><option value="admin">Super usuario</option></select></label>
            <button class="btn primary block">Crear usuario</button>
          </form>
        </section>
      </div>`;
    bindTop();
    $('#newUser').onsubmit = async (e) => {
      e.preventDefault(); const f = e.target;
      try { await API.call('createUser', { usuario: f.usuario.value, password: f.password.value, nombre: f.nombre.value, rol: f.rol.value }); U.toast('Usuario creado', 'ok'); route(); }
      catch (err) { handleErr(err); }
    };
    $$('[data-reset]').forEach(b => b.onclick = () => {
      const row = b.closest('.urow');
      if ($('.pw-inline', row)) return;
      const f = document.createElement('form'); f.className = 'pw-inline';
      f.innerHTML = `<input name="p" placeholder="Nueva contraseña (mín. 6)" minlength="6" required><button class="btn sm primary">Guardar</button>`;
      row.appendChild(f); f.p.focus();
      f.onsubmit = async (e) => {
        e.preventDefault();
        try { await API.call('resetPassword', { usuario: b.dataset.reset, password: f.p.value }); U.toast('Contraseña actualizada', 'ok'); f.remove(); }
        catch (err) { handleErr(err); }
      };
    });
    $$('[data-del]').forEach(b => b.onclick = () => confirmBtn(b, async () => {
      await API.call('deleteUser', { usuario: b.dataset.del }); U.toast('Usuario eliminado', 'ok'); route();
    }));
  }

  // ---------- Panel de un evento ----------
  async function openEvent(id) {
    const [ev, guests] = await Promise.all([API.call('getEvent', { e: id }), API.call('listGuests', { e: id })]);
    S.ev = ev; S.guests = guests;
    renderEvent();
  }

  function renderEvent() {
    const ev = S.ev, c = ev.config || {};
    const back = (S.me.rol === 'admin' || S.events.length > 1) ? `<a class="btn sm" href="#eventos">← Eventos</a>` : '';
    view.innerHTML = `
      ${topbar(c.festejado ? 'Fiesta de ' + c.festejado : 'Invitaciones', back)}
      <div class="grid two">
        <div class="col">
          <h2 class="sec">Nueva invitación</h2>
          <form class="card form" id="newGuest">
            <label>Nombre en la invitación<input name="nombre" required placeholder="Familia Pérez · Santiago y mamá…"></label>
            <label>Personas (opcional, separadas por coma)<input name="personas" placeholder="Leo, Camila, Ana"></label>
            <div class="row2"><label>Lugares<input name="lugares" type="number" min="1" max="20" value="2"></label>
            <label>WhatsApp (opcional)<input name="telefono" placeholder="664… o +1…"></label></div>
            <label>Mesa (opcional, aparece en su pase)<input name="mesa" placeholder="Ej. 4"></label>
            <button class="btn primary block">Crear invitación</button>
            <p class="hint">Si escribes personas, cada una aparece con su casilla. Si no, el invitado elige cuántos asistirán.</p>
          </form>

          <h2 class="sec">Estadísticas</h2>
          <div class="card" id="stats"></div>

          <h2 class="sec">Evento</h2>
          <details class="card fold"><summary>Editar datos de la invitación</summary>${eventForm(ev)}</details>

          <h2 class="sec">Cuenta</h2>
          <details class="card fold"><summary>Cambiar contraseña</summary>
            <form class="form" id="pwForm">
              <label>Contraseña actual<input name="actual" type="password" required></label>
              <label>Nueva contraseña<input name="nueva" type="password" minlength="6" required></label>
              <button class="btn primary block">Guardar</button>
            </form>
          </details>
        </div>

        <div class="col">
          <div class="sec-row"><h2 class="sec">Invitados (<span id="gCount">${S.guests.length}</span>)</h2>
            <div class="actions"><a class="btn sm" href="${esc(U.inviteUrl(ev.id))}" target="_blank">Vista general</a><button class="btn sm" id="csv">Copiar CSV</button></div></div>
          <input class="search" id="search" placeholder="Buscar…" value="${esc(S.q)}">
          <div class="chips" id="chips">${['todos', 'pendiente', 'confirmó', 'declinó', 'sin enviar'].map(k => `<button class="chip ${S.filter === k ? 'on' : ''}" data-f="${k}">${k}</button>`).join('')}</div>
          <div id="guests"></div>
        </div>
      </div>`;
    bindTop();
    renderStats(); renderGuests();

    $('#search').oninput = (e) => { S.q = e.target.value; renderGuests(); };
    $$('#chips .chip').forEach(b => b.onclick = () => { S.filter = b.dataset.f; $$('#chips .chip').forEach(x => x.classList.toggle('on', x === b)); renderGuests(); });
    $('#csv').onclick = async () => { (await U.copy(toCsv())) ? U.toast('CSV copiado. Pégalo en Excel o Sheets.', 'ok') : U.toast('No se pudo copiar', 'error'); };

    $('#newGuest').onsubmit = async (e) => {
      e.preventDefault(); const f = e.target;
      try {
        const g = await API.call('saveGuest', { e: ev.id, invitado: { nombre: f.nombre.value, personas: f.personas.value, lugares: f.lugares.value, telefono: f.telefono.value, mesa: f.mesa.value } });
        S.guests.unshift(g); f.reset(); f.lugares.value = 2;
        renderStats(); renderGuests(); U.toast('Invitación creada', 'ok');
      } catch (err) { handleErr(err); }
    };
    $('#pwForm').onsubmit = async (e) => {
      e.preventDefault(); const f = e.target;
      try { await API.call('changePassword', { actual: f.actual.value, nueva: f.nueva.value }); f.reset(); U.toast('Contraseña actualizada', 'ok'); }
      catch (err) { handleErr(err); }
    };
    bindEventForm();
  }

  function renderStats() {
    const r = { inv: S.guests.length, si: 0, no: 0, pend: 0, lugares: 0, personas: 0, enviadas: 0, alergias: 0, canciones: 0 };
    S.guests.forEach(g => {
      r.lugares += +g.lugares || 0; if (g.enviado) r.enviadas++;
      if (g.estado === 'confirmó') { r.si++; r.personas += +g.confirmados || 0; if (ex(g).alergias) r.alergias++; if (ex(g).cancion) r.canciones++; } else if (g.estado === 'declinó') r.no++; else r.pend++;
    });
    const p = (n) => r.inv ? Math.round(n / r.inv * 100) : 0;
    $('#stats').innerHTML = `
      <div class="bar3"><span class="g" style="width:${p(r.si)}%"></span><span class="r" style="width:${p(r.no)}%"></span></div>
      <dl class="stats">
        <div><dt>Invitaciones</dt><dd>${r.inv}</dd></div>
        <div><dt>Enviadas</dt><dd>${r.enviadas}</dd></div>
        <div><dt><i class="dot g"></i>Confirmaron</dt><dd>${r.si} (${p(r.si)}%)</dd></div>
        <div><dt><i class="dot r"></i>Declinaron</dt><dd>${r.no} (${p(r.no)}%)</dd></div>
        <div><dt><i class="dot"></i>Sin responder</dt><dd>${r.pend} (${p(r.pend)}%)</dd></div>
        <div class="hl"><dt>Personas confirmadas</dt><dd>${r.personas} de ${r.lugares} lugares</dd></div>
        ${r.alergias ? `<div><dt>⚠️ Con alergias o restricciones</dt><dd>${r.alergias}</dd></div>` : ''}
        ${r.canciones ? `<div><dt>🎵 Canciones pedidas</dt><dd>${r.canciones}</dd></div>` : ''}
      </dl>`;
    const gc = $('#gCount'); if (gc) gc.textContent = S.guests.length;
  }

  function renderGuests() {
    const q = S.q.trim().toLowerCase();
    const list = S.guests.filter(g => {
      if (S.filter === 'sin enviar' && g.enviado) return false;
      if (['pendiente', 'confirmó', 'declinó'].includes(S.filter) && g.estado !== S.filter) return false;
      return !q || (g.nombre + ' ' + g.personas + ' ' + g.telefono).toLowerCase().includes(q);
    });
    $('#guests').innerHTML = list.length ? list.map(guestCard).join('') : `<p class="empty">${S.guests.length ? 'Sin resultados.' : 'Crea tu primera invitación con el formulario.'}</p>`;
    $$('#guests .guest').forEach(bindGuest);
  }

  function guestCard(g) {
    const badge = { 'confirmó': 'green', 'declinó': 'red' }[g.estado] || 'gray';
    const answered = g.estado && g.estado !== 'pendiente';
    return `<article class="card guest" data-t="${esc(g.token)}">
      <div class="g-head">
        <div><b>${esc(g.nombre)}</b> <span class="badge ${badge}">${esc(g.estado || 'pendiente')}</span>
          <p class="meta">${g.lugares} ${g.lugares == 1 ? 'lugar' : 'lugares'}${g.estado === 'confirmó' ? ` · <b>${g.confirmados} asistirán</b>` : ''}${g.personas ? ' · ' + esc(g.personas) : ''}</p>
          ${g.estado === 'confirmó' && g.detalle ? `<p class="meta">✔ ${esc(g.detalle)}</p>` : ''}
          <p class="meta">${g.creado ? 'Creada ' + esc(U.fmtShort(g.creado)) : ''}${g.enviado ? ' · ✉ Enviada ' + esc(U.fmtShort(g.enviado)) : ''}${g.respondido ? ' · Respondió ' + esc(U.fmtShort(g.respondido)) : ''}</p>
          ${g.mesa ? `<p class="meta">🪑 Mesa ${esc(g.mesa)}</p>` : ''}
          ${ex(g).alergias ? `<p class="meta warn">⚠️ Alergias / restricciones: <b>${esc(ex(g).alergias)}</b></p>` : ''}
          ${ex(g).cancion ? `<p class="meta">🎵 Canción: ${esc(ex(g).cancion)}</p>` : ''}
          ${g.mensaje ? `<blockquote>“${esc(g.mensaje)}”</blockquote>` : ''}
        </div>
      </div>
      <div class="actions">
        ${answered ? '' : `<button class="btn sm primary" data-a="copy">Copiar enlace</button>
        <button class="btn sm primary" data-a="wa">${g.telefono ? 'Enviar por WhatsApp' : 'Copiar mensaje'}</button>`}
        <a class="btn sm" href="${esc(U.inviteUrl(S.ev.id, g.token))}" target="_blank">Ver</a>
        ${answered ? `<button class="btn sm" data-a="reissue" title="Elimina esta invitación y crea otra igual con un enlace nuevo">Rehacer invitación</button>` : ''}
        <button class="btn sm danger" data-a="del">Eliminar</button>
      </div>
      ${answered ? `<p class="locked">🔒 Respondida: ya no se puede modificar. Para cambiarla, usa <b>Rehacer invitación</b> (o elimínala y crea una nueva). El enlace anterior dejará de funcionar.</p>` : `
      <details class="g-edit" ${S.openGuest === g.token ? 'open' : ''}><summary>Editar datos</summary>
        <form class="form">
          <label>Nombre<input name="nombre" value="${esc(g.nombre)}" required></label>
          <label>Personas<input name="personas" value="${esc(g.personas)}"></label>
          <div class="row2"><label>Lugares<input name="lugares" type="number" min="1" max="20" value="${esc(g.lugares)}"></label>
          <label>WhatsApp<input name="telefono" value="${esc(g.telefono)}"></label></div>
          <label>Mesa<input name="mesa" value="${esc(g.mesa || '')}"></label>
          <button class="btn sm primary">Guardar</button>
        </form>
      </details>`}
    </article>`;
  }

  function ex(g) { if (g.extras && typeof g.extras === 'object') return g.extras; try { return JSON.parse(g.extras || '{}'); } catch (e) { return {}; } }

  function bindGuest(card) {
    const g = S.guests.find(x => x.token === card.dataset.t); if (!g) return;
    const link = U.inviteUrl(S.ev.id, g.token, true);
    const cp = $('[data-a=copy]', card); if (cp) cp.onclick = async () => { (await U.copy(link)) ? U.toast('Enlace copiado', 'ok') : U.toast(link); };
    const wa = $('[data-a=wa]', card); if (wa) wa.onclick = async () => {
      const c = S.ev.config || {};
      const msg = U.fillTemplate(c.whatsapp || '¡Hola {nombre}! Aquí está tu invitación: {enlace}', { nombre: g.nombre, festejado: c.festejado || '', edad: c.edad || '', enlace: link });
      if (g.telefono) window.open(U.waUrl(g.telefono, msg), '_blank', 'noopener');
      else (await U.copy(msg)) ? U.toast('Mensaje copiado. Pégalo en WhatsApp.', 'ok') : U.toast(msg);
      try { Object.assign(g, await API.call('markSent', { e: S.ev.id, token: g.token })); renderStats(); renderGuests(); } catch (err) { handleErr(err); }
    };
    $('[data-a=del]', card).onclick = (e) => confirmBtn(e.currentTarget, async () => {
      await API.call('deleteGuest', { e: S.ev.id, token: g.token });
      S.guests = S.guests.filter(x => x !== g); renderStats(); renderGuests(); U.toast('Invitación eliminada', 'ok');
    });
    const re = $('[data-a=reissue]', card);
    if (re) re.onclick = (e) => confirmBtn(e.currentTarget, async () => {
      const ng = await API.call('reissueGuest', { e: S.ev.id, token: g.token });
      S.guests = S.guests.map(x => x === g ? ng : x); renderStats(); renderGuests();
      U.toast('Invitación nueva creada. Envíale el enlace nuevo.', 'ok');
    });
    const det = $('details', card);
    if (!det) return;
    det.ontoggle = () => { if (det.open) S.openGuest = g.token; else if (S.openGuest === g.token) S.openGuest = null; };
    $('form', card).onsubmit = async (e) => {
      e.preventDefault(); const f = e.target;
      try {
        Object.assign(g, await API.call('saveGuest', { e: S.ev.id, invitado: { token: g.token, nombre: f.nombre.value, personas: f.personas.value, lugares: f.lugares.value, telefono: f.telefono.value, mesa: f.mesa.value } }));
        S.openGuest = null; renderStats(); renderGuests(); U.toast('Guardado', 'ok');
      } catch (err) { handleErr(err); }
    };
  }

  // ---------- Formulario de datos del evento ----------
  function eventForm(ev) {
    const c = ev.config || {};
    const horario = (c.horario || []).map(h => `${h.hora} | ${h.texto}`).join('\n');
    return `<form class="form" id="evForm">
      <div class="row2"><label>Festejado(a)<input name="festejado" value="${esc(c.festejado)}"></label>
      <label>Edad<input name="edad" type="number" value="${esc(c.edad)}"></label></div>
      <div class="row2"><label>Tipo<select name="tipo">${Object.entries(CFG.TIPOS).map(([k, v]) => `<option value="${k}" ${c.tipo === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label>Diseño<select name="tema">${Object.entries(CFG.TEMAS).map(([k, v]) => `<option value="${k}" ${ev.tema === k ? 'selected' : ''}>${esc(v.nombre)}</option>`).join('')}</select></label></div>
      <label>Encabezado<input name="encabezado" value="${esc(c.encabezado)}"></label>
      <label>Frase principal<textarea name="frase" rows="2">${esc(c.frase)}</textarea></label>
      <div class="row2"><label>Fecha y hora<input name="fecha" type="datetime-local" value="${esc(c.fecha)}"></label>
      <label>Duración (horas)<input name="duracionHoras" type="number" min="1" max="24" value="${esc(c.duracionHoras || 4)}"></label></div>
      <label>Cita o frase especial (opcional)<textarea name="cita" rows="2">${esc(c.cita)}</textarea></label>
      <fieldset><legend>Lugares (misa, recepción…)</legend>
        <div id="placesBox">${placesOf(c).map(placeFields).join('')}</div>
        <button type="button" class="btn sm" id="addPlace">+ Agregar lugar</button>
      </fieldset>
      <label>Nuestra historia (una línea por momento: <code>fecha | título | texto | foto</code>)<textarea name="historia" rows="3" placeholder="2019 | Nos conocimos | Una tarde de verano… | fotos/historia-1.jpg">${esc((c.historia || []).map(h => [h.fecha, h.titulo, h.texto, h.foto].map(x => x || '').join(' | ')).join('\n'))}</textarea></label>
      <label>Padres y padrinos (una línea por grupo: <code>Título: nombre, nombre</code>)<textarea name="padres" rows="3" placeholder="Mis padres: Mónica Ramírez, Javier Castillo">${esc((c.padres || []).map(p => (p.titulo || '') + ': ' + (p.nombres || []).join(', ')).join('\n'))}</textarea></label>
      <fieldset><legend>Fotos y música</legend>
        <label>Foto principal<input name="fotoPortada" value="${esc(c.fotoPortada)}" placeholder="fotos/portada.jpg o enlace de Google Drive"></label>
        <label>Foto principal para celular (opcional, vertical)<input name="fotoPortadaMovil" value="${esc(c.fotoPortadaMovil)}" placeholder="fotos/portada-movil.jpg"></label>
        <label>Galería (un enlace por línea)<textarea name="galeria" rows="4" placeholder="fotos/1.jpg">${esc((c.galeria || []).join('\n'))}</textarea></label>
        <label>Música<input name="musica" value="${esc(c.musica)}" placeholder="musica/cancion.mp3 · enlace .mp3 · cajita"></label>
        <label>Crédito de la música (si la licencia lo pide)<input name="musicaCredito" value="${esc(c.musicaCredito)}" placeholder="Canción — Autor (sitio), licencia"></label>
        <p class="hint">Sube las fotos a <code>docs/fotos/</code> y la canción a <code>docs/musica/</code> en GitHub, o pega enlaces de Google Drive compartidos como "Cualquier persona con el enlace". Escribe <code>cajita</code> para usar la caja musical incluida.</p>
      </fieldset>
      <label>Itinerario (una línea por actividad: <code>hora | actividad</code>)<textarea name="horario" rows="4">${esc(horario)}</textarea></label>
      <label>Vestimenta<input name="vestimenta" value="${esc(c.vestimenta)}"></label>
      <div class="row2"><label>Paleta sugerida (colores separados por coma)<input name="paleta" value="${esc((c.paleta || []).join(', '))}" placeholder="#e9dfd3, #9fa8a3"></label>
      <label>Color reservado<input name="res_color" type="color" value="${esc((c.reservado && c.reservado.color) || '#9fc3ea')}"></label></div>
      <label class="inline"><input type="checkbox" name="res_on" ${c.reservado ? 'checked' : ''}> Mostrar color reservado</label>
      <label>Texto del color reservado<input name="res_texto" value="${esc((c.reservado && c.reservado.texto) || '')}" placeholder="El azul está reservado para la quinceañera"></label>
      <label>Regalos (texto)<input name="regalos" value="${esc(c.regalos)}"></label>
      <fieldset><legend>Mesa de regalos y lluvia de sobres</legend>
        <label>Mesas de regalos (una por línea: <code>tienda | número | enlace</code>)<textarea name="mesas" rows="2" placeholder="Liverpool | 51234567 | https://…">${esc((c.mesaRegalos || []).map(m => [m.tienda, m.numero, m.url].map(x => x || '').join(' | ')).join('\n'))}</textarea></label>
        <div class="row2"><label>Banco<input name="sb_banco" value="${esc((c.sobres || {}).banco)}"></label><label>Titular<input name="sb_titular" value="${esc((c.sobres || {}).titular)}"></label></div>
        <label>CLABE<input name="sb_clabe" value="${esc((c.sobres || {}).clabe)}" inputmode="numeric"></label>
        <label>Nota<input name="sb_nota" value="${esc((c.sobres || {}).nota)}"></label>
      </fieldset>
      <fieldset><legend>Extras premium</legend>
        <div class="row2"><label>Hashtag<input name="hashtag" value="${esc(c.hashtag)}" placeholder="#CamilaXV"></label><label>Álbum compartido (enlace)<input name="album" value="${esc(c.album)}" placeholder="https://photos.app.goo.gl/…"></label></div>
        <label>Fotos a lo ancho entre secciones (hasta 3, una por línea: <code>foto | frase | firma</code>)<textarea name="separadores" rows="3" placeholder="fotos/sep-1.jpg | Hoy empieza mi historia | Camila">${esc((c.separadores || []).map(x => [x.foto, x.texto, x.autor].map(y => y || '').join(' | ')).join('\n'))}</textarea></label>
        <label class="inline"><input type="checkbox" name="pase" ${c.pase ? 'checked' : ''}> Pase de acceso con código QR al confirmar</label>
        <label class="inline"><input type="checkbox" name="q_alergias" ${(c.rsvpPreguntas || {}).alergias ? 'checked' : ''}> Preguntar alergias al confirmar</label>
        <label class="inline"><input type="checkbox" name="q_cancion" ${(c.rsvpPreguntas || {}).cancion ? 'checked' : ''}> Pedir una canción al confirmar</label>
        <label>Hospedaje (uno por línea: <code>nombre | nota | enlace</code>)<textarea name="hospedaje" rows="2" placeholder="Hotel Centro | A 5 min, código BODA | https://…">${esc((c.hospedaje || []).map(h => [h.nombre, h.nota, h.url].map(x => x || '').join(' | ')).join('\n'))}</textarea></label>
        <label>Preguntas frecuentes (una por línea: <code>pregunta | respuesta</code>)<textarea name="faq" rows="4" placeholder="¿Pueden ir niños? | Será solo para adultos.">${esc((c.faq || []).map(f => (f.p || '') + ' | ' + (f.r || '')).join('\n'))}</textarea></label>
      </fieldset>
      <label>Firma<input name="firma" value="${esc(c.firma)}" placeholder="Con cariño, …"></label>
      <label>Confirmar antes de<input name="fechaLimite" type="date" value="${esc(c.fechaLimite)}"></label>
      <label>Mensaje de WhatsApp <span class="hint">({nombre}, {festejado}, {edad}, {enlace})</span><textarea name="whatsapp" rows="3">${esc(c.whatsapp)}</textarea></label>
      <div class="actions"><button class="btn primary">Guardar cambios</button><a class="btn" href="${esc(U.inviteUrl(ev.id))}" target="_blank">Ver invitación</a></div>
    </form>`;
  }

  function placesOf(c) {
    if (Array.isArray(c.lugares) && c.lugares.length) return c.lugares;
    return [Object.assign({ titulo: '', hora: '' }, c.lugar || {})];
  }
  function placeFields(l) {
    l = l || {};
    return `<div class="place-f">
      <div class="row2"><label>Título<input name="p_titulo" value="${esc(l.titulo)}" placeholder="Misa · Recepción"></label><label>Hora<input name="p_hora" value="${esc(l.hora)}" placeholder="6:00 p. m."></label></div>
      <label>Nombre del lugar<input name="p_nombre" value="${esc(l.nombre)}"></label>
      <label>Dirección<input name="p_dir" value="${esc(l.direccion)}"></label>
      <label>Enlace de Google Maps<input name="p_mapa" value="${esc(l.mapa)}" placeholder="https://maps.app.goo.gl/…"></label>
      <label>Croquis (imagen, opcional)<input name="p_croquis" value="${esc(l.croquis)}" placeholder="fotos/croquis.jpg"></label>
      <button type="button" class="link rm-place">Quitar este lugar</button>
    </div>`;
  }

  function bindEventForm() {
    const f = $('#evForm');
    const box = $('#placesBox');
    $('#addPlace').onclick = () => box.insertAdjacentHTML('beforeend', placeFields());
    box.addEventListener('click', (e) => { if (e.target.classList.contains('rm-place')) e.target.closest('.place-f').remove(); });
    f.onsubmit = async (e) => {
      e.preventDefault();
      const config = Object.assign({}, S.ev.config, {
        festejado: f.festejado.value.trim(), edad: f.edad.value ? Number(f.edad.value) : '', tipo: f.tipo.value,
        encabezado: f.encabezado.value, frase: f.frase.value, fecha: f.fecha.value, duracionHoras: Number(f.duracionHoras.value) || 4,
        lugar: undefined,
        lugares: $$('.place-f', f).map(pf => ({ titulo: $('[name=p_titulo]', pf).value.trim(), hora: $('[name=p_hora]', pf).value.trim(), nombre: $('[name=p_nombre]', pf).value.trim(), direccion: $('[name=p_dir]', pf).value.trim(), mapa: $('[name=p_mapa]', pf).value.trim(), croquis: $('[name=p_croquis]', pf).value.trim() })).filter(p => p.nombre),
        cita: f.cita.value.trim(),
        padres: f.padres.value.split('\n').map(x => x.trim()).filter(Boolean).map(x => { const i = x.indexOf(':'); return { titulo: i >= 0 ? x.slice(0, i).trim() : '', nombres: (i >= 0 ? x.slice(i + 1) : x).split(',').map(n => n.trim()).filter(Boolean) }; }),
        fotoPortada: f.fotoPortada.value.trim(),
        fotoPortadaMovil: f.fotoPortadaMovil.value.trim(),
        galeria: f.galeria.value.split('\n').map(x => x.trim()).filter(Boolean),
        musica: f.musica.value.trim(),
        musicaCredito: f.musicaCredito.value.trim(),
        paleta: f.paleta.value.split(',').map(x => x.trim()).filter(x => /^#[0-9a-f]{3,8}$/i.test(x)),
        reservado: f.res_on.checked ? { color: f.res_color.value, texto: f.res_texto.value.trim() } : null,
        mesaRegalos: f.mesas.value.split('\n').map(x => x.split('|').map(y => y.trim())).filter(p => p[0]).map(p => ({ tienda: p[0], numero: p[1] || '', url: p[2] || '' })),
        sobres: f.sb_clabe.value.trim() ? { banco: f.sb_banco.value.trim(), titular: f.sb_titular.value.trim(), clabe: f.sb_clabe.value.trim(), nota: f.sb_nota.value.trim() } : null,
        hashtag: f.hashtag.value.trim(), album: f.album.value.trim(),
        separadores: f.separadores.value.split('\n').map(x => x.split('|').map(y => y.trim())).filter(p => p[0]).slice(0, 3).map((p, i) => ({ foto: p[0], texto: p[1] || '', autor: p[2] || '', pos: (((S.ev.config || {}).separadores || [])[i] || {}).pos || '' })),
        pase: f.pase.checked,
        rsvpPreguntas: { alergias: f.q_alergias.checked, cancion: f.q_cancion.checked },
        hospedaje: f.hospedaje.value.split('\n').map(x => x.split('|').map(y => y.trim())).filter(p => p[0]).map(p => ({ nombre: p[0], nota: p[1] || '', url: p[2] || '' })),
        faq: f.faq.value.split('\n').map(x => { const i = x.indexOf('|'); return i < 0 ? { p: x.trim(), r: '' } : { p: x.slice(0, i).trim(), r: x.slice(i + 1).trim() }; }).filter(x => x.p),
        historia: f.historia.value.split('\n').map(x => x.split('|').map(y => y.trim())).filter(p => p.some(Boolean)).map(p => ({ fecha: p[0] || '', titulo: p[1] || '', texto: p[2] || '', foto: p[3] || '' })),
        horario: f.horario.value.split('\n').map(x => x.split('|')).filter(p => p[0].trim()).map(p => ({ hora: p[0].trim(), texto: (p.slice(1).join('|') || '').trim() })),
        vestimenta: f.vestimenta.value, regalos: f.regalos.value, firma: f.firma.value, fechaLimite: f.fechaLimite.value, whatsapp: f.whatsapp.value,
      });
      try { S.ev = await API.call('updateEvent', { e: S.ev.id, config, tema: f.tema.value }); U.toast('Invitación actualizada', 'ok'); }
      catch (err) { handleErr(err); }
    };
  }

  // ---------- CSV ----------
  function toCsv() {
    const cols = ['nombre', 'personas', 'lugares', 'mesa', 'telefono', 'estado', 'confirmados', 'detalle', 'alergias', 'cancion', 'mensaje', 'enviado', 'respondido'];
    const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    return [cols.join(',')].concat(S.guests.map(g => cols.map(c => q(c === 'alergias' || c === 'cancion' ? ex(g)[c] : g[c])).join(','))).join('\n');
  }

  // Botón de confirmación en dos clics (sin diálogos del navegador)
  function confirmBtn(btn, fn) {
    if (btn.dataset.armed) {
      btn.disabled = true;
      Promise.resolve(fn()).catch(handleErr).finally(() => { btn.disabled = false; });
      return;
    }
    const txt = btn.textContent; btn.dataset.armed = '1'; btn.textContent = '¿Seguro?'; btn.classList.add('armed');
    setTimeout(() => { if (btn.isConnected) { delete btn.dataset.armed; btn.textContent = txt; btn.classList.remove('armed'); } }, 3000);
  }

  route();
})();
