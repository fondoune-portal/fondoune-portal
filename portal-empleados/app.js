var DB_KEY = 'fondoune_solicitudes';
var AUDIT_KEY = 'fondoune_auditoria';
var solicitudActual = null;
var paginaActual = 1;
var POR_PAGINA = 10;
var notificacionesLeidas = JSON.parse(localStorage.getItem('fu_notif_leidas') || '[]');

/* ═══ INDICADOR FIREBASE ═══ */
function mostrarEstadoFirebase() {
  var bar = document.getElementById('fbStatusBar');
  if (!bar) return;
  if (window._fbIniciado) {
    bar.innerHTML = '<span style="display:flex;align-items:center;gap:6px;color:#6EE7B7;font-size:11px;"><span style="width:7px;height:7px;border-radius:50%;background:#10B981;display:inline-block;animation:pulse 2s infinite"></span> Base de datos en la nube activa</span>';
  } else {
    bar.innerHTML = '<span style="display:flex;align-items:center;gap:6px;color:#FCD34D;font-size:11px;"><span style="width:7px;height:7px;border-radius:50%;background:#F59E0B;display:inline-block;"></span> Modo local (Firebase no configurado)</span>';
  }
}

/* ═══ DB — Lee desde Firebase o localStorage ═══ */
function cargarDB() {
  try { return JSON.parse(localStorage.getItem(DB_KEY) || '[]'); }
  catch(e) { return []; }
}
function guardarDB(d) {
  try { localStorage.setItem(DB_KEY, JSON.stringify(d)); return true; }
  catch(e) { return false; }
}

/* Guardar un documento en Firebase + localStorage */
function guardarEnFirebase(coleccion, id, datos, onOk, onErr) {
  if (window._fbDB) {
    window._fbDB.collection(coleccion).doc(id).set(datos, { merge: true })
      .then(function() { if (onOk) onOk(); })
      .catch(function(e) {
        console.warn('Firebase guardar error:', e);
        if (onErr) onErr(e);
      });
  }
}

/* Sincronizar desde Firebase a localStorage */
function sincronizarDesdeFirebase(callback) {
  if (!window._fbDB) { if(callback) callback(); return; }
  window._fbDB.collection('solicitudes')
    .orderBy('fechaRegistro', 'desc')
    .limit(500)
    .get()
    .then(function(snapshot) {
      var docs = [];
      snapshot.forEach(function(doc) { docs.push(doc.data()); });
      if (docs.length > 0) {
        localStorage.setItem(DB_KEY, JSON.stringify(docs));
      }
      if (callback) callback(docs);
    })
    .catch(function(e) {
      console.warn('Error sincronizando Firebase:', e);
      if (callback) callback();
    });
}

/* Escucha en tiempo real — actualiza el panel cuando llegan nuevas solicitudes */
function iniciarEscuchaFirebase() {
  if (!window._fbDB) return;
  window._fbDB.collection('solicitudes')
    .orderBy('fechaRegistro', 'desc')
    .onSnapshot(function(snapshot) {
      var docs = [];
      snapshot.forEach(function(doc) { docs.push(doc.data()); });
      localStorage.setItem(DB_KEY, JSON.stringify(docs));
      recargar();
      snapshot.docChanges().forEach(function(change) {
        if (change.type === 'added') {
          var d = change.doc.data();
          // Solo notificar si es reciente (últimos 30 segundos)
          var ahora = Date.now();
          var reg = new Date(d.fechaRegistro).getTime();
          if (ahora - reg < 30000) {
            var es_pqrs = d.tipo === 'pqrs';
            showToast((es_pqrs ? '💬 Nueva PQRS: ' : '📋 Nueva solicitud: ') + (d.nombre || d.nombreTitular || ''), es_pqrs ? '💬' : '🔔');
            agregarNotificacion(
              es_pqrs ? 'Nueva solicitud PQRS' : 'Nueva solicitud de crédito',
              (d.nombre || d.nombreTitular || 'Asociado') + ' — ' + (d.tipoLabel || d.tipo),
              d.id
            );
          }
        }
      });
    }, function(e) { console.warn('Firestore onSnapshot error:', e); });
}

function cargarAudit(){ try{return JSON.parse(localStorage.getItem(AUDIT_KEY)||'[]');}catch(e){return [];} }
function guardarAudit(d){ try{localStorage.setItem(AUDIT_KEY,JSON.stringify(d));}catch(e){} }

function getUsuarioSesion(){
  try{
    /* ✅ FIX: guard por si window.SEC aún no está disponible en el momento de llamar */
    var key = (window.SEC && window.SEC.SESS_KEY) ? window.SEC.SESS_KEY : 'fu_session';
    var s=JSON.parse(localStorage.getItem(key)||'null'); return s?s.nombre+' ('+s.rol+')':'Empleado';
  }catch(e){ return 'Empleado'; }
}
function registrarAudit(accion, solicitud, usuario){
  var entrada = {
    id: Date.now(), accion: accion,
    solicitudId: solicitud.id, radicado: solicitud.radicado,
    nombreTitular: solicitud.nombreTitular || solicitud.nombre,
    fecha: new Date().toISOString(), usuario: usuario||getUsuarioSesion()
  };
  var audit = cargarAudit();
  audit.unshift(entrada);
  if(audit.length > 200) audit = audit.slice(0,200);
  guardarAudit(audit);
  // Guardar auditoría en Firebase también
  guardarEnFirebase('auditoria', String(entrada.id), entrada);
}

/* ═══ FORMATO FECHA ═══ */
function fmtFecha(iso){
  if(!iso) return '—';
  var d=new Date(iso);
  return d.toLocaleDateString('es-CO',{day:'2-digit',month:'2-digit',year:'numeric'})+' '+d.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'});
}
function fmtFechaCorta(iso){
  if(!iso) return '—';
  var d=new Date(iso);
  return d.toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'});
}

/* ═══ TOAST ═══ */
var toastTimer;
function showToast(msg, ico){
  clearTimeout(toastTimer);
  var t=$id('toast');
  $id('toastMsg').textContent=msg;
  $id('toastIco').textContent=ico||'✅';
  
  // 🔊 Sonido según el tipo de toast
  if (window.FU_Sound) {
    if (ico === '❌' || ico === '🗑️' || msg.toLowerCase().includes('error')) {
      window.FU_Sound.play('error');
    } else if (ico === '⚠️' || msg.toLowerCase().includes('advertencia')) {
      window.FU_Sound.play('notification');
    } else {
      window.FU_Sound.play('success');
    }
  }
  
  t.classList.add('show');
  toastTimer=setTimeout(function(){t.classList.remove('show');},3000);
}

function $id(id){ return document.getElementById(id); }

/* ═══ BADGE TIPO ═══ */
function badgeTipo(tipo){
  var map={compra:'badge-compra',construccion:'badge-construccion',gravamen:'badge-gravamen'};
  var lbl={compra:'Compra',construccion:'Construcción',gravamen:'Gravamen'};
  return '<span class="badge '+(map[tipo]||'')+'">'+( lbl[tipo]||tipo)+'</span>';
}
function badgeEstado(estado){
  var map={pendiente:'badge-pendiente',revision:'badge-revision',aprobado:'badge-aprobado',rechazado:'badge-rechazado',desembolsado:'badge-desembolsado'};
  var lbl={pendiente:'⏳ Pendiente',revision:'🔍 En Revisión',aprobado:'✅ Aprobado',rechazado:'❌ Rechazado',desembolsado:'💰 Desembolsado'};
  return '<span class="badge '+(map[estado]||'')+'">'+( lbl[estado]||estado)+'</span>';
}
function selectEstado(sol){
  var opts=['pendiente','revision','aprobado','rechazado','desembolsado'];
  var lbl={pendiente:'⏳ Pendiente',revision:'🔍 En Revisión',aprobado:'✅ Aprobado',rechazado:'❌ Rechazado',desembolsado:'💰 Desembolsado'};
  var html='<select class="estado-sel estado-'+sol.estado+'" onchange="cambiarEstado(\''+sol.id+'\',this)">';
  opts.forEach(function(o){html+='<option value="'+o+'"'+(sol.estado===o?' selected':'')+'>'+lbl[o]+'</option>';});
  return html+'</select>';
}

/* ═══ CAMBIAR ESTADO ═══ */
function cambiarEstado(id, sel){
  var db=cargarDB();
  var idx=db.findIndex(function(s){return s.id===id;});
  if(idx<0) return;
  var anterior=db[idx].estado;
  db[idx].estado=sel.value;
  sel.className='estado-sel estado-'+sel.value;
  
  // 🔊 Sonido al cambiar estado
  if (window.FU_Sound) window.FU_Sound.play('stateChange');
  
  if(!db[idx].historial) db[idx].historial=[];
  db[idx].historial.unshift({
    accion:'Estado cambiado: '+anterior+' → '+sel.value,
    fecha:new Date().toISOString(), usuario:getUsuarioSesion()
  });
  // Enriquecer campos visibles para el portal de asociados
  var etiquetas = { pendiente:'Pendiente', revision:'En Revisión', aprobado:'Aprobado', rechazado:'Rechazado', desembolsado:'Desembolsado' };
  db[idx].estadoLabel   = etiquetas[sel.value] || sel.value;
  db[idx].estadoUpdated = new Date().toISOString();
  db[idx].asesor        = db[idx].asesor || getUsuarioSesion();
  db[idx].cedula        = (db[idx].cedula || db[idx].documento || '').replace(/\./g,'').replace(/\s/g,'').trim();

  guardarDB(db);
  // Sincronizar cambio en Firebase con feedback visual
  guardarEnFirebase('solicitudes', db[idx].id, db[idx],
    function() { showToast('☁️ Estado sincronizado en la nube: ' + sel.value, '☁️'); },
    function()  { showToast('⚠️ Guardado local. Sin conexión a Firebase.', '⚠️'); }
  );
  registrarAudit('Estado cambiado de "'+anterior+'" a "'+sel.value+'"', db[idx]);
  actualizarContadores();
  showToast('Estado actualizado a: '+sel.value,'🔄');
  agregarNotificacion('Estado actualizado',(db[idx].nombreTitular||db[idx].nombre||'—')+' — '+sel.value, db[idx].id);
}

