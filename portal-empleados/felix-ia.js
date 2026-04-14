/* ═══════════════════════════════════════════════════════════════
   FÉLIX IA — Proxy seguro via Google Apps Script
   FondoUne Portal Empleados | v2.1 2026
   ✅ Fix CORS: Content-Type text/plain evita preflight OPTIONS
   ✅ proxyUrl y geminiKey cargados dinámicamente desde Firestore
═══════════════════════════════════════════════════════════════ */
(function() {
  'use strict';

  var FELIX_CFG = {
    PROXY_URL:     'https://script.google.com/macros/s/AKfycbwgDStwEkcC4i-OgTXMN5XCfHoM_M6_Lfr_03o_qs12lNLFYr5fmWYmnv2EHFrMSMne/exec',
    MAX_TOKENS:    800,
    TEMP:          0.65,
    HISTORY_LIMIT: 20
  };

  /* ── Carga la API Key y proxyUrl desde Firestore al iniciar ──────
     Colección: config  |  Documento: felix
     Campos: geminiKey, proxyUrl
  ─────────────────────────────────────────────────────────────── */
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
        if (doc.exists && doc.data().proxyUrl) {
          FELIX_CFG.PROXY_URL = doc.data().proxyUrl;
          console.log('[Felix] Proxy URL cargada desde Firestore ✅');
        }
        _felixKeyResolve();
      })
      .catch(function(e) {
        console.warn('[Felix] No se pudo leer config de Firestore:', e.message);
        _felixKeyResolve();
      });
  }

  // Ejecutar cuando Firebase Auth esté lista
  if (window._fbIniciado) {
    _cargarKeyDesdeFirestore();
  } else {
    window._fbReadyCallbacks = window._fbReadyCallbacks || [];
    window._fbReadyCallbacks.push(_cargarKeyDesdeFirestore);
  }

  /* Contexto específico para empleados — conoce el panel de gestión */
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

  /* ── TOGGLE PANEL ── */
  window.toggleFelix = function() {
    panelOpen ? cerrarFelix() : abrirFelix();
  };

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

  /* ── HELPER: extraer texto de respuesta Gemini ── */
  function _extraerTextoGemini(datos) {
    if (!datos) return null;
    if (datos.candidates && datos.candidates[0] &&
        datos.candidates[0].content && datos.candidates[0].content.parts &&
        datos.candidates[0].content.parts[0])
      return datos.candidates[0].content.parts[0].text || null;
    return datos.reply || datos.respuesta || datos.text || datos.message ||
           datos.output || datos.result || null;
  }

  /* ══════════════════════════════════════════════════════════════
     LLAMADA AL PROXY (Google Apps Script → Gemini)
     ──────────────────────────────────────────────────────────────
     FIX CORS v2.1:
     • Usamos Content-Type: text/plain en lugar de application/json.
       Esto convierte el request en una "simple request" que NO
       genera preflight OPTIONS — GAS puede responderla sin CORS.
     • GAS siempre devuelve HTTP 200, incluso en errores internos,
       por eso leemos el body como texto primero y luego parseamos.
     ══════════════════════════════════════════════════════════════ */
  async function consultarFelix(historial) {
    var ultimoMensaje   = historial.length ? historial[historial.length - 1].parts[0].text : '';
    var historialPrevio = historial.slice(0, -1);

    // Esperar a que la key esté cargada desde Firestore
    await _felixKeyPromise;

    if (!FELIX_CFG.GEMINI_KEY) {
      return '⚠️ Félix no está configurado aún.\n\n**Acción requerida (administrador):**\nCrea en Firestore:\n- Colección: `config`\n- Documento: `felix`\n- Campo: `geminiKey` con la API Key de Gemini.';
    }

    // ── Intento 1: Proxy GAS con Content-Type text/plain (fix CORS) ──
    if (FELIX_CFG.PROXY_URL) {
      try {
        var resp = await fetch(FELIX_CFG.PROXY_URL, {
          method:  'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body:    JSON.stringify({ texto: ultimoMensaje, historial: historialPrevio })
        });

        var rawText = await resp.text();

        if (rawText.trim().startsWith('<')) {
          throw new Error('GAS devolvió HTML en lugar de JSON — verifica el despliegue del script');
        }

        var datos = JSON.parse(rawText);
        var texto = _extraerTextoGemini(datos);
        if (texto) return texto;

        console.warn('[Felix·Proxy] JSON sin texto útil:', JSON.stringify(datos).substring(0, 200));
        throw new Error('Respuesta JSON vacía del proxy');

      } catch (proxyErr) {
        console.error('[Felix·Proxy] Falló el proxy GAS:', proxyErr.message);
      }
    }

    // ── Intento 2: Gemini directo como fallback ───────────────────
    console.log('[Felix] Intentando Gemini directo como fallback...');
    try {
      var geminiResp = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + FELIX_CFG.GEMINI_KEY,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            contents:         historial,
            generationConfig: { maxOutputTokens: FELIX_CFG.MAX_TOKENS, temperature: FELIX_CFG.TEMP }
          })
        }
      );
      var gDatos = await geminiResp.json();
      var gTexto = _extraerTextoGemini(gDatos);
      if (gTexto) return gTexto;
      throw new Error('Gemini directo: respuesta vacía');
    } catch (geminiErr) {
      console.error('[Felix·Gemini] Error directo:', geminiErr.message);
    }

    // ── Sin más opciones ──────────────────────────────────────────
    return '⚠️ No pude conectarme al asistente ahora mismo.\n\n**Posibles causas:**\n- Falta la API Key en Firestore (config/felix → geminiKey)\n- Problema temporal de red\n\nIntenta de nuevo en unos segundos.';
  }

  /* ── FUNCIÓN PRINCIPAL DE UI ── */
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
    if (chatHistory.length > FELIX_CFG.HISTORY_LIMIT * 2) {
      chatHistory = chatHistory.slice(-FELIX_CFG.HISTORY_LIMIT * 2);
    }

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

  /* ── UI HELPERS ── */
  function appendMessage(sender, text) {
    var list = document.getElementById('felixMessages');
    if (!list) return;
    var isFelix = sender === 'felix';
    var now = new Date().toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' });
    var div = document.createElement('div');
    div.className = 'felix-msg' + (isFelix ? '' : ' user');
    var html = formatText(text);
    div.innerHTML =
      '<div class="felix-msg-avatar">' + (isFelix ? '🤖' : '👤') + '</div>' +
      '<div><div class="felix-msg-bubble">' + html + '</div>' +
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      window.felixSend();
    }
    var inp = e.target;
    setTimeout(function(){
      inp.style.height = '40px';
      inp.style.height = Math.min(inp.scrollHeight, 100) + 'px';
    }, 0);
  };

})();
