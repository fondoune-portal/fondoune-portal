/* ═══ SISTEMA FAQ ═══ */
var FAQ_DATA = [
  /* ── DOCUMENTOS GENERALES ── */
  { cat:'documentos', ico:'📄', q:'¿Qué documentos necesito en todos los tipos de crédito?',
    a:'En cualquier tipo de crédito siempre debes presentar: <ul><li>Cédula de ciudadanía del titular (y del codeudor si aplica)</li><li>Últimas 3 desprendibles de pago o certificado laboral</li><li>Extractos bancarios de los últimos 3 meses</li><li>Diligenciar completamente el formulario de esta plataforma</li></ul>' },
  { cat:'documentos', ico:'📄', q:'¿Qué es el RUT y cuándo debo presentarlo?',
    a:'El RUT (Registro Único Tributario) es el documento de la DIAN que identifica a personas y empresas como contribuyentes. Debes presentarlo si eres persona natural con actividad económica o si el vendedor es una empresa. Si no lo tienes, marca la casilla "No aplica".' },
  { cat:'documentos', ico:'📄', q:'¿Cómo obtengo el certificado de tradición y libertad del inmueble?',
    a:'Lo solicitas en la <strong>Oficina de Registro de Instrumentos Públicos</strong> de la ciudad donde está el inmueble, o en línea en <strong>ventanillaenlinea.supernotariado.gov.co</strong>. Tiene un costo aproximado de $17.000 y debe tener máximo 30 días de expedición.' },
  { cat:'documentos', ico:'📄', q:'¿Qué vigencia deben tener los documentos?',
    a:'Los documentos deben tener la siguiente vigencia al momento de la radicación: <ul><li><strong>Certificado tradición y libertad:</strong> máximo 30 días</li><li><strong>Paz y salvos (predial, valorización):</strong> vigentes al año en curso</li><li><strong>Avalúo:</strong> máximo 6 meses</li><li><strong>Extractos bancarios:</strong> últimos 3 meses</li></ul>' },
  { cat:'documentos', ico:'📋', q:'¿Qué pasa si alguno de mis documentos está vencido?',
    a:'La solicitud quedará radicada pero el asesor te contactará para solicitar los documentos actualizados antes de continuar con el proceso de aprobación. Es importante tener todos los documentos vigentes para agilizar el trámite.' },

  /* ── COMPRA DE VIVIENDA ── */
  { cat:'compra', ico:'🏡', q:'¿Cuáles son los documentos específicos para compra de vivienda?',
    a:'Además de los documentos generales, necesitas: <ul><li>Promesa de compraventa firmada por ambas partes</li><li>Cédula del vendedor (persona natural) o Cámara de Comercio vigente (empresa)</li><li>Certificado de tradición del inmueble (máx. 30 días)</li><li>Paz y salvo predial y de valorización</li><li>Avalúo comercial del inmueble (máx. 6 meses)</li></ul>' },
  { cat:'compra', ico:'🏡', q:'¿Qué es la promesa de compraventa y quién la elabora?',
    a:'Es el contrato previo en que el vendedor se compromete a vender y el comprador a comprar el inmueble bajo condiciones específicas (precio, fecha de escritura, penalidades). Generalmente la elabora un abogado o notaría. Debe incluir la identificación de las partes, la descripción del inmueble y el precio acordado.' },
  { cat:'compra', ico:'🏡', q:'¿El avalúo lo puedo hacer yo o debe ser de una empresa específica?',
    a:'El avalúo debe realizarlo un <strong>avaluador certificado por la Lonja de Propiedad Raíz</strong> o una empresa de avalúos reconocida. FondoUne no tiene empresa exclusiva; puedes usar cualquier avaluador certificado. El costo suele estar entre $300.000 y $600.000 dependiendo del inmueble.' },
  { cat:'compra', ico:'🏡', q:'¿Qué documentos necesita el vendedor si es una empresa (persona jurídica)?',
    a:'Si el vendedor es una empresa necesitas: <ul><li>Certificado de existencia y representación legal (Cámara de Comercio, máx. 30 días)</li><li>RUT de la empresa</li><li>Cédula del representante legal</li><li>Acta de junta o poder que autorice la venta</li></ul>' },

  /* ── CONSTRUCCIÓN Y MEJORAS ── */
  { cat:'construccion', ico:'🏗️', q:'¿Qué documentos son específicos para construcción y mejoras?',
    a:'Además de los documentos generales necesitas: <ul><li>Licencia de construcción vigente (expedida por la curaduría urbana)</li><li>Planos arquitectónicos aprobados</li><li>Presupuesto detallado de obra firmado por un ingeniero o arquitecto</li><li>Certificado de tradición del lote o inmueble</li><li>Escritura del lote o inmueble donde se va a construir</li></ul>' },
  { cat:'construccion', ico:'🏗️', q:'¿Cómo debo presentar el presupuesto de obra?',
    a:'El presupuesto debe estar <strong>firmado por un profesional</strong> (ingeniero civil o arquitecto con matrícula) e incluir: descripción de cada actividad, cantidades de obra, valores unitarios y valor total del proyecto. Debe estar en pesos colombianos y actualizados al momento de la radicación.' },
  { cat:'construccion', ico:'🏗️', q:'¿Qué pasa si no tengo la licencia de construcción todavía?',
    a:'La licencia es un requisito obligatorio para este tipo de crédito. Sin ella no es posible continuar el proceso, ya que el fondo necesita garantizar que la construcción sea legal. Puedes tramitarla en la <strong>Curaduría Urbana</strong> del municipio donde está el inmueble.' },

  /* ── GRAVAMEN HIPOTECARIO ── */
  { cat:'gravamen', ico:'🏦', q:'¿En qué consiste el crédito de gravamen hipotecario?',
    a:'Es un préstamo donde se utiliza como garantía un inmueble que ya tienes. El fondo registra una hipoteca sobre tu propiedad, y a cambio te otorga el crédito. El inmueble debe estar libre de embargos y otras hipotecas, o la hipoteca debe ser a favor del mismo fondo.' },
  { cat:'gravamen', ico:'🏦', q:'¿Qué documentos necesito para el gravamen hipotecario?',
    a:'Necesitas: <ul><li>Escritura pública del inmueble a hipotecar</li><li>Certificado de tradición y libertad (máx. 30 días)</li><li>Paz y salvo predial y de valorización vigentes</li><li>Avalúo comercial actualizado (máx. 6 meses)</li><li>Constancia del banco o entidad financiera si tiene hipoteca vigente</li></ul>' },
  { cat:'gravamen', ico:'🏦', q:'¿El inmueble puede tener hipoteca vigente con otro banco?',
    a:'Depende del caso. Si el inmueble ya tiene hipoteca con otra entidad, el fondo evaluará si el valor del inmueble es suficiente para garantizar ambas deudas. Debes presentar el <strong>saldo actual de la deuda</strong> y el certificado del banco donde aparece la hipoteca.' },
  { cat:'gravamen', ico:'🏦', q:'¿Qué es el paz y salvo predial y dónde lo obtengo?',
    a:'Es el documento que certifica que el inmueble está al día con el impuesto predial. Lo expide la <strong>Secretaría de Hacienda</strong> del municipio donde está ubicado el inmueble, o a través de los portales virtuales de cada alcaldía. Debe corresponder al año en curso.' },

  /* ── PROCESO ── */
  { cat:'proceso', ico:'⚙️', q:'¿Cuánto tiempo tarda el proceso de aprobación?',
    a:'El tiempo estimado es: <ul><li><strong>Revisión de documentos:</strong> 2 a 5 días hábiles</li><li><strong>Estudio de crédito:</strong> 3 a 8 días hábiles</li><li><strong>Aprobación y firma:</strong> 2 a 4 días hábiles</li><li><strong>Desembolso:</strong> 1 a 3 días hábiles</li></ul>El proceso total suele durar entre <strong>2 y 4 semanas</strong> si los documentos están completos.' },
  { cat:'proceso', ico:'⚙️', q:'¿Cómo hago seguimiento a mi solicitud?',
    a:'Una vez radiques tu solicitud en este portal, recibirás un <strong>número de radicado</strong>. Con ese número puedes comunicarte al correo fondoune@fondoune.com o llamar al 300 3528156 para consultar el estado. El asesor asignado también se comunicará contigo durante el proceso.' },
  { cat:'proceso', ico:'⚙️', q:'¿Qué pasa si me faltan documentos al momento de radicar?',
    a:'Puedes radicar la solicitud con los documentos que tengas disponibles. El sistema generará la lista de chequeo completa y el asesor te indicará cuáles documentos hacen falta. Sin embargo, <strong>el proceso no avanza hasta tener el expediente completo</strong>.' },
  { cat:'proceso', ico:'⚙️', q:'¿Puedo modificar mi solicitud después de enviarla?',
    a:'Una vez enviada, la solicitud no puede modificarse desde el portal. Si necesitas hacer correcciones, comunícate directamente con el equipo de FondoUne al correo fondoune@fondoune.com indicando tu número de radicado y los cambios necesarios.' },
  { cat:'proceso', ico:'⚙️', q:'¿Cuál es el monto máximo de crédito que puedo solicitar?',
    a:'El monto máximo depende de tu capacidad de pago, el valor del inmueble y las políticas vigentes del fondo. Para conocer el monto al que puedes acceder, comunícate con un asesor antes de iniciar el proceso para que realice una pre-aprobación sin costo.' },
  { cat:'proceso', ico:'⚙️', q:'¿Necesito codeudor para el crédito?',
    a:'No siempre es obligatorio, pero puede ser requerido si: <ul><li>Tu capacidad de pago individual no es suficiente</li><li>Llevas menos de 1 año como asociado del fondo</li><li>El comité de crédito así lo determine según el estudio</li></ul>El codeudor debe ser también asociado del fondo o cumplir los requisitos establecidos.' }
];

