/**
 * INVITACIONES — Backend (Google Apps Script + Google Sheets)
 * ------------------------------------------------------------
 * Una sola hoja de cálculo "maestra" contiene:
 *   - Usuarios : quién puede entrar al panel (rol admin | cliente)
 *   - Eventos  : un renglón por evento (tema + configuración en JSON)
 *   - EV_<id>  : UNA HOJA NUEVA POR EVENTO con sus invitados y respuestas
 *
 * El frontend (GitHub Pages) habla con este script por fetch() (JSON).
 *
 * INSTALACIÓN (resumen, ver README):
 *   1. Crea una hoja de cálculo nueva > Extensiones > Apps Script.
 *   2. Pega este archivo como Code.gs.
 *   3. Ejecuta setup() una vez (te pedirá permisos). Crea el usuario admin.
 *   4. Implementar > Nueva implementación > Aplicación web
 *        Ejecutar como: Yo   |   Quién tiene acceso: Cualquier persona
 *   5. Copia la URL /exec en docs/js/config.js (API_URL).
 */

// Pasos detallados de instalación: ver README.md (sección "Paso a paso").

// ===== Ajustes =====
const ADMIN_USER = 'admin';            // usuario super admin que crea setup()
const ADMIN_PASS = 'CambiaEsto123';    // cámbiala en cuanto entres
const SESSION_SECONDS = 6 * 60 * 60;   // 6 h (máximo de CacheService)

// ===== Esquema =====
const SH_USERS = 'Usuarios';
const SH_EVENTS = 'Eventos';
const GUEST_PREFIX = 'EV_';
const USER_COLS = ['usuario', 'hash', 'salt', 'rol', 'nombre', 'creado'];
const EVENT_COLS = ['id', 'propietario', 'tema', 'config', 'activo', 'creado', 'actualizado'];
const GUEST_COLS = ['token', 'nombre', 'personas', 'lugares', 'telefono', 'estado',
  'confirmados', 'detalle', 'mensaje', 'respondido', 'enviado', 'creado'];

class ApiError extends Error {}

// ===== Entrada HTTP =====
function doGet(e) { return respond_(e && e.parameter ? e.parameter : {}); }

function doPost(e) {
  let body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) {}
  return respond_(body);
}

