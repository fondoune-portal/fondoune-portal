var APP = (function () {
  'use strict';
  var tipo = 'compra';
  var hist = [];

  var DB_KEY = 'fondoune_solicitudes';

  /* ── Helpers ── */
  function $id(id) { return document.getElementById(id); }
  function val(id)  { var el = $id(id); return el ? el.value.trim() : ''; }

  function numAMiles(n) { return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function milesANum(s) { var c = (s||'').replace(/\./g,'').replace(/[^0-9]/g,''); return c ? parseInt(c,10) : 0; }
  function textoLegible(n) {
    if (!n) return '';
    if (n >= 1000000000) return (n/1000000000).toFixed(1).replace('.0','') + ' mil millones';
    if (n >= 1000000)    return (n/1000000).toFixed(1).replace('.0','') + ' millón' + (n>=2000000?'es':'');
    if (n >= 1000)       return (n/1000).toFixed(0) + ' mil';
    return numAMiles(n);
  }
  function valPeso(id) {
    var el = $id(id);
    if (!el) return '';
    var n = milesANum(el.value);
    return n ? '$ ' + numAMiles(n) : '';
  }
  function fmtDate(v) {
    if (!v) return '';
    var p = v.split('-');
    if (p.length === 3) return p[2]+'/'+p[1]+'/'+p[0];
    return v;
  }
  function status(t, txt) {
    var b = $id('sbar');
    b.className = 'sbar ' + t;
    $id('sbarTxt').textContent = txt;
    $id('spin').style.display = t === 'loading' ? 'block' : 'none';
  }

  function activarCampoPeso(inputId, previewId) {
    var el = $id(inputId), pv = $id(previewId);
    if (!el) return;
    function actualizar() {
      var raw = el.value.replace(/\./g,'').replace(/[^0-9]/g,'');
      var n = raw ? parseInt(raw,10) : 0;
      el.value = n > 0 ? numAMiles(n) : '';
      if (pv) {
        if (n > 0) { pv.className='peso-preview has-val'; pv.innerHTML='<span class="dot"></span> '+textoLegible(n)+' de pesos'; }
        else       { pv.className='peso-preview'; pv.innerHTML='Ingresa el valor en pesos colombianos'; }
      }
    }
    el.addEventListener('input', function(){
      var c=el.selectionStart, a=el.value.length; actualizar();
      var d=el.value.length; try{el.setSelectionRange(c+(d-a),c+(d-a));}catch(e){}
    });
    el.addEventListener('keydown', function(e){
      var allow=/[0-9]/.test(e.key)||['Backspace','Delete','ArrowLeft','ArrowRight','Tab','Home','End'].indexOf(e.key)>-1||e.ctrlKey||e.metaKey;
      if(!allow)e.preventDefault();
    });
  }

  /* ── Config por tipo ── */
  var cfg = {
    compra: {
      ico:'🏡', tit:'Compra de Vivienda', sub:'Datos del solicitante y del vendedor',
      titLbl:'👤 Datos del Solicitante / Comprador', dirLbl:'Dirección del Inmueble por Comprar',
      badge:'hb-c', badgeTxt:'Compra',
      extra: function() {
        return '<div class="fsec"><div class="slbl">🤝 Datos del Vendedor</div>'
          +'<div class="fg fg2">'
          +'<div class="fld"><label>Nombre del Vendedor</label><input id="nombreVendedor" placeholder="Nombre completo del vendedor"></div>'
          +'<div class="fld"><label>Cédula del Vendedor</label><input id="cedulaVendedor" placeholder="Ej: 1.234.567.890"></div>'
          +'<div class="fld"><label>Fecha de Expedición Cédula Vendedor</label><input type="date" id="fechaExpCedulaVendedor"></div>'
          +'<div class="fld"><label>Lugar de Expedición Cédula Vendedor</label><input id="lugarExpCedulaVendedor" placeholder="Ej: Bogotá, D.C."></div>'
          +'<div class="fld s2"><label>RUT del Vendedor</label>'
          +'<div style="display:flex;gap:10px;align-items:center;">'
          +'<input id="rutVendedor" placeholder="Ej: 900.123.456-7" style="flex:1">'
          +'<input type="checkbox" id="rutVendedorNoAplica" class="rut-na-chk" onchange="toggleRut(this,\'rutVendedor\')"><label for="rutVendedorNoAplica" class="rut-na-label"><span class="rut-na-box"><i class="rut-na-icon">✓</i></span>No aplica / No tengo RUT</label>'
          +'</div></div>'
          +'</div></div>';
      }
    },
    construccion: {
      ico:'🏗️', tit:'Construcción y Mejoras', sub:'Titular, codeudor y datos de la obra',
      titLbl:'👤 Datos del Titular', dirLbl:'Dirección del Inmueble por Construir / Mejorar',
      badge:'hb-k', badgeTxt:'Construcción',
      extra: function() {
        return '<div class="fsec"><div class="slbl">👥 Codeudor / Cónyuge (si aplica)</div>'
          +'<div class="fg fg2">'
          +'<div class="fld"><label>Nombre del Codeudor</label><input id="nombreCodeudor" placeholder="Nombre (si aplica)"></div>'
          +'<div class="fld"><label>Cédula del Codeudor</label><input id="cedulaCodeudor" placeholder="Cédula (si aplica)"></div>'
          +'</div></div>'
          +'<div class="fsec"><div class="slbl">🔨 Datos de la Obra</div>'
          +'<div class="fg fg2">'
          +'<div class="fld"><label>Tipo de Obra</label>'
          +'<select id="tipoObra"><option value="">Seleccionar tipo…</option><option>Construcción</option><option>Ampliación</option><option>Mejoras</option></select></div>'
          +'<div class="fld"><label>Valor del Presupuesto de Obra</label>'
          +'<div class="campo-peso"><div class="peso-box"><div class="peso-symbol">$</div><input class="peso-input" id="valorPresupuesto" placeholder="Ej: 80.000.000" inputmode="numeric" autocomplete="off"></div>'
          +'<div class="peso-preview" id="pvPresupuesto">Ingresa el valor en pesos colombianos</div></div></div>'
          +'</div></div>';
      }
    },
    gravamen: {
      ico:'📜', tit:'Gravamen Hipotecario', sub:'Datos del titular y de la entidad financiera',
      titLbl:'👤 Datos del Titular del Crédito', dirLbl:'Dirección del Inmueble con Gravamen',
      badge:'hb-g', badgeTxt:'Gravamen',
      extra: function() {
        return '<div class="fsec"><div class="slbl">🏦 Entidad Financiera</div>'
          +'<div class="fg fg2">'
          +'<div class="fld"><label>Entidad Financiera (Banco)</label>'
          +'<select id="entidadFinanciera" onchange="toggleOtroBanco(this)">'
          +'<option value="">Seleccionar banco…</option>'
          +'<optgroup label="🏦 Bancos Tradicionales">'
          +'<option>Bancolombia</option>'
          +'<option>Banco de Bogotá</option>'
          +'<option>Davivienda</option>'
          +'<option>BBVA Colombia</option>'
          +'<option>Banco Popular</option>'
          +'<option>AV Villas</option>'
          +'<option>Banco de Occidente</option>'
          +'<option>Banco Caja Social</option>'
          +'<option>Scotiabank Colpatria</option>'
          +'<option>Citibank Colombia</option>'
          +'<option>GNB Sudameris</option>'
          +'<option>Banco Agrario de Colombia</option>'
          +'<option>Banco WWB</option>'
          +'<option>Banco Falabella</option>'
          +'<option>Banco Pichincha</option>'
          +'<option>Banco Finandina</option>'
          +'<option>Banco Serfinanza</option>'
          +'<option>Banco Multibank</option>'
          +'<option>Banco Coopcentral</option>'
          +'<option>Itaú Colombia</option>'
          +'<option>Bancamía</option>'
          +'<option>Credifamilia</option>'
          +'</optgroup>'
          +'<optgroup label="📱 Neobancos y Bancos Digitales">'
          +'<option>Nequi</option>'
          +'<option>Daviplata</option>'
          +'<option>Lulo Bank</option>'
          +'<option>Nubank Colombia</option>'
          +'<option>Rappipay</option>'
          +'<option>Movii</option>'
          +'<option>Iris (Coopcentral)</option>'
          +'<option>Powwi</option>'
          +'<option>Tpaga</option>'
          +'</optgroup>'
          +'<optgroup label="🏢 Cooperativas y Fondos">'
          +'<option>Confiar Cooperativa</option>'
          +'<option>Coofinep</option>'
          +'<option>Coltefinanciera</option>'
          +'<option>Juriscoop</option>'
          +'<option>Cotrafa Cooperativa Financiera</option>'
          +'<option>CFA Cooperativa Financiera</option>'
          +'</optgroup>'
          +'<optgroup label="➕ Otro">'
          +'<option value="Otro">Otro banco / entidad…</option>'
          +'</optgroup>'
          +'</select></div>'
          +'<div class="fld" id="fld-otroBanco" style="display:none;"><label>Especifica el banco o entidad <span style="color:var(--gold)">*</span></label>'
          +'<input id="otroBanco" placeholder="Ej: Cooperativa La Equidad, Fondo XYZ…"></div>'
          +'<div class="fld"><label>Valor del Crédito Hipotecario</label>'
          +'<div class="campo-peso"><div class="peso-box"><div class="peso-symbol">$</div><input class="peso-input" id="valorCredito" placeholder="Ej: 200.000.000" inputmode="numeric" autocomplete="off"></div>'
          +'<div class="peso-preview" id="pvCredito">Ingresa el valor en pesos colombianos</div></div></div>'
          +'</div></div>';
      }
    }
  };

  /* ── DB: Firebase + localStorage fallback ── */
  function generarId() {
    return 'SOL-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2,4).toUpperCase();
  }
  function firebaseActivo() { return window._fbDB && window._fbDB !== null; }
  function guardarSolicitud(datos, callback) {
    try { var l=JSON.parse(localStorage.getItem(DB_KEY)||'[]'); l.unshift(datos); localStorage.setItem(DB_KEY,JSON.stringify(l)); } catch(e) {}
    if (firebaseActivo()) {
      window._fbDB.collection('solicitudes').doc(datos.id).set(datos)
        .then(function(){ if(callback) callback(null); })
        .catch(function(e){ if(callback) callback(null); });
    } else { if(callback) callback(null); }
  }

  /* ── Selección de tipo ── */
  function selTipo(t) {
    tipo = t;
    ['compra','construccion','gravamen'].forEach(function(k){
      $id('tc-'+k).classList[k===t?'add':'remove']('on');
    });
    var c = cfg[t];
    $id('fIco').textContent = c.ico;
    $id('fTit').textContent = c.tit;
    $id('fSub').textContent = c.sub;
    $id('titLbl').textContent = c.titLbl;
    $id('dirLbl').textContent = c.dirLbl;
    $id('extraFields').innerHTML = c.extra();
    $id('sbar').className = 'sbar';
    $id('dlCard').classList.remove('show');
    setTimeout(function(){
      activarCampoPeso('valorPresupuesto','pvPresupuesto');
      activarCampoPeso('valorCredito','pvCredito');
    },0);
  }

  function limpiar() {
    document.querySelectorAll('input').forEach(function(i){ i.value=''; });
    document.querySelectorAll('select').forEach(function(s){ s.selectedIndex=0; });
    document.querySelectorAll('.peso-preview').forEach(function(p){ p.className='peso-preview'; p.innerHTML='Ingresa el valor en pesos colombianos'; });
    $id('sbar').className='sbar';
    $id('dlCard').classList.remove('show');
  }

  function cerrarToast() {
    $id('toastOverlay').classList.remove('show');
  }

  /* ── Generar ── */
  function generar() {
    var rad = val('radicado'), nom = val('nombreTitular'), ced = val('cedula');
    if (!rad || !nom || !ced) { if(window.FU_Sound) FU_Sound.error(); status('err','⚠ Completa los campos obligatorios: Radicado, Nombre y Cédula.'); return; }
    $id('btnGen').disabled = true;
    $id('dlCard').classList.remove('show');
    status('loading','Registrando solicitud y generando documento…');

    var datos = {
      id: generarId(), radicado: rad, tipo: tipo, tipoLabel: cfg[tipo].tit,
      nombreTitular: nom, cedula: ced,
      fechaExpCedula: fmtDate(val('fechaExpCedula')), lugarExpCedula: val('lugarExpCedula'),
      rutTitular: val('rutTitular'), telefono: val('telefono'), correo: val('correo'),
      direccion: val('direccion'), fechaLimite: fmtDate(val('fechaLimite')), asesor: val('asesor'),
      nombreVendedor: val('nombreVendedor'), cedulaVendedor: val('cedulaVendedor'),
      fechaExpCedulaVendedor: fmtDate(val('fechaExpCedulaVendedor')),
      lugarExpCedulaVendedor: val('lugarExpCedulaVendedor'), rutVendedor: val('rutVendedor'),
      nombreCodeudor: val('nombreCodeudor'), cedulaCodeudor: val('cedulaCodeudor'),
      tipoObra: val('tipoObra'), valorPresupuesto: valPeso('valorPresupuesto'),
      entidadFinanciera: (val('entidadFinanciera')==='Otro' ? (val('otroBanco')||'Otro') : val('entidadFinanciera')), valorCredito: valPeso('valorCredito'),
      estado: 'pendiente', fechaRegistro: new Date().toISOString(),
      historial: [{ accion: 'Solicitud registrada por el asociado', fecha: new Date().toISOString(), usuario: 'Asociado' }]
    };

    guardarSolicitud(datos, function(err) {
      if (err) { status('err','⚠ Error guardando en la nube, pero se guardó localmente.'); }
      setTimeout(function(){
        try { buildDocx(datos); }
        catch(e) { status('err','✗ Error: '+e.message); $id('btnGen').disabled=false; }
      }, 60);
    });
  }

  /* ── BUILD DOCX ── */
  function buildDocx(d) {
    var lib = (typeof docx !== 'undefined' && docx.Document) ? docx : window;
    if (!lib.Document) throw new Error('La librería docx no cargó correctamente.');
    var DD=lib.Document, PK=lib.Packer, PA=lib.Paragraph, RN=lib.TextRun,
        TB=lib.Table, TR=lib.TableRow, TC=lib.TableCell,
        AL=lib.AlignmentType, BS=lib.BorderStyle, WT=lib.WidthType,
        SH=lib.ShadingType, VA=lib.VerticalAlign;

    var DARK='1C2B3A', BLUE='1A4D7C', GOLD='D4881E', AFL='EBF2FA', GFL='FEF5E7', WHT='FFFFFF';
    var b1={style:BS.SINGLE,size:1,color:'C8D4E0'}, BDR={top:b1,bottom:b1,left:b1,right:b1};
    var bn={style:BS.NONE,size:0,color:'FFFFFF'},   NBD={top:bn,bottom:bn,left:bn,right:bn};

    function cell(txt,o){ o=o||{}; return new TC({borders:BDR,verticalAlign:VA.CENTER,width:o.w?{size:o.w,type:WT.DXA}:undefined,shading:o.fill?{fill:o.fill,type:SH.CLEAR}:undefined,margins:{top:80,bottom:80,left:120,right:120},children:[new PA({alignment:o.c?AL.CENTER:AL.LEFT,children:[new RN({text:txt||'',font:'Calibri',size:o.s||19,bold:o.b||false,color:o.col||'222222'})]})]}); }
    function eCell(w){ return new TC({borders:NBD,width:{size:w,type:WT.DXA},children:[new PA({children:[new RN({text:'',font:'Calibri',size:19})]})]}); }
    function par(txt,o){ o=o||{}; var pr={alignment:o.c?AL.CENTER:AL.LEFT,spacing:{before:o.sb||0,after:o.sa||80},children:[new RN({text:txt||'',font:'Calibri',size:o.s||20,bold:o.b||false,color:o.col||'222222',italics:o.i||false})]}; if(o.bbot)pr.border={bottom:{style:BS.SINGLE,size:6,color:GOLD}}; return new PA(pr); }
    function secT(t){ return par(t,{b:true,s:22,col:DARK,sb:220,sa:80,bbot:true}); }
    function bul(t){ return new PA({spacing:{before:40,after:40},indent:{left:420,hanging:200},children:[new RN({text:'• ',font:'Calibri',size:19,bold:true,color:GOLD}),new RN({text:t,font:'Calibri',size:19,color:'333333'})]}); }
    function iRow(l,v){ return new TR({children:[cell(l,{w:3600,fill:AFL,b:true,s:19,col:DARK}),cell(v,{w:5760,s:19})]}); }
    function sHdr(t){ return new TR({children:[new TC({columnSpan:5,borders:BDR,shading:{fill:DARK,type:SH.CLEAR},margins:{top:80,bottom:80,left:120,right:120},children:[par(t,{b:true,s:19,col:WHT})]})]}); }
    function cRow(n,doc,obs){ return new TR({children:[cell(String(n),{w:500,c:true,s:18}),cell('Obligatorio',{w:1400,s:18,col:BLUE}),cell(doc,{w:3500,s:18}),cell(obs,{w:2800,s:18,col:'555555'}),cell('☐',{w:720,c:true,s:22})]}); }
    function cHdr(){ return new TR({children:[cell('#',{w:500,fill:BLUE,b:true,col:WHT,c:true}),cell('Tipo',{w:1400,fill:BLUE,b:true,col:WHT}),cell('Documento Requerido',{w:3500,fill:BLUE,b:true,col:WHT}),cell('Observaciones',{w:2800,fill:BLUE,b:true,col:WHT}),cell('✓',{w:720,fill:BLUE,b:true,col:WHT,c:true})]}); }
    function warnBox(tit,txt){ var wb={style:BS.SINGLE,size:4,color:GOLD}; return new TB({width:{size:9360,type:WT.DXA},columnWidths:[9360],rows:[new TR({children:[new TC({borders:{top:wb,bottom:wb,left:wb,right:wb},shading:{fill:'FEF5E7',type:SH.CLEAR},margins:{top:100,bottom:100,left:150,right:150},children:[par('⚠  '+tit,{b:true,s:20,col:GOLD,sa:60}),par(txt,{s:19,col:'444444'})]})]})]});  }
    function signTbl(l,r){ return new TB({width:{size:9360,type:WT.DXA},columnWidths:[4500,360,4500],rows:[new TR({children:[cell(l,{w:4500,b:true,s:19,fill:AFL,col:DARK}),eCell(360),cell(r,{w:4500,b:true,s:19,fill:AFL,col:DARK})]}),new TR({children:[cell('',{w:4500}),eCell(360),cell('',{w:4500})]}),new TR({children:[cell('Nombre: _________________________',{w:4500,s:18}),eCell(360),cell('Nombre: _________________________',{w:4500,s:18})]}),new TR({children:[cell('CC: _______________',{w:4500,s:18}),eCell(360),cell('Fecha: _______________',{w:4500,s:18})]})]}); }
    function obsTbl(){ return new TB({width:{size:9360,type:WT.DXA},columnWidths:[9360],rows:[new TR({children:[cell('',{w:9360})]}),new TR({children:[cell('',{w:9360})]}),new TR({children:[cell('',{w:9360})]})]}); }
    function sp(n){ return par('',{sb:n||120,sa:0}); }
    function pie(){ return par('FondoUne · Equipo Créditos Vivienda — Documento de uso interno y confidencial.',{s:17,i:true,col:'999999',c:true,sb:200}); }

    var infoT, instr=[], rows=[], wT='', wX='';
    var sL='Firma del Titular del Crédito', sR='Firma del Asesor Responsable';

    if (tipo==='compra') {
      sL='Firma del Solicitante / Comprador';
      infoT=new TB({width:{size:9360,type:WT.DXA},columnWidths:[3600,5760],rows:[iRow('N° Radicado / Crédito:',d.radicado),iRow('Nombre Completo del Solicitante:',d.nombreTitular),iRow('Número de Cédula:',d.cedula),iRow('Teléfono de Contacto:',d.telefono),iRow('Correo Electrónico:',d.correo),iRow('Dirección del Inmueble:',d.direccion),iRow('Nombre del Vendedor:',d.nombreVendedor),iRow('Cédula del Vendedor:',d.cedulaVendedor),iRow('Fecha Límite de Entrega:',d.fechaLimite),iRow('Asesor Responsable:',d.asesor)]});
      instr=['Todos los documentos deben estar legibles, vigentes y sin tachones ni enmendaduras.','Los documentos OBLIGATORIOS son indispensables para continuar con el proceso de desembolso.','Las copias de cédulas deben entregarse al 150% del tamaño original, en papel blanco.','Los certificados bancarios deben tener una vigencia máxima de 30 días.','Ante cualquier duda, comuníquese con su asesor antes de entregar los documentos.'];
      rows=[sHdr('A. DOCUMENTOS DEL COMPRADOR / SOLICITANTE'),cRow(1,'Copia de Cédula de Ciudadanía','Ampliada al 150%, legible por ambas caras'),cRow(2,'Autorización Tratamiento de Datos','Firmada por el titular — formato de la entidad'),cRow(3,'Carta de Aprobación del Crédito','Emitida por la entidad financiera, vigente'),cRow(4,'Certificado de Cuenta Bancaria','Expedido por el banco, vigencia máx. 30 días'),cRow(5,'RUT Actualizado','Registro Único Tributario — vigencia máx. 1 año'),cRow(6,'Búsqueda Unificada de Propietario','Emitida por la entidad competente'),sHdr('B. DOCUMENTOS DEL VENDEDOR'),cRow(7,'Copia de Cédula del Vendedor','Ampliada al 150%, legible por ambas caras'),cRow(8,'RUT del Vendedor','Vigente — aplica si es persona jurídica o contribuyente'),cRow(9,'Registro Único de Proponentes / Proveedores','Si aplica según el tipo de vendedor'),sHdr('C. DOCUMENTOS DEL INMUEBLE Y ESCRITURACIÓN'),cRow(10,'Escrituras del Inmueble','Escritura pública de compraventa firmada y registrada'),cRow(11,'Formato de Control de Garantías','Formato de la entidad financiera, diligenciado'),cRow(12,'Visto Bueno / Firma de Escrituras','Aprobación del área jurídica o notarial'),sHdr('D. FORMATOS FINANCIEROS Y DE DESEMBOLSO'),cRow(13,'Formato Pagador Alterno','Diligenciado y firmado por el pagador autorizado'),cRow(14,'ZUNE — Formato Desembolso','Instrucción de desembolso completamente diligenciada')];
    } else if (tipo==='construccion') {
      infoT=new TB({width:{size:9360,type:WT.DXA},columnWidths:[3600,5760],rows:[iRow('N° Radicado / Crédito:',d.radicado),iRow('Nombre Completo del Titular:',d.nombreTitular),iRow('Número de Cédula:',d.cedula),iRow('Nombre del Codeudor / Cónyuge:',d.nombreCodeudor),iRow('Cédula del Codeudor:',d.cedulaCodeudor),iRow('Teléfono de Contacto:',d.telefono),iRow('Correo Electrónico:',d.correo),iRow('Dirección del Inmueble:',d.direccion),iRow('Tipo de Obra:',d.tipoObra),iRow('Valor Total del Presupuesto:',d.valorPresupuesto),iRow('Fecha Límite de Entrega:',d.fechaLimite),iRow('Asesor Responsable:',d.asesor)]});
      instr=['Todos los documentos deben estar legibles, vigentes y sin tachones ni enmendaduras.','Las copias de cédulas deben entregarse ampliadas al 150%, en papel blanco.','La descripción y presupuesto de obra deben coincidir y reflejar fielmente el proyecto.','El contrato de obra debe estar firmado por todas las partes: propietario y contratista.','Si existen codeudores, sus documentos deben incluirse de forma completa.'];
      rows=[sHdr('A. FORMATOS FINANCIEROS Y DE DESEMBOLSO'),cRow(1,'ZUNE — Formato de Desembolso','Instrucción de desembolso completamente diligenciada y firmada'),cRow(2,'Formato Pagador Alterno','Diligenciado y firmado por el pagador autorizado'),cRow(3,'Certificado Bancario','Certificado de cuenta activa — vigencia máx. 30 días'),cRow(4,'Formato Control de Garantías','Formato de la entidad, completamente diligenciado'),sHdr('B. DOCUMENTOS JURÍDICOS Y GARANTÍAS'),cRow(5,'Pagaré (Original 1)','Pagaré firmado en original como garantía del crédito'),cRow(6,'Pagaré (Original 2)','Segunda copia del pagaré — si la entidad lo requiere'),cRow(7,'Escrituras de Hipoteca','Escritura pública de constitución firmada ante notaría'),cRow(8,'Registro Único de Proveedores / Contratistas','Si el contratista es persona jurídica'),sHdr('C. DOCUMENTOS DE IDENTIDAD — TITULARES'),cRow(9,'Copia Cédula Titular Principal','Ampliada al 150%, legible por ambas caras'),cRow(10,'Copia Cédula Codeudor / Cónyuge','Ampliada al 150%, legible por ambas caras (si aplica)'),cRow(11,'Carta de Aprobación del Crédito','Emitida por la entidad financiera, vigente'),cRow(12,'Autorización Tratamiento de Datos / Listas','Formato firmado por cada titular'),sHdr('D. DOCUMENTOS TÉCNICOS DE LA OBRA'),cRow(13,'Descripción Detallada de la Obra','Memoria descriptiva: alcance, materiales, especificaciones técnicas'),cRow(14,'Presupuesto de Obra (Cuadro de Cantidades)','Presupuesto detallado, firmado por el profesional responsable'),cRow(15,'Contrato de Obra','Suscrito entre propietario y contratista — firmado por ambas partes'),cRow(16,'Matrícula del Arquitecto / Ingeniero','Copia de la matrícula profesional del director de obra'),sHdr('E. DOCUMENTOS DEL INMUEBLE'),cRow(17,'Registro de Matrícula Inmobiliaria','Certificado de tradición y libertad vigente — ORIP'),cRow(18,'Búsqueda Unificada del Titular / Inmueble','Confirma situación jurídica del bien y del titular'),sHdr('F. SEGUROS'),cRow(19,'Póliza de Seguro de Obra / Vivienda','Póliza vigente que cubra el período completo de ejecución')];
      wT='IMPORTANTE — CRÉDITOS DE CONSTRUCCIÓN Y MEJORAS'; wX='Para este tipo de crédito, la entidad financiera puede realizar desembolsos parciales por etapas a medida que avanza la obra. Asegúrese de que el presupuesto y el contrato de obra estén alineados con el cronograma de pagos aprobado por la entidad.';
    } else {
      infoT=new TB({width:{size:9360,type:WT.DXA},columnWidths:[3600,5760],rows:[iRow('N° Radicado / Crédito:',d.radicado),iRow('Nombre Completo del Titular:',d.nombreTitular),iRow('Número de Cédula:',d.cedula),iRow('Teléfono de Contacto:',d.telefono),iRow('Correo Electrónico:',d.correo),iRow('Dirección del Inmueble:',d.direccion),iRow('Entidad Financiera (Banco):',d.entidadFinanciera),iRow('Valor del Crédito Hipotecario:',d.valorCredito),iRow('Fecha Límite de Entrega:',d.fechaLimite),iRow('Asesor Responsable:',d.asesor)]});
      instr=['Todos los documentos deben estar legibles, vigentes y sin tachones ni enmendaduras.','Las copias de cédulas deben entregarse ampliadas al 150%, en papel blanco.','Las autorizaciones y formatos deben estar firmados en original.','Las escrituras de hipoteca deben estar firmadas y en proceso de registro ante la ORIP.'];
      rows=[sHdr('A. DOCUMENTOS DEL TITULAR DEL CRÉDITO'),cRow(1,'Copia de la Cédula de Ciudadanía','Ampliada al 150%, legible por ambas caras'),cRow(2,'Autorización Consulta y Tratamiento de Datos','Formato de la entidad, firmado en original'),cRow(3,'Carta de Aprobación del Crédito Hipotecario','Emitida por la entidad financiera, vigente'),sHdr('B. DOCUMENTOS DE LA ENTIDAD FINANCIERA'),cRow(4,'Reporte / Extracto Bancolombia','Documento oficial que certifica el crédito'),cRow(5,'ZUNE — Formato de Desembolso Bancolombia','Instrucción de desembolso diligenciada y firmada'),cRow(6,'Formato Pagador Alterno Bancolombia','Diligenciado y firmado por el pagador autorizado'),cRow(7,'Saldo del Crédito Bancolombia','Certificado oficial del saldo vigente, expedido por el banco'),sHdr('C. ESCRITURAS E HIPOTECA'),cRow(8,'Escrituras de Hipoteca','Escritura pública de constitución, firmada ante notaría'),cRow(9,'Pagaré','Pagaré firmado en original como garantía del crédito hipotecario'),cRow(10,'Formato Control de Garantías','Formato de la entidad financiera, completamente diligenciado'),sHdr('D. VERIFICACIÓN JURÍDICA Y REGISTRAL'),cRow(11,'Búsqueda Unificada del Titular / Inmueble','Confirma situación jurídica del bien y del titular')];
      wT='IMPORTANTE — SOBRE EL GRAVAMEN HIPOTECARIO'; wX='El gravamen hipotecario es la garantía real que respalda el crédito de vivienda. Su correcta constitución y registro ante la Oficina de Registro de Instrumentos Públicos es un requisito indispensable para que la entidad financiera proceda con el desembolso.';
    }

    var hijos=[par('FondoUne · Créditos Vivienda',{s:10,col:'AAAAAA',c:true,sa:20}),par('LISTA DE CHEQUEO — DOCUMENTOS PARA DESEMBOLSO DE CRÉDITO DE VIVIENDA',{b:true,s:26,col:DARK,c:true,sa:40}),par(cfg[tipo].tit,{s:22,col:GOLD,c:true,b:true,sa:200}),secT('1. INFORMACIÓN DEL SOLICITANTE'),infoT,sp(200),secT('2. INSTRUCCIONES GENERALES')];
    instr.forEach(function(t){hijos.push(bul(t));});
    hijos.push(sp(200)); hijos.push(secT('3. DOCUMENTOS REQUERIDOS'));
    hijos.push(par('Marque ✓ cada documento a medida que lo reúna.',{s:19,i:true,sa:100,col:'555555'}));
    hijos.push(new TB({width:{size:9360,type:WT.DXA},columnWidths:[500,1400,3500,2800,720],rows:[cHdr()].concat(rows)}));
    if(wT){hijos.push(sp(180));hijos.push(warnBox(wT,wX));}
    hijos.push(sp(180));hijos.push(secT('4. OBSERVACIONES ADICIONALES'));hijos.push(obsTbl());
    hijos.push(sp(180));hijos.push(secT('5. FIRMAS Y CONFIRMACIÓN DE ENTREGA'));hijos.push(signTbl(sL,sR));
    hijos.push(sp(180));hijos.push(pie());

    var wordDoc=new DD({sections:[{properties:{page:{size:{width:12240,height:15840},margin:{top:1080,right:1080,bottom:1080,left:1080}}},children:hijos}]});

    PK.toBlob(wordDoc).then(function(blob){
      var nombres={compra:'Desembolso_Compra_Vivienda',construccion:'Construccion_Mejoras',gravamen:'Gravamen_Hipotecario'};
      var fn=nombres[tipo]+'_'+(d.radicado||'nuevo')+'.docx';
      var url=URL.createObjectURL(blob);
      $id('dlBtn').href=url; $id('dlBtn').download=fn; $id('dlName').textContent=fn;
      $id('dlCard').classList.add('show');
      status('ok','✓ Solicitud registrada y documento generado. ¡Listo para descargar!');
      $id('toastNum').textContent=d.id;
      $id('toastOverlay').classList.add('show');
      hist.unshift({badge:cfg[tipo].badge,badgeTxt:cfg[tipo].badgeTxt,nombre:d.nombreTitular,radicado:d.radicado,filename:fn,url:url,time:new Date().toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'})});
      renderHist();
      $id('btnGen').disabled=false;
    }).catch(function(e){ status('err','✗ Error al generar: '+e.message); $id('btnGen').disabled=false; });
  }

  function renderHist() {
    var sec=$id('histSec'), list=$id('histList');
    if(!hist.length){sec.style.display='none';return;}
    sec.style.display='block';
    list.innerHTML=hist.map(function(h){return '<div class="hi"><span class="hb '+h.badge+'">'+h.badgeTxt+'</span><span class="hn">'+h.nombre+' — '+h.radicado+'</span><span class="ht">'+h.time+'</span><a class="btn-hdl" href="'+h.url+'" download="'+h.filename+'">⬇ Descargar</a></div>';}).join('');
  }

  (function init(){
    var fl=$id('fechaLimite');
    if(fl){var dd=new Date();dd.setDate(dd.getDate()+15);fl.valueAsDate=dd;}
    selTipo('compra');
  }());

  return { selTipo:selTipo, generar:generar, limpiar:limpiar, cerrarToast:cerrarToast };
}());

/* ── toggleRut — global para que funcione desde el HTML ── */
function toggleRut(checkbox, inputId) {
  var inp = document.getElementById(inputId);
  if (!inp) return;
  inp.disabled = checkbox.checked;
  inp.value = checkbox.checked ? 'No aplica' : '';
  inp.style.opacity = checkbox.checked ? '.4' : '1';
  inp.style.background = checkbox.checked ? '#f0f0f0' : '';
}

/* ════════════════════════════════════════════════
   MÓDULO ASOC — Datos del Asociado
   Gestiona el formulario colapsable de datos
   personales y laborales del asociado.
   Persiste en localStorage con clave 'fondoune_asoc'.
   ════════════════════════════════════════════════ */
var ASOC = (function () {
  var STORAGE_KEY = 'fondoune_asoc_v1';

  /* Campos del formulario (id → clave de storage) */
  var CAMPOS = [
    'asocTipoId','asocCedula','asocRelacion',
    'asocApe1','asocApe2','asocNom1','asocNom2',
    'asocFechaNac','asocLugarExp','asocFechaExp','asocSexo','asocEstadoCivil','asocEstudios',
    'asocTel1','asocCelular','asocTel2','asocEmail','asocDireccion',
    'asocCiudad','asocDepto','asocBarrio','asocEstrato',
    'asocEmpresa','asocPeriodo','asocDependencia','asocTipoContrato',
    'asocCargo','asocFechaIngreso','asocSalario','asocDeduccion',
    'asocBanco','asocNroCuenta','asocTipoCuenta',
    'asocRut'
  ];

  /* ── Toggle del panel colapsable ── */
  function toggle() {
    var sec = document.getElementById('asocSection');
    var body = document.getElementById('asocBody');
    var txt = document.getElementById('asocToggleTxt');
    var isOpen = sec.classList.contains('open');

    if (isOpen) {
      /* Cerrar: fijar height antes de animar a 0 */
      body.style.height = body.scrollHeight + 'px';
      body.offsetHeight; // reflow
      body.style.height = '0';
      sec.classList.remove('open');
      txt.textContent = 'Completar o actualizar mis datos personales';
    } else {
      /* Abrir */
      sec.classList.add('open');
      txt.textContent = 'Ocultar formulario';
      body.style.height = body.scrollHeight + 'px';
      var onEnd = function() {
        body.removeEventListener('transitionend', onEnd);
        if (sec.classList.contains('open')) body.style.height = 'auto';
      };
      body.addEventListener('transitionend', onEnd);
    }
  }

  /* ── Cargar datos guardados desde localStorage ── */
  function cargar() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      CAMPOS.forEach(function(id) {
        var el = document.getElementById(id);
        if (!el || data[id] === undefined) return;
        el.value = data[id];
        /* Si era salario, aplicar formato visual */
        if (id === 'asocSalario') formatSalario(el);
      });
      /* Sincronizar los campos del formulario principal con la cédula guardada */
      sincronizarPrincipal();
    } catch(e) { /* ignorar errores de storage */ }
  }

  /* ── Guardar en localStorage ── */
  function guardar() {
    var data = {};
    CAMPOS.forEach(function(id) {
      var el = document.getElementById(id);
      if (el) data[id] = el.value;
    });
    /* Salario: guardar el número limpio */
    var salEl = document.getElementById('asocSalario');
    if (salEl) data['asocSalario'] = salEl.value.replace(/\./g,'');

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch(e) { /* storage lleno o en modo privado */ }

    /* Sincronizar los campos del formulario principal */
    sincronizarPrincipal();

        var cedula = (data['asocCedula'] || '').replace(/\./g,'').replace(/\s/g,'').trim();
        if (window._fbDB && window._fbDB !== null && cedula) {
          data.updated = new Date().toISOString();
          data.source  = 'portal-asociado';
          data.nombre  = [data['asocNom1'], data['asocNom2'], data['asocApe1'], data['asocApe2']].filter(Boolean).join(' ');
          window._fbDB.collection('asociados').doc(cedula).set(data, { merge: true })
            .then(function() {
              if (window.FUSound) FUSound.success();
              var bar = document.getElementById('asocSavedBar');
              if (bar) {
                bar.classList.add('show');
                bar.style.background = 'linear-gradient(135deg,#0D7A4E,#0a6040)';
                bar.textContent = '✅ Datos guardados y visibles para el equipo FondoUne';
                setTimeout(function() {
                  bar.classList.remove('show');
                  bar.style.background = '';
                  bar.textContent = 'Datos guardados correctamente. Se pre-llenarán en tu próxima solicitud.';
                }, 4000);
              }
            })
            .catch(function(e) {
              if (window.FUSound) FUSound.error();
              console.warn('Firebase asociado error:', e.message);
              var bar = document.getElementById('asocSavedBar');
              if (bar) {
                bar.classList.add('show');
                bar.style.background = 'linear-gradient(135deg,#B45309,#92400E)';
                bar.textContent = '⚠️ Guardado localmente. Sin conexión a la nube.';
                setTimeout(function() {
                  bar.classList.remove('show');
                  bar.style.background = '';
                  bar.textContent = 'Datos guardados correctamente. Se pre-llenarán en tu próxima solicitud.';
                }, 5000);
              }
            });
        } else {
          if (window.FUSound) FUSound.success();
          var bar = document.getElementById('asocSavedBar');
          if (bar) {
            bar.classList.add('show');
            setTimeout(function() { bar.classList.remove('show'); }, 3500);
          }
        }

    /* Actualizar el toggle txt para indicar que hay datos */
    var txt = document.getElementById('asocToggleTxt');
    if (txt) txt.textContent = 'Ocultar formulario';
  }

  /* ── Sincronizar nombre y cédula al formulario principal ── */
  function sincronizarPrincipal() {
    var nom1 = v('asocNom1'), nom2 = v('asocNom2');
    var ape1 = v('asocApe1'), ape2 = v('asocApe2');
    var nombreCompleto = [nom1, nom2, ape1, ape2].filter(Boolean).join(' ');

    var elNombre = document.getElementById('nombreTitular');
    var elCedula = document.getElementById('cedula');
    var elTel    = document.getElementById('telefono');
    var elCorreo = document.getElementById('correo');

    if (elNombre && !elNombre.value && nombreCompleto) elNombre.value = nombreCompleto;
    if (elCedula && !elCedula.value && v('asocCedula'))  elCedula.value = v('asocCedula');
    if (elTel    && !elTel.value    && v('asocCelular')) elTel.value    = v('asocCelular');
    if (elCorreo && !elCorreo.value && v('asocEmail'))   elCorreo.value = v('asocEmail');
  }

  function v(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  /* ── Limpiar todos los campos ── */
  function limpiar() {
    CAMPOS.forEach(function(id) {
      var el = document.getElementById(id);
      if (!el) return;
      if (el.tagName === 'SELECT') el.selectedIndex = 0;
      else el.value = '';
      el.disabled = false;
      el.style.opacity = '';
      el.style.background = '';
    });
    var cb = document.getElementById('asocRutNA');
    if (cb) cb.checked = false;

    /* Borrar datos del localStorage para que no reaparezcan al recargar */
    try { localStorage.removeItem(STORAGE_KEY); } catch(e) {}

    /* Resetear indicador del toggle */
    var tgl = document.getElementById('asocToggleTxt');
    if (tgl) tgl.textContent = 'Completar o actualizar mis datos personales';

    /* Feedback visual */
    var bar = document.getElementById('asocSavedBar');
    if (bar) {
      bar.classList.remove('show');
      bar.classList.add('show');
      bar.textContent = 'Datos del formulario borrados correctamente';
      setTimeout(function() { bar.classList.remove('show'); bar.textContent = ''; }, 3000);
    }
  }

  /* ── Toggle del RUT ── */
  function toggleRut(cb) {
    var inp = document.getElementById('asocRut');
    if (!inp) return;
    inp.disabled = cb.checked;
    inp.value = cb.checked ? 'No aplica' : '';
    inp.style.opacity = cb.checked ? '.4' : '1';
    inp.style.background = cb.checked ? '#f0f0f0' : '';
  }

  /* ── Formato de salario con puntos de miles ── */
  function formatSalario(inp) {
    var raw = inp.value.replace(/\D/g,'');
    if (!raw) return;
    inp.value = parseInt(raw, 10).toLocaleString('es-CO');
  }

  /* ── Init: cargar al iniciar, conectar formato salario ── */
  function init() {
    cargar();
    var salEl = document.getElementById('asocSalario');
    if (salEl) {
      salEl.addEventListener('input', function() {
        var pos = salEl.selectionStart;
        var raw = salEl.value.replace(/\D/g,'');
        if (raw) {
          salEl.value = parseInt(raw, 10).toLocaleString('es-CO');
        }
      });
    }

    /* Si ya hay datos guardados, mostrar indicador en el toggle */
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var data = JSON.parse(raw);
        var tiene = CAMPOS.some(function(id) { return !!data[id]; });
        if (tiene) {
          var txt = document.getElementById('asocToggleTxt');
          if (txt) txt.textContent = 'Ver / actualizar mis datos personales ✓';
        }
      }
    } catch(e) {}
  }

  document.addEventListener('DOMContentLoaded', init);

  return { toggle:toggle, guardar:guardar, limpiar:limpiar, toggleRut:toggleRut };
}());