/* ── Helper anti-XSS ── */
function escHtml(str){
  if(!str) return '—';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* ── Cache de elementos DOM para showPanel ── */
var _paneles = null, _navItems = null;
function _initNavCache(){
  if(!_paneles){ _paneles=Array.from(document.querySelectorAll('.panel')); }
  if(!_navItems){ _navItems=Array.from(document.querySelectorAll('.nav-item')); }
}

/* ═══ NAVEGAR ═══ */
function showPanel(id){
  _initNavCache();
  _paneles.forEach(function(p){p.classList.remove('active');});
  _navItems.forEach(function(n){n.classList.remove('active');});
  var panel=$id('panel-'+id);
  var nav=$id('nav-'+id);
  if(panel) panel.classList.add('active');
  if(nav) nav.classList.add('active');
  
  // 🔊 Sonido al cambiar de panel/sección
  if (window.FU_Sound) window.FU_Sound.play('click');
  
  if(id==='solicitudes') renderTabla();
  if(id==='pendientes') renderPendientes();
  if(id==='aprobados') renderAprobados();
  if(id==='historial') renderAuditoria();
  if(id==='dashboard') renderDashboard();
  if(id==='pqrs') renderPQRS();
  if(id==='usuarios') renderUsrTable();
  if(id==='cancelaciones') { if(window.Cancelaciones) window.Cancelaciones.init(); }
}

/* ═══ NOTIFICACIONES ═══ */
var notifData=[];
function agregarNotificacion(titulo, msg, solId){
  notifData.unshift({titulo:titulo,msg:msg,solId:solId,time:new Date().toISOString(),leida:false});
  if(notifData.length>20) notifData=notifData.slice(0,20);
  
  // 🔊 Sonido al recibir notificación
  if (window.FU_Sound) window.FU_Sound.play('notification');
  
  renderNotif();
}
function toggleNotif(){
  $id('notifPanel').classList.toggle('show');
}
function marcarTodasLeidas(){
  notifData.forEach(function(n){n.leida=true;});
  renderNotif();
}
function renderNotif(){
  var unread=notifData.filter(function(n){return !n.leida;}).length;
  $id('notifDot').style.display=unread>0?'block':'none';
  var list=$id('notifList');
  if(!notifData.length){list.innerHTML='<div style="padding:24px;text-align:center;color:var(--muted);font-size:13px;">Sin notificaciones</div>';return;}
  list.innerHTML=notifData.map(function(n){
    return '<div class="notif-item'+(n.leida?'':' unread')+'" onclick="this.classList.remove(\'unread\');">'
      +'<div class="ni-title">'+n.titulo+'</div>'
      +'<div class="ni-sub">'+n.msg+'</div>'
      +'<div class="ni-time">'+fmtFechaCorta(n.time)+'</div>'
      +'</div>';
  }).join('');
}
document.addEventListener('click',function(e){
  if(!$id('notifPanel').contains(e.target)&&!$id('notifBtn').contains(e.target)){
    $id('notifPanel').classList.remove('show');
  }
});

/* ═══ CONTROL DE SONIDOS ═══ */
function toggleSounds() {
  if (!window.FU_Sound) return;
  var enabled = window.FU_Sound.toggle();
  updateSoundIcon(enabled);
  showToast(enabled ? '🔊 Sonidos activados' : '🔇 Sonidos desactivados', enabled ? '🔊' : '🔇');
}

function updateSoundIcon(enabled) {
  var icon = document.getElementById('soundIcon');
  var waves = document.getElementById('soundWaves');
  if (!icon || !waves) return;
  
  if (enabled) {
    waves.style.display = 'block';
    icon.style.opacity = '1';
  } else {
    waves.style.display = 'none';
    icon.style.opacity = '0.5';
  }
}

// Inicializar estado visual del icono de sonido
document.addEventListener('DOMContentLoaded', function() {
  if (window.FU_Sound) {
    updateSoundIcon(window.FU_Sound.enabled);
  }
});

/* ═══ CONTADORES ═══ */
var _ultimoPqrsPend = -1;
function actualizarContadores(){
  var db=cargarDB();
  var creditos=db.filter(function(s){return s.tipo!=='pqrs';});
  var pqrs=db.filter(function(s){return s.tipo==='pqrs';});
  var pend=creditos.filter(function(s){return s.estado==='pendiente';}).length;
  var pqrsPend=pqrs.filter(function(s){return s.estado==='pendiente';}).length;
  $id('cnt-solicitudes').textContent=creditos.length;
  $id('cnt-pendientes').textContent=pend;
  $id('cnt-pqrs').textContent=pqrs.length;
  if(pqrsPend>0 && pqrsPend>_ultimoPqrsPend) agregarNotificacion('Nuevas PQRS pendientes', pqrsPend+' solicitud(es) sin atender','pqrs');
  _ultimoPqrsPend=pqrsPend;
}

/* ═══ DASHBOARD ═══ */
function renderDashboard(){
  var db=cargarDB();
  var now=new Date();
  $id('dash-fecha').textContent='Actualizado: '+now.toLocaleDateString('es-CO',{weekday:'long',year:'numeric',month:'long',day:'numeric'});

  var pend=db.filter(function(s){return s.estado==='pendiente';}).length;
  var apro=db.filter(function(s){return s.estado==='aprobado';}).length;
  var desem=db.filter(function(s){return s.estado==='desembolsado';}).length;

  $id('kpi-total').textContent=db.length;
  $id('kpi-total-d').textContent=db.length+' registros en total';
  $id('kpi-pend').textContent=pend;
  $id('kpi-pend-d').textContent=pend+' requieren atención';
  $id('kpi-apro').textContent=apro;
  $id('kpi-apro-d').textContent=apro+' listas para desembolso';
  $id('kpi-desem').textContent=desem;
  $id('kpi-desem-d').textContent=desem+' completadas';

  // Chart tipo (canvas simple)
  var compra=db.filter(function(s){return s.tipo==='compra';}).length;
  var const_=db.filter(function(s){return s.tipo==='construccion';}).length;
  var grav=db.filter(function(s){return s.tipo==='gravamen';}).length;
  var total=db.length||1;
  dibujarDonut([compra,const_,grav],['#E8511A','#0D7A4E','#C0392B']);
  $id('legendTipo').innerHTML=[
    {lbl:'Compra de Vivienda',val:compra,col:'#E8511A'},
    {lbl:'Construcción y Mejoras',val:const_,col:'#0D7A4E'},
    {lbl:'Gravamen Hipotecario',val:grav,col:'#C0392B'}
  ].map(function(i){
    return '<div class="dl-item"><div class="dl-dot" style="background:'+i.col+'"></div><span class="dl-lbl">'+i.lbl+'</span><span class="dl-val">'+i.val+'</span></div>';
  }).join('');

  // Últimas 5
  var recientes=db.slice(0,5);
  if(!recientes.length){ $id('dash-recent').innerHTML='<div class="empty-state" style="padding:30px 0"><div class="ei">📭</div><p>No hay solicitudes aún</p></div>'; return; }
  $id('dash-recent').innerHTML=recientes.map(function(s){
    return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-lt)">'
      +'<div style="flex:1"><div style="font-size:13px;font-weight:600">'+s.nombreTitular+'</div>'
      +'<div style="font-size:11.5px;color:var(--muted)">'+fmtFechaCorta(s.fechaRegistro)+'</div></div>'
      +badgeTipo(s.tipo)+badgeEstado(s.estado)
      +'</div>';
  }).join('');
}

function dibujarDonut(vals, cols){
  var canvas=$id('chartTipo');
  if(!canvas) return;
  // Tamaño responsivo según el ancho de pantalla
  var size = window.innerWidth <= 480 ? 130 : (window.innerWidth <= 768 ? 140 : 120);
  canvas.width  = size;
  canvas.height = size;
  canvas.style.width  = size+'px';
  canvas.style.height = size+'px';
  var ctx=canvas.getContext('2d');
  var total=vals.reduce(function(a,b){return a+b;},0)||1;
  var cx=size/2, cy=size/2, r=size/2-4, ir=size/2-22;
  ctx.clearRect(0,0,size,size);
  var start=-Math.PI/2;
  // Si todos son 0, dibujar círculo gris
  if(vals.every(function(v){return v===0;})){
    ctx.beginPath(); ctx.arc(cx,cy,r,0,2*Math.PI);
    ctx.fillStyle='#E2E8F0'; ctx.fill();
  } else {
    vals.forEach(function(v,i){
      if(v===0) return;
      var slice=(v/total)*2*Math.PI;
      ctx.beginPath(); ctx.moveTo(cx,cy);
      ctx.arc(cx,cy,r,start,start+slice);
      ctx.closePath(); ctx.fillStyle=cols[i]; ctx.fill();
      start+=slice;
    });
  }
  // Agujero central
  ctx.beginPath(); ctx.arc(cx,cy,ir,0,2*Math.PI);
  ctx.fillStyle='#fff'; ctx.fill();
  // Texto central
  ctx.fillStyle='#2D1A0E';
  ctx.font='bold '+(size<=130?13:14)+'px Outfit,sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(total===1&&vals.every(function(v){return v===0;})?'0':total, cx, cy-5);
  ctx.font=(size<=130?9:10)+'px Inter,sans-serif';
  ctx.fillStyle='#7A5540';
  ctx.fillText('total',cx,cy+8);
}

/* ═══ TABLA PRINCIPAL ═══ */
var datosFiltered = [];
function filtrar(){
  paginaActual=1;
  renderTabla();
}
function renderTabla(){
  var db=cargarDB();
  var search=($id('searchInput')||{}).value||'';
  var tipo=($id('filtroTipo')||{}).value||'';
  var estado=($id('filtroEstado')||{}).value||'';
  search=search.toLowerCase();
  datosFiltered=db.filter(function(s){
    var matchSearch=!search||(s.nombreTitular||'').toLowerCase().includes(search)||(s.cedula||'').includes(search)||(s.radicado||'').toLowerCase().includes(search)||(s.id||'').toLowerCase().includes(search);
    var matchTipo=!tipo||s.tipo===tipo;
    var matchEstado=!estado||s.estado===estado;
    return matchSearch&&matchTipo&&matchEstado;
  });
  var total=datosFiltered.length;
  var inicio=(paginaActual-1)*POR_PAGINA;
  var pagina=datosFiltered.slice(inicio,inicio+POR_PAGINA);
  $id('tblInfo').textContent=total+' registro'+(total!==1?'s':'');
  var body=$id('tblBody');
  if(!pagina.length){ body.innerHTML='<tr><td colspan="7"><div class="empty-state"><div class="ei">🔍</div><h3>Sin resultados</h3><p>No hay solicitudes que coincidan con los filtros.</p></div></td></tr>'; renderPaginacion(0); return; }
  body.innerHTML=pagina.map(function(s){
    return '<tr>'
      +'<td><span class="tr-id">'+s.id+'</span><div class="tr-sub">'+s.radicado+'</div></td>'
      +'<td><div class="tr-name">'+escHtml(s.nombreTitular)+'</div><div class="tr-sub">CC: '+escHtml(s.cedula)+'</div></td>'
      +'<td>'+badgeTipo(s.tipo)+'</td>'
      +'<td style="font-size:12px;color:var(--muted)">'+fmtFechaCorta(s.fechaRegistro)+'</td>'
      +'<td>'+selectEstado(s)+'</td>'
      +'<td style="font-size:12.5px;color:var(--muted)">'+(s.asesor||'—')+'</td>'
      +'<td><div class="row-actions">'
      +'<button class="act-btn" title="Ver detalle" onclick="verDetalle(\''+s.id+'\')">👁</button>'
      +'<button class="act-btn" title="Generar Word" onclick="generarDocx(\''+s.id+'\')">📄</button>'
      +'<button class="act-btn danger" title="Eliminar" onclick="eliminarSolicitud(\''+s.id+'\')">🗑</button>'
      +'</div></td>'
      +'</tr>';
  }).join('');
  renderPaginacion(total);
}

