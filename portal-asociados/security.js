/* ═══════════════════════════════════════════════════════════════
   MÓDULO DE SEGURIDAD — Portal Asociados FondoUne
   v1.0 | 2026
═══════════════════════════════════════════════════════════════ */
(function() {
  'use strict';

  /* ── 1. ANTI-CLICKJACKING ── */
  if (window.self !== window.top) {
    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#c0392b;">Acceso no permitido en iframe.</div>';
    return;
  }

  /* ── 2. CONFIGURACIÓN ── */
  var SEC = {
    INACTIVITY_MS:  20 * 60 * 1000,
    SESSION_MS:     8  * 60 * 60 * 1000,
    RATE_MAX:       5,
    RATE_WINDOW_MS: 60 * 1000,
    AUDIT_KEY:      'fu_asoc_audit',
    SESS_KEY:       'fu_asoc_sess',
    RATE_KEY:       'fu_asoc_rate'
  };

  /* ── 3. SANITIZACIÓN XSS ── */
  window.FU_Sanitize = function(str) {
    if (typeof str !== 'string') return '';
    var el = document.createElement('div');
    el.textContent = str;
    return el.innerHTML.trim();
  };

  document.addEventListener('blur', function(e) {
    var el = e.target;
    if ((el.tagName === 'INPUT' && el.type !== 'password' && el.type !== 'file') || el.tagName === 'TEXTAREA') {
      var clean = window.FU_Sanitize(el.value);
      if (el.value !== clean) {
        el.value = clean;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }, true);

  /* ── 4. AUDITORÍA ── */
  window.FU_Audit = {
    log: function(accion, detalle) {
      try {
        var logs = JSON.parse(localStorage.getItem(SEC.AUDIT_KEY) || '[]');
        logs.unshift({ ts: new Date().toISOString(), accion: accion, detalle: detalle || '', ua: navigator.userAgent.substring(0, 80) });
        if (logs.length > 100) logs = logs.slice(0, 100);
        localStorage.setItem(SEC.AUDIT_KEY, JSON.stringify(logs));
      } catch(e) {}
    },
    get: function() {
      try { return JSON.parse(localStorage.getItem(SEC.AUDIT_KEY) || '[]'); } catch(e) { return []; }
    }
  };

  /* ── 5. SESIÓN ANÓNIMA CON EXPIRACIÓN ── */
  window.FU_Session = {
    init: function() {
      var raw = localStorage.getItem(SEC.SESS_KEY);
      if (!raw) {
        localStorage.setItem(SEC.SESS_KEY, JSON.stringify({ inicio: Date.now(), ultimaActividad: Date.now() }));
        FU_Audit.log('SESION_INICIO', 'Nueva sesión asociado');
      } else {
        this.touch();
      }
    },
    touch: function() {
      try {
        var s = JSON.parse(localStorage.getItem(SEC.SESS_KEY) || '{}');
        s.ultimaActividad = Date.now();
        localStorage.setItem(SEC.SESS_KEY, JSON.stringify(s));
      } catch(e) {}
    },
    isExpired: function() {
      try {
        var s = JSON.parse(localStorage.getItem(SEC.SESS_KEY) || '{}');
        var now = Date.now();
        return (now - (s.ultimaActividad || now)) > SEC.INACTIVITY_MS ||
               (now - (s.inicio || now)) > SEC.SESSION_MS;
      } catch(e) { return false; }
    },
    clear: function() { localStorage.removeItem(SEC.SESS_KEY); }
  };

  /* ── 6. MONITOR DE INACTIVIDAD ── */
  var _timer = null, _warned = false;

  function resetTimer() {
    window.FU_Session.touch();
    clearTimeout(_timer);
    if (_warned) {
      var w = document.getElementById('fu-sec-warning');
      if (w) { w.remove(); _warned = false; }
    }
    _timer = setTimeout(showWarning, SEC.INACTIVITY_MS);
  }

  function showWarning() {
    if (_warned) return;
    _warned = true;
    FU_Audit.log('INACTIVIDAD_ALERTA', 'Advertencia por inactividad');
    var div = document.createElement('div');
    div.id = 'fu-sec-warning';
    div.style.cssText = 'position:fixed;inset:0;background:rgba(45,26,14,.75);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);z-index:99999;display:flex;align-items:center;justify-content:center;';
    div.innerHTML = '<div style="background:#fff;border-radius:20px;padding:40px;max-width:380px;width:90%;text-align:center;box-shadow:0 24px 60px rgba(45,26,14,.3);">' +
      '<div style="font-size:52px;margin-bottom:14px">⏱️</div>' +
      '<div style="font-family:Outfit,sans-serif;font-weight:800;font-size:21px;color:#2D1A0E;margin-bottom:8px">¿Sigues ahí?</div>' +
      '<div style="font-size:13.5px;color:#7A5540;margin-bottom:24px;line-height:1.6">Tu sesión expirará en <strong id="fu-cd" style="color:#E8511A">60</strong>s por inactividad.</div>' +
      '<button id="fu-continue-btn" style="height:48px;padding:0 36px;background:#E8511A;color:#fff;border:none;border-radius:12px;font-family:Outfit,sans-serif;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 16px rgba(232,81,26,.4)">Continuar sesión</button>' +
      '</div>';
    document.body.appendChild(div);

    document.getElementById('fu-continue-btn').addEventListener('click', function() {
      clearInterval(_cdInterval);
      div.remove();
      _warned = false;
      resetTimer();
    });

    var secs = 60;
    var _cdInterval = setInterval(function() {
      secs--;
      var cd = document.getElementById('fu-cd');
      if (cd) cd.textContent = secs;
      if (secs <= 0) {
        clearInterval(_cdInterval);
        window.FU_Session.clear();
        FU_Audit.log('SESION_EXPIRADA', 'Cerrada por inactividad');
        div.innerHTML = '<div style="background:#fff;border-radius:20px;padding:40px;max-width:380px;width:90%;text-align:center;"><div style="font-size:48px">🔒</div><div style="font-family:Outfit,sans-serif;font-weight:800;font-size:18px;color:#2D1A0E;margin-top:12px">Sesión expirada</div><div style="font-size:13px;color:#7A5540;margin-top:8px">Recarga la página para continuar.</div><button onclick="location.reload()" style="margin-top:20px;height:46px;padding:0 28px;background:#2D1A0E;color:#fff;border:none;border-radius:11px;font-family:Outfit,sans-serif;font-weight:700;cursor:pointer;">Recargar</button></div>';
      }
    }, 1000);
  }

  ['mousemove','keydown','click','scroll','touchstart','input'].forEach(function(ev) {
    document.addEventListener(ev, resetTimer, { passive: true });
  });

  /* ── 7. RATE LIMITING ── */
  window.FU_RateLimit = {
    check: function() {
      try {
        var now = Date.now();
        var r = JSON.parse(localStorage.getItem(SEC.RATE_KEY) || '{"c":0,"t":0}');
        if (now - r.t > SEC.RATE_WINDOW_MS) r = { c: 0, t: now };
        r.c++;
        localStorage.setItem(SEC.RATE_KEY, JSON.stringify(r));
        if (r.c > SEC.RATE_MAX) {
          FU_Audit.log('RATE_LIMIT_BLOQUEADO', 'Demasiadas solicitudes en formulario');
          return false;
        }
        return true;
      } catch(e) { return true; }
    }
  };

  /* ── 8. CSP META TAG ── */
  document.addEventListener('DOMContentLoaded', function() {
    /* Inyectar CSP — NOTA: frame-ancestors eliminado del meta tag porque los
       navegadores lo ignoran aquí; solo funciona como cabecera HTTP del servidor.
       X-Frame-Options también eliminado: igual que frame-ancestors, solo es válido
       como cabecera HTTP, no como meta tag (el navegador lo advertía en consola). */
    var csp = document.createElement('meta');
    csp.httpEquiv = 'Content-Security-Policy';
    csp.content = "default-src 'self' https: data: blob:; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://www.gstatic.com https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https:; font-src 'self' https://fonts.gstatic.com data:;";
    document.head.insertBefore(csp, document.head.firstChild);

    /* Iniciar sesión y timer */
    window.FU_Session.init();
    resetTimer();

    /* ── Rate limit en botón generar ── */
    var btns = document.querySelectorAll('.btn-gen');
    btns.forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        if (!window.FU_RateLimit.check()) {
          e.stopImmediatePropagation();
          e.preventDefault();
          var msg = document.createElement('div');
          msg.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#C0392B;color:#fff;padding:12px 24px;border-radius:12px;font-family:Outfit,sans-serif;font-size:13px;font-weight:600;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,.2);';
          msg.textContent = '⚠️ Demasiadas solicitudes. Espera un momento.';
          document.body.appendChild(msg);
          setTimeout(function() { msg.remove(); }, 3500);
          return false;
        }
        FU_Audit.log('GENERAR_DOCUMENTO', 'Botón generar presionado');
      }, true);
    });

    /* Auditar envíos */
    document.addEventListener('submit', function(e) {
      FU_Audit.log('FORM_SUBMIT', e.target.id || 'form');
    });

    /* ── DEVTOOLS DETECT ── */
    setInterval(function() {
      if (window.outerWidth - window.innerWidth > 160 || window.outerHeight - window.innerHeight > 160) {
        FU_Audit.log('DEVTOOLS_DETECTADO', 'Herramientas de desarrollador abiertas');
      }
    }, 3000);
  });

})();
