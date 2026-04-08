var DB_KEY = 'fondoune_solicitudes';
var AUDIT_KEY = 'fondoune_auditoria';
var solicitudActual = null;
var paginaActual = 1;
var POR_PAGINA = 10;
var notificacionesLeidas = [];

/* ═══ SESIÓN FIREBASE AUTH — reemplaza SEC.SESS_KEY ═══ */
var _sesionActual = null; // { uid, email, nombre, rol }

function setSesionActual(datos) {
  _sesionActual = datos;
}
function getSesionActual() {
  return _sesionActual;
}

function getUsuarioSesion() {
  if (_sesionActual) {
    return (_sesionActual.nombre || _sesionActual.email || 'Empleado') + ' (' + (_sesionActual.rol || 'Asesor') + ')';
  }
  // Fallback: intentar leer de Firebase Auth
  var auth = firebase && firebase.auth ? firebase.auth() : null;
  if (auth && auth.currentUser) {
    return auth.currentUser.email || 'Empleado';
  }
  return 'Empleado';
}

function esAdmin() {
  if (_sesionActual) return _sesionActual.rol === 'Administrador';
  return false;
}

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

/* ═══ DB — localStorage como caché local ═══ */
function cargarDB() {
  try { return JSON.parse(localStorage.getItem(DB_KEY) || '[]'); }
  catch(e) { return []; }
}
function guardarDB(d) {
  try { localStorage.setItem(DB_KEY, JSON.stringify(d)); return true; }
  catch(e) { return false; }
}

/* Guardar en Firebase */
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

/* Escucha en tiempo real */
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

/* Auditoría */
function cargarAudit(){ try{return JSON.parse(localStorage.getItem(AUDIT_KEY)||'[]');}catch(e){return [];} }
function guardarAudit(d){ try{localStorage.setItem(AUDIT_KEY,JSON.stringify(d));}catch(e){} }

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
  if (window.FU_Sound) window.FU_Sound.play('stateChange');
  if(!db[idx].historial) db[idx].historial=[];
  db[idx].historial.unshift({
    accion:'Estado cambiado: '+anterior+' → '+sel.value,
    fecha:new Date().toISOString(), usuario:getUsuarioSesion()
  });
  var etiquetas = { pendiente:'Pendiente', revision:'En Revisión', aprobado:'Aprobado', rechazado:'Rechazado', desembolsado:'Desembolsado' };
  db[idx].estadoLabel   = etiquetas[sel.value] || sel.value;
  db[idx].estadoUpdated = new Date().toISOString();
  db[idx].asesor        = db[idx].asesor || getUsuarioSesion();
  db[idx].cedula        = (db[idx].cedula || db[idx].documento || '').replace(/\./g,'').replace(/\s/g,'').trim();
  guardarDB(db);
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

/* ── Cache de elementos DOM ── */
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
  if (window.FU_Sound) window.FU_Sound.play('click');
  if(id==='solicitudes') renderTabla();
  if(id==='pendientes') renderPendientes();
  if(id==='aprobados') renderAprobados();
  if(id==='historial') renderAuditoria();
  if(id==='dashboard') renderDashboard();
  if(id==='pqrs') renderPQRS();
}