var _faqCatActiva = 'documentos';

/* ── Burbuja de Félix — aparece al cargar y periódicamente ── */
(function initFelixBubble() {
  var MENSAJES = [
    '¡Hola! ¿Tienes alguna<br><strong>duda o inquietud?</strong> 👋',
    '¿Necesitas ayuda con<br><strong>tu solicitud?</strong> 💬',
    'Estoy aquí para<br><strong>ayudarte</strong> 😊',
    '¿Tienes preguntas sobre<br><strong>crédito vivienda?</strong> 🏠',
  ];
  var idx = 0;

  function mostrar() {
    var burbuja = document.getElementById('fabBubble');
    if (!burbuja) return;
    burbuja.innerHTML = MENSAJES[idx % MENSAJES.length];
    idx++;
    burbuja.classList.add('show');
    /* Ocultar después de 4s */
    setTimeout(function() { burbuja.classList.remove('show'); }, 4200);
  }

  function ocultarBurbuja() {
    var burbuja = document.getElementById('fabBubble');
    if (burbuja) burbuja.classList.remove('show');
  }

  document.addEventListener('DOMContentLoaded', function() {
    /* Primera aparición: 2.5s después de cargar */
    setTimeout(mostrar, 2500);
    /* Ciclo: cada 14s */
    setInterval(mostrar, 14000);

    /* Ocultar la burbuja cuando el panel está abierto */
    var origToggle = window.toggleFAQ;
    if (origToggle) {
      window.toggleFAQ = function() {
        ocultarBurbuja();
        origToggle();
      };
    }
  });
}());

