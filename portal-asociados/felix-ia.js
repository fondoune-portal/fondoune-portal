// ============================================================
//  FÉLIX IA — FondoUne Portal | Visual upgrade completo
// ============================================================

var FELIX_PROXY_URL = "https://script.google.com/macros/s/AKfycbwgDStwEkcC4i-OgTXMN5XCfHoM_M6_Lfr_03o_qs12lNLFYr5fmWYmnv2EHFrMSMne/exec";

var FELIX_SYSTEM_PROMPT =
  "Eres Félix, el asistente virtual especializado en Créditos de Vivienda del Fondo de Empleados de UNE (FondoUne). " +
  "Tu ÚNICO tema es el crédito de vivienda de FondoUne: requisitos, documentos para solicitud y desembolso, " +
  "tipos de crédito (compra, construcción, remodelación, libre inversión con garantía hipotecaria), " +
  "tiempos del proceso, condiciones generales y orientación sobre trámites. " +
  "REGLAS ESTRICTAS: " +
  "1. Si el asociado pregunta sobre cualquier tema que NO sea crédito de vivienda de FondoUne, responde amablemente: " +
  "'Estoy especializado únicamente en créditos de vivienda de FondoUne. Para otras consultas, comunícate con nuestro equipo directamente.' " +
  "No te disculpes en exceso ni des más explicaciones. " +
  "2. Nunca inventes tasas de interés, montos, plazos ni valores específicos que no conozcas con certeza. " +
  "Si no tienes el dato exacto, di que el equipo de FondoUne puede confirmarlo. " +
  "3. Responde en español, con tono cálido, profesional y cercano. " +
  "4. Sé conciso: máximo 3 párrafos o una lista corta. " +
  "5. Empieza directo, sin repetir saludos en cada mensaje.";

// Preguntas rápidas iniciales
var FELIX_CHIPS = [
  "¿Qué documentos necesito?",
  "¿Cuánto tiempo tarda el desembolso?",
  "¿Cuáles son los tipos de crédito?"
];

// ── Estilos ──────────────────────────────────────────────────
(function injectStyles() {
  var css = `
    /* ── Burbujas ── */
    .fx-wrap {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      margin-bottom: 14px;
      animation: fxFadeUp .25s ease;
    }
    @keyframes fxFadeUp {
      from { opacity:0; transform:translateY(10px); }
      to   { opacity:1; transform:translateY(0); }
    }
    .fx-wrap.user { flex-direction: row-reverse; }

    /* Avatar de Félix */
    .fx-avatar {
      width: 32px; height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, #E8511A, #ff7043);
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; flex-shrink: 0;
      box-shadow: 0 2px 6px rgba(232,81,26,0.35);
    }

    /* Burbuja base */
    .fx-bubble-wrap { display: flex; flex-direction: column; max-width: 78%; }
    .fx-wrap.user .fx-bubble-wrap { align-items: flex-end; }

    .fx-bubble {
      padding: 11px 15px;
      border-radius: 18px;
      font-size: 13.5px;
      line-height: 1.65;
      word-break: break-word;
    }
    .fx-bubble strong { font-weight: 600; }
    .fx-bubble em     { font-style: italic; }
    .fx-bubble ul     { margin: 6px 0 2px 18px; }
    .fx-bubble li     { margin-bottom: 4px; }

    /* Félix */
    .fx-wrap.felix .fx-bubble {
      background: #fff;
      color: #2D1A0E;
      border: 1px solid rgba(232,81,26,0.12);
      border-bottom-left-radius: 4px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.07);
    }
    /* Usuario */
    .fx-wrap.user .fx-bubble {
      background: linear-gradient(135deg, #E8511A, #ff6b35);
      color: #fff;
      border-bottom-right-radius: 4px;
      box-shadow: 0 3px 12px rgba(232,81,26,0.3);
    }
    /* Error */
    .fx-wrap.felix.error .fx-bubble {
      background: #fff4f2;
      color: #c0392b;
      border-color: #f5c6c0;
    }

    /* ── Timestamp ── */
    .fx-time {
      font-size: 10.5px;
      color: #aaa;
      margin-top: 4px;
      padding: 0 4px;
    }
    .fx-wrap.user .fx-time { text-align: right; }

    /* ── Check de entregado (usuario) ── */
    .fx-check {
      font-size: 11px;
      color: rgba(255,255,255,0.75);
      margin-top: 3px;
      text-align: right;
      padding-right: 2px;
      display: none;
    }
    .fx-check.visible { display: block; }

    /* ── Chips de acceso rápido ── */
    .fx-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      padding: 4px 0 12px 40px;
      animation: fxFadeUp .3s ease .1s both;
    }
    .fx-chip {
      background: #fff;
      border: 1.5px solid #E8511A;
      color: #E8511A;
      border-radius: 20px;
      padding: 6px 13px;
      font-size: 12.5px;
      font-family: inherit;
      cursor: pointer;
      transition: all .15s ease;
      white-space: nowrap;
    }
    .fx-chip:hover {
      background: #E8511A;
      color: #fff;
      transform: translateY(-1px);
      box-shadow: 0 3px 10px rgba(232,81,26,0.3);
    }

    /* ── Typing indicator ── */
    .felix-typing {
      display: none;
      align-items: center;
      gap: 8px;
      padding: 0 0 10px 8px;
    }
    .felix-typing.visible { display: flex !important; }

    .felix-typing-inner {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .felix-typing-bubble {
      background: #fff;
      border: 1px solid rgba(232,81,26,0.15);
      border-radius: 18px;
      border-bottom-left-radius: 4px;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      gap: 5px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.07);
    }
    .felix-typing-label {
      font-size: 11px;
      color: #aaa;
      padding-left: 4px;
      font-style: italic;
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
  `;
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
})();