/* ═══ NOTIFICACIONES ═══ */
var notifData=[];
function agregarNotificacion(titulo, msg, solId){
  notifData.unshift({titulo:titulo,msg:msg,solId:solId,time:new Date().toISOString(),leida:false});
  if(notifData.length>20) notifData=notifData.slice(0,20);
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
  var notifPanel = $id('notifPanel');
  var notifBtn = $id('notifBtn');
  if(notifPanel && notifBtn && !notifPanel.contains(e.target)&&!notifBtn.contains(e.target)){
    notifPanel.classList.remove('show');
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
  waves.style.display = enabled ? 'block' : 'none';
  icon.style.opacity = enabled ? '1' : '0.5';
}
document.addEventListener('DOMContentLoaded', function() {
  if (window.FU_Sound) updateSoundIcon(window.FU_Sound.enabled);
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
  var compra=db.filter(function(s){return s.tipo==='compra';}).length;
  var const_=db.filter(function(s){return s.tipo==='construccion';}).length;
  var grav=db.filter(function(s){return s.tipo==='gravamen';}).length;
  dibujarDonut([compra,const_,grav],['#E8511A','#0D7A4E','#C0392B']);
  $id('legendTipo').innerHTML=[
    {lbl:'Compra de Vivienda',val:compra,col:'#E8511A'},
    {lbl:'Construcción y Mejoras',val:const_,col:'#0D7A4E'},
    {lbl:'Gravamen Hipotecario',val:grav,col:'#C0392B'}
  ].map(function(i){
    return '<div class="dl-item"><div class="dl-dot" style="background:'+i.col+'"></div><span class="dl-lbl">'+i.lbl+'</span><span class="dl-val">'+i.val+'</span></div>';
  }).join('');
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
  var size = window.innerWidth <= 480 ? 130 : (window.innerWidth <= 768 ? 140 : 120);
  canvas.width=size; canvas.height=size;
  canvas.style.width=size+'px'; canvas.style.height=size+'px';
  var ctx=canvas.getContext('2d');
  var total=vals.reduce(function(a,b){return a+b;},0)||1;
  var cx=size/2, cy=size/2, r=size/2-4, ir=size/2-22;
  ctx.clearRect(0,0,size,size);
  var start=-Math.PI/2;
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
  ctx.beginPath(); ctx.arc(cx,cy,ir,0,2*Math.PI);
  ctx.fillStyle='#fff'; ctx.fill();
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
function filtrar(){ paginaActual=1; renderTabla(); }
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

/* ═══ PQRS ═══ */
var _pqrsCache = [];

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

function _pqrsGuardarLocal() {
  try { localStorage.setItem('fondoune_pqrs', JSON.stringify(_pqrsCache)); } catch(e) {}
}

function renderPQRS() {
  var body = $id('tblPQRS');
  if (!body) return;
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
      'peticion':'badge-revision','queja':'badge-rechazado','reclamo':'badge-pendiente',
      'sugerencia':'badge-construccion','credito_vivienda':'badge-compra',
      'cancelacion_hipoteca':'badge-gravamen','certificado_tributario':'badge-revision',
      'paz_y_salvo':'badge-aprobado','abono_libre_inversion':'badge-construccion','otra':'badge-pendiente'
    };
    db.forEach(function(s) {
      var id=String(s.id||'');
      var tipo=s.tipoSolicitud||s.tipoLabel||'otra';
      var cls=tiposBadge[tipo]||'badge-pendiente';
      var label=s.tipoLabel||tipo;
      var nombre=s.nombre||s.nombreTitular||'—';
      var doc=s.documento||s.cedula||'—';
      var resumen=(s.inquietud||'').substring(0,55)+((s.inquietud||'').length>55?'…':'');
      var tr=body.insertRow();
      var c0=tr.insertCell(); var sp=document.createElement('span'); sp.className='tr-id'; sp.textContent=id; c0.appendChild(sp);
      var c1=tr.insertCell(); var d1=document.createElement('div'); d1.className='tr-name'; d1.textContent=nombre; var d2=document.createElement('div'); d2.className='tr-sub'; d2.textContent='Doc: '+doc; c1.appendChild(d1); c1.appendChild(d2);
      var c2=tr.insertCell(); var b2=document.createElement('span'); b2.className='badge '+cls; b2.textContent=label; c2.appendChild(b2);
      var c3=tr.insertCell(); c3.style.cssText='max-width:180px;font-size:12px;color:var(--muted)'; c3.textContent=resumen;
      var c4=tr.insertCell(); c4.style.fontSize='12.5px'; c4.innerHTML=escHtml(s.telefono||'—')+'<br><span style="color:var(--muted);font-size:11px">'+escHtml(s.correo||'')+'</span>';
      var c5=tr.insertCell(); c5.style.cssText='font-size:12px;color:var(--muted)'; c5.textContent=fmtFechaCorta(s.fechaRegistro);
      var c6=tr.insertCell();
      var sel=document.createElement('select');
      sel.className='estado-sel estado-'+(s.estado||'pendiente');
      [{v:'pendiente',l:'⏳ Pendiente'},{v:'revision',l:'🔍 En Revisión'},{v:'resuelto',l:'✅ Resuelto'},{v:'cerrado',l:'🔒 Cerrado'}].forEach(function(opt){
        var o=document.createElement('option'); o.value=opt.v; o.textContent=opt.l;
        if(s.estado===opt.v) o.selected=true; sel.appendChild(o);
      });
      (function(pqrsId){ sel.addEventListener('change',function(){ cambiarEstadoPQRS(pqrsId,sel); }); })(id);
      c6.appendChild(sel);
      var c7=tr.insertCell(); var wrap=document.createElement('div'); wrap.className='row-actions';
      var btnVer=document.createElement('button'); btnVer.className='act-btn'; btnVer.title='Ver detalle'; btnVer.textContent='🔍';
      (function(pid){ btnVer.addEventListener('click',function(){ verDetallePQRS(pid); }); })(id);
      var btnDoc=document.createElement('button'); btnDoc.className='act-btn'; btnDoc.title='Descargar Word'; btnDoc.textContent='📄';
      (function(pid){ btnDoc.addEventListener('click',function(){ descargarPQRS(pid); }); })(id);
      var btnDel=document.createElement('button'); btnDel.className='act-btn danger'; btnDel.title='Eliminar'; btnDel.textContent='🗑️';
      (function(pid){ btnDel.addEventListener('click',function(){ eliminarPQRS(pid); }); })(id);
      wrap.appendChild(btnVer); wrap.appendChild(btnDoc); wrap.appendChild(btnDel); c7.appendChild(wrap);
    });
  });
}

