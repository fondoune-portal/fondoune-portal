function buildDocx(d){
  var lib=(typeof docx!=='undefined'&&docx.Document)?docx:window;
  if(!lib.Document) throw new Error('Librería docx no disponible.');
  var DD=lib.Document,PK=lib.Packer,PA=lib.Paragraph,RN=lib.TextRun,
      TB=lib.Table,TR=lib.TableRow,TC=lib.TableCell,
      AL=lib.AlignmentType,BS=lib.BorderStyle,WT=lib.WidthType,
      SH=lib.ShadingType,VA=lib.VerticalAlign;

  var DARK='1C2B3A',BLUE='1A4D7C',GOLD='D4881E',AFL='EBF2FA',WHT='FFFFFF';
  var b1={style:BS.SINGLE,size:1,color:'C8D4E0'},BDR={top:b1,bottom:b1,left:b1,right:b1};
  var bn={style:BS.NONE,size:0,color:'FFFFFF'},NBD={top:bn,bottom:bn,left:bn,right:bn};

  function cell(txt,o){o=o||{};return new TC({borders:BDR,verticalAlign:VA.CENTER,width:o.w?{size:o.w,type:WT.DXA}:undefined,shading:o.fill?{fill:o.fill,type:SH.CLEAR}:undefined,margins:{top:80,bottom:80,left:120,right:120},children:[new PA({alignment:o.c?AL.CENTER:AL.LEFT,children:[new RN({text:txt||'',font:'Calibri',size:o.s||19,bold:o.b||false,color:o.col||'222222'})]})]})}
  function eCell(w){return new TC({borders:NBD,width:{size:w,type:WT.DXA},children:[new PA({children:[new RN({text:'',font:'Calibri',size:19})]})]})}
  function par(txt,o){o=o||{};var pr={alignment:o.c?AL.CENTER:AL.LEFT,spacing:{before:o.sb||0,after:o.sa||80},children:[new RN({text:txt||'',font:'Calibri',size:o.s||20,bold:o.b||false,color:o.col||'222222',italics:o.i||false})]};if(o.bbot)pr.border={bottom:{style:BS.SINGLE,size:6,color:GOLD}};return new PA(pr)}
  function secT(t){return par(t,{b:true,s:22,col:DARK,sb:220,sa:80,bbot:true})}
  function bul(t){return new PA({spacing:{before:40,after:40},indent:{left:420,hanging:200},children:[new RN({text:'• ',font:'Calibri',size:19,bold:true,color:GOLD}),new RN({text:t,font:'Calibri',size:19,color:'333333'})]})}
  function iRow(l,v){return new TR({children:[cell(l,{w:3600,fill:AFL,b:true,s:19,col:DARK}),cell(v,{w:5760,s:19})]})}
  function sHdr(t){return new TR({children:[new TC({columnSpan:5,borders:BDR,shading:{fill:DARK,type:SH.CLEAR},margins:{top:80,bottom:80,left:120,right:120},children:[par(t,{b:true,s:19,col:WHT})]})]})}
  function cRow(n,doc,obs){return new TR({children:[cell(String(n),{w:500,c:true,s:18}),cell('Obligatorio',{w:1400,s:18,col:BLUE}),cell(doc,{w:3500,s:18}),cell(obs,{w:2800,s:18,col:'555555'}),cell('☐',{w:720,c:true,s:22})]})}
  function cHdr(){return new TR({children:[cell('#',{w:500,fill:BLUE,b:true,col:WHT,c:true}),cell('Tipo',{w:1400,fill:BLUE,b:true,col:WHT}),cell('Documento Requerido',{w:3500,fill:BLUE,b:true,col:WHT}),cell('Observaciones',{w:2800,fill:BLUE,b:true,col:WHT}),cell('✓',{w:720,fill:BLUE,b:true,col:WHT,c:true})]})}
  function signTbl(l,r){return new TB({width:{size:9360,type:WT.DXA},columnWidths:[4500,360,4500],rows:[new TR({children:[cell(l,{w:4500,b:true,s:19,fill:AFL,col:DARK}),eCell(360),cell(r,{w:4500,b:true,s:19,fill:AFL,col:DARK})]}),new TR({children:[cell('',{w:4500}),eCell(360),cell('',{w:4500})]}),new TR({children:[cell('Nombre: _________________________',{w:4500,s:18}),eCell(360),cell('Nombre: _________________________',{w:4500,s:18})]}),new TR({children:[cell('CC: _______________',{w:4500,s:18}),eCell(360),cell('Fecha: _______________',{w:4500,s:18})]})]})}
  function obsTbl(){return new TB({width:{size:9360,type:WT.DXA},columnWidths:[9360],rows:[new TR({children:[cell('',{w:9360})]}),new TR({children:[cell('',{w:9360})]}),new TR({children:[cell('',{w:9360})]})]})}
  function sp(n){return par('',{sb:n||120,sa:0})}
  function pie(){return par('FondoUne · Equipo Créditos Vivienda — Documento de uso interno y confidencial.',{s:17,i:true,col:'999999',c:true,sb:200})}

  var tipo=d.tipo,infoT,instr=[],rows=[],wT='',wX='';
  var sL='Firma del Titular del Crédito',sR='Firma del Asesor Responsable';

  if(tipo==='compra'){
    sL='Firma del Solicitante / Comprador';
    infoT=new TB({width:{size:9360,type:WT.DXA},columnWidths:[3600,5760],rows:[iRow('N° Radicado / Crédito:',d.radicado),iRow('Nombre Completo del Solicitante:',d.nombreTitular),iRow('Número de Cédula:',d.cedula),iRow('Teléfono de Contacto:',d.telefono||'—'),iRow('Correo Electrónico:',d.correo||'—'),iRow('Dirección del Inmueble:',d.direccion||'—'),iRow('Nombre del Vendedor:',d.nombreVendedor||'—'),iRow('Cédula del Vendedor:',d.cedulaVendedor||'—'),iRow('Fecha Límite de Entrega:',d.fechaLimite||'—'),iRow('Asesor Responsable:',d.asesor||'—')]});
    instr=['Todos los documentos deben estar legibles, vigentes y sin tachones ni enmendaduras.','Las copias de cédulas deben entregarse al 150% del tamaño original, en papel blanco.','Los certificados bancarios deben tener una vigencia máxima de 30 días.'];
    rows=[sHdr('A. DOCUMENTOS DEL COMPRADOR / SOLICITANTE'),cRow(1,'Copia de Cédula de Ciudadanía','Ampliada al 150%, legible por ambas caras'),cRow(2,'Autorización Tratamiento de Datos','Firmada por el titular — formato de la entidad'),cRow(3,'Carta de Aprobación del Crédito','Emitida por la entidad financiera, vigente'),cRow(4,'Certificado de Cuenta Bancaria','Expedido por el banco, vigencia máx. 30 días'),cRow(5,'RUT Actualizado','Registro Único Tributario — vigencia máx. 1 año'),cRow(6,'Búsqueda Unificada de Propietario','Emitida por la entidad competente'),sHdr('B. DOCUMENTOS DEL VENDEDOR'),cRow(7,'Copia de Cédula del Vendedor','Ampliada al 150%, legible por ambas caras'),cRow(8,'RUT del Vendedor','Vigente — aplica si es persona jurídica'),sHdr('C. DOCUMENTOS DEL INMUEBLE Y ESCRITURACIÓN'),cRow(9,'Escrituras del Inmueble','Escritura pública de compraventa firmada y registrada'),cRow(10,'Formato de Control de Garantías','Formato de la entidad financiera, diligenciado'),cRow(11,'Visto Bueno / Firma de Escrituras','Aprobación del área jurídica o notarial'),sHdr('D. FORMATOS FINANCIEROS Y DE DESEMBOLSO'),cRow(12,'Formato Pagador Alterno','Diligenciado y firmado por el pagador autorizado'),cRow(13,'ZUNE — Formato Desembolso','Instrucción de desembolso completamente diligenciada')];
  } else if(tipo==='construccion'){
    infoT=new TB({width:{size:9360,type:WT.DXA},columnWidths:[3600,5760],rows:[iRow('N° Radicado / Crédito:',d.radicado),iRow('Nombre Completo del Titular:',d.nombreTitular),iRow('Número de Cédula:',d.cedula),iRow('Nombre del Codeudor:',d.nombreCodeudor||'—'),iRow('Cédula del Codeudor:',d.cedulaCodeudor||'—'),iRow('Teléfono de Contacto:',d.telefono||'—'),iRow('Correo Electrónico:',d.correo||'—'),iRow('Dirección del Inmueble:',d.direccion||'—'),iRow('Tipo de Obra:',d.tipoObra||'—'),iRow('Valor Total del Presupuesto:',d.valorPresupuesto||'—'),iRow('Fecha Límite de Entrega:',d.fechaLimite||'—'),iRow('Asesor Responsable:',d.asesor||'—')]});
    instr=['Todos los documentos deben estar legibles, vigentes y sin tachones ni enmendaduras.','La descripción y presupuesto de obra deben coincidir fielmente con el proyecto.','El contrato de obra debe estar firmado por todas las partes.'];
    rows=[sHdr('A. FORMATOS FINANCIEROS Y DE DESEMBOLSO'),cRow(1,'ZUNE — Formato de Desembolso','Instrucción de desembolso completamente diligenciada y firmada'),cRow(2,'Formato Pagador Alterno','Diligenciado y firmado por el pagador autorizado'),cRow(3,'Certificado Bancario','Certificado de cuenta activa — vigencia máx. 30 días'),sHdr('B. DOCUMENTOS JURÍDICOS Y GARANTÍAS'),cRow(4,'Pagaré (Original 1)','Pagaré firmado en original como garantía del crédito'),cRow(5,'Escrituras de Hipoteca','Escritura pública de constitución firmada ante notaría'),sHdr('C. DOCUMENTOS DE IDENTIDAD — TITULARES'),cRow(6,'Copia Cédula Titular Principal','Ampliada al 150%, legible por ambas caras'),cRow(7,'Copia Cédula Codeudor / Cónyuge','Ampliada al 150%, legible por ambas caras (si aplica)'),cRow(8,'Carta de Aprobación del Crédito','Emitida por la entidad financiera, vigente'),sHdr('D. DOCUMENTOS TÉCNICOS DE LA OBRA'),cRow(9,'Descripción Detallada de la Obra','Memoria descriptiva: alcance, materiales, especificaciones'),cRow(10,'Presupuesto de Obra','Presupuesto detallado, firmado por el profesional responsable'),cRow(11,'Contrato de Obra','Suscrito entre propietario y contratista'),cRow(12,'Matrícula del Arquitecto / Ingeniero','Copia de la matrícula profesional del director de obra'),sHdr('E. DOCUMENTOS DEL INMUEBLE'),cRow(13,'Registro de Matrícula Inmobiliaria','Certificado de tradición y libertad vigente — ORIP'),sHdr('F. SEGUROS'),cRow(14,'Póliza de Seguro de Obra / Vivienda','Póliza vigente que cubra el período completo de ejecución')];
    wT='IMPORTANTE — CRÉDITOS DE CONSTRUCCIÓN Y MEJORAS';wX='La entidad financiera puede realizar desembolsos parciales por etapas. Asegúrese de que el presupuesto y el contrato de obra estén alineados con el cronograma de pagos aprobado.';
  } else {
    infoT=new TB({width:{size:9360,type:WT.DXA},columnWidths:[3600,5760],rows:[iRow('N° Radicado / Crédito:',d.radicado),iRow('Nombre Completo del Titular:',d.nombreTitular),iRow('Número de Cédula:',d.cedula),iRow('Teléfono de Contacto:',d.telefono||'—'),iRow('Correo Electrónico:',d.correo||'—'),iRow('Dirección del Inmueble:',d.direccion||'—'),iRow('Entidad Financiera (Banco):',d.entidadFinanciera||'—'),iRow('Valor del Crédito Hipotecario:',d.valorCredito||'—'),iRow('Fecha Límite de Entrega:',d.fechaLimite||'—'),iRow('Asesor Responsable:',d.asesor||'—')]});
    instr=['Todos los documentos deben estar legibles, vigentes y sin tachones ni enmendaduras.','Las escrituras de hipoteca deben estar firmadas y en proceso de registro ante la ORIP.'];
    rows=[sHdr('A. DOCUMENTOS DEL TITULAR DEL CRÉDITO'),cRow(1,'Copia de la Cédula de Ciudadanía','Ampliada al 150%, legible por ambas caras'),cRow(2,'Autorización Consulta y Tratamiento de Datos','Formato de la entidad, firmado en original'),cRow(3,'Carta de Aprobación del Crédito Hipotecario','Emitida por la entidad financiera, vigente'),sHdr('B. DOCUMENTOS DE LA ENTIDAD FINANCIERA'),cRow(4,'Reporte / Extracto Bancolombia','Documento oficial que certifica el crédito'),cRow(5,'ZUNE — Formato de Desembolso Bancolombia','Instrucción de desembolso diligenciada y firmada'),cRow(6,'Formato Pagador Alterno Bancolombia','Diligenciado y firmado por el pagador autorizado'),cRow(7,'Saldo del Crédito Bancolombia','Certificado oficial del saldo vigente, expedido por el banco'),sHdr('C. ESCRITURAS E HIPOTECA'),cRow(8,'Escrituras de Hipoteca','Escritura pública de constitución, firmada ante notaría'),cRow(9,'Pagaré','Pagaré firmado en original como garantía del crédito hipotecario'),cRow(10,'Formato Control de Garantías','Formato de la entidad financiera, completamente diligenciado'),sHdr('D. VERIFICACIÓN JURÍDICA Y REGISTRAL'),cRow(11,'Búsqueda Unificada del Titular / Inmueble','Confirma situación jurídica del bien y del titular')];
    wT='IMPORTANTE — SOBRE EL GRAVAMEN HIPOTECARIO';wX='El gravamen hipotecario es la garantía real que respalda el crédito de vivienda. Su correcta constitución y registro ante la Oficina de Registro de Instrumentos Públicos es indispensable para el desembolso.';
  }

  var wb={style:BS.SINGLE,size:4,color:GOLD};
  function warnBox(tit,txt){return new TB({width:{size:9360,type:WT.DXA},columnWidths:[9360],rows:[new TR({children:[new TC({borders:{top:wb,bottom:wb,left:wb,right:wb},shading:{fill:'FEF5E7',type:SH.CLEAR},margins:{top:100,bottom:100,left:150,right:150},children:[par('⚠  '+tit,{b:true,s:20,col:GOLD,sa:60}),par(txt,{s:19,col:'444444'})]})]})]});}

  var hijos=[par('FondoUne · Créditos Vivienda',{s:10,col:'AAAAAA',c:true,sa:20}),par('LISTA DE CHEQUEO — DOCUMENTOS PARA DESEMBOLSO DE CRÉDITO DE VIVIENDA',{b:true,s:26,col:DARK,c:true,sa:40}),par(d.tipoLabel||tipo,{s:22,col:GOLD,c:true,b:true,sa:200}),secT('1. INFORMACIÓN DEL SOLICITANTE'),infoT,sp(200),secT('2. INSTRUCCIONES GENERALES')];
  instr.forEach(function(t){hijos.push(bul(t));});
  hijos.push(sp(200));hijos.push(secT('3. DOCUMENTOS REQUERIDOS'));
  hijos.push(par('Marque ✓ cada documento a medida que lo reúna.',{s:19,i:true,sa:100,col:'555555'}));
  hijos.push(new TB({width:{size:9360,type:WT.DXA},columnWidths:[500,1400,3500,2800,720],rows:[cHdr()].concat(rows)}));
  if(wT){hijos.push(sp(180));hijos.push(warnBox(wT,wX));}
  hijos.push(sp(180));hijos.push(secT('4. OBSERVACIONES ADICIONALES'));hijos.push(obsTbl());
  hijos.push(sp(180));hijos.push(secT('5. FIRMAS Y CONFIRMACIÓN DE ENTREGA'));hijos.push(signTbl(sL,sR));
  hijos.push(sp(180));hijos.push(pie());

  var wordDoc=new DD({sections:[{properties:{page:{size:{width:12240,height:15840},margin:{top:1080,right:1080,bottom:1080,left:1080}}},children:hijos}]});
  PK.toBlob(wordDoc).then(function(blob){
    var nombres={compra:'Desembolso_Compra_Vivienda',construccion:'Construccion_Mejoras',gravamen:'Gravamen_Hipotecario'};
    var fn=(nombres[tipo]||tipo)+'_'+(d.radicado||'nuevo')+'.docx';
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');a.href=url;a.download=fn;document.body.appendChild(a);a.click();document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // 🔊 Sonido al completar descarga
    if (window.FU_Sound) window.FU_Sound.play('download');
    
    registrarAudit('Documento Word generado',d);
    showToast('Documento generado: '+fn,'📄');
  }).catch(function(e){showToast('Error al generar: '+e.message,'❌');});
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
  // UTF-8 BOM para Excel en español
  var bom='\uFEFF';
  var blob=new Blob([bom+csv],{type:'text/csv;charset=utf-8;'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');a.href=url;a.download='FondoUne_Solicitudes_'+new Date().toISOString().slice(0,10)+'.csv';document.body.appendChild(a);a.click();document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  // 🔊 Sonido al completar exportación
  if (window.FU_Sound) window.FU_Sound.play('download');
  
  registrarAudit('Exportación a Excel/CSV realizada',{id:'sistema',radicado:'EXPORT',nombreTitular:'Sistema'});
  showToast('Exportado: '+db.length+' registros','📥');
}

/* ═══ RECARGAR ═══ */
function recargar(){
  actualizarContadores();
  var panelActivo=document.querySelector('.panel.active');
  if(panelActivo){
    var id=panelActivo.id.replace('panel-','');
    showPanel(id);
  }
}

/* ═══════════════════════════════════════════════════════
   GESTIÓN DE USUARIOS — Sistema completo
   ═══════════════════════════════════════════════════════ */

var USR_KEY     = 'fu_usuarios';           // localStorage key para usuarios custom
var USR_DEL_KEY = 'fu_usuarios_eliminados'; // localStorage key para IDs eliminados

/* Cargar usuarios (combina base + guardados en localStorage, respetando eliminaciones) */
function cargarUsuarios() {
  var base = {
    'admin':   { hash: 'e5dc2f73f21351f6eea4d250725e701fd5ba6f9442f964f3eb6f7db510186d0c', nombre: 'Administrador', rol: 'Administrador' },
    'asesor1': { hash: 'c07e647705fd1afdba00420755aeeb10e347e387ba17f3f463eaa3a5ddc32504', nombre: 'Asesor Créditos 1', rol: 'Asesor' },
    'asesor2': { hash: '52fb1bd7895fe2b4e69b2f93b28c9f77122d6c8c5ad1da6ce88bd4fec08910f2', nombre: 'Asesor Créditos 2', rol: 'Asesor' }
  };
  try {
    var custom     = JSON.parse(localStorage.getItem(USR_KEY)     || '{}');
    var eliminados = JSON.parse(localStorage.getItem(USR_DEL_KEY) || '[]');
    // Merge: custom sobreescribe base; luego se excluyen los marcados como eliminados
    var resultado = Object.assign({}, base, custom);
    eliminados.forEach(function(login) { delete resultado[login]; });
    return resultado;
  } catch(e) { return base; }
}

/* Guardar cambio de un usuario en localStorage */
function persistirUsuario(login, datos) {
  try {
    var custom = JSON.parse(localStorage.getItem(USR_KEY) || '{}');
    custom[login] = datos;
    localStorage.setItem(USR_KEY, JSON.stringify(custom));
    // Si este login estaba marcado como eliminado, quitarlo de esa lista
    var eliminados = JSON.parse(localStorage.getItem(USR_DEL_KEY) || '[]');
    var idx = eliminados.indexOf(login);
    if (idx > -1) { eliminados.splice(idx, 1); localStorage.setItem(USR_DEL_KEY, JSON.stringify(eliminados)); }
    // También actualizar USUARIOS en memoria
    USUARIOS[login] = datos;
  } catch(e) {}
}

/* Eliminar usuario de localStorage */
function eliminarUsuarioPersistido(login) {
  try {
    // 1. Borrar del objeto de usuarios custom (si fue creado/editado)
    var custom = JSON.parse(localStorage.getItem(USR_KEY) || '{}');
    delete custom[login];
    localStorage.setItem(USR_KEY, JSON.stringify(custom));

    // 2. Registrar en lista de eliminados para excluirlo del merge con base
    var eliminados = JSON.parse(localStorage.getItem(USR_DEL_KEY) || '[]');
    if (eliminados.indexOf(login) === -1) eliminados.push(login);
    localStorage.setItem(USR_DEL_KEY, JSON.stringify(eliminados));

    // 3. Eliminar de memoria
    delete USUARIOS[login];
  } catch(e) {}
}

/* Refrescar USUARIOS en memoria desde localStorage al cargar */
function sincronizarUsuariosEnMemoria() {
  if (typeof USUARIOS === 'undefined') { window.USUARIOS = window.USUARIOS || {}; }
  var todos = cargarUsuarios();
  Object.keys(todos).forEach(function(k) { USUARIOS[k] = todos[k]; });
}

/* Verificar si la sesión activa es admin */
function esAdmin() {
  try {
    var key = (window.SEC && window.SEC.SESS_KEY) ? window.SEC.SESS_KEY : 'fu_session';
    var sess = JSON.parse(localStorage.getItem(key) || 'null');
    return sess && sess.rol === 'Administrador';
  } catch(e) { return false; }
}

/* Mostrar/ocultar nav de usuarios según rol */
function actualizarNavAdmin() {
  var items = document.querySelectorAll('.admin-only');
  items.forEach(function(el) {
    el.style.display = esAdmin() ? 'flex' : 'none';
  });
}

/* ─── Renderizar tabla de usuarios ─── */
function renderUsrTable() {
  var todos = cargarUsuarios();
  var keys = Object.keys(todos);
  var tbody = document.getElementById('usrTableBody');
  var countTxt = document.getElementById('usr-count-txt');
  if (countTxt) countTxt.textContent = keys.length + ' usuario' + (keys.length !== 1 ? 's' : '');
  if (!tbody) return;

  var _rk = (window.SEC && window.SEC.SESS_KEY) ? window.SEC.SESS_KEY : 'fu_session';
  var sess = JSON.parse(localStorage.getItem(_rk) || '{}');
  var usuarioActual = sess.usuario || '';

  tbody.innerHTML = keys.map(function(login) {
    var u = todos[login];
    var esYo = login === usuarioActual;
    var esUnicoAdmin = u.rol === 'Administrador' &&
      keys.filter(function(k){ return todos[k].rol === 'Administrador'; }).length === 1;

    return '<tr>'
      + '<td><div class="usr-name">' + u.nombre + '</div>'
      + '<div class="usr-login">' + login + '</div>'
      + (esYo ? '<span style="font-size:10px;color:var(--ok);margin-left:4px;">● tú</span>' : '')
      + '</td>'
      + '<td><span class="rol-badge ' + (u.rol==='Administrador'?'rol-admin':'rol-asesor') + '">'
      + (u.rol==='Administrador'?'👑':'🎯') + ' ' + u.rol + '</span></td>'
      + '<td><div class="usr-actions">'
      + '<button class="usr-btn" onclick="abrirEditarUsuario(\'' + login + '\')" title="Editar">✏️ Editar</button>'
      + '<button class="usr-btn danger" onclick="confirmarEliminarUsuario(\'' + login + '\')"'
      + (esYo || esUnicoAdmin ? ' disabled title="No puedes eliminar este usuario"' : ' title="Eliminar"')
      + '>🗑️ Eliminar</button>'
      + '</div></td>'
      + '</tr>';
  }).join('');
}

/* ─── Abrir modal CREAR ─── */
function abrirCrearUsuario() {
  document.getElementById('usrModalTitle').textContent = '👤 Crear Nuevo Usuario';
  document.getElementById('usrEditKey').value = '';
  document.getElementById('usrNombre').value = '';
  document.getElementById('usrLogin').value = '';
  document.getElementById('usrLogin').disabled = false;
  document.getElementById('usrRol').value = 'Asesor';
  document.getElementById('usrPass').value = '';
  document.getElementById('usrPass2').value = '';
  document.getElementById('usrPassField').style.display = 'block';
  document.getElementById('usrPassField2').style.display = 'block';
  document.getElementById('usrPassCambioField').style.display = 'none';
  var msg = document.getElementById('usrModalMsg');
  msg.className = 'adm-msg'; msg.textContent = '';
  abrirModalUsr();
}

/* ─── Abrir modal EDITAR ─── */
function abrirEditarUsuario(login) {
  var todos = cargarUsuarios();
  var u = todos[login];
  if (!u) return;
  document.getElementById('usrModalTitle').textContent = '✏️ Editar Usuario — ' + login;
  document.getElementById('usrEditKey').value = login;
  document.getElementById('usrNombre').value = u.nombre;
  document.getElementById('usrLogin').value = login;
  document.getElementById('usrLogin').disabled = true; // login no editable
  document.getElementById('usrRol').value = u.rol;
  document.getElementById('usrPassCambio').value = '';
  document.getElementById('usrPassField').style.display = 'none';
  document.getElementById('usrPassField2').style.display = 'none';
  document.getElementById('usrPassCambioField').style.display = 'block';
  var msg = document.getElementById('usrModalMsg');
  msg.className = 'adm-msg'; msg.textContent = '';
  abrirModalUsr();
}

/* ─── Abrir/cerrar modal ─── */
function abrirModalUsr() {
  var ov = document.getElementById('usrOverlay');
  var modal = document.getElementById('usrModal');
  ov.classList.add('show');
  modal.style.opacity = '1';
  modal.style.pointerEvents = 'all';
  modal.style.transform = 'translate(-50%,-50%) scale(1)';
  setTimeout(function(){ document.getElementById('usrNombre').focus(); }, 100);
}
function cerrarUsrModal() {
  var ov = document.getElementById('usrOverlay');
  var modal = document.getElementById('usrModal');
  ov.classList.remove('show');
  modal.style.opacity = '0';
  modal.style.pointerEvents = 'none';
  modal.style.transform = 'translate(-50%,-48%) scale(.96)';
}

/* ─── Guardar usuario (crear o editar) ─── */
function guardarUsuario() {
  var editKey  = document.getElementById('usrEditKey').value;
  var nombre   = document.getElementById('usrNombre').value.trim();
  var login    = editKey || document.getElementById('usrLogin').value.trim().toLowerCase();
  var rol      = document.getElementById('usrRol').value;
  var msg      = document.getElementById('usrModalMsg');

  function showMsg(tipo, txt) {
    msg.className = 'adm-msg ' + tipo;
    msg.textContent = txt;
  }

  if (!nombre) { showMsg('err', 'El nombre es obligatorio.'); return; }
  if (!login)  { showMsg('err', 'El usuario es obligatorio.'); return; }
  if (!/^[a-z0-9_]+$/.test(login)) { showMsg('err', 'El usuario solo puede tener letras minúsculas, números y guión bajo.'); return; }

  var esEdicion = !!editKey;

  if (!esEdicion) {
    // Crear: verificar que no exista
    var todos = cargarUsuarios();
    if (todos[login]) { showMsg('err', 'Ya existe un usuario con ese nombre de usuario.'); return; }
    var pass  = document.getElementById('usrPass').value;
    var pass2 = document.getElementById('usrPass2').value;
    if (pass.length < 8) { showMsg('err', 'La contraseña debe tener al menos 8 caracteres.'); return; }
    if (pass !== pass2)  { showMsg('err', 'Las contraseñas no coinciden.'); return; }

    var btn = document.getElementById('usrGuardarBtn');
    btn.disabled = true; btn.textContent = 'Guardando…';

    sha256(pass).then(function(hash) {
      persistirUsuario(login, { hash: hash, nombre: nombre, rol: rol });
      
      // 🔊 Sonido de éxito al crear usuario
      if (window.FU_Sound) window.FU_Sound.play('success');
      
      showMsg('ok', '✅ Usuario "' + login + '" creado correctamente.');
      renderUsrTable();
      btn.disabled = false; btn.textContent = '💾 Guardar';
      setTimeout(cerrarUsrModal, 1200);
    });

  } else {
    // Editar
    var todos2 = cargarUsuarios();
    var passCambio = document.getElementById('usrPassCambio').value;

    function finalizarEdicion(nuevoHash) {
      var datosActualizados = {
        hash: nuevoHash || todos2[editKey].hash,
        nombre: nombre,
        rol: rol
      };
      persistirUsuario(editKey, datosActualizados);
      
      // 🔊 Sonido de éxito al editar usuario
      if (window.FU_Sound) window.FU_Sound.play('success');
      
      showMsg('ok', '✅ Usuario actualizado correctamente.');
      renderUsrTable();
      setTimeout(cerrarUsrModal, 1200);
    }

    if (passCambio) {
      if (passCambio.length < 8) { showMsg('err', 'La nueva contraseña debe tener al menos 8 caracteres.'); return; }
      var btn2 = document.getElementById('usrGuardarBtn');
      btn2.disabled = true; btn2.textContent = 'Guardando…';
      sha256(passCambio).then(function(hash) {
        finalizarEdicion(hash);
        btn2.disabled = false; btn2.textContent = '💾 Guardar';
      });
    } else {
      finalizarEdicion(null);
    }
  }
}

/* ─── Eliminar usuario ─── */
function confirmarEliminarUsuario(login) {
  var todos = cargarUsuarios();
  var u = todos[login];
  if (!u) return;
  var confirmado = confirm('⚠️ ¿Eliminar el usuario "' + u.nombre + '" (' + login + ')?\n\nEsta acción no se puede deshacer.');
  if (!confirmado) return;
  
  eliminarUsuarioPersistido(login);
  
  // 🔊 Sonido de error/advertencia al eliminar
  if (window.FU_Sound) window.FU_Sound.play('error');
  
  renderUsrTable();
  showToast('🗑️ Usuario "' + login + '" eliminado.', '🗑️');
}

/* ═══════════════════════════════════════════════════════
   RECUPERAR CONTRASEÑA — Desde pantalla de login
   ═══════════════════════════════════════════════════════ */

function mostrarRecuperar() {
  // El recoverOverlay se muestra ENCIMA del loginOverlay — nunca ocultamos el login
  var recoverOv = document.getElementById('recoverOverlay');

  recoverOv.classList.remove('oculto');
  recoverOv.style.opacity = '0';
  recoverOv.style.transition = 'opacity .3s ease';
  setTimeout(function(){ recoverOv.style.opacity = '1'; }, 10);

  // Reset formulario al paso 1
  document.getElementById('recoverStep1').style.display = 'block';
  document.getElementById('recoverStep2').style.display = 'none';
  document.getElementById('recAdminUser').value = '';
  document.getElementById('recAdminPass').value = '';
  document.getElementById('recoverOk').style.display = 'none';
  document.getElementById('recoverError1').classList.remove('show');
  var err2 = document.getElementById('recoverError2');
  if (err2) err2.classList.remove('show');
  setTimeout(function(){ document.getElementById('recAdminUser').focus(); }, 200);
}

function ocultarRecuperar() {
  var recoverOv = document.getElementById('recoverOverlay');

  recoverOv.style.opacity = '0';
  recoverOv.style.transition = 'opacity .3s ease';
  setTimeout(function(){
    recoverOv.classList.add('oculto');
    recoverOv.style.opacity = '';
    document.getElementById('loginUser').focus();
  }, 300);
}

function verificarAdminRecuperar() {
  var usuario  = (document.getElementById('recAdminUser').value || '').trim().toLowerCase();
  var password = document.getElementById('recAdminPass').value || '';
  var err1msg  = document.getElementById('recoverError1Msg');
  var err1     = document.getElementById('recoverError1');

  if (!usuario || !password) {
    err1msg.textContent = 'Ingresa usuario y contraseña de administrador.';
    err1.classList.add('show'); return;
  }

  sha256(password).then(function(hash) {
    var todos = cargarUsuarios();
    var u = todos[usuario];
    if (!u || u.hash !== hash || u.rol !== 'Administrador') {
      err1msg.textContent = 'Credenciales incorrectas o no es administrador.';
      err1.classList.add('show');
      document.getElementById('recAdminPass').value = '';
      return;
    }
    // Admin verificado — mostrar paso 2
    err1.classList.remove('show');
    document.getElementById('recoverStep1').style.display = 'none';
    document.getElementById('recoverStep2').style.display = 'block';
    // Poblar select de usuarios
    poblarCustomSelect(todos, usuario);
    document.getElementById('recoverOk').style.display = 'none';
    var err2 = document.getElementById('recoverError2');
    err2.classList.remove('show');
  });
}

function ejecutarRestablecimiento() {
  var targetLogin = document.getElementById('recTargetUser').value;
  var newPass     = document.getElementById('recNewPass').value;
  var confPass    = document.getElementById('recConfPass').value;
  var err2msg     = document.getElementById('recoverError2Msg');
  var err2        = document.getElementById('recoverError2');
  var okBox       = document.getElementById('recoverOk');

  if (!targetLogin) { err2msg.textContent='Selecciona un usuario.'; err2.classList.add('show'); return; }
  if (newPass.length < 8) { err2msg.textContent='La contraseña debe tener al menos 8 caracteres.'; err2.classList.add('show'); return; }
  if (newPass !== confPass) { err2msg.textContent='Las contraseñas no coinciden.'; err2.classList.add('show'); return; }

  sha256(newPass).then(function(hash) {
    var todos = cargarUsuarios();
    var u = todos[targetLogin];
    if (!u) return;
    persistirUsuario(targetLogin, { hash: hash, nombre: u.nombre, rol: u.rol });
    err2.classList.remove('show');
    okBox.style.display = 'block';
    document.getElementById('recNewPass').value = '';
    document.getElementById('recConfPass').value = '';
    // Cerrar overlay y volver al login tras 2.5s
    setTimeout(ocultarRecuperar, 2500);
  });
}

/* Helper: toggle visibility de cualquier campo password */
function togglePassField(inputId) {
  var inp = document.getElementById(inputId);
  if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

/* ═══ MENÚ MÓVIL ═══ */
function toggleSidebarMovil() {
  var sb = document.querySelector('.sidebar');
  var ov = document.getElementById('sidebarOverlay');
  sb.classList.toggle('mobile-open');
  ov.classList.toggle('show');
}
function cerrarSidebarMovil() {
  var sb = document.querySelector('.sidebar');
  var ov = document.getElementById('sidebarOverlay');
  if (!sb || !ov) return;
  sb.classList.remove('mobile-open');
  ov.classList.remove('show');
}

/* Cerrar sidebar al navegar en móvil */
var _showPanelOrig = showPanel;
showPanel = function(id) {
  _showPanelOrig(id);
  if (window.innerWidth <= 768) cerrarSidebarMovil();
};

/* Utilidad debounce */
function _debounce(fn, ms){ var t; return function(){ clearTimeout(t); t=setTimeout(fn, ms); }; }

/* Redibujar donut al cambiar tamaño de pantalla */
window.addEventListener('resize', _debounce(function() {
  var db = cargarDB();
  if (db.length >= 0) {
    var compra   = db.filter(function(s){return s.tipo==='compra';}).length;
    var const_   = db.filter(function(s){return s.tipo==='construccion';}).length;
    var grav     = db.filter(function(s){return s.tipo==='gravamen';}).length;
    dibujarDonut([compra, const_, grav], ['#E8511A','#0D7A4E','#C0392B']);
  }
}, 150));

/* Mostrar/ocultar botón hamburguesa según ancho */
(function() {
  function checkMobile() {
    var btn = document.getElementById('mobileMenuBtn');
    if (!btn) return;
    btn.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
  }
  checkMobile();
  window.addEventListener('resize', _debounce(checkMobile, 100));
})();

/* ═══════════════════════════════════════════════════
   LOGIN SLIDESHOW — estilo portal bancario profesional
   ═══════════════════════════════════════════════════ */
(function initSlideshow() {
  var SLIDES = [
    {
      tag:      'Portal Empleados · Activo',
      headline: 'Unidos por<br><span>nuestros sueños</span>',
      sub:      'Gestiona las solicitudes de crédito vivienda de los asociados de FondoUne de manera eficiente y segura.'
    },
    {
      tag:      'Crédito Vivienda · FondoUne',
      headline: 'Tu hogar,<br><span>tu mayor sueño</span>',
      sub:      'Apoyamos a los empleados de UNE en la realización de su proyecto de vivienda con tasas preferenciales.'
    },
    {
      tag:      'Comunidad · Bienestar',
      headline: 'Juntos somos<br><span>más fuertes</span>',
      sub:      'FondoUne trabaja cada día para brindar soluciones financieras que mejoren la calidad de vida de sus asociados.'
    },
    {
      tag:      'Gestión · Eficiencia',
      headline: 'Procesos ágiles,<br><span>resultados reales</span>',
      sub:      'Nuestro portal permite gestionar solicitudes de manera rápida, transparente y completamente digital.'
    },
    {
      tag:      'Seguridad · Confianza',
      headline: 'Tu información<br><span>siempre segura</span>',
      sub:      'Acceso restringido con autenticación segura para proteger los datos de todos los asociados de FondoUne.'
    }
  ];

  var INTERVAL_MS = 5500;
  var current = 0;
  var timer = null;
  var progressTimer = null;

  var slidesEl  = null;
  var tagEl     = null;
  var headlineEl= null;
  var subEl     = null;
  var dotsEl    = null;
  var progressEl= null;

  function buildDots() {
    if (!dotsEl) return;
    dotsEl.innerHTML = '';
    SLIDES.forEach(function(_, i) {
      var d = document.createElement('button');
      d.className = 'ls-dot' + (i === 0 ? ' ls-dot-active' : '');
      d.setAttribute('aria-label', 'Slide ' + (i+1));
      d.addEventListener('click', function() { goTo(i); });
      dotsEl.appendChild(d);
    });
  }

  function updateDots(idx) {
    if (!dotsEl) return;
    var dots = dotsEl.querySelectorAll('.ls-dot');
    dots.forEach(function(d, i) {
      d.classList.toggle('ls-dot-active', i === idx);
    });
  }

  function startProgress() {
    if (!progressEl) return;
    clearTimeout(progressTimer);
    progressEl.style.transition = 'none';
    progressEl.style.width = '0%';
    // Small delay to allow reflow
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        progressEl.style.transition = 'width ' + INTERVAL_MS + 'ms linear';
        progressEl.style.width = '100%';
      });
    });
  }

  function fadeText(idx) {
    var els = [tagEl, headlineEl, subEl];
    els.forEach(function(el) {
      if (!el) return;
      el.classList.remove('ls-txt-visible');
      el.classList.add('ls-txt-fade');
    });
    setTimeout(function() {
      if (tagEl) {
        var sp = tagEl.querySelector('#lsTagTxt');
        if (sp) sp.textContent = SLIDES[idx].tag;
      }
      if (headlineEl) headlineEl.innerHTML = SLIDES[idx].headline;
      if (subEl)      subEl.textContent    = SLIDES[idx].sub;
      els.forEach(function(el) {
        if (!el) return;
        el.classList.remove('ls-txt-fade');
        el.classList.add('ls-txt-visible');
      });
    }, 300);
  }

  function goTo(idx) {
    if (!slidesEl) return;
    var slides = slidesEl.querySelectorAll('.ls-slide');
    if (!slides.length) return;

    // Mark previous as prev (for instant fade-out)
    slides[current].classList.remove('ls-active');
    slides[current].classList.add('ls-prev');

    current = (idx + slides.length) % slides.length;
    slides[current].classList.remove('ls-prev');
    slides[current].classList.add('ls-active');

    // Clean up prev class after transition
    setTimeout(function() {
      slides.forEach(function(s) { s.classList.remove('ls-prev'); });
    }, 1300);

    updateDots(current);
    fadeText(current);
    startProgress();
    resetTimer();
  }

  function next() { goTo(current + 1); }

  function resetTimer() {
    clearInterval(timer);
    timer = setInterval(next, INTERVAL_MS);
  }

  function init() {
    var ss = document.getElementById('loginSlideshow');
    if (!ss) return; // slideshow not in DOM yet — retry

    slidesEl   = ss;
    tagEl      = document.getElementById('lsTag');
    headlineEl = document.getElementById('lsHeadline');
    subEl      = document.getElementById('lsSub');
    dotsEl     = document.getElementById('lsDots');
    progressEl = document.getElementById('lsProgress');

    buildDots();
    updateDots(0);
    // Apply initial text classes
    [tagEl, headlineEl, subEl].forEach(function(el) {
      if (el) el.classList.add('ls-txt-visible');
    });
    startProgress();
    resetTimer();

    // Pause on hover
    ss.addEventListener('mouseenter', function() {
      clearInterval(timer);
      if (progressEl) {
        var w = progressEl.getBoundingClientRect().width;
        var pw = ss.getBoundingClientRect().width;
        progressEl.style.transition = 'none';
        progressEl.style.width = (w / pw * 100) + '%';
      }
    });
    ss.addEventListener('mouseleave', function() {
      startProgress();
      resetTimer();
    });

    // Touch swipe support
    var touchStartX = 0;
    ss.addEventListener('touchstart', function(e) {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    ss.addEventListener('touchend', function(e) {
      var dx = e.changedTouches[0].screenX - touchStartX;
      if (Math.abs(dx) > 50) { dx < 0 ? next() : goTo(current - 1); }
    }, { passive: true });
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ═══ INIT ═══ */
(function init(){
  mostrarEstadoFirebase();

  function arrancarApp() {
    var db=cargarDB();
    var pend=db.filter(function(s){return s.estado==='pendiente';});
    if(pend.length){
      agregarNotificacion('Solicitudes pendientes',pend.length+' solicitudes esperan revisión','sistema');
    }
    actualizarContadores();
    renderDashboard();
    renderNotif();
    window.addEventListener('storage',function(e){
      if(e.key===DB_KEY){ recargar(); }
    });
    // Iniciar escucha solo cuando Firebase Auth esté lista
    if (window._fbReady) { window._fbReady(function() { iniciarEscuchaFirebase(); }); }
    else { iniciarEscuchaFirebase(); }
  }

  // Esperar a que Firebase Auth esté lista antes de sincronizar
  if (window._fbReady) {
    showToast('Sincronizando con Firebase…','☁️');
    window._fbReady(function() { sincronizarDesdeFirebase(function() { arrancarApp(); }); });
  } else {
    arrancarApp();
  }

  /* ── INIT SEGURIDAD — aquí todas las funciones ya están definidas ── */
  (function initSeguridad() {
    sincronizarUsuariosEnMemoria();

    // Siempre ocultar recoverOverlay al cargar
    var recOv = document.getElementById('recoverOverlay');
    if (recOv) recOv.classList.add('oculto');

    // SEGURIDAD: siempre eliminar sesión previa al abrir el portal
    // Nunca auto-login — el usuario SIEMPRE debe ingresar sus credenciales
    var _ik = (window.SEC && window.SEC.SESS_KEY) ? window.SEC.SESS_KEY : 'fu_session';
    localStorage.removeItem(_ik);

    // Mostrar pantalla de login
    document.getElementById('loginUser').focus();
    var b = estaBlockeado();
    if (b) iniciarCountdown(b.hasta);
  })();

}());