function respond_(req) {
  let out;
  try {
    const fn = ACTIONS[req.action];
    if (!fn) throw new ApiError('Acción desconocida');
    out = { ok: true, data: fn(req) };
  } catch (err) {
    if (!(err instanceof ApiError)) console.error(err && err.stack || err);
    out = { ok: false, error: err instanceof ApiError ? err.message : 'Error interno del servidor' };
  }
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== Acciones =====
const ACTIONS = {
  // --- Públicas (invitado) ---
  getInvitation(req) {
    const ev = findEvent_(req.e);
    if (!ev || !truthy_(ev.activo)) throw new ApiError('Invitación no encontrada');
    let invitado = null;
    if (req.i) {
      const g = findGuest_(ev.id, req.i);
      if (!g) throw new ApiError('Invitación no encontrada');
      invitado = publicGuest_(g);
    }
    return { evento: publicEvent_(ev), invitado };
  },

  rsvp(req) {
    return withLock_(() => {
      const ev = findEvent_(req.e);
      if (!ev || !truthy_(ev.activo)) throw new ApiError('Invitación no encontrada');
      const sh = guestSheet_(ev.id);
      const g = findGuest_(ev.id, req.i, sh);
      if (!g) throw new ApiError('Invitación no encontrada');
      // Una vez respondida, la invitación queda cerrada. El organizador debe eliminarla y crear una nueva.
      if (g.estado && g.estado !== 'pendiente') {
        throw new ApiError('Esta invitación ya fue respondida. Si necesitas un cambio, pide a los anfitriones una nueva.');
      }
      const cfg = parse_(ev.config);
      if (cfg.fechaLimite && new Date() > new Date(cfg.fechaLimite + 'T23:59:59')) {
        throw new ApiError('La fecha límite para confirmar ya pasó');
      }
      const lugares = Math.max(1, Number(g.lugares) || 1);
      const personas = splitNames_(g.personas);
      let confirmados = 0, detalle = '';
      if (personas.length) {
        const sel = (Array.isArray(req.asisten) ? req.asisten : []).map(String)
          .filter(n => personas.indexOf(n) >= 0);
        confirmados = Math.min(sel.length, lugares);
        detalle = sel.slice(0, lugares).join(', ');
      } else {
        confirmados = Math.max(0, Math.min(lugares, Math.floor(Number(req.cantidad) || 0)));
      }
      if (req.asistira === false) { confirmados = 0; detalle = ''; }
      g.confirmados = confirmados;
      g.detalle = detalle;
      g.estado = confirmados > 0 ? 'confirmó' : 'declinó';
      g.mensaje = String(req.mensaje || '').slice(0, 500);
      g.respondido = nowIso_();
      writeRow_(sh, g._row, g, GUEST_COLS);
      return publicGuest_(g);
    });
  },

  // --- Sesión ---
  login(req) {
    const u = findUser_(req.usuario);
    if (!u || hash_(String(req.password || ''), u.salt) !== u.hash) {
      Utilities.sleep(600);
      throw new ApiError('Usuario o contraseña incorrectos');
    }
    const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    CacheService.getScriptCache().put('s_' + token,
      JSON.stringify({ usuario: u.usuario, rol: u.rol }), SESSION_SECONDS);
    return { token, usuario: u.usuario, rol: u.rol, nombre: u.nombre };
  },

  logout(req) {
    if (req.token) CacheService.getScriptCache().remove('s_' + req.token);
    return true;
  },

  changePassword(req) {
    const s = auth_(req);
    if (String(req.nueva || '').length < 6) throw new ApiError('La contraseña debe tener al menos 6 caracteres');
    return withLock_(() => {
      const u = findUser_(s.usuario);
      if (!u || hash_(String(req.actual || ''), u.salt) !== u.hash) throw new ApiError('La contraseña actual no es correcta');
      setPassword_(u, req.nueva);
      return true;
    });
  },

  // --- Cliente (y admin) ---
  myEvents(req) {
    const s = auth_(req);
    return readAll_(sheet_(SH_EVENTS, EVENT_COLS))
      .filter(ev => s.rol === 'admin' || ev.propietario === s.usuario)
      .filter(ev => s.rol === 'admin' || truthy_(ev.activo))
      .map(ev => Object.assign(adminEvent_(ev), { resumen: summary_(ev.id) }));
  },

  getEvent(req) {
    const s = auth_(req);
    return adminEvent_(eventFor_(s, req.e));
  },

  updateEvent(req) {
    const s = auth_(req);
    return withLock_(() => {
      const ev = eventFor_(s, req.e);
      if (req.config && typeof req.config === 'object') ev.config = JSON.stringify(req.config);
      if (req.tema) ev.tema = String(req.tema);
      if (s.rol === 'admin') {
        if (req.propietario !== undefined) ev.propietario = String(req.propietario);
        if (req.activo !== undefined) ev.activo = req.activo ? 'TRUE' : 'FALSE';
      }
      ev.actualizado = nowIso_();
      writeRow_(sheet_(SH_EVENTS, EVENT_COLS), ev._row, ev, EVENT_COLS);
      return adminEvent_(ev);
    });
  },

  listGuests(req) {
    const s = auth_(req);
    const ev = eventFor_(s, req.e);
    return readAll_(guestSheet_(ev.id)).map(cleanRow_);
  },

  saveGuest(req) {
    const s = auth_(req);
    return withLock_(() => {
      const ev = eventFor_(s, req.e);
      const sh = guestSheet_(ev.id);
      const data = req.invitado || {};
      const nombre = String(data.nombre || '').trim();
      if (!nombre) throw new ApiError('El nombre es obligatorio');
      let g = data.token ? findGuest_(ev.id, data.token, sh) : null;
      const isNew = !g;
      if (!isNew && g.estado && g.estado !== 'pendiente') {
        throw new ApiError('Esta invitación ya fue respondida y no se puede modificar. Elimínala y crea una nueva.');
      }
      if (isNew) {
        g = { token: newToken_(), estado: 'pendiente', confirmados: 0, detalle: '', mensaje: '',
          respondido: '', enviado: '', creado: nowIso_() };
      }
      g.nombre = nombre.slice(0, 120);
      g.personas = splitNames_(data.personas).join(', ');
      g.lugares = Math.max(1, Math.min(20, Math.floor(Number(data.lugares) || 1)));
      g.telefono = String(data.telefono || '').slice(0, 40);
      if (isNew) sh.appendRow(GUEST_COLS.map(c => g[c] === undefined ? '' : g[c]));
      else writeRow_(sh, g._row, g, GUEST_COLS);
      return cleanRow_(g);
    });
  },

  deleteGuest(req) {
    const s = auth_(req);
    return withLock_(() => {
      const ev = eventFor_(s, req.e);
      const sh = guestSheet_(ev.id);
      const g = findGuest_(ev.id, req.token, sh);
      if (!g) throw new ApiError('Invitado no encontrado');
      sh.deleteRow(g._row);
      return true;
    });
  },

  // Elimina la invitación y crea otra con los mismos datos y un enlace NUEVO (el anterior deja de funcionar).
  reissueGuest(req) {
    const s = auth_(req);
    return withLock_(() => {
      const ev = eventFor_(s, req.e);
      const sh = guestSheet_(ev.id);
      const old = findGuest_(ev.id, req.token, sh);
      if (!old) throw new ApiError('Invitado no encontrado');
      const g = { token: newToken_(), nombre: old.nombre, personas: old.personas, lugares: old.lugares, telefono: old.telefono,
        estado: 'pendiente', confirmados: 0, detalle: '', mensaje: '', respondido: '', enviado: '', creado: nowIso_() };
      sh.deleteRow(old._row);
      sh.appendRow(GUEST_COLS.map(c => g[c] === undefined ? '' : g[c]));
      return cleanRow_(g);
    });
  },

  markSent(req) {
    const s = auth_(req);
    return withLock_(() => {
      const ev = eventFor_(s, req.e);
      const sh = guestSheet_(ev.id);
      const g = findGuest_(ev.id, req.token, sh);
      if (!g) throw new ApiError('Invitado no encontrado');
      g.enviado = nowIso_();
      writeRow_(sh, g._row, g, GUEST_COLS);
      return cleanRow_(g);
    });
  },

  // --- Solo super admin ---
  createEvent(req) {
    const s = auth_(req, true);
    return withLock_(() => {
      const cfg = req.config || {};
      const base = slug_(cfg.festejado || cfg.titulo || 'evento');
      const id = base + '-' + Utilities.getUuid().slice(0, 4);
      if (req.nuevoCliente && req.nuevoCliente.usuario) createUser_(req.nuevoCliente, 'cliente');
      const propietario = String((req.nuevoCliente && req.nuevoCliente.usuario) || req.propietario || s.usuario).toLowerCase();
      if (!findUser_(propietario)) throw new ApiError('El cliente "' + propietario + '" no existe');
      const ev = { id, propietario, tema: String(req.tema || 'espacial'), config: JSON.stringify(cfg),
        activo: 'TRUE', creado: nowIso_(), actualizado: nowIso_() };
      sheet_(SH_EVENTS, EVENT_COLS).appendRow(EVENT_COLS.map(c => ev[c]));
      guestSheet_(id); // crea la hoja del evento
      return adminEvent_(ev);
    });
  },

  deleteEvent(req) {
    const s = auth_(req, true);
    return withLock_(() => {
      const ev = findEvent_(req.e);
      if (!ev) throw new ApiError('Evento no encontrado');
      // Se archiva: no se borra la hoja de invitados para no perder datos.
      ev.activo = 'FALSE';
      ev.actualizado = nowIso_();
      writeRow_(sheet_(SH_EVENTS, EVENT_COLS), ev._row, ev, EVENT_COLS);
      return true;
    });
  },

  listUsers(req) {
    auth_(req, true);
    return readAll_(sheet_(SH_USERS, USER_COLS)).map(u => ({ usuario: u.usuario, rol: u.rol, nombre: u.nombre, creado: u.creado }));
  },

  createUser(req) {
    auth_(req, true);
    return withLock_(() => {
      const u = createUser_(req, req.rol === 'admin' ? 'admin' : 'cliente');
      return { usuario: u.usuario, rol: u.rol, nombre: u.nombre };
    });
  },

  resetPassword(req) {
    auth_(req, true);
    return withLock_(() => {
      const u = findUser_(req.usuario);
      if (!u) throw new ApiError('Usuario no encontrado');
      if (String(req.password || '').length < 6) throw new ApiError('Mínimo 6 caracteres');
      setPassword_(u, req.password);
      return true;
    });
  },

  deleteUser(req) {
    const s = auth_(req, true);
    return withLock_(() => {
      if (String(req.usuario).toLowerCase() === s.usuario) throw new ApiError('No puedes borrarte a ti mismo');
      const u = findUser_(req.usuario);
      if (!u) throw new ApiError('Usuario no encontrado');
      sheet_(SH_USERS, USER_COLS).deleteRow(u._row);
      return true;
    });
  },
};

// ===== Instalación =====
function setup() {
  sheet_(SH_USERS, USER_COLS);
  sheet_(SH_EVENTS, EVENT_COLS);
  if (!findUser_(ADMIN_USER)) {
    createUser_({ usuario: ADMIN_USER, password: ADMIN_PASS, nombre: 'Super usuario' }, 'admin');
  }
  const first = ss_().getSheets()[0];
  if (first.getName() === 'Hoja 1' || first.getName() === 'Sheet1') {
    if (first.getLastRow() === 0) ss_().deleteSheet(first);
  }
  Logger.log('Listo. Usuario: ' + ADMIN_USER + ' / ' + ADMIN_PASS);
}

// ===== Autenticación =====
function auth_(req, adminOnly) {
  const raw = req.token ? CacheService.getScriptCache().get('s_' + req.token) : null;
  if (!raw) throw new ApiError('SESION_EXPIRADA');
  const s = JSON.parse(raw);
  // renueva la sesión en cada uso
  CacheService.getScriptCache().put('s_' + req.token, raw, SESSION_SECONDS);
  if (adminOnly && s.rol !== 'admin') throw new ApiError('Solo el super usuario puede hacer esto');
  return s;
}

function eventFor_(s, id) {
  const ev = findEvent_(id);
  if (!ev) throw new ApiError('Evento no encontrado');
  if (s.rol !== 'admin' && ev.propietario !== s.usuario) throw new ApiError('No tienes acceso a este evento');
  return ev;
}

function createUser_(data, rol) {
  const usuario = String(data.usuario || '').trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,40}$/.test(usuario)) throw new ApiError('Usuario inválido (3-40 letras, números, . _ -)');
  if (findUser_(usuario)) throw new ApiError('El usuario "' + usuario + '" ya existe');
  if (String(data.password || '').length < 6) throw new ApiError('La contraseña debe tener al menos 6 caracteres');
  const salt = Utilities.getUuid();
  const u = { usuario, salt, hash: hash_(String(data.password), salt), rol, nombre: String(data.nombre || usuario), creado: nowIso_() };
  sheet_(SH_USERS, USER_COLS).appendRow(USER_COLS.map(c => u[c]));
  return u;
}