function cambiarEstadoPQRS(id, sel) {
  var idx=_pqrsCache.findIndex(function(s){return s.id===id;});
  if(idx<0) return;
  var anterior=_pqrsCache[idx].estado||'pendiente';
  _pqrsCache[idx].estado=sel.value;
  sel.className='estado-sel estado-'+sel.value;
  if(!_pqrsCache[idx].historial) _pqrsCache[idx].historial=[];
  _pqrsCache[idx].historial.unshift({accion:'Estado PQRS: '+anterior+' → '+sel.value,fecha:new Date().toISOString(),usuario:getUsuarioSesion()});
  if(window._fbDB){ window._fbDB.collection('pqrs').doc(id).set(_pqrsCache[idx],{merge:true}).catch(function(e){console.warn('[PQRS] update error:',e);}); }
  _pqrsGuardarLocal();
  if(window.FU_Sound) window.FU_Sound.play('notification');
  showToast('Estado PQRS: '+sel.value,'🔄');
}

function verDetallePQRS(id) {
  var s=_pqrsCache.find(function(x){return x.id===id;});
  if(!s){showToast('PQRS no encontrada','⚠️');return;}
  solicitudActual=s;
  $id('modalTitle').textContent='PQRS — '+(s.nombre||s.nombreTitular||id);
  var campos=[
    {l:'ID',v:s.id||'—',full:false},{l:'Tipo de Solicitud',v:s.tipoLabel||s.tipoSolicitud||'—',full:false},
    {l:'Estado',v:s.estado||'pendiente',full:false},{l:'Nombre',v:s.nombre||s.nombreTitular||'—',full:false},
    {l:'Documento',v:s.documento||s.cedula||'—',full:false},{l:'Teléfono',v:s.telefono||'—',full:false},
    {l:'Correo',v:s.correo||'—',full:false},{l:'Fecha Registro',v:fmtFecha(s.fechaRegistro),full:false},
    {l:'Inquietud / Mensaje',v:s.inquietud||'—',full:true}
  ];
  var histHTML='';
  if(s.historial&&s.historial.length){
    histHTML='<div style="margin-top:20px"><div class="card-title" style="margin-bottom:12px">📜 Historial</div><div class="hist-timeline">'
      +s.historial.map(function(h){return '<div class="ht-item"><div class="ht-dot"></div><div class="ht-body"><div class="ht-accion">'+escHtml(h.accion)+'</div><div class="ht-meta">'+escHtml(h.usuario||'—')+' · '+fmtFecha(h.fecha)+'</div></div></div>';}).join('')
      +'</div></div>';
  }
  $id('modalBody').innerHTML='<div class="detail-grid">'+campos.map(function(c){return '<div class="detail-field'+(c.full?' detail-full':'')+'"><div class="detail-lbl">'+c.l+'</div><div class="detail-val">'+escHtml(String(c.v))+'</div></div>';}).join('')+'</div>'+histHTML;
  var btnWord=$id('btnGenDocx');
  if(btnWord){btnWord.textContent='📄 Descargar Word';btnWord.onclick=function(){descargarPQRS(id);cerrarModalBtn();};}
  $id('modalOverlay').classList.add('show');
}