function toggleFAQ() {
  var panel   = document.getElementById('faqPanel');
  var overlay = document.getElementById('faqOverlay');
  var fab     = document.getElementById('fabHelp');
  var wrap    = document.getElementById('fabWrap');
  if (panel.classList.contains('show')) {
    cerrarFAQ();
  } else {
    panel.classList.remove('closing');
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        panel.classList.add('show');
        if (overlay) overlay.classList.add('show');
      });
    });
    if (fab)  fab.classList.add('clicked');
    if (wrap) wrap.classList.add('fab-docked');
    setTimeout(function(){ if(fab) fab.classList.remove('clicked'); }, 400);
    /* Félix: mostrar bienvenida y enfocar input */
    setTimeout(function(){
      showFelixWelcome();
      var inp = document.getElementById('felixInput');
      if (inp) inp.focus();
    }, 420);
  }
}
function cerrarFAQ() {
  var panel   = document.getElementById('faqPanel');
  var overlay = document.getElementById('faqOverlay');
  var wrap    = document.getElementById('fabWrap');
  panel.classList.remove('show');
  panel.classList.add('closing');
  if (overlay) overlay.classList.remove('show');
  if (wrap)    wrap.classList.remove('fab-docked');
  setTimeout(function(){ panel.classList.remove('closing'); }, 350);
}

