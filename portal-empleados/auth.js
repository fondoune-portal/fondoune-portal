/* ════════════════════════════════════════════════════════════
   SISTEMA DE AUTENTICACIÓN — FondoUne Portal Empleados
   Firebase Authentication con Email/Password
   ════════════════════════════════════════════════════════════
   Usuarios: Firebase Console → Authentication → Users
   Roles y estado: Firestore → colección "usuarios" → doc ID = UID
   Campos esperados: { email, nombre, rol, activo, creadoEn }
   ════════════════════════════════════════════════════════════ */

/* ── Configuración de seguridad ── */
var SEC = {
  MAX_INTENTOS: 5,     /* Intentos antes del bloqueo local  */
  BLOQUEO_MIN:  5,     /* Minutos de bloqueo local          */
  BLOCK_KEY:    'fu_block'   /* Solo para persistir bloqueo entre recargas */
};

/* ── Estado en memoria ── */
var intentosFallidos = 0;
var bloqueoHasta     = 0;    /* timestamp ms — puro en memoria, no localStorage  */
var blockInterval    = null;
var passVisible      = false;

/* ════════════════════════════════════════════════════════════
   INIT — onAuthStateChanged restaura sesión automáticamente
   Se ejecuta tanto en carga inicial como tras signIn/signOut
════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function() {

  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      _cargarRolYAbrir(user);
    } else {
      _mostrarPantallaLogin();
    }
  });

  /* Restaurar bloqueo activo si el usuario recargó durante el countdown */
  _restaurarBloqueoSiActivo();
});

/* ════════════════════════════════════════════════════════════
   FLUJO INTERNO DE AUTENTICACIÓN
════════════════════════════════════════════════════════════ */

/* ── 1. Leer documento del usuario en Firestore ── */
function _cargarRolYAbrir(user) {
  if (!window._fbDB) {
    /* Firestore no disponible — acceso mínimo sin validar activo */
    console.warn('⚠️ Firestore no disponible. Abriendo con datos básicos.');
    _abrirPortal(user, { nombre: user.displayName || user.email, rol: 'Asesor', activo: true });
    return;
  }

  window._fbDB.collection('usuarios').doc(user.uid).get()
    .then(function(doc) {
      if (!doc.exists) {
        /* Usuario en Auth pero sin documento de roles — tratar como Asesor activo */
        console.warn('⚠️ Documento de usuario no encontrado en Firestore para UID:', user.uid);
        _abrirPortal(user, { nombre: user.displayName || user.email, rol: 'Asesor', activo: true });
        return;
      }

      var datos = doc.data();

      /* ── VALIDACIÓN CRÍTICA: campo "activo" ── */
      if (datos.activo === false) {
        firebase.auth().signOut();
        _mostrarPantallaLogin();
        mostrarError('Tu cuenta está desactivada. Contacta al administrador.');
        return;
      }

      _abrirPortal(user, datos);
    })
    .catch(function(err) {
      console.error('Error leyendo perfil de usuario:', err);
      _abrirPortal(user, { nombre: user.email, rol: 'Asesor', activo: true });
    });
}

/* ── 2. Guardar sesión y abrir el portal ── */
function _abrirPortal(user, datos) {

  /* Variable global "sesionActual" — accesible desde app.js y cualquier módulo */
  window.sesionActual = {
    uid:    user.uid,
    email:  user.email,
    nombre: datos.nombre || user.displayName || user.email,
    rol:    datos.rol    || 'Asesor'
  };

  /* Resetear intentos fallidos al entrar */
  intentosFallidos = 0;
  bloqueoHasta     = 0;
  actualizarDots();

  /* Animar cierre del overlay de login */
  var overlay = document.getElementById('loginOverlay');
  if (!overlay) return;

  overlay.style.transition = 'opacity .4s ease';
  overlay.style.opacity    = '0';

  setTimeout(function() {
    overlay.classList.add('oculto');
    overlay.style.opacity = '';

    /* Mostrar barra de sesión */
    var su = document.getElementById('sessionUser');
    if (su) su.textContent = '● ' + window.sesionActual.nombre + ' (' + window.sesionActual.rol + ')';

    var sb = document.getElementById('sessionBar');
    if (sb) sb.classList.add('show');

    /* Notificar a app.js */
    if (typeof actualizarNavAdmin === 'function') actualizarNavAdmin();

    if (window.sesionActual.rol === 'Administrador' && typeof renderUsrTable === 'function') {
      renderUsrTable();
    }

    if (typeof registrarAudit === 'function') {
      registrarAudit('Inicio de sesión', {
        id: 'auth', radicado: 'LOGIN',
        nombreTitular: window.sesionActual.nombre
      });
    }

  }, 400);
}