function descargarPQRS(id) {
  var s=_pqrsCache.find(function(x){return x.id===id;});
  if(!s){showToast('PQRS no encontrada','⚠️');return;}
  var lib=(typeof docx!=='undefined'&&docx.Document)?docx:window;
  if(!lib.Document){showToast('Librería docx no disponible','⚠️');return;}
  var DD=lib.Document,PK=lib.Packer,PA=lib.Paragraph,RN=lib.TextRun,WT=lib.WidthType,AL=lib.AlignmentType,TC=lib.TableCell,TR=lib.TableRow,TB=lib.Table;
  var filas=[['ID',s.id||'—'],['Tipo Solicitud',s.tipoLabel||s.tipoSolicitud||'—'],['Estado',s.estado||'pendiente'],['Nombre',s.nombre||s.nombreTitular||'—'],['Documento',s.documento||s.cedula||'—'],['Teléfono',s.telefono||'—'],['Correo',s.correo||'—'],['Fecha',s.fechaRegistro?new Date(s.fechaRegistro).toLocaleDateString('es-CO'):'—'],['Inquietud',s.inquietud||'—']];
  var rows=filas.map(function(r){return new TR({children:[new TC({children:[new PA({children:[new RN({text:r[0],bold:true,size:20})]})],width:{size:30,type:WT.PERCENTAGE}}),new TC({children:[new PA({children:[new RN({text:r[1],size:20})]})],width:{size:70,type:WT.PERCENTAGE}})]});});
  var doc=new DD({sections:[{properties:{},children:[new PA({alignment:AL.CENTER,children:[new RN({text:'FondoUne — Registro PQRS',bold:true,size:32,color:'E8511A'})]}),new PA({alignment:AL.CENTER,children:[new RN({text:'Petición · Queja · Reclamo · Sugerencia',size:22,color:'7A5540'})]}),new PA({children:[]}),new TB({rows:rows,width:{size:100,type:WT.PERCENTAGE}})]}]});
  PK.toBlob(doc).then(function(blob){
    var url=URL.createObjectURL(blob);var a=document.createElement('a');a.href=url;
    a.download='FondoUne_PQRS_'+(s.nombre||'asociado').replace(/\s+/g,'_')+'_'+new Date().toISOString().slice(0,10)+'.docx';
    document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(function(){URL.revokeObjectURL(url);},1000);
    if(window.FU_Sound) window.FU_Sound.play('download');
    showToast('PQRS descargada correctamente','📄');
  }).catch(function(e){showToast('Error al generar Word: '+e.message,'❌');});
}

function eliminarPQRS(id) {
  if(!confirm('¿Eliminar definitivamente esta PQRS?\n\nEsta acción no se puede deshacer.')) return;
  if(window._fbDB){window._fbDB.collection('pqrs').doc(id).delete().catch(function(e){console.warn('[PQRS] delete error:',e);});}
  _pqrsCache=_pqrsCache.filter(function(s){return s.id!==id;});
  _pqrsGuardarLocal();
  if(window.FU_Sound) window.FU_Sound.play('click');
  renderPQRS();
  showToast('PQRS eliminada','🗑️');
}

function exportarPQRS() {
  if(!_pqrsCache.length){cargarPQRS(function(db){if(db.length)_doPQRScsv(db);else showToast('Sin PQRS para exportar','⚠️');});return;}
  _doPQRScsv(_pqrsCache);
}
function _doPQRScsv(db) {
  var hdr=['ID','Tipo','Estado','Nombre','Documento','Teléfono','Correo','Fecha','Inquietud'];
  var rows=db.map(function(s){return[s.id,s.tipoLabel||s.tipoSolicitud,s.estado,s.nombre||s.nombreTitular,s.documento||s.cedula,s.telefono,s.correo,s.fechaRegistro?new Date(s.fechaRegistro).toLocaleDateString('es-CO'):'',(s.inquietud||'').replace(/;/g,'|').replace(/\n/g,' ')].map(function(v){return'"'+(v||'')+'"';}).join(';');});
  var csv='\uFEFF'+hdr.join(';')+'\n'+rows.join('\n');
  var blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  var url=URL.createObjectURL(blob);var a=document.createElement('a');a.href=url;
  a.download='FondoUne_PQRS_'+new Date().toISOString().slice(0,10)+'.csv';
  document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(function(){URL.revokeObjectURL(url);},1000);
  if(window.FU_Sound) window.FU_Sound.play('success');
  showToast('PQRS exportadas ('+db.length+' registros)','📥');
}

