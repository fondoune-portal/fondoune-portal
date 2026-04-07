/* ════════════════════════════════════════════════════════
   SISTEMA DE AUTENTICACIÓN — FondoUne Portal Empleados
   ════════════════════════════════════════════════════════
   Para agregar/modificar usuarios: edita el objeto USUARIOS
   La contraseña se almacena como hash SHA-256
   ════════════════════════════════════════════════════════ */

/* ── Tabla de usuarios autorizados ──
   Para agregar un usuario nuevo, agrega una entrada:
   'nombreusuario': { hash: sha256('contraseña'), nombre: 'Nombre Completo', rol: 'Asesor' }
   
   Las contraseñas NO deben documentarse aquí. Guárdalas en un gestor de contraseñas.
   Para generar un nuevo hash: abre F12 → Consola y ejecuta:
   sha256('nueva_contraseña').then(h => console.log(h))
*/
var USUARIOS = {
  'admin':   { hash: 'e5dc2f73f21351f6eea4d250725e701fd5ba6f9442f964f3eb6f7db510186d0c', nombre: 'Administrador', rol: 'Administrador' },
  'asesor1': { hash: 'c07e647705fd1afdba00420755aeeb10e347e387ba17f3f463eaa3a5ddc32504', nombre: 'Asesor Créditos 1', rol: 'Asesor' },
  'asesor2': { hash: '52fb1bd7895fe2b4e69b2f93b28c9f77122d6c8c5ad1da6ce88bd4fec08910f2', nombre: 'Asesor Créditos 2', rol: 'Asesor' }
};

/* ── Configuración de seguridad ── */
var SEC = {
  MAX_INTENTOS: 5,       // Intentos antes del bloqueo
  BLOQUEO_MIN: 5,        // Minutos de bloqueo
  SESSION_HORAS: 8,      // Horas que dura la sesión
  SESS_KEY: 'fu_session',
  BLOCK_KEY: 'fu_block',
  FAIL_KEY: 'fu_fails'
};

var intentosFallidos = 0;
var blockInterval = null;
var passVisible = false;

/* ── Hash SHA-256 simple (para validación local) ── */
async function sha256(msg) {
  var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(buf)).map(function(b){ return b.toString(16).padStart(2,'0'); }).join('');
}

/* ── Verificar sesión activa ── */
function verificarSesion() {
  try {
    var sess = JSON.parse(localStorage.getItem(SEC.SESS_KEY) || 'null');
    if (!sess) return false;
    if (new Date().getTime() > sess.expira) {
      localStorage.removeItem(SEC.SESS_KEY);
      return false;
    }
    return sess;
  } catch(e) { return false; }
}

/* ── Guardar sesión ── */
function guardarSesion(usuario, datosUsuario) {
  var expira = new Date().getTime() + (SEC.SESSION_HORAS * 60 * 60 * 1000);
  var sess = { usuario: usuario, nombre: datosUsuario.nombre, rol: datosUsuario.rol, inicio: new Date().toISOString(), expira: expira };
  localStorage.setItem(SEC.SESS_KEY, JSON.stringify(sess));
  return sess;
}

/* ── Comprobar bloqueo ── */
function estaBlockeado() {
  try {
    var b = JSON.parse(localStorage.getItem(SEC.BLOCK_KEY) || 'null');
    if (!b) return false;
    if (new Date().getTime() > b.hasta) {
      localStorage.removeItem(SEC.BLOCK_KEY);
      intentosFallidos = 0;
      return false;
    }
    return b;
  } catch(e) { return false; }
}

/* ── Bloquear ── */
function bloquear() {
  var hasta = new Date().getTime() + (SEC.BLOQUEO_MIN * 60 * 1000);
  localStorage.setItem(SEC.BLOCK_KEY, JSON.stringify({ hasta: hasta }));
  iniciarCountdown(hasta);
}

/* ── Countdown timer ── */
function iniciarCountdown(hasta) {
  var blocked = document.getElementById('loginBlocked');
  var timer   = document.getElementById('blockTimer');
  var btn     = document.getElementById('loginBtn');
  var campos  = document.getElementById('loginUser');
  blocked.classList.add('show');
  btn.disabled = true;
  if (campos) campos.disabled = true;
  document.getElementById('loginPass').disabled = true;
  clearInterval(blockInterval);
  blockInterval = setInterval(function() {
    var resto = hasta - new Date().getTime();
    if (resto <= 0) {
      clearInterval(blockInterval);
      blocked.classList.remove('show');
      btn.disabled = false;
      document.getElementById('loginUser').disabled = false;
      document.getElementById('loginPass').disabled = false;
      intentosFallidos = 0;
      actualizarDots();
      localStorage.removeItem(SEC.BLOCK_KEY);
      return;
    }
    var min = Math.floor(resto / 60000);
    var seg = Math.floor((resto % 60000) / 1000);
    timer.textContent = String(min).padStart(2,'0') + ':' + String(seg).padStart(2,'0');
  }, 500);
}

/* ── Actualizar dots de intentos ── */
function actualizarDots() {
  for (var i = 1; i <= 5; i++) {
    var dot = document.getElementById('dot' + i);
    if (!dot) continue;
    dot.className = 'attempt-dot';
    if (i <= intentosFallidos) dot.classList.add('used');
  }
}

/* ── Mostrar error ── */
function mostrarError(msg) {
  var el = document.getElementById('loginError');
  document.getElementById('loginErrorMsg').textContent = msg;
  el.classList.remove('show');
  void el.offsetWidth; // reflow para reiniciar animación
  el.classList.add('show');
  ['loginUser','loginPass'].forEach(function(id){
    var inp = document.getElementById(id);
    if(inp){ inp.classList.add('error'); setTimeout(function(){ inp.classList.remove('error'); }, 600); }
  });
}

