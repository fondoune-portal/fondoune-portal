// ============================================================
//  FÉLIX IA — FondoUne Portal  (v2 — mejoras visuales)
// ============================================================

var FELIX_PROXY_URL = "https://script.google.com/macros/s/AKfycbwgDStwEkcC4i-OgTXMN5XCfHoM_M6_Lfr_03o_qs12lNLFYr5fmWYmnv2EHFrMSMne/exec";

// ── System Prompt (restringido a Créditos de Vivienda) ───────
var FELIX_SYSTEM_PROMPT =
  "Eres Félix, el asistente virtual oficial del Fondo de Empleados de UNE (Fondo UNE). " +
  "Tu especialidad es EXCLUSIVAMENTE créditos de vivienda. Solo puedes responder preguntas sobre: " +
  "créditos de vivienda VIS y NO VIS, leasing habitacional, tasas hipotecarias, plazos y cuotas, " +
  "subsidios de vivienda, requisitos y documentación para crédito de vivienda, tiempos del proceso " +
  "hipotecario y educación financiera relacionada con vivienda. " +
  "Si el asociado pregunta sobre cualquier otro tema (créditos de consumo, libre inversión, recreación, " +
  "seguros, auxilios, etc.), responde exactamente: 'Solo puedo orientarte sobre créditos de vivienda. " +
  "Para otros servicios de Fondo UNE, comunícate directamente con nuestro equipo.' " +
  "Lineamientos: responde siempre en español, con tono cálido, profesional y cercano. " +
  "Sé conciso pero completo. Si no tienes la información exacta, indícalo honestamente y sugiere " +
  "contactar al equipo de Fondo UNE. Nunca inventes datos financieros, tasas o montos específicos. " +
  "Empieza tus respuestas de forma directa, sin saludos repetitivos.";