/* ═══ MODAL DETALLE ═══ */
function verDetalle(id){
  var db=cargarDB();
  var sol=db.find(function(s){return s.id===id;});
  if(!sol) return;
  solicitudActual=sol;
  $id('modalTitle').textContent='Solicitud: '+(sol.radicado||sol.id);
  var campos=[
    {l:'ID Sistema',v:sol.id,full:false},{l:'Radicado',v:sol.radicado||'—',full:false},
    {l:'Tipo',v:sol.tipoLabel||sol.tipo,full:false},{l:'Estado',v:sol.estado,full:false},
    {l:'Nombre Titular / Asociado',v:sol.nombreTitular||sol.nombre||'—',full:false},
    {l:'Cédula',v:sol.cedula||sol.documento||'—',full:false},
    {l:'Fecha Expedición Cédula',v:sol.fechaExpCedula||'—',full:false},
    {l:'Lugar Expedición Cédula',v:sol.lugarExpCedula||'—',full:false},
    {l:'RUT / NIT',v:sol.rutTitular||'—',full:false},{l:'Teléfono',v:sol.telefono||'—',full:false},
    {l:'Correo Electrónico',v:sol.correo||'—',full:false},{l:'Dirección del Inmueble',v:sol.direccion||'—',full:true},
    {l:'Asesor Responsable',v:sol.asesor||'—',full:false},{l:'Fecha de Registro',v:fmtFecha(sol.fechaRegistro),full:false},
    {l:'Fecha Límite Docs.',v:sol.fechaLimite||'—',full:false}
  ];
  if(sol.tipo==='compra'){campos.push({l:'Nombre Vendedor',v:sol.nombreVendedor||'—',full:false});campos.push({l:'Cédula Vendedor',v:sol.cedulaVendedor||'—',full:false});}
  if(sol.tipo==='construccion'){campos.push({l:'Codeudor',v:sol.nombreCodeudor||'—',full:false});campos.push({l:'Tipo de Obra',v:sol.tipoObra||'—',full:false});}
  if(sol.tipo==='gravamen'){campos.push({l:'Entidad Financiera',v:sol.entidadFinanciera||'—',full:false});campos.push({l:'Valor del Crédito',v:sol.valorCredito||'—',full:false});}
  var histHTML='';
  if(sol.historial&&sol.historial.length){
    histHTML='<div style="margin-top:20px"><div class="card-title" style="margin-bottom:12px">📜 Historial de la Solicitud</div><div class="hist-timeline">'
      +sol.historial.map(function(h){return '<div class="ht-item"><div class="ht-dot"></div><div class="ht-body"><div class="ht-accion">'+h.accion+'</div><div class="ht-meta">'+h.usuario+' · '+fmtFecha(h.fecha)+'</div></div></div>';}).join('')
      +'</div></div>';
  }
  $id('modalBody').innerHTML='<div class="detail-grid">'+campos.map(function(c){return '<div class="detail-field'+(c.full?' detail-full':'')+'"><div class="detail-lbl">'+c.l+'</div><div class="detail-val">'+c.v+'</div></div>';}).join('')+'</div>'+histHTML;
  $id('modalOverlay').classList.add('show');
}
function cerrarModal(e){ if(e.target===$id('modalOverlay')) cerrarModalBtn(); }
function cerrarModalBtn(){ $id('modalOverlay').classList.remove('show'); }

/* ═══ ELIMINAR SOLICITUD ═══ */
function eliminarSolicitud(id){
  if(!confirm('¿Eliminar esta solicitud? Esta acción no se puede deshacer.')) return;
  var db=cargarDB();
  var sol=db.find(function(s){return s.id===id;});
  if(sol) registrarAudit('Solicitud eliminada',sol);
  db=db.filter(function(s){return s.id!==id;});
  guardarDB(db);
  if(window._fbDB){window._fbDB.collection('solicitudes').doc(id).delete().then(function(){console.log('✅ Eliminado de Firebase:',id);}).catch(function(e){console.warn('⚠️ Error al eliminar de Firebase:',e);});}
  if(window.FU_Sound) window.FU_Sound.play('error');
  recargar();
  showToast('Solicitud eliminada','🗑');
}