function renderPaginacion(total){
  var totalPags=Math.ceil(total/POR_PAGINA);
  var pg=$id('paginacion');
  if(totalPags<=1){pg.innerHTML='';return;}
  var html='';
  html+='<button class="pg-btn" onclick="irPag('+(paginaActual-1)+')" '+(paginaActual===1?'disabled':'')+'>‹</button>';
  for(var i=1;i<=totalPags;i++){
    if(Math.abs(i-paginaActual)<=2||i===1||i===totalPags){
      html+='<button class="pg-btn'+(i===paginaActual?' active':'')+'" onclick="irPag('+i+')">'+i+'</button>';
    } else if(Math.abs(i-paginaActual)===3){
      html+='<span style="color:var(--muted);font-size:12px;">…</span>';
    }
  }
  html+='<button class="pg-btn" onclick="irPag('+(paginaActual+1)+')" '+(paginaActual===totalPags?'disabled':'')+'>›</button>';
  pg.innerHTML=html;
}
function irPag(p){
  var totalPags=Math.ceil(datosFiltered.length/POR_PAGINA);
  if(p<1||p>totalPags) return;
  paginaActual=p; renderTabla();
}

/* ═══ TABLAS SECUNDARIAS ═══ */
function renderPendientes(){
  var db=cargarDB().filter(function(s){return s.estado==='pendiente';});
  renderTablaSimple('tblPend',db);
}
function renderAprobados(){
  var db=cargarDB().filter(function(s){return s.estado==='aprobado';});
  renderTablaSimple('tblApro',db);
}
function renderTablaSimple(bodyId,datos){
  var body=$id(bodyId);
  if(!datos.length){ body.innerHTML='<tr><td colspan="6"><div class="empty-state"><div class="ei">📭</div><h3>Sin registros</h3><p>No hay solicitudes en esta categoría.</p></div></td></tr>'; return; }
  body.innerHTML=datos.map(function(s){
    return '<tr>'
      +'<td><span class="tr-id">'+s.id+'</span><div class="tr-sub">'+s.radicado+'</div></td>'
      +'<td><div class="tr-name">'+escHtml(s.nombreTitular)+'</div><div class="tr-sub">CC: '+escHtml(s.cedula)+'</div></td>'
      +'<td>'+badgeTipo(s.tipo)+'</td>'
      +'<td style="font-size:12px;color:var(--muted)">'+fmtFechaCorta(s.fechaRegistro)+'</td>'
      +'<td>'+selectEstado(s)+'</td>'
      +'<td><div class="row-actions"><button class="act-btn" onclick="verDetalle(\''+s.id+'\')">👁</button><button class="act-btn" onclick="generarDocx(\''+s.id+'\')">📄</button></div></td>'
      +'</tr>';
  }).join('');
}

/* ═══ AUDITORÍA ═══ */
function renderAuditoria(){
  var audit=cargarAudit();
  var body=$id('auditBody');
  if(!audit.length){ body.innerHTML='<div class="empty-state"><div class="ei">📒</div><h3>Sin registros de auditoría</h3><p>Las acciones realizadas sobre las solicitudes aparecerán aquí.</p></div>'; return; }
  body.innerHTML=audit.map(function(a){
    return '<div class="hist-entry">'
      +'<div class="he-head">'
      +'<span class="badge badge-compra">'+a.usuario+'</span>'
      +'<span style="font-size:12px;font-weight:600;color:var(--text)">'+a.accion+'</span>'
      +'<span style="margin-left:auto;font-size:11.5px;color:var(--muted-lt)">'+fmtFecha(a.fecha)+'</span>'
      +'</div>'
      +'<div class="he-body">Solicitud: <b>'+a.radicado+'</b> — '+a.nombreTitular+'</div>'
      +'</div>';
  }).join('');
}

/* ═══ RENDER PQRS ═══ */
/* ════════════════════════════════════════════════════════
   MÓDULO PQRS — Portal Empleados
   Reemplaza renderPQRS con versión completa:
   - Carga desde Firebase 'pqrs' + localStorage
   - Botones Ver, Descargar Word, Eliminar (DOM puro)
   - Estados propios para PQRS
   - Exportar CSV
════════════════════════════════════════════════════════ */

var _pqrsCache = [];

/* ── Cargar PQRS desde Firebase + localStorage ── */
function cargarPQRS(cb) {
  var LS = 'fondoune_pqrs';
  var local = [];
  try { local = JSON.parse(localStorage.getItem(LS) || '[]'); } catch(e) {}

  if (window._fbDB) {
    window._fbDB.collection('pqrs')
      .orderBy('fechaRegistro', 'desc')
      .limit(300)
      .get()
      .then(function(snap) {
        var arr = [];
        snap.forEach(function(doc) { arr.push(doc.data()); });
        // Merge: Firebase tiene prioridad, completar con localStorage
        var ids = {};
        arr.forEach(function(s) { ids[s.id] = true; });
        local.forEach(function(s) { if (!ids[s.id]) arr.push(s); });
        _pqrsCache = arr;
        if (cb) cb(arr);
      })
      .catch(function(e) {
        console.warn('[PQRS] Firebase error:', e.message);
        _pqrsCache = local;
        if (cb) cb(local);
      });
  } else {
    _pqrsCache = local;
    if (cb) cb(local);
  }
}

/* ── Guardar cache en localStorage ── */
function _pqrsGuardarLocal() {
  try { localStorage.setItem('fondoune_pqrs', JSON.stringify(_pqrsCache)); } catch(e) {}
}

/* ── renderPQRS: 100% DOM, sin string concatenation con onclick ── */
function renderPQRS() {
  var body = $id('tblPQRS');
  if (!body) return;

  // Mostrar spinner
  body.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--muted)">⏳ Cargando PQRS…</td></tr>';

  cargarPQRS(function(db) {
    body.innerHTML = '';

    if (!db.length) {
      var trE = body.insertRow();
      var tdE = trE.insertCell();
      tdE.colSpan = 8;
      tdE.innerHTML = '<div class="empty-state"><div class="ei">💬</div><h3>Sin solicitudes PQRS</h3><p>Cuando los asociados envíen inquietudes aparecerán aquí.</p></div>';
      return;
    }

    var tiposBadge = {
      'peticion':'badge-revision', 'queja':'badge-rechazado',
      'reclamo':'badge-pendiente', 'sugerencia':'badge-construccion',
      'credito_vivienda':'badge-compra', 'cancelacion_hipoteca':'badge-gravamen',
      'certificado_tributario':'badge-revision', 'paz_y_salvo':'badge-aprobado',
      'abono_libre_inversion':'badge-construccion', 'otra':'badge-pendiente'
    };

    db.forEach(function(s) {
      var id     = String(s.id || '');
      var tipo   = s.tipoSolicitud || s.tipoLabel || 'otra';
      var cls    = tiposBadge[tipo] || 'badge-pendiente';
      var label  = s.tipoLabel || tipo;
      var nombre = s.nombre || s.nombreTitular || '—';
      var doc    = s.documento || s.cedula || '—';
      var resumen= (s.inquietud || '').substring(0, 55) + ((s.inquietud || '').length > 55 ? '…' : '');

      var tr = body.insertRow();

      // ID
      var c0 = tr.insertCell();
      var sp = document.createElement('span');
      sp.className = 'tr-id'; sp.textContent = id;
      c0.appendChild(sp);

      // Asociado
      var c1 = tr.insertCell();
      var d1 = document.createElement('div'); d1.className = 'tr-name'; d1.textContent = nombre;
      var d2 = document.createElement('div'); d2.className = 'tr-sub';  d2.textContent = 'Doc: ' + doc;
      c1.appendChild(d1); c1.appendChild(d2);

      // Tipo
      var c2 = tr.insertCell();
      var b2 = document.createElement('span'); b2.className = 'badge ' + cls; b2.textContent = label;
      c2.appendChild(b2);

      // Inquietud resumen
      var c3 = tr.insertCell();
      c3.style.cssText = 'max-width:180px;font-size:12px;color:var(--muted)';
      c3.textContent = resumen;

      // Contacto
      var c4 = tr.insertCell();
      c4.style.fontSize = '12.5px';
      c4.innerHTML = escHtml(s.telefono || '—') + '<br><span style="color:var(--muted);font-size:11px">' + escHtml(s.correo || '') + '</span>';

      // Fecha
      var c5 = tr.insertCell();
      c5.style.cssText = 'font-size:12px;color:var(--muted)';
      c5.textContent = fmtFechaCorta(s.fechaRegistro);

      // Estado — select con closure
      var c6 = tr.insertCell();
      var sel = document.createElement('select');
      sel.className = 'estado-sel estado-' + (s.estado || 'pendiente');
      [
        {v:'pendiente', l:'⏳ Pendiente'},
        {v:'revision',  l:'🔍 En Revisión'},
        {v:'resuelto',  l:'✅ Resuelto'},
        {v:'cerrado',   l:'🔒 Cerrado'}
      ].forEach(function(opt) {
        var o = document.createElement('option');
        o.value = opt.v; o.textContent = opt.l;
        if (s.estado === opt.v) o.selected = true;
        sel.appendChild(o);
      });
      (function(pqrsId) {
        sel.addEventListener('change', function() { cambiarEstadoPQRS(pqrsId, sel); });
      })(id);
      c6.appendChild(sel);

      // Acciones — closure sobre id
      var c7 = tr.insertCell();
      var wrap = document.createElement('div');
      wrap.className = 'row-actions';

      var btnVer = document.createElement('button');
      btnVer.className = 'act-btn'; btnVer.title = 'Ver detalle'; btnVer.textContent = '🔍';
      (function(pid) { btnVer.addEventListener('click', function() { verDetallePQRS(pid); }); })(id);

      var btnDoc = document.createElement('button');
      btnDoc.className = 'act-btn'; btnDoc.title = 'Descargar Word'; btnDoc.textContent = '📄';
      (function(pid) { btnDoc.addEventListener('click', function() { descargarPQRS(pid); }); })(id);

      var btnDel = document.createElement('button');
      btnDel.className = 'act-btn danger'; btnDel.title = 'Eliminar'; btnDel.textContent = '🗑️';
      (function(pid) { btnDel.addEventListener('click', function() { eliminarPQRS(pid); }); })(id);

      wrap.appendChild(btnVer);
      wrap.appendChild(btnDoc);
      wrap.appendChild(btnDel);
      c7.appendChild(wrap);

      body.appendChild(tr);
    });
  });
}

