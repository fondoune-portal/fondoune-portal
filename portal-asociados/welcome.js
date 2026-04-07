(function() {
  'use strict';

  var STORAGE_KEY = 'fu_asociado_nombre_v1';
  var GREETINGS   = ['¡Hola,', '¡Bienvenido,', '¡Qué gusto verte,', '¡Buenas,'];
  var _greetIdx   = Math.floor(Math.random() * GREETINGS.length);

  var screen  = document.getElementById('fu-welcome');
  var input   = document.getElementById('fu-w-name-input');
  var greeting= document.getElementById('fu-w-greeting');
  var btn     = document.getElementById('fu-w-enter-btn');

  /* ── Exponer función global para cerrar sesión (DEBE estar antes del early return) ── */
  window.FU_CerrarSesionNombre = function() {
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  };

  /* ── Si ya pasó por aquí antes, saltar directo ── */
  var savedName = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
  if (savedName) {
    window.FU_AsociadoNombre = savedName;
    screen.style.display = 'none';
    _injectNameInPortal(savedName);
    return;
  }

/* ── Mostrar saludo dinámico mientras escribe (debounce 200ms → mejora INP) ── */
  function debounce(fn, delay) {
    var timer;
    return function() { clearTimeout(timer); timer = setTimeout(fn, delay); };
  }
  input.addEventListener('input', debounce(function() {
    var val = input.value.trim();
    var firstName = val.split(' ')[0];
    if (firstName.length >= 2) {
      greeting.textContent = GREETINGS[_greetIdx] + ' ' + capitalize(firstName) + '! 👋';
      greeting.classList.add('show');
    } else {
      greeting.classList.remove('show');
    }
  }, 200));

  /* ── Enter para ingresar ── */
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); _ingresar(); }
  });

  btn.addEventListener('click', function() { _ingresar(); });

  /* ── Enfocar el input al cargar ── */
  setTimeout(function() { if (input) input.focus(); }, 750);

  /* ── Función principal: validar y entrar ── */
  function _ingresar() {
    var nombre = input.value.trim();
    if (!nombre || nombre.length < 2) {
      input.classList.remove('shake');
      void input.offsetWidth; // reflow para reiniciar animación
      input.classList.add('shake');
      input.focus();
      return;
    }

    /* Guardar nombre (sesión + localStorage para recordar) */
    var nombreFormateado = formatearNombre(nombre);
    sessionStorage.setItem(STORAGE_KEY, nombreFormateado);
    localStorage.setItem(STORAGE_KEY, nombreFormateado);
    window.FU_AsociadoNombre = nombreFormateado;

    /* Animar salida */
    screen.classList.add('exiting');
    setTimeout(function() {
      screen.style.display = 'none';
      _injectNameInPortal(nombreFormateado);
    }, 580);
  }

  /* ── Inyectar nombre en el hero del portal ── */
  function _injectNameInPortal(nombre) {
    /* Esperar a que el DOM esté listo */
    function tryInject() {
      var heroH1 = document.querySelector('.hero h1');
      if (heroH1) {
        var primerNombre = nombre.split(' ')[0];
        /* Añadir saludo personal al inicio del h1 */
        var eyebrow = document.querySelector('.hero-eyebrow');
        if (eyebrow && !eyebrow.dataset.personalizado) {
          eyebrow.dataset.personalizado = '1';
          /* Actualizar el eyebrow chip con el nombre */
          eyebrow.innerHTML = '📄 <span>Hola, <strong>' + primerNombre + '</strong> — Tu portal de desembolso de crédito</span>';
        }
        /* Personalizar el h1 si tiene la clase .hi */
        var hiSpan = heroH1.querySelector('.hi');
        if (hiSpan && !hiSpan.dataset.personalizado) {
          hiSpan.dataset.personalizado = '1';
          /* Guardar texto original y añadir nombre */
          var originalText = heroH1.innerHTML;
          if (!originalText.includes(primerNombre)) {
            heroH1.innerHTML = '¡Hola, <span class="hi">' + primerNombre + '</span>!<br>' +
              '<span style="font-size:0.72em;font-weight:600;opacity:0.85">Tu checklist de desembolso</span>';
          }
        }
      }
      /* Actualizar la bienvenida de Félix si ya está inicializado */
      if (window.showFelixWelcome) {
        window._fu_welcomeNombre = nombre.split(' ')[0];
      }
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', tryInject);
    } else {
      setTimeout(tryInject, 100);
    }
  }

  /* ── Utilidades ── */
  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  }
  function formatearNombre(s) {
    return s.replace(/\w\S*/g, function(w) {
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    });
  }

})();