// ── Inyecta estilos ──────────────────────────────────────────
(function injectStyles() {
  var css = `
    /* ── Entrada de cada mensaje ── */
    .fx-wrap {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      margin-bottom: 10px;
      animation: fxFadeUp .24s cubic-bezier(0.16,1,0.3,1);
    }
    @keyframes fxFadeUp {
      from { opacity:0; transform:translateY(8px) scale(0.97); }
      to   { opacity:1; transform:translateY(0)   scale(1);    }
    }
    .fx-wrap.user { flex-direction: row-reverse; }

    /* ── Avatar ── */
    .fx-avatar {
      width: 30px; height: 30px;
      border-radius: 50%;
      background: #E8511A;
      display: flex; align-items: center; justify-content: center;
      font-size: 15px; flex-shrink: 0;
    }

    /* ── Wrap burbuja + timestamp ── */
    .fx-bbl-wrap {
      display: flex;
      flex-direction: column;
      max-width: 78%;
    }
    .fx-wrap.user .fx-bbl-wrap { align-items: flex-end; }

    /* ── Burbuja ── */
    .fx-bubble {
      position: relative;
      padding: 10px 14px;
      border-radius: 16px;
      font-size: 13.5px;
      line-height: 1.6;
      word-break: break-word;
    }
    .fx-bubble strong { font-weight: 600; }
    .fx-bubble em     { font-style: italic; }
    .fx-bubble ul     { margin: 6px 0 2px 18px; }
    .fx-bubble li     { margin-bottom: 3px; }

    /* Félix — burbuja blanca + cola izquierda estilo WhatsApp */
    .fx-wrap.felix .fx-bubble {
      background: #fff;
      color: #2D1A0E;
      border: 1px solid rgba(232,81,26,0.15);
      border-bottom-left-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.07);
    }
    .fx-wrap.felix .fx-bubble::before {
      content: '';
      position: absolute;
      left: -8px; bottom: 0;
      width: 0; height: 0;
      border-style: solid;
      border-width: 0 0 10px 10px;
      border-color: transparent transparent #fff transparent;
      filter: drop-shadow(-1px 0 1px rgba(232,81,26,0.12));
    }

    /* Usuario — burbuja naranja + cola derecha estilo WhatsApp */
    .fx-wrap.user .fx-bubble {
      background: #E8511A;
      color: #fff;
      border-bottom-right-radius: 4px;
      box-shadow: 0 2px 8px rgba(232,81,26,0.25);
    }
    .fx-wrap.user .fx-bubble::after {
      content: '';
      position: absolute;
      right: -8px; bottom: 0;
      width: 0; height: 0;
      border-style: solid;
      border-width: 0 10px 10px 0;
      border-color: transparent #E8511A transparent transparent;
    }

    /* Error */
    .fx-wrap.felix.error .fx-bubble {
      background: #fff4f2;
      color: #c0392b;
      border-color: #f5c6c0;
    }
    .fx-wrap.felix.error .fx-bubble::before {
      border-color: transparent transparent #fff4f2 transparent;
    }

    /* ── Timestamp ── */
    .fx-ts {
      font-size: 10.5px;
      color: #9CA3AF;
      margin-top: 3px;
      padding: 0 4px;
    }
    .fx-wrap.user .fx-ts { text-align: right; }

    /* ── Typing indicator ── */
    .felix-typing {
      display: none;
      align-items: center;
      gap: 8px;
      padding: 0 0 10px 8px;
    }
    .felix-typing.visible { display: flex !important; }

    .felix-typing-bubble {
      background: #fff;
      border: 1px solid rgba(232,81,26,0.15);
      border-radius: 16px;
      border-bottom-left-radius: 4px;
      padding: 10px 16px;
      display: flex;
      flex-direction: column;
      gap: 5px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.07);
    }
    .felix-typing-dots {
      display: flex;
      align-items: center;
      gap: 5px;
      height: 20px;
    }
    .felix-dot {
      width: 7px; height: 7px;
      border-radius: 50%;
      background: #E8511A;
      animation: felixBounce 1.2s infinite ease-in-out;
      opacity: 0.6;
    }
    .felix-dot:nth-child(2) { animation-delay: 0.18s; }
    .felix-dot:nth-child(3) { animation-delay: 0.36s; }
    @keyframes felixBounce {
      0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
      40%            { transform: scale(1.1); opacity: 1; }
    }
    /* Texto de estado bajo los puntos */
    .felix-typing-label {
      font-size: 11px;
      color: #9CA3AF;
      white-space: nowrap;
    }

    /* ── Animación de apertura del panel ──────────────────────
       Agrega la clase "felix-panel" al div contenedor del chat
       en tu HTML y llama a felixTogglePanel('idDelPanel')      */
    .felix-panel {
      transform: translateY(16px) scale(0.97);
      opacity: 0;
      pointer-events: none;
      transition: transform 320ms cubic-bezier(0.16,1,0.3,1),
                  opacity   280ms cubic-bezier(0.16,1,0.3,1);
      transform-origin: bottom right;
    }
    .felix-panel.felix-panel--open {
      transform: translateY(0) scale(1);
      opacity: 1;
      pointer-events: all;
    }
  `;
  var style = document.createElement('style');
  style.id = 'felix-styles-v2';
  style.textContent = css;
  document.head.appendChild(style);
})();


// ── Estado ───────────────────────────────────────────────────
var felixHistory         = [];
var felixProcessing      = false;
var felixWelcomeMostrado = false;
var _felixAudioCtx       = null;


// ── Bienvenida ───────────────────────────────────────────────
function showFelixWelcome() {
  if (felixWelcomeMostrado) return;
  felixWelcomeMostrado = true;
  felixAppendMsg(
    '¡Hola! Soy <strong>Félix</strong>, tu asesor de <strong>crédito de vivienda</strong> en FondoUne. ' +
    'Puedo orientarte sobre financiación, tasas, subsidios y trámites. ' +
    '¿En qué puedo ayudarte hoy?',
    'felix'
  );
}


// ── Funciones globales del HTML ──────────────────────────────
function felixSend() {
  var input = document.getElementById('felixInput');
  if (!input) return;
  var texto = input.value.trim();
  if (!texto || felixProcessing) return;
  input.value = '';
  input.style.height = 'auto';
  felixEnviar(texto);
}

function felixKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    felixSend();
  }
}