/* ── Cambiar estado PQRS ── */
function cambiarEstadoPQRS(id, sel) {
  var idx = _pqrsCache.findIndex(function(s) { return s.id === id; });
  if (idx < 0) return;
  var anterior = _pqrsCache[idx].estado || 'pendiente';
  _pqrsCache[idx].estado = sel.value;
  sel.className = 'estado-sel estado-' + sel.value;
  if (!_pqrsCache[idx].historial) _pqrsCache[idx].historial = [];
  _pqrsCache[idx].historial.unshift({
    accion: 'Estado PQRS: ' + anterior + ' → ' + sel.value,
    fecha: new Date().toISOString(),
    usuario: getUsuarioSesion()
  });
  if (window._fbDB) {
    window._fbDB.collection('pqrs').doc(id).set(_pqrsCache[idx], { merge: true })
      .catch(function(e) { console.warn('[PQRS] update error:', e); });
  }
  _pqrsGuardarLocal();
  if (window.FU_Audit) window.FU_Audit.log('PQRS_ESTADO', id + ' ' + anterior + '→' + sel.value);
  if (window.FU_Sound) window.FU_Sound.notif();
  showToast('Estado PQRS: ' + sel.value, '🔄');
}

/* ── Ver detalle PQRS (reutiliza el modal existente) ── */
function verDetallePQRS(id) {
  var s = _pqrsCache.find(function(x) { return x.id === id; });
  if (!s) { showToast('PQRS no encontrada', '⚠️'); return; }

  // Usar solicitudActual para compatibilidad con modal existente
  solicitudActual = s;

  $id('modalTitle').textContent = 'PQRS — ' + (s.nombre || s.nombreTitular || id);

  var campos = [
    {l:'ID',                v: s.id || '—',                           full: false},
    {l:'Tipo de Solicitud', v: s.tipoLabel || s.tipoSolicitud || '—', full: false},
    {l:'Estado',            v: s.estado || 'pendiente',               full: false},
    {l:'Nombre',            v: s.nombre || s.nombreTitular || '—',    full: false},
    {l:'Documento',         v: s.documento || s.cedula || '—',        full: false},
    {l:'Teléfono',          v: s.telefono || '—',                     full: false},
    {l:'Correo',            v: s.correo || '—',                       full: false},
    {l:'Fecha Registro',    v: fmtFecha(s.fechaRegistro),             full: false},
    {l:'Inquietud / Mensaje', v: s.inquietud || '—',                  full: true },
  ];

  var histHTML = '';
  if (s.historial && s.historial.length) {
    histHTML = '<div style="margin-top:20px"><div class="card-title" style="margin-bottom:12px">📜 Historial</div>'
      + '<div class="hist-timeline">'
      + s.historial.map(function(h) {
          return '<div class="ht-item"><div class="ht-dot"></div><div class="ht-body">'
            + '<div class="ht-accion">' + escHtml(h.accion) + '</div>'
            + '<div class="ht-meta">' + escHtml(h.usuario || '—') + ' · ' + fmtFecha(h.fecha) + '</div>'
            + '</div></div>';
        }).join('')
      + '</div></div>';
  }

  $id('modalBody').innerHTML = '<div class="detail-grid">'
    + campos.map(function(c) {
        return '<div class="detail-field' + (c.full ? ' detail-full' : '') + '">'
          + '<div class="detail-lbl">' + c.l + '</div>'
          + '<div class="detail-val">' + escHtml(String(c.v)) + '</div></div>';
      }).join('')
    + '</div>' + histHTML;

  // Reemplazar botón Word del modal por uno específico de PQRS
  var btnWord = $id('btnGenDocx');
  if (btnWord) {
    btnWord.textContent = '📄 Descargar Word';
    btnWord.onclick = function() { descargarPQRS(id); cerrarModalBtn(); };
  }

  $id('modalOverlay').classList.add('show');
}

/* ── Descargar Word de PQRS ── */
function descargarPQRS(id) {
  var s = _pqrsCache.find(function(x) { return x.id === id; });
  if (!s) { showToast('PQRS no encontrada', '⚠️'); return; }

  var lib = (typeof docx !== 'undefined' && docx.Document) ? docx : window;
  if (!lib.Document) { showToast('Librería docx no disponible', '⚠️'); return; }

  var DD = lib.Document, PK = lib.Packer, PA = lib.Paragraph,
      RN = lib.TextRun, WT = lib.WidthType, AL = lib.AlignmentType,
      TC = lib.TableCell, TR = lib.TableRow, TB = lib.Table;

  var filas = [
    ['ID',              s.id || '—'],
    ['Tipo Solicitud',  s.tipoLabel || s.tipoSolicitud || '—'],
    ['Estado',          s.estado || 'pendiente'],
    ['Nombre',          s.nombre || s.nombreTitular || '—'],
    ['Documento',       s.documento || s.cedula || '—'],
    ['Teléfono',        s.telefono || '—'],
    ['Correo',          s.correo || '—'],
    ['Fecha',           s.fechaRegistro ? new Date(s.fechaRegistro).toLocaleDateString('es-CO') : '—'],
    ['Inquietud',       s.inquietud || '—'],
  ];

  var rows = filas.map(function(r) {
    return new TR({ children: [
      new TC({ children: [new PA({ children: [new RN({ text: r[0], bold: true, size: 20 })] })],
               width: { size: 30, type: WT.PERCENTAGE } }),
      new TC({ children: [new PA({ children: [new RN({ text: r[1], size: 20 })] })],
               width: { size: 70, type: WT.PERCENTAGE } })
    ]});
  });

  var doc = new DD({ sections: [{ properties: {}, children: [
    new PA({ alignment: AL.CENTER, children: [
      new RN({ text: 'FondoUne — Registro PQRS', bold: true, size: 32, color: 'E8511A' })
    ]}),
    new PA({ alignment: AL.CENTER, children: [
      new RN({ text: 'Petición · Queja · Reclamo · Sugerencia', size: 22, color: '7A5540' })
    ]}),
    new PA({ children: [] }),
    new TB({ rows: rows, width: { size: 100, type: WT.PERCENTAGE } })
  ]}]});

  PK.toBlob(doc).then(function(blob) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'FondoUne_PQRS_' + (s.nombre || 'asociado').replace(/\s+/g, '_')
               + '_' + new Date().toISOString().slice(0, 10) + '.docx';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
    if (window.FU_Sound) window.FU_Sound.success();
    if (window.FU_Audit) window.FU_Audit.log('PQRS_DESCARGADA', id);
    showToast('PQRS descargada correctamente', '📄');
  }).catch(function(e) {
    if (window.FU_Sound) window.FU_Sound.error();
    showToast('Error al generar Word: ' + e.message, '❌');
  });
}

/* ── Eliminar PQRS ── */
function eliminarPQRS(id) {
  if (!confirm('¿Eliminar definitivamente esta PQRS?\n\nEsta acción no se puede deshacer.')) return;

  if (window._fbDB) {
    window._fbDB.collection('pqrs').doc(id).delete()
      .catch(function(e) { console.warn('[PQRS] delete error:', e); });
  }
  _pqrsCache = _pqrsCache.filter(function(s) { return s.id !== id; });
  _pqrsGuardarLocal();

  if (window.FU_Audit) window.FU_Audit.log('PQRS_ELIMINADA', id);
  if (window.FU_Sound) window.FU_Sound.click();
  renderPQRS();
  showToast('PQRS eliminada', '🗑️');
}

/* ── Exportar PQRS a CSV ── */
function exportarPQRS() {
  if (!_pqrsCache.length) {
    cargarPQRS(function(db) {
      if (db.length) _doPQRScsv(db);
      else showToast('Sin PQRS para exportar', '⚠️');
    });
    return;
  }
  _doPQRScsv(_pqrsCache);
}

function _doPQRScsv(db) {
  var hdr = ['ID','Tipo','Estado','Nombre','Documento','Teléfono','Correo','Fecha','Inquietud'];
  var rows = db.map(function(s) {
    return [
      s.id, s.tipoLabel || s.tipoSolicitud, s.estado,
      s.nombre || s.nombreTitular, s.documento || s.cedula,
      s.telefono, s.correo,
      s.fechaRegistro ? new Date(s.fechaRegistro).toLocaleDateString('es-CO') : '',
      (s.inquietud || '').replace(/;/g, '|').replace(/\n/g, ' ')
    ].map(function(v) { return '"' + (v || '') + '"'; }).join(';');
  });
  var csv  = '\uFEFF' + hdr.join(';') + '\n' + rows.join('\n');
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href   = url;
  a.download = 'FondoUne_PQRS_' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
  if (window.FU_Sound) window.FU_Sound.success();
  showToast('PQRS exportadas (' + db.length + ' registros)', '📥');
}