// ── Estado ───────────────────────────────────────────────────
var felixHistory       = [];
var felixProcessing    = false;
var felixWelcomeMostrado = false;
var felixLastUserWrap  = null; // referencia para poner el check

// ── Bienvenida + chips ───────────────────────────────────────
function showFelixWelcome() {
  if (felixWelcomeMostrado) return;
  felixWelcomeMostrado = true;

  felixAppendMsg(
    '¡Hola! Soy <strong>Félix</strong>, tu asistente especializado en ' +
    '<strong>Créditos de Vivienda</strong> de FondoUne. ¿En qué puedo ayudarte hoy?',
    'felix'
  );

  // Chips de acceso rápido
  var container = document.getElementById('felixMessages');
  if (!container) return;

  var chipsRow = document.createElement('div');
  chipsRow.className = 'fx-chips';
  chipsRow.id = 'felixChipsRow';

  FELIX_CHIPS.forEach(function(texto) {
    var btn = document.createElement('button');
    btn.className = 'fx-chip';
    btn.textContent = texto;
    btn.onclick = function() {
      // Oculta chips al usar uno
      var row = document.getElementById('felixChipsRow');
      if (row) row.style.display = 'none';
      felixEnviar(texto);
    };
    chipsRow.appendChild(btn);
  });

  container.appendChild(chipsRow);
  container.scrollTop = container.scrollHeight;
}

// ── Funciones globales del HTML ──────────────────────────────
function felixSend() {
  var input = document.getElementById('felixInput');
  if (!input) return;
  var texto = input.value.trim();
  if (!texto || felixProcessing) return;
  input.value = '';
  input.style.height = 'auto';
  // Oculta chips al escribir manualmente
  var row = document.getElementById('felixChipsRow');
  if (row) row.style.display = 'none';
  felixEnviar(texto);
}

function felixKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    felixSend();
  }
}

function felixChipClick(texto) {
  var row = document.getElementById('felixChipsRow');
  if (row) row.style.display = 'none';
  felixEnviar(texto);
}

// ── Lógica de envío ──────────────────────────────────────────
function felixEnviar(texto) {
  if (!texto || felixProcessing) return;
  felixProcessing = true;
  felixSetUI(true);
  felixLastUserWrap = felixAppendMsg(texto, 'user');
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
  xhr.setRequestHeader('Content-Type', 'text/plain');

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

      // Muestra check ✓✓ en el mensaje del usuario al recibir respuesta
      felixMarkDelivered();

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
    generationConfig: { maxOutputTokens: 1024, temperature: 0.7 }
  }));
}

