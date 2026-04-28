// ============================================================
//  FÉLIX IA — FondoUne Portal
// ============================================================

var FELIX_PROXY_URL = "https://script.google.com/macros/s/AKfycbwgDStwEkcC4i-OgTXMN5XCfHoM_M6_Lfr_03o_qs12lNLFYr5fmWYmnv2EHFrMSMne/exec";

var FELIX_SYSTEM_PROMPT = "Eres Félix, el asistente virtual oficial del Fondo de Empleados de UNE (Fondo UNE). " +
  "Tu rol es ayudar a los asociados con información sobre: servicios y beneficios del fondo (créditos de vivienda, " +
  "auxilios, seguros, recreación), requisitos y procesos para solicitudes, documentos necesarios para desembolso de crédito, " +
  "tiempos del proceso, educación financiera básica y orientación sobre trámites internos. " +
  "Lineamientos: responde siempre en español, con tono cálido, profesional y cercano. " +
  "Sé conciso pero completo. Si no tienes la información exacta, indícalo honestamente y sugiere contactar al equipo de Fondo UNE. " +
  "Nunca inventes datos financieros, tasas o montos específicos. " +
  "Empieza tus respuestas de forma directa, sin saludos repetitivos.";

// ── Inyecta estilos de burbujas + typing animation ───────────
(function injectStyles() {
  var css = `
    /* ── Burbujas de chat ── */
    .fx-wrap {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      margin-bottom: 12px;
      animation: fxFadeUp .22s ease;
    }
    @keyframes fxFadeUp {
      from { opacity:0; transform:translateY(7px); }
      to   { opacity:1; transform:translateY(0); }
    }
    .fx-wrap.user { flex-direction: row-reverse; }

    .fx-avatar {
      width: 30px; height: 30px;
      border-radius: 50%;
      background: #E8511A;
      display: flex; align-items: center; justify-content: center;
      font-size: 15px; flex-shrink: 0;
    }
    .fx-bubble {
      max-width: 78%;
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

    /* Burbuja Félix */
    .fx-wrap.felix .fx-bubble {
      background: #fff;
      color: #2D1A0E;
      border: 1px solid rgba(232,81,26,0.15);
      border-bottom-left-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.07);
    }
    /* Burbuja usuario */
    .fx-wrap.user .fx-bubble {
      background: #E8511A;
      color: #fff;
      border-bottom-right-radius: 4px;
      box-shadow: 0 2px 8px rgba(232,81,26,0.25);
    }
    /* Burbuja error */
    .fx-wrap.felix.error .fx-bubble {
      background: #fff4f2;
      color: #c0392b;
      border-color: #f5c6c0;
    }

    /* ── Typing indicator (overrides / fallback) ── */
    .felix-typing {
      display: none;
      align-items: center;
      gap: 8px;
      padding: 0 0 10px 8px;
    }
    .felix-typing.visible {
      display: flex !important;
    }
    .felix-typing-bubble {
      background: #fff;
      border: 1px solid rgba(232,81,26,0.15);
      border-radius: 16px;
      border-bottom-left-radius: 4px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 5px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.07);
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
var felixHistory = [];
var felixProcessing = false;
var felixWelcomeMostrado = false;

// ── Bienvenida ───────────────────────────────────────────────
function showFelixWelcome() {
  if (felixWelcomeMostrado) return;
  felixWelcomeMostrado = true;
  felixAppendMsg(
    '¡Hola! Soy <strong>Félix</strong>, tu asistente de FondoUne. ' +
    'Puedo ayudarte con <strong>créditos, documentos, tiempos y procesos</strong>. ' +
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
  xhr.setRequestHeader('Content-Type', 'text/plain');  // text/plain evita preflight CORS

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
        var safe = 'Lo siento, no puedo responder esa consulta. ¿Te ayudo con algo relacionado con FondoUne?';
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
    maxOutputTokens: 1024,
    temperature: 0.7
  }));
}

// ── Agrega burbuja ───────────────────────────────────────────
function felixAppendMsg(html, tipo) {
  var container = document.getElementById('felixMessages');
  if (!container) return;

  var wrap = document.createElement('div');
  wrap.className = 'fx-wrap ' + (tipo === 'user' ? 'user' : 'felix') + (tipo === 'error' ? ' error' : '');

  if (tipo !== 'user') {
    var av = document.createElement('div');
    av.className = 'fx-avatar';
    av.textContent = '🤖';
    wrap.appendChild(av);
  }

  var bubble = document.createElement('div');
  bubble.className = 'fx-bubble';
  bubble.innerHTML = felixFmt(html);
  wrap.appendChild(bubble);

  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;
}

// ── Typing indicator ─────────────────────────────────────────
function felixShowTyping(show) {
  var el = document.getElementById('felixTyping');
  if (!el) return;
  if (show) {
    el.classList.add('visible');
  } else {
    el.classList.remove('visible');
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