function renderFAQ(items) {
  var list = document.getElementById('faqList');
  if (!items.length) {
    list.innerHTML = '<div class="faq-empty"><div class="faq-empty-ico">🔍</div><p>No encontramos preguntas que coincidan.<br>Intenta con otras palabras.</p></div>';
    return;
  }
  list.innerHTML = items.map(function(item, i) {
    return '<div class="faq-item" style="animation-delay:' + (i * 0.04) + 's" onclick="toggleFaqItem(this)">'
      + '<div class="faq-q">'
      + '<span class="faq-q-ico">' + item.ico + '</span>'
      + '<span class="faq-q-text">' + item.q + '</span>'
      + '<span class="faq-chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></span>'
      + '</div>'
      + '<div class="faq-a">' + item.a + '</div>'
      + '</div>';
  }).join('');
}

function toggleFaqItem(el) {
  var isOpen = el.classList.contains('open');

  /* ── Cerrar todas las abiertas ── */
  document.querySelectorAll('.faq-item.open').forEach(function(item) {
    item.classList.remove('open');
    var ans = item.querySelector('.faq-a');
    if (ans) ans.style.height = '0';
  });

  if (!isOpen) {
    /* ── Abrir la seleccionada ── */
    el.classList.add('open');
    var ans = el.querySelector('.faq-a');
    if (ans) {
      /*
       * Medir la altura REAL del contenido:
       * 1. Temporalmente hacer visible para medir
       * 2. Aplicar la altura medida como transición CSS
       * 3. Después de la transición, dejar height en 'auto'
       *    para que si el viewport cambia se reajuste
       */
      ans.style.height = 'auto';
      var targetH = ans.scrollHeight;
      ans.style.height = '0';

      /* Forzar reflow antes de animar */
      ans.offsetHeight; // eslint-disable-line no-unused-expressions

      ans.style.height = targetH + 'px';

      /* Al terminar la transición: cambiar a 'auto' para ser responsive */
      var onEnd = function() {
        ans.removeEventListener('transitionend', onEnd);
        if (el.classList.contains('open')) {
          ans.style.height = 'auto';
        }
      };
      ans.addEventListener('transitionend', onEnd);
    }

    /* Scroll suave en la lista para que el item abierto sea visible */
    setTimeout(function() {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 60);
  }
}

function filtrarFAQ() {
  var q = document.getElementById('faqSearch').value.toLowerCase().trim();
  var base = _faqCatActiva === 'todas' ? FAQ_DATA : FAQ_DATA.filter(function(f){ return f.cat === _faqCatActiva; });
  var resultado = !q ? base : base.filter(function(f) {
    return f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q);
  });
  renderFAQ(resultado);
}

function filtrarCategoria(cat, el) {
  _faqCatActiva = cat;
  document.querySelectorAll('.faq-cat').forEach(function(c){ c.classList.remove('active'); });
  el.classList.add('active');
  document.getElementById('faqSearch').value = '';
  var items = cat === 'todas' ? FAQ_DATA : FAQ_DATA.filter(function(f){ return f.cat === cat; });
  renderFAQ(items);
  /* Centrar la pill activa en la cinta */
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
}

