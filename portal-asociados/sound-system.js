/* ═══════════════════════════════════════════════════════════
   MÓDULO DE SONIDOS FONDOUNE — Web Audio API
   Estilo: Moderno / iOS·Material Design
   Sin archivos externos. Generación matemática de tonos.
   Con botón mute persistido en localStorage.
═══════════════════════════════════════════════════════════ */
(function() {
  'use strict';

  var MUTE_KEY = 'fu_sound_muted';
  var _ctx     = null;   // AudioContext (lazy init)
  var _muted   = false;

  /* ── Inicializar AudioContext (requiere gesto del usuario) ── */
  function getCtx() {
    if (_ctx) return _ctx;
    try {
      _ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e) { _ctx = null; }
    return _ctx;
  }

  /* ── Cargar preferencia de mute ── */
  try { _muted = localStorage.getItem(MUTE_KEY) === '1'; } catch(e) {}

  /* ── Núcleo: reproducir tono ──
     freq: Hz | type: sine/square/sawtooth/triangle
     vol: 0-1 | attack: s | decay: s | start: s (delay)
  ── */
  function tone(freq, type, vol, attack, decay, startDelay) {
    var ctx = getCtx();
    if (!ctx || _muted) return;
    try {
      var t   = ctx.currentTime + (startDelay || 0);
      var osc = ctx.createOscillator();
      var gain= ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type      = type || 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol || 0.18, t + (attack || 0.01));
      gain.gain.exponentialRampToValueAtTime(0.0001, t + (attack || 0.01) + (decay || 0.18));

      osc.start(t);
      osc.stop(t + (attack || 0.01) + (decay || 0.18) + 0.05);
    } catch(e) {}
  }

  /* ═══ SONIDOS DEFINIDOS ═══ */

  /* SUCCESS — dos notas ascendentes suaves (iOS confirm style) */
  function playSuccess() {
    tone(659, 'sine', 0.42, 0.008, 0.22, 0.00);  // E5
    tone(880, 'sine', 0.38, 0.008, 0.28, 0.10);  // A5
  }

  /* ERROR — tono descendente breve (Material error) */
  function playError() {
    tone(330, 'sine', 0.42, 0.008, 0.18, 0.00);  // E4
    tone(220, 'sine', 0.34, 0.008, 0.22, 0.07);  // A3
  }

  /* FELIX_MSG — pop suave cuando Félix responde */
  function playFelixMsg() {
    tone(880, 'sine',   0.12, 0.003, 0.08, 0.00);
    tone(1100,'sine',   0.09, 0.003, 0.10, 0.04);
  }

  /* CLICK — tap material (botones primarios) */
  function playClick() {
    tone(440, 'sine', 0.28, 0.004, 0.12, 0.00);
  }

  /* NOTIFICATION — ping amistoso (nueva solicitud, estado cambiado) */
  function playNotif() {
    tone(523,  'sine', 0.38, 0.008, 0.18, 0.00);  // C5
    tone(659,  'sine', 0.34, 0.008, 0.20, 0.10);  // E5
    tone(784,  'sine', 0.28, 0.008, 0.26, 0.20);  // G5
  }

  /* SEND — whoosh corto al enviar mensaje a Félix */
  function playSend() {
    var ctx = getCtx();
    if (!ctx || _muted) return;
    try {
      var t   = ctx.currentTime;
      var osc = ctx.createOscillator();
      var gain= ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(800, t + 0.12);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.28, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      osc.start(t); osc.stop(t + 0.18);
    } catch(e) {}
  }

  /* TOGGLE MUTE */
  function toggleMute() {
    _muted = !_muted;
    try { localStorage.setItem(MUTE_KEY, _muted ? '1' : '0'); } catch(e) {}
    updateMuteBtn();
    if (!_muted) playClick(); // feedback al activar
    return _muted;
  }

  function isMuted() { return _muted; }

  /* ── Actualizar ícono del botón mute ── */
  function updateMuteBtn() {
    var btn = document.getElementById('fuSoundBtn');
    if (btn) {
      btn.textContent = _muted ? '🔇' : '🔊';
      btn.title = _muted ? 'Activar sonidos' : 'Silenciar sonidos';
    }
  }

  /* ── Crear botón mute en el topbar ── */
  function initMuteBtn() {
    var topbar = document.querySelector('.topbar');
    if (!topbar || document.getElementById('fuSoundBtn')) return;

    var btn = document.createElement('button');
    btn.id        = 'fuSoundBtn';
    btn.textContent = _muted ? '🔇' : '🔊';
    btn.title     = _muted ? 'Activar sonidos' : 'Silenciar sonidos';
    btn.style.cssText = [
      'background:rgba(255,255,255,.07)',
      'border:1px solid rgba(255,255,255,.1)',
      'border-radius:7px',
      'color:rgba(255,255,255,.7)',
      'cursor:pointer',
      'font-size:15px',
      'height:32px',
      'width:32px',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'transition:background .2s',
      'flex-shrink:0',
      '-webkit-tap-highlight-color:transparent',
      'touch-action:manipulation'
    ].join(';');

    btn.addEventListener('click', function() { toggleMute(); });
    btn.addEventListener('mouseenter', function() {
      btn.style.background = 'rgba(255,255,255,.14)';
    });
    btn.addEventListener('mouseleave', function() {
      btn.style.background = 'rgba(255,255,255,.07)';
    });

    // Insertar antes del último elemento del topbar
    topbar.appendChild(btn);
  }

  /* ── Inicializar: botón + desbloquear AudioContext en primer toque ── */
  document.addEventListener('DOMContentLoaded', function() {
    initMuteBtn();
  });

  // Safari iOS requiere desbloquear AudioContext con gesto del usuario
  function unlock() {
    var ctx = getCtx();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
    document.removeEventListener('touchstart', unlock);
    document.removeEventListener('click', unlock);
  }
  document.addEventListener('touchstart', unlock, { passive: true });
  document.addEventListener('click', unlock, { once: true });

  /* ── API PÚBLICA ── */
  window.FU_Sound = {
    success:  playSuccess,
    error:    playError,
    felixMsg: playFelixMsg,
    click:    playClick,
    notif:    playNotif,
    send:     playSend,
    mute:     toggleMute,
    isMuted:  isMuted
  };

})();