function felixChipClick(texto) {
  felixEnviar(texto);
}


// ── Lógica de envío ──────────────────────────────────────────
function felixEnviar(texto) {
  if (!texto || felixProcessing) return;
  felixProcessing = true;
  felixSetUI(true);
  felixAppendMsg(texto, 'user');
  felixHistory.push({ role: 'user', parts: [{ text: texto }] });
  felixShowTyping(true);
  felixCallProxy(0);
}


// ── Proxy GAS con reintentos ─────────────────────────────────
function felixCallProxy(intento) {
  var MAX = 3, DELAY = 1500;
  var xhr = new XMLHttpRequest();
  var timedOut = false;

  var timer = setTimeout(function() {
    timedOut = true;
    xhr.abort();
    if (intento < MAX - 1) {
      setTimeout(function() { felixCallProxy(intento + 1); }, DELAY * (intento + 1));
    } else {
      felixShowTyping(false);
      felixAppendMsg('⚠️ La solicitud tardó demasiado. Intenta de nuevo en unos segundos.', 'error');
      felixHistory.pop();
      felixDone();
    }
  }, 25000);

  xhr.open('POST', FELIX_PROXY_URL, true);
  xhr.setRequestHeader('Content-Type', 'text/plain');  // evita preflight CORS

  xhr.onreadystatechange = function() {
    if (xhr.readyState !== 4) return;
    clearTimeout(timer);
    if (timedOut) return;

    if (xhr.status === 0) {
      if (intento < MAX - 1) {
        setTimeout(function() { felixCallProxy(intento + 1); }, DELAY * (intento + 1));
      } else {
        felixShowTyping(false);
        felixAppendMsg('⚠️ No se pudo conectar con el servidor. Verifica tu red o intenta más tarde.', 'error');
        felixHistory.pop();
        felixDone();
      }
      return;
    }

    felixShowTyping(false);

    try {
      var data = JSON.parse(xhr.responseText);

      if (data.error) {
        felixAppendMsg('⚠️ ' + data.error, 'error');
        felixHistory.pop();
        felixDone();
        return;
      }

      var candidato = data.candidates && data.candidates[0];
      if (!candidato) {
        felixAppendMsg('No pude generar una respuesta. Por favor intenta de nuevo.', 'error');
        felixHistory.pop();
        felixDone();
        return;
      }

      if (candidato.finishReason === 'SAFETY') {
        var safe = 'Lo siento, no puedo responder esa consulta. ¿Te ayudo con algo de crédito de vivienda?';
        felixAppendMsg(safe, 'felix');
        felixHistory.push({ role: 'model', parts: [{ text: safe }] });
        felixDone();
        return;
      }

      var respTxt = candidato.content && candidato.content.parts &&
                    candidato.content.parts[0] && candidato.content.parts[0].text;
      if (!respTxt) {
        felixAppendMsg('No pude obtener respuesta. Intenta de nuevo.', 'error');
        felixHistory.pop();
        felixDone();
        return;
      }

      respTxt = respTxt.trim();
      felixAppendMsg(respTxt, 'felix');
      felixHistory.push({ role: 'model', parts: [{ text: respTxt }] });
      felixDone();

    } catch(e) {
      felixAppendMsg('⚠️ Error procesando la respuesta. Intenta de nuevo.', 'error');
      felixHistory.pop();
      felixDone();
    }
  };

  xhr.send(JSON.stringify({
    system_instruction: { parts: [{ text: FELIX_SYSTEM_PROMPT }] },
    contents: felixHistory,
    generationConfig: {
      maxOutputTokens: 1024,
      temperature: 0.7
    }
  }));
}