/* ── Cinta de categorías: degradados reactivos + drag-to-scroll ── */
(function initCats() {
  var wrap, rail;

  function setup() {
    wrap = document.getElementById('faqCatsWrap');
    rail = document.getElementById('faqCats');
    if (!wrap || !rail) return;

    /* Actualizar degradados según posición del scroll */
    function updateFades() {
      var atStart = rail.scrollLeft <= 2;
      var atEnd   = rail.scrollLeft >= rail.scrollWidth - rail.clientWidth - 2;
      wrap.classList.toggle('at-start', atStart);
      wrap.classList.toggle('at-end',   atEnd);
    }
    rail.addEventListener('scroll', updateFades, { passive: true });
    updateFades(); /* estado inicial */

    /* Drag-to-scroll con mouse (escritorio) */
    var isDragging = false, startX, startScroll;
    rail.addEventListener('mousedown', function(e) {
      isDragging = true;
      startX     = e.pageX - rail.offsetLeft;
      startScroll = rail.scrollLeft;
      rail.style.userSelect = 'none';
    });
    document.addEventListener('mouseup', function() {
      isDragging = false;
      rail.style.userSelect = '';
    });
    document.addEventListener('mousemove', function(e) {
      if (!isDragging) return;
      e.preventDefault();
      var x    = e.pageX - rail.offsetLeft;
      var walk = (x - startX) * 1.2;
      rail.scrollLeft = startScroll - walk;
    });
  }

  /* Inicializar cuando el panel se abre */
  var orig = window.toggleFAQ;
  window.toggleFAQ = function() {
    orig();
    setTimeout(setup, 60); /* esperar al render */
  };
  /* También inicializar si ya estaba abierto */
  setup();
})();


  /* ── CARRUSEL HERO ── */
  var CAROUSEL = (function() {
  var SLIDE_MESSAGES = [
    {
      title: 'Radica tu solicitud<br><span class="hi">de crédito vivienda</span>',
      desc:  'Completa el formulario y genera tu lista de chequeo al instante.'
    },
    {
      title: 'Tu hogar propio<br><span class="hi">está más cerca</span>',
      desc:  'FondoUne te acompaña en cada paso del proceso hipotecario.'
    },
    {
      title: 'Construye o mejora<br><span class="hi">tu vivienda</span>',
      desc:  'Financia la construcción, ampliación o mejoras de tu inmueble.'
    },
    {
      title: 'Unidos por<br><span class="hi">nuestros sueños</span>',
      desc:  'Más de 20 años respaldando los sueños de vivienda de los asociados.'
    }
  ];

  function updateHeroText(index) {
    var titleEl = document.getElementById('heroTitle');
    var descEl  = document.getElementById('heroDesc');
    if (!titleEl || !descEl) return;
    // Fade out
    titleEl.classList.add('fading');
    descEl.classList.add('fading');
    setTimeout(function() {
      titleEl.innerHTML = SLIDE_MESSAGES[index].title;
      descEl.textContent = SLIDE_MESSAGES[index].desc;
      // Fade in — forzar reflow para que la transición se dispare correctamente
      titleEl.offsetHeight; // eslint-disable-line no-unused-expressions
      descEl.offsetHeight;  // eslint-disable-line no-unused-expressions
      titleEl.classList.remove('fading');
      descEl.classList.remove('fading');
    }, 350);
  }


    var slides, dots, current = 0, total, timer, INTERVAL = 5000;
    function init() {
      slides = document.querySelectorAll('.hero-slide');
      dots   = document.querySelectorAll('.hero-dot');
      total  = slides.length;
      if (!total) return;
      timer = setInterval(next, INTERVAL);
      // Pausa con hover
      var hero = document.querySelector('.hero');
      if (hero) {
        hero.addEventListener('mouseenter', function(){ clearInterval(timer); });
        hero.addEventListener('mouseleave', function(){ timer = setInterval(next, INTERVAL); });
      }
    }
    function goTo(n) {
      slides[current].classList.remove('active');
      dots[current].classList.remove('active');
      current = (n + total) % total;
      slides[current].classList.add('active');
      dots[current].classList.add('active');
      updateHeroText(current);
    }
    function next() { goTo(current + 1); }
    document.addEventListener('DOMContentLoaded', init);
    return { goTo: goTo, next: next };
  })();
