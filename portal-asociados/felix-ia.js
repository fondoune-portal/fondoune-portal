// ============================================================
//  FÉLIX IA — Estilo C: Minimalista limpio
//  FondoUne Portal | Créditos de Vivienda
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

var FELIX_CHIPS = [
  "¿Qué documentos necesito?",
  "¿Cuánto tarda el desembolso?",
  "¿Cuáles son los tipos de crédito?"
];

// ── Estilo C: Minimalista limpio ─────────────────────────────
(function injectStyles() {
  var css = `
    /* ════ PANEL PRINCIPAL ════ */
    .felix-chat-wrap {
      border-radius: 20px !important;
      overflow: hidden !important;
      box-shadow: 0 8px 40px rgba(0,0,0,0.12) !important;
    }

    /* ════ HEADER ════ */
    .felix-chat-header {
      background: #ffffff !important;
      border-bottom: 0.5px solid #f0f0f0 !important;
      padding: 14px 18px !important;
    }
    .felix-chat-header-top {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
    }
    .felix-chat-brand {
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
    }
    .felix-avatar-sm {
      width: 38px !important;
      height: 38px !important;
      border-radius: 50% !important;
      background: #fff5f0 !important;
      border: 2px solid #E8511A !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 18px !important;
      box-shadow: none !important;
    }
    .felix-chat-name {
      font-size: 15px !important;
      font-weight: 600 !important;
      color: #111111 !important;
      letter-spacing: -0.01em !important;
    }
    .felix-chat-status {
      font-size: 11px !important;
      color: #888 !important;
      display: flex !important;
      align-items: center !important;
      gap: 4px !important;
      margin-top: 1px !important;
    }
    .felix-status-dot {
      width: 6px !important;
      height: 6px !important;
      border-radius: 50% !important;
      background: #4cde80 !important;
      display: inline-block !important;
      flex-shrink: 0 !important;
    }
    .felix-close-btn {
      width: 28px !important;
      height: 28px !important;
      border-radius: 50% !important;
      background: #f5f5f5 !important;
      border: none !important;
      cursor: pointer !important;
      font-size: 12px !important;
      color: #888 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      transition: background 0.15s !important;
    }
    .felix-close-btn:hover { background: #eee !important; }

    /* ════ ÁREA DE MENSAJES ════ */
    .felix-messages {
      background: #fafafa !important;
      padding: 16px 14px !important;
    }

    /* ════ BURBUJAS ════ */
    .fx-wrap {
      display: flex;
      align-items: flex-end;
      gap: 7px;
      margin-bottom: 14px;
      animation: fxIn .22s ease;
    }
    @keyframes fxIn {
      from { opacity:0; transform:translateY(8px); }
      to   { opacity:1; transform:translateY(0); }
    }
    .fx-wrap.user { flex-direction: row-reverse; }

    .fx-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #fff5f0;
      border: 1.5px solid #E8511A;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      flex-shrink: 0;
    }

    .fx-bubble-wrap {
      display: flex;
      flex-direction: column;
      max-width: 80%;
    }
    .fx-wrap.user .fx-bubble-wrap { align-items: flex-end; }

    .fx-bubble {
      padding: 10px 14px;
      border-radius: 16px;
      font-size: 13.5px;
      line-height: 1.65;
      word-break: break-word;
    }
    .fx-bubble strong { font-weight: 600; }
    .fx-bubble em     { font-style: italic; }
    .fx-bubble ul     { margin: 5px 0 2px 16px; }
    .fx-bubble li     { margin-bottom: 4px; }

    .fx-wrap.felix .fx-bubble {
      background: #ffffff;
      color: #111;
      border: 0.5px solid #e8e8e8;
      border-bottom-left-radius: 4px;
    }
    .fx-wrap.user .fx-bubble {
      background: #E8511A;
      color: #fff;
      border-bottom-right-radius: 4px;
    }
    .fx-wrap.felix.error .fx-bubble {
      background: #fff4f2;
      color: #c0392b;
      border-color: #f5c6c0;
    }

    /* Timestamp */
    .fx-time {
      font-size: 10px;
      color: #ccc;
      margin-top: 3px;
      padding: 0 3px;
    }
    .fx-wrap.user .fx-time { text-align: right; }

    /* Check */
    .fx-check {
      font-size: 10px;
      color: rgba(255,255,255,0.65);
      text-align: right;
      padding-right: 3px;
      margin-top: 1px;
    }

    /* ════ CHIPS DE ACCESO RÁPIDO ════ */
    .fx-chips-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 2px 0 10px 35px;
      animation: fxIn .25s ease .05s both;
    }
    .fx-chip-btn {
      background: #fff;
      border: 0.5px solid #e0e0e0;
      color: #555;
      border-radius: 20px;
      padding: 5px 12px;
      font-size: 12px;
      font-family: inherit;
      cursor: pointer;
      transition: all .15s ease;
      white-space: nowrap;
    }
    .fx-chip-btn:hover {
      border-color: #E8511A;
      color: #E8511A;
      background: #fff5f0;
    }

    /* ════ TYPING INDICATOR ════ */
    .felix-typing {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 14px 10px;
    }
    .felix-msg-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #fff5f0;
      border: 1.5px solid #E8511A;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      flex-shrink: 0;
    }
    .felix-typing-inner {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .felix-typing-bubble {
      background: #fff;
      border: 0.5px solid #e8e8e8;
      border-radius: 16px;
      border-bottom-left-radius: 4px;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .felix-typing-label {
      font-size: 10.5px;
      color: #bbb;
      font-style: italic;
      padding-left: 3px;
    }
    .felix-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #E8511A;
      animation: fxDot 1.2s infinite ease-in-out;
      opacity: 0.5;
    }
    .felix-dot:nth-child(2) { animation-delay: 0.18s; }
    .felix-dot:nth-child(3) { animation-delay: 0.36s; }
    @keyframes fxDot {
      0%, 80%, 100% { transform: scale(0.7); opacity: 0.35; }
      40%            { transform: scale(1.15); opacity: 1; }
    }

    /* ════ INPUT ÁREA ════ */
    .felix-input-area {
      background: #fff !important;
      border-top: 0.5px solid #f0f0f0 !important;
      padding: 10px 14px 12px !important;
    }
    .felix-input-row {
      background: #f5f5f5 !important;
      border-radius: 14px !important;
      border: 0.5px solid #e8e8e8 !important;
      padding: 8px 8px 8px 14px !important;
      display: flex !important;
      align-items: flex-end !important;
      gap: 8px !important;
      transition: border-color .15s !important;
    }
    .felix-input-row:focus-within {
      border-color: #E8511A !important;
      background: #fff !important;
    }
    .felix-input {
      background: transparent !important;
      border: none !important;
      outline: none !important;
      font-size: 13.5px !important;
      color: #111 !important;
      resize: none !important;
      flex: 1 !important;
      min-height: 22px !important;
      max-height: 100px !important;
      line-height: 1.5 !important;
      font-family: inherit !important;
    }
    .felix-input::placeholder { color: #bbb !important; }
    .felix-send-btn {
      width: 34px !important;
      height: 34px !important;
      border-radius: 10px !important;
      background: #E8511A !important;
      border: none !important;
      cursor: pointer !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      flex-shrink: 0 !important;
      transition: background .15s, transform .1s !important;
      color: #fff !important;
    }
    .felix-send-btn:hover:not(:disabled) {
      background: #d44416 !important;
      transform: scale(1.05) !important;
    }
    .felix-send-btn:disabled { opacity: 0.45 !important; cursor: not-allowed !important; }
    .felix-input-hint {
      font-size: 10.5px !important;
      color: #ccc !important;
      text-align: center !important;
      margin-top: 7px !important;
    }
    .felix-input-hint a { color: #E8511A !important; text-decoration: none !important; }
  `;
  var style = document.createElement('style');
  style.id = 'felix-style-c';
  style.textContent = css;
  document.head.appendChild(style);
})();