/* ── 3. Mostrar pantalla de login ── */
function _mostrarPantallaLogin() {
  var overlay = document.getElementById('loginOverlay');
  if (!overlay) return;
  overlay.classList.remove('oculto');
  overlay.style.opacity = '1';
}

/* ════════════════════════════════════════════════════════════
   INTENTO DE LOGIN
════════════════════════════════════════════════════════════ */
function intentarLogin() {

  /* ── Comprobar bloqueo activo ── */
  if (_estaBlockeado()) {
    iniciarCountdown(bloqueoHasta);
    return;
  }

  var email    = (document.getElementById('loginUser').value  || '').trim().toLowerCase();
  var password =  document.getElementById('loginPass').value  || '';

  if (!email || !password) {
    mostrarError('Por favor ingresa tu correo y contraseña.');
    return;
  }

  /* UI — estado "cargando" */
  var btn     = document.getElementById('loginBtn');
  var spinner = document.getElementById('loginSpinner');
  var btnTxt  = document.getElementById('loginBtnTxt');
  btn.disabled         = true;
  spinner.style.display = 'block';
  btnTxt.textContent   = 'Verificando…';

  firebase.auth().signInWithEmailAndPassword(email, password)
    .then(function() {
      /* Éxito — onAuthStateChanged abre el portal automáticamente */
      spinner.style.display = 'none';
      btnTxt.textContent    = '🔐 Ingresar al Portal';
    })
    .catch(function(error) {
      btn.disabled          = false;
      spinner.style.display = 'none';
      btnTxt.textContent    = '🔐 Ingresar al Portal';
      _manejarErrorAuth(error);
    });
}

/* ── Traducir errores de Firebase a mensajes legibles ── */
function _manejarErrorAuth(error) {
  intentosFallidos++;
  actualizarDots();

  var restantes = SEC.MAX_INTENTOS - intentosFallidos;
  var msg;

  switch (error.code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      if (intentosFallidos >= SEC.MAX_INTENTOS) {
        _bloquear();
        return; /* _bloquear ya llama mostrarError */
      }
      msg = 'Credenciales incorrectas. Te quedan ' + restantes +
            ' intento' + (restantes !== 1 ? 's' : '') + '.';
      break;
    case 'auth/invalid-email':
      msg = 'El formato del correo no es válido.';
      break;
    case 'auth/too-many-requests':
      msg = 'Demasiados intentos. Espera unos minutos o restablece tu contraseña.';
      break;
    case 'auth/user-disabled':
      msg = 'Esta cuenta está desactivada. Contacta al administrador.';
      break;
    case 'auth/network-request-failed':
      msg = 'Sin conexión. Verifica tu internet e intenta de nuevo.';
      break;
    default:
      msg = 'Error al iniciar sesión (' + (error.code || 'desconocido') + '). Intenta de nuevo.';
  }

  mostrarError(msg);
  document.getElementById('loginPass').value = '';
  document.getElementById('loginPass').focus();
}

/* ════════════════════════════════════════════════════════════
   CERRAR SESIÓN
════════════════════════════════════════════════════════════ */
function cerrarSesion() {
  if (!confirm('¿Cerrar sesión? Serás redirigido a la pantalla de inicio.')) return;

  if (typeof registrarAudit === 'function') {
    registrarAudit('Cierre de sesión', {
      id: 'auth', radicado: 'LOGOUT',
      nombreTitular: (window.sesionActual && window.sesionActual.nombre) || ''
    });
  }

  firebase.auth().signOut()
    .then(function() {
      window.sesionActual = null;

      /* Resetear campos de login */
      var loginUser = document.getElementById('loginUser');
      var loginPass = document.getElementById('loginPass');
      var loginErr  = document.getElementById('loginError');
      if (loginUser) loginUser.value = '';
      if (loginPass) loginPass.value = '';
      if (loginErr)  loginErr.classList.remove('show');

      intentosFallidos = 0;
      actualizarDots();

      /* Resetear botón */
      var btn     = document.getElementById('loginBtn');
      var spinner = document.getElementById('loginSpinner');
      var btnTxt  = document.getElementById('loginBtnTxt');
      if (btn)     btn.disabled          = false;
      if (spinner) spinner.style.display = 'none';
      if (btnTxt)  btnTxt.textContent    = '🔐 Ingresar al Portal';

      /* Ocultar overlay de recuperación si estaba abierto */
      var recOv = document.getElementById('recoverOverlay');
      if (recOv) { recOv.classList.add('oculto'); recOv.style.opacity = ''; }

      /* Mostrar login con fade-in */
      var overlay = document.getElementById('loginOverlay');
      if (overlay) {
        overlay.classList.remove('oculto');
        overlay.style.opacity    = '0';
        overlay.style.transition = 'opacity .35s ease';
        setTimeout(function() { overlay.style.opacity = '1'; }, 10);
      }

      if (loginUser) loginUser.focus();
    })
    .catch(function(err) {
      console.error('Error al cerrar sesión:', err);
    });
}

