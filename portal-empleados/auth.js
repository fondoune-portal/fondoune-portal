/**
 * auth.js — FondoUne Portal Empleados
 * Módulo de autenticación con Firebase Authentication
 *
 * INSTRUCCIONES DE INTEGRACIÓN:
 * 1. Incluir DESPUÉS de firebase-app.js y firebase-auth.js en el HTML
 * 2. Remover el bloque <script> con var USUARIOS = {...} y SEC = {...}
 * 3. Llamar initAuth() al inicio del portal
 */

/* ═══ CONFIGURACIÓN DE ROLES ═══
   Roles válidos: 'Administrador', 'Asesor', 'Consultor'
   El rol se almacena en Firestore: colección 'usuarios', doc uid
*/

var AUTH = (function() {
  'use strict';

  var _auth = null;
  var _db   = null;
  var _usuario = null; // { uid, email, nombre, rol, activo }

  /* ────────────────────────────────
     INICIALIZAR
  ──────────────────────────────── */
  function init(onAutenticado, onNoAutenticado) {
    _auth = firebase.auth();
    _db   = window._fbDB || firebase.firestore();

    _auth.onAuthStateChanged(function(user) {
      if (user) {
        _cargarPerfil(user, onAutenticado, onNoAutenticado);
      } else {
        _usuario = null;
        if (setSesionActual) setSesionActual(null);
        if (onNoAutenticado) onNoAutenticado();
        else _mostrarLogin();
      }
    });
  }

  /* ────────────────────────────────
     CARGAR PERFIL DESDE FIRESTORE
  ──────────────────────────────── */
  function _cargarPerfil(user, onOk, onFail) {
    _db.collection('usuarios').doc(user.uid).get()
      .then(function(doc) {
        if (doc.exists) {
          var data = doc.data();
          if (data.activo === false) {
            // Usuario desactivado
            _auth.signOut();
            _mostrarError('Tu cuenta está desactivada. Contacta al administrador.');
            if (onFail) onFail('desactivado');
            return;
          }
          _usuario = {
            uid:    user.uid,
            email:  user.email,
            nombre: data.nombre || user.displayName || user.email,
            rol:    data.rol    || 'Asesor',
            activo: data.activo !== false
          };
        } else {
          // Perfil no existe en Firestore — crear uno básico
          _usuario = {
            uid:    user.uid,
            email:  user.email,
            nombre: user.displayName || user.email,
            rol:    'Asesor',
            activo: true
          };
          // Crear documento en Firestore
          _db.collection('usuarios').doc(user.uid).set(_usuario, { merge: true })
            .catch(function(e) { console.warn('[AUTH] No se pudo crear perfil:', e); });
        }
        // Exponer sesión a app.js
        if (typeof setSesionActual === 'function') setSesionActual(_usuario);
        _actualizarUI();
        if (onOk) onOk(_usuario);
      })
      .catch(function(e) {
        console.error('[AUTH] Error cargando perfil:', e);
        // Modo degradado: sesión básica sin perfil Firestore
        _usuario = { uid: user.uid, email: user.email, nombre: user.email, rol: 'Asesor', activo: true };
        if (typeof setSesionActual === 'function') setSesionActual(_usuario);
        if (onOk) onOk(_usuario);
      });
  }

  /* ────────────────────────────────
     LOGIN CON EMAIL/CONTRASEÑA
  ──────────────────────────────── */
  function login(email, password, onOk, onError) {
    if (!_auth) { if (onError) onError('Firebase Auth no inicializado'); return; }
    _auth.signInWithEmailAndPassword(email, password)
      .then(function(cred) {
        // onAuthStateChanged manejará la sesión
        if (onOk) onOk(cred.user);
      })
      .catch(function(e) {
        var msg = _errorMsg(e.code);
        if (onError) onError(msg);
      });
  }

  /* ────────────────────────────────
     CERRAR SESIÓN
  ──────────────────────────────── */
  function logout() {
    if (!_auth) return;
    _auth.signOut()
      .then(function() {
        _usuario = null;
        if (typeof setSesionActual === 'function') setSesionActual(null);
        console.log('[AUTH] Sesión cerrada');
      })
      .catch(function(e) { console.warn('[AUTH] Error al cerrar sesión:', e); });
  }

  /* ────────────────────────────────
     RESTABLECER CONTRASEÑA
  ──────────────────────────────── */
  function resetPassword(email, onOk, onError) {
    if (!_auth) { if (onError) onError('Firebase Auth no inicializado'); return; }
    _auth.sendPasswordResetEmail(email)
      .then(function() { if (onOk) onOk(); })
      .catch(function(e) { if (onError) onError(_errorMsg(e.code)); });
  }

  /* ────────────────────────────────
     ACTUALIZAR UI TRAS LOGIN
  ──────────────────────────────── */
  function _actualizarUI() {
    if (!_usuario) return;
    var elNombre = document.getElementById('userNombreHeader');
    var elRol    = document.getElementById('userRolHeader');
    var elAvatar = document.getElementById('userAvatarHeader');
    if (elNombre) elNombre.textContent = _usuario.nombre;
    if (elRol)    elRol.textContent    = _usuario.rol;
    if (elAvatar) elAvatar.textContent = (_usuario.nombre || 'U').charAt(0).toUpperCase();
  }

  /* ────────────────────────────────
     MOSTRAR/OCULTAR OVERLAY LOGIN
  ──────────────────────────────── */
  function _mostrarLogin() {
    var overlay = document.getElementById('loginOverlay');
    var app     = document.getElementById('appMain');
    if (overlay) overlay.style.display = 'flex';
    if (app)     app.style.display     = 'none';
  }

  function ocultarLogin() {
    var overlay = document.getElementById('loginOverlay');
    var app     = document.getElementById('appMain');
    if (overlay) overlay.style.display = 'none';
    if (app)     app.style.display     = '';
  }

  function _mostrarError(msg) {
    var el = document.getElementById('loginError');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  }

  /* ────────────────────────────────
     ERRORES AMIGABLES
  ──────────────────────────────── */
  function _errorMsg(code) {
    var msgs = {
      'auth/user-not-found':        'No existe ningún usuario con ese correo.',
      'auth/wrong-password':        'Contraseña incorrecta. Intenta de nuevo.',
      'auth/invalid-email':         'El correo no tiene un formato válido.',
      'auth/user-disabled':         'Esta cuenta está desactivada.',
      'auth/too-many-requests':     'Demasiados intentos. Espera unos minutos.',
      'auth/network-request-failed':'Sin conexión a internet.',
      'auth/invalid-credential':    'Credenciales inválidas. Verifica correo y contraseña.'
    };
    return msgs[code] || 'Error de autenticación. Intenta de nuevo.';
  }

  /* ────────────────────────────────
     GETTERS PÚBLICOS
  ──────────────────────────────── */
  function getUsuario()  { return _usuario; }
  function getRol()      { return _usuario ? _usuario.rol : null; }
  function getNombre()   { return _usuario ? (_usuario.nombre || _usuario.email) : 'Empleado'; }
  function esAdmin()     { return _usuario && _usuario.rol === 'Administrador'; }
  function estaLogueado(){ return _usuario !== null; }

  return {
    init:           init,
    login:          login,
    logout:         logout,
    resetPassword:  resetPassword,
    ocultarLogin:   ocultarLogin,
    getUsuario:     getUsuario,
    getRol:         getRol,
    getNombre:      getNombre,
    esAdmin:        esAdmin,
    estaLogueado:   estaLogueado
  };
})();
