/* ═══════════════════════════════════════════════════════════════
   SISTEMA DE SONIDOS PREMIUM — FondoUne Portal Empleados v2
   Sonidos de UI modernos inspirados en macOS / iOS / Notion
   Técnicas: filtros paso-bajo, envolventes suaves, ruido filtrado,
   acordes sutiles y modulación de frecuencia (FM) ligera.
═══════════════════════════════════════════════════════════════ */
(function() {
  'use strict';

  var SoundSystem = {
    enabled: true,
    masterVol: 0.18,   // Volumen master bajo — discreto en entorno laboral
    _ctx: null,

    /* ── Obtener (o crear) AudioContext ── */
    /* CORRECCIÓN: el AudioContext solo se crea tras un gesto del usuario
       para cumplir la política de autoplay de los navegadores modernos.
       Si aún no hubo interacción, _ctxReady es false y el sonido se omite. */
    _ctxReady: false,
    ctx: function() {
      if (!this._ctxReady) return null;   // Esperar gesto del usuario
      if (!this._ctx) {
        try {
          var AC = window.AudioContext || window.webkitAudioContext;
          this._ctx = new AC();
        } catch(e) {
          this.enabled = false;
        }
      }
      if (this._ctx && this._ctx.state === 'suspended') this._ctx.resume();
      return this._ctx;
    },

    /* ── Nodo de ganancia master ── */
    _master: null,
    master: function() {
      var c = this.ctx(); if (!c) return null;
      if (!this._master) {
        this._master = c.createGain();
        this._master.gain.value = this.masterVol;
        this._master.connect(c.destination);
      }
      return this._master;
    },

    /* ── Primitiva: tono suave con envolvente exponencial ──
       freq      : Hz
       duration  : segundos
       type      : 'sine' | 'triangle'
       gainPeak  : amplitud relativa (0-1)
       startAt   : tiempo absoluto en ctx
       filterFreq: frecuencia de corte paso-bajo (suaviza armónicos)
    */
    _tone: function(freq, duration, type, gainPeak, startAt, filterFreq) {
      var c = this.ctx(), m = this.master(); if (!c || !m) return;
      type = type || 'sine';
      gainPeak = gainPeak || 1;
      filterFreq = filterFreq || 4000;

      var osc  = c.createOscillator();
      var filt = c.createBiquadFilter();
      var gain = c.createGain();

      osc.type = type;
      osc.frequency.value = freq;

      filt.type = 'lowpass';
      filt.frequency.value = filterFreq;
      filt.Q.value = 0.7;

      var t  = startAt;
      var at = Math.min(0.008, duration * 0.05);   // attack muy corto
      var rt = duration * 0.55;                     // release largo = suave

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(gainPeak, t + at);
      gain.gain.setValueAtTime(gainPeak, t + duration - rt);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

      osc.connect(filt);
      filt.connect(gain);
      gain.connect(m);
      osc.start(t);
      osc.stop(t + duration + 0.01);
    },

    /* ── Primitiva: click de UI (ruido blanco filtrado muy breve) ── */
    _click: function(startAt, filterFreq, duration) {
      var c = this.ctx(), m = this.master(); if (!c || !m) return;
      filterFreq = filterFreq || 3200;
      duration   = duration   || 0.022;

      var buf  = c.createBuffer(1, Math.ceil(c.sampleRate * duration), c.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);

      var src  = c.createBufferSource();
      var filt = c.createBiquadFilter();
      var gain = c.createGain();

      src.buffer = buf;
      filt.type  = 'bandpass';
      filt.frequency.value = filterFreq;
      filt.Q.value = 1.2;

      var t = startAt;
      gain.gain.setValueAtTime(0.6, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

      src.connect(filt); filt.connect(gain); gain.connect(m);
      src.start(t); src.stop(t + duration + 0.005);
    },

    /* ════════════════════════════════════════════
       CATÁLOGO DE SONIDOS
       ════════════════════════════════════════════ */
    play: function(name) {
      if (!this.enabled) return;
      var c = this.ctx(); if (!c) return;
      var t = c.currentTime + 0.01; // ligero offset para evitar glitches
      var s = this;

      try {
        switch(name) {

          /* ── Félix abre — acorde ascendente cálido (do-mi-sol) ── */
          case 'felixOpen':
            s._tone(523.25, 0.18, 'sine',     1,    t,        3500);
            s._tone(659.25, 0.18, 'sine',     0.75, t+0.05,   3500);
            s._tone(783.99, 0.22, 'sine',     0.6,  t+0.10,   3500);
            break;

          /* ── Félix cierra — acorde descendente suave ── */
          case 'felixClose':
            s._tone(783.99, 0.16, 'sine',     0.6,  t,        3200);
            s._tone(659.25, 0.16, 'sine',     0.5,  t+0.045,  3200);
            s._tone(523.25, 0.20, 'sine',     0.4,  t+0.09,   3200);
            break;

          /* ── Enviar mensaje — dos tonos rápidos ascendentes ── */
          case 'felixSend':
            s._click(t,        3800, 0.018);
            s._tone(880,  0.10, 'sine', 0.55, t,        3800);
            s._tone(1108, 0.12, 'sine', 0.40, t+0.055,  3800);
            break;

          /* ── Recibir respuesta — campana suave triple ── */
          case 'felixReceive':
            s._tone(1046.5, 0.22, 'sine', 0.50, t,        2800);
            s._tone(1318.5, 0.20, 'sine', 0.38, t+0.07,   2800);
            s._tone(1567.9, 0.26, 'sine', 0.28, t+0.14,   2800);
            break;

          /* ── Click de UI — muy sutil, como botón premium ── */
          case 'click':
            s._click(t, 2800, 0.016);
            s._tone(680, 0.045, 'sine', 0.30, t, 3000);
            break;

          /* ── Éxito — acorde mayor brillante ── */
          case 'success':
            s._tone(659.25, 0.20, 'sine', 0.70, t,       4000);
            s._tone(830.61, 0.20, 'sine', 0.55, t+0.03,  4000);
            s._tone(987.77, 0.26, 'sine', 0.40, t+0.09,  4000);
            break;

          /* ── Error — dos tonos descendentes suaves ── */
          case 'error':
            s._tone(440, 0.18, 'triangle', 0.55, t,      2200);
            s._tone(349, 0.24, 'triangle', 0.40, t+0.10, 2200);
            break;

          /* ── Notificación — ping limpio de dos notas ── */
          case 'notification':
            s._tone(1174.66, 0.18, 'sine', 0.50, t,      3500);
            s._tone(1396.91, 0.22, 'sine', 0.38, t+0.08, 3500);
            break;

          /* ── Cambio de estado — tono único suave con vibrato mínimo ── */
          case 'stateChange':
            s._tone(740, 0.22, 'sine', 0.45, t,      3200);
            s._tone(932, 0.18, 'sine', 0.30, t+0.08, 3200);
            break;

          /* ── Descarga — cascada rápida ascendente ── */
          case 'download':
            s._tone(523,  0.08, 'sine', 0.40, t,       3500);
            s._tone(659,  0.08, 'sine', 0.38, t+0.055, 3500);
            s._tone(784,  0.08, 'sine', 0.35, t+0.110, 3500);
            s._tone(1046, 0.14, 'sine', 0.30, t+0.165, 3500);
            break;

          /* ── Carga/subida — tres notas con clic inicial ── */
          case 'upload':
            s._click(t, 4000, 0.014);
            s._tone(698,  0.10, 'sine', 0.42, t,       3800);
            s._tone(880,  0.10, 'sine', 0.35, t+0.07,  3800);
            s._tone(1047, 0.16, 'sine', 0.28, t+0.14,  3800);
            break;

          default:
            console.warn('[Sound] Sonido no definido:', name);
        }
      } catch(e) {
        console.warn('[Sound] Error al reproducir:', name, e);
      }
    },

    /* ── Toggle sonidos ── */
    toggle: function() {
      this.enabled = !this.enabled;
      localStorage.setItem('fu_sounds_enabled', this.enabled);
      if (this.enabled) this.play('notification');
      return this.enabled;
    },

    /* ── Inicializar desde localStorage ── */
    init: function() {
      var saved = localStorage.getItem('fu_sounds_enabled');
      if (saved !== null) this.enabled = (saved === 'true');
      console.log('[Sound] Sistema Premium v2 —', this.enabled ? 'Activado' : 'Desactivado');
    }
  };

  window.FU_Sound = SoundSystem;
  SoundSystem.init();

  // Reanudar/crear contexto al primer clic (política de navegadores modernos)
  document.addEventListener('click', function() {
    SoundSystem._ctxReady = true;   // Habilitar creación del AudioContext
    if (SoundSystem._ctx && SoundSystem._ctx.state === 'suspended') {
      SoundSystem._ctx.resume();
    }
  }, { once: true });

})();