/* ════════════════════════════════════════════════════════════
   VERIFICAR SESIÓN — compatibilidad con app.js
   app.js puede llamar verificarSesion() para saber si hay sesión activa
════════════════════════════════════════════════════════════ */
function verificarSesion() {
  return window.sesionActual || false;
}

/* ════════════════════════════════════════════════════════════
   RECUPERACIÓN DE CONTRASEÑA — Firebase envía el email
════════════════════════════════════════════════════════════ */
function mostrarRecuperar() {
  var recOv = document.getElementById('recoverOverlay');
  if (!recOv) return;

  recOv.classList.remove('oculto');
  recOv.style.opacity    = '0';
  recOv.style.transition = 'opacity .3s ease';
  setTimeout(function() { recOv.style.opacity = '1'; }, 10);

  /* El paso 1 (verificar admin) ya no aplica — Firebase maneja todo.
     Ocultamos step1 y mostramos step2 con un campo de email limpio. */
  var step1 = document.getElementById('recoverStep1');
  var step2 = document.getElementById('recoverStep2');
  if (step1) step1.style.display = 'none';
  if (step2) {
    step2.style.display = 'block';
    /* Inyectar campo de email si no existe aún */
    var wrap = document.getElementById('recTargetUserWrap');
    if (wrap && !document.getElementById('recEmailInput')) {
      wrap.innerHTML =
        '<label style="font-size:12px;color:var(--muted);margin-bottom:6px;display:block">' +
          'Correo electrónico de la cuenta' +
        '</label>' +
        '<input class="login-input" id="recEmailInput" type="email" ' +
               'placeholder="usuario@fondoune.com" autocomplete="email">';
    }
  }
}

function ocultarRecuperar() {
  var recOv = document.getElementById('recoverOverlay');
  if (!recOv) return;
  recOv.style.transition = 'opacity .3s ease';
  recOv.style.opacity    = '0';
  setTimeout(function() {
    recOv.classList.add('oculto');
    recOv.style.opacity = '';
  }, 300);
}

/* Paso 1 redirige directo al envío */
function verificarAdminRecuperar() {
  ejecutarRestablecimiento();
}

function ejecutarRestablecimiento() {
  var emailInput = document.getElementById('recEmailInput') ||
                   document.getElementById('recAdminUser');
  if (!emailInput) return;

  var email = emailInput.value.trim().toLowerCase();
  var errEl = document.getElementById('recoverError2');
  var okEl  = document.getElementById('recoverOk');

  /* Limpiar estados anteriores */
  if (errEl) errEl.classList.remove('show');
  if (okEl)  okEl.style.display = 'none';

  if (!email) {
    if (errEl) {
      document.getElementById('recoverError2Msg').textContent = 'Ingresa el correo de la cuenta.';
      errEl.classList.add('show');
    }
    return;
  }

  firebase.auth().sendPasswordResetEmail(email)
    .then(function() {
      if (okEl) {
        okEl.style.display = 'block';
        okEl.textContent   = '✅ Email enviado a ' + email + '. Revisa tu bandeja (y spam).';
      }
      setTimeout(ocultarRecuperar, 4000);
    })
    .catch(function(error) {
      var msg;
      switch (error.code) {
        case 'auth/user-not-found':    msg = 'No existe una cuenta con ese correo.'; break;
        case 'auth/invalid-email':     msg = 'El formato del correo no es válido.';  break;
        case 'auth/too-many-requests': msg = 'Demasiadas solicitudes. Espera un momento.'; break;
        default: msg = 'Error al enviar el correo. Intenta de nuevo.';
      }
      if (errEl) {
        document.getElementById('recoverError2Msg').textContent = msg;
        errEl.classList.add('show');
      }
    });
}

