// ============================================================
//  CANCELACIONES.JS — Panel de Cancelaciones Hipotecarias
//  FondoUne · Portal Empleados
//  Conectado a Firestore · Colección: cancelaciones
// ============================================================

window.Cancelaciones = (function () {

  var _iniciado = false;
  var _unsub    = null; // listener Firestore en tiempo real

  // ── Estados del proceso ──────────────────────────────────
  var ESTADOS = {
    activo:     { lbl: 'Activo',       color: '#6B7280', bg: '#F3F4F6' },
    en_proceso: { lbl: 'En Proceso',   color: '#D97706', bg: '#FEF3C7' },
    etapa_final:{ lbl: 'Etapa Final',  color: '#EA580C', bg: '#FFF7ED' },
    completado: { lbl: 'Completado',   color: '#16A34A', bg: '#F0FDF4' },
    bloqueado:  { lbl: 'Bloqueado',    color: '#DC2626', bg: '#FEF2F2' },
  };

  // ── Etapas ───────────────────────────────────────────────
  var ETAPAS = [
    'Paz y Salvo',
    'Solicitud Documentos',
    'Envío Minuta',
    'Recepción Minuta',
    'VB Minuta',
    'Escrituración',
    'CTL Actualizado',
  ];

  // ── Helpers DOM ──────────────────────────────────────────
  function $id(id) { return document.getElementById(id); }
  function fmt(d)  { if (!d) return '—'; try { return new Date(d).toLocaleDateString('es-CO', { day:'2-digit', month:'2-digit', year:'numeric' }); } catch(e){ return d; } }
  function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // ── Estado badge ─────────────────────────────────────────
  function estadoBadge(estado) {
    var e = ESTADOS[estado] || ESTADOS['activo'];
    return '<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;color:'+e.color+';background:'+e.bg+';">'+e.lbl+'</span>';
  }

  // ── Barra de progreso etapas ─────────────────────────────
  function etapaBar(etapaActual) {
    var n = parseInt(etapaActual) || 0;
    var pct = Math.round((n / 7) * 100);
    var color = n >= 7 ? '#16A34A' : n >= 5 ? '#EA580C' : '#D97706';
    return '<div style="display:flex;align-items:center;gap:8px;">'
      + '<div style="flex:1;height:6px;background:#E5E7EB;border-radius:3px;overflow:hidden;">'
      + '<div style="width:'+pct+'%;height:100%;background:'+color+';border-radius:3px;transition:width .3s;"></div>'
      + '</div>'
      + '<span style="font-size:11px;color:#6B7280;white-space:nowrap;">'+n+'/7</span>'
      + '</div>';
  }

  // ── Calcular estado automático por etapas ────────────────
  function calcEstado(etapa) {
    var n = parseInt(etapa) || 0;
    if (n >= 7)  return 'completado';
    if (n >= 5)  return 'etapa_final';
    if (n >= 1)  return 'en_proceso';
    return 'activo';
  }

  // ── KPIs ─────────────────────────────────────────────────
  function renderKPIs(docs) {
    var total      = docs.length;
    var completado = docs.filter(function(d){ return d.estado === 'completado'; }).length;
    var enProceso  = docs.filter(function(d){ return d.estado === 'en_proceso'; }).length;
    var etapaFinal = docs.filter(function(d){ return d.estado === 'etapa_final'; }).length;
    var bloqueado  = docs.filter(function(d){ return d.estado === 'bloqueado'; }).length;
    var pct        = total ? Math.round((completado / total) * 100) : 0;

    var kpis = [
      { val: total,      lbl: 'Total casos',          ico: '📁', color: '#2C3E50' },
      { val: completado, lbl: 'Completados',           ico: '✅', color: '#16A34A' },
      { val: enProceso,  lbl: 'En proceso',            ico: '⏳', color: '#D97706' },
      { val: etapaFinal, lbl: 'Etapa final',           ico: '🔜', color: '#EA580C' },
      { val: bloqueado,  lbl: 'Bloqueados',            ico: '🚫', color: '#DC2626' },
      { val: pct + '%',  lbl: 'Tasa de finalización', ico: '📊', color: '#7C3AED' },
    ];

    return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:20px;">'
      + kpis.map(function(k){
          return '<div style="background:#fff;border-radius:12px;padding:16px 14px;border:1px solid #E5E7EB;text-align:center;">'
            + '<div style="font-size:20px;margin-bottom:4px;">'+k.ico+'</div>'
            + '<div style="font-size:26px;font-weight:700;color:'+k.color+';">'+k.val+'</div>'
            + '<div style="font-size:11px;color:#6B7280;margin-top:2px;">'+k.lbl+'</div>'
            + '</div>';
        }).join('')
      + '</div>';
  }

  // ── Tabla principal ──────────────────────────────────────
  function renderTabla(docs, filtroEstado, filtroTexto) {
    var filtrados = docs.filter(function(d) {
      var okEstado = !filtroEstado || filtroEstado === 'todos' || d.estado === filtroEstado;
      var txt = (filtroTexto || '').toLowerCase();
      var okTexto = !txt
        || (d.nombre  || '').toLowerCase().includes(txt)
        || (d.cedula  || '').toLowerCase().includes(txt)
        || (d.empresa || '').toLowerCase().includes(txt)
        || (d.id      || '').toLowerCase().includes(txt);
      return okEstado && okTexto;
    });

    if (!filtrados.length) {
      return '<div style="text-align:center;padding:48px;color:#9CA3AF;">No hay casos que coincidan con el filtro.</div>';
    }

    var rows = filtrados.map(function(d, i) {
      var bgRow = i % 2 === 0 ? '#fff' : '#F9FAFB';
      return '<tr style="background:'+bgRow+';border-bottom:1px solid #E5E7EB;">'
        + '<td style="padding:12px 10px;font-size:13px;font-weight:600;color:#111;">'+escHtml(d.nombre||'—')+'</td>'
        + '<td style="padding:12px 10px;font-size:12px;color:#6B7280;">'+escHtml(d.cedula||'—')+'</td>'
        + '<td style="padding:12px 10px;font-size:12px;color:#6B7280;">'+escHtml(d.empresa||'—')+'</td>'
        + '<td style="padding:12px 10px;">'+estadoBadge(d.estado)+'</td>'
        + '<td style="padding:12px 10px;min-width:160px;">'+etapaBar(d.etapaActual)+'</td>'
        + '<td style="padding:12px 10px;font-size:11px;color:#9CA3AF;">'+fmt(d.fechaIngreso)+'</td>'
        + '<td style="padding:12px 10px;font-size:11px;color:#9CA3AF;">'+fmt(d.fechaUltGestion)+'</td>'
        + '<td style="padding:12px 10px;">'
            + '<button onclick="Cancelaciones.abrirDetalle(\''+d.id+'\')" style="background:#E8511A;color:#fff;border:none;border-radius:8px;padding:5px 12px;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;">Ver</button>'
        + '</td>'
        + '</tr>';
    }).join('');

    return '<div style="overflow-x:auto;border-radius:12px;border:1px solid #E5E7EB;background:#fff;">'
      + '<table style="width:100%;border-collapse:collapse;">'
      + '<thead><tr style="background:#2C3E50;">'
      + '<th style="padding:10px;text-align:left;font-size:11px;font-weight:600;color:#fff;white-space:nowrap;">Nombre</th>'
      + '<th style="padding:10px;text-align:left;font-size:11px;font-weight:600;color:#fff;">Cédula</th>'
      + '<th style="padding:10px;text-align:left;font-size:11px;font-weight:600;color:#fff;">Empresa</th>'
      + '<th style="padding:10px;text-align:left;font-size:11px;font-weight:600;color:#fff;">Estado</th>'
      + '<th style="padding:10px;text-align:left;font-size:11px;font-weight:600;color:#fff;min-width:160px;">Progreso</th>'
      + '<th style="padding:10px;text-align:left;font-size:11px;font-weight:600;color:#fff;white-space:nowrap;">F. Ingreso</th>'
      + '<th style="padding:10px;text-align:left;font-size:11px;font-weight:600;color:#fff;white-space:nowrap;">Últ. Gestión</th>'
      + '<th style="padding:10px;text-align:left;font-size:11px;font-weight:600;color:#fff;"></th>'
      + '</tr></thead>'
      + '<tbody>'+rows+'</tbody>'
      + '</table>'
      + '</div>';
  }

  // ── Render principal del panel ───────────────────────────
  function render(docs) {
    var container = $id('cancelaciones-root');
    if (!container) return;

    var filtroEstado = ($id('can-filtro-estado') || {}).value || 'todos';
    var filtroTexto  = ($id('can-filtro-texto')  || {}).value || '';

    container.innerHTML =
      // KPIs
      renderKPIs(docs) +

      // Barra de filtros
      '<div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;align-items:center;">'
        + '<input id="can-filtro-texto" placeholder="🔍 Buscar por nombre, cédula, empresa…" value="'+escHtml(filtroTexto)+'"'
          + ' style="flex:1;min-width:200px;padding:9px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;font-family:inherit;outline:none;"'
          + ' oninput="Cancelaciones._filtrar()" />'
        + '<select id="can-filtro-estado" onchange="Cancelaciones._filtrar()"'
          + ' style="padding:9px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;font-family:inherit;background:#fff;outline:none;">'
          + '<option value="todos"'+(filtroEstado==='todos'?' selected':'')+'>Todos los estados</option>'
          + Object.keys(ESTADOS).map(function(k){
              return '<option value="'+k+'"'+(filtroEstado===k?' selected':'')+'>'+ESTADOS[k].lbl+'</option>';
            }).join('')
        + '</select>'
        + '<button onclick="Cancelaciones.abrirNuevo()" style="background:#E8511A;color:#fff;border:none;border-radius:10px;padding:9px 18px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap;">+ Nuevo caso</button>'
      + '</div>'

      // Tabla
      + renderTabla(docs, filtroEstado, filtroTexto);

    // Restaurar listeners de filtro con datos actuales
    var inp = $id('can-filtro-texto');
    var sel = $id('can-filtro-estado');
    if (inp) inp.oninput = function() { _filtrar(docs); };
    if (sel) sel.onchange = function() { _filtrar(docs); };
  }

  // Filtrar sin recargar Firestore
  var _cachedDocs = [];
  function _filtrar(docs) {
    var d = docs || _cachedDocs;
    var filtroEstado = ($id('can-filtro-estado') || {}).value || 'todos';
    var filtroTexto  = ($id('can-filtro-texto')  || {}).value || '';
    var tabla = $id('can-tabla-wrap');
    if (!tabla) return;
    tabla.innerHTML = renderTabla(d, filtroEstado, filtroTexto);
  }

  // ── Cargar datos desde Firestore ─────────────────────────
  function cargar() {
    var container = $id('cancelaciones-root');
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;padding:60px;color:#9CA3AF;">Cargando datos…</div>';

    if (!window._fbDB) {
      container.innerHTML = '<div style="padding:40px;text-align:center;color:#DC2626;">Firebase no está inicializado. Verifica la configuración.</div>';
      return;
    }

    // Listener en tiempo real
    if (_unsub) _unsub();
    _unsub = window._fbDB.collection('cancelaciones')
      .orderBy('fechaIngreso', 'desc')
      .onSnapshot(function(snap) {
        _cachedDocs = [];
        snap.forEach(function(doc) { _cachedDocs.push(doc.data()); });
        render(_cachedDocs);
        // Restaurar listeners de filtro
        var inp = $id('can-filtro-texto');
        var sel = $id('can-filtro-estado');
        if (inp) inp.oninput  = function() { _filtrar(); };
        if (sel) sel.onchange = function() { _filtrar(); };
      }, function(e) {
        var container2 = $id('cancelaciones-root');
        if (container2) container2.innerHTML = '<div style="padding:40px;text-align:center;color:#DC2626;">Error al cargar datos: '+e.message+'</div>';
      });
  }

  // ── Modal: Ver / Editar detalle ──────────────────────────
  function abrirDetalle(id) {
    var doc = _cachedDocs.find(function(d){ return d.id === id; });
    if (!doc) return;

    var etapasSel = ETAPAS.map(function(e, i) {
      var n = i + 1;
      var chk = parseInt(doc.etapaActual) >= n;
      return '<label style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;cursor:pointer;background:'+(chk?'#F0FDF4':'#F9FAFB')+';border:1px solid '+(chk?'#BBF7D0':'#E5E7EB')+';">'
        + '<input type="checkbox" data-etapa="'+n+'" '+(chk?'checked':'')+' onchange="Cancelaciones._toggleEtapa(\''+id+'\',this)">'
        + '<span style="font-size:12px;font-weight:'+(chk?'600':'400')+';color:'+(chk?'#16A34A':'#374151')+';">'+n+'. '+e+'</span>'
        + '</label>';
    }).join('');

    var body = ''
      + '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">'
        + '<div>'
          + '<h2 style="font-size:18px;font-weight:700;color:#111;margin:0 0 4px;">'+escHtml(doc.nombre||'—')+'</h2>'
          + '<div style="font-size:12px;color:#6B7280;">CC '+escHtml(doc.cedula||'—')+' · '+escHtml(doc.empresa||'—')+'</div>'
        + '</div>'
        + estadoBadge(doc.estado)
      + '</div>'

      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;">'
        + _campo('Fecha ingreso', fmt(doc.fechaIngreso))
        + _campo('Últ. gestión', fmt(doc.fechaUltGestion))
        + _campo('Responsable', doc.responsable || '—')
        + _campo('Observaciones', doc.observaciones || '—')
      + '</div>'

      + '<div style="margin-bottom:20px;">'
        + '<div style="font-size:12px;font-weight:600;color:#374151;margin-bottom:10px;">Progreso por etapas</div>'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">'+etapasSel+'</div>'
      + '</div>'

      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;">'
        + '<div>'
          + '<label style="font-size:11px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Estado</label>'
          + '<select id="can-det-estado" style="width:100%;padding:8px 10px;border:1.5px solid #E5E7EB;border-radius:8px;font-family:inherit;font-size:13px;">'
          + Object.keys(ESTADOS).map(function(k){
              return '<option value="'+k+'"'+(doc.estado===k?' selected':'')+'>'+ESTADOS[k].lbl+'</option>';
            }).join('')
          + '</select>'
        + '</div>'
        + '<div>'
          + '<label style="font-size:11px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Responsable</label>'
          + '<input id="can-det-resp" value="'+escHtml(doc.responsable||'')+'" style="width:100%;padding:8px 10px;border:1.5px solid #E5E7EB;border-radius:8px;font-family:inherit;font-size:13px;box-sizing:border-box;">'
        + '</div>'
      + '</div>'

      + '<div style="margin-bottom:20px;">'
        + '<label style="font-size:11px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Observaciones</label>'
        + '<textarea id="can-det-obs" rows="3" style="width:100%;padding:8px 10px;border:1.5px solid #E5E7EB;border-radius:8px;font-family:inherit;font-size:13px;resize:vertical;box-sizing:border-box;">'+escHtml(doc.observaciones||'')+'</textarea>'
      + '</div>'

      + '<div style="display:flex;gap:10px;justify-content:flex-end;">'
        + '<button onclick="Cancelaciones._cerrarModal()" style="padding:9px 20px;border:1.5px solid #E5E7EB;background:#fff;border-radius:10px;font-family:inherit;font-size:13px;cursor:pointer;">Cancelar</button>'
        + '<button onclick="Cancelaciones._guardarDetalle(\''+id+'\')" style="padding:9px 20px;background:#E8511A;color:#fff;border:none;border-radius:10px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;">Guardar cambios</button>'
      + '</div>';

    _abrirModal(doc.nombre || 'Caso', body);
  }

  function _campo(lbl, val) {
    return '<div style="background:#F9FAFB;border-radius:8px;padding:10px 12px;">'
      + '<div style="font-size:10px;color:#9CA3AF;margin-bottom:2px;">'+lbl+'</div>'
      + '<div style="font-size:13px;color:#111;font-weight:500;">'+escHtml(val)+'</div>'
      + '</div>';
  }

  function _toggleEtapa(docId, chk) {
    // Calcula la etapa máxima marcada
    var modal = $id('can-modal-body');
    if (!modal) return;
    var checks = Array.from(modal.querySelectorAll('input[data-etapa]'));
    var max = 0;
    checks.forEach(function(c) { if (c.checked) max = Math.max(max, parseInt(c.dataset.etapa)); });
    // Actualiza Firestore
    if (!window._fbDB) return;
    window._fbDB.collection('cancelaciones').doc(docId).update({
      etapaActual: max,
      estado: calcEstado(max),
      fechaUltGestion: new Date().toISOString()
    });
  }

  function _guardarDetalle(docId) {
    if (!window._fbDB) return;
    var estado = ($id('can-det-estado') || {}).value;
    var resp   = ($id('can-det-resp')   || {}).value;
    var obs    = ($id('can-det-obs')    || {}).value;
    window._fbDB.collection('cancelaciones').doc(docId).update({
      estado: estado,
      responsable: resp,
      observaciones: obs,
      fechaUltGestion: new Date().toISOString()
    }).then(function() {
      _cerrarModal();
    }).catch(function(e) { alert('Error al guardar: ' + e.message); });
  }

  // ── Modal: Nuevo caso ────────────────────────────────────
  function abrirNuevo() {
    var hoy = new Date().toISOString().split('T')[0];
    var body = ''
      + '<h2 style="font-size:17px;font-weight:700;color:#111;margin:0 0 20px;">Nuevo caso de cancelación</h2>'

      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">'
        + _input('can-n-nombre',    'Nombre completo *',      'text',  'María García López')
        + _input('can-n-cedula',    'Número de cédula *',     'text',  '1.234.567.890')
        + _input('can-n-empresa',   'Empresa',                'text',  'UNE / Tigo')
        + _input('can-n-resp',      'Responsable FondoUne',   'text',  'Jenny Quintero')
        + _input('can-n-fecha',     'Fecha de ingreso',       'date',  hoy)
      + '</div>'

      + '<div style="margin-bottom:16px;">'
        + '<label style="font-size:11px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Observaciones iniciales</label>'
        + '<textarea id="can-n-obs" rows="3" style="width:100%;padding:8px 10px;border:1.5px solid #E5E7EB;border-radius:8px;font-family:inherit;font-size:13px;resize:vertical;box-sizing:border-box;" placeholder="Detalles relevantes del caso…"></textarea>'
      + '</div>'

      + '<div id="can-n-error" style="color:#DC2626;font-size:12px;margin-bottom:10px;display:none;"></div>'

      + '<div style="display:flex;gap:10px;justify-content:flex-end;">'
        + '<button onclick="Cancelaciones._cerrarModal()" style="padding:9px 20px;border:1.5px solid #E5E7EB;background:#fff;border-radius:10px;font-family:inherit;font-size:13px;cursor:pointer;">Cancelar</button>'
        + '<button onclick="Cancelaciones._guardarNuevo()" style="padding:9px 20px;background:#E8511A;color:#fff;border:none;border-radius:10px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;">Crear caso</button>'
      + '</div>';

    _abrirModal('Nuevo caso', body);
  }

  function _input(id, lbl, type, placeholder) {
    return '<div>'
      + '<label style="font-size:11px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">'+lbl+'</label>'
      + '<input id="'+id+'" type="'+type+'" placeholder="'+placeholder+'" style="width:100%;padding:8px 10px;border:1.5px solid #E5E7EB;border-radius:8px;font-family:inherit;font-size:13px;box-sizing:border-box;">'
      + '</div>';
  }

  function _guardarNuevo() {
    if (!window._fbDB) return;
    var nombre  = ($id('can-n-nombre')  || {}).value || '';
    var cedula  = ($id('can-n-cedula')  || {}).value || '';
    var empresa = ($id('can-n-empresa') || {}).value || '';
    var resp    = ($id('can-n-resp')    || {}).value || '';
    var fecha   = ($id('can-n-fecha')   || {}).value || new Date().toISOString().split('T')[0];
    var obs     = ($id('can-n-obs')     || {}).value || '';

    var errEl = $id('can-n-error');
    if (!nombre.trim() || !cedula.trim()) {
      if (errEl) { errEl.textContent = 'Nombre y cédula son obligatorios.'; errEl.style.display = 'block'; }
      return;
    }

    var id = 'CAN-' + Date.now();
    var data = {
      id: id,
      nombre:          nombre.trim(),
      cedula:          cedula.trim(),
      empresa:         empresa.trim(),
      responsable:     resp.trim(),
      fechaIngreso:    new Date(fecha).toISOString(),
      fechaUltGestion: new Date().toISOString(),
      etapaActual:     0,
      estado:          'activo',
      observaciones:   obs.trim(),
    };

    window._fbDB.collection('cancelaciones').doc(id).set(data)
      .then(function() { _cerrarModal(); })
      .catch(function(e) { alert('Error al crear caso: ' + e.message); });
  }

  // ── Modal genérico ───────────────────────────────────────
  function _abrirModal(titulo, body) {
    var ov = $id('can-modal-overlay');
    var bd = $id('can-modal-body');
    if (!ov || !bd) return;
    bd.innerHTML = body;
    ov.style.display = 'flex';
  }

  function _cerrarModal() {
    var ov = $id('can-modal-overlay');
    if (ov) ov.style.display = 'none';
  }

  // ── Init ─────────────────────────────────────────────────
  function init() {
    if (!$id('cancelaciones-root')) return;
    cargar();
  }

  // API pública
  return {
    init:          init,
    abrirDetalle:  abrirDetalle,
    abrirNuevo:    abrirNuevo,
    _filtrar:      _filtrar,
    _toggleEtapa:  _toggleEtapa,
    _guardarDetalle: _guardarDetalle,
    _guardarNuevo: _guardarNuevo,
    _cerrarModal:  _cerrarModal,
  };
})();
