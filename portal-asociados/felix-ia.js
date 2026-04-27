// ============================================================
//  FÉLIX IA — compatible con el portal original FondoUne
//  Usa los IDs y funciones globales del portal existente
// ============================================================

var FELIX_PROXY_URL = "https://script.google.com/macros/s/TU_ID_DE_GAS_AQUI/exec";

var FELIX_SYSTEM_PROMPT = "Eres Félix, el asistente virtual oficial del Fondo de Empleados de UNE (Fondo UNE). " +
  "Tu rol es ayudar a los asociados con información sobre: servicios y beneficios del fondo (créditos de vivienda, " +
  "auxilios, seguros, recreación), requisitos y procesos para solicitudes, documentos necesarios para desembolso de crédito, " +
  "tiempos del proceso, educación financiera básica y orientación sobre trámites internos. " +
  "Lineamientos: responde siempre en español, con tono cálido, profesional y cercano. " +
  "Sé conciso pero completo. Si no tienes la información exacta, indícalo honestamente y sugiere contactar al equipo de Fondo UNE. " +
  "Nunca inventes datos financieros, tasas o montos específicos. " +
  "Empieza tus respuestas de forma directa, sin saludos repetitivos.";

// Historial de conversación (multi-turno)
var felixHistory = [];
var felixProcessing = false;
var felixWelcomeMostrado = false;

// ── Mensaje de bienvenida al abrir el panel ──────────────────
function showFelixWelcome() {
  if (felixWelcomeMostrado) return;
  felixWelcomeMostrado = true;
  felixAppendMsg(
    "¡Hola! Soy <strong>Félix</strong>, tu asistente de FondoUne. " +
    "Puedo ayudarte con información sobre <strong>créditos, documentos, tiempos y procesos</strong>. " +
    "¿En qué puedo ayudarte hoy?",
    'felix'
  );
}

// ── Envío desde el botón o Enter ────────────────────────────
function felixSend() {
  var input = document.getElementById('felixInput');
  if (!input) return;
  var texto = input.value.trim();
  if (!texto || felixProcessing) return;
  input.value = '';
  input.style.height = 'auto';
  felixEnviar(texto);
}

// ── Manejo de teclado en el textarea ────────────────────────
function felixKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    felixSend();
  }
}

// ── Click en chip (compatibilidad — chips eliminados del HTML) ─
function felixChipClick(texto) {
  var input = document.getElementById('felixInput');
  if (input) input.value = '';
  felixEnviar(texto);
}

// ── Lógica principal de envío ────────────────────────────────
function felixEnviar(texto) {
  if (!texto || felixProcessing) return;

  felixProcessing = true;
  felixSetBtnState(true);

  // Muestra el mensaje del usuario
  felixAppendMsg(texto, 'user');

  // Agrega al historial
  felixHistory.push({ role: 'user', parts: [{ text: texto }] });

  // Muestra typing
  felixShowTyping(true);

  // Llama al proxy con reintentos
  felixCallProxy(0);
}

