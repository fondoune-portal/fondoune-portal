/* ═══════════════════════════════════════════════════════════════
   cancelaciones.js  —  Panel de Cancelaciones Hipotecarias
   FondoUne Portal Empleados  |  v1.0  Mayo 2026
   Depende de: firebase-config.js (window._fbDB), app.js (showToast, registrarAudit)
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Estado interno del módulo ──────────────────────────────── */
  var _casos        = [];          // todos los expedientes de Firestore
  var _filtrados    = [];          // después de aplicar filtros
  var _unsubscribe  = null;        // detener listener al salir
  var _modalDocId   = null;        // doc en edición
  var _chartEstados = null;
  var _chartCausas  = null;
  var _chartJsReady = false;

  /* ── SLA máximo por estado (días hábiles) ───────────────────── */
  var SLA = {
    'Radicada': 1, 'Docs incompletos': 3, 'En preparación': 5,
    'En notaría': 15, 'En registro ORIP': 5,
    'Completada': 0, 'Archivada': 0
  };

  var PASOS = {
    'Radicada': 1, 'Docs incompletos': 2, 'En preparación': 3,
    'En notaría': 5, 'En registro ORIP': 7,
    'Completada': 9, 'Archivada': 0
  };

  var BADGE = {
    'Radicada': 'canc-badge-rad', 'Docs incompletos': 'canc-badge-docs',
    'En preparación': 'canc-badge-prep', 'En notaría': 'canc-badge-not',
    'En registro ORIP': 'canc-badge-orip', 'Completada': 'canc-badge-comp',
    'Archivada': 'canc-badge-arch'
  };

  /* ── Festivos Colombia 2026 ─────────────────────────────────── */
  var FESTIVOS = {
    '2026-01-01':1,'2026-01-12':1,'2026-03-23':1,'2026-04-02':1,'2026-04-03':1,
    '2026-05-01':1,'2026-05-18':1,'2026-06-08':1,'2026-06-15':1,'2026-06-29':1,
    '2026-07-20':1,'2026-08-07':1,'2026-08-17':1,'2026-10-12':1,'2026-11-02':1,
    '2026-11-16':1,'2026-12-08':1,'2026-12-25':1
  };

  function diasHabiles(fechaIso) {
    if (!fechaIso) return 0;
    var inicio = new Date(fechaIso);
    var hoy    = new Date();
    inicio.setHours(0,0,0,0);
    hoy.setHours(0,0,0,0);
    var dias = 0, cur = new Date(inicio);
    while (cur < hoy) {
      var d = cur.getDay();
      var k = cur.toISOString().slice(0, 10);
      if (d !== 0 && d !== 6 && !FESTIVOS[k]) dias++;
      cur.setDate(cur.getDate() + 1);
    }
    return dias;
  }

  function getSla(caso) {
    var max = SLA[caso.estadoActual];
    if (max === undefined) max = 5;
    if (max === 0) return 'ok';
    var dias = typeof caso.diasEtapa === 'number'
      ? caso.diasEtapa
      : diasHabiles(caso.fechaUltimoMovimiento);
    var pct = dias / max;
    if (pct >= 1)   return 'danger';
    if (pct >= 0.8) return 'warn';
    return 'ok';
  }

  function diasTotales(caso) {
    return diasHabiles(caso.fechaRadicado);
  }

  /* ── Iniciar escucha Firestore ──────────────────────────────── */
  function iniciarEscucha() {
    if (!window._fbDB) {
      _renderTabla([]);
      _toast('Firebase no disponible. Recargue el portal.', 'warn');
      return;
    }
    if (_unsubscribe) return; // ya está escuchando

    _unsubscribe = window._fbDB
      .collection('cancelaciones')
      .orderBy('fechaRadicado', 'desc')
      .onSnapshot(function (snap) {
        _casos = [];
        snap.forEach(function (doc) {
          _casos.push(Object.assign({ _docId: doc.id }, doc.data()));
        });
        _poblarFiltrosCiudad();
        _aplicarFiltros();
        // Si el tab de Junta está activo, refrescar
        var tabJunta = document.getElementById('canc-tab-junta');
        if (tabJunta && tabJunta.classList.contains('canc-tab-active')) {
          _renderJunta();
        }
      }, function (err) {
        console.error('cancelaciones onSnapshot:', err);
        _toast('Error al leer cancelaciones: ' + err.message, 'error');
      });
  }

  function detenerEscucha() {
    if (_unsubscribe) { _unsubscribe(); _unsubscribe = null; }
  }

  /* ── Filtros ────────────────────────────────────────────────── */
  function _poblarFiltrosCiudad() {
    var sel = document.getElementById('canc-fil-ciudad');
    if (!sel) return;
    var actual = sel.value;
    var ciudades = [];
    _casos.forEach(function (c) {
      if (c.ciudadInmueble && ciudades.indexOf(c.ciudadInmueble) === -1) {
        ciudades.push(c.ciudadInmueble);
      }
    });
    ciudades.sort();
    sel.innerHTML = '<option value="">Todas las ciudades</option>' +
      ciudades.map(function (c) {
        return '<option value="' + c + '"' + (c === actual ? ' selected' : '') + '>' + c + '</option>';
      }).join('');
  }

  function _aplicarFiltros() {
    var fe = (document.getElementById('canc-fil-estado') || {}).value || '';
    var fs = (document.getElementById('canc-fil-sla')    || {}).value || '';
    var fc = (document.getElementById('canc-fil-ciudad') || {}).value || '';

    _filtrados = _casos.filter(function (c) {
      if (fe && c.estadoActual !== fe) return false;
      if (fc && c.ciudadInmueble !== fc) return false;
      if (fs && getSla(c) !== fs) return false;
      return true;
    });

    var cnt = document.getElementById('canc-fil-count');
    if (cnt) cnt.textContent = _filtrados.length + ' expediente' + (_filtrados.length !== 1 ? 's' : '');
    _renderTabla(_filtrados);
  }

  /* ── Render tabla operativa ─────────────────────────────────── */
  function _renderTabla(lista) {
    var tbody = document.getElementById('canc-tbody');
    if (!tbody) return;

    if (!lista || lista.length === 0) {
      tbody.innerHTML = '<tr><td colspan="11" class="canc-empty"><span>📂</span>No hay expedientes con estos filtros.</td></tr>';
      return;
    }

    tbody.innerHTML = lista.map(function (c) {
      var sla      = getSla(c);
      var badge    = BADGE[c.estadoActual] || 'canc-badge-rad';
      var pasos    = PASOS[c.estadoActual] || 0;
      var diasVal  = typeof c.diasEtapa === 'number' ? c.diasEtapa : diasHabiles(c.fechaUltimoMovimiento);
      var esCrit   = sla === 'danger' && c.estadoActual !== 'Completada' && c.estadoActual !== 'Archivada';
      var radicado = c.radicado || c._docId;

      var progreso = pasos > 0
        ? '<div class="canc-prog">' +
            [1,2,3,4,5,6,7,8,9].map(function (i) {
              return '<div class="canc-prog-step ' + (i <= pasos ? 'done' : '') + '"></div>';
            }).join('') +
          '</div>'
        : '<span class="canc-muted">Archivado</span>';

      var slaHtml  = '<span class="canc-sla ' + sla + '">' +
        '<span class="canc-sla-dot"></span>' +
        (sla === 'danger' ? 'Vencido' : sla === 'warn' ? 'Próximo' : 'En tiempo') +
        '</span>';

      var causaRaw = c.causaDemora || '';
      var causaHtml = (causaRaw && causaRaw !== '—' && causaRaw !== '-')
        ? '<span class="canc-causa" title="Causa de demora">' + causaRaw + '</span>'
        : '<span class="canc-muted">—</span>';

      var critTag = esCrit
        ? '&nbsp;<span class="canc-crit-tag">⚠</span>'
        : '';

      var asesorShort = (c.asesorEmail || '').split('@')[0] || '—';

      return '<tr>' +
        '<td><strong>' + radicado + '</strong>' + critTag + '</td>' +
        '<td>' + (c.nombreAsociado || '—') + '</td>' +
        '<td><span class="canc-badge ' + badge + '">' + (c.estadoActual || '—') + '</span></td>' +
        '<td>' + (c.ciudadInmueble || '—') + '</td>' +
        '<td>' + progreso + '</td>' +
        '<td>' + slaHtml + '</td>' +
        '<td class="' + (diasVal > 10 ? 'canc-dias-alerta' : '') + '">' + diasVal + 'd</td>' +
        '<td>' + causaHtml + '</td>' +
        '<td class="canc-cell-sm">' + (c.apoderadoAsignado || '—') + '</td>' +
        '<td class="canc-cell-sm">' + asesorShort + '</td>' +
        '<td><button class="canc-btn-sm" onclick="Cancelaciones.abrirModal(\'' + c._docId + '\')">Actualizar</button></td>' +
        '</tr>';
    }).join('');
  }

  /* ── MODAL: actualizar estado ───────────────────────────────── */
  function abrirModal(docId) {
    var caso = _casos.filter(function (c) { return c._docId === docId; })[0];
    if (!caso) return;
    _modalDocId = docId;

    var el = function (id) { return document.getElementById(id); };
    el('canc-modal-radicado').value  = caso.radicado || docId;
    el('canc-modal-estado').value    = caso.estadoActual || 'Radicada';
    el('canc-modal-causa').value     = caso.causaDemora  || '—';
    el('canc-modal-apoderado').value = caso.apoderadoAsignado || '';
    el('canc-modal-obs').value       = '';

    el('canc-modal-overlay').classList.add('open');
  }

  function cerrarModal() {
    _modalDocId = null;
    var o = document.getElementById('canc-modal-overlay');
    if (o) o.classList.remove('open');
  }

  function guardarCambioEstado() {
    if (!_modalDocId || !window._fbDB) return;

    var estado    = document.getElementById('canc-modal-estado').value;
    var causa     = document.getElementById('canc-modal-causa').value;
    var apoderado = document.getElementById('canc-modal-apoderado').value.trim();
    var obs       = document.getElementById('canc-modal-obs').value.trim();

    var update = {
      estadoActual:          estado,
      causaDemora:           causa,
      apoderadoAsignado:     apoderado || '—',
      fechaUltimoMovimiento: new Date().toISOString(),
      diasEtapa:             0,
      slaVencido:            false
    };
    if (obs) update.ultimaObservacion = obs;

    window._fbDB.collection('cancelaciones').doc(_modalDocId).update(update)
      .then(function () {
        // Registrar en auditoría del portal
        try {
          var caso = _casos.filter(function (c) { return c._docId === _modalDocId; })[0] || {};
          registrarAudit(
            'Cambio de estado cancelación: ' + estado,
            { id: _modalDocId, radicado: caso.radicado || _modalDocId },
            getUsuarioSesion()
          );
        } catch (e) { /* auditoría opcional */ }

        cerrarModal();
        _toast('Estado actualizado: ' + estado, 'ok');
      })
      .catch(function (e) {
        _toast('Error al guardar: ' + e.message, 'error');
      });
  }

  /* ── MODAL: nuevo expediente ────────────────────────────────── */
  function abrirModalNuevo() {
    var o = document.getElementById('canc-modal-nuevo-overlay');
    if (o) o.classList.add('open');
  }

  function cerrarModalNuevo() {
    var o = document.getElementById('canc-modal-nuevo-overlay');
    if (o) o.classList.remove('open');
  }

  function crearExpediente() {
    if (!window._fbDB) return;

    var radicado = (document.getElementById('canc-nuevo-radicado').value || '').trim();
    var nombre   = (document.getElementById('canc-nuevo-nombre').value   || '').trim();
    var email    = (document.getElementById('canc-nuevo-email').value    || '').trim();
    var ciudad   = (document.getElementById('canc-nuevo-ciudad').value   || '').trim();
    var asesor   = (document.getElementById('canc-nuevo-asesor').value   || '').trim();

    if (!radicado || !nombre || !email) {
      _toast('Radicado, nombre y correo son obligatorios.', 'warn');
      return;
    }

    var ahora = new Date().toISOString();
    var doc = {
      radicado:              radicado,
      nombreAsociado:        nombre,
      emailAsociado:         email,
      ciudadInmueble:        ciudad || 'Medellín',
      asesorEmail:           asesor,
      estadoActual:          'Radicada',
      causaDemora:           '—',
      apoderadoAsignado:     '—',
      fechaRadicado:         ahora,
      fechaUltimoMovimiento: ahora,
      diasEtapa:             0,
      slaVencido:            false,
      requiereApoderado:     false,
      recordatoriosEnviados: 0
    };

    window._fbDB.collection('cancelaciones').add(doc)
      .then(function () {
        cerrarModalNuevo();
        _toast('Expediente ' + radicado + ' creado.', 'ok');
        ['canc-nuevo-radicado','canc-nuevo-nombre','canc-nuevo-email',
         'canc-nuevo-ciudad','canc-nuevo-asesor'].forEach(function (id) {
          var el = document.getElementById(id);
          if (el) el.value = '';
        });
      })
      .catch(function (e) {
        _toast('Error al crear: ' + e.message, 'error');
      });
  }

  /* ── Dashboard Junta ────────────────────────────────────────── */
  function _renderJunta() {
    var activas     = _casos.filter(function (c) { return c.estadoActual !== 'Completada' && c.estadoActual !== 'Archivada'; });
    var completadas = _casos.filter(function (c) { return c.estadoActual === 'Completada'; });
    var archivadas  = _casos.filter(function (c) { return c.estadoActual === 'Archivada'; });
    var criticos    = activas.filter(function (c) { return getSla(c) === 'danger'; });
    var backlog     = activas.filter(function (c) { return diasTotales(c) > 45; });

    var tiempos = completadas.map(function (c) { return diasTotales(c); }).filter(function (d) { return d > 0; });
    var prom = tiempos.length ? Math.round(tiempos.reduce(function (a, b) { return a + b; }, 0) / tiempos.length) : 0;
    var dentroPlazo = completadas.filter(function (c) { return diasTotales(c) <= 45; }).length;
    var pct = completadas.length ? Math.round(dentroPlazo / completadas.length * 100) : 0;

    // Semáforo
    var semColor = 'canc-sem-green', semTxt = 'Verde — Gestión dentro de parámetros.';
    if (prom > 55 || pct < 70) { semColor = 'canc-sem-red'; semTxt = 'Rojo — Requiere atención inmediata.'; }
    else if (prom > 45 || pct < 80) { semColor = 'canc-sem-yellow'; semTxt = 'Amarillo — Seguimiento necesario.'; }

    var semBar = document.getElementById('canc-sem-bar');
    if (semBar) {
      semBar.className = 'canc-sem-bar ' + semColor;
      semBar.innerHTML = '<span class="canc-sem-dot"></span>' +
        '<div><strong id="canc-sem-label">Estado del período: ' + semTxt.split('—')[0].trim() + '</strong>' +
        '<span class="canc-sem-desc"> — ' + pct + '% de casos dentro del plazo. Tiempo promedio: ' + (prom || '—') + ' días hábiles.</span></div>';
    }

    // KPIs
    var kpis = [
      { l:'Expedientes activos',   v: activas.length,     s:'Total en proceso',    c:'' },
      { l:'Completadas',           v: completadas.length, s:'Trámite finalizado',  c:'ok' },
      { l:'Tiempo prom. cierre',   v: prom ? prom+'d.h.' : '—', s:'Meta: ≤45 d.h.', c: prom > 45 ? 'warn' : prom > 0 ? 'ok' : '' },
      { l:'% dentro del plazo',    v: pct+'%',            s:'Meta: ≥80%',          c: pct >= 80 ? 'ok' : pct >= 70 ? 'warn' : 'danger' },
      { l:'Alertas críticas',      v: criticos.length,    s:'SLA vencido',         c: criticos.length > 0 ? 'danger' : '' },
      { l:'Archivadas (inactividad)', v: archivadas.length, s:'Sin respuesta del asociado', c: archivadas.length > 2 ? 'warn' : '' },
      { l:'Backlog >45 días',      v: backlog.length,     s:'Sin cerrar',          c: backlog.length > 3 ? 'warn' : '' },
      { l:'Total histórico',       v: _casos.length,      s:'Desde el inicio',     c:'' }
    ];

    var kpiGrid = document.getElementById('canc-kpi-grid');
    if (kpiGrid) {
      kpiGrid.innerHTML = kpis.map(function (k) {
        return '<div class="canc-kpi ' + k.c + '">' +
          '<div class="canc-kpi-label">' + k.l + '</div>' +
          '<div class="canc-kpi-val">' + k.v + '</div>' +
          '<div class="canc-kpi-sub">' + k.s + '</div>' +
        '</div>';
      }).join('');
    }

    // Tabla críticos
    var tcrit = document.getElementById('canc-tbody-criticos');
    if (tcrit) {
      if (criticos.length === 0) {
        tcrit.innerHTML = '<tr><td colspan="6" class="canc-empty"><span>✅</span>Sin casos críticos.</td></tr>';
      } else {
        tcrit.innerHTML = criticos.map(function (c) {
          var badge = BADGE[c.estadoActual] || 'canc-badge-rad';
          var d = diasTotales(c);
          return '<tr>' +
            '<td><strong>' + (c.radicado || c._docId) + '</strong></td>' +
            '<td>' + (c.nombreAsociado || '—') + '</td>' +
            '<td><span class="canc-badge ' + badge + '">' + c.estadoActual + '</span></td>' +
            '<td class="canc-dias-alerta">' + d + ' d.h.</td>' +
            '<td>' + (c.causaDemora || '—') + '</td>' +
            '<td class="canc-cell-sm">' + ((c.asesorEmail || '—').split('@')[0]) + '</td>' +
          '</tr>';
        }).join('');
      }
    }

    // Gráficas — requieren Chart.js
    if (typeof Chart === 'undefined') {
      _cargarChartJs(function () { _dibujarGraficas(activas); });
    } else {
      _dibujarGraficas(activas);
    }
  }

  function _cargarChartJs(cb) {
    if (_chartJsReady) { cb(); return; }
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js';
    s.onload = function () { _chartJsReady = true; cb(); };
    document.head.appendChild(s);
  }

  function _dibujarGraficas(activas) {
    // Conteo por estado
    var estadoCounts = {};
    activas.forEach(function (c) {
      estadoCounts[c.estadoActual] = (estadoCounts[c.estadoActual] || 0) + 1;
    });

    // Conteo por causa
    var causaCounts = {};
    _casos.forEach(function (c) {
      var ca = c.causaDemora;
      if (ca && ca !== '—' && ca !== '-' && ca !== '') {
        causaCounts[ca] = (causaCounts[ca] || 0) + 1;
      }
    });

    var colEstado = { 'Radicada':'#185FA5','Docs incompletos':'#BA7517','En preparación':'#534AB7','En notaría':'#0F6E56','En registro ORIP':'#633806','Archivada':'#5F5E5A' };
    var colCausa  = ['#BA7517','#185FA5','#3B6D11','#854F0B','#533AB7','#A32D2D','#5F5E5A'];

    var c1 = document.getElementById('canc-chart-estados');
    var c2 = document.getElementById('canc-chart-causas');
    if (!c1 || !c2) return;

    if (_chartEstados) _chartEstados.destroy();
    if (_chartCausas)  _chartCausas.destroy();

    _chartEstados = new Chart(c1, {
      type: 'doughnut',
      data: {
        labels: Object.keys(estadoCounts),
        datasets: [{ data: Object.values(estadoCounts), backgroundColor: Object.keys(estadoCounts).map(function (k) { return colEstado[k] || '#888'; }), borderWidth: 0 }]
      },
      options: { responsive:true, maintainAspectRatio:false, cutout:'60%', plugins:{ legend:{ labels:{ font:{size:11}, boxWidth:10, padding:8 } } } }
    });

    var causaLabels = Object.keys(causaCounts).length ? Object.keys(causaCounts) : ['Sin datos'];
    var causaVals   = Object.values(causaCounts).length ? Object.values(causaCounts) : [1];
    _chartCausas = new Chart(c2, {
      type: 'doughnut',
      data: { labels: causaLabels, datasets: [{ data: causaVals, backgroundColor: colCausa, borderWidth: 0 }] },
      options: { responsive:true, maintainAspectRatio:false, cutout:'60%', plugins:{ legend:{ labels:{ font:{size:11}, boxWidth:10, padding:8 } } } }
    });
  }

  /* ── Tabs del panel ─────────────────────────────────────────── */
  function switchTab(tab) {
    var tabs  = document.querySelectorAll('.canc-tab');
    var views = document.querySelectorAll('.canc-view');
    tabs.forEach(function (t) { t.classList.remove('canc-tab-active'); });
    views.forEach(function (v) { v.classList.remove('active'); });

    var selTab  = document.getElementById('canc-tab-' + tab);
    var selView = document.getElementById('canc-view-' + tab);
    if (selTab)  selTab.classList.add('canc-tab-active');
    if (selView) selView.classList.add('active');

    if (tab === 'junta') _renderJunta();
  }

  /* ── Toast interno (fallback al del portal si existe) ───────── */
  function _toast(msg, tipo) {
    if (typeof showToast === 'function') {
      var ico = tipo === 'ok' ? '✅' : tipo === 'warn' ? '⚠️' : tipo === 'error' ? '❌' : 'ℹ️';
      showToast(msg, ico);
    } else {
      console.log('[Cancelaciones]', msg);
    }
  }

  /* ── Inicialización del panel ───────────────────────────────── */
  function init() {
    // Bindear filtros
    var bindChange = function (id, fn) {
      var el = document.getElementById(id);
      if (el) el.onchange = fn;
    };
    bindChange('canc-fil-estado',  _aplicarFiltros);
    bindChange('canc-fil-sla',     _aplicarFiltros);
    bindChange('canc-fil-ciudad',  _aplicarFiltros);

    // Cerrar modales con Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { cerrarModal(); cerrarModalNuevo(); }
    });

    // Cerrar modal al clic en overlay
    var o1 = document.getElementById('canc-modal-overlay');
    var o2 = document.getElementById('canc-modal-nuevo-overlay');
    if (o1) o1.addEventListener('click', function (e) { if (e.target === o1) cerrarModal(); });
    if (o2) o2.addEventListener('click', function (e) { if (e.target === o2) cerrarModalNuevo(); });

    iniciarEscucha();
  }

  /* ── API pública ─────────────────────────────────────────────── */
  window.Cancelaciones = {
    init:              init,
    detener:           detenerEscucha,
    switchTab:         switchTab,
    abrirModal:        abrirModal,
    cerrarModal:       cerrarModal,
    guardar:           guardarCambioEstado,
    abrirModalNuevo:   abrirModalNuevo,
    cerrarModalNuevo:  cerrarModalNuevo,
    crearExpediente:   crearExpediente,
    aplicarFiltros:    _aplicarFiltros
  };

})();
