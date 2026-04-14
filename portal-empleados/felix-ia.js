/* ═══════════════════════════════════════════════════════════════
   FÉLIX IA — Llamada directa a Gemini API (sin proxy)
   FondoUne Portal Empleados | v3.0 2026
   ✅ API Key restringida por dominio en Google Cloud Console
      (solo funciona desde fondoune-portal.github.io)
   ✅ geminiKey cargada dinámicamente desde Firestore
═══════════════════════════════════════════════════════════════ */
(function() {
  'use strict';

  var FELIX_CFG = {
    GEMINI_MODEL: 'gemini-2.5-flash',
    MAX_TOKENS:    800,
    TEMP:          0.65,
    HISTORY_LIMIT: 20
  };

  var _felixKeyResolve;
  var _felixKeyPromise = new Promise(function(resolve) { _felixKeyResolve = resolve; });

  function _cargarKeyDesdeFirestore() {
    if (!window._fbDB) { _felixKeyResolve(); return; }
    window._fbDB.collection('config').doc('felix').get()
      .then(function(doc) {
        if (doc.exists && doc.data().geminiKey) {
          FELIX_CFG.GEMINI_KEY = doc.data().geminiKey;
          console.log('[Felix] API Key cargada desde Firestore ✅');
        } else {
          console.warn('[Felix] Falta el documento config/felix con campo geminiKey en Firestore');
        }
        _felixKeyResolve();
      })
      .catch(function(e) {
        console.warn('[Felix] No se pudo leer config de Firestore:', e.message);
        _felixKeyResolve();
      });
  }

  if (window._fbIniciado) {
    _cargarKeyDesdeFirestore();
  } else {
    window._fbReadyCallbacks = window._fbReadyCallbacks || [];
    window._fbReadyCallbacks.push(_cargarKeyDesdeFirestore);
  }

  var SYSTEM_PROMPT = [
    'Eres Félix, el asistente virtual oficial de FondoUne (Fondo de Empleados de UNE).',
    'Estás en el PORTAL DE EMPLEADOS — hablas con el equipo interno de FondoUne.',
    'Eres amable, preciso, profesional y hablas en español colombiano.',
    'Tu misión es ayudar a los empleados a gestionar las solicitudes de crédito de vivienda.',
    '',
    'FUNCIONES DEL PORTAL DE EMPLEADOS:',
    '1. Ver y gestionar todas las solicitudes de crédito de los asociados.',
    '2. Cambiar el estado de las solicitudes: Pendiente → En Revisión → Aprobado/Rechazado → Desembolsado.',
    '3. Descargar documentos adjuntos de cada solicitud.',
    '4. Ver historial de acciones por solicitud.',
    '5. Gestionar usuarios empleados (crear, editar, cambiar contraseña).',
    '6. Ver estadísticas y KPIs del panel principal.',
    '7. Exportar reportes en Word (.docx).',
    '',
    'ESTADOS DE SOLICITUD:',
    '- Pendiente: Recién radicada, pendiente de revisión inicial.',
    '- En Revisión: El equipo está analizando la solicitud y documentos.',
    '- Aprobado: Solicitud aprobada, pendiente de desembolso.',
    '- Rechazado: Solicitud no aprobada (se debe indicar motivo al asociado).',
    '- Desembolsado: Crédito entregado al asociado.',
    '',
    'TIPOS DE CRÉDITO:',
    '1. Compra de Vivienda  2. Construcción en Lote Propio  3. Garantía Hipotecaria',
    '4. Libre Destino con Garantía  5. Compra de Lote  6. Liberación de Gravamen',
    '',
    'DOCUMENTOS QUE PUEDE RECIBIR EL EQUIPO:',
    '- Cédula, certificado laboral, colillas de pago, extractos bancarios,',
    '  declaración de renta, certificado de tradición, promesa de compraventa,',
    '  escritura, avalúo comercial.',
    '',
    'REGLAS:',
    '- Si el empleado pregunta por una solicitud específica, indícale cómo buscarla en el panel.',
    '- Sé conciso: máximo 3-4 párrafos cortos por respuesta.',
    '- Usa emojis ocasionalmente pero sin exagerar.',
    '- Si no sabes algo operativo específico, sugiere revisar el manual interno.',
  ].join('\n');

  var chatHistory = [];
  var isLoading   = false;
  var panelOpen   = false;

  window.toggleFelix = function() { panelOpen ? cerrarFelix() : abrirFelix(); };

  window.abrirFelix = function() {
    panelOpen = true;
    var panel   = document.getElementById('felixEmpPanel');
    var overlay = document.getElementById('felixOverlay');
    var wrap    = document.getElementById('felixEmpWrap');
    if (window.FU_Sound) window.FU_Sound.play('felixOpen');
    if (panel)   { panel.style.display = 'flex'; setTimeout(function(){ panel.classList.add('show'); }, 10); }
    if (overlay) overlay.classList.add('show');
    if (wrap && window.innerWidth <= 768) wrap.style.display = 'none';
    var bubble = document.getElementById('felixBubble');
    if (bubble) bubble.style.display = 'none';
    if (chatHistory.length === 0) setTimeout(showWelcome, 350);
    setTimeout(focusInput, 400);
  };

  window.cerrarFelix = function() {
    panelOpen = false;
    var panel   = document.getElementById('felixEmpPanel');
    var overlay = document.getElementById('felixOverlay');
    var wrap    = document.getElementById('felixEmpWrap');
    if (window.FU_Sound) window.FU_Sound.play('felixClose');
    if (panel)   { panel.classList.remove('show'); setTimeout(function(){ panel.style.display='none'; }, 300); }
    if (overlay) overlay.classList.remove('show');
    if (wrap) wrap.style.display = 'flex';
  };

  function _extraerTextoGemini(datos) {
    if (!datos) return null;
    if (datos.candidates && datos.candidates[0] &&
        datos.candidates[0].content && datos.candidates[0].content.parts &&
        datos.candidates[0].content.parts[0])
      return datos.candidates[0].content.parts[0].text || null;
    return datos.reply || datos.respuesta || datos.text || datos.message || datos.output || datos.result || null;
  }

  async function consultarFelix(historial) {
    await _felixKeyPromise;

    if (!FELIX_CFG.GEMINI_KEY) {
      return '⚠️ Félix no está configurado aún.\n\n**Acción requerida (administrador):**\nCrea en Firestore:\n- Colección: `config`\n- Documento: `felix`\n- Campo: `geminiKey` con la API Key de Gemini (restringida por dominio).';
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
        console.error('[Felix] Error de Gemini:', errMsg);
        if (geminiResp.status === 429) return '⏳ El servicio está recibiendo muchas solicitudes. Espera unos segundos e intenta de nuevo.';
        if (geminiResp.status === 400) return '⚠️ Solicitud inválida. Intenta reformular tu pregunta.';
        throw new Error(errMsg);
      }

      var datos = await geminiResp.json();
      var texto = _extraerTextoGemini(datos);
      if (texto) return texto;
      throw new Error('Respuesta vacía de Gemini');

    } catch (err) {
      console.error('[Felix] Error consultando Gemini:', err.message);
      return '⚠️ No pude conectarme al asistente ahora mismo.\n\n**Posibles causas:**\n- La API Key no está activa o fue restringida incorrectamente\n- Problema temporal de red\n\nIntenta de nuevo en unos segundos.';
    }
  }

  async function felixSendMessage(userText) {
    if (!userText.trim() || isLoading) return;
    isLoading = true;
    if (window.FU_Sound) window.FU_Sound.play('felixSend');
    appendMessage('user', userText);
    clearInput();
    showTyping(true);
    scrollToBottom();
    if (chatHistory.length === 0) {
      chatHistory.push({ role: 'user',  parts: [{ text: 'INSTRUCCIONES DEL SISTEMA: ' + SYSTEM_PROMPT }] });
      chatHistory.push({ role: 'model', parts: [{ text: 'Entendido, soy Félix del portal de Empleados.' }] });
    }
    chatHistory.push({ role: 'user', parts: [{ text: userText }] });
    if (chatHistory.length > FELIX_CFG.HISTORY_LIMIT * 2) chatHistory = chatHistory.slice(-FELIX_CFG.HISTORY_LIMIT * 2);
    if (window.FU_Audit) FU_Audit.log('FELIX_IA', 'Consulta: ' + userText.substring(0, 60));
    var reply = await consultarFelix(chatHistory);
    chatHistory.push({ role: 'model', parts: [{ text: reply }] });
    showTyping(false);
    if (window.FU_Sound) window.FU_Sound.play('felixReceive');
    appendMessage('felix', reply);
    isLoading = false;
    scrollToBottom();
    var inp = document.getElementById('felixInput');
    if (inp) inp.focus();
  }

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
    if (!list || list.children.length > 0) return;
    appendMessage('felix', '¡Hola! 👋 Soy **Félix**, tu asistente del Portal de Empleados FondoUne.\n\nPuedo ayudarte con la gestión de solicitudes, cambios de estado, descarga de documentos y mucho más. ¿En qué te puedo ayudar hoy?');
  }

  window.felixChipClick = function(text) {
    if (!panelOpen) abrirFelix();
    var inp = document.getElementById('felixInput');
    if (inp) inp.value = text;
    felixSendMessage(text);
  };

  window.felixSend = function() {
    var inp = document.getElementById('felixInput');
    if (inp) felixSendMessage(inp.value.trim());
  };

  window.felixKeydown = function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); window.felixSend(); }
    var inp = e.target;
    setTimeout(function(){ inp.style.height = '40px'; inp.style.height = Math.min(inp.scrollHeight, 100) + 'px'; }, 0);
  };

})();