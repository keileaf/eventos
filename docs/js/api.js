/* Cliente de la API + backend de demostración (cuando API_URL está vacío). */
(function () {
  const CFG = window.APP_CONFIG || {};
  const SESSION_KEY = 'inv_session';
  const store = {
    get(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { sessionStorage.removeItem(k); } catch (e) {} },
  };

  let memSession = null;
  const API = {
    isDemo: !CFG.API_URL,
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
  const DEMO_KEY = 'inv_demo_v2';
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
        confirmados: g.confirmados, detalle: split(g.detalle), mensaje: g.mensaje, respondido: g.respondido };
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
        Object.assign(g, { confirmados: c, detalle: det, estado: c > 0 ? 'confirmó' : 'declinó', mensaje: String(req.mensaje || '').slice(0, 500), respondido: now() });
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
        Object.assign(g, { nombre, personas: split(d.personas).join(', '), lugares: Math.max(1, Math.min(20, Math.floor(+d.lugares || 1))), telefono: String(d.telefono || '') });
        return g;
      },
      deleteGuest(req) {
        const ev = this.eventFor(this.auth(req), req.e);
        this.db.guests[ev.id] = this.guests(ev.id).filter(g => g.token !== req.token); return true;
      },
      reissueGuest(req) {
        const ev = this.eventFor(this.auth(req), req.e);
        const old = this.guests(ev.id).find(x => x.token === req.token); if (!old) throw new Error('Invitado no encontrado');
        const g = { token: rid(12), nombre: old.nombre, personas: old.personas, lugares: old.lugares, telefono: old.telefono, estado: 'pendiente', confirmados: 0, detalle: '', mensaje: '', respondido: '', enviado: '', creado: now() };
        this.db.guests[ev.id] = this.guests(ev.id).filter(x => x !== old); this.db.guests[ev.id].push(g); return g;
      },
      markSent(req) {
        const ev = this.eventFor(this.auth(req), req.e);
        const g = this.guests(ev.id).find(x => x.token === req.token); if (!g) throw new Error('Invitado no encontrado');
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
        { usuario: 'admin', password: 'admin123', rol: 'admin', nombre: 'Super usuario', creado: d(30) },
        { usuario: 'familia.mateo', password: 'mateo123', rol: 'cliente', nombre: 'Daniel y Sofía', creado: d(20) },
        { usuario: 'familia.vale', password: 'vale123', rol: 'cliente', nombre: 'Andrea y Luis', creado: d(18) },
        { usuario: 'familia.sofia', password: 'sofia123', rol: 'cliente', nombre: 'Mónica y Javier', creado: d(25) },
      ],
      events: [
        {
          id: 'mateo-6', propietario: 'familia.mateo', tema: 'espacial', activo: true, creado: d(20), actualizado: d(2),
          config: {
            tipo: 'cumpleanos', festejado: 'Mateo', edad: 6,
            encabezado: '¡Prepárate para despegar!',
            frase: 'Mateo cumple 6 años y te invita a una aventura fuera de este mundo.',
            fecha: '2027-03-13T15:00', duracionHoras: 4,
            lugar: { nombre: 'Salón de Fiestas Galaxia', direccion: 'Av. Revolución 1234, Zona Centro, Tijuana, B.C.', mapa: 'https://maps.google.com/?q=Av.+Revolucion+1234+Tijuana' },
            horario: [
              { hora: '3:00 p. m.', texto: 'Despegue: llegada de los astronautas' },
              { hora: '4:00 p. m.', texto: 'Misión piñata en el planeta rojo' },
              { hora: '5:30 p. m.', texto: 'Pastel y canción de cumpleaños' },
              { hora: '7:00 p. m.', texto: 'Aterrizaje: fin de la misión' },
            ],
            vestimenta: 'Ven de astronauta, alien o con tu playera espacial favorita.',
            regalos: 'Tu presencia es el mejor regalo. Si deseas obsequiar algo, habrá caja para sobres.',
            firma: 'Con cariño, Daniel y Sofía',
            fechaLimite: '2027-03-01',
            whatsapp: '¡Hola {nombre}! 🚀 {festejado} cumple {edad} y queremos que despegues con nosotros. Aquí está tu invitación: {enlace}',
          },
        },
        {
          id: 'valentina-4', propietario: 'familia.vale', tema: 'jardin', activo: true, creado: d(18), actualizado: d(3),
          config: {
            tipo: 'cumpleanos', festejado: 'Valentina', edad: 4,
            encabezado: 'Un día mágico en el jardín',
            frase: 'Las mariposas ya están listas para celebrar los 4 años de Valentina. ¡Ven a revolotear con nosotros!',
            fecha: '2027-04-24T16:00', duracionHoras: 4,
            lugar: { nombre: 'Jardín de Eventos Las Flores', direccion: 'Blvd. Agua Caliente 4558, Tijuana, B.C.', mapa: 'https://maps.google.com/?q=Blvd+Agua+Caliente+4558+Tijuana' },
            horario: [
              { hora: '4:00 p. m.', texto: 'Bienvenida en el jardín' },
              { hora: '5:00 p. m.', texto: 'Taller de alas de mariposa' },
              { hora: '6:00 p. m.', texto: 'Pastel y mañanitas' },
              { hora: '8:00 p. m.', texto: 'Despedida' },
            ],
            vestimenta: 'Colores pastel. ¡Las alas y coronas de flores son bienvenidas!',
            regalos: 'Lluvia de sobres.',
            firma: 'Con amor, Andrea y Luis',
            fechaLimite: '2027-04-10',
            whatsapp: '¡Hola {nombre}! 🦋 {festejado} cumple {edad} y nos encantaría verte en su fiesta. Tu invitación: {enlace}',
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
            firma: 'Con cariño, Sofía Valeria',
            fechaLimite: '2027-06-01',
            whatsapp: '¡Hola {nombre}! ✨ Con mucha ilusión te invito a mis XV años. Aquí está tu invitación: {enlace}',
          },
        },
      ],
      guests: {
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