/* ═══ GENERAR DOCX ═══ */
function generarDocxDesdeModal(){ if(solicitudActual) generarDocx(solicitudActual.id); }
function generarDocx(id){
  var db=cargarDB();
  var sol=db.find(function(s){return s.id===id;});
  if(!sol){showToast('Solicitud no encontrada','❌');return;}
  try{ buildDocx(sol); }
  catch(e){ showToast('Error al generar: '+e.message,'❌'); }
}

/* ═══ EXPORTAR EXCEL ═══ */
function exportarExcel(){
  var db=cargarDB();
  if(!db.length){showToast('No hay solicitudes para exportar','⚠️');return;}
  var cabeceras=['ID','Radicado','Tipo','Nombre Titular','Cédula','Teléfono','Correo','Dirección','Asesor','Fecha Registro','Fecha Límite','Estado','Valor/Presupuesto'];
  var filas=db.map(function(s){
    var valor=s.valorPresupuesto||s.valorCredito||'—';
    return [s.id,s.radicado,s.tipoLabel||s.tipo,s.nombreTitular,s.cedula,s.telefono||'',s.correo||'',s.direccion||'',s.asesor||'',fmtFecha(s.fechaRegistro),s.fechaLimite||'',s.estado,valor];
  });
  var csv=[cabeceras.join(',')].concat(filas.map(function(f){return f.map(function(v){return '"'+(v||'').toString().replace(/"/g,'""')+'"';}).join(',');})).join('\n');
  var bom='\uFEFF';
  var blob=new Blob([bom+csv],{type:'text/csv;charset=utf-8;'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');a.href=url;a.download='FondoUne_Solicitudes_'+new Date().toISOString().slice(0,10)+'.csv';document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
  if(window.FU_Sound) window.FU_Sound.play('download');
  registrarAudit('Exportación a Excel/CSV realizada',{id:'sistema',radicado:'EXPORT',nombreTitular:'Sistema'});
  showToast('Exportado: '+db.length+' registros','📥');
}

/* ═══ RECARGAR ═══ */
function recargar(){
  actualizarContadores();
  var panelActivo=document.querySelector('.panel.active');
  if(panelActivo){var id=panelActivo.id.replace('panel-','');showPanel(id);}
}

/* ═══ MÓVIL ═══ */
function toggleSidebarMovil(){var sb=document.querySelector('.sidebar');var ov=document.getElementById('sidebarOverlay');sb.classList.toggle('mobile-open');ov.classList.toggle('show');}
function cerrarSidebarMovil(){var sb=document.querySelector('.sidebar');var ov=document.getElementById('sidebarOverlay');if(!sb||!ov)return;sb.classList.remove('mobile-open');ov.classList.remove('show');}
var _showPanelOrig=showPanel;
showPanel=function(id){_showPanelOrig(id);if(window.innerWidth<=768)cerrarSidebarMovil();};
function _debounce(fn,ms){var t;return function(){clearTimeout(t);t=setTimeout(fn,ms);};}
window.addEventListener('resize',_debounce(function(){var db=cargarDB();if(db.length>=0){var compra=db.filter(function(s){return s.tipo==='compra';}).length;var const_=db.filter(function(s){return s.tipo==='construccion';}).length;var grav=db.filter(function(s){return s.tipo==='gravamen';}).length;dibujarDonut([compra,const_,grav],['#E8511A','#0D7A4E','#C0392B']);}},150));
(function(){function checkMobile(){var btn=document.getElementById('mobileMenuBtn');if(!btn)return;btn.style.display=window.innerWidth<=768?'flex':'none';}checkMobile();window.addEventListener('resize',_debounce(checkMobile,100));})();

/* ═══ INIT ═══ */
(function init(){
  mostrarEstadoFirebase();
  function arrancarApp(){
    var db=cargarDB();
    var pend=db.filter(function(s){return s.estado==='pendiente';});
    if(pend.length){agregarNotificacion('Solicitudes pendientes',pend.length+' solicitudes esperan revisión','sistema');}
    actualizarContadores();
    renderDashboard();
    renderNotif();
    window.addEventListener('storage',function(e){if(e.key===DB_KEY){recargar();}});
    iniciarEscuchaFirebase();
  }
  if(window._fbIniciado){
    showToast('Sincronizando con Firebase…','☁️');
    sincronizarDesdeFirebase(function(){arrancarApp();});
  } else {
    arrancarApp();
  }
}());