// ── Agrega burbuja + timestamp ───────────────────────────────
function felixAppendMsg(html, tipo) {
  var container = document.getElementById('felixMessages');
  if (!container) return;

  var wrap = document.createElement('div');
  wrap.className = 'fx-wrap ' + (tipo === 'user' ? 'user' : 'felix') +
                   (tipo === 'error' ? ' error' : '');

  // Avatar (solo mensajes de Félix — sin cambios al emoji actual)
  if (tipo !== 'user') {
    var av = document.createElement('div');
    av.className = 'fx-avatar';
    av.textContent = '🤖';
    wrap.appendChild(av);
  }

  // Wrap interno: burbuja + timestamp
  var bblWrap = document.createElement('div');
  bblWrap.className = 'fx-bbl-wrap';

  var bubble = document.createElement('div');
  bubble.className = 'fx-bubble';
  bubble.innerHTML = felixFmt(html);
  bblWrap.appendChild(bubble);

  // Timestamp
  var ts = document.createElement('div');
  ts.className = 'fx-ts';
  ts.textContent = felixNowTime();
  bblWrap.appendChild(ts);

  wrap.appendChild(bblWrap);
  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;

  // Sonido ping al recibir respuesta de Félix
  if (tipo === 'felix') felixPlayPing();
}


// ── Typing indicator ─────────────────────────────────────────
function felixShowTyping(show) {
  var el = document.getElementById('felixTyping');
  if (!el) return;

  if (show) {
    // Inyecta el texto de estado la primera vez
    var bubble = el.querySelector('.felix-typing-bubble');
    if (bubble && !bubble.querySelector('.felix-typing-label')) {
      // Envuelve los dots en .felix-typing-dots si aún no existe
      if (!bubble.querySelector('.felix-typing-dots')) {
        var dotsWrap = document.createElement('div');
        dotsWrap.className = 'felix-typing-dots';
        var dots = bubble.querySelectorAll('.felix-dot');
        dots.forEach(function(d) { dotsWrap.appendChild(d); });
        bubble.insertBefore(dotsWrap, bubble.firstChild);
      }
      var label = document.createElement('span');
      label.className = 'felix-typing-label';
      label.textContent = 'Félix está buscando la mejor respuesta\u2026';
      bubble.appendChild(label);
    }
    el.classList.add('visible');
  } else {
    el.classList.remove('visible');
  }

  var c = document.getElementById('felixMessages');
  if (c) c.scrollTop = c.scrollHeight;
}


// ── Animación de apertura del panel (opcional) ───────────────
// Agrega class="felix-panel" al div del chat en tu HTML y
// llama a felixTogglePanel('idDeTuPanel') en el botón de apertura.
// Si ya manejas la visibilidad del panel con otro mecanismo,
// solo agrega/quita la clase felix-panel--open manualmente.
function felixTogglePanel(panelId) {
  var panel = document.getElementById(panelId);
  if (!panel) return;
  var abriendo = panel.classList.toggle('felix-panel--open');
  if (abriendo) {
    showFelixWelcome();
    setTimeout(function() {
      var inp = document.getElementById('felixInput');
      if (inp) inp.focus();
    }, 340);
  }
}


// ── Sonido ping suave (Web Audio API) ────────────────────────
function felixPlayPing() {
  try {
    if (!_felixAudioCtx) {
      _felixAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    var ctx  = _felixAudioCtx;
    var osc  = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch(e) { /* no disponible en algunos contextos — silencioso */ }
}


// ── Hora actual formateada ───────────────────────────────────
function felixNowTime() {
  return new Date().toLocaleTimeString('es-CO', {
    hour: '2-digit', minute: '2-digit', hour12: true
  });
}


// ── UI helpers ───────────────────────────────────────────────
function felixSetUI(disabled) {
  var btn = document.getElementById('felixSendBtn');
  var inp = document.getElementById('felixInput');
  if (btn) btn.disabled = disabled;
  if (inp) inp.disabled = disabled;
}

function felixDone() {
  felixProcessing = false;
  felixSetUI(false);
  var inp = document.getElementById('felixInput');
  if (inp) { inp.disabled = false; inp.focus(); }
}


// ── Formato markdown básico ──────────────────────────────────
function felixFmt(t) {
  if (!/<[a-z][\s\S]*>/i.test(t)) {
    t = t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  return t
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g,     '<em>$1</em>')
    .replace(/\n/g,            '<br>');
}


// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  felixShowTyping(false);
  var inp = document.getElementById('felixInput');
  if (!inp) return;
  inp.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  });
});