/* ═══ MODAL DETALLE ═══ */
function verDetalle(id){
  var db=cargarDB();
  var sol=db.find(function(s){return s.id===id;});
  if(!sol) return;
  solicitudActual=sol;
  $id('modalTitle').textContent='Solicitud: '+(sol.radicado||sol.id);
  var campos=[
    {l:'ID Sistema',v:sol.id,full:false},
    {l:'Radicado',v:sol.radicado||'—',full:false},
    {l:'Tipo',v:sol.tipoLabel||sol.tipo,full:false},
    {l:'Estado',v:sol.estado,full:false},
    {l:'Nombre Titular / Asociado',v:sol.nombreTitular||sol.nombre||'—',full:false},
    {l:'Cédula',v:sol.cedula||sol.documento||'—',full:false},
    {l:'Fecha Expedición Cédula',v:sol.fechaExpCedula||'—',full:false},
    {l:'Lugar Expedición Cédula',v:sol.lugarExpCedula||'—',full:false},
    {l:'RUT / NIT',v:sol.rutTitular||'—',full:false},
    {l:'Teléfono',v:sol.telefono||'—',full:false},
    {l:'Correo Electrónico',v:sol.correo||'—',full:false},
    {l:'Dirección del Inmueble',v:sol.direccion||'—',full:true},
    {l:'Asesor Responsable',v:sol.asesor||'—',full:false},
    {l:'Fecha de Registro',v:fmtFecha(sol.fechaRegistro),full:false},
    {l:'Fecha Límite Docs.',v:sol.fechaLimite||'—',full:false},
  ];
  if(sol.tipo==='pqrs'){
    campos.push({l:'Tipo de Solicitud PQRS',v:sol.tipoLabel||'—',full:false});
    campos.push({l:'Inquietud / Mensaje',v:sol.inquietud||'—',full:true});
  }
  if(sol.tipo==='compra'){
    campos.push({l:'Nombre Vendedor',v:sol.nombreVendedor||'—',full:false});
    campos.push({l:'Cédula Vendedor',v:sol.cedulaVendedor||'—',full:false});
    campos.push({l:'Fecha Exp. Cédula Vendedor',v:sol.fechaExpCedulaVendedor||'—',full:false});
    campos.push({l:'Lugar Exp. Cédula Vendedor',v:sol.lugarExpCedulaVendedor||'—',full:false});
    campos.push({l:'RUT Vendedor',v:sol.rutVendedor||'—',full:false});
  }
  if(sol.tipo==='construccion'){
    campos.push({l:'Codeudor',v:sol.nombreCodeudor||'—',full:false});
    campos.push({l:'CC Codeudor',v:sol.cedulaCodeudor||'—',full:false});
    campos.push({l:'Tipo de Obra',v:sol.tipoObra||'—',full:false});
    campos.push({l:'Valor Presupuesto',v:sol.valorPresupuesto||'—',full:false});
  }
  if(sol.tipo==='gravamen'){
    campos.push({l:'Entidad Financiera',v:sol.entidadFinanciera||'—',full:false});
    campos.push({l:'Valor del Crédito',v:sol.valorCredito||'—',full:false});
  }
  var histHTML='';
  if(sol.historial&&sol.historial.length){
    histHTML='<div style="margin-top:20px"><div class="card-title" style="margin-bottom:12px">📜 Historial de la Solicitud</div>'
      +'<div class="hist-timeline">'
      +sol.historial.map(function(h){
        return '<div class="ht-item"><div class="ht-dot"></div><div class="ht-body"><div class="ht-accion">'+h.accion+'</div><div class="ht-meta">'+h.usuario+' · '+fmtFecha(h.fecha)+'</div></div></div>';
      }).join('')
      +'</div></div>';
  }
  $id('modalBody').innerHTML='<div class="detail-grid">'+campos.map(function(c){
    return '<div class="detail-field'+(c.full?' detail-full':'')+'"><div class="detail-lbl">'+c.l+'</div><div class="detail-val">'+c.v+'</div></div>';
  }).join('')+'</div>'+histHTML;
  $id('modalOverlay').classList.add('show');
}
function cerrarModal(e){ if(e.target===$id('modalOverlay')) cerrarModalBtn(); }
function cerrarModalBtn(){ $id('modalOverlay').classList.remove('show'); }

/* ═══ ELIMINAR ═══ */
function eliminarSolicitud(id){
  if(!confirm('¿Eliminar esta solicitud? Esta acción no se puede deshacer.')) return;

  // 1. Auditoría antes de borrar
  var db = cargarDB();
  var sol = db.find(function(s){ return s.id === id; });
  if(sol) registrarAudit('Solicitud eliminada', sol);

  // 2. Eliminar del localStorage
  db = db.filter(function(s){ return s.id !== id; });
  guardarDB(db);

  // 3. Eliminar de Firebase Firestore (si está conectado)
  if(window._fbDB){
    window._fbDB.collection('solicitudes').doc(id).delete()
      .then(function(){ console.log('✅ Eliminado de Firebase:', id); })
      .catch(function(e){ console.warn('⚠️ Error al eliminar de Firebase:', e); });
  }

  // 🔊 Sonido de error/advertencia al eliminar
  if (window.FU_Sound) window.FU_Sound.play('error');

  recargar();
  showToast('Solicitud eliminada', '🗑');
}

/* ═══ GENERAR DOCX ═══ */
function generarDocxDesdeModal(){
  if(solicitudActual) generarDocx(solicitudActual.id);
}
function generarDocx(id){
  var db=cargarDB();
  var sol=db.find(function(s){return s.id===id;});
  if(!sol){showToast('Solicitud no encontrada','❌');return;}
  try{ buildDocx(sol); }
  catch(e){ showToast('Error al generar: '+e.message,'❌'); }
}