/* ── toggleOtroBanco — muestra/oculta campo cuando selecciona "Otro" ── */
function toggleOtroBanco(select) {
  var fld = document.getElementById('fld-otroBanco');
  var inp = document.getElementById('otroBanco');
  if (!fld) return;
  var esOtro = select.value === 'Otro';
  fld.style.display = esOtro ? 'block' : 'none';
  fld.style.animation = esOtro ? 'fadeInField .25s ease both' : '';
  if (!esOtro && inp) inp.value = '';
}

/* ══ MÓDULO PQRS ══ */
var PQRS = (function() {
  var DB_KEY  = 'fondoune_solicitudes';
  var PQRS_KEY = 'fondoune_pqrs';

  function $id(id) { return document.getElementById(id); }
  function val(id) { var el=$id(id); return el ? el.value.trim() : ''; }

  function cargarPQRS() { try{return JSON.parse(localStorage.getItem(PQRS_KEY)||'[]');}catch(e){return [];} }
  function guardarPQRS(d) { try{localStorage.setItem(PQRS_KEY,JSON.stringify(d));}catch(e){} }

  function generarId() {
    return 'PQRS-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).substr(2,4).toUpperCase();
  }

  function selTipo(el, tipo) {
    document.querySelectorAll('.pqrs-tipo').forEach(function(t){ t.classList.remove('sel'); });
    el.classList.add('sel');
    $id('pqrsTipoSel').value = tipo;
  }

  function status(t, txt) {
    var b = $id('pqrsSbar');
    b.className = 'sbar ' + t;
    $id('pqrsSbarTxt').textContent = txt;
  }

  function enviar() {
    var nombre    = val('pqrsNombre');
    var documento = val('pqrsDocumento');
    var telefono  = val('pqrsTelefono');
    var tipoSel   = val('pqrsTipoSel');
    var inquietud = val('pqrsInquietud');

    if (!nombre || !documento || !telefono) {
      status('err','⚠ Completa los campos obligatorios: Nombre, Documento y Teléfono.');
      return;
    }
    if (!tipoSel) {
      status('err','⚠ Selecciona el tipo de solicitud (botones de arriba).');
      return;
    }
    if (!inquietud) {
      status('err','⚠ Por favor describe tu inquietud o solicitud.');
      return;
    }

    var tiposLabel = {
      'credito_vivienda': 'Crédito de Vivienda',
      'cancelacion_hipoteca': 'Cancelación de Hipoteca',
      'certificado_tributario': 'Certificado Tributario',
      'paz_y_salvo': 'Certificado de Paz y Salvo',
      'abono_libre_inversion': 'Abono Crédito Libre Inversión',
      'otra': 'Otra inquietud'
    };

    var registro = {
      id: generarId(),
      tipo: 'pqrs', tipoSolicitud: tipoSel,
      tipoLabel: tiposLabel[tipoSel] || tipoSel,
      nombre: nombre, documento: documento, telefono: telefono,
      correo: val('pqrsCorreo'), inquietud: inquietud,
      estado: 'pendiente', fechaRegistro: new Date().toISOString(),
      historial: [{ accion: 'Solicitud PQRS registrada por el asociado', fecha: new Date().toISOString(), usuario: 'Asociado' }]
    };

    // Guardar en localStorage como respaldo
    try {
      var db = JSON.parse(localStorage.getItem(DB_KEY) || '[]');
      db.unshift(registro); localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch(e) {}

    // Guardar en Firebase si está activo
        if (window._fbDB && window._fbDB !== null) {
          window._fbDB.collection('pqrs').doc(registro.id).set(registro)
            .then(function(){ console.log('✅ PQRS en Firebase:', registro.id); })
            .catch(function(e){ console.warn('Firebase PQRS error:', e.message); });
        }

    status('ok','✅ ¡Solicitud enviada! Tu ID de seguimiento es: ' + registro.id + '. Nos comunicaremos contigo a la brevedad.');
    $id('pqrsBtn').disabled = true;
    setTimeout(function() { limpiar(); $id('pqrsBtn').disabled = false; }, 4000);
  }

  function limpiar() {
    ['pqrsNombre','pqrsDocumento','pqrsTelefono','pqrsCorreo','pqrsInquietud'].forEach(function(id){
      var el=$id(id); if(el) el.value='';
    });
    $id('pqrsTipoSel').value='';
    document.querySelectorAll('.pqrs-tipo').forEach(function(t){ t.classList.remove('sel'); });
    $id('pqrsSbar').className='sbar';
  }

  /* ── Toggle del panel colapsable ── */
  function togglePanel() {
    var sec    = document.getElementById('pqrsSection');
    var body   = document.getElementById('pqrsBody');
    var header = document.getElementById('pqrsHeader');
    if (!sec || !body) return;
    var isOpen = sec.classList.contains('open');
    if (isOpen) {
      body.style.height = body.scrollHeight + 'px';
      body.offsetHeight;
      body.style.height = '0';
      sec.classList.remove('open');
      if (header) header.setAttribute('aria-expanded', 'false');
    } else {
      sec.classList.add('open');
      if (header) header.setAttribute('aria-expanded', 'true');
      body.style.height = body.scrollHeight + 'px';
      var onEnd = function() {
        body.removeEventListener('transitionend', onEnd);
        if (sec.classList.contains('open')) body.style.height = 'auto';
      };
      body.addEventListener('transitionend', onEnd);
    }
  }

  return { selTipo:selTipo, enviar:enviar, limpiar:limpiar, togglePanel:togglePanel };
}());

/* ═══════════════════════════════════════════════════════════
     EVENT LISTENER PARA BOTÓN DE CERRAR SESIÓN
  ═══════════════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', function() {
    var btnCerrarSesion = document.getElementById('btn-cerrar-sesion');
    if (btnCerrarSesion) {
      btnCerrarSesion.addEventListener('click', function() {
        // Reproducir sonido de click
        if (window.FU_Sound && typeof window.FU_Sound.click === 'function') {
          window.FU_Sound.click();
        }
        
        // Llamar a la función de cerrar sesión
        if (typeof window.FU_CerrarSesionNombre === 'function') {
          window.FU_CerrarSesionNombre();
        }
      });
    }
  });

document.addEventListener('click', function(e) {
    const anchor = e.target.closest('a[href^="#"]');
    if (!anchor) return;
    const id = anchor.getAttribute('href').slice(1);
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    const headerH = document.querySelector('.hdr')?.offsetHeight || 64;
    const top = target.getBoundingClientRect().top + window.scrollY - headerH - 12;
    window.scrollTo({ top: top, behavior: 'smooth' });
  });