// ── Estado ───────────────────────────────────────────────────
var felixHistory         = [];
var felixProcessing      = false;
var felixWelcomeMostrado = false;
var felixLastUserWrap    = null;

// ── Bienvenida + chips ───────────────────────────────────────
function showFelixWelcome() {
  if (felixWelcomeMostrado) return;
  felixWelcomeMostrado = true;

  felixAppendMsg(
    'Hola, soy <strong>Félix</strong>. Cuéntame, ¿qué quieres saber sobre tu crédito de vivienda?',
    'felix'
  );

  var container = document.getElementById('felixMessages');
  if (!container) return;

  var row = document.createElement('div');
  row.className = 'fx-chips-row';
  row.id = 'felixChipsRow';

  FELIX_CHIPS.forEach(function(txt) {
    var btn = document.createElement('button');
    btn.className = 'fx-chip-btn';
    btn.textContent = txt;
    btn.onclick = function() {
      document.getElementById('felixChipsRow') && (document.getElementById('felixChipsRow').style.display = 'none');
      felixEnviar(txt);
    };
    row.appendChild(btn);
  });

  container.appendChild(row);
  container.scrollTop = container.scrollHeight;
}

// ── Funciones globales ───────────────────────────────────────
function felixSend() {
  var input = document.getElementById('felixInput');
  if (!input) return;
  var txt = input.value.trim();
  if (!txt || felixProcessing) return;
  input.value = '';
  input.style.height = 'auto';
  var row = document.getElementById('felixChipsRow');
  if (row) row.style.display = 'none';
  felixEnviar(txt);
}

function felixKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    felixSend();
  }
}

function felixChipClick(txt) {
  var row = document.getElementById('felixChipsRow');
  if (row) row.style.display = 'none';
  felixEnviar(txt);
}

// ── Envío ────────────────────────────────────────────────────
function felixEnviar(txt) {
  if (!txt || felixProcessing) return;
  felixProcessing = true;
  felixSetUI(true);
  felixLastUserWrap = felixAppendMsg(txt, 'user');
  felixHistory.push({ role: 'user', parts: [{ text: txt }] });
  felixShowTyping(true);
  felixCallProxy(0);
}