(function() {
    'use strict';

    /* ── Estado del módulo ── */
    var _todos    = [];   // todos los registros cargados
    var _visibles = [];   // después de aplicar filtros

    /* ── Etiquetas legibles para campos codificados ── */
    var CONTRATOS = {
      indefinido:   'Indefinido',
      fijo:         'Término fijo',
      obra:         'Obra o labor',
      prestacion:   'Prestación de servicios',
      '':           '—'
    };
    var SEXO = { M:'Masculino', F:'Femenino', '':'—' };
    var ESTADO_CIVIL = {
      soltero:'Soltero/a', casado:'Casado/a', union:'Unión libre',
      divorciado:'Divorciado/a', viudo:'Viudo/a', '':'—'
    };
    var TIPO_ID = {
      cc:'Cédula de Ciudadanía', ce:'Cédula de Extranjería',
      pa:'Pasaporte', ti:'Tarjeta de Identidad', '':'CC'
    };
    var TIPO_CUENTA = { ahorros:'Ahorros', corriente:'Corriente', '':'—' };
    var DEDUCCION   = { libranza:'Libranza', nomina:'Nómina', '':'—' };

    /* ── Helper: valor seguro ── */
    function v(obj, key) {
      var val = obj[key];
      if (val === undefined || val === null || val === '') return '—';
      return String(val);
    }

    /* ── Formatear número como moneda COP ── */
    function cop(num) {
      var n = parseFloat(String(num).replace(/[^0-9.]/g,''));
      if (isNaN(n)) return '—';
      return '$' + n.toLocaleString('es-CO');
    }

    /* ── Formatear fecha ISO ── */
    function fecha(str) {
      if (!str || str === '—') return '—';
      try {
        var d = new Date(str + 'T12:00:00');
        return d.toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' });
      } catch(e) { return str; }
    }

    /* ═══════════════════════════════════════════
       CARGA DESDE FIRESTORE
    ═══════════════════════════════════════════ */
    window.asocCargarDatos = function() {
      var tbody = document.getElementById('asoc-tabla-body');
      var txt   = document.getElementById('asoc-count-txt');
      if (tbody) tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><div class="ei">⏳</div><h3>Cargando asociados...</h3><p>Consultando Firestore</p></div></td></tr>';
      if (txt)   txt.textContent = 'Cargando...';

      if (!window._fbDB) {
        mostrarError('Firebase no está conectado. Verifica la configuración.');
        return;
      }

      /* Leer colección "solicitudes" — cada doc puede tener campos asoc* */
      window._fbDB.collection('solicitudes')
        .orderBy('fechaRegistro', 'desc')
        .get()
        .then(function(snap) {
          var docs = [];
          snap.forEach(function(doc) {
            var d = doc.data();
            /* Solo incluir documentos que tengan al menos nombre del asociado */
            if (d.asocNom1 || d.asocApe1) {
              docs.push(Object.assign({ _id: doc.id }, d));
            }
          });
          _todos = docs;
          asocActualizarKPIs(docs, snap.size);
          asocFiltrar();
        })
        .catch(function(err) {
          mostrarError('Error al leer Firestore: ' + err.message);
        });
    };

    function mostrarError(msg) {
      var tbody = document.getElementById('asoc-tabla-body');
      if (tbody) tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><div class="ei">⚠️</div><h3>Error al cargar</h3><p>' + msg + '</p></div></td></tr>';
      var txt = document.getElementById('asoc-count-txt');
      if (txt) txt.textContent = 'Error';
    }

    /* ═══════════════════════════════════════════
       KPIs
    ═══════════════════════════════════════════ */
    function asocActualizarKPIs(docs, totalSolicitudes) {
      /* Total asociados */
      var elTotal = document.getElementById('asoc-kpi-total');
      if (elTotal) elTotal.textContent = docs.length;

      /* Con solicitud de desembolso (tienen monto) */
      var conSol = docs.filter(function(d) { return d.monto && parseFloat(d.monto) > 0; }).length;
      var elSol  = document.getElementById('asoc-kpi-con-solicitud');
      if (elSol) elSol.textContent = conSol;

      /* Registrados este mes */
      var ahora    = new Date();
      var mesActual = ahora.getFullYear() + '-' + String(ahora.getMonth()+1).padStart(2,'0');
      var recientes = docs.filter(function(d) {
        if (!d.fechaRegistro) return false;
        return String(d.fechaRegistro).startsWith(mesActual);
      }).length;
      var elRec = document.getElementById('asoc-kpi-recientes');
      if (elRec) elRec.textContent = recientes;

      /* Contador del sidebar */
      var cnt = document.getElementById('cnt-asociados');
      if (cnt) cnt.textContent = docs.length;
    }

    /* ═══════════════════════════════════════════
       FILTROS
    ═══════════════════════════════════════════ */
    window.asocFiltrar = function() {
      var q         = (document.getElementById('asoc-search')          || {}).value || '';
      var contrato  = (document.getElementById('asoc-filtro-contrato') || {}).value || '';
      var banco     = (document.getElementById('asoc-filtro-banco')    || {}).value || '';
      q = q.toLowerCase().trim();

      _visibles = _todos.filter(function(d) {
        /* Texto libre */
        if (q) {
          var nombre   = ((d.asocNom1||'') + ' ' + (d.asocNom2||'') + ' ' + (d.asocApe1||'') + ' ' + (d.asocApe2||'')).toLowerCase();
          var cedula   = String(d.asocCedula || '').toLowerCase();
          var empresa  = String(d.asocEmpresa || '').toLowerCase();
          var email    = String(d.asocEmail || '').toLowerCase();
          if (!nombre.includes(q) && !cedula.includes(q) && !empresa.includes(q) && !email.includes(q)) return false;
        }
        /* Tipo de contrato */
        if (contrato && (d.asocTipoContrato || '') !== contrato) return false;
        /* Banco */
        if (banco) {
          var bancoDoc = String(d.asocBanco || '').toLowerCase();
          if (!bancoDoc.includes(banco)) return false;
        }
        return true;
      });

      renderTabla(_visibles);
    };

    /* ═══════════════════════════════════════════
       RENDER TABLA
    ═══════════════════════════════════════════ */
    function renderTabla(docs) {
      var tbody = document.getElementById('asoc-tabla-body');
      var txt   = document.getElementById('asoc-count-txt');
      if (!tbody) return;

      if (txt) txt.textContent = docs.length + ' asociado' + (docs.length !== 1 ? 's' : '');

      if (!docs.length) {
        tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><div class="ei">🔍</div><h3>Sin resultados</h3><p>Ajusta los filtros de búsqueda.</p></div></td></tr>';
        return;
      }

      tbody.innerHTML = docs.map(function(d, i) {
        var nombreCompleto = [d.asocNom1, d.asocNom2, d.asocApe1, d.asocApe2].filter(Boolean).join(' ') || '—';
        var tipoId  = TIPO_ID[d.asocTipoId] || 'CC';
        var cedula  = v(d, 'asocCedula');
        var celular = v(d, 'asocCelular');
        var email   = v(d, 'asocEmail');
        var empresa = v(d, 'asocEmpresa');
        var cargo   = v(d, 'asocCargo');
        var salario = cop(d.asocSalario);
        var banco   = v(d, 'asocBanco');
        var tipoCta = TIPO_CUENTA[d.asocTipoCuenta] || '—';
        var contrato = CONTRATOS[d.asocTipoContrato] || v(d, 'asocTipoContrato');
        var fechaReg = fecha(d.fechaRegistro);

        /* Badge color contrato */
        var badgeColor = {
          indefinido: 'background:#E8F8F0;color:#0D7A4E;',
          fijo:       'background:#EFF6FF;color:#1D4ED8;',
          obra:       'background:#FEF3C7;color:#92400E;',
          prestacion: 'background:#F5F3FF;color:#6D28D9;'
        }[d.asocTipoContrato] || 'background:var(--bg);color:var(--muted);';

        return '<tr>' +
          '<td>' +
            '<div class="tr-name">' + nombreCompleto + '</div>' +
            '<div class="tr-sub">📅 ' + fechaReg + '</div>' +
          '</td>' +
          '<td>' +
            '<div class="tr-id">' + tipoId + '</div>' +
            '<div style="font-size:12px;margin-top:3px;">' + cedula + '</div>' +
          '</td>' +
          '<td>' +
            '<div style="font-size:12.5px;">' + celular + '</div>' +
            '<div class="tr-sub">' + email + '</div>' +
          '</td>' +
          '<td>' +
            '<div style="font-size:12.5px;font-weight:600;">' + empresa + '</div>' +
            '<div class="tr-sub">' + cargo + '</div>' +
          '</td>' +
          '<td style="font-weight:700;color:var(--ok);font-size:13px;">' + salario + '</td>' +
          '<td>' +
            '<div style="font-size:12.5px;font-weight:600;">' + banco + '</div>' +
            '<div class="tr-sub">' + tipoCta + '</div>' +
          '</td>' +
          '<td><span class="badge" style="' + badgeColor + 'font-size:10px;">' + contrato + '</span></td>' +
          '<td>' +
            '<div class="row-actions">' +
              '<button class="act-btn" title="Ver detalle completo" onclick="asocVerDetalle(' + i + ')">👁</button>' +
            '</div>' +
          '</td>' +
        '</tr>';
      }).join('');
    }

    /* ═══════════════════════════════════════════
       MODAL DETALLE COMPLETO
    ═══════════════════════════════════════════ */
    window.asocVerDetalle = function(idx) {
      var d = _visibles[idx];
      if (!d) return;

      var nombreCompleto = [d.asocNom1, d.asocNom2, d.asocApe1, d.asocApe2].filter(Boolean).join(' ') || '—';

      function fila(label, val) {
        if (!val || val === '—') return '';
        return '<div style="display:flex;flex-direction:column;gap:2px;">' +
          '<span style="font-size:10.5px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--muted);">' + label + '</span>' +
          '<span style="font-size:13.5px;color:var(--text);font-weight:500;">' + val + '</span>' +
        '</div>';
      }

      function seccion(titulo, campos) {
        var filas = campos.map(function(f) { return fila(f[0], f[1]); }).filter(Boolean).join('');
        if (!filas) return '';
        return '<div style="margin-bottom:24px;">' +
          '<div style="font-family:Outfit,sans-serif;font-weight:700;font-size:13px;color:var(--orange);border-bottom:2px solid var(--border);padding-bottom:6px;margin-bottom:14px;">' + titulo + '</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px 20px;">' + filas + '</div>' +
        '</div>';
      }

      var html =
        '<div style="display:flex;align-items:center;gap:14px;margin-bottom:28px;">' +
          '<div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--orange),var(--orange-d));display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">🧑‍💼</div>' +
          '<div>' +
            '<div style="font-family:Outfit,sans-serif;font-weight:800;font-size:20px;color:var(--text);">' + nombreCompleto + '</div>' +
            '<div style="font-size:12.5px;color:var(--muted);margin-top:2px;">' + (TIPO_ID[d.asocTipoId]||'CC') + ': ' + v(d,'asocCedula') + '</div>' +
          '</div>' +
        '</div>' +

        seccion('📋 Identificación', [
          ['Tipo de documento', TIPO_ID[d.asocTipoId] || v(d,'asocTipoId')],
          ['Número de documento', v(d,'asocCedula')],
          ['Fecha de expedición', fecha(d.asocFechaExp)],
          ['Lugar de expedición', v(d,'asocLugarExp')],
          ['Relación con el fondo', v(d,'asocRelacion')],
        ]) +

        seccion('👤 Datos Personales', [
          ['Fecha de nacimiento', fecha(d.asocFechaNac)],
          ['Sexo', SEXO[d.asocSexo] || v(d,'asocSexo')],
          ['Estado civil', ESTADO_CIVIL[d.asocEstadoCivil] || v(d,'asocEstadoCivil')],
          ['Nivel de estudios', v(d,'asocEstudios')],
        ]) +

        seccion('📞 Contacto', [
          ['Celular', v(d,'asocCelular')],
          ['Teléfono 1', v(d,'asocTel1')],
          ['Teléfono 2', v(d,'asocTel2')],
          ['Correo electrónico', v(d,'asocEmail')],
          ['Dirección', v(d,'asocDireccion')],
          ['Barrio', v(d,'asocBarrio')],
          ['Ciudad', v(d,'asocCiudad')],
          ['Departamento', v(d,'asocDepto')],
          ['Estrato', v(d,'asocEstrato')],
        ]) +

        seccion('🏢 Información Laboral', [
          ['Empresa', v(d,'asocEmpresa')],
          ['Dependencia / Área', v(d,'asocDependencia')],
          ['Cargo', v(d,'asocCargo')],
          ['Tipo de contrato', CONTRATOS[d.asocTipoContrato] || v(d,'asocTipoContrato')],
          ['Fecha de ingreso', fecha(d.asocFechaIngreso)],
          ['Período de pago', v(d,'asocPeriodo')],
        ]) +

        seccion('💰 Información Financiera', [
          ['Salario', cop(d.asocSalario)],
          ['Tipo de deducción', DEDUCCION[d.asocDeduccion] || v(d,'asocDeduccion')],
          ['RUT / NIT', v(d,'asocRut')],
        ]) +

        seccion('🏦 Cuenta Bancaria', [
          ['Banco', v(d,'asocBanco')],
          ['Tipo de cuenta', TIPO_CUENTA[d.asocTipoCuenta] || v(d,'asocTipoCuenta')],
          ['Número de cuenta', v(d,'asocNroCuenta')],
        ]) +

        (d.monto ? seccion('📑 Solicitud de Desembolso Asociada', [
          ['Tipo de crédito', v(d,'tipoCredito')],
          ['Monto solicitado', cop(d.monto)],
          ['Estado IA', v(d,'estadoIA')],
          ['Nivel de riesgo', v(d,'nivelRiesgo')],
          ['Comentario IA', v(d,'comentarioIA')],
          ['Fecha de solicitud', fecha(d.fechaRegistro)],
        ]) : '') +

        '<div style="text-align:right;margin-top:8px;">' +
          '<button onclick="asocCerrarModal()" class="btn btn-outline btn-sm">Cerrar</button>' +
        '</div>';

      var modalBody = document.getElementById('asoc-modal-body');
      var overlay   = document.getElementById('asoc-modal-overlay');
      if (modalBody) modalBody.innerHTML = html;
      if (overlay)   { overlay.style.display = 'flex'; }
      if (window.FU_Sound) window.FU_Sound.play('click');
    };

    window.asocCerrarModal = function(e) {
      if (e && e.target !== document.getElementById('asoc-modal-overlay')) return;
      var overlay = document.getElementById('asoc-modal-overlay');
      if (overlay) overlay.style.display = 'none';
    };

    /* Cerrar con ESC */
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        var overlay = document.getElementById('asoc-modal-overlay');
        if (overlay && overlay.style.display === 'flex') overlay.style.display = 'none';
      }
    });

    /* ═══════════════════════════════════════════
       EXPORTAR EXCEL
    ═══════════════════════════════════════════ */
    window.asocExportarExcel = function() {
      if (!_visibles.length) { alert('No hay asociados para exportar.'); return; }
      if (window.FU_Sound) window.FU_Sound.play('download');

      var cabeceras = [
        'Primer Nombre','Segundo Nombre','Primer Apellido','Segundo Apellido',
        'Tipo Documento','Número Documento','Fecha Exp. Doc','Lugar Exp. Doc',
        'Relación con Fondo','Fecha Nacimiento','Sexo','Estado Civil','Estudios',
        'Celular','Teléfono 1','Teléfono 2','Correo','Dirección','Barrio',
        'Ciudad','Departamento','Estrato',
        'Empresa','Dependencia','Cargo','Tipo Contrato','Fecha Ingreso','Período Pago',
        'Salario','Tipo Deducción','RUT',
        'Banco','Tipo Cuenta','Número Cuenta',
        'Monto Solicitado','Tipo Crédito','Estado IA','Nivel Riesgo','Fecha Solicitud'
      ];

      var filas = _visibles.map(function(d) {
        return [
          d.asocNom1||'', d.asocNom2||'', d.asocApe1||'', d.asocApe2||'',
          TIPO_ID[d.asocTipoId]||d.asocTipoId||'', d.asocCedula||'',
          d.asocFechaExp||'', d.asocLugarExp||'', d.asocRelacion||'',
          d.asocFechaNac||'', SEXO[d.asocSexo]||d.asocSexo||'',
          ESTADO_CIVIL[d.asocEstadoCivil]||d.asocEstadoCivil||'', d.asocEstudios||'',
          d.asocCelular||'', d.asocTel1||'', d.asocTel2||'', d.asocEmail||'',
          d.asocDireccion||'', d.asocBarrio||'', d.asocCiudad||'', d.asocDepto||'', d.asocEstrato||'',
          d.asocEmpresa||'', d.asocDependencia||'', d.asocCargo||'',
          CONTRATOS[d.asocTipoContrato]||d.asocTipoContrato||'',
          d.asocFechaIngreso||'', d.asocPeriodo||'',
          d.asocSalario||'', DEDUCCION[d.asocDeduccion]||d.asocDeduccion||'', d.asocRut||'',
          d.asocBanco||'', TIPO_CUENTA[d.asocTipoCuenta]||d.asocTipoCuenta||'', d.asocNroCuenta||'',
          d.monto||'', d.tipoCredito||'', d.estadoIA||'', d.nivelRiesgo||'', d.fechaRegistro||''
        ].map(function(c) {
          var s = String(c).replace(/"/g,'""');
          return '"' + s + '"';
        });
      });

      var csv = [cabeceras.map(function(c){ return '"'+c+'"'; }).join(',')]
        .concat(filas.map(function(f){ return f.join(','); }))
        .join('\r\n');

      /* BOM para que Excel abra bien en español */
      var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      var url  = URL.createObjectURL(blob);
      var a    = document.createElement('a');
      a.href     = url;
      a.download = 'asociados_fondoune_' + new Date().toISOString().slice(0,10) + '.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    /* ═══════════════════════════════════════════
       AUTO-CARGA al mostrar el panel
    ═══════════════════════════════════════════ */
    /* ── Wrapper seguro: usa referencia directa en lugar de window.showPanel
       para evitar recursion infinita cuando la funcion no esta en window. ── */
    var _showPanelOrigAsoc = (typeof showPanel === 'function') ? showPanel : null;
    window.showPanel = function(id) {
      if (_showPanelOrigAsoc) _showPanelOrigAsoc(id);
      if (id === 'asociados' && _todos.length === 0) {
        asocCargarDatos();
      }
    };

  })();