// ── Llama al proxy GAS con reintentos ───────────────────────
function felixCallProxy(intento) {
  var MAX_REINTENTOS = 3;
  var DELAY_BASE     = 1500;

  var payload = JSON.stringify({
    system_instruction: { parts: [{ text: FELIX_SYSTEM_PROMPT }] },
    contents: felixHistory,
    maxOutputTokens: 1024,
    temperature: 0.7
  });

  // Timeout manual con XMLHttpRequest (más compatible que fetch+AbortController)
  var xhr = new XMLHttpRequest();
  var timedOut = false;

  var timeout = setTimeout(function() {
    timedOut = true;
    xhr.abort();
    if (intento < MAX_REINTENTOS - 1) {
      setTimeout(function() { felixCallProxy(intento + 1); }, DELAY_BASE * (intento + 1));
    } else {
      felixShowTyping(false);
      felixAppendMsg(
        '⚠️ La solicitud tardó demasiado. GAS puede estar iniciando — intenta de nuevo en unos segundos.',
        'felix error'
      );
      felixHistory.pop(); // revierte mensaje del usuario
      felixFinish();
    }
  }, 25000);

  xhr.open('POST', FELIX_PROXY_URL, true);
  xhr.setRequestHeader('Content-Type', 'application/json');

  xhr.onreadystatechange = function() {
    if (xhr.readyState !== 4) return;
    clearTimeout(timeout);
    if (timedOut) return;

    if (xhr.status === 0) {
      // Error de red
      if (intento < MAX_REINTENTOS - 1) {
        setTimeout(function() { felixCallProxy(intento + 1); }, DELAY_BASE * (intento + 1));
      } else {
        felixShowTyping(false);
        felixAppendMsg('⚠️ Sin conexión. Verifica tu red e intenta de nuevo.', 'felix error');
        felixHistory.pop();
        felixFinish();
      }
      return;
    }

    felixShowTyping(false);

    try {
      var data = JSON.parse(xhr.responseText);

      // El proxy devuelve { error: "..." } si algo falló
      if (data.error) {
        felixAppendMsg('⚠️ ' + data.error, 'felix error');
        felixHistory.pop();
        felixFinish();
        return;
      }

      // Extrae el texto de la respuesta de Gemini
      var candidato = data.candidates && data.candidates[0];
      if (!candidato) {
        felixAppendMsg(
          'No pude obtener una respuesta en este momento. Por favor intenta de nuevo.',
          'felix error'
        );
        felixHistory.pop();
        felixFinish();
        return;
      }

      if (candidato.finishReason === 'SAFETY') {
        var msg = 'Lo siento, no puedo responder esa consulta. ¿Puedo ayudarte con algo relacionado con los servicios de FondoUne?';
        felixAppendMsg(msg, 'felix');
        felixHistory.push({ role: 'model', parts: [{ text: msg }] });
        felixFinish();
        return;
      }

      var respuesta = candidato.content && candidato.content.parts && candidato.content.parts[0] && candidato.content.parts[0].text;
      if (!respuesta) {
        felixAppendMsg('No pude obtener una respuesta. Por favor intenta de nuevo.', 'felix error');
        felixHistory.pop();
        felixFinish();
        return;
      }

      respuesta = respuesta.trim();
      felixAppendMsg(respuesta, 'felix');
      felixHistory.push({ role: 'model', parts: [{ text: respuesta }] });
      felixFinish();

    } catch (e) {
      felixAppendMsg('⚠️ Error al procesar la respuesta. Intenta de nuevo.', 'felix error');
      felixHistory.pop();
      felixFinish();
    }
  };

  xhr.send(payload);
}

// ── Agrega un mensaje al chat ────────────────────────────────
function felixAppendMsg(html, tipo) {
  var container = document.getElementById('felixMessages');
  if (!container) return;

  var wrap = document.createElement('div');
  wrap.className = 'felix-msg-wrap ' + tipo;

  if (tipo === 'felix' || tipo === 'felix error') {
    var avatar = document.createElement('div');
    avatar.className = 'felix-msg-avatar';
    avatar.textContent = '🤖';
    wrap.appendChild(avatar);
  }

  var bubble = document.createElement('div');
  bubble.className = tipo === 'user' ? 'felix-msg-user' : (tipo === 'felix error' ? 'felix-msg-bot felix-msg-error' : 'felix-msg-bot');
  bubble.innerHTML = felixFormatText(html);
  wrap.appendChild(bubble);

  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;
}

// ── Muestra/oculta el indicador de escritura ────────────────
function felixShowTyping(show) {
  var typing = document.getElementById('felixTyping');
  if (!typing) return;
  typing.style.display = show ? 'flex' : 'none';
  if (show) {
    var container = document.getElementById('felixMessages');
    if (container) container.scrollTop = container.scrollHeight;
  }
}

// ── Activa/desactiva el botón de envío ──────────────────────
function felixSetBtnState(disabled) {
  var btn   = document.getElementById('felixSendBtn');
  var input = document.getElementById('felixInput');
  if (btn)   btn.disabled   = disabled;
  if (input) input.disabled = disabled;
}

// ── Finaliza el procesamiento ────────────────────────────────
function felixFinish() {
  felixProcessing = false;
  felixSetBtnState(false);
  var input = document.getElementById('felixInput');
  if (input) {
    input.disabled = false;
    input.focus();
  }
}

// ── Formatea texto: negritas y saltos de línea ───────────────
function felixFormatText(texto) {
  // Si ya tiene HTML (respuesta del proxy con listas), lo deja pasar con cuidado
  // Solo escapa si es texto plano
  if (!texto.includes('<')) {
    texto = texto
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  return texto
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

// ── Auto-resize del textarea ─────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  var input = document.getElementById('felixInput');
  if (!input) return;
  input.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  });

  // Ocultar typing al inicio
  felixShowTyping(false);
});