// ── Agrega burbuja con timestamp ─────────────────────────────
function felixAppendMsg(html, tipo) {
  var container = document.getElementById('felixMessages');
  if (!container) return null;

  var wrap = document.createElement('div');
  wrap.className = 'fx-wrap ' + (tipo === 'user' ? 'user' : 'felix') + (tipo === 'error' ? ' error' : '');

  // Avatar solo en mensajes de Félix
  if (tipo !== 'user') {
    var av = document.createElement('div');
    av.className = 'fx-avatar';
    av.textContent = '🤖';
    wrap.appendChild(av);
  }

  // Contenedor de burbuja + metadata
  var bubbleWrap = document.createElement('div');
  bubbleWrap.className = 'fx-bubble-wrap';

  var bubble = document.createElement('div');
  bubble.className = 'fx-bubble';
  bubble.innerHTML = felixFmt(html);
  bubbleWrap.appendChild(bubble);

  // Timestamp
  var timeEl = document.createElement('div');
  timeEl.className = 'fx-time';
  timeEl.textContent = felixNow();
  bubbleWrap.appendChild(timeEl);

  // Check (solo usuario, empieza oculto con inline style)
  if (tipo === 'user') {
    var checkEl = document.createElement('div');
    checkEl.className = 'fx-check';
    checkEl.style.cssText = 'display:none;font-size:10.5px;color:rgba(255,255,255,0.75);margin-top:3px;text-align:right;padding-right:2px;';
    checkEl.textContent = '✓✓ Recibido';
    bubbleWrap.appendChild(checkEl);
  }

  wrap.appendChild(bubbleWrap);
  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;
  return wrap;
}

// ── Muestra ✓✓ en el último mensaje del usuario ──────────────
function felixMarkDelivered() {
  if (!felixLastUserWrap) return;
  var check = felixLastUserWrap.querySelector('.fx-check');
  if (check) {
    check.style.display = 'block';  // inline style directo, ignora CSS externo
  }
}

// ── Typing indicator con texto ───────────────────────────────
function felixShowTyping(show) {
  var el = document.getElementById('felixTyping');
  if (!el) return;

  if (show) {
    // Muestra con display directo (evita conflictos con style.css externo)
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.gap = '8px';
    el.style.padding = '0 0 10px 8px';

    // Agrega label "Félix está escribiendo..." si no existe
    var label = document.getElementById('felixTypingLabel');
    if (!label) {
      // Busca el felix-typing-bubble para insertar label debajo
      var bubble = el.querySelector('.felix-typing-bubble');
      if (bubble) {
        // Crea wrapper vertical si no existe
        var wrapper = document.getElementById('felixTypingWrapper');
        if (!wrapper) {
          wrapper = document.createElement('div');
          wrapper.id = 'felixTypingWrapper';
          wrapper.style.cssText = 'display:flex;flex-direction:column;gap:4px;';
          // Mueve el bubble al wrapper
          el.insertBefore(wrapper, bubble);
          wrapper.appendChild(bubble);
        }
        label = document.createElement('div');
        label.id = 'felixTypingLabel';
        label.style.cssText = 'font-size:11px;color:#aaa;font-style:italic;padding-left:4px;';
        label.textContent = 'Félix está escribiendo…';
        wrapper.appendChild(label);
      }
    }
    if (label) label.style.display = 'block';
  } else {
    el.style.display = 'none';
    var label = document.getElementById('felixTypingLabel');
    if (label) label.style.display = 'none';
  }

  var c = document.getElementById('felixMessages');
  if (c) c.scrollTop = c.scrollHeight;
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
  felixLastUserWrap = null;
  felixSetUI(false);
  var inp = document.getElementById('felixInput');
  if (inp) { inp.disabled = false; inp.focus(); }
}

// ── Hora actual formateada ────────────────────────────────────
function felixNow() {
  var d = new Date();
  var h = d.getHours(), m = d.getMinutes();
  var ampm = h >= 12 ? 'p.m.' : 'a.m.';
  h = h % 12 || 12;
  return h + ':' + (m < 10 ? '0' + m : m) + ' ' + ampm;
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
  var tyEl = document.getElementById('felixTyping');
  if (tyEl) tyEl.style.display = 'none';  // ocultar directo al cargar
  var inp = document.getElementById('felixInput');
  if (!inp) return;
  inp.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  });
});