function toggleCustomSelect() {
    var trigger  = document.getElementById('recTargetUserTrigger');
    var dropdown = document.getElementById('recTargetUserDropdown');
    var isOpen   = dropdown.classList.contains('open');
    trigger.classList.toggle('open', !isOpen);
    dropdown.classList.toggle('open', !isOpen);
  }
  function setCustomSelectValue(value, label) {
    document.getElementById('recTargetUserText').textContent = label;
    document.getElementById('recTargetUser').value = value;
    var trigger  = document.getElementById('recTargetUserTrigger');
    var dropdown = document.getElementById('recTargetUserDropdown');
    trigger.classList.remove('open');
    dropdown.classList.remove('open');
    dropdown.querySelectorAll('.custom-select-option').forEach(function(opt) {
      opt.classList.toggle('selected', opt.dataset.value === value);
    });
  }
  function poblarCustomSelect(usrs, usuarioAdmin) {
    var dropdown = document.getElementById('recTargetUserDropdown');
    var sel      = document.getElementById('recTargetUser');
    dropdown.innerHTML = '';
    sel.innerHTML = '<option value="">Seleccionar usuario…</option>';
    var ph = document.createElement('div');
    ph.className = 'custom-select-option placeholder';
    ph.textContent = 'Seleccionar usuario…';
    ph.dataset.value = '';
    ph.onclick = function() { setCustomSelectValue('', 'Seleccionar usuario…'); };
    dropdown.appendChild(ph);
    Object.keys(usrs).forEach(function(k) {
      if (k === usuarioAdmin) return;
      var u   = usrs[k];
      var lbl = u.nombre + ' (' + k + ')';
      var opt = document.createElement('div');
      opt.className = 'custom-select-option';
      opt.textContent = lbl;
      opt.dataset.value = k;
      opt.onclick = (function(val, text) {
        return function() { setCustomSelectValue(val, text); };
      })(k, lbl);
      dropdown.appendChild(opt);
      var selOpt = document.createElement('option');
      selOpt.value = k;
      selOpt.textContent = lbl;
      sel.appendChild(selOpt);
    });
    document.getElementById('recTargetUserText').textContent = 'Seleccionar usuario…';
  }
  document.addEventListener('click', function(e) {
    var wrap = document.getElementById('recTargetUserWrap');
    if (wrap && !wrap.contains(e.target)) {
      document.getElementById('recTargetUserTrigger').classList.remove('open');
      document.getElementById('recTargetUserDropdown').classList.remove('open');
    }
  });

/* ════════════════════════════════════════════════════════════
   FUNCIONES FALTANTES — Implementadas post-migración Firebase
   ════════════════════════════════════════════════════════════ */

/* ── recargar: actualiza contadores y re-renderiza el panel visible ── */
function recargar() {
  actualizarContadores();
  mostrarEstadoFirebase();
  var activo = document.querySelector('.panel.active');
  if (!activo) return;
  var id = activo.id.replace('panel-', '');
  if      (id === 'solicitudes') renderTabla();
  else if (id === 'pendientes')  renderPendientes();
  else if (id === 'aprobados')   renderAprobados();
  else if (id === 'historial')   renderAuditoria();
  else if (id === 'dashboard')   renderDashboard();
  /* PQRS y usuarios no se recargan automáticamente — tienen su propia carga */
}

