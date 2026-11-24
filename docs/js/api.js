/* Cliente de la API + backend de demostración (cuando API_URL está vacío). */
(function () {
  const CFG = window.APP_CONFIG || {};
  // Modo demo: sin API_URL, o forzado con ?demo=1 en la dirección (no toca la hoja de cálculo real)
  const forcedDemo = !!CFG.API_URL && new URLSearchParams(location.search).get('demo') === '1';
  const IS_DEMO = !CFG.API_URL || forcedDemo;
  const SESSION_KEY = IS_DEMO ? 'inv_session_demo' : 'inv_session';
  const store = {
    get(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { sessionStorage.removeItem(k); } catch (e) {} },
  };

  let memSession = null;
  const API = {
    isDemo: IS_DEMO,
    forcedDemo,
    // agrega ?demo=1 a enlaces internos cuando el demo es forzado
    link(path) { return forcedDemo ? path + (path.includes('?') ? '&' : '?') + 'demo=1' : path; },
    session() { return memSession || store.get(SESSION_KEY); },
    setSession(s) { memSession = s; s ? store.set(SESSION_KEY, s) : store.del(SESSION_KEY); },

    async call(action, params) {
      const s = API.session();
      const body = Object.assign({ action }, params || {}, s ? { token: s.token } : {});
      let res;
      if (API.isDemo) {
        await new Promise(r => setTimeout(r, 120));
        res = Demo.handle(JSON.parse(JSON.stringify(body)));
      } else {
        // text/plain evita el "preflight" CORS que Apps Script no soporta
        const r = await fetch(CFG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
        res = await r.json();
      }
      if (!res.ok) {
        if (res.error === 'SESION_EXPIRADA') { API.setSession(null); throw Object.assign(new Error('Tu sesión expiró, vuelve a entrar.'), { expired: true }); }
        throw new Error(res.error || 'Error');
      }
      return res.data;
    },

    resetDemo() { Demo.reset(); },
  };

  /* ================= BACKEND DEMO (imita a Code.gs) ================= */
  const DEMO_KEY = 'inv_demo_v17';
  const Demo = {
    db: null,
    load() {
      if (this.db) return this.db;
      try { this.db = JSON.parse(localStorage.getItem(DEMO_KEY)); } catch (e) {}
      if (!this.db) this.db = seed();
      return this.db;
    },
    save() { try { localStorage.setItem(DEMO_KEY, JSON.stringify(this.db)); } catch (e) {} },
    reset() { this.db = seed(); this.save(); },
    sessions: {},

    handle(req) {
      this.load();
      try {
        const fn = this.actions[req.action];
        if (!fn) throw new Error('Acción desconocida');
        const data = fn.call(this, req);
        this.save();
        return { ok: true, data: JSON.parse(JSON.stringify(data === undefined ? true : data)) };
      } catch (e) { return { ok: false, error: e.message }; }
    },

    auth(req, admin) {
      const s = this.sessions[req.token] || (req.token && req.token.startsWith('demo:') ? (() => {
        const u = this.db.users.find(x => 'demo:' + x.usuario === req.token); return u && { usuario: u.usuario, rol: u.rol };
      })() : null);
      if (!s) throw new Error('SESION_EXPIRADA');
      if (admin && s.rol !== 'admin') throw new Error('Solo el super usuario puede hacer esto');
      return s;
    },
    eventFor(s, id) {
      const ev = this.db.events.find(e => e.id === id);
      if (!ev) throw new Error('Evento no encontrado');
      if (s.rol !== 'admin' && ev.propietario !== s.usuario) throw new Error('No tienes acceso a este evento');
      return ev;
    },
    guests(id) { return this.db.guests[id] || (this.db.guests[id] = []); },
    summary(id) {
      const r = { invitaciones: 0, confirmaron: 0, declinaron: 0, pendientes: 0, lugares: 0, personas: 0 };
      this.guests(id).forEach(g => {
        r.invitaciones++; r.lugares += g.lugares;
        if (g.estado === 'confirmó') { r.confirmaron++; r.personas += g.confirmados; }
        else if (g.estado === 'declinó') r.declinaron++; else r.pendientes++;
      });
      return r;
    },
    publicGuest(g) {
      return { token: g.token, nombre: g.nombre, personas: split(g.personas), lugares: g.lugares, estado: g.estado,
        confirmados: g.confirmados, detalle: split(g.detalle), mensaje: g.mensaje, respondido: g.respondido,
        mesa: g.mesa || '', extras: g.extras || {} };
    },
    createUser(d, rol) {
      const usuario = String(d.usuario || '').trim().toLowerCase();
      if (!/^[a-z0-9._-]{3,40}$/.test(usuario)) throw new Error('Usuario inválido (3-40 letras, números, . _ -)');
      if (this.db.users.find(u => u.usuario === usuario)) throw new Error('El usuario "' + usuario + '" ya existe');
      if (String(d.password || '').length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');
      const u = { usuario, password: d.password, rol, nombre: d.nombre || usuario, creado: now() };
      this.db.users.push(u); return u;
    },

    actions: {
      getInvitation(req) {
        const ev = this.db.events.find(e => e.id === req.e && e.activo);
        if (!ev) throw new Error('Invitación no encontrada');
        let invitado = null;
        if (req.i) {
          const g = this.guests(ev.id).find(x => x.token === req.i);
          if (!g) throw new Error('Invitación no encontrada');
          invitado = this.publicGuest(g);
        }
        return { evento: { id: ev.id, tema: ev.tema, config: ev.config }, invitado };
      },
      rsvp(req) {
        const ev = this.db.events.find(e => e.id === req.e && e.activo);
        const g = ev && this.guests(ev.id).find(x => x.token === req.i);
        if (!g) throw new Error('Invitación no encontrada');
        if (g.estado && g.estado !== 'pendiente') throw new Error('Esta invitación ya fue respondida. Si necesitas un cambio, pide a los anfitriones una nueva.');
        if (ev.config.fechaLimite && new Date() > new Date(ev.config.fechaLimite + 'T23:59:59')) throw new Error('La fecha límite para confirmar ya pasó');
        const personas = split(g.personas);
        let c = 0, det = '';
        if (personas.length) {
          const sel = (req.asisten || []).filter(n => personas.includes(n)).slice(0, g.lugares);
          c = sel.length; det = sel.join(', ');
        } else c = Math.max(0, Math.min(g.lugares, Math.floor(+req.cantidad || 0)));
        if (req.asistira === false) { c = 0; det = ''; }
        const ex = req.extras || {};
        Object.assign(g, { confirmados: c, detalle: det, estado: c > 0 ? 'confirmó' : 'declinó', mensaje: String(req.mensaje || '').slice(0, 500), respondido: now(),
          extras: { alergias: String(ex.alergias || '').slice(0, 300), cancion: String(ex.cancion || '').slice(0, 150) } });
        return this.publicGuest(g);
      },
      login(req) {
        const u = this.db.users.find(x => x.usuario === String(req.usuario || '').trim().toLowerCase());
        if (!u || u.password !== req.password) throw new Error('Usuario o contraseña incorrectos');
        const token = 'demo:' + u.usuario;
        this.sessions[token] = { usuario: u.usuario, rol: u.rol };
        return { token, usuario: u.usuario, rol: u.rol, nombre: u.nombre };
      },
      logout(req) { delete this.sessions[req.token]; return true; },
      changePassword(req) {
        const s = this.auth(req); const u = this.db.users.find(x => x.usuario === s.usuario);
        if (u.password !== req.actual) throw new Error('La contraseña actual no es correcta');
        if (String(req.nueva || '').length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');
        u.password = req.nueva; return true;
      },
      myEvents(req) {
        const s = this.auth(req);
        return this.db.events.filter(e => s.rol === 'admin' || (e.propietario === s.usuario && e.activo))
          .map(e => Object.assign({}, e, { resumen: this.summary(e.id) }));
      },
      getEvent(req) { return this.eventFor(this.auth(req), req.e); },
      updateEvent(req) {
        const s = this.auth(req); const ev = this.eventFor(s, req.e);
        if (req.config) ev.config = req.config;
        if (req.tema) ev.tema = req.tema;
        if (s.rol === 'admin') {
          if (req.propietario !== undefined) ev.propietario = req.propietario;
          if (req.activo !== undefined) ev.activo = !!req.activo;
        }
        ev.actualizado = now(); return ev;
      },
      listGuests(req) { return this.guests(this.eventFor(this.auth(req), req.e).id); },
      saveGuest(req) {
        const ev = this.eventFor(this.auth(req), req.e); const d = req.invitado || {};
        const nombre = String(d.nombre || '').trim(); if (!nombre) throw new Error('El nombre es obligatorio');
        let g = d.token && this.guests(ev.id).find(x => x.token === d.token);
        if (g && g.estado && g.estado !== 'pendiente') throw new Error('Esta invitación ya fue respondida y no se puede modificar. Elimínala y crea una nueva.');
        if (!g) { g = { token: rid(12), estado: 'pendiente', confirmados: 0, detalle: '', mensaje: '', respondido: '', enviado: '', creado: now() }; this.guests(ev.id).push(g); }
        Object.assign(g, { nombre, personas: split(d.personas).join(', '), lugares: Math.max(1, Math.min(20, Math.floor(+d.lugares || 1))), telefono: String(d.telefono || ''), mesa: String(d.mesa || '').slice(0, 20) });
        return g;
      },
      deleteGuest(req) {
        const ev = this.eventFor(this.auth(req), req.e);
        this.db.guests[ev.id] = this.guests(ev.id).filter(g => g.token !== req.invitadoToken); return true;
      },
      reissueGuest(req) {
        const ev = this.eventFor(this.auth(req), req.e);
        const old = this.guests(ev.id).find(x => x.token === req.invitadoToken); if (!old) throw new Error('Invitado no encontrado');
        const g = { token: rid(12), nombre: old.nombre, personas: old.personas, lugares: old.lugares, telefono: old.telefono, mesa: old.mesa || '', estado: 'pendiente', confirmados: 0, detalle: '', mensaje: '', respondido: '', enviado: '', creado: now() };
        this.db.guests[ev.id] = this.guests(ev.id).filter(x => x !== old); this.db.guests[ev.id].push(g);
        if (ev.mesas) ev.mesas = JSON.parse(JSON.stringify(ev.mesas).split('"' + old.token + '"').join('"' + g.token + '"'));
        return g;
      },
      markSent(req) {
        const ev = this.eventFor(this.auth(req), req.e);
        const g = this.guests(ev.id).find(x => x.token === req.invitadoToken); if (!g) throw new Error('Invitado no encontrado');
        g.enviado = now(); return g;
      },
      createEvent(req) {
        const s = this.auth(req, true); const cfg = req.config || {};
        if (req.nuevoCliente && req.nuevoCliente.usuario) this.createUser(req.nuevoCliente, 'cliente');
        const propietario = String((req.nuevoCliente && req.nuevoCliente.usuario) || req.propietario || s.usuario).toLowerCase();
        if (!this.db.users.find(u => u.usuario === propietario)) throw new Error('El cliente "' + propietario + '" no existe');
        const ev = { id: slug(cfg.festejado || cfg.titulo || 'evento') + '-' + rid(4).toLowerCase(), propietario, tema: req.tema || 'espacial', config: cfg, activo: true, creado: now(), actualizado: now() };
        this.db.events.push(ev); this.db.guests[ev.id] = []; return ev;
      },
      deleteEvent(req) {
        this.auth(req, true); const ev = this.db.events.find(e => e.id === req.e);
        if (!ev) throw new Error('Evento no encontrado'); ev.activo = false; return true;
      },
      getSite() { return this.db.site || {}; },
      getPhotos(req) {
        const ev = this.db.events.find(e => e.id === req.e && e.activo);
        if (!ev) throw new Error('Evento no encontrado');
        if (!ev.config.fotosInvitados) { let ok = false; try { this.eventFor(this.auth(req), req.e); ok = true; } catch (e) {} if (!ok) throw new Error('La galería de fotos no está activa'); }
        const list = ((this.db.photos || {})[ev.id] || []).slice().sort((a, b) => a.fecha < b.fecha ? 1 : -1);
        return { evento: { id: ev.id, tema: ev.tema, festejado: ev.config.festejado || '', tipo: ev.config.tipo || '' }, fotos: list };
      },
      uploadPhoto(req) {
        const ev = this.db.events.find(e => e.id === req.e && e.activo);
        if (!ev) throw new Error('Evento no encontrado');
        if (!ev.config.fotosInvitados) throw new Error('La galería de fotos no está activa');
        if (!/^data:image\//.test(req.data || '')) throw new Error('Formato de imagen no válido');
        this.db.photos = this.db.photos || {}; const arr = this.db.photos[ev.id] = this.db.photos[ev.id] || [];
        // en el ejemplo solo se guardan las 6 fotos subidas más recientes (el navegador tiene poco espacio)
        const mine = arr.filter(p => p.local); if (mine.length >= 6) arr.splice(arr.indexOf(mine[0]), 1);
        const p = { id: rid(10), url: req.data, autor: String(req.autor || '').slice(0, 60), fecha: now(), local: true };
        arr.push(p); return p;
      },
      deletePhoto(req) {
        const ev = this.eventFor(this.auth(req), req.e);
        this.db.photos[ev.id] = ((this.db.photos || {})[ev.id] || []).filter(p => p.id !== req.id); return true;
      },
      getSeating(req) {
        const ev = this.eventFor(this.auth(req), req.e); const p = ev.mesas || {};
        return { activo: !!p.activo, mesas: p.mesas || [] };
      },
      saveSeating(req) {
        const ev = this.eventFor(this.auth(req), req.e); const p = req.plan || {};
        ev.mesas = { activo: !!p.activo, mesas: (p.mesas || []).slice(0, 300) };
        if (ev.mesas.activo) {
          const where = {};
          ev.mesas.mesas.forEach(m => (m.sillas || []).forEach(c => { if (c.token) { where[c.token] = where[c.token] || []; if (!where[c.token].includes(m.nombre)) where[c.token].push(m.nombre); } }));
          this.guests(ev.id).forEach(g => { g.mesa = (where[g.token] || []).join(', '); });
        }
        return ev.mesas;
      },
      saveSite(req) {
        this.auth(req, true); this.db.site = this.db.site || {};
        if (Array.isArray(req.demosOcultas)) this.db.site.demosOcultas = req.demosOcultas.map(String);
        return this.db.site;
      },
      listUsers(req) { this.auth(req, true); return this.db.users.map(u => ({ usuario: u.usuario, rol: u.rol, nombre: u.nombre, creado: u.creado })); },
      createUser(req) { this.auth(req, true); const u = this.createUser(req, req.rol === 'admin' ? 'admin' : 'cliente'); return { usuario: u.usuario, rol: u.rol, nombre: u.nombre }; },
      resetPassword(req) {
        this.auth(req, true); const u = this.db.users.find(x => x.usuario === req.usuario);
        if (!u) throw new Error('Usuario no encontrado'); if (String(req.password || '').length < 6) throw new Error('Mínimo 6 caracteres');
        u.password = req.password; return true;
      },
      deleteUser(req) {
        const s = this.auth(req, true); if (req.usuario === s.usuario) throw new Error('No puedes borrarte a ti mismo');
        this.db.users = this.db.users.filter(u => u.usuario !== req.usuario); return true;
      },
    },
  };

  function now() { return new Date().toISOString(); }
  function rid(n) { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'; let s = ''; for (let i = 0; i < n; i++) s += c[Math.floor(Math.random() * c.length)]; return s; }
  function split(s) { return (Array.isArray(s) ? s : String(s || '').split(',')).map(x => String(x).trim()).filter(Boolean); }
  function slug(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'evento'; }

  function seed() {
    const d = (days) => new Date(Date.now() - days * 864e5).toISOString();
    const g = (token, nombre, personas, lugares, telefono, estado, confirmados, detalle, mensaje, resp, env) =>
      ({ token, nombre, personas, lugares, telefono, estado, confirmados, detalle, mensaje, respondido: resp, enviado: env, creado: d(12) });
    return {
      users: [
        { usuario: 'admin', password: 'Ejemplo-Kei-2026', rol: 'admin', nombre: 'Super usuario', creado: d(30) },
        { usuario: 'familia.mateo', password: 'mateo123', rol: 'cliente', nombre: 'Daniel y Sofía', creado: d(20) },
        { usuario: 'familia.vale', password: 'vale123', rol: 'cliente', nombre: 'Andrea y Luis', creado: d(18) },
        { usuario: 'familia.sofia', password: 'sofia123', rol: 'cliente', nombre: 'Mónica y Javier', creado: d(25) },
        { usuario: 'familia.camila', password: 'camila123', rol: 'cliente', nombre: 'Patricia y Andrés', creado: d(22) },
        { usuario: 'novios.ar', password: 'boda123', rol: 'cliente', nombre: 'Andrea y Rodrigo', creado: d(30) },
      ],
      events: [
        {
          id: 'mateo-6', propietario: 'familia.mateo', tema: 'heroe', activo: true, creado: d(20), actualizado: d(1),
          config: {
            tipo: 'cumpleanos', festejado: 'Mateo', edad: 6,
            encabezado: '¡Ven a mi fiesta!',
            frase: 'Mateo cumple 6 años y necesita a su equipo de héroes para la misión más divertida del año. ¿Te unes?',
            fecha: '2027-03-13T15:00', duracionHoras: 4,
            fotoPortada: 'fotos/mateo-portada.jpg',
            galeria: ['fotos/mateo-galeria-1.jpg', 'fotos/mateo-galeria-2.jpg', 'fotos/mateo-galeria-3.jpg', 'fotos/mateo-galeria-4.jpg'],
            separadores: [
              { foto: 'fotos/mateo-sep-1.jpg', texto: '¡Héroe en entrenamiento!', pos: '55% 45%' },
              { foto: 'fotos/mateo-sep-2.jpg', texto: '¡Misión: diversión!', pos: '50% 40%' },
            ],
            musica: 'musica/fiesta.mp3',
            musicaCredito: 'Monkeys Spinning Monkeys — Kevin MacLeod (incompetech.com), CC BY 4.0',
            lugares: [
              { titulo: 'Base secreta', hora: '3:00 p. m.', nombre: 'Salón de Fiestas Galaxia', direccion: 'Av. Revolución 1234, Zona Centro, Tijuana, B.C.', mapa: 'https://maps.google.com/?q=Av.+Revolucion+1234+Tijuana', croquis: '' },
            ],
            horario: [
              { hora: '3:00 p. m.', texto: 'Llegada de los héroes' },
              { hora: '3:30 p. m.', texto: 'Entrenamiento: juegos y circuito de obstáculos' },
              { hora: '4:30 p. m.', texto: 'Misión piñata' },
              { hora: '5:30 p. m.', texto: 'Pastel y mañanitas' },
              { hora: '6:30 p. m.', texto: 'Fiesta y bolos sorpresa' },
            ],
            vestimenta: '¡Ven disfrazado de tu héroe favorito o con capa! Habrá antifaces para todos.',
            regalos: 'Tu presencia es el mejor regalo. Si deseas traer algo, a Mateo le encantan los bloques y los carritos.',
            rsvpPreguntas: { alergias: true, cancion: false },
            faq: [
              { p: '¿Pueden ir los papás?', r: '¡Claro! Los papás también son parte del equipo.' },
              { p: '¿Hay estacionamiento?', r: 'Sí, el salón tiene estacionamiento gratuito.' },
            ],
            pase: true,
            fotosInvitados: true,
            firma: '¡Te espera tu equipo! · Daniel y Sofía',
            fechaLimite: '2027-03-01',
            whatsapp: '¡Hola {nombre}! ⚡ Mateo cumple {edad} y te necesita en su equipo de héroes. Aquí está tu invitación: {enlace}',
          },
        },
        {
          id: 'valentina-4', propietario: 'familia.vale', tema: 'cuento', activo: true, creado: d(18), actualizado: d(1),
          config: {
            tipo: 'cumpleanos', festejado: 'Valentina', edad: 4,
            encabezado: 'Érase una vez…',
            frase: 'En un reino de nieve y estrellas, una pequeña princesa cumple 4 años. Y su cuento no estaría completo sin ti.',
            fecha: '2027-04-24T16:00', duracionHoras: 4,
            fotoPortada: 'fotos/vale-portada.jpg',
            galeria: ['fotos/vale-galeria-1.jpg', 'fotos/vale-galeria-2.jpg', 'fotos/vale-galeria-3.jpg'],
            separadores: [
              { foto: 'fotos/vale-sep-1.jpg', texto: 'Cada cuento empieza con una página', pos: '62% 40%' },
              { foto: 'fotos/vale-sep-2.jpg', texto: '¡Y el tuyo también está aquí!', pos: '50% 40%' },
            ],
            musica: 'musica/cuento.mp3',
            musicaCredito: 'Frost Waltz — Kevin MacLeod (incompetech.com), CC BY 4.0',
            lugares: [
              { titulo: 'El castillo', hora: '4:00 p. m.', nombre: 'Jardín de Eventos Las Flores', direccion: 'Blvd. Agua Caliente 4558, Tijuana, B.C.', mapa: 'https://maps.google.com/?q=Blvd+Agua+Caliente+4558+Tijuana', croquis: '' },
            ],
            horario: [
              { hora: '4:00 p. m.', texto: 'Llegada al reino' },
              { hora: '4:30 p. m.', texto: 'Hora del cuento y juegos de nieve' },
              { hora: '5:30 p. m.', texto: 'Taller de coronas y varitas' },
              { hora: '6:30 p. m.', texto: 'Pastel y mañanitas' },
              { hora: '7:30 p. m.', texto: 'Despedida con bolsitas sorpresa' },
            ],
            vestimenta: 'Ven vestida o vestido de tu personaje de cuento favorito. ¡Las coronas y las capas son bienvenidas!',
            paleta: ['#cfe0f5', '#b7a4e0', '#ffffff', '#9fb6dc', '#e6e0f7'],
            regalos: 'Tu presencia es el mejor regalo. Si deseas tener un detalle, a Valentina le encantan los libros de cuentos.',
            rsvpPreguntas: { alergias: true, cancion: false },
            pase: true,
            fotosInvitados: true,
            firma: 'Con cariño, Andrea y Luis',
            fechaLimite: '2027-04-10',
            whatsapp: '¡Hola {nombre}! ❄️ Valentina cumple {edad} y su cuento no estaría completo sin ti. Aquí está tu invitación: {enlace}',
          },
        },
        {
          id: 'sofia-xv', propietario: 'familia.sofia', tema: 'xv', activo: true, creado: d(25), actualizado: d(1),
          config: {
            tipo: 'xv', festejado: 'Sofía Valeria', edad: '',
            encabezado: 'Mis XV años',
            frase: 'Hay momentos que se esperan toda la vida. Quiero compartir contigo el inicio de esta nueva etapa.',
            cita: 'Gracias, Dios, por permitirme llegar a este día rodeada de las personas que más quiero.',
            fecha: '2027-06-19T18:00', duracionHoras: 7,
            fotoPortada: 'fotos/demo-xv-portada.svg',
            galeria: ['fotos/demo-xv-1.svg', 'fotos/demo-xv-2.svg', 'fotos/demo-xv-3.svg', 'fotos/demo-xv-4.svg'],
            musica: 'cajita',
            padres: [
              { titulo: 'Mis padres', nombres: ['Mónica Ramírez', 'Javier Castillo'] },
              { titulo: 'Mis padrinos', nombres: ['Laura Ortiz', 'Ricardo Méndez'] },
            ],
            lugares: [
              { titulo: 'Misa de acción de gracias', hora: '6:00 p. m.', nombre: 'Parroquia de San Francisco', direccion: 'Calle Segunda 845, Zona Centro, Tijuana, B.C.', mapa: 'https://maps.google.com/?q=Calle+Segunda+845+Tijuana', croquis: '' },
              { titulo: 'Recepción', hora: '8:00 p. m.', nombre: 'Salón Real Imperial', direccion: 'Blvd. Díaz Ordaz 12650, Tijuana, B.C.', mapa: 'https://maps.google.com/?q=Blvd+Diaz+Ordaz+12650+Tijuana', croquis: 'fotos/demo-croquis.svg' },
            ],
            horario: [
              { hora: '6:00 p. m.', texto: 'Misa de acción de gracias' },
              { hora: '8:00 p. m.', texto: 'Recepción y entrada de la quinceañera' },
              { hora: '9:00 p. m.', texto: 'Vals y brindis' },
              { hora: '9:30 p. m.', texto: 'Cena' },
              { hora: '10:30 p. m.', texto: '¡A bailar!' },
            ],
            vestimenta: 'Formal. Te pedimos reservar el color rosa palo para la quinceañera.',
            regalos: 'Mesa de regalos en Liverpool #51234567 o lluvia de sobres.',
            pase: true,
            firma: 'Con cariño, Sofía Valeria',
            fechaLimite: '2027-06-01',
            whatsapp: '¡Hola {nombre}! ✨ Con mucha ilusión te invito a mis XV años. Aquí está tu invitación: {enlace}',
          },
        },
        {
          id: 'camila-xv', propietario: 'familia.camila', tema: 'xv-azul', activo: true, creado: d(22), actualizado: d(1),
          config: {
            tipo: 'xv', festejado: 'Camila Renata', edad: '', encabezado: 'Mis XV años',
            frase: 'Hay días que se guardan para siempre en el corazón. Me encantaría que este fuera uno de ellos y que lo vivas conmigo.',
            cita: 'Llegar a mis quince es un regalo; celebrarlo con ustedes lo hace inolvidable.',
            fecha: '2027-09-18T18:00', duracionHoras: 7,
            fotoPortada: 'fotos/xv-portada.jpg',
            galeria: ['fotos/xv-galeria-1.jpg', 'fotos/xv-galeria-2.jpg', 'fotos/xv-galeria-3.jpg', 'fotos/xv-galeria-4.jpg', 'fotos/xv-galeria-5.jpg'],
            separadores: [
              { foto: 'fotos/xv-sep-1.jpg', texto: 'Hoy empieza mi historia', autor: 'Camila', pos: '50% 45%' },
              { foto: 'fotos/xv-sep-2.jpg', texto: 'Con la bendición de Dios', pos: '50% 35%' },
              { foto: 'fotos/xv-galeria-3.jpg', texto: '¿Me acompañas?', pos: '55% 40%' },
            ],
            musica: 'cajita',
            padres: [
              { titulo: 'Mis padres', nombres: ['Patricia Morales', 'Andrés Villaseñor'] },
              { titulo: 'Mis padrinos', nombres: ['Gabriela Núñez', 'Fernando Ibarra'] },
              { titulo: 'Mi corte de honor', nombres: ['Diego Ramos', 'Emiliano Cruz', 'Santiago Lara', 'Mateo Ortega'] },
            ],
            lugares: [
              { titulo: 'Misa de acción de gracias', hora: '6:00 p. m.', nombre: 'Parroquia del Sagrado Corazón', direccion: 'Av. Independencia 2100, Tijuana, B.C.', mapa: 'https://maps.google.com/?q=Av.+Independencia+2100+Tijuana', croquis: '' },
              { titulo: 'Recepción', hora: '8:00 p. m.', nombre: 'Jardín Los Olivos', direccion: 'Blvd. Agua Caliente 9800, Tijuana, B.C.', mapa: 'https://maps.google.com/?q=Blvd+Agua+Caliente+9800+Tijuana', croquis: 'fotos/demo-croquis.svg' },
            ],
            horario: [
              { hora: '6:00 p. m.', texto: 'Misa de acción de gracias' },
              { hora: '8:00 p. m.', texto: 'Recepción de invitados' },
              { hora: '9:00 p. m.', texto: 'Vals con mi papá y mi corte' },
              { hora: '9:30 p. m.', texto: 'Cena' },
              { hora: '10:30 p. m.', texto: 'Brindis y pastel' },
              { hora: '11:00 p. m.', texto: '¡A la pista a bailar!' },
            ],
            vestimenta: 'Formal. Te sugerimos estos tonos para que las fotos queden hermosas.',
            paleta: ['#e9dfd3', '#c9b8a6', '#9fa8a3', '#7a8b99', '#d8b4a8'],
            reservado: { color: '#9fc3ea', texto: 'El azul cielo está reservado para la quinceañera' },
            regalos: 'Tu presencia es mi mejor regalo. Si deseas tener un detalle conmigo:',
            mesaRegalos: [{ tienda: 'Liverpool', numero: '51234567', url: '' }],
            sobres: { banco: 'Banco de ejemplo', titular: 'Patricia Morales (ejemplo)', clabe: '0123 4567 8901 2345 67', nota: 'También habrá caja para sobres el día del evento.' },
            hashtag: '#CamilaXV',
            hashtagTexto: 'Sube tus fotos y videos con este hashtag para que ningún momento se pierda.',
            pase: true,
            fotosInvitados: true,
            firma: 'Con cariño, Camila Renata',
            fechaLimite: '2027-09-01',
            whatsapp: '¡Hola {nombre}! 💙 Me encantaría que me acompañes en mis XV años. Aquí está tu invitación: {enlace}',
          },
        },
        {
          id: 'andrea-rodrigo', propietario: 'novios.ar', tema: 'boda', activo: true, creado: d(30), actualizado: d(1),
          mesas: { activo: true, mesas: [
            { id: 'mh', nombre: 'Mesa de honor', sillas: [
              { id: 'h1', nombre: 'Novia', token: '', persona: 'Andrea' }, { id: 'h2', nombre: 'Novio', token: '', persona: 'Rodrigo' },
              { id: 'h3', nombre: '', token: 'Bd5kRt8mWq3Z', persona: 'Mariana Ortiz' }, { id: 'h4', nombre: '', token: 'Bd5kRt8mWq3Z', persona: 'Daniel Ochoa' }] },
            { id: 'm1', nombre: 'Mesa 1', sillas: [
              { id: 'a1', nombre: '', token: 'Bd2nHs6vLp9Y', persona: 'Tía Carmen (1)' }, { id: 'a2', nombre: '', token: 'Bd2nHs6vLp9Y', persona: 'Tía Carmen (2)' },
              { id: 'a3', nombre: '', token: '', persona: '' }, { id: 'a4', nombre: '', token: '', persona: '' }, { id: 'a5', nombre: '', token: '', persona: '' },
              { id: 'a6', nombre: '', token: '', persona: '' }, { id: 'a7', nombre: '', token: '', persona: '' }, { id: 'a8', nombre: '', token: '', persona: '' }] },
            { id: 'm2', nombre: 'Mesa 2', sillas: Array.from({ length: 8 }, (_, k) => ({ id: 'b' + k, nombre: '', token: '', persona: '' })) },
          ] },
          config: {
            tipo: 'boda', festejado: 'Andrea & Rodrigo', edad: '', encabezado: 'Nos casamos',
            frase: 'Después de muchos atardeceres juntos, decidimos compartir todos los que vienen. Queremos que estés ahí.',
            cita: 'Elegirte fue fácil; lo difícil fue esperar este día.',
            fecha: '2027-10-16T17:00', duracionHoras: 8,
            fotoPortada: 'fotos/boda-portada.jpg',
            fotoPortadaMovil: 'fotos/boda-portada-movil.jpg',
            historia: [
              { fecha: '2019', titulo: 'Nos conocimos', texto: 'Una reunión de amigos, una plática que no queríamos terminar y muchas risas desde el primer día.', foto: 'fotos/boda-historia-1.jpg' },
              { fecha: '2021', titulo: 'Caminando juntos', texto: 'Viajes, mudanzas y domingos sin prisa. Aprendimos que con el otro todo es mejor.', foto: 'fotos/boda-historia-2.jpg' },
              { fecha: '2026', titulo: 'Dijimos que sí', texto: 'Al atardecer, entre abrazos y lágrimas de felicidad, decidimos ser familia para siempre.', foto: 'fotos/boda-historia-3.jpg' },
            ],
            galeria: ['fotos/boda-galeria-1.jpg', 'fotos/boda-galeria-2.jpg', 'fotos/boda-galeria-3.jpg', 'fotos/boda-galeria-4.jpg'],
            musica: 'https://upload.wikimedia.org/wikipedia/commons/c/c6/Canon_in_D_Major_(ISRC_USUAN1100301).mp3',
            musicaCredito: 'Canon in D Major — Kevin MacLeod (incompetech.com), CC BY 3.0',
            padres: [
              { titulo: 'Padres de la novia', nombres: ['Lucía Herrera', 'Manuel Salas'] },
              { titulo: 'Padres del novio', nombres: ['Teresa Galván', 'Jorge Medina'] },
              { titulo: 'Padrinos', nombres: ['Mariana Ortiz', 'Daniel Ochoa'] },
            ],
            separadores: [
              { foto: 'fotos/boda-galeria-1.jpg', texto: 'Para siempre empieza aquí', pos: '50% 35%' },
              { foto: 'fotos/boda-historia-2.jpg', texto: 'Caminemos juntos', autor: 'Andrea & Rodrigo', pos: '50% 40%' },
              { foto: 'fotos/boda-galeria-2.jpg', texto: '¿Celebras con nosotros?', pos: '50% 30%' },
            ],
            lugares: [
              { titulo: 'Ceremonia religiosa', hora: '5:00 p. m.', nombre: 'Capilla del Rosario', direccion: 'Valle de Guadalupe, Ensenada, B.C.', mapa: 'https://maps.google.com/?q=Valle+de+Guadalupe+Ensenada', croquis: '' },
              { titulo: 'Recepción', hora: '7:00 p. m.', nombre: 'Viñedo Los Encinos', direccion: 'Carretera Tecate–Ensenada km 78, Valle de Guadalupe, B.C.', mapa: 'https://maps.google.com/?q=Valle+de+Guadalupe+vinedo', croquis: '' },
              { titulo: 'Tornaboda · domingo 17', hora: '11:00 a. m.', nombre: 'Brunch en el viñedo', direccion: 'Mismo lugar de la recepción. Ropa cómoda.', mapa: 'https://maps.google.com/?q=Valle+de+Guadalupe+vinedo', croquis: '' },
            ],
            horario: [
              { hora: '5:00 p. m.', texto: 'Ceremonia religiosa' },
              { hora: '6:30 p. m.', texto: 'Cóctel de bienvenida al atardecer' },
              { hora: '7:30 p. m.', texto: 'Entrada de los novios y primer baile' },
              { hora: '8:30 p. m.', texto: 'Cena' },
              { hora: '10:00 p. m.', texto: 'Fiesta' },
            ],
            vestimenta: 'Formal de jardín. Sugerimos tacón ancho: la recepción es sobre pasto.',
            paleta: ['#7d8f6e', '#c9b78f', '#e9dcc2', '#1f2f4d', '#b07a6a'],
            reservado: { color: '#ffffff', texto: 'El blanco es solo para la novia' },
            regalos: 'Tu compañía es nuestro mejor regalo. Si deseas tener un detalle con nosotros:',
            mesaRegalos: [{ tienda: 'Liverpool', numero: '51998877', url: '' }, { tienda: 'Amazon', numero: '', url: 'https://www.amazon.com.mx/wedding' }],
            sobres: { banco: 'Banco de ejemplo', titular: 'Andrea Salas (ejemplo)', clabe: '0123 4567 8901 2345 67', nota: 'También habrá caja para sobres en la recepción.' },
            hashtag: '#AndreaYRodrigo',
            hashtagTexto: 'Comparte tus fotos y videos con nuestro hashtag. ¡Queremos ver la boda desde tus ojos!',
            rsvpPreguntas: { alergias: true, cancion: true },
            hospedaje: [
              { nombre: 'Hotel Boutique Valle', nota: 'A 5 min del viñedo · tarifa especial con el código BODA-AR', url: 'https://maps.google.com/?q=hotel+Valle+de+Guadalupe' },
              { nombre: 'Cabañas Las Lomas', nota: 'Opción económica · a 12 min', url: 'https://maps.google.com/?q=caba%C3%B1as+Valle+de+Guadalupe' },
            ],
            faq: [
              { p: '¿Puedo llevar acompañante?', r: 'Tu invitación indica los lugares reservados para ti. Por cupo, te pedimos respetar ese número.' },
              { p: '¿Pueden ir niños?', r: 'Amamos a los pequeños, pero esta celebración será solo para adultos.' },
              { p: '¿Habrá transporte?', r: 'Sí. Saldrá un autobús del Hotel Boutique Valle a las 4:15 p. m. y habrá regreso a la 1:00 a. m.' },
              { p: '¿Puedo tomar fotos durante la ceremonia?', r: 'Te pedimos una ceremonia sin celulares: nuestro fotógrafo capturará cada momento. ¡En la fiesta, todas las que quieras!' },
              { p: '¿Hasta cuándo puedo confirmar?', r: 'A más tardar el 15 de septiembre, desde esta misma invitación.' },
            ],
            pase: true,
            fotosInvitados: true,
            firma: 'Con amor, Andrea & Rodrigo',
            fechaLimite: '2027-09-15',
            whatsapp: '¡Hola {nombre}! 💍 Nos casamos y nos encantaría que nos acompañes. Aquí está tu invitación: {enlace}',
          },
        },
      ],
      photos: {
        'andrea-rodrigo': [
          { id: 'ph1', url: 'fotos/boda-galeria-1.jpg', autor: 'Tía Carmen', fecha: d(0.3) },
          { id: 'ph2', url: 'fotos/boda-historia-2.jpg', autor: 'Mariana', fecha: d(0.2) },
          { id: 'ph3', url: 'fotos/boda-galeria-2.jpg', autor: '', fecha: d(0.1) },
          { id: 'ph4', url: 'fotos/boda-historia-1.jpg', autor: 'Daniel', fecha: d(0.05) },
        ],
        'camila-xv': [
          { id: 'px1', url: 'fotos/xv-galeria-2.jpg', autor: 'Gaby', fecha: d(0.2) },
          { id: 'px2', url: 'fotos/xv-galeria-4.jpg', autor: 'Valeria', fecha: d(0.1) },
          { id: 'px3', url: 'fotos/xv-galeria-3.jpg', autor: '', fecha: d(0.05) },
        ],
      },
      guests: {
        'andrea-rodrigo': [
          Object.assign(g('Bd5kRt8mWq3Z', 'Familia Ortiz Ochoa', 'Mariana Ortiz, Daniel Ochoa', 2, '6645556677', 'pendiente', 0, '', '', '', d(3)), { mesa: '2' }),
          Object.assign(g('Bd2nHs6vLp9Y', 'Tía Carmen', '', 2, '6646667788', 'confirmó', 2, '', '¡Qué emoción, ahí estaremos! 💐', d(1), d(3)), { mesa: '4', extras: { alergias: 'Sin gluten', cancion: 'La Bikina' } }),
          g('Bd8qJx4cTn7M', 'Familia Salas', '', 4, '', 'pendiente', 0, '', '', '', ''),
        ],
        'camila-xv': [
          g('Az4mQr8tLp2W', 'Familia Núñez Ibarra', 'Gabriela Núñez, Fernando Ibarra, Sofía Ibarra', 3, '6643334455', 'pendiente', 0, '', '', '', d(4)),
          g('Az7nWs2kVd9H', 'Valeria Ortega', '', 2, '6644445566', 'confirmó', 2, '', '¡Ahí estaré, amiga! 💙', d(1), d(4)),
        ],
        'sofia-xv': [
          g('Xv7kPq2mNa8R', 'Familia Castillo Ortiz', 'Laura Ortiz, Ricardo Méndez, Emilia Méndez', 3, '6641112233', 'confirmó', 3, 'Laura Ortiz, Ricardo Méndez, Emilia Méndez', '¡No nos lo perdemos, ahijada! 💖', d(2), d(6)),
          g('Xv3dLw9sTe4K', 'Daniela Fuentes', 'Daniela Fuentes, Acompañante', 2, '6642223344', 'pendiente', 0, '', '', '', d(6)),
          g('Xv5hRn6yUb1M', 'Familia Ramírez', '', 4, '', 'pendiente', 0, '', '', '', ''),
        ],
        'mateo-6': [
          g('pRk7mW2qXa9d', 'Familia Hernández', 'Leo, Camila, Ana Hernández', 3, '6641234567', 'confirmó', 3, 'Leo, Camila, Ana Hernández', '¡Leo ya tiene su casco listo! 🚀', d(2), d(8)),
          g('Tz4hQ8nLs3Ve', 'Santiago y mamá', '', 2, '6649876543', 'pendiente', 0, '', '', '', d(8)),
          g('Bc9JxY5fKm2W', 'Familia Ruiz', '', 4, '', 'declinó', 0, '', 'Andaremos de viaje, ¡feliz cumple Mateo!', d(3), d(9)),
          g('Hn3sDq7RtU8p', 'Tío Beto', '', 1, '+1 619 555 0101', 'pendiente', 0, '', '', '', ''),
        ],
        'valentina-4': [
          g('Fw6aRk9zPq4L', 'Familia Gómez', 'Sofi, Paula, Mariana Gómez', 3, '6645550000', 'confirmó', 2, 'Sofi, Mariana Gómez', 'Paula está enfermita 😢 pero Sofi va feliz.', d(1), d(5)),
          g('Gk2nVt8yMs5C', 'Abuelita Rosa', '', 2, '6645551111', 'confirmó', 2, '', '¡Ahí estaremos, mi princesa!', d(2), d(5)),
          g('Jm4pXc7wRd2N', 'Familia Torres', '', 3, '', 'pendiente', 0, '', '', '', ''),
        ],
      },
    };
  }

  window.API = API;
})();
