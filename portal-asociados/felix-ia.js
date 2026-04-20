/* ═══════════════════════════════════════════════════════════════
   FÉLIX IA — Llamada directa a Gemini API (sin proxy)
   FondoUne Portal Asociados | v3.1 2026
   ✅ geminiKey cargada dinámicamente desde Firestore
      Colección: config | Documento: felix | Campo: geminiKey
   ✅ Fix v3.1: isLoading protegido con try/finally para evitar
      bloqueo de botones tras errores en cualquier flujo
═══════════════════════════════════════════════════════════════ */
(function() {
  'use strict';

  var FELIX_CFG = {
    GEMINI_MODEL:  'gemini-2.0-flash',
    MAX_TOKENS:     800,
    TEMP:           0.65,
    HISTORY_LIMIT:  20
  };

  /* ── Carga la API Key desde Firestore al iniciar ── */
  var _felixKeyResolve;
  var _felixKeyPromise = new Promise(function(resolve) { _felixKeyResolve = resolve; });

  function _cargarKeyDesdeFirestore() {
    if (!window._fbDB) { _felixKeyResolve(); return; }
    window._fbDB.collection('config').doc('felix').get()
      .then(function(doc) {
        if (doc.exists && doc.data().geminiKey) {
          FELIX_CFG.GEMINI_KEY = doc.data().geminiKey;
          console.log('[Felix·Asociados] API Key cargada desde Firestore ✅');
        } else {
          console.warn('[Felix·Asociados] Falta config/felix → geminiKey en Firestore');
        }
        _felixKeyResolve();
      })
      .catch(function(e) {
        console.warn('[Felix·Asociados] No se pudo leer config de Firestore:', e.message);
        _felixKeyResolve();
      });
  }

  if (window._fbIniciado) {
    _cargarKeyDesdeFirestore();
  } else {
    window._fbReadyCallbacks = window._fbReadyCallbacks || [];
    window._fbReadyCallbacks.push(_cargarKeyDesdeFirestore);
  }

  /* ── System Prompt específico para ASOCIADOS ── */
  var SYSTEM_PROMPT = [
    'Eres Félix, el asistente virtual oficial de FondoUne (Fondo de Empleados de UNE).',
    'Estás en el PORTAL DE ASOCIADOS — hablas directamente con los asociados de FondoUne.',
    'Eres amable, preciso, profesional y hablas en español colombiano.',
    'Tu misión es ayudar a los asociados con sus solicitudes de crédito de vivienda.',
    '',
    'FUNCIONES QUE PUEDE HACER EL ASOCIADO EN ESTE PORTAL:',
    '1. Radicar una nueva solicitud de crédito de vivienda.',
    '2. Consultar el estado de sus solicitudes existentes con su cédula o radicado.',
    '3. Ver los documentos requeridos según el tipo de crédito.',
    '4. Descargar el formulario de solicitud.',
    '5. Enviar PQRS (Peticiones, Quejas, Reclamos y Sugerencias).',
    '6. Actualizar sus datos de contacto.',
    '',
    'ESTADOS DE SOLICITUD:',
    '- Pendiente: Recién radicada, el equipo la revisará pronto.',
    '- En Revisión: El equipo de FondoUne está analizando tu solicitud y documentos.',
    '- Aprobado: ¡Felicitaciones! Tu solicitud fue aprobada, pronto recibirás instrucciones.',
    '- Rechazado: La solicitud no fue aprobada. Puedes contactar a FondoUne para conocer el motivo.',
    '- Desembolsado: El crédito ya fue entregado.',
    '',
    'TIPOS DE CRÉDITO DISPONIBLES:',
    '1. Compra de Vivienda  2. Construcción en Lote Propio  3. Garantía Hipotecaria',
    '4. Libre Destino con Garantía  5. Compra de Lote  6. Liberación de Gravamen',
    '',
    'DOCUMENTOS GENERALMENTE REQUERIDOS:',
    '- Cédula de ciudadanía, certificado laboral, últimas colillas de pago,',
    '  extractos bancarios recientes, declaración de renta (si aplica),',
    '  certificado de tradición, promesa de compraventa, escritura, avalúo comercial.',
    '',
    'REGLAS:',
    '- Habla siempre de forma amigable y en primera persona con el asociado.',
    '- Nunca menciones funciones de empleados (cambiar estados, gestionar usuarios, exportar reportes).',
    '- Sé conciso: máximo 3-4 párrafos cortos por respuesta.',
    '- Usa emojis ocasionalmente pero sin exagerar.',
    '- Si el asociado tiene dudas sobre su solicitud específica, indícale que use la sección "Consultar Estado" con su número de cédula o radicado.',
    '- Para temas muy específicos o urgentes, sugiere contactar directamente a FondoUne.',
  ].join('\n');

  var chatHistory   = [];
  var isLoading     = false;
  var panelOpen     = false;
  var felixYaSaludo = false;

  /* ── TOGGLE PANEL ── */
  window.toggleFelix = function() { panelOpen ? cerrarFelix() : abrirFelix(); };

  window.abrirFelix = function() {
    panelOpen = true;
    var panel   = document.getElementById('felixEmpPanel');
    var overlay = document.getElementById('felixOverlay');
    var wrap    = document.getElementById('felixEmpWrap');
    if (panel)   { panel.style.display = 'flex'; setTimeout(function(){ panel.classList.add('show'); }, 10); }
    if (overlay) overlay.classList.add('show');
    if (wrap && window.innerWidth <= 768) wrap.style.display = 'none';
    var bubble = document.getElementById('felixBubble');
    if (bubble) bubble.style.display = 'none';
    setTimeout(showWelcome, 350);
    setTimeout(focusInput, 400);
  };

  window.cerrarFelix = function() {
    panelOpen = false;
    var panel   = document.getElementById('felixEmpPanel');
    var overlay = document.getElementById('felixOverlay');
    var wrap    = document.getElementById('felixEmpWrap');
    if (panel)   { panel.classList.remove('show'); setTimeout(function(){ panel.style.display='none'; }, 300); }
    if (overlay) overlay.classList.remove('show');
    if (wrap)    wrap.style.display = 'flex';
  };

  /* ── Extractor de texto compatible con Gemini thinking model ── */
  function _extraerTextoGemini(datos) {
    if (!datos) return null;
    if (datos.candidates && datos.candidates[0] &&
        datos.candidates[0].content && datos.candidates[0].content.parts) {
      var parts     = datos.candidates[0].content.parts;
      var textParts = parts.filter(function(p) { return !p.thought && p.text; });
      if (textParts.length > 0) return textParts[textParts.length - 1].text || null;
      return null;
    }
    return datos.reply || datos.respuesta || datos.text ||
           datos.message || datos.output  || datos.result || null;
  }

  /* ── Llamada directa a Gemini API ── */
  async function consultarFelix(historial) {
    await _felixKeyPromise;

    if (!FELIX_CFG.GEMINI_KEY) {
      return '⚠️ Félix no está configurado aún.\n\n**Acción requerida (administrador):**\nCrea en Firestore:\n- Colección: `config`\n- Documento: `felix`\n- Campo: `geminiKey` con la API Key de Gemini.';
    }

    try {
      var geminiResp = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/' + FELIX_CFG.GEMINI_MODEL + ':generateContent?key=' + FELIX_CFG.GEMINI_KEY,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            contents:         historial,
            generationConfig: { maxOutputTokens: FELIX_CFG.MAX_TOKENS, temperature: FELIX_CFG.TEMP }
          })
        }
      );

      if (!geminiResp.ok) {
        var errData = await geminiResp.json().catch(function(){ return {}; });
        var errMsg  = (errData.error && errData.error.message) || ('HTTP ' + geminiResp.status);
        console.error('[Felix·Asociados] Error de Gemini:', errMsg);
        if (geminiResp.status === 429) return '⏳ El asistente está recibiendo muchas consultas en este momento. Intenta de nuevo en unos segundos.';
        if (geminiResp.status === 400) return '⚠️ No entendí tu solicitud. ¿Puedes reformularla?';
        throw new Error(errMsg);
      }

      var datos = await geminiResp.json();
      var texto = _extraerTextoGemini(datos);
      if (texto) return texto;
      throw new Error('Respuesta vacía de Gemini');

    } catch (err) {
      console.error('[Felix·Asociados] Error:', err.message);
      return '⚠️ Lo siento, tuve un problema de conexión. Por favor, intenta de nuevo en unos segundos.';
    }
  }

  /* ── Función principal de UI — FIX v3.1: try/finally garantiza
        que isLoading siempre se libere sin importar qué ocurra ── */
  async function felixSendMessage(userText) {
    if (!userText.trim() || isLoading) return;
    isLoading = true;
    appendMessage('user', userText);
    clearInput();
    showTyping(true);
    scrollToBottom();

    try {
      if (chatHistory.length === 0) {
        chatHistory.push({ role: 'user',  parts: [{ text: 'INSTRUCCIONES DEL SISTEMA: ' + SYSTEM_PROMPT }] });
        chatHistory.push({ role: 'model', parts: [{ text: 'Entendido, soy Félix del Portal de Asociados FondoUne.' }] });
      }
      chatHistory.push({ role: 'user', parts: [{ text: userText }] });

      if (chatHistory.length > FELIX_CFG.HISTORY_LIMIT * 2) {
        chatHistory = chatHistory.slice(0, 2).concat(chatHistory.slice(-(FELIX_CFG.HISTORY_LIMIT * 2 - 2)));
      }

      if (window.FU_Audit) FU_Audit.log('FELIX_IA', 'Consulta: ' + userText.substring(0, 60));

      var reply = await consultarFelix(chatHistory);
      chatHistory.push({ role: 'model', parts: [{ text: reply }] });
      if (window.FU_Sound) FU_Sound.felixMsg();
      appendMessage('felix', reply);

    } catch (err) {
      console.error('[Felix·Asociados] Error inesperado en felixSendMessage:', err);
      appendMessage('felix', '⚠️ Ocurrió un error inesperado. Por favor, intenta de nuevo.');
    } finally {
      isLoading = false;
      showTyping(false);
      scrollToBottom();
      var inp = document.getElementById('felixInput');
      if (inp) inp.focus();
    }
  }

  /* ── UI Helpers ── */
  function appendMessage(sender, text) {
    var list = document.getElementById('felixMessages');
    if (!list) return;
    var isFelix = sender === 'felix';
    var now = new Date().toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' });
    var div = document.createElement('div');
    div.className = 'felix-msg' + (isFelix ? '' : ' user');
    div.innerHTML =
      '<div class="felix-msg-avatar">' + (isFelix ? '🤖' : '👤') + '</div>' +
      '<div><div class="felix-msg-bubble">' + formatText(text) + '</div>' +
      '<div class="felix-msg-time">' + now + '</div></div>';
    list.appendChild(div);
    scrollToBottom();
  }

  function formatText(t) {
    return t
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
      .replace(/\*(.*?)\*/g,'<em>$1</em>')
      .replace(/\n\n/g,'</p><p>').replace(/\n/g,'<br>')
      .replace(/^/,'<p>').replace(/$/,'</p>');
  }

  function showTyping(show) {
    var el = document.getElementById('felixTyping');
    if (el) el.classList.toggle('show', show);
  }

  function scrollToBottom() {
    setTimeout(function(){
      var list = document.getElementById('felixMessages');
      if (list) list.scrollTop = list.scrollHeight;
    }, 50);
  }

  function clearInput() {
    var inp = document.getElementById('felixInput');
    if (inp) { inp.value = ''; inp.style.height = '40px'; }
  }

  function focusInput() {
    var inp = document.getElementById('felixInput');
    if (inp) inp.focus();
  }

  function showWelcome() {
    var list = document.getElementById('felixMessages');
    if (!list || felixYaSaludo) return;
    appendMessage('felix', '¡Hola! 👋 Soy **Félix**, tu asistente del Portal de Asociados FondoUne.\n\nPuedo ayudarte con documentos para tu solicitud, consultar el estado de tu crédito, resolver dudas sobre los tipos de crédito y mucho más. ¿En qué te puedo ayudar hoy?');
    felixYaSaludo = true;
  }

  window.showFelixWelcome = function() { showWelcome(); };
  window.showWelcome      = showWelcome;

  window.felixChipClick = function(text) {
    if (!panelOpen) abrirFelix();
    var inp = document.getElementById('felixInput');
    if (inp) inp.value = text;
    felixSendMessage(text);
  };

  window.felixSend = function() {
    if (window.FU_Sound) FU_Sound.send();
    var inp = document.getElementById('felixInput');
    if (inp) felixSendMessage(inp.value.trim());
  };

  window.felixKeydown = function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); window.felixSend(); }
    var inp = e.target;
    setTimeout(function(){
      inp.style.height = '40px';
      inp.style.height = Math.min(inp.scrollHeight, 100) + 'px';
    }, 0);
  };

  /* ── Saludo automático al abrir el FAB ── */
  document.addEventListener('DOMContentLoaded', function() {
    var fab = document.querySelector('.fab-felix') || document.getElementById('felixFab');
    if (fab) {
      fab.addEventListener('click', function() {
        setTimeout(function() {
          var list = document.getElementById('felixMessages');
          if (list && list.children.length === 0) showWelcome();
        }, 350);
      });
    }
  });

})();