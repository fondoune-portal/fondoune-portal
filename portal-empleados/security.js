/* ═══════════════════════════════════════════════════════════════
   MÓDULO DE SEGURIDAD ADICIONAL — Portal Empleados FondoUne
   v1.0 | 2026
   (Complementa el sistema de login/sesión existente)
═══════════════════════════════════════════════════════════════ */
(function() {
  'use strict';

  /* ── 1. ANTI-CLICKJACKING ── */
  if (window.self !== window.top) {
    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#c0392b;">Acceso no permitido en iframe.</div>';
    return;
  }

  /* ── 2. CONFIGURACIÓN EXTENDIDA ── */
  var SEC_EXT = {
    INACTIVITY_MS:  15 * 60 * 1000,   // 15 min inactividad (más estricto para empleados)
    WARN_BEFORE_MS: 60 * 1000,         // Advertir 60 s antes
    AUDIT_KEY:      'fu_emp_audit',
    RATE_KEY:       'fu_emp_rate',
    RATE_MAX:       10,
    RATE_WINDOW_MS: 60 * 1000,
    MAX_INTENTOS:   5,                 // Ya existe en SEC, refuerza
    BLOQUEO_MIN:    10                 // Aumentar bloqueo a 10 min (vs 5 del original)
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
      if (el.value !== clean) { el.value = clean; el.dispatchEvent(new Event('input', { bubbles: true })); }
    }
  }, true);

  /* ── 4. AUDITORÍA EXTENDIDA ── */
  window.FU_Audit = {
    log: function(accion, detalle) {
      try {
        var logs = JSON.parse(localStorage.getItem(SEC_EXT.AUDIT_KEY) || '[]');
        logs.unshift({ ts: new Date().toISOString(), accion: accion, detalle: detalle || '', ua: navigator.userAgent.substring(0, 80) });
        if (logs.length > 200) logs = logs.slice(0, 200);
        localStorage.setItem(SEC_EXT.AUDIT_KEY, JSON.stringify(logs));
      } catch(e) {}
    },
    get: function() {
      try { return JSON.parse(localStorage.getItem(SEC_EXT.AUDIT_KEY) || '[]'); } catch(e) { return []; }
    }
  };

  /* ── 5. PROTECCIÓN DE RUTA — verificar sesión antes de mostrar dashboard ── */
  window.FU_RouteGuard = {
    check: function() {
      /* El portal de empleados usa fu_session (definido en SEC del código original) */
      try {
        var raw = localStorage.getItem('fu_session');
        if (!raw) return false;
        var sess = JSON.parse(raw);
        if (!sess || !sess.expira) return false;
        if (Date.now() > sess.expira) {
          localStorage.removeItem('fu_session');
          FU_Audit.log('SESION_EXPIRADA', 'Sesión venció — redirigiendo a login');
          return false;
        }
        return true;
      } catch(e) { return false; }
    },
    enforce: function() {
      var self = this;
      document.addEventListener('DOMContentLoaded', function() {
        /* Verificar cada 60 s si la sesión sigue vigente */
        setInterval(function() {
          if (!self.check()) {
            /* Si el dashboard está visible, forzar login */
            var dash = document.getElementById('appShell');
            var login = document.getElementById('loginOverlay');
            if (dash && !dash.classList.contains('hidden') && login) {
              FU_Audit.log('SESION_EXPIRADA_RUNTIME', 'Sesión expirada durante uso');
              login.classList.remove('oculto');
              dash.style.display = 'none';
              showSessionExpiredToast();
            }
          }
        }, 60 * 1000);
      });
    }
  };

  function showSessionExpiredToast() {
    var t = document.createElement('div');
    t.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:#C0392B;color:#fff;padding:14px 28px;border-radius:12px;font-family:Outfit,sans-serif;font-size:13px;font-weight:600;z-index:99999;box-shadow:0 4px 20px rgba(0,0,0,.25);text-align:center;';
    t.innerHTML = '🔒 Tu sesión expiró.<br>Por favor inicia sesión nuevamente.';
    document.body.appendChild(t);
    setTimeout(function() { if (t.parentNode) t.remove(); }, 5000);
  }

  window.FU_RouteGuard.enforce();

  /* ── 6. MONITOR DE INACTIVIDAD (para sesión activa de empleados) ── */
  var _empTimer = null, _empWarned = false;

  function resetEmpTimer() {
    clearTimeout(_empTimer);
    if (_empWarned) {
      var w = document.getElementById('fu-emp-warning');
      if (w) { w.remove(); _empWarned = false; }
    }
    _empTimer = setTimeout(showEmpWarning, SEC_EXT.INACTIVITY_MS);
  }

  function showEmpWarning() {
    /* Solo mostrar si hay sesión activa */
    if (!window.FU_RouteGuard.check()) return;
    if (_empWarned) return;
    _empWarned = true;
    FU_Audit.log('INACTIVIDAD_ALERTA_EMP', 'Advertencia inactividad empleado');

    var div = document.createElement('div');
    div.id = 'fu-emp-warning';
    div.style.cssText = 'position:fixed;inset:0;background:rgba(45,26,14,.8);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);z-index:99999;display:flex;align-items:center;justify-content:center;';
    div.innerHTML = '<div style="background:#fff;border-radius:20px;padding:40px;max-width:380px;width:90%;text-align:center;box-shadow:0 24px 60px rgba(45,26,14,.35);">' +
      '<div style="font-size:52px;margin-bottom:14px">⏱️</div>' +
      '<div style="font-family:Outfit,sans-serif;font-weight:800;font-size:21px;color:#2D1A0E;margin-bottom:8px">Sesión por expirar</div>' +
      '<div style="font-size:13.5px;color:#7A5540;margin-bottom:6px;line-height:1.6">Por seguridad, tu sesión cerrará en</div>' +
      '<div style="font-family:Outfit,sans-serif;font-weight:800;font-size:42px;color:#E8511A;margin-bottom:16px" id="fu-emp-cd">60</div>' +
      '<div style="font-size:12px;color:#C4A090;margin-bottom:24px">segundos de inactividad</div>' +
      '<button id="fu-emp-continue" style="height:48px;padding:0 36px;background:#E8511A;color:#fff;border:none;border-radius:12px;font-family:Outfit,sans-serif;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 16px rgba(232,81,26,.4);margin-right:10px">Seguir trabajando</button>' +
      '<button id="fu-emp-logout" style="height:48px;padding:0 20px;background:transparent;color:#7A5540;border:1.5px solid #F0D8CC;border-radius:12px;font-family:Outfit,sans-serif;font-size:13px;font-weight:600;cursor:pointer;">Cerrar sesión</button>' +
      '</div>';
    document.body.appendChild(div);

    document.getElementById('fu-emp-continue').addEventListener('click', function() {
      clearInterval(_empCd);
      div.remove();
      _empWarned = false;
      resetEmpTimer();
      FU_Audit.log('INACTIVIDAD_CONTINUADA', 'Usuario continuó sesión');
    });

    document.getElementById('fu-emp-logout').addEventListener('click', function() {
      clearInterval(_empCd);
      FU_Audit.log('CIERRE_SESION_MANUAL', 'Usuario cerró sesión desde advertencia');
      if (typeof cerrarSesion === 'function') cerrarSesion();
      else location.reload();
    });

    var secs = 60;
    var _empCd = setInterval(function() {
      secs--;
      var cd = document.getElementById('fu-emp-cd');
      if (cd) cd.textContent = secs;
      if (secs <= 0) {
        clearInterval(_empCd);
        FU_Audit.log('SESION_CERRADA_INACTIVIDAD', 'Sesión de empleado cerrada por inactividad');
        localStorage.removeItem('fu_session');
        if (typeof cerrarSesion === 'function') cerrarSesion();
        else location.reload();
      }
    }, 1000);
  }

  ['mousemove','keydown','click','scroll','touchstart','input'].forEach(function(ev) {
    document.addEventListener(ev, resetEmpTimer, { passive: true });
  });

  /* ── 7. RATE LIMITING EN ACCIONES CRÍTICAS ── */
  window.FU_RateLimit = {
    check: function(accion) {
      try {
        var now = Date.now();
        var key = SEC_EXT.RATE_KEY + '_' + (accion || 'gen');
        var r = JSON.parse(localStorage.getItem(key) || '{"c":0,"t":0}');
        if (now - r.t > SEC_EXT.RATE_WINDOW_MS) r = { c: 0, t: now };
        r.c++;
        localStorage.setItem(key, JSON.stringify(r));
        if (r.c > SEC_EXT.RATE_MAX) {
          FU_Audit.log('RATE_LIMIT', 'Acción bloqueada: ' + (accion || 'desconocida'));
          return false;
        }
        return true;
      } catch(e) { return true; }
    }
  };

  /* ── 8. AUDITAR CAMBIOS DE ESTADO DE SOLICITUDES ── */
  document.addEventListener('DOMContentLoaded', function() {

    /* CSP meta — NOTA: frame-ancestors se eliminó del meta tag porque los navegadores
       lo ignoran cuando se entrega vía <meta>. Solo funciona como cabecera HTTP.
       Las demás directivas CSP sí aplican desde meta. */
    var csp = document.createElement('meta');
    csp.httpEquiv = 'Content-Security-Policy';
    csp.content = "default-src 'self' https: data: blob:; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://www.gstatic.com https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https:; font-src 'self' https://fonts.gstatic.com data:;";
    if (document.head) document.head.insertBefore(csp, document.head.firstChild);

    /* Iniciar timer de inactividad */
    resetEmpTimer();

    /* Auditar selects de estado */
    document.addEventListener('change', function(e) {
      if (e.target && e.target.classList && e.target.classList.contains('estado-sel')) {
        FU_Audit.log('CAMBIO_ESTADO', 'Solicitud ID próxima: ' + (e.target.dataset.id || '?') + ' → ' + e.target.value);
      }
    });

    /* Auditar descarga de documentos */
    document.addEventListener('click', function(e) {
      var btn = e.target.closest('.btn-hdl, .btn-dl, [data-action="download"]');
      if (btn) FU_Audit.log('DESCARGA_DOC', btn.textContent.trim().substring(0, 40));
    });

    /* Auditar apertura de modales */
    document.addEventListener('click', function(e) {
      var btn = e.target.closest('.act-btn');
      if (btn) FU_Audit.log('MODAL_ABIERTO', 'Acción en solicitud');
    });

    /* DevTools detect */
    setInterval(function() {
      if (window.outerWidth - window.innerWidth > 160 || window.outerHeight - window.innerHeight > 160) {
        FU_Audit.log('DEVTOOLS_DETECTADO', 'Herramientas de desarrollador abiertas');
      }
    }, 3000);

    /* Reforzar bloqueo de login: aumentar a 10 min si SEC existe */
    if (typeof SEC !== 'undefined') {
      SEC.MAX_INTENTOS = Math.max(SEC.MAX_INTENTOS, 3);
      SEC.BLOQUEO_MIN  = Math.max(SEC.BLOQUEO_MIN,  10);
    }
  });

})();