function setPassword_(u, pass) {
  u.salt = Utilities.getUuid();
  u.hash = hash_(String(pass), u.salt);
  writeRow_(sheet_(SH_USERS, USER_COLS), u._row, u, USER_COLS);
}

function hash_(pass, salt) {
  let h = salt + '|' + pass;
  for (let i = 0; i < 50; i++) {
    h = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h + salt, Utilities.Charset.UTF_8));
  }
  return h;
}

// ===== Datos =====
function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function sheet_(name, cols) {
  let sh = ss_().getSheetByName(name);
  if (!sh) {
    sh = ss_().insertSheet(name);
    sh.getRange(1, 1, sh.getMaxRows(), cols.length).setNumberFormat('@'); // todo como texto (+52..., fechas ISO)
    sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function guestSheet_(eventId) { return sheet_(GUEST_PREFIX + eventId, GUEST_COLS); }

function readAll_(sh) {
  const values = sh.getDataRange().getValues();
  const head = values.shift() || [];
  return values.map((r, i) => {
    const o = { _row: i + 2 };
    head.forEach((h, j) => { o[h] = r[j] instanceof Date ? r[j].toISOString() : r[j]; });
    return o;
  }).filter(o => head.some(h => o[h] !== ''));
}

function writeRow_(sh, row, obj, cols) {
  sh.getRange(row, 1, 1, cols.length).setValues([cols.map(c => obj[c] === undefined || obj[c] === null ? '' : obj[c])]);
}

function findUser_(usuario) {
  const u = String(usuario || '').trim().toLowerCase();
  return readAll_(sheet_(SH_USERS, USER_COLS)).find(r => String(r.usuario).toLowerCase() === u) || null;
}

function findEvent_(id) {
  return readAll_(sheet_(SH_EVENTS, EVENT_COLS)).find(r => r.id === id) || null;
}

function findGuest_(eventId, token, sh) {
  if (!token) return null;
  return readAll_(sh || guestSheet_(eventId)).find(r => r.token === token) || null;
}

function summary_(eventId) {
  const gs = readAll_(guestSheet_(eventId));
  const r = { invitaciones: gs.length, confirmaron: 0, declinaron: 0, pendientes: 0, lugares: 0, personas: 0 };
  gs.forEach(g => {
    r.lugares += Number(g.lugares) || 0;
    if (g.estado === 'confirmó') { r.confirmaron++; r.personas += Number(g.confirmados) || 0; }
    else if (g.estado === 'declinó') r.declinaron++;
    else r.pendientes++;
  });
  return r;
}

// ===== Formateo de salida =====
function publicEvent_(ev) { return { id: ev.id, tema: ev.tema, config: parse_(ev.config) }; }
function adminEvent_(ev) {
  return { id: ev.id, propietario: ev.propietario, tema: ev.tema, config: parse_(ev.config),
    activo: truthy_(ev.activo), creado: ev.creado, actualizado: ev.actualizado };
}
function publicGuest_(g) {
  return { token: g.token, nombre: g.nombre, personas: splitNames_(g.personas), lugares: Number(g.lugares) || 1,
    estado: g.estado || 'pendiente', confirmados: Number(g.confirmados) || 0,
    detalle: splitNames_(g.detalle), mensaje: g.mensaje || '', respondido: g.respondido || '' };
}
function cleanRow_(g) {
  const o = {};
  GUEST_COLS.forEach(c => { o[c] = g[c] === undefined ? '' : g[c]; });
  o.lugares = Number(o.lugares) || 1;
  o.confirmados = Number(o.confirmados) || 0;
  return o;
}

// ===== Utilidades =====
function withLock_(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new ApiError('El servidor está ocupado, intenta de nuevo');
  try { return fn(); } finally { lock.releaseLock(); }
}
function parse_(s) { try { return JSON.parse(s || '{}'); } catch (e) { return {}; } }
function truthy_(v) { return v === true || String(v).toUpperCase() === 'TRUE'; }
function nowIso_() { return new Date().toISOString(); }
function newToken_() { return Utilities.getUuid().replace(/-/g, '').slice(0, 12); }
function splitNames_(s) {
  if (Array.isArray(s)) return s.map(x => String(x).trim()).filter(Boolean);
  return String(s || '').split(',').map(x => x.trim()).filter(Boolean);
}
function slug_(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'evento';
}