// ── Proxy GAS ────────────────────────────────────────────────
function felixCallProxy(intento) {
  var MAX = 3, DELAY = 1500;
  var xhr = new XMLHttpRequest();
  var timedOut = false;

  var timer = setTimeout(function() {
    timedOut = true; xhr.abort();
    if (intento < MAX - 1) {
      setTimeout(function() { felixCallProxy(intento + 1); }, DELAY * (intento + 1));
    } else {
      felixShowTyping(false);
      felixAppendMsg('⚠️ La solicitud tardó demasiado. Intenta de nuevo.', 'error');
      felixHistory.pop(); felixDone();
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
        felixAppendMsg('⚠️ No se pudo conectar. Verifica tu red e intenta de nuevo.', 'error');
        felixHistory.pop(); felixDone();
      }
      return;
    }

    felixShowTyping(false);

    try {
      var data = JSON.parse(xhr.responseText);

      if (data.error) {
        felixAppendMsg('⚠️ ' + data.error, 'error');
        felixHistory.pop(); felixDone(); return;
      }

      var cand = data.candidates && data.candidates[0];
      if (!cand) {
        felixAppendMsg('No pude generar respuesta. Intenta de nuevo.', 'error');
        felixHistory.pop(); felixDone(); return;
      }

      if (cand.finishReason === 'SAFETY') {
        var safe = 'Lo siento, no puedo responder esa consulta. ¿Te ayudo con algo sobre crédito de vivienda?';
        felixAppendMsg(safe, 'felix');
        felixHistory.push({ role: 'model', parts: [{ text: safe }] });
        felixDone(); return;
      }

      var resp = cand.content && cand.content.parts && cand.content.parts[0] && cand.content.parts[0].text;
      if (!resp) {
        felixAppendMsg('No pude obtener respuesta. Intenta de nuevo.', 'error');
        felixHistory.pop(); felixDone(); return;
      }

      resp = resp.trim();
      felixMarkDelivered();
      felixAppendMsg(resp, 'felix');
      felixHistory.push({ role: 'model', parts: [{ text: resp }] });
      felixDone();

    } catch(e) {
      felixAppendMsg('⚠️ Error procesando la respuesta. Intenta de nuevo.', 'error');
      felixHistory.pop(); felixDone();
    }
  };

  xhr.send(JSON.stringify({
    system_instruction: { parts: [{ text: FELIX_SYSTEM_PROMPT }] },
    contents: felixHistory,
    generationConfig: { maxOutputTokens: 1024, temperature: 0.7 }
  }));
}

// ── Agrega burbuja ───────────────────────────────────────────
function felixAppendMsg(html, tipo) {
  var container = document.getElementById('felixMessages');
  if (!container) return null;

  var wrap = document.createElement('div');
  wrap.className = 'fx-wrap ' + (tipo === 'user' ? 'user' : 'felix') + (tipo === 'error' ? ' error' : '');

  if (tipo !== 'user') {
    var av = document.createElement('div');
    av.className = 'fx-avatar';
    av.textContent = '🤖';
    wrap.appendChild(av);
  }

  var bWrap = document.createElement('div');
  bWrap.className = 'fx-bubble-wrap';

  var bubble = document.createElement('div');
  bubble.className = 'fx-bubble';
  bubble.innerHTML = felixFmt(html);
  bWrap.appendChild(bubble);

  var timeEl = document.createElement('div');
  timeEl.className = 'fx-time';
  timeEl.textContent = felixNow();
  bWrap.appendChild(timeEl);

  if (tipo === 'user') {
    var chk = document.createElement('div');
    chk.className = 'fx-check';
    chk.style.display = 'none';
    chk.textContent = '✓✓ Recibido';
    bWrap.appendChild(chk);
  }

  wrap.appendChild(bWrap);
  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;
  return wrap;
}

// ── Check entregado ──────────────────────────────────────────
function felixMarkDelivered() {
  if (!felixLastUserWrap) return;
  var chk = felixLastUserWrap.querySelector('.fx-check');
  if (chk) chk.style.display = 'block';
}

// ── Typing indicator ─────────────────────────────────────────
function felixShowTyping(show) {
  var el = document.getElementById('felixTyping');
  var lbl = document.getElementById('felixTypingLabel');
  if (!el) return;
  el.style.display = show ? 'flex' : 'none';
  if (lbl) lbl.style.display = show ? 'block' : 'none';
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

function felixNow() {
  var d = new Date(), h = d.getHours(), m = d.getMinutes();
  var ap = h >= 12 ? 'p.m.' : 'a.m.';
  h = h % 12 || 12;
  return h + ':' + (m < 10 ? '0' + m : m) + ' ' + ap;
}

function felixFmt(t) {
  if (!/<[a-z][\s\S]*>/i.test(t)) {
    t = t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  return t
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  var el = document.getElementById('felixTyping');
  if (el) el.style.display = 'none';
  var inp = document.getElementById('felixInput');
  if (!inp) return;
  inp.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 100) + 'px';
  });
});