/* ════════════════════════════════════════════════════════════
   BLOQUEO LOCAL (5 intentos) — en memoria, no localStorage
   Se persiste en localStorage SOLO para sobrevivir recargas
   accidentales durante el countdown.
════════════════════════════════════════════════════════════ */
function _estaBlockeado() {
  if (bloqueoHasta > new Date().getTime()) return true;
  bloqueoHasta = 0;
  return false;
}

function _bloquear() {
  bloqueoHasta = new Date().getTime() + (SEC.BLOQUEO_MIN * 60 * 1000);
  /* Persistir para sobrevivir una recarga accidental durante el countdown */
  try { localStorage.setItem(SEC.BLOCK_KEY, String(bloqueoHasta)); } catch(e) {}
  iniciarCountdown(bloqueoHasta);
  mostrarError('Acceso bloqueado por ' + SEC.BLOQUEO_MIN + ' minutos.');
  document.getElementById('loginPass').value = '';
}

function _restaurarBloqueoSiActivo() {
  try {
    var guardado = parseInt(localStorage.getItem(SEC.BLOCK_KEY) || '0', 10);
    if (guardado && guardado > new Date().getTime()) {
      bloqueoHasta = guardado;
      iniciarCountdown(bloqueoHasta);
    } else {
      localStorage.removeItem(SEC.BLOCK_KEY);
    }
  } catch(e) {}
}

function iniciarCountdown(hasta) {
  var blocked = document.getElementById('loginBlocked');
  var timer   = document.getElementById('blockTimer');
  var btn     = document.getElementById('loginBtn');
  var uInput  = document.getElementById('loginUser');
  var pInput  = document.getElementById('loginPass');
  if (!blocked || !timer || !btn) return;

  blocked.classList.add('show');
  btn.disabled = true;
  if (uInput) uInput.disabled = true;
  if (pInput) pInput.disabled = true;

  clearInterval(blockInterval);
  blockInterval = setInterval(function() {
    var resto = hasta - new Date().getTime();
    if (resto <= 0) {
      clearInterval(blockInterval);
      bloqueoHasta     = 0;
      intentosFallidos = 0;
      try { localStorage.removeItem(SEC.BLOCK_KEY); } catch(e) {}

      blocked.classList.remove('show');
      btn.disabled = false;
      if (uInput) uInput.disabled = false;
      if (pInput) pInput.disabled = false;
      actualizarDots();
      return;
    }
    var min = Math.floor(resto / 60000);
    var seg = Math.floor((resto % 60000) / 1000);
    timer.textContent = String(min).padStart(2, '0') + ':' + String(seg).padStart(2, '0');
  }, 500);
}

/* ════════════════════════════════════════════════════════════
   HELPERS DE UI
════════════════════════════════════════════════════════════ */
function actualizarDots() {
  for (var i = 1; i <= 5; i++) {
    var dot = document.getElementById('dot' + i);
    if (!dot) continue;
    dot.className = 'attempt-dot';
    if (i <= intentosFallidos) dot.classList.add('used');
  }
}

function mostrarError(msg) {
  var el = document.getElementById('loginError');
  if (!el) return;
  document.getElementById('loginErrorMsg').textContent = msg;
  el.classList.remove('show');
  void el.offsetWidth; /* reflow — reinicia la animación CSS */
  el.classList.add('show');
  ['loginUser', 'loginPass'].forEach(function(id) {
    var inp = document.getElementById(id);
    if (inp) {
      inp.classList.add('error');
      setTimeout(function() { inp.classList.remove('error'); }, 600);
    }
  });
}

function togglePassVer() {
  passVisible = !passVisible;
  var inp = document.getElementById('loginPass');
  var ico = document.getElementById('eyeIcon');
  if (!inp || !ico) return;
  inp.type     = passVisible ? 'text' : 'password';
  ico.innerHTML = passVisible
    ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>' +
      '<path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>' +
      '<line x1="1" y1="1" x2="23" y2="23"/>'
    : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
}

function togglePassField(inputId) {
  var inp = document.getElementById(inputId);
  if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

function loginKeydown(e) {
  if (e.key === 'Enter') intentarLogin();
}
