/* ═══════════════════════════════════════════════════════════════
   FÉLIX IA — Proxy seguro via Cloud Function
   FondoUne Portal Asociados | v2.0 2026
   ✅ API Key de Gemini almacenada en Secret Manager (servidor)
      — nunca visible en el código fuente del navegador —
═══════════════════════════════════════════════════════════════ */
(function() {
  'use strict';

  var FELIX_CFG = {
    // API_KEY eliminada — ahora vive en Secret Manager de Google Cloud
    PROXY_URL:      'https://script.google.com/macros/s/AKfycbyR6TAnlgsU0ULwZY1xXk8l14Z2pj4DPnqLWo9XPZAL2A3DIAXB3N4M0EQgmQNCnI8v/exec',
    MAX_TOKENS:     600,
    TEMP:           0.65,
    HISTORY_LIMIT:  20
  };

  /* Contexto específico para empleados — conoce el panel de gestión */
  var SYSTEM_PROMPT = [
    'Eres Félix, el asistente virtual oficial de FondoUne (Fondo de Empleados de UNE).',
    'Estás en el PORTAL DE ASOCIADOS — hablas directamente con los asociados de FondoUne.',
    'Eres amable, preciso, profesional y hablas en español colombiano.',
    'Tu misión es ayudar a los asociados con sus solicitudes de crédito de vivienda.',
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
    
    if (panel) { 
      panel.style.display = 'flex'; 
      setTimeout(function(){ panel.classList.add('show'); }, 10); 
    }
    if (overlay) overlay.classList.add('show');
    if (wrap && window.innerWidth <= 768) wrap.style.display = 'none';

    var bubble  = document.getElementById('felixBubble');
    if (bubble) bubble.style.display = 'none';

    // Disparamos showWelcome directo. La propia función showWelcome 
    // se encargará de verificar si ya saludó o no, gracias al fix anterior.
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
    if (wrap) wrap.style.display = 'flex'; // <-- MOSTRAR FAB AL CERRAR
  };

  /* ── HELPER: extraer texto de respuesta Gemini (cualquier forma) ── */
  function _extraerTextoGemini(datos) {
    if (!datos) return null;
    if (datos.candidates && datos.candidates[0] &&
        datos.candidates[0].content && datos.candidates[0].content.parts &&
        datos.candidates[0].content.parts[0])
      return datos.candidates[0].content.parts[0].text || null;
    return datos.reply || datos.respuesta || datos.text || datos.message ||
           datos.output || datos.result || null;
  }

  /* ── 1. LLAMADA AL BACKEND (APPS SCRIPT) con fallback a Gemini directo ── */
  /* ── 1. LLAMADA AL PROXY SEGURO (Cloud Function) ── */
  async function consultarFelix(historial) {
    var ultimoMensaje = historial.length ? historial[historial.length - 1].parts[0].text : '';
    var historialPrevio = historial.slice(0, -1);

    try {
      var resp = await fetch(FELIX_CFG.PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ texto: ultimoMensaje, historial: historialPrevio })
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      var datos = await resp.json();
      var texto = _extraerTextoGemini(datos);
      if (texto) return texto;
      throw new Error('Respuesta vacia del proxy');
    } catch (e) {
      console.error('[Felix·Proxy] Error:', e.message);
      return '⚠️ Lo siento, tuve un problema de conexión. Por favor, intenta de nuevo en unos segundos.';
    }
  }

  /* ── 2. FUNCIÓN PRINCIPAL DE UI DE FELIX ── */
   async function felixSendMessage(userText) {
    if (!userText.trim() || isLoading) return;
    isLoading = true;
    appendMessage('user', userText);
    clearInput();
    showTyping(true);
    scrollToBottom();

    // Inyectar system prompt en el primer turno (igual que la versión original)
    if (chatHistory.length === 0) {
      chatHistory.push({ role: 'user',  parts: [{ text: 'INSTRUCCIONES DEL SISTEMA: ' + SYSTEM_PROMPT }] });
      chatHistory.push({ role: 'model', parts: [{ text: 'Entendido, soy Félix del Portal de Asociados FondoUne.' }] });
    }
    chatHistory.push({ role: 'user', parts: [{ text: userText }] });
    if (chatHistory.length > FELIX_CFG.HISTORY_LIMIT * 2) {
      chatHistory = chatHistory.slice(-FELIX_CFG.HISTORY_LIMIT * 2);
    }

    // Auditoría
    if (window.FU_Audit) FU_Audit.log('FELIX_IA', 'Consulta: ' + userText.substring(0, 60));

    var reply = await consultarFelix(chatHistory);

    chatHistory.push({ role: 'model', parts: [{ text: reply }] });
    showTyping(false);
    if(window.FU_Sound) FU_Sound.felixMsg();
    if(window.FU_Sound) FU_Sound.felixMsg();
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

   // Creamos una variable para recordar si ya saludamos
  var felixYaSaludo = false;

  window.showFelixWelcome = function() { if (window.showWelcome) window.showWelcome(); };

  window.showWelcome = function() {
    var list = document.getElementById('felixMessages');
    if (!list) return;
    
    // Si ya saludamos en esta sesión, no lo volvemos a hacer
    if (felixYaSaludo) return;

    // Inyectamos el mensaje
    appendMessage('felix', '¡Hola! 👋 Soy **Félix**, tu asistente del Portal de Asociados FondoUne.\n\nPuedo ayudarte con documentos para desembolso, datos del asociado, PQRS y otras solicitudes. ¿En qué te puedo ayudar hoy?');
    
    // Marcamos que ya saludó para que no lo repita si cierran y abren el panel
    felixYaSaludo = true;
  }
  
  window.felixChipClick = function(text) {
    if (!panelOpen) abrirFelix();
    var inp = document.getElementById('felixInput');
    if (inp) inp.value = text;
    felixSendMessage(text);
  };

  window.felixSend = function() {
    if(window.FU_Sound) FU_Sound.send();
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
  /* --- SALUDO AUTOMÁTICO REPARADO --- */
  document.addEventListener('DOMContentLoaded', function() {
    var fab = document.querySelector('.fab-felix') || document.getElementById('felixFab');
    if (fab) {
      fab.addEventListener('click', function() {
        setTimeout(function() {
          var list = document.getElementById('felixMessages');
          if (list && list.children.length === 0) {
            appendMessage('felix', '¡Hola! 👋 Soy **Félix**, tu asistente del Portal de Asociados FondoUne.\n\nPuedo ayudarte con documentos para desembolso, datos del asociado, PQRS y otras solicitudes. \u00bfEn qu\u00e9 te puedo ayudar hoy?');
            felixYaSaludo = true;
          }
        }, 350);
      });
    }
  });

})();

var SEG = (function() {
  'use strict';
  var ETIQUETAS = { pendiente:'Pendiente', revision:'En Revisión', aprobado:'Aprobado', rechazado:'Rechazado', desembolsado:'Desembolsado' };
  var ICONOS    = { compra:'🏠', construccion:'🏗️', gravamen:'📄' };
  function msg(tipo, txt) { var el = document.getElementById('segMsg'); el.className = 'seg-msg '+tipo; el.textContent = txt; el.style.display = 'block'; }
  function ocultarMsg() { document.getElementById('segMsg').style.display = 'none'; }
  function renderLista(lista) {
    var cont = document.getElementById('segResults');
    if (!lista || lista.length === 0) {
      cont.innerHTML = '<div class="seg-empty"><span class="seg-empty-ico">📭</span>No encontramos solicitudes con ese dato.<br><small>Verifica que la cédula o radicado sean correctos.</small></div>';
      cont.style.display = 'block'; return;
    }
    var html = '';
    lista.forEach(function(s) {
      var estado = (s.estado||'pendiente').toLowerCase().replace(/\s/g,'').replace('enrevisión','revision').replace('enrevision','revision');
      var tipo = (s.tipo||'compra').toLowerCase();
      var fecha = s.fechaRegistro ? new Date(s.fechaRegistro).toLocaleDateString('es-CO',{day:'2-digit',month:'2-digit',year:'numeric'}) : (s.fecha||'—');
      html += '<div class="seg-card"><div class="seg-card-ico '+tipo+'">'+(ICONOS[tipo]||'📋')+'</div><div class="seg-card-body"><div class="seg-card-id">'+(s.radicado||s.id||'—')+'</div><div class="seg-card-nombre">'+(s.nombreTitular||s.nombre||'—')+'</div><div class="seg-card-meta"><span>📅 '+fecha+'</span><span>👤 '+(s.asesor||'—')+'</span><span>📂 '+(s.tipoLabel||tipo)+'</span></div></div><div class="seg-estado '+estado+'">'+(ETIQUETAS[estado]||s.estado||'Pendiente')+'</div></div>';
    });
    cont.innerHTML = html; cont.style.display = 'block';
  }
  function buscarLocal(raw) {
    try {
      var norm = raw.replace(/\./g,'').replace(/,/g,'').trim().toUpperCase();
      var todas = JSON.parse(localStorage.getItem('fondounesolicitudes')||'[]');
      var res = todas.filter(function(s) {
        var c = (s.cedula||'').replace(/\./g,'').replace(/,/g,'').trim().toUpperCase();
        var r = (s.radicado||'').toUpperCase();
        return c===norm || r===norm || r.includes(norm);
      });
      res.sort(function(a,b){ return new Date(b.fechaRegistro||0)-new Date(a.fechaRegistro||0); });
      ocultarMsg();
      if (res.length) msg('info','📦 Resultados locales (sin conexión a la nube).');
      renderLista(res);
    } catch(e) { msg('err','❌ Error al buscar. Intenta nuevamente.'); }
  }
  function consultar() {
    var raw = (document.getElementById('segInput').value||'').trim();
    if (!raw || raw.replace(/\./g,'').replace(/\s/g,'').length < 4) { msg('err','⚠️ Ingresa al menos 4 caracteres de tu cédula o radicado.'); return; }
    document.getElementById('segResults').style.display = 'none';
    msg('info','🔍 Buscando tus solicitudes...');
    if (window._fbDB && window._fbDB !== null) {
      var cedNorm = raw.replace(/\./g,'').replace(/,/g,'').trim();
      var rawUp   = raw.toUpperCase().trim();
      Promise.all([
        window._fbDB.collection('solicitudes').where('cedula','==',cedNorm).get(),
        window._fbDB.collection('solicitudes').where('cedula','==',raw).get(),
        window._fbDB.collection('solicitudes').where('radicado','==',raw).get(),
        window._fbDB.collection('solicitudes').where('id','==',raw).get(),
        window._fbDB.collection('solicitudes').where('id','==',rawUp).get(),
        window._fbDB.collection('solicitudes').doc(raw).get()
          .then(function(d){ return { forEach: function(fn){ if(d.exists) fn(d); } }; })
          .catch(function(){ return { forEach: function(){} }; })
      ]).then(function(snaps) {
        var docs = {};
        snaps.forEach(function(snap){
          if (snap && typeof snap.forEach === 'function') {
            snap.forEach(function(d){ if(d.exists !== false) docs[d.id] = d.data(); });
          }
        });
        var lista = Object.values(docs);
        lista.sort(function(a,b){ return new Date(b.fechaRegistro||0)-new Date(a.fechaRegistro||0); });
        ocultarMsg(); renderLista(lista);
      }).catch(function(e){ console.warn('SEG error:',e.message); buscarLocal(raw); });
    } else { buscarLocal(raw); }
  }
  return { consultar: consultar };
}());