/* =========================================================================
   MÓDULO DE SEGURIDAD Y AUDITORÍA FONDOUNE
   ========================================================================= */
(function() {
  'use strict';
  /* ✅ FIX: Expuesto en window para que docx-builder.js y otros módulos
     puedan acceder a SEC sin ReferenceError */
  window.SEC = {
    MAX_IDLE_MINUTES: 15,
    AUDIT_KEY:        'fu_empleados_audit',
    SESS_KEY:         'fu_empleados_sess',
    RATE_KEY:         'fu_empleados_rate',
    MAX_INTENTOS:     5,   // Referenciado por initSeguridad en docx-builder.js
    BLOQUEO_MIN:      10   // y por la primera IIFE de este mismo archivo
  };
  var SEC = window.SEC; // alias local para no reescribir las referencias internas
  /* ── SANITIZACIÓN XSS ── */
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
  /* ── AUDITORÍA LOCAL ── */
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
  /* ── SESIÓN CON EXPIRACIÓN (INACTIVIDAD) ── */
  window.FU_Session = {
    init: function() {
      var raw = localStorage.getItem(SEC.SESS_KEY);
      if (!raw) {
        localStorage.setItem(SEC.SESS_KEY, JSON.stringify({ inicio: Date.now(), ultimaActividad: Date.now() }));
        FU_Audit.log('SESION_INICIO', 'Nueva sesión');
      } else { this.touch(); }
    },
    touch: function() {
      try {
        var s = JSON.parse(localStorage.getItem(SEC.SESS_KEY));
        s.ultimaActividad = Date.now();
        localStorage.setItem(SEC.SESS_KEY, JSON.stringify(s));
      } catch(e) {}
    },
    check: function() {
      try {
        var s = JSON.parse(localStorage.getItem(SEC.SESS_KEY));
        if (!s) return;
        var diffMins = (Date.now() - s.ultimaActividad) / 60000;
        if (diffMins > SEC.MAX_IDLE_MINUTES) {
          FU_Audit.log('SESION_EXPIRADA', 'Cerrada por inactividad');
          localStorage.removeItem(SEC.SESS_KEY);
          alert('Por tu seguridad, la sesión ha expirado por inactividad. La página se recargará.');
          window.location.reload();
        }
      } catch(e) {}
    }
  };
  window.FU_Session.init();
  document.addEventListener('click', function(e) {
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) window.FU_Session.touch();
  });
  document.addEventListener('keydown', function() { window.FU_Session.touch(); });
  setInterval(window.FU_Session.check, 60000);
})();