/* ── Toggle ver contraseña ── */
function togglePassVer() {
  passVisible = !passVisible;
  var inp = document.getElementById('loginPass');
  var ico = document.getElementById('eyeIcon');
  inp.type = passVisible ? 'text' : 'password';
  ico.innerHTML = passVisible
    ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>'
    : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
}

/* ── Enter en campos ── */
function loginKeydown(e) {
  if (e.key === 'Enter') intentarLogin();
}

/* ── INTENTO DE LOGIN ── */
function intentarLogin() {
  var bloqueo = estaBlockeado();
  if (bloqueo) { iniciarCountdown(bloqueo.hasta); return; }

  var usuario  = (document.getElementById('loginUser').value || '').trim().toLowerCase();
  var password = document.getElementById('loginPass').value || '';

  if (!usuario || !password) { mostrarError('Por favor ingresa usuario y contraseña.'); return; }

  // UI loading
  var btn = document.getElementById('loginBtn');
  var spinner = document.getElementById('loginSpinner');
  var btnTxt  = document.getElementById('loginBtnTxt');
  btn.disabled = true;
  spinner.style.display = 'block';
  btnTxt.textContent = 'Verificando…';

  // Hash de la contraseña ingresada y validar
  sha256(password).then(function(hashIngresado) {
    var datosUsuario = USUARIOS[usuario];
    var accesoCorrecto = datosUsuario && datosUsuario.hash === hashIngresado;

    // Simulamos un pequeño delay para evitar ataques de timing
    setTimeout(function() {
      if (accesoCorrecto) {
        loginExitoso(usuario, datosUsuario);
      } else {
        loginFallido(usuario);
        btn.disabled = false;
        spinner.style.display = 'none';
        btnTxt.textContent = '🔐 Ingresar al Portal';
      }
    }, 700);
  });
}

function loginExitoso(usuario, datosUsuario) {
  var sess = guardarSesion(usuario, datosUsuario);
  intentosFallidos = 0;
  localStorage.removeItem(SEC.BLOCK_KEY);
  actualizarDots();

  var overlay = document.getElementById('loginOverlay');
  overlay.style.transition = 'opacity .4s ease';
  overlay.style.opacity = '0';
  setTimeout(function() {
    overlay.classList.add('oculto');
    overlay.style.opacity = '';
    document.getElementById('sessionUser').textContent = '● ' + datosUsuario.nombre + ' (' + datosUsuario.rol + ')';
    document.getElementById('sessionBar').classList.add('show');
    actualizarNavAdmin();
    if (datosUsuario.rol === 'Administrador') renderUsrTable();
    registrarAudit('Inicio de sesión', { id: 'auth', radicado: 'LOGIN', nombreTitular: datosUsuario.nombre });
  }, 400);
}

function loginFallido(usuario) {
  intentosFallidos++;
  actualizarDots();
  var restantes = SEC.MAX_INTENTOS - intentosFallidos;
  if (intentosFallidos >= SEC.MAX_INTENTOS) {
    bloquear();
    mostrarError('Acceso bloqueado por ' + SEC.BLOQUEO_MIN + ' minutos.');
  } else {
    mostrarError('Credenciales incorrectas. Te quedan ' + restantes + ' intento' + (restantes !== 1 ? 's' : '') + '.');
  }
  document.getElementById('loginPass').value = '';
  document.getElementById('loginPass').focus();
}

/* ── CERRAR SESIÓN ── */
function cerrarSesion() {
  if (!confirm('¿Cerrar sesión? Serás redirigido a la pantalla de inicio.')) return;
  registrarAudit('Cierre de sesión', { id: 'auth', radicado: 'LOGOUT', nombreTitular: document.getElementById('sessionUser').textContent });
  localStorage.removeItem(SEC.SESS_KEY);
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  document.getElementById('loginError').classList.remove('show');
  intentosFallidos = 0;
  actualizarDots();
  // Resetear botón de login por si quedó en estado "Verificando…"
  var btn = document.getElementById('loginBtn');
  var spinner = document.getElementById('loginSpinner');
  var btnTxt = document.getElementById('loginBtnTxt');
  if (btn) btn.disabled = false;
  if (spinner) spinner.style.display = 'none';
  if (btnTxt) btnTxt.textContent = 'Ingresar al Portal';
  // Asegurarse que recoverOverlay también esté oculto
  var recOv = document.getElementById('recoverOverlay');
  recOv.classList.add('oculto');
  recOv.style.opacity = '';
  // Mostrar login con animación
  var overlay = document.getElementById('loginOverlay');
  overlay.classList.remove('oculto');
  overlay.style.opacity = '0';
  overlay.style.transition = 'opacity .35s ease';
  setTimeout(function() { overlay.style.opacity = '1'; }, 10);
  document.getElementById('loginUser').focus();
}

/* ── INIT SEGURIDAD — movido al final del script principal ── */

/* ═══════════════════════════════════════════════
   NOTA PARA EL ADMINISTRADOR — Cómo cambiar contraseñas
   ═══════════════════════════════════════════════
   Las contraseñas NO deben documentarse en el código fuente.
   Guárdalas en un gestor de contraseñas (Bitwarden, 1Password, etc.)
   
   Para cambiar una contraseña:
   1. Abre la consola del navegador (F12)
   2. Escribe: sha256('nueva_contraseña').then(h => console.log(h))
   3. Copia el hash resultante
   4. Reemplaza el valor en el objeto USUARIOS correspondiente
   ═══════════════════════════════════════════════ */