/* ── exportarExcel: descarga solicitudes en CSV (compatible con Excel) ── */
function exportarExcel() {
  var db = cargarDB();
  if (!db.length) { showToast('Sin datos para exportar', '⚠️'); return; }
  var headers = ['ID','Radicado','Tipo','Estado','Nombre Titular','Cédula',
                 'Teléfono','Correo','Dirección','Asesor','Fecha Registro','Fecha Límite'];
  var rows = db.map(function(s) {
    return [s.id, s.radicado, s.tipoLabel||s.tipo, s.estado,
            s.nombreTitular, s.cedula||s.documento,
            s.telefono, s.correo, s.direccion, s.asesor,
            s.fechaRegistro ? new Date(s.fechaRegistro).toLocaleDateString('es-CO') : '',
            s.fechaLimite||'']
      .map(function(v) { return '"' + (v||'').replace(/"/g, '""') + '"'; }).join(';');
  });
  var csv  = '\uFEFF' + headers.map(function(h){ return '"'+h+'"'; }).join(';') + '\n' + rows.join('\n');
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href     = url;
  a.download = 'FondoUne_Solicitudes_' + new Date().toISOString().slice(0,10) + '.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
  if (window.FU_Sound) window.FU_Sound.play('success');
  showToast('Exportado: ' + db.length + ' registros', '📥');
}

/* ── Sidebar móvil ── */
function toggleSidebarMovil() {
  var sidebar = document.querySelector('.sidebar');
  var overlay = document.getElementById('sidebarOverlay');
  if (!sidebar) return;
  var abierto = sidebar.classList.toggle('open');
  if (overlay) overlay.classList.toggle('show', abierto);
}
function cerrarSidebarMovil() {
  var sidebar = document.querySelector('.sidebar');
  var overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('show');
}

/* ════════════════════════════════════════════════════════════
   GESTIÓN DE USUARIOS — Firebase Auth + Firestore
   ════════════════════════════════════════════════════════════ */

/* ── Mostrar / ocultar ítem de nav "Usuarios" según rol ── */
function actualizarNavAdmin() {
  var esAdmin = window.sesionActual && window.sesionActual.rol === 'Administrador';
  var navUsr  = document.getElementById('nav-usuarios');
  if (navUsr) navUsr.style.display = esAdmin ? '' : 'none';
}

/* ── Renderizar tabla de usuarios desde Firestore ── */
function renderUsrTable() {
  /* Solo ejecutar si hay sesión activa de administrador */
  if (!window.sesionActual || window.sesionActual.rol !== 'Administrador') return;
  if (!window._fbDB) return;

  var tbody    = document.getElementById('usrTableBody');
  var countTxt = document.getElementById('usr-count-txt');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:20px;color:var(--muted)">⏳ Cargando usuarios…</td></tr>';

  window._fbDB.collection('usuarios').get()
    .then(function(snap) {
      var users = [];
      snap.forEach(function(doc) {
        users.push(Object.assign({ _uid: doc.id }, doc.data()));
      });
      if (countTxt) countTxt.textContent = users.length + ' usuario' + (users.length !== 1 ? 's' : '');

      if (!users.length) {
        tbody.innerHTML = '<tr><td colspan="3"><div class="empty-state"><div class="ei">👥</div>' +
          '<h3>Sin usuarios</h3><p>No hay perfiles en Firestore › colección "usuarios".</p></div></td></tr>';
        return;
      }

      tbody.innerHTML = '';
      users.forEach(function(u) {
        var activo         = u.activo !== false;
        var esSesionActual = window.sesionActual && u._uid === window.sesionActual.uid;
        var rolColor       = u.rol === 'Administrador'
          ? 'background:#FEF3C7;color:#92400E;'
          : 'background:#E8F8F0;color:#0D7A4E;';

        var tr = document.createElement('tr');

        /* Nombre + email */
        var td1 = document.createElement('td');
        td1.innerHTML =
          '<div class="tr-name">' + escHtml(u.nombre || '—') +
          (esSesionActual ? ' <span style="font-size:10px;color:var(--muted);">(tú)</span>' : '') + '</div>' +
          '<div class="tr-sub">' + escHtml(u.email || u._uid) + '</div>';

        /* Rol + estado activo */
        var td2 = document.createElement('td');
        td2.innerHTML =
          '<span class="badge" style="' + rolColor + '">' + escHtml(u.rol || '—') + '</span>' +
          (!activo ? ' <span class="badge" style="background:#FEE2E2;color:#991B1B;font-size:10px;margin-left:4px;">Inactivo</span>' : '');

        /* Acciones */
        var td3  = document.createElement('td');
        var wrap = document.createElement('div');
        wrap.className = 'row-actions';

        var btnEdit = document.createElement('button');
        btnEdit.className = 'act-btn';
        btnEdit.title     = 'Editar nombre / rol';
        btnEdit.textContent = '✏️';
        (function(uid) {
          btnEdit.addEventListener('click', function() { _abrirEditarUsuario(uid); });
        })(u._uid);
        wrap.appendChild(btnEdit);

        /* Botón activar/desactivar solo para usuarios distintos al actual */
        if (!esSesionActual) {
          var btnToggle = document.createElement('button');
          btnToggle.className   = 'act-btn';
          btnToggle.title       = activo ? 'Desactivar acceso' : 'Activar acceso';
          btnToggle.textContent = activo ? '🔴' : '🟢';
          (function(uid, estadoActivo) {
            btnToggle.addEventListener('click', function() { _toggleActivoUsuario(uid, estadoActivo); });
          })(u._uid, activo);
          wrap.appendChild(btnToggle);
        }

        td3.appendChild(wrap);
        tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3);
        tbody.appendChild(tr);
      });
    })
    .catch(function(err) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:16px;color:#EF4444">⚠️ Error al cargar: ' +
        escHtml(err.message) + '</td></tr>';
    });
}

/* ── Helper: abrir / cerrar el modal de usuarios ── */
function _abrirUsrModal() {
  var overlay = document.getElementById('usrOverlay');
  var modal   = document.getElementById('usrModal');
  if (overlay) overlay.classList.add('show');
  if (modal) {
    modal.style.opacity       = '1';
    modal.style.transform     = 'translate(-50%,-50%) scale(1)';
    modal.style.pointerEvents = 'auto';
  }
}
function cerrarUsrModal() {
  var overlay = document.getElementById('usrOverlay');
  var modal   = document.getElementById('usrModal');
  if (overlay) overlay.classList.remove('show');
  if (modal) {
    modal.style.opacity       = '0';
    modal.style.transform     = 'translate(-50%,-48%) scale(.96)';
    modal.style.pointerEvents = 'none';
  }
}

/* ── Abrir modal en modo CREAR ── */
function abrirCrearUsuario() {
  if (!window.sesionActual || window.sesionActual.rol !== 'Administrador') {
    showToast('Solo administradores pueden crear usuarios', '⚠️'); return;
  }
  document.getElementById('usrModalTitle').textContent  = '👤 Nuevo Usuario';
  document.getElementById('usrEditKey').value           = '';
  document.getElementById('usrNombre').value            = '';
  document.getElementById('usrLogin').value             = '';
  document.getElementById('usrLogin').disabled          = false;
  document.getElementById('usrRol').value               = 'Asesor';
  document.getElementById('usrPass').value              = '';
  document.getElementById('usrPass2').value             = '';
  document.getElementById('usrModalMsg').textContent    = '';
  /* Campos de contraseña visibles solo en creación */
  document.getElementById('usrPassField').style.display       = '';
  document.getElementById('usrPassField2').style.display      = '';
  document.getElementById('usrPassCambioField').style.display = 'none';
  _abrirUsrModal();
}

/* ── Abrir modal en modo EDITAR ── */
function _abrirEditarUsuario(uid) {
  if (!window._fbDB) return;
  window._fbDB.collection('usuarios').doc(uid).get()
    .then(function(doc) {
      if (!doc.exists) { showToast('Usuario no encontrado', '⚠️'); return; }
      var u = doc.data();
      document.getElementById('usrModalTitle').textContent = '✏️ Editar Usuario';
      document.getElementById('usrEditKey').value  = uid;
      document.getElementById('usrNombre').value   = u.nombre || '';
      document.getElementById('usrLogin').value    = u.email  || '';
      document.getElementById('usrLogin').disabled = true;   /* email no editable */
      document.getElementById('usrRol').value      = u.rol   || 'Asesor';
      document.getElementById('usrModalMsg').textContent = '';
      /* En edición: sin campos de contraseña nueva — ver nota de seguridad */
      document.getElementById('usrPassField').style.display       = 'none';
      document.getElementById('usrPassField2').style.display      = 'none';
      document.getElementById('usrPassCambioField').style.display = 'none';
      _abrirUsrModal();
    })
    .catch(function(err) { showToast('Error: ' + err.message, '❌'); });
}

/* ── Segunda instancia de Firebase para crear usuarios sin cerrar la sesión del admin ──
   createUserWithEmailAndPassword hace signIn del nuevo usuario automáticamente.
   Usando una segunda app ese signIn ocurre en un contexto separado y la sesión del
   admin queda intacta en la app principal.                                             ── */
var _secondaryApp = null;
function _getSecondaryApp() {
  if (_secondaryApp) return _secondaryApp;
  try   { _secondaryApp = firebase.app('fu_secundaria'); }
  catch (e) { _secondaryApp = firebase.initializeApp(firebase.app().options, 'fu_secundaria'); }
  return _secondaryApp;
}

/* ── Guardar usuario (crear o editar) — llamado por el botón "💾 Guardar" ── */
function guardarUsuario() {
  var uid    = (document.getElementById('usrEditKey').value || '').trim();
  var nombre = (document.getElementById('usrNombre').value  || '').trim();
  var email  = (document.getElementById('usrLogin').value   || '').trim().toLowerCase();
  var rol    = document.getElementById('usrRol').value;
  var msgEl  = document.getElementById('usrModalMsg');
  var btnG   = document.getElementById('usrGuardarBtn');

  msgEl.style.color = '#EF4444';
  msgEl.textContent = '';

  if (!nombre) { msgEl.textContent = 'El nombre completo es obligatorio.'; return; }

  /* ════ MODO EDICIÓN ════ */
  if (uid) {
    msgEl.style.color = 'var(--muted)';
    msgEl.textContent = '⏳ Guardando cambios…';
    btnG.disabled = true;

    window._fbDB.collection('usuarios').doc(uid).update({ nombre: nombre, rol: rol })
      .then(function() {
        btnG.disabled = false;
        cerrarUsrModal();
        renderUsrTable();
        registrarAudit('Usuario editado: ' + nombre, { id: 'admin', radicado: 'USR_EDIT', nombreTitular: nombre });
        showToast('Usuario actualizado', '✅');
        /* Actualizar sesión si el admin editó su propio perfil */
        if (window.sesionActual && uid === window.sesionActual.uid) {
          window.sesionActual.nombre = nombre;
          window.sesionActual.rol    = rol;
          actualizarNavAdmin();
          var su = document.getElementById('sessionUser');
          if (su) su.textContent = '● ' + nombre + ' (' + rol + ')';
        }
      })
      .catch(function(err) {
        btnG.disabled = false;
        msgEl.style.color = '#EF4444';
        msgEl.textContent = 'Error al guardar: ' + (err.message || err.code);
      });
    return;
  }

  /* ════ MODO CREACIÓN ════ */
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    msgEl.textContent = 'Ingresa un correo electrónico válido.'; return;
  }
  var pass  = document.getElementById('usrPass').value  || '';
  var pass2 = document.getElementById('usrPass2').value || '';
  if (pass.length < 8) { msgEl.textContent = 'La contraseña debe tener mínimo 8 caracteres.'; return; }
  if (pass !== pass2)  { msgEl.textContent = 'Las contraseñas no coinciden.'; return; }

  msgEl.style.color = 'var(--muted)';
  msgEl.textContent = '⏳ Creando usuario en Firebase…';
  btnG.disabled = true;

  var secApp  = _getSecondaryApp();
  var secAuth = secApp.auth();

  secAuth.createUserWithEmailAndPassword(email, pass)
    .then(function(cred) {
      var newUid = cred.user.uid;
      secAuth.signOut(); /* cerrar sesión de la app secundaria de inmediato */
      return window._fbDB.collection('usuarios').doc(newUid).set({
        email:     email,
        nombre:    nombre,
        rol:       rol,
        activo:    true,
        creadoEn:  new Date().toISOString(),
        creadoPor: window.sesionActual ? window.sesionActual.uid : '—'
      });
    })
    .then(function() {
      btnG.disabled = false;
      cerrarUsrModal();
      renderUsrTable();
      registrarAudit('Usuario creado: ' + nombre + ' <' + email + '>', { id: 'admin', radicado: 'USR_CREATE', nombreTitular: nombre });
      showToast('Usuario "' + nombre + '" creado correctamente', '✅');
    })
    .catch(function(err) {
      btnG.disabled = false;
      msgEl.style.color = '#EF4444';
      switch (err.code) {
        case 'auth/email-already-in-use': msgEl.textContent = 'Ya existe una cuenta con ese correo.'; break;
        case 'auth/invalid-email':        msgEl.textContent = 'El formato del correo no es válido.'; break;
        case 'auth/weak-password':        msgEl.textContent = 'Contraseña demasiado débil (Firebase requiere mínimo 6 caracteres).'; break;
        default: msgEl.textContent = 'Error: ' + (err.message || err.code);
      }
    });
}

/* ── Activar / Desactivar acceso de un usuario (campo "activo" en Firestore) ── */
function _toggleActivoUsuario(uid, estaActivo) {
  if (!window._fbDB) return;
  var nuevoEstado = !estaActivo;
  if (!confirm((nuevoEstado ? '¿Activar' : '¿Desactivar') + ' el acceso de este usuario?')) return;

  window._fbDB.collection('usuarios').doc(uid).update({ activo: nuevoEstado })
    .then(function() {
      renderUsrTable();
      registrarAudit('Usuario ' + (nuevoEstado ? 'activado' : 'desactivado') + ' UID: ' + uid,
        { id: 'admin', radicado: 'USR_TOGGLE', nombreTitular: uid });
      showToast('Usuario ' + (nuevoEstado ? 'activado' : 'desactivado'), nuevoEstado ? '🟢' : '🔴');
    })
    .catch(function(err) { showToast('Error: ' + err.message, '❌'); });
}
