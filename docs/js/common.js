/* Utilidades compartidas por la invitación y el panel */
(function () {
  const U = {};
  U.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.$ = (sel, root) => (root || document).querySelector(sel);
  U.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  // Lee parámetros de ?e=..&i=.. o de #e=..&i=..
  U.params = () => {
    const p = new URLSearchParams(location.search);
    const h = new URLSearchParams(location.hash.replace(/^#/, ''));
    return { e: p.get('e') || h.get('e') || '', i: p.get('i') || h.get('i') || '' };
  };

  // Fecha local "2027-03-13T15:00" -> Date (en hora local del invitado)
  U.parseDate = (s) => {
    const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
    return m ? new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)) : null;
  };
  U.fmtDate = (d) => {
    if (!d) return '';
    const s = d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  U.fmtTime = (d) => d ? d.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' }) : '';
  U.fmtShort = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // Enlace a una invitación. En modo demo se usa #, en producción ?e=&i= (más limpio para WhatsApp)
  U.inviteUrl = (e, i, absolute) => {
    const q = 'e=' + encodeURIComponent(e) + (i ? '&i=' + encodeURIComponent(i) : '');
    const rel = window.API && API.forcedDemo ? 'invitacion.html?demo=1&' + q
      : 'invitacion.html' + (window.API && API.isDemo ? '#' : '?') + q;
    return absolute ? new URL(rel, location.href).href : rel;
  };

  U.waUrl = (phone, text) => {
    let digits = String(phone || '').replace(/\D/g, '');
    if (digits.length === 10) digits = '52' + digits; // número mexicano sin lada de país
    return 'https://wa.me/' + digits + '?text=' + encodeURIComponent(text);
  };

  // Imágenes/audio: acepta rutas del repo (fotos/x.jpg), URLs https y enlaces compartidos de Google Drive
  U.driveId = (u) => {
    const m = String(u || '').match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{20,})/);
    return m ? m[1] : null;
  };
  U.img = (u) => {
    const id = U.driveId(u);
    if (id) return 'https://drive.google.com/thumbnail?id=' + id + '&sz=w1600';
    return /^(https?:\/\/|fotos\/|musica\/|data:image\/)/i.test(String(u || '')) ? u : '';
  };
  U.audio = (u) => {
    const id = U.driveId(u);
    if (id) return 'https://drive.google.com/uc?export=download&id=' + id;
    return /^(https?:\/\/|musica\/)/i.test(String(u || '')) ? u : '';
  };

  U.fillTemplate = (tpl, data) => String(tpl || '').replace(/\{(\w+)\}/g, (m, k) => data[k] != null ? data[k] : m);

  U.copy = async (text) => {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (e2) {}
      ta.remove(); return ok;
    }
  };

  U.toast = (msg, kind) => {
    let host = U.$('#toasts');
    if (!host) { host = document.createElement('div'); host.id = 'toasts'; document.body.appendChild(host); }
    const t = document.createElement('div');
    t.className = 'toast ' + (kind || '');
    t.textContent = msg;
    host.appendChild(t);
    setTimeout(() => t.classList.add('out'), 2600);
    setTimeout(() => t.remove(), 3100);
  };

  U.loadCss = (href) => new Promise((res) => {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href;
    l.onload = res; l.onerror = res; document.head.appendChild(l);
  });
  U.loadJs = (src) => new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s);
  });

  window.U = U;
})();
