/* Pantallas de la app. Todo el estado vive en un solo objeto que se guarda
   en el almacenamiento del celular; los cálculos están en logica.js. */
(function () {
  'use strict';

  const L = window.Logica;
  const CLAVE = 'finanzas.v1';
  const CLAVE_OCULTAR = 'finanzas.ocultar';   // preferencia de este celular, no va en el respaldo
  const DEMO = /[?&]demo\b/.test(location.search);   // datos de muestra, no guarda
  const VISTAS = ['resumen', 'movimientos', 'presupuesto', 'metas', 'deudas', 'arkos', 'ajustes', 'subs', 'buscar'];
  const DIAS_SIN_RESPALDO = 14;

  const $ = function (s, r) { return (r || document).querySelector(s); };
  const esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  const ICO = {
    mas: '<svg class="ico" viewBox="0 0 24 24"><path d="M12 4v16M4 12h16"/></svg>',
    izq: '<svg class="ico" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
    der: '<svg class="ico" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
    cerrar: '<svg class="ico" viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19"/></svg>',
    ajustes: '<svg class="ico" viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><path d="M14 4.5h4v5h-4zM6 14.5h4v5H6z"/></svg>',
    buscar: '<svg class="ico" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/></svg>',
    ojo: '<svg class="ico" viewBox="0 0 24 24"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    ojoNo: '<svg class="ico" viewBox="0 0 24 24"><path d="M4 4l16 16M10 5.7A9.6 9.6 0 0112 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 01-2.8 3.6M6.3 7.4C3.9 9.2 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1.1M9.9 9.9a3 3 0 004.2 4.2"/></svg>',
    inicio: '<svg class="ico" viewBox="0 0 24 24"><path d="M4 11l8-7 8 7v9H4z"/></svg>',
    lista: '<svg class="ico" viewBox="0 0 24 24"><path d="M5 7h14M5 12h14M5 17h9"/></svg>',
    topes: '<svg class="ico" viewBox="0 0 24 24"><path d="M5 20V12M12 20V5M19 20v-9"/></svg>',
    meta: '<svg class="ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/></svg>',
    personas: '<svg class="ico" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.5 3.3-5.5 6.5-5.5s5.9 2 6.5 5.5M16 4.8a3.5 3.5 0 010 6.4M18.5 14.8c1.7.8 2.7 2.6 3 5.2"/></svg>',
    repetir: '<svg class="ico" viewBox="0 0 24 24"><path d="M4 12a8 8 0 0113.7-5.6L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 01-13.7 5.6L4 15.5M4 20v-4.5h4.5"/></svg>',
    sale: '<svg class="ico" viewBox="0 0 24 24"><path d="M7 17L17 7M9 7h8v8"/></svg>',
    entra: '<svg class="ico" viewBox="0 0 24 24"><path d="M17 7L7 17M15 17H7V9"/></svg>',
    vuelve: '<svg class="ico" viewBox="0 0 24 24"><path d="M9 14l-5-5 5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/></svg>',
    cruza: '<svg class="ico" viewBox="0 0 24 24"><path d="M4 8h14l-3-3M20 16H6l3 3"/></svg>'
  };

  // El chanchito negro: trazo claro fino y el hocico en lima.
  function chanchito(tam) {
    return '<svg class="chanchito" width="' + tam + '" height="' + tam + '" viewBox="0 0 64 64" aria-hidden="true">' +
      '<rect x=".5" y=".5" width="63" height="63" rx="18" fill="#161618" stroke="rgba(255,255,255,.08)"/>' +
      '<path d="M17 24 L15 14 L25 19" fill="#0B0B0C" stroke="#F4F4F2" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M47 24 L49 14 L39 19" fill="#0B0B0C" stroke="#F4F4F2" stroke-width="2" stroke-linejoin="round"/>' +
      '<circle cx="32" cy="35" r="17" fill="#0B0B0C" stroke="#F4F4F2" stroke-width="2"/>' +
      '<circle cx="25.5" cy="30" r="1.8" fill="#F4F4F2"/><circle cx="38.5" cy="30" r="1.8" fill="#F4F4F2"/>' +
      '<ellipse cx="32" cy="39.5" rx="7.5" ry="5.5" fill="#D4FF3F"/>' +
      '<circle cx="29.3" cy="39.5" r="1.4" fill="#0B0B0C"/><circle cx="34.7" cy="39.5" r="1.4" fill="#0B0B0C"/></svg>';
  }

  let estado = cargar();
  let ocultar = false;   // el ojito de "Tu plata hoy"
  try { ocultar = localStorage.getItem(CLAVE_OCULTAR) === '1'; } catch (e) { /* sin almacenamiento */ }
  let mes = L.mesDe(L.hoyISO());
  let filtro = 'todo';
  let filtroCuenta = '';   // id de la cuenta que se está mirando en Movimientos, o vacío
  let busqueda = '';
  let hoja = null;

  // ---------- guardado ----------

  function cargar() {
    if (DEMO) return L.demo(L.hoyISO());
    let crudo = null;
    try { crudo = localStorage.getItem(CLAVE); } catch (e) { /* sin almacenamiento */ }
    if (!crudo) return L.estadoInicial();
    try {
      const r = L.validar(JSON.parse(crudo));
      if (r.ok) return r.estado;
    } catch (e) { /* cae abajo */ }
    // No se pudo leer: se aparta una copia en vez de pisarla.
    try { localStorage.setItem(CLAVE + '.ilegible', crudo); } catch (e) { /* nada */ }
    return L.estadoInicial();
  }

  let pedidoPersistir = false;
  function guardar() {
    if (DEMO) return;
    try {
      localStorage.setItem(CLAVE, JSON.stringify(estado));
    } catch (e) {
      aviso('No se pudo guardar en el celular: ' + e.message, true);
      return;
    }
    if (!pedidoPersistir && navigator.storage && navigator.storage.persist) {
      pedidoPersistir = true;
      navigator.storage.persist().catch(function () {});
    }
  }

  // ---------- piezas ----------

  function num(c, mon, clase) {
    const p = L.partes(c, mon);
    return '<span class="num ' + (clase || '') + (p.neg ? ' negativo' : '') + '">' +
      (p.neg ? '<i class="sig">−</i>' : '') + '<i class="sim">' + p.sim + '</i>' + p.ent +
      '<i class="dec">.' + p.dec + '</i></span>';
  }
  // Un monto que el ojito puede tapar.
  function plata(c, mon, clase) {
    return ocultar ? '<span class="num oculto ' + (clase || '') + '"><i class="sim">' + L.SIMBOLO[mon] + '</i>••••</span>' : num(c, mon, clase);
  }
  function plataTexto(c, mon) { return ocultar ? L.SIMBOLO[mon] + ' ••••' : L.fmt(c, mon); }
  function barraAv(pct, clase) {
    return '<span class="barra-av ' + (clase || '') + '"><i style="width:' + Math.max(0, Math.min(100, pct)) + '%"></i></span>';
  }
  function dosMonedas(g) {
    const t = [];
    if (g.PEN || !g.USD) t.push(L.fmt(g.PEN, 'PEN'));
    if (g.USD) t.push(L.fmt(g.USD, 'USD'));
    return t.join(' · ');
  }
  function tcTexto() { return estado.tc.toFixed(3).replace(/0$/, ''); }
  // `enArkos`: la fila va en la pantalla de Arkos y no hace falta marcarla.
  function filaMov(m, enArkos) {
    const cta = m.arkos && !m.cuenta ? { nombre: 'Fuera de mis cuentas' } : { nombre: L.comoSePago(estado, m) };
    const ic = { gasto: ['', ICO.sale], ingreso: [' verde', ICO.entra], devolucion: [' lima', ICO.vuelve], transferencia: ['', ICO.cruza] }[m.tipo];
    const abre = '<button class="fila" data-accion="editar-mov" data-id="' + esc(m.id) + '"><span class="ic' + ic[0] + '">' + ic[1] + '</span><span class="izq"><b>';
    if (m.tipo === 'transferencia') {
      const dest = L.cuentaDe(estado, m.destino);
      return abre + 'Transferencia</b><span class="meta">' + esc(cta ? cta.nombre : '') + ' → ' + esc(dest ? dest.nombre : '') +
        (m.nota ? ' · ' + esc(m.nota) : '') + '</span></span><span class="der neutro">' + L.fmt(m.monto, m.mon) +
        (dest && dest.mon !== m.mon ? '<span class="meta' + (m.estimado ? ' pendiente' : '') + '">' + (m.estimado ? '≈ ' : '') +
          L.fmt(m.llega, dest.mon) + '</span>' : '') + '</span></button>';
    }
    const ing = m.tipo !== 'gasto';   // un ingreso o una devolución: la plata vuelve
    let sub = '';
    if (m.monCuenta) {
      sub = '<span class="meta' + (m.estimado ? ' pendiente' : '') + '">' + (m.estimado ? '≈ ' : '') +
        L.fmt(m.cobrado, m.monCuenta) + (m.estimado ? ' · por confirmar' : '') + '</span>';
    } else if (m.mon === 'USD') {
      sub = '<span class="meta">≈ ' + L.fmt(L.aSoles(m), 'PEN') + '</span>';
    }
    const comp = m.partes && m.partes.length;
    if (comp) sub += '<span class="meta">Tu parte ' + L.fmt(L.propio(m), m.mon) + '</span>';
    return abre + (m.tipo === 'devolucion' ? 'Devolución · ' : '') + esc(L.nombreCat(estado, L.claveCats(m), m.cat)) + '</b><span class="meta">' + (m.arkos && enArkos !== true ? 'Arkos · ' : '') + esc(cta ? cta.nombre : '') +
      (m.nota ? ' · ' + esc(m.nota) : '') + (comp ? ' · con ' + esc(m.partes.map(function (p) { return p.persona; }).join(', ')) : '') + '</span></span>' +
      '<span class="der' + (ing ? ' ingreso' : '') + '">' + (ing ? '+ ' : '') + L.fmt(m.monto, m.mon) + sub + '</span></button>';
  }
  // Saldo de una persona: cada moneda en su línea, verde si me debe y rojo si le debo.
  function saldoPersona(f) {
    if (!f.pendiente) return '<span class="der neutro">Saldado</span>';
    const partes = [];
    for (const mon of ['PEN', 'USD']) {
      const v = f.saldo[mon];
      if (!v) continue;
      partes.push('<span class="' + (v > 0 ? 'por-cobrar' : 'negativo') + '">' + (v > 0 ? '+ ' : '') + L.fmt(v, mon) + '</span>');
    }
    return '<span class="der">' + partes.join('<br>') + '</span>';
  }
  // Debajo del nombre: de qué es lo que falta (los dos últimos conceptos sin pagar).
  function motivosPersona(f) {
    if (!f.pendiente) return f.apuntes.length + (f.apuntes.length === 1 ? ' apunte' : ' apuntes');
    const notas = L.abiertos(f).filter(function (x) { return x.apunte.nota; }).slice(0, 2).map(function (x) { return x.apunte.nota; });
    return notas.length ? notas.join(' · ') : 'Sin detalle';
  }
  function filaPersona(f) {
    return '<button class="fila" data-accion="persona" data-id="' + esc(f.clave) + '"><span class="izq"><b>' + esc(f.nombre) +
      '</b><span class="meta">' + esc(motivosPersona(f)) + '</span></span>' + saldoPersona(f) + '</button>';
  }
  function vistaActual() {
    const h = location.hash.replace('#', '');
    return VISTAS.indexOf(h) >= 0 ? h : 'resumen';
  }
  function diasDesdeRespaldo() {
    if (!estado.ultimoRespaldo) return null;
    return Math.floor((Date.now() - new Date(estado.ultimoRespaldo).getTime()) / 86400000);
  }

  // ---------- pantallas ----------

  function pintarCabecera(v) {
    const n = L.nombreMes(mes);
    const volver = '<a class="cuadro" href="#resumen" aria-label="Volver">' + ICO.izq + '</a>';
    const flechas = '<button class="cuadro" data-accion="mes" data-d="-1" aria-label="Mes anterior">' + ICO.izq + '</button>' +
      '<button class="cuadro" data-accion="mes" data-d="1" aria-label="Mes siguiente">' + ICO.der + '</button>';
    const titulo = function (arriba, texto) {
      return '<div class="titulo"><span class="eyebrow">' + arriba + (DEMO ? ' · demo' : '') + '</span><h1>' + texto + '</h1></div>';
    };
    let h;
    if (v === 'resumen') {
      const hoy = L.hoyISO(), dia = L.etiquetaDia(hoy).split(' ');
      h = chanchito(50) + '<div class="titulo"><span class="fecha">' + dia[0] + ' ' + Number(dia[1]) + ' ' + dia[2] + (DEMO ? ' · demo' : '') + '</span>' +
        '<h1>Hola, Juan Carlos</h1></div>' +
        '<a class="cuadro" href="#buscar" aria-label="Buscar">' + ICO.buscar + '</a>' +
        '<a class="cuadro" href="#ajustes" aria-label="Ajustes">' + ICO.ajustes + '</a>';
    } else if (v === 'arkos') {
      h = volver + titulo('Arkos · ' + n.anio, n.nombre) + flechas;
    } else if (v === 'movimientos' || v === 'presupuesto') {
      h = titulo((v === 'presupuesto' ? 'Topes · ' : '') + n.anio, n.nombre) + flechas +
        (v === 'movimientos' ? '<a class="cuadro" href="#buscar" aria-label="Buscar">' + ICO.buscar + '</a>' : '');
    } else if (v === 'metas') {
      h = titulo('Ahorro', 'Metas') + '<a class="cuadro" href="#ajustes" aria-label="Ajustes">' + ICO.ajustes + '</a>';
    } else {
      h = volver + titulo('Oink', { deudas: 'Personas', ajustes: 'Ajustes', subs: 'Suscripciones', buscar: 'Buscar' }[v]);
    }
    $('#cabecera').innerHTML = h;
  }

  function pintarBarra(v) {
    const a = function (id, ico, texto) {
      return '<a href="#' + id + '"' + (v === id ? ' class="on"' : '') + '>' + ico + texto + '</a>';
    };
    $('#barra').innerHTML = a('resumen', ICO.inicio, 'Inicio') + a('movimientos', ICO.lista, 'Movimientos') +
      '<button data-accion="nuevo-mov" aria-label="Nuevo movimiento">' + ICO.mas + '</button>' +
      a('presupuesto', ICO.topes, 'Topes') + a('metas', ICO.meta, 'Metas');
  }

  function vResumen() {
    const r = L.resumenMes(estado, mes), s = L.saldos(estado), p = L.presupuestoMes(estado, mes);
    const n = L.nombreMes(mes);
    let h = '';

    const dias = diasDesdeRespaldo();
    if (estado.movs.length >= 10 && (dias === null || dias >= DIAS_SIN_RESPALDO)) {
      h += '<div class="franja"><p>' + (dias === null ? 'Todavía no tienes un respaldo.' :
        'Tu último respaldo es de hace ' + dias + ' días.') + '</p>' +
        '<button class="btn sec chico" data-accion="respaldo">Guardar</button></div>';
    }

    // lo que se cobra (o llega) estos días y falta confirmar
    for (const x of L.subsPendientes(estado, L.hoyISO())) {
      const sub = x.sub, ing = sub.tipo === 'ingreso', c = L.cuentaDe(estado, sub.cuenta);
      const cuando = x.vence < 0 ? 'Ya ' + (ing ? 'llegó' : 'se cobró') : x.vence === 0 ? 'Hoy ' + (ing ? 'llega' : 'se cobra') :
        x.vence === 1 ? 'Mañana ' + (ing ? 'llega' : 'se cobra') : 'En ' + x.vence + ' días ' + (ing ? 'llega' : 'se cobra');
      h += '<div class="alerta"><span class="logo' + (ing ? ' ingreso' : '') + '">' + esc(sub.nombre.charAt(0).toUpperCase()) + '</span>' +
        '<div class="tx"><b>' + cuando + ' ' + esc(sub.nombre) + '</b><span class="meta">' + L.fmt(sub.monto, sub.mon) + ' · ' +
        esc(L.comoSePago(estado, sub)) + (c && c.mon !== sub.mon ? ' · luego confirmas lo cobrado' : '') + ' · ' + L.fechaCorta(x.fecha).slice(0, 6) + '</span></div>' +
        '<div class="botones"><button class="btn prim chico" data-accion="sub-confirmar" data-id="' + esc(sub.id) + '" data-fecha="' + x.fecha + '">Confirmar</button>' +
        '<button class="btn chico" data-accion="sub-otro" data-id="' + esc(sub.id) + '" data-fecha="' + x.fecha + '">Otro monto</button>' +
        '<button class="btn texto chico" data-accion="sub-saltar" data-id="' + esc(sub.id) + '">No este mes</button></div></div>';
    }

    // tu plata hoy, con el ojito
    const queda = r.queda >= 0 ? 'te quedan ' + plataTexto(r.queda, 'PEN') : 'te pasaste por ' + plataTexto(-r.queda, 'PEN');
    h += '<section class="saldo"><div class="arriba"><span class="eyebrow">Tu plata hoy</span>' +
      '<button class="ojo" data-accion="ocultar" aria-label="' + (ocultar ? 'Mostrar montos' : 'Ocultar montos') + '">' + (ocultar ? ICO.ojoNo : ICO.ojo) + '</button></div>' +
      plata(s.total, 'PEN', 'grande' + (Math.abs(s.total) >= 10000000 ? ' largo' : '')) +
      '<p class="mano">' + queda + ' en ' + n.nombre.toLowerCase() + '</p>' +
      '<div class="cuentas">' + s.filas.map(function (f, i) {
        return '<button class="cuenta" data-accion="ver-cuenta" data-id="' + esc(f.id) + '"><span><i style="background:var(--c' + (i % 5 + 2) + ')"></i>' + esc(f.nombre) + '</span>' +
          '<b' + (f.saldo < 0 && !ocultar ? ' class="negativo"' : '') + '>' + plataTexto(f.saldo, f.mon) + '</b></button>';
      }).join('') + '</div></section>';

    // el mes en tres números
    h += '<section class="reticula tres">' +
      '<div class="celda"><span class="eyebrow">Entró</span>' + num(r.ingresos.total, 'PEN', 'medio') + '</div>' +
      '<div class="celda"><span class="eyebrow">Salió</span>' + num(r.gastos.total, 'PEN', 'medio') + '</div>' +
      '<div class="celda"><span class="eyebrow">Ahorro</span>' + num(r.ahorro, 'PEN', 'medio') + '</div></section>';

    // el anillo: lo mío gastado por categoría (sin Arkos) sobre lo que dan los topes
    const filas = p.filas.filter(function (f) { return f.gastado > 0; }).sort(function (a, b) { return b.gastado - a.gastado; });
    let gastado = 0;
    for (const f of filas) gastado += f.gastado;
    const base = Math.max(p.topeTotal, gastado);
    h += '<section class="caja"><div class="encabezado"><span class="eyebrow">' + n.nombre + ', lo tuyo</span>' +
      '<span class="mesnav"><button data-accion="mes" data-d="-1" aria-label="Mes anterior">' + ICO.izq + '</button>' +
      '<button data-accion="mes" data-d="1" aria-label="Mes siguiente">' + ICO.der + '</button></span></div>';
    if (!gastado) {
      h += '<div class="vacio" style="border:0;padding:24px 0 6px"><p>Todavía no hay gastos en ' + n.nombre.toLowerCase() + '.</p>' +
        '<span class="meta">Toca el + de abajo para anotar el primero.</span></div></section>';
    } else {
      const radio = 74, C = 2 * Math.PI * radio, hueco = 10;
      let arcos = '', ya = 0;
      filas.forEach(function (f, i) {
        const largo = f.gastado / base * C;
        arcos += '<circle cx="90" cy="90" r="' + radio + '" class="arco" style="stroke:var(--c' + (i % 6 + 1) + ')" stroke-dasharray="' +
          Math.max(0.01, largo - hueco).toFixed(1) + ' ' + C.toFixed(1) + '" stroke-dashoffset="' + (-(ya + hueco / 2)).toFixed(1) + '"/>';
        ya += largo;
      });
      h += '<div class="anillo-caja"><svg viewBox="0 0 180 180" aria-hidden="true"><circle cx="90" cy="90" r="' + radio + '" class="pista"/>' + arcos + '</svg>' +
        '<div class="centro"><span class="meta">Gastaste</span>' + num(gastado, 'PEN') +
        (p.hayTopes ? '<span class="meta">de ' + L.fmt(p.topeTotal, 'PEN') + '</span>' : '') + '</div></div>' +
        '<p class="mano frase">' + (!p.hayTopes ? 'ponle topes a tus categorías' : p.disponible >= 0 ?
          'te quedan ' + L.fmt(p.disponible, 'PEN') + ' de tus topes' : 'te pasaste ' + L.fmt(-p.disponible, 'PEN') + ' de tus topes') + '</p>' +
        '<div class="cats">' + filas.slice(0, 4).map(function (f, i) {
          const pct = f.tope ? Math.round(f.gastado / f.tope * 100) : Math.round(f.gastado / gastado * 100);
          return '<button class="cat" data-accion="tope" data-id="' + esc(f.cat) + '"><span class="arriba"><span>' + esc(f.nombre) + '</span>' +
            '<em' + (f.pasado ? ' class="negativo"' : '') + '>' + pct + '%' + (f.tope ? '' : ' del mes') + '</em></span>' +
            '<span class="barra-av"><i style="width:' + Math.min(100, pct) + '%;background:' + (f.pasado ? 'var(--rojo)' : 'var(--c' + (i % 6 + 1) + ')') + '"></i></span></button>';
        }).join('') + '</div>' +
        '<a class="enlace" href="#presupuesto" style="display:block;text-align:center;margin-top:16px">Ver todos los topes</a></section>';
    }

    // Arkos este mes, con lo que entró y salió cada día
    const fa = L.flujoArkos(estado);
    if (fa.meses.length) {
      const am = L.arkosMes(fa, mes), pd = L.porDia(estado, mes, true);
      const tope = Math.max.apply(null, pd.ingresos.concat(pd.gastos).concat([1]));
      const rayas = function (lista, color) {
        return '<div class="rayas">' + lista.map(function (v) {
          return '<i style="background:' + color + ';height:' + Math.max(8, Math.round(Math.max(0, v) / tope * 100)) + '%;opacity:' + (v > 0 ? 1 : .18) + '"></i>';
        }).join('') + '</div>';
      };
      h += '<section class="caja"><div class="encabezado"><span class="eyebrow">Arkos · ' + n.nombre.toLowerCase() + '</span><a href="#arkos">Ver flujo</a></div>' +
        '<div class="flujo"><div><span class="meta">Entró</span>' + num(am.ingresos.total, 'PEN') + rayas(pd.ingresos, 'var(--verde)') + '</div>' +
        '<div><span class="meta">Salió</span>' + num(am.gastos.total, 'PEN') + rayas(pd.gastos, 'var(--c3)') + '</div></div></section>';
    }

    // accesos: personas y suscripciones
    const t = L.totalDeudas(estado);
    const deben = L.textoSaldo(t.meDeben), debo = L.textoSaldo(t.debo);
    const totSubs = L.totalSubs(estado);
    h += '<section class="accesos">' +
      '<a class="acceso" href="#deudas">' + ICO.personas + '<span><b>Personas</b><span class="meta">' +
        (deben !== 'Saldado' ? 'Te deben ' + deben : debo !== 'Saldado' ? 'Debes ' + debo : 'Nadie te debe') + '</span></span></a>' +
      '<a class="acceso" href="#subs">' + ICO.repetir + '<span><b>Suscripciones</b><span class="meta">' +
        (totSubs ? L.fmt(totSubs, 'PEN') + ' al mes' : 'Claude, Netflix, sueldo…') + '</span></span></a></section>';

    // lo último anotado
    const ultimos = [];
    for (const d of L.diasDelMes(estado, mes, 'todo')) {
      for (const m of d.movs) if (ultimos.length < 5) ultimos.push(m);
    }
    if (ultimos.length) {
      h += '<div class="encabezado"><span class="eyebrow">Últimos</span><a href="#movimientos">Ver todos</a></div>' +
        '<div class="lista">' + ultimos.map(filaMov).join('') + '</div>';
    }
    return h;
  }

  function vSubs() {
    const anotar = '<button class="btn sec ancho" data-accion="sub">Nueva suscripción</button>';
    if (!estado.subs.length) {
      return '<section class="vacio"><span class="eyebrow">Sin suscripciones</span>' +
        '<p>Lo que se repite cada mes, anotado solo.</p>' +
        '<span class="meta">Claude, Netflix, Spotify… o el sueldo. El día que toca (y desde 3 días antes) aparece en el Inicio para confirmarlo, ' +
        'cambiar el monto o saltarlo ese mes.</span><div class="acciones"><button class="btn prim" data-accion="sub">Nueva suscripción</button></div></section>';
    }
    const fila = function (sub) {
      const ing = sub.tipo === 'ingreso';
      return '<button class="fila" data-accion="sub" data-id="' + esc(sub.id) + '"><span class="ic' + (ing ? ' verde' : ' lima') + '">' + ICO.repetir + '</span>' +
        '<span class="izq"><b>' + esc(sub.nombre) + '</b><span class="meta">' + (sub.pausada ? 'Pausada · ' : '') + 'Día ' + sub.dia + ' · ' +
        esc(L.comoSePago(estado, sub)) + ' · ' + esc(L.nombreCat(estado, L.claveCats(sub), sub.cat)) + '</span></span>' +
        '<span class="der' + (ing ? ' ingreso' : '') + (sub.pausada ? ' neutro' : '') + '">' + (ing ? '+ ' : '') + L.fmt(sub.monto, sub.mon) + '</span></button>';
    };
    const ord = estado.subs.slice().sort(function (a, b) { return a.dia - b.dia; });
    const gastos = ord.filter(function (x) { return x.tipo !== 'ingreso'; }), ingresos = ord.filter(function (x) { return x.tipo === 'ingreso'; });
    let h = '<section class="celda"><span class="eyebrow">Se va al mes</span>' + num(L.totalSubs(estado), 'PEN', 'grande') +
      '<p class="meta">En soles, con los dólares al cambio de ' + tcTexto() + '. Sin contar lo pausado.</p></section>';
    if (gastos.length) h += '<div class="encabezado"><span class="eyebrow">Cobros</span></div><div class="lista">' + gastos.map(fila).join('') + '</div>';
    if (ingresos.length) h += '<div class="encabezado"><span class="eyebrow">Lo que llega</span></div><div class="lista">' + ingresos.map(fila).join('') + '</div>';
    return h + anotar;
  }

  function vBuscar() {
    return '<label class="buscador">' + ICO.buscar + '<input type="search" id="q" placeholder="Nota, categoría, cuenta, Yape, persona…" autocomplete="off" value="' + esc(busqueda) + '"></label>' +
      '<div id="resultados">' + resultados() + '</div>';
  }
  function resultados() {
    if (!busqueda.trim()) return '<p class="meta" style="padding:6px 6px 0">Busca en todos los meses. No importan las tildes ni las mayúsculas.</p>';
    const r = L.buscar(estado, busqueda);
    if (!r.n) return '<section class="vacio"><span class="eyebrow">Sin resultados</span><p>Nada con “' + esc(busqueda.trim()) + '”.</p></section>';
    let h = '<p class="meta" style="padding:6px 6px 0">' + r.n + (r.n === 1 ? ' movimiento' : ' movimientos') + '</p>';
    for (const d of r.dias) {
      h += '<div class="dia"><span class="eyebrow">' + L.etiquetaDia(d.fecha) + ' ' + d.fecha.slice(0, 4) + '</span></div>' +
        '<div class="lista">' + d.movs.map(filaMov).join('') + '</div>';
    }
    return h;
  }

  function vMovimientos() {
    const chip = function (id, texto) {
      return '<a class="chip' + (filtro === id ? ' on' : '') + '" href="#movimientos" data-accion="filtro" data-f="' + id + '">' + texto + '</a>';
    };
    const chipCta = function (id, texto) {
      return '<a class="chip' + (filtroCuenta === id ? ' on' : '') + '" href="#movimientos" data-accion="filtro-cuenta" data-id="' + esc(id) + '">' + esc(texto) + '</a>';
    };
    let h = '<div class="filtros">' + chip('todo', 'Todo') + chip('gasto', 'Gastos') + chip('ingreso', 'Ingresos') +
      estado.medios.map(function (x) { return chip('m:' + x.id, esc(x.nombre)); }).join('') +
      (estado.movs.some(function (m) { return m.arkos; }) ? chip('arkos', 'Arkos') : '') + '</div>' +
      '<div class="filtros">' + chipCta('', 'Todas las cuentas') + estado.cuentas.map(function (c) { return chipCta(c.id, c.nombre); }).join('') + '</div>';
    const porMedio = filtro.indexOf('m:') === 0;
    const dias = L.diasDelMes(estado, mes, filtro === 'arkos' || porMedio ? 'todo' : filtro, filtroCuenta, filtro === 'arkos', porMedio ? filtro.slice(2) : '');
    if (!dias.length) {
      return h + '<section class="vacio"><span class="eyebrow gris">Sin movimientos</span>' +
        '<p>No hay nada anotado con este filtro en el mes.</p></section>';
    }
    for (const d of dias) {
      h += '<div class="dia"><span class="eyebrow">' + L.etiquetaDia(d.fecha) + '</span>' +
        '<span class="meta">' + (d.neto > 0 ? '+ ' : '') + L.fmt(d.neto, 'PEN') + '</span></div>' +
        '<div class="lista">' + d.movs.map(filaMov).join('') + '</div>';
    }
    return h;
  }

  function vPresupuesto() {
    const p = L.presupuestoMes(estado, mes);
    let h;
    if (p.hayTopes) {
      const pct = p.topeTotal ? Math.round(p.gastadoConTope / p.topeTotal * 100) : 0;
      h = '<section class="celda"><span class="eyebrow">' + (p.disponible < 0 ? 'Pasado del presupuesto' : 'Disponible del presupuesto') + '</span>' +
        num(p.disponible, 'PEN', 'grande') +
        '<p class="meta">Gastado ' + L.fmt(p.gastadoConTope, 'PEN') + ' de ' + L.fmt(p.topeTotal, 'PEN') + ' · ' + pct + '%</p>' +
        barraAv(pct, p.disponible < 0 ? 'rojo' : '') + '</section>';
    } else {
      h = '<section class="vacio"><span class="eyebrow gris">Sin topes</span>' +
        '<p>Ponle un tope mensual a cada categoría.</p>' +
        '<span class="meta">Toca una categoría para definir cuánto quieres gastar como máximo al mes. El tope se repite todos los meses y va en soles.</span></section>';
    }
    h += '<div class="encabezado"><span class="eyebrow">Categorías</span><span class="eyebrow gris">Gastado / tope</span></div><div class="lista">';
    for (const f of p.filas) {
      let pie;
      if (!f.tope) pie = '<span class="meta pie">Sin tope · toca para ponerlo</span>';
      else if (f.pasado) pie = barraAv(100, 'rojo') + '<span class="meta pie negativo">Pasado por ' + L.fmt(-f.resto, 'PEN') + '</span>';
      else pie = barraAv(f.pct) + '<span class="meta pie">Quedan ' + L.fmt(f.resto, 'PEN') + '</span>';
      h += '<button class="fila bloque" data-accion="tope" data-id="' + esc(f.cat) + '">' +
        '<span class="arriba"><b>' + esc(f.nombre) + '</b><span>' + L.fmt(f.gastado, 'PEN') +
        (f.tope ? ' <span class="meta">/ ' + L.fmt(f.tope, 'PEN') + '</span>' : '') + '</span></span>' + pie + '</button>';
    }
    return h + '</div>';
  }

  function vMetas() {
    const hoy = L.hoyISO();
    if (!estado.metas.length) {
      return '<section class="vacio"><span class="eyebrow gris">Sin metas</span>' +
        '<p>Define para qué estás ahorrando y cuánto necesitas.</p>' +
        '<span class="meta">Cada aporte que anotes se descuenta de lo que te queda en el mes.</span>' +
        '<div class="acciones"><button class="btn prim" data-accion="nueva-meta">Nueva meta</button></div></section>';
    }
    let h = '';
    estado.metas.forEach(function (g, i) {
      const p = L.progresoMeta(g, hoy);
      let pie;
      if (p.lograda) pie = 'Meta cumplida.';
      else if (p.vencida) pie = 'Faltan ' + L.fmt(p.falta, g.mon) + ' · la fecha ya pasó (' + L.fechaCorta(g.fecha) + ').';
      else if (p.meses) pie = 'Faltan ' + L.fmt(p.falta, g.mon) + ' · ' + L.fmt(p.porMes, g.mon) + ' al mes durante ' +
        p.meses + (p.meses === 1 ? ' mes' : ' meses') + '.';
      else pie = 'Faltan ' + L.fmt(p.falta, g.mon) + '.';
      h += '<section class="meta-celda"><span class="eyebrow gris">Meta ' + String(i + 1).padStart(2, '0') +
        (g.fecha ? ' — ' + L.fechaCorta(g.fecha) : '') + '</span><h2>' + esc(g.nombre) + '</h2>' +
        '<div class="linea-num"><span class="pct">' + p.pct + '<small>%</small></span>' +
        '<span class="de"><b>' + L.fmt(p.acumulado, g.mon) + '</b><span class="meta">de ' + L.fmt(g.objetivo, g.mon) + '</span></span></div>' +
        barraAv(p.pct, 'cuero') + '<p class="meta">' + pie + '</p>' +
        '<div class="acciones"><button class="btn prim" data-accion="aporte" data-id="' + esc(g.id) + '" data-signo="1">Aportar</button>' +
        '<button class="btn sec" data-accion="aporte" data-id="' + esc(g.id) + '" data-signo="-1">Retirar</button>' +
        '<button class="btn sec" data-accion="detalle-meta" data-id="' + esc(g.id) + '">Detalle</button></div></section>';
    });
    return h + '<div><button class="btn sec ancho" data-accion="nueva-meta">Nueva meta</button></div>';
  }

  function vDeudas() {
    const personas = L.deudasPorPersona(estado);
    if (!personas.length) {
      return '<section class="vacio"><span class="eyebrow gris">Sin apuntes</span>' +
        '<p>Anota quién te debe y por qué.</p>' +
        '<span class="meta">Un taxi compartido, una cena que pagaste por todos. Cuando te devuelvan la plata, la anotas y el saldo baja.</span>' +
        '<div class="acciones"><button class="btn prim" data-accion="nueva-deuda">Nuevo apunte</button></div></section>';
    }
    const t = L.totalDeudas(estado);
    const monto = function (saldo) { return L.textoSaldo(saldo).replace('Saldado', 'Nada'); };
    let h = '<section class="reticula dos-col"><div class="celda"><span class="eyebrow">Te deben</span>' +
      '<span class="meta-grande">' + monto(t.meDeben) + '</span></div>' +
      '<div class="celda"><span class="eyebrow">Debes</span>' +
      '<span class="meta-grande">' + monto(t.debo) + '</span></div></section>';
    const pend = personas.filter(function (f) { return f.pendiente; });
    const saldadas = personas.filter(function (f) { return !f.pendiente; });
    if (pend.length) h += '<div class="encabezado"><span class="eyebrow">Pendiente</span></div><div class="lista">' + pend.map(filaPersona).join('') + '</div>';
    if (saldadas.length) h += '<div class="encabezado"><span class="eyebrow gris">Saldadas</span></div><div class="lista">' + saldadas.map(filaPersona).join('') + '</div>';
    return h + '<div><button class="btn sec ancho" data-accion="nueva-deuda">Nuevo apunte</button></div>';
  }

  function vArkos() {
    const f = L.flujoArkos(estado);
    const m = L.arkosMes(f, mes);
    const anotar = '<div><button class="btn prim ancho" data-accion="nuevo-mov" data-arkos="1">Anotar en Arkos</button></div>';
    if (!f.meses.length) {
      return '<section class="vacio"><span class="eyebrow gris">Sin movimientos</span>' +
        '<p>Mira solo lo que entra y sale de Arkos.</p>' +
        '<span class="meta">Al anotar un gasto o ingreso, marca "De Arkos". Cuenta en tu mes como cualquier otro y acá lo ves aparte. ' +
        'Para lo de antes de usar la app, elige "Fuera de mis cuentas": cuenta en su mes, pero no mueve tus saldos de hoy.</span></section>' + anotar;
    }
    const usd = function (g) { return g.USD ? '<span class="meta">' + L.fmt(g.USD, 'USD') + ' incl.</span>' : ''; };
    let h = '<section class="celda"><span class="eyebrow">Resultado del mes</span>' + num(m.neto, 'PEN', 'grande') +
      '<p class="meta">Ingresos menos gastos de Arkos, en soles. Ya están sumados en tu resumen del mes.</p></section>' +
      '<section class="reticula tres">' +
      '<div class="celda"><span class="eyebrow">Ingresos</span>' + num(m.ingresos.total, 'PEN', 'medio') + usd(m.ingresos) + '</div>' +
      '<div class="celda"><span class="eyebrow">Gastos</span>' + num(m.gastos.total, 'PEN', 'medio') + usd(m.gastos) + '</div>' +
      '<div class="celda"><span class="eyebrow">Acumulado</span>' + num(m.acumulado, 'PEN', 'medio') + '<span class="meta">desde ' +
        L.nombreMes(f.meses[0].mes).nombre.slice(0, 3).toLowerCase() + ' ' + L.nombreMes(f.meses[0].mes).anio + '</span></div>' +
      '</section>';
    if (m.porCategoria.length) {
      h += '<div class="encabezado"><span class="eyebrow">Gasto por categoría</span></div><div class="lista">' + m.porCategoria.map(function (c) {
        return '<div class="fila bloque"><span class="arriba"><b>' + esc(c.nombre) + '</b><span>' +
          L.fmt(c.total, 'PEN') + ' <span class="meta">' + c.pct + '%</span></span></span>' + barraAv(c.pct, 'cuero') + '</div>';
      }).join('') + '</div>';
    }
    const dias = L.diasDelMes(estado, mes, 'todo', '', true);
    h += '<div class="encabezado"><span class="eyebrow">Movimientos del mes</span></div>';
    if (dias.length) {
      for (const d of dias) {
        h += '<div class="dia"><span class="eyebrow">' + L.etiquetaDia(d.fecha) + '</span>' +
          '<span class="meta">' + (d.neto > 0 ? '+ ' : '') + L.fmt(d.neto, 'PEN') + '</span></div>' +
          '<div class="lista">' + d.movs.map(function (x) { return filaMov(x, true); }).join('') + '</div>';
      }
    } else {
      h += '<div class="lista"><div class="fila"><span class="izq"><span class="meta libre">Nada anotado en este mes.</span></span></div></div>';
    }
    // mes a mes, lo más nuevo arriba; tocar uno lleva a ese mes
    h += '<div class="encabezado"><span class="eyebrow">Mes a mes</span><span class="eyebrow gris">Neto / acumulado</span></div><div class="lista">' +
      f.meses.slice().reverse().map(function (x) {
        const n = L.nombreMes(x.mes);
        return '<button class="fila" data-accion="ir-mes" data-mes="' + x.mes + '"' + (x.mes === mes ? ' style="background:var(--tarjeta-2)"' : '') + '>' +
          '<span class="izq"><b>' + n.nombre + ' ' + n.anio + '</b><span class="meta">+ ' + L.fmt(x.ingresos.total, 'PEN') + ' · − ' + L.fmt(x.gastos.total, 'PEN') + '</span></span>' +
          '<span class="der' + (x.neto > 0 ? ' ingreso' : x.neto < 0 ? ' negativo' : ' neutro') + '">' + (x.neto > 0 ? '+ ' : '') + L.fmt(x.neto, 'PEN') +
          '<span class="meta">' + L.fmt(x.acumulado, 'PEN') + '</span></span></button>';
      }).join('') + '</div>';
    return h + anotar;
  }

  function vAjustes() {
    const dias = diasDesdeRespaldo();
    const cats = function (tipo, titulo) {
      let s = '<div class="encabezado"><span class="eyebrow">' + titulo + '</span>' +
        '<button class="eyebrow enlace" data-accion="cat" data-tipo="' + tipo + '">Agregar</button></div><div class="lista">';
      for (const c of estado.categorias[tipo]) {
        s += '<button class="fila" data-accion="cat" data-tipo="' + tipo + '" data-id="' + esc(c.id) + '">' +
          '<span class="izq"><b>' + esc(c.nombre) + '</b></span><span class="flecha">' + ICO.der + '</span></button>';
      }
      return s + '</div>';
    };
    let ctas = '<div class="encabezado"><span class="eyebrow">Cuentas</span>' +
      '<button class="eyebrow enlace" data-accion="cuenta">Agregar</button></div><div class="lista">';
    for (const c of estado.cuentas) {
      ctas += '<button class="fila" data-accion="cuenta" data-id="' + esc(c.id) + '"><span class="izq"><b>' + esc(c.nombre) + '</b>' +
        '<span class="meta">' + (c.mon === 'USD' ? 'Dólares' : 'Soles') + ' · saldo inicial ' + L.fmt(c.inicial, c.mon) + '</span></span>' +
        '<span class="flecha">' + ICO.der + '</span></button>';
    }
    ctas += '</div>';
    ctas += '<div class="encabezado"><span class="eyebrow">Yape y Plin</span></div><div class="lista">' + estado.medios.map(function (x) {
      const c = L.cuentaDe(estado, x.cuenta);
      return '<button class="fila" data-accion="medio" data-id="' + esc(x.id) + '"><span class="izq"><b>' + esc(x.nombre) + '</b>' +
        '<span class="meta">Sale de ' + esc(c ? c.nombre : '') + '</span></span><span class="flecha">' + ICO.der + '</span></button>';
    }).join('') + '<a class="fila" href="#subs"><span class="izq"><b>Suscripciones</b><span class="meta">' + estado.subs.length +
      (estado.subs.length === 1 ? ' anotada' : ' anotadas') + '</span></span><span class="flecha">' + ICO.der + '</span></a></div>';
    return ctas + '<div class="encabezado"><span class="eyebrow">Dólares</span></div><div class="lista">' +
      '<button class="fila" data-accion="cambio"><span class="izq"><b>Tipo de cambio</b>' +
      '<span class="meta libre">Para estimar lo que anotes en dólares y para el total de las cuentas. Lo ya anotado no cambia.</span></span>' +
      '<span class="der">S/ ' + tcTexto() + '</span></button></div>' +

      '<div class="encabezado"><span class="eyebrow">Respaldo</span><span class="eyebrow gris">' +
      (dias === null ? 'Nunca' : dias === 0 ? 'Hoy' : 'Hace ' + dias + (dias === 1 ? ' día' : ' días')) + '</span></div>' +
      '<div class="celda"><p class="meta">Los datos viven solo en este celular. ' +
      'Guarda un respaldo de vez en cuando en Archivos o iCloud: si pierdes el teléfono o borras la app, es lo único que los recupera.</p>' +
      '<div class="acciones"><button class="btn prim" data-accion="respaldo">Guardar respaldo</button>' +
      '<button class="btn sec" data-accion="restaurar">Restaurar</button>' +
      '<button class="btn sec" data-accion="agregar">Agregar desde archivo</button>' +
      '<button class="btn sec" data-accion="excel">Exportar a Excel</button></div></div>' +

      cats('gasto', 'Categorías de gasto') + cats('ingreso', 'Categorías de ingreso') +
      cats('arkosGasto', 'Arkos — gastos') + cats('arkosIngreso', 'Arkos — ingresos') +

      '<div style="padding-top:20px"><button class="btn peligro" data-accion="borrar-todo">Borrar todos los datos</button>' +
      '<p class="meta" style="margin-top:18px">' + estado.movs.length + ' movimientos guardados · versión ' + L.VERSION + '</p></div>';
  }

  // ---------- hojas ----------

  // Las personas que ya conoce la libreta, más las que se agregaron o marcaron en este formulario.
  function nombresConocidos(d) {
    const mapa = {};
    const suma = function (n) { if (!mapa[L.claveDe(n)]) mapa[L.claveDe(n)] = n; };
    estado.deudas.forEach(function (x) { suma(x.persona); });
    (d.extras || []).forEach(suma);
    (d.con || []).forEach(suma);
    return Object.keys(mapa).map(function (k) { return mapa[k]; });
  }
  function compartir(d) {
    const nombres = nombresConocidos(d);
    const marcado = function (n) { return (d.con || []).some(function (x) { return L.claveDe(x) === L.claveDe(n); }); };
    let h = '<div class="campo"><span class="eyebrow">Compartido con</span>' +
      (nombres.length ? '<div class="tira">' + nombres.map(function (n) {
        return '<label class="chip"><input type="checkbox" name="con" value="' + esc(n) + '"' + (marcado(n) ? ' checked' : '') + ' data-repinta><span>' + esc(n) + '</span></label>';
      }).join('') + '</div>' : '') +
      '<input type="text" name="otra" autocomplete="off" maxlength="40" data-repinta placeholder="' + (nombres.length ? 'Otra persona…' : 'Con quién lo compartiste…') +
      '" value="" style="margin-top:' + (nombres.length ? 14 : 0) + 'px"></div>';
    const sel = nombres.filter(marcado);
    if (sel.length) {
      h += sel.map(function (n) {
        return '<label class="campo monto parte"><span class="eyebrow">Le toca a ' + esc(n) + '</span><span class="sim">' + L.SIMBOLO[d.mon] + '</span>' +
          '<input type="text" name="parte:' + esc(n) + '" inputmode="decimal" autocomplete="off" data-parte="' + esc(n) + '" value="' + esc(d['parte:' + n] || '') + '"></label>';
      }).join('') + '<p class="meta nota-hoja" id="reparto-resumen"></p>';
    }
    return h;
  }
  // Mientras se tipea, muestra cuánto le toca a cada uno (partes iguales contigo) y cuánto es lo mío.
  function actualizarReparto() {
    if (!hoja || hoja.tipo !== 'mov') return;
    const f = $('#hoja form'), resumen = $('#reparto-resumen');
    if (!f || !resumen) return;
    const fd = new FormData(f);
    const monto = L.parseMonto(fd.get('monto')), mon = fd.get('mon') || 'PEN';
    const rep = L.repartir(monto, fd.getAll('con').map(function (n) { return { persona: n, fijo: L.parseMonto(fd.get('parte:' + n)) }; }));
    f.querySelectorAll('input[data-parte]').forEach(function (i) {
      const p = rep.partes.filter(function (x) { return x.persona === i.dataset.parte; })[0];
      i.placeholder = p ? L.aTexto(p.monto) : '0.00';
    });
    resumen.textContent = !monto ? 'Pon el monto y se reparte en partes iguales contigo.' :
      rep.ok ? 'Pagas ' + L.fmt(monto, mon) + ' y tu parte es ' + L.fmt(rep.mia, mon) + '. Lo demás te lo deben.' : rep.error;
  }
  function bloqueCuenta(d) {
    const lista = [{ id: '', nombre: 'Ninguna' }].concat(estado.cuentas.filter(function (c) { return c.mon === d.mon; }));
    return '<div class="campo"><span class="eyebrow">' + (d.tipo === 'mepago' ? 'Entra a' : 'Sale de') + '</span><div class="tira">' +
      lista.map(function (c) {
        return '<label class="chip"><input type="radio" name="cuenta" value="' + esc(c.id) + '"' + ((d.cuenta || '') === c.id ? ' checked' : '') + '><span>' + esc(c.nombre) + '</span></label>';
      }).join('') + '</div><span class="meta ayuda">Si eliges una cuenta, su saldo se mueve con este pago. Con "Ninguna" solo cambia lo que te deben.</span></div>';
  }

  function topeHoja(titulo) {
    return '<div class="tope"><h2>' + titulo + '</h2><button type="button" data-accion="cerrar" aria-label="Cerrar">' + ICO.cerrar + '</button></div>';
  }
  function seg(nombre, opciones, valor, repinta) {
    return '<div class="seg">' + opciones.map(function (o) {
      return '<label><input type="radio" name="' + nombre + '" value="' + o[0] + '"' + (o[0] === valor ? ' checked' : '') +
        (repinta ? ' data-repinta' : '') + '><span>' + o[1] + '</span></label>';
    }).join('') + '</div>';
  }
  function campoMonto(d, etiqueta) {
    return '<label class="campo monto"><span class="eyebrow">' + etiqueta + '</span><span class="sim">' + L.SIMBOLO[d.mon] + '</span>' +
      '<input type="text" name="monto" inputmode="decimal" autocomplete="off" placeholder="0.00" value="' + esc(d.monto || '') + '"></label>';
  }
  function campoTexto(nombre, etiqueta, valor, extra) {
    return '<label class="campo"><span class="eyebrow">' + etiqueta + '</span><input type="text" name="' + nombre +
      '" autocomplete="off" value="' + esc(valor || '') + '" ' + (extra || '') + '></label>';
  }
  function campoFecha(nombre, etiqueta, valor) {
    return '<label class="campo"><span class="eyebrow">' + etiqueta + '</span><input type="date" name="' + nombre + '" value="' + esc(valor || '') + '"></label>';
  }
  const MONEDAS = [['PEN', 'Soles'], ['USD', 'Dólares']];

  const HOJAS = {
    mov: function () {
      const d = hoja.d;
      const transf = d.tipo === 'transferencia';
      const cta = elegida(d.cuenta).cta || estado.cuentas[0];
      const ark = !transf && d.para === 'arkos';
      const fuera = ark && d.cuenta === '';   // de Arkos y sin pasar por mis cuentas
      // Yape y Plin van primero, como botones rápidos (`m:yape`); salen de la cuenta que tengan asignada
      const chips = function (nombre, valor, excluir, conFuera, conMedios) {
        let lista = estado.cuentas.filter(function (c) { return c.id !== excluir; });
        if (conMedios) lista = estado.medios.map(function (x) { return { id: 'm:' + x.id, nombre: x.nombre, medio: true }; }).concat(lista);
        return '<div class="tira">' + (conFuera ? lista.concat({ id: '', nombre: 'Fuera de mis cuentas' }) : lista).map(function (c) {
          return '<label class="chip' + (c.medio ? ' medio' : '') + '"><input type="radio" name="' + nombre + '" value="' + esc(c.id) + '"' + (c.id === valor ? ' checked' : '') +
            ' data-repinta><span>' + esc(c.nombre) + '</span></label>';
        }).join('') + '</div>';
      };
      // campo para lo que de verdad movió la cuenta cuando la moneda no es la misma
      const real = function (nombre, etiqueta, de, a) {
        return '<label class="campo"><span class="eyebrow">' + etiqueta + ' (' + L.SIMBOLO[a] + ')</span>' +
          '<input type="text" name="' + nombre + '" inputmode="decimal" autocomplete="off" value="' + esc(d[nombre] || '') + '" ' +
          'data-estima data-de="' + de + '" data-a="' + a + '" placeholder="' + estimado(d.monto, de, a) + '">' +
          '<span class="meta ayuda">Déjalo vacío si todavía no sabes cuánto fue: se estima con el cambio de ' + String(hoja.tc) +
          '. Cuando veas el monto real, editas el movimiento y lo pones.</span></label>';
      };
      const sub = hoja.sub && subDe(hoja.sub);
      let h = topeHoja(sub ? esc(sub.nombre) + ' de ' + L.nombreMes(L.mesDe(d.fecha)).nombre.toLowerCase() : hoja.id ? 'Editar movimiento' : 'Nuevo movimiento') + '<form data-form="mov">' +
        '<div class="campo">' + seg('tipo', [['gasto', 'Gasto'], ['ingreso', 'Ingreso'], ['devolucion', 'Devolución'], ['transferencia', 'Mover']], d.tipo, true) + '</div>';
      if (transf) {
        const dest = L.cuentaDe(estado, d.destino);
        h += campoMonto({ monto: d.monto, mon: cta.mon }, 'Monto') +
          '<div class="campo"><span class="eyebrow">Sale de</span>' + chips('cuenta', cta.id) + '</div>' +
          '<div class="campo"><span class="eyebrow">Va a</span>' + chips('destino', d.destino, cta.id) + '</div>' +
          (dest && dest.mon !== cta.mon ? real('llega', 'Llega a ' + esc(dest.nombre), cta.mon, dest.mon) : '');
      } else {
        h += '<div class="campo"><span class="eyebrow">Es</span>' + seg('para', [['mio', 'Mío'], ['arkos', 'De Arkos']], ark ? 'arkos' : 'mio', true) + '</div>' +
          campoMonto(d, 'Monto') +
          '<div class="campo"><span class="eyebrow">Moneda</span>' + seg('mon', MONEDAS, d.mon, true) + '</div>' +
          '<div class="campo"><span class="eyebrow">' + (d.tipo === 'gasto' ? 'Sale de' : 'Entra a') + '</span>' + chips('cuenta', fuera ? '' : d.cuenta, null, ark, true) +
          (ark ? '<span class="meta ayuda">Cuenta en tu mes como cualquier otro y además se ve en la pantalla de Arkos. ' +
            '"Fuera de mis cuentas" es para lo de antes de usar la app: cuenta en su mes, pero no mueve tus saldos de hoy.</span>' : '') +
          (d.tipo === 'devolucion' ? '<span class="meta ayuda">Lo que te devolvieron vuelve a la cuenta y se resta de lo gastado en la categoría. No cuenta como ingreso.</span>' : '') + '</div>' +
          (!fuera && cta.mon !== d.mon ? real('cobrado', (d.tipo === 'gasto' ? 'Cobrado en ' : 'Recibido en ') + esc(cta.nombre), d.mon, cta.mon) : '') +
          '<div class="campo"><span class="eyebrow">Categoría</span><div class="tira">' + estado.categorias[L.claveCats({ tipo: d.tipo, arkos: ark })].map(function (c) {
            return '<label class="chip"><input type="radio" name="cat" value="' + esc(c.id) + '"' + (c.id === d.cat ? ' checked' : '') + '><span>' + esc(c.nombre) + '</span></label>';
          }).join('') + '</div></div>' + (d.tipo === 'gasto' && !ark ? compartir(d) : '');
      }
      return h + '<div class="dos">' + campoFecha('fecha', 'Fecha', d.fecha) + campoTexto('nota', 'Nota', d.nota, 'placeholder="Opcional" maxlength="200"') + '</div>' +
        errorHoja() + '<div class="pie-hoja"><button class="btn prim ancho">Guardar</button>' +
        (hoja.id && d.tipo === 'gasto' ? '<button type="button" class="btn sec ancho" data-accion="devolver">Me devolvieron algo de esto</button>' : '') +
        (hoja.id ? '<button type="button" class="btn peligro ancho" data-accion="borrar-mov">Eliminar</button>' : '') + '</div></form>';
    },
    sub: function () {
      const d = hoja.d, ark = d.para === 'arkos';
      const cta = elegida(d.cuenta).cta || estado.cuentas[0];
      const lista = estado.medios.map(function (x) { return { id: 'm:' + x.id, nombre: x.nombre, medio: true }; }).concat(estado.cuentas);
      return topeHoja(hoja.id ? 'Editar suscripción' : 'Nueva suscripción') + '<form data-form="sub">' +
        '<div class="campo">' + seg('tipo', [['gasto', 'Se cobra'], ['ingreso', 'Me llega']], d.tipo, true) + '</div>' +
        campoTexto('nombre', 'Nombre', d.nombre, 'placeholder="' + (d.tipo === 'ingreso' ? 'Sueldo' : 'Claude, Netflix…') + '" maxlength="30"') +
        campoMonto(d, 'Cuánto, cada mes') +
        '<div class="campo"><span class="eyebrow">Moneda</span>' + seg('mon', MONEDAS, d.mon, true) + '</div>' +
        '<label class="campo"><span class="eyebrow">Día del mes</span><input type="text" name="dia" inputmode="numeric" autocomplete="off" maxlength="2" placeholder="1 a 31" value="' + esc(d.dia) + '">' +
        '<span class="meta ayuda">Si el mes es más corto, cae el último día.</span></label>' +
        '<div class="campo"><span class="eyebrow">Es</span>' + seg('para', [['mio', 'Mío'], ['arkos', 'De Arkos']], ark ? 'arkos' : 'mio', true) + '</div>' +
        '<div class="campo"><span class="eyebrow">' + (d.tipo === 'ingreso' ? 'Entra a' : 'Sale de') + '</span><div class="tira">' + lista.map(function (c) {
          return '<label class="chip' + (c.medio ? ' medio' : '') + '"><input type="radio" name="cuenta" value="' + esc(c.id) + '"' + (c.id === d.cuenta ? ' checked' : '') + ' data-repinta><span>' + esc(c.nombre) + '</span></label>';
        }).join('') + '</div>' + (cta.mon !== d.mon ? '<span class="meta ayuda">Se anota con el cambio del día y queda por confirmar: cuando veas lo que cobró el banco, editas el movimiento.</span>' : '') + '</div>' +
        '<div class="campo"><span class="eyebrow">Categoría</span><div class="tira">' + estado.categorias[L.claveCats({ tipo: d.tipo, arkos: ark })].map(function (c) {
          return '<label class="chip"><input type="radio" name="cat" value="' + esc(c.id) + '"' + (c.id === d.cat ? ' checked' : '') + '><span>' + esc(c.nombre) + '</span></label>';
        }).join('') + '</div></div>' +
        (hoja.id ? '<div class="campo"><span class="eyebrow">Estado</span>' + seg('pausada', [['no', 'Activa'], ['si', 'Pausada']], d.pausada, false) + '</div>' : '') +
        errorHoja() + '<div class="pie-hoja"><button class="btn prim ancho">Guardar</button>' +
        (hoja.id ? '<button type="button" class="btn peligro ancho" data-accion="borrar-sub">Eliminar</button>' : '') + '</div></form>';
    },
    medio: function () {
      const x = L.medioDe(estado, hoja.id);
      return topeHoja(esc(x.nombre)) + '<form data-form="medio"><div class="campo"><span class="eyebrow">Sale de</span><div class="tira">' +
        estado.cuentas.filter(function (c) { return c.mon === 'PEN'; }).map(function (c) {
          return '<label class="chip"><input type="radio" name="cuenta" value="' + esc(c.id) + '"' + (c.id === x.cuenta ? ' checked' : '') + '><span>' + esc(c.nombre) + '</span></label>';
        }).join('') + '</div><span class="meta ayuda">Lo que anotes con ' + esc(x.nombre) + ' sale de esta cuenta. Lo ya anotado no cambia.</span></div>' +
        errorHoja() + '<div class="pie-hoja"><button class="btn prim ancho">Guardar</button></div></form>';
    },
    cuenta: function () {
      const usos = hoja.id ? L.usosCuenta(estado, hoja.id) : 0;
      const d = hoja.d;
      return topeHoja(hoja.id ? 'Editar cuenta' : 'Nueva cuenta') + '<form data-form="cuenta">' +
        campoTexto('nombre', 'Nombre', d.nombre, 'placeholder="BCP, Interbank, Yape…" maxlength="40"') +
        (usos ? '<input type="hidden" name="mon" value="' + d.mon + '">' :
          '<div class="campo"><span class="eyebrow">Moneda</span>' + seg('mon', MONEDAS, d.mon, true) + '</div>') +
        campoMonto(d, 'Saldo inicial') +
        '<p class="meta nota-hoja">Lo que tenías en la cuenta antes de empezar a anotar. Si lo dejas vacío, arranca en cero.' +
        (usos ? ' Ya tiene ' + usos + (usos === 1 ? ' movimiento' : ' movimientos') + ': se puede renombrar, pero no borrar ni cambiarle la moneda.' : '') + '</p>' +
        errorHoja() + '<div class="pie-hoja"><button class="btn prim ancho">Guardar</button>' +
        (hoja.id && !usos && estado.cuentas.length > 1 ? '<button type="button" class="btn peligro ancho" data-accion="borrar-cuenta">Eliminar</button>' : '') + '</div></form>';
    },
    tope: function () {
      const nombre = L.nombreCat(estado, 'gasto', hoja.id);
      return topeHoja('Tope de ' + esc(nombre)) + '<form data-form="tope">' +
        campoMonto(hoja.d, 'Máximo al mes') +
        '<p class="meta nota-hoja">En soles. Lo que gastes en dólares en esta categoría entra convertido.</p>' +
        errorHoja() + '<div class="pie-hoja"><button class="btn prim ancho">Guardar</button>' +
        (estado.topes[hoja.id] ? '<button type="button" class="btn sec ancho" data-accion="quitar-tope">Quitar el tope</button>' : '') + '</div></form>';
    },
    meta: function () {
      const d = hoja.d;
      return topeHoja(hoja.id ? 'Editar meta' : 'Nueva meta') + '<form data-form="meta">' +
        campoTexto('nombre', 'Nombre', d.nombre, 'placeholder="Fondo de emergencia, viaje…" maxlength="60"') +
        campoMonto(d, 'Cuánto necesitas') +
        '<div class="campo"><span class="eyebrow">Moneda</span>' + seg('mon', MONEDAS, d.mon, true) + '</div>' +
        campoFecha('fecha', 'Fecha límite (opcional)', d.fecha) +
        errorHoja() + '<div class="pie-hoja"><button class="btn prim ancho">Guardar</button>' +
        (hoja.id ? '<button type="button" class="btn peligro ancho" data-accion="borrar-meta">Eliminar la meta</button>' : '') + '</div></form>';
    },
    aporte: function () {
      const g = meta(hoja.id);
      return topeHoja((hoja.signo < 0 ? 'Retirar de ' : 'Aportar a ') + esc(g.nombre)) + '<form data-form="aporte">' +
        campoMonto(hoja.d, hoja.signo < 0 ? 'Cuánto sacas' : 'Cuánto guardas') +
        '<div class="dos">' + campoFecha('fecha', 'Fecha', hoja.d.fecha) + campoTexto('nota', 'Nota', hoja.d.nota, 'placeholder="Opcional" maxlength="200"') + '</div>' +
        '<p class="meta nota-hoja">Llevas ' + L.fmt(L.progresoMeta(g, L.hoyISO()).acumulado, g.mon) + ' de ' + L.fmt(g.objetivo, g.mon) + '.</p>' +
        errorHoja() + '<div class="pie-hoja"><button class="btn prim ancho">Guardar</button></div></form>';
    },
    detalle: function () {
      const g = meta(hoja.id);
      const aportes = g.aportes.slice().sort(function (a, b) { return a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0; });
      let h = topeHoja(esc(g.nombre)) + '<div class="cuerpo"><div class="encabezado"><span class="eyebrow">Aportes y retiros</span>' +
        '<span class="eyebrow gris">Toca para borrar</span></div>';
      if (aportes.length) {
        h += '<div class="lista">' + aportes.map(function (a) {
          return '<button class="fila" data-accion="borrar-aporte" data-id="' + esc(a.id) + '"><span class="izq"><b>' +
            (a.monto < 0 ? 'Retiro' : 'Aporte') + '</b><span class="meta">' + L.fechaCorta(a.fecha) + (a.nota ? ' · ' + esc(a.nota) : '') + '</span></span>' +
            '<span class="der' + (a.monto < 0 ? '' : ' ingreso') + '">' + (a.monto < 0 ? '' : '+ ') + L.fmt(a.monto, g.mon) + '</span></button>';
        }).join('') + '</div>';
      } else {
        h += '<p class="meta" >Todavía no hay aportes.</p>';
      }
      return h + '<div class="pie-hoja"><button class="btn sec ancho" data-accion="editar-meta" data-id="' + esc(g.id) + '">Editar la meta</button></div></div>';
    },
    deuda: function () {
      const d = hoja.d;
      const nombres = {};
      estado.deudas.forEach(function (x) { nombres[L.claveDe(x.persona)] = x.persona; });
      return topeHoja(hoja.id ? 'Editar apunte' : 'Nuevo apunte') + '<form data-form="deuda">' +
        '<div class="campo">' + seg('tipo', [['medebe', 'Me debe'], ['ledebo', 'Le debo'], ['mepago', 'Me pagó'], ['lepague', 'Le pagué']], d.tipo, true) + '</div>' +
        '<label class="campo"><span class="eyebrow">Persona</span><input type="text" name="persona" list="personas" autocomplete="off" ' +
        'maxlength="40" placeholder="Andrea" value="' + esc(d.persona) + '"><datalist id="personas">' +
        Object.keys(nombres).map(function (k) { return '<option value="' + esc(nombres[k]) + '">'; }).join('') + '</datalist></label>' +
        campoMonto(d, 'Cuánto') +
        '<div class="campo"><span class="eyebrow">Moneda</span>' + seg('mon', MONEDAS, d.mon, true) + '</div>' +
        campoTexto('nota', 'De qué', d.nota, 'placeholder="Taxi al aeropuerto" maxlength="200"') +
        campoFecha('fecha', 'Fecha', d.fecha) +
        (d.tipo === 'mepago' || d.tipo === 'lepague' ? bloqueCuenta(d) : '') +
        '<p class="meta nota-hoja">Un apunte nunca cuenta como ingreso ni gasto.' +
        (hoja.mov ? ' Este viene de un gasto compartido: si editas ese gasto, el apunte se rehace.' : '') + '</p>' +
        errorHoja() + '<div class="pie-hoja"><button class="btn prim ancho">Guardar</button>' +
        (hoja.id ? '<button type="button" class="btn peligro ancho" data-accion="borrar-deuda">Eliminar</button>' : '') + '</div></form>';
    },
    'editar-persona': function () {
      const f = persona(hoja.id);
      const u = L.usoPersona(estado, f.clave);
      return topeHoja('Editar persona') + '<form data-form="persona-nombre">' +
        campoTexto('nombre', 'Nombre', hoja.d.nombre, 'maxlength="40"') +
        '<p class="meta nota-hoja">Tiene ' + u.apuntes + (u.apuntes === 1 ? ' apunte' : ' apuntes') + (u.gastos ? ' y está en ' + u.gastos + (u.gastos === 1 ? ' gasto compartido' : ' gastos compartidos') : '') +
        '. Al cambiar el nombre se cambia en todos. Si le pones el nombre de otra persona, las dos se juntan en una.</p>' +
        errorHoja() + '<div class="pie-hoja"><button class="btn prim ancho">Guardar</button>' +
        '<button type="button" class="btn peligro ancho" data-accion="borrar-persona">Eliminar a ' + esc(f.nombre) + '</button></div></form>';
    },
    persona: function () {
      const f = persona(hoja.id);
      const meDebe = f.saldo.PEN > 0 || f.saldo.USD > 0, leDebo = f.saldo.PEN < 0 || f.saldo.USD < 0;
      const titulo = !f.pendiente ? 'Saldado' : meDebe && !leDebo ? 'Te debe' : leDebo && !meDebe ? 'Le debes' : 'Saldo';
      let h = topeHoja(esc(f.nombre)) + '<div class="cuerpo"><section class="celda"><span class="eyebrow">' + titulo + '</span>' +
        '<div class="saldo-persona">' + (f.pendiente ? saldoPersona(f) : '<span class="meta">No queda nada pendiente.</span>') + '</div>' +
        '<div class="acciones">' + (f.pendiente ? '<button class="btn prim" data-accion="saldar" data-id="' + esc(f.clave) + '">Saldar</button>' : '') +
        '<button class="btn sec" data-accion="nueva-deuda" data-persona="' + esc(f.nombre) + '">Anotar</button>' +
        '<button class="btn sec" data-accion="editar-persona" data-id="' + esc(f.clave) + '">Editar</button></div></section>' +
        (f.pendiente ? '<div class="encabezado"><span class="eyebrow">Lo que falta</span></div><div class="lista">' + L.abiertos(f).map(function (x) {
          const a = x.apunte, parcial = Math.abs(x.resto) !== Math.abs(a.monto);
          return '<div class="fila"><span class="izq"><b>' + (a.nota ? esc(a.nota) : 'Sin detalle') + '</b><span class="meta">' +
            L.fechaCorta(a.fecha) + (parcial ? ' · de ' + L.fmt(Math.abs(a.monto), a.mon) + ', ya pagó una parte' : '') + '</span></span>' +
            '<span class="der ' + (x.resto > 0 ? 'por-cobrar' : 'negativo') + '">' + (x.resto > 0 ? '+ ' : '') + L.fmt(x.resto, x.mon) + '</span></div>';
        }).join('') + '</div>' : '') +
        '<div class="encabezado"><span class="eyebrow">Historial</span><span class="eyebrow gris">Toca para editar</span></div><div class="lista">';
      h += f.apuntes.map(function (a) {
        return '<button class="fila" data-accion="editar-deuda" data-id="' + esc(a.id) + '"><span class="izq"><b>' + L.ROTULO_DEUDA[L.tipoDeuda(a)] +
          '</b><span class="meta">' + L.fechaCorta(a.fecha) + (a.nota ? ' · ' + esc(a.nota) : '') +
          (a.cuenta && L.cuentaDe(estado, a.cuenta) ? ' · ' + (a.monto < 0 ? 'entró a ' : 'salió de ') + esc(L.cuentaDe(estado, a.cuenta).nombre) : '') + '</span></span>' +
          '<span class="der' + (a.pago ? ' neutro' : a.monto > 0 ? ' por-cobrar' : ' negativo') + '">' + (a.monto > 0 ? '+ ' : '') + L.fmt(a.monto, a.mon) + '</span></button>';
      }).join('');
      return h + '</div></div>';
    },
    cat: function () {
      const usos = hoja.id ? L.usosCat(estado, hoja.id) : 0;
      const unica = estado.categorias[hoja.tipoCat].length <= 1;
      let pie = '';
      if (hoja.id && usos) pie = '<p class="meta nota-hoja">Tiene ' + usos + (usos === 1 ? ' movimiento' : ' movimientos') + '. Se puede renombrar, pero no borrar.</p>';
      const de = { gasto: 'gasto', ingreso: 'ingreso', arkosGasto: 'gasto de Arkos', arkosIngreso: 'ingreso de Arkos' }[hoja.tipoCat];
      return topeHoja(hoja.id ? 'Editar categoría' : 'Nueva categoría de ' + de) + '<form data-form="cat">' +
        campoTexto('nombre', 'Nombre', hoja.d.nombre, 'maxlength="40"') + pie + errorHoja() +
        '<div class="pie-hoja"><button class="btn prim ancho">Guardar</button>' +
        (hoja.id && !usos && !unica ? '<button type="button" class="btn peligro ancho" data-accion="borrar-cat">Eliminar</button>' : '') + '</div></form>';
    },
    cambio: function () {
      return topeHoja('Tipo de cambio') + '<form data-form="cambio">' +
        '<label class="campo monto"><span class="eyebrow">Soles por dólar</span><span class="sim">S/</span>' +
        '<input type="text" name="tc" inputmode="decimal" autocomplete="off" value="' + esc(hoja.d.tc) + '"></label>' +
        '<p class="meta nota-hoja">Se usa para lo nuevo que anotes en dólares. Cada movimiento guarda el cambio del día en que lo anotaste, así los meses pasados no se mueven.</p>' +
        errorHoja() + '<div class="pie-hoja"><button class="btn prim ancho">Guardar</button></div></form>';
    }
  };

  function estimado(texto, de, a) {
    const c = L.parseMonto(texto);
    return c ? '≈ ' + L.aTexto(L.convertir(c, de, a, hoja.tc)) : 'Opcional';
  }
  function errorHoja() { return hoja.error ? '<p class="error">' + esc(hoja.error) + '</p>' : ''; }
  function persona(clave) { return L.deudasPorPersona(estado).filter(function (f) { return f.clave === clave; })[0]; }
  function meta(id) { return estado.metas.filter(function (g) { return g.id === id; })[0]; }
  function subDe(id) { return estado.subs.filter(function (x) { return x.id === id; })[0]; }
  // Lo elegido en "Sale de": una cuenta, o Yape/Plin (`m:yape`) que sale de su cuenta.
  function elegida(v) {
    const md = String(v || '').indexOf('m:') === 0 ? L.medioDe(estado, v.slice(2)) : null;
    return { cta: md ? L.cuentaDe(estado, md.cuenta) : L.cuentaDe(estado, v), medio: md ? md.id : '' };
  }

  function abrir(h, enfocar) {
    hoja = h;
    pintarHoja();
    $('#hoja').scrollTop = 0;
    if (enfocar) { const i = $('#hoja input[name="' + enfocar + '"]'); if (i) i.focus(); }
  }
  function cerrar() { hoja = null; pintarHoja(); }
  function leerBorrador() {
    const f = $('#hoja form');
    if (!f || !hoja.d) return;
    const fd = new FormData(f);
    fd.forEach(function (v, k) { hoja.d[k] = v; });
    if (hoja.tipo === 'mov' && hoja.d.tipo === 'gasto') hoja.d.con = fd.getAll('con');
  }
  function fallo(texto) { leerBorrador(); hoja.error = texto; pintarHoja(); }

  function pintarHoja() {
    const el = $('#hoja');
    document.body.classList.toggle('con-hoja', !!hoja);
    el.hidden = !hoja;
    el.innerHTML = hoja ? HOJAS[hoja.tipo]() : '';
    actualizarReparto();
  }

  // ---------- pintar ----------

  function pintar() {
    const v = vistaActual();
    pintarCabecera(v);
    pintarBarra(v);
    $('#vista').innerHTML = { resumen: vResumen, movimientos: vMovimientos, presupuesto: vPresupuesto, metas: vMetas, deudas: vDeudas, arkos: vArkos,
      ajustes: vAjustes, subs: vSubs, buscar: vBuscar }[v]();
  }

  let relojAviso = 0;
  function aviso(texto, esFallo) {
    const el = $('#aviso');
    el.textContent = texto;
    el.className = esFallo ? 'fallo' : '';
    el.hidden = false;
    clearTimeout(relojAviso);
    relojAviso = setTimeout(function () { el.hidden = true; }, esFallo ? 9000 : 2200);
  }

  // ---------- archivos ----------

  async function entregar(nombre, texto, tipo) {
    const archivo = new File([texto], nombre, { type: tipo });
    if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
      try { await navigator.share({ files: [archivo] }); return true; }
      catch (e) { if (e && e.name === 'AbortError') return false; /* si falla, se descarga */ }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(archivo);
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
    return true;
  }

  /* "Agregar desde archivo": suma los movimientos de un historial sin borrar nada.
     Lo usa el mismo selector de archivos que Restaurar; `paraAgregar` dice cuál fue. */
  let paraAgregar = false;
  function agregarArchivo(archivo) {
    const lector = new FileReader();
    lector.onerror = function () { aviso('No se pudo leer el archivo.', true); };
    lector.onload = function () {
      let r;
      try { r = L.agregar(estado, JSON.parse(lector.result)); }
      catch (e) { r = { ok: false, error: 'Ese archivo no trae movimientos.' }; }
      if (!r.ok) return aviso(r.error, true);
      if (!r.n) return aviso(r.repetidos ? 'Esos ' + r.repetidos + ' movimientos ya estaban.' : 'El archivo no trae movimientos.', true);
      if (!confirm('Se agregan ' + r.n + (r.n === 1 ? ' movimiento' : ' movimientos') +
        (r.repetidos ? ' (' + r.repetidos + ' ya estaban y se saltan)' : '') + '.\n\nNo se borra ni se cambia nada de lo que ya tienes. ¿Agregar?')) return;
      estado = r.estado;
      guardar();
      pintar();
      aviso(r.n + ' movimientos agregados');
    };
    lector.readAsText(archivo);
  }

  function restaurar(archivo) {
    const lector = new FileReader();
    lector.onerror = function () { aviso('No se pudo leer el archivo.', true); };
    lector.onload = function () {
      let r, o = null;
      try { o = JSON.parse(lector.result); r = L.validar(o); }
      catch (e) { r = { ok: false, error: 'Ese archivo no es un respaldo de esta app.' }; }
      // un historial para agregar no es un respaldo: restaurarlo borraría todo lo demás
      if (o && o.agregar === true) r = { ok: false, error: 'Ese archivo es para "Agregar desde archivo", no para Restaurar.' };
      if (!r.ok) return aviso(r.error, true);
      const n = r.estado;
      if (!confirm('El respaldo trae ' + n.movs.length + ' movimientos y ' + n.metas.length + ' metas.\n\n' +
        'Reemplaza todo lo que hay ahora en la app (' + estado.movs.length + ' movimientos). ¿Continuar?')) return;
      estado = n;
      guardar();
      pintar();
      aviso('Respaldo restaurado');
    };
    lector.readAsText(archivo);
  }

  // ---------- acciones ----------

  const acciones = {
    mes: function (d) { mes = L.moverMes(mes, Number(d.d)); pintar(); window.scrollTo(0, 0); },
    filtro: function (d) { filtro = d.f; pintar(); },
    cerrar: cerrar,

    'filtro-cuenta': function (d) { filtroCuenta = d.id || ''; pintar(); },
    'ver-cuenta': function (d) { filtroCuenta = d.id; filtro = 'todo'; location.hash = 'movimientos'; },

    'nuevo-mov': function (dd) {
      // arranca en la última cuenta usada; si se mira otro mes, la fecha cae en ese mes.
      // Desde la pantalla de Arkos arranca como de Arkos.
      const hoy = L.hoyISO();
      const ark = !!(dd && dd.arkos) || vistaActual() === 'arkos';
      let ultimo = null;
      for (const m of estado.movs) if (m.tipo !== 'transferencia' && m.cuenta && (!ultimo || (m.creado || 0) > (ultimo.creado || 0))) ultimo = m;
      const ini = ultimo && ultimo.medio && L.medioDe(estado, ultimo.medio) ? 'm:' + ultimo.medio :
        ultimo && L.cuentaDe(estado, ultimo.cuenta) ? ultimo.cuenta : estado.cuentas[0].id;
      const cta = elegida(ini).cta || estado.cuentas[0];
      const otra = estado.cuentas.filter(function (c) { return c.id !== cta.id; })[0];
      abrir({
        tipo: 'mov', id: null, tc: estado.tc,
        d: { tipo: 'gasto', para: ark ? 'arkos' : 'mio', monto: '', mon: cta.mon, cuenta: ini, destino: otra ? otra.id : '', cobrado: '', llega: '',
          cat: estado.categorias[ark ? 'arkosGasto' : 'gasto'][0].id, fecha: L.mesDe(hoy) === mes ? hoy : mes + '-01', nota: '', con: [], extras: [], otra: '' }
      }, 'monto');
    },
    'ir-mes': function (d) { mes = d.mes; pintar(); window.scrollTo(0, 0); },
    'editar-mov': function (d) {
      const m = estado.movs.filter(function (x) { return x.id === d.id; })[0];
      if (!m) return;
      const transf = m.tipo === 'transferencia';
      const otra = estado.cuentas.filter(function (c) { return c.id !== m.cuenta; })[0];
      abrir({
        tipo: 'mov', id: m.id, tc: m.tc || estado.tc,
        d: { tipo: m.tipo, para: m.arkos ? 'arkos' : 'mio', monto: L.aTexto(m.monto), mon: m.mon,
          cuenta: m.medio && L.medioDe(estado, m.medio) ? 'm:' + m.medio : m.cuenta, destino: m.destino || (otra ? otra.id : ''),
          cobrado: m.monCuenta && !m.estimado ? L.aTexto(m.cobrado) : '',
          llega: transf && !m.estimado && m.llega !== m.monto ? L.aTexto(m.llega) : '',
          cat: transf ? estado.categorias.gasto[0].id : m.cat, fecha: m.fecha, nota: m.nota || '', con: [], extras: [], otra: '' }
      });
      if (m.partes && m.partes.length) {
        // las partes se dejan en blanco (iguales) salvo que alguna sea distinta de lo que saldría repartiendo parejo
        const dd = hoja.d;
        dd.con = m.partes.map(function (p) { return p.persona; });
        const parejo = L.repartir(m.monto, dd.con.map(function (n) { return { persona: n, fijo: null }; }));
        if (!parejo.ok || parejo.partes.some(function (p, i) { return p.monto !== m.partes[i].monto; })) {
          m.partes.forEach(function (p) { dd['parte:' + p.persona] = L.aTexto(p.monto); });
        }
        pintarHoja();
      }
    },
    // desde un gasto ya anotado: lo que te devolvieron, con la misma cuenta y categoría
    devolver: function () {
      const d = hoja.d;
      abrir({ tipo: 'mov', id: null, tc: estado.tc,
        d: { tipo: 'devolucion', para: d.para, monto: '', mon: d.mon, cuenta: d.cuenta, destino: d.destino, cobrado: '', llega: '',
          cat: d.cat, fecha: L.hoyISO(), nota: d.nota, con: [], extras: [], otra: '' } }, 'monto');
    },
    ocultar: function () {
      ocultar = !ocultar;
      try { localStorage.setItem(CLAVE_OCULTAR, ocultar ? '1' : '0'); } catch (e) { /* sin almacenamiento */ }
      pintar();
    },

    'sub-confirmar': function (d) {
      const x = subDe(d.id);
      if (!x) return;
      estado.movs.push(L.movDeSub(estado, x, d.fecha));
      guardar(); pintar(); aviso(x.nombre + ' anotado');
    },
    'sub-otro': function (d) {
      const x = subDe(d.id);
      if (!x) return;
      abrir({ tipo: 'mov', id: null, tc: estado.tc, sub: x.id,
        d: { tipo: x.tipo, para: x.arkos ? 'arkos' : 'mio', monto: L.aTexto(x.monto), mon: x.mon, cuenta: x.medio ? 'm:' + x.medio : x.cuenta,
          destino: '', cobrado: '', llega: '', cat: x.cat, fecha: d.fecha, nota: x.nombre, con: [], extras: [], otra: '' } }, 'monto');
    },
    'sub-saltar': function (d) {
      estado.saltadas.push(d.id + '@' + L.mesDe(L.hoyISO()));
      guardar(); pintar(); aviso('Saltada este mes');
    },
    sub: function (d) {
      const x = d.id ? subDe(d.id) : null;
      const susc = estado.categorias.gasto.filter(function (c) { return /suscrip/i.test(c.nombre); })[0] || estado.categorias.gasto[0];
      abrir({ tipo: 'sub', id: x ? x.id : null, d: x ?
        { tipo: x.tipo, nombre: x.nombre, monto: L.aTexto(x.monto), mon: x.mon, dia: String(x.dia), para: x.arkos ? 'arkos' : 'mio',
          cuenta: x.medio ? 'm:' + x.medio : x.cuenta, cat: x.cat, pausada: x.pausada ? 'si' : 'no' } :
        { tipo: 'gasto', nombre: '', monto: '', mon: 'PEN', dia: '', para: 'mio', cuenta: estado.cuentas[0].id, cat: susc.id, pausada: 'no' } }, x ? null : 'nombre');
    },
    'borrar-sub': function () {
      const x = subDe(hoja.id);
      if (!confirm('¿Eliminar ' + x.nombre + '? Lo que ya anotaste de ella se queda.')) return;
      estado.subs = estado.subs.filter(function (y) { return y.id !== x.id; });
      estado.saltadas = estado.saltadas.filter(function (k) { return k.indexOf(x.id + '@') !== 0; });
      guardar(); cerrar(); pintar(); aviso('Suscripción eliminada');
    },
    medio: function (d) { abrir({ tipo: 'medio', id: d.id, d: {} }); },

    'borrar-mov': function () {
      const m = estado.movs.filter(function (x) { return x.id === hoja.id; })[0];
      const comp = m && m.partes && m.partes.length;
      if (!confirm(comp ? '¿Eliminar este movimiento? También se quita lo que anotaste por cobrar de él.' : '¿Eliminar este movimiento?')) return;
      estado.movs = estado.movs.filter(function (x) { return x.id !== hoja.id; });
      estado.deudas = estado.deudas.filter(function (x) { return x.mov !== hoja.id; });
      guardar(); cerrar(); pintar(); aviso('Movimiento eliminado');
    },

    tope: function (d) {
      const t = estado.topes[d.id];
      abrir({ tipo: 'tope', id: d.id, d: { monto: t ? L.aTexto(t) : '', mon: 'PEN' } }, 'monto');
    },
    'quitar-tope': function () { delete estado.topes[hoja.id]; guardar(); cerrar(); pintar(); },

    'nueva-meta': function () {
      abrir({ tipo: 'meta', id: null, d: { nombre: '', monto: '', mon: 'PEN', fecha: '' } }, 'nombre');
    },
    'editar-meta': function (d) {
      const g = meta(d.id);
      abrir({ tipo: 'meta', id: g.id, d: { nombre: g.nombre, monto: L.aTexto(g.objetivo), mon: g.mon, fecha: g.fecha || '' } });
    },
    'borrar-meta': function () {
      const g = meta(hoja.id);
      if (!confirm('¿Eliminar la meta "' + g.nombre + '" con sus ' + g.aportes.length + ' aportes?')) return;
      estado.metas = estado.metas.filter(function (x) { return x.id !== g.id; });
      guardar(); cerrar(); pintar();
    },
    aporte: function (d) {
      abrir({ tipo: 'aporte', id: d.id, signo: Number(d.signo), d: { monto: '', mon: meta(d.id).mon, fecha: L.hoyISO(), nota: '' } }, 'monto');
    },
    'detalle-meta': function (d) { abrir({ tipo: 'detalle', id: d.id }); },
    'borrar-aporte': function (d) {
      const g = meta(hoja.id);
      const a = g.aportes.filter(function (x) { return x.id === d.id; })[0];
      if (!a || !confirm('¿Borrar este ' + (a.monto < 0 ? 'retiro' : 'aporte') + ' de ' + L.fmt(Math.abs(a.monto), g.mon) + '?')) return;
      g.aportes = g.aportes.filter(function (x) { return x.id !== a.id; });
      guardar(); pintarHoja(); pintar();
    },

    'nueva-deuda': function (d) {
      abrir({ tipo: 'deuda', id: null, d: { tipo: 'medebe', persona: d.persona || '', monto: '', mon: 'PEN', nota: '', fecha: L.hoyISO(), cuenta: '' } },
        d.persona ? 'monto' : 'persona');
    },
    'editar-deuda': function (d) {
      const a = estado.deudas.filter(function (x) { return x.id === d.id; })[0];
      if (!a) return;
      abrir({ tipo: 'deuda', id: a.id, mov: a.mov || '', d: { tipo: L.tipoDeuda(a), persona: a.persona, monto: L.aTexto(a.monto), mon: a.mon, nota: a.nota || '', fecha: a.fecha, cuenta: a.cuenta || '' } });
    },
    saldar: function (d) {
      // lo que falta, en la moneda de mayor saldo, como pago en sentido contrario
      const f = persona(d.id);
      const mon = Math.abs(f.saldo.PEN) >= Math.abs(f.saldo.USD) * estado.tc ? 'PEN' : 'USD';
      // si lo que falta viene de un gasto compartido, propone la misma cuenta con la que se pagó
      let cuenta = '';
      if (f.saldo[mon] > 0) {
        const vinc = L.abiertos(f).filter(function (x) { return x.mon === mon && x.apunte.mov; })[0];
        const gasto = vinc && estado.movs.filter(function (m) { return m.id === vinc.apunte.mov; })[0];
        const c = gasto && L.cuentaDe(estado, gasto.cuenta);
        if (c && c.mon === mon) cuenta = c.id;
      }
      abrir({ tipo: 'deuda', id: null, d: { tipo: f.saldo[mon] > 0 ? 'mepago' : 'lepague', persona: f.nombre,
        monto: L.aTexto(f.saldo[mon]), mon: mon, nota: '', fecha: L.hoyISO(), cuenta: cuenta } }, 'monto');
    },
    'borrar-deuda': function () {
      if (!confirm('¿Eliminar este apunte?')) return;
      estado.deudas = estado.deudas.filter(function (x) { return x.id !== hoja.id; });
      guardar(); cerrar(); pintar(); aviso('Apunte eliminado');
    },
    persona: function (d) { abrir({ tipo: 'persona', id: d.id }); },
    'editar-persona': function (d) { abrir({ tipo: 'editar-persona', id: d.id, d: { nombre: persona(d.id).nombre } }); },
    'borrar-persona': function () {
      const f = persona(hoja.id), u = L.usoPersona(estado, f.clave);
      const texto = 'Se borra a ' + f.nombre + ' con sus ' + u.apuntes + (u.apuntes === 1 ? ' apunte' : ' apuntes') + '.' +
        (f.pendiente ? '\n\nTodavía queda saldo pendiente: ' + L.textoSaldo({ PEN: Math.abs(f.saldo.PEN), USD: Math.abs(f.saldo.USD) }) + '.' : '') +
        (u.gastos ? '\n\n' + (u.gastos === 1 ? 'Un gasto compartido con esta persona pasa' : u.gastos + ' gastos compartidos con esta persona pasan') + ' a contar completos como tuyos.' : '') +
        (u.enCuentas ? '\n\nSus pagos que entraron a una cuenta se quitan y ese saldo vuelve a bajar.' : '') +
        '\n\nNo se puede deshacer. ¿Borrar?';
      if (!confirm(texto)) return;
      L.eliminarPersona(estado, f.clave);
      guardar(); cerrar(); pintar(); aviso('Persona eliminada');
    },

    cat: function (d) {
      const c = d.id ? estado.categorias[d.tipo].filter(function (x) { return x.id === d.id; })[0] : null;
      abrir({ tipo: 'cat', tipoCat: d.tipo, id: c ? c.id : null, d: { nombre: c ? c.nombre : '' } }, c ? null : 'nombre');
    },
    'borrar-cat': function () {
      const lista = estado.categorias[hoja.tipoCat];
      estado.categorias[hoja.tipoCat] = lista.filter(function (x) { return x.id !== hoja.id; });
      delete estado.topes[hoja.id];
      guardar(); cerrar(); pintar();
    },
    cambio: function () { abrir({ tipo: 'cambio', d: { tc: String(estado.tc) } }, 'tc'); },
    cuenta: function (d) {
      const c = d.id ? L.cuentaDe(estado, d.id) : null;
      abrir({ tipo: 'cuenta', id: c ? c.id : null,
        d: { nombre: c ? c.nombre : '', mon: c ? c.mon : 'PEN', monto: c && c.inicial ? L.aTexto(c.inicial) : '' } }, c ? null : 'nombre');
    },
    'borrar-cuenta': function () {
      estado.cuentas = estado.cuentas.filter(function (c) { return c.id !== hoja.id; });
      // Yape o Plin que salían de esa cuenta pasan a la primera en soles
      const otra = estado.cuentas.filter(function (c) { return c.mon === 'PEN'; })[0] || estado.cuentas[0];
      estado.medios.forEach(function (x) { if (x.cuenta === hoja.id) x.cuenta = otra.id; });
      if (filtroCuenta === hoja.id) filtroCuenta = '';
      guardar(); cerrar(); pintar();
    },

    respaldo: async function () {
      const ok = await entregar('oink-respaldo-' + L.hoyISO() + '.json', JSON.stringify(estado, null, 1), 'application/json');
      if (!ok) return;
      estado.ultimoRespaldo = new Date().toISOString();
      guardar(); pintar();
    },
    excel: function () { entregar('oink-' + L.hoyISO() + '.csv', L.aCSV(estado), 'text/csv'); },
    restaurar: function () { paraAgregar = false; const i = $('#archivo'); i.value = ''; i.click(); },
    agregar: function () { paraAgregar = true; const i = $('#archivo'); i.value = ''; i.click(); },
    'borrar-todo': function () {
      if (!confirm('Se borran los ' + estado.movs.length + ' movimientos, los topes y las metas de este celular. No se puede deshacer.\n\n¿Borrar todo?')) return;
      estado = L.estadoInicial();
      guardar(); pintar(); aviso('Datos borrados');
    }
  };

  // ---------- envíos de formularios ----------

  const envios = {
    mov: function (fd) {
      const monto = L.parseMonto(fd.get('monto'));
      if (!monto) return fallo('Pon un monto mayor que cero.');
      const tipo = fd.get('tipo'), fecha = fd.get('fecha');
      if (!fecha) return fallo('Falta la fecha.');
      const ark = tipo !== 'transferencia' && fd.get('para') === 'arkos';
      const fuera = ark && fd.get('cuenta') === '';
      const sel = elegida(fd.get('cuenta')), cta = sel.cta;
      if (!cta && !fuera) return fallo('Elige una cuenta.');
      const viejo = hoja.id ? estado.movs.filter(function (x) { return x.id === hoja.id; })[0] : null;
      const m = { tipo: tipo, monto: monto, mon: tipo === 'transferencia' ? cta.mon : fd.get('mon'), tc: hoja.tc,
        cuenta: fuera ? '' : cta.id, cat: '', nota: String(fd.get('nota') || '').trim(), fecha: fecha };
      if (ark) m.arkos = true;
      if (tipo !== 'transferencia' && sel.medio) m.medio = sel.medio;
      const sub = hoja.sub || (viejo && viejo.sub);
      if (tipo !== 'transferencia' && sub) m.sub = sub;
      if (tipo === 'transferencia') {
        const dest = L.cuentaDe(estado, fd.get('destino'));
        if (!dest || dest.id === cta.id) return fallo('Elige a qué cuenta va. Tiene que ser distinta de la que sale.');
        m.destino = dest.id;
        const llega = dest.mon === cta.mon ? monto : L.parseMonto(fd.get('llega'));
        if (llega) m.llega = llega;
        else { m.llega = L.convertir(monto, cta.mon, dest.mon, m.tc); m.estimado = true; }
      } else {
        if (!fd.get('cat')) return fallo('Elige una categoría.');
        m.cat = fd.get('cat');
        const con = tipo === 'gasto' && !ark ? fd.getAll('con') : [];
        if (con.length) {
          const rep = L.repartir(monto, con.map(function (n) { return { persona: n, fijo: L.parseMonto(fd.get('parte:' + n)) }; }));
          if (!rep.ok) return fallo(rep.error || 'No se pudo repartir el gasto.');
          m.partes = rep.partes;
        }
        if (!fuera && cta.mon !== m.mon) {
          // otra moneda que la de la cuenta: vale lo que cobró el banco, o un estimado mientras no se sepa
          const cobrado = L.parseMonto(fd.get('cobrado'));
          m.monCuenta = cta.mon;
          if (cobrado) m.cobrado = cobrado;
          else { m.cobrado = L.convertir(monto, m.mon, cta.mon, m.tc); m.estimado = true; }
        }
      }
      if (viejo) {
        m.id = viejo.id; m.creado = viejo.creado;
        estado.movs[estado.movs.indexOf(viejo)] = m;
      } else {
        m.id = L.uid(); m.creado = Date.now();
        estado.movs.push(m);
      }
      L.sincronizarPartes(estado, m);
      mes = L.mesDe(fecha);
      guardar(); cerrar(); pintar(); aviso('Guardado');
    },
    sub: function (fd) {
      const nombre = String(fd.get('nombre') || '').trim();
      if (!nombre) return fallo('Ponle un nombre.');
      const monto = L.parseMonto(fd.get('monto'));
      if (!monto) return fallo('Pon cuánto es cada mes.');
      const dia = Number(String(fd.get('dia') || '').replace(/\D/g, ''));
      if (!(dia >= 1 && dia <= 31)) return fallo('El día va del 1 al 31.');
      const sel = elegida(fd.get('cuenta'));
      if (!sel.cta) return fallo('Elige la cuenta.');
      if (!fd.get('cat')) return fallo('Elige una categoría.');
      // una nueva no pide este mes si su día ya pasó: lo de este mes ya lo anotaste a mano
      const hoy = L.hoyISO(), viejo = hoja.id ? subDe(hoja.id) : null;
      const x = { id: viejo ? viejo.id : L.uid(), nombre: nombre, tipo: fd.get('tipo') === 'ingreso' ? 'ingreso' : 'gasto', monto: monto, mon: fd.get('mon'),
        dia: dia, cuenta: sel.cta.id, cat: fd.get('cat'), pausada: fd.get('pausada') === 'si',
        desde: viejo ? viejo.desde : dia < Number(hoy.slice(8)) ? L.moverMes(L.mesDe(hoy), 1) : L.mesDe(hoy) };
      if (fd.get('para') === 'arkos') x.arkos = true;
      if (sel.medio) x.medio = sel.medio;
      if (viejo) estado.subs[estado.subs.indexOf(viejo)] = x;
      else estado.subs.push(x);
      guardar(); cerrar(); pintar(); aviso('Guardado');
    },
    medio: function (fd) {
      const c = L.cuentaDe(estado, fd.get('cuenta'));
      if (!c) return fallo('Elige una cuenta.');
      L.medioDe(estado, hoja.id).cuenta = c.id;
      guardar(); cerrar(); pintar();
    },
    cuenta: function (fd) {
      const nombre = String(fd.get('nombre') || '').trim();
      if (!nombre) return fallo('Ponle un nombre a la cuenta.');
      const repetida = estado.cuentas.some(function (c) { return c.id !== hoja.id && c.nombre.toLowerCase() === nombre.toLowerCase(); });
      if (repetida) return fallo('Ya hay una cuenta con ese nombre.');
      const inicial = L.parseMonto(fd.get('monto')) || 0;
      if (hoja.id) {
        const c = L.cuentaDe(estado, hoja.id);
        c.nombre = nombre; c.inicial = inicial;
        if (!L.usosCuenta(estado, c.id)) c.mon = fd.get('mon');
      } else {
        estado.cuentas.push({ id: 'k-' + L.uid(), nombre: nombre, mon: fd.get('mon'), inicial: inicial });
      }
      guardar(); cerrar(); pintar();
    },
    tope: function (fd) {
      const monto = L.parseMonto(fd.get('monto'));
      if (!monto) return fallo('Pon un monto mayor que cero, o quita el tope.');
      estado.topes[hoja.id] = monto;
      guardar(); cerrar(); pintar();
    },
    meta: function (fd) {
      const nombre = String(fd.get('nombre') || '').trim();
      if (!nombre) return fallo('Ponle un nombre a la meta.');
      const objetivo = L.parseMonto(fd.get('monto'));
      if (!objetivo) return fallo('Pon cuánto necesitas juntar.');
      const mon = fd.get('mon'), fecha = fd.get('fecha') || '';
      if (hoja.id) {
        const g = meta(hoja.id);
        if (g.mon !== mon && g.aportes.length) return fallo('La meta ya tiene aportes en ' + (g.mon === 'USD' ? 'dólares' : 'soles') + '; no se le puede cambiar la moneda.');
        g.nombre = nombre; g.objetivo = objetivo; g.mon = mon; g.fecha = fecha;
      } else {
        estado.metas.push({ id: L.uid(), nombre: nombre, objetivo: objetivo, mon: mon, fecha: fecha, aportes: [] });
      }
      guardar(); cerrar(); pintar();
    },
    aporte: function (fd) {
      const g = meta(hoja.id);
      const monto = L.parseMonto(fd.get('monto'));
      if (!monto) return fallo('Pon un monto mayor que cero.');
      if (!fd.get('fecha')) return fallo('Falta la fecha.');
      if (hoja.signo < 0 && monto > L.progresoMeta(g, L.hoyISO()).acumulado) return fallo('No puedes retirar más de lo que llevas guardado.');
      const a = { id: L.uid(), monto: hoja.signo * monto, fecha: fd.get('fecha'), nota: String(fd.get('nota') || '').trim() };
      if (g.mon === 'USD') a.tc = estado.tc;
      g.aportes.push(a);
      const retiro = hoja.signo < 0;
      guardar(); cerrar(); pintar(); aviso(retiro ? 'Retiro anotado' : 'Guardado');
    },
    'persona-nombre': function (fd) {
      const viejo = persona(hoja.id);
      const nuevo = String(fd.get('nombre') || '').trim();
      if (!nuevo) return fallo('Ponle un nombre.');
      const otra = L.claveDe(nuevo) !== viejo.clave ? persona(L.claveDe(nuevo)) : null;
      if (otra && !confirm('Ya existe ' + otra.nombre + '. ¿Juntar a ' + viejo.nombre + ' con ' + otra.nombre + ' en una sola persona?')) return;
      const r = L.renombrarPersona(estado, viejo.clave, nuevo);
      if (!r.ok) return fallo(r.error);
      guardar(); pintar(); abrir({ tipo: 'persona', id: r.clave }); aviso(r.junta ? 'Personas juntadas' : 'Guardado');
    },
    deuda: function (fd) {
      const nombre = String(fd.get('persona') || '').trim();
      if (!nombre) return fallo('Ponle el nombre de la persona.');
      const monto = L.parseMonto(fd.get('monto'));
      if (!monto) return fallo('Pon un monto mayor que cero.');
      if (!fd.get('fecha')) return fallo('Falta la fecha.');
      const tipo = fd.get('tipo');
      const esPago = tipo === 'mepago' || tipo === 'lepague';
      const cta = esPago ? L.cuentaDe(estado, fd.get('cuenta')) : null;
      // si "andrea" ya existe con otra grafía, se respeta cómo se escribió la primera vez
      const previa = estado.deudas.filter(function (x) { return L.claveDe(x.persona) === L.claveDe(nombre); })[0];
      const a = { persona: previa ? previa.persona : nombre, mon: fd.get('mon'), nota: String(fd.get('nota') || '').trim(), fecha: fd.get('fecha'),
        monto: (tipo === 'medebe' || tipo === 'lepague' ? 1 : -1) * monto, pago: tipo === 'mepago' || tipo === 'lepague' };
      const viejo = hoja.id ? estado.deudas.filter(function (x) { return x.id === hoja.id; })[0] : null;
      if (cta && cta.mon === a.mon) a.cuenta = cta.id;
      if (viejo && viejo.mov && !a.pago) a.mov = viejo.mov;
      if (viejo) { a.id = viejo.id; a.creado = viejo.creado; estado.deudas[estado.deudas.indexOf(viejo)] = a; }
      else { a.id = L.uid(); a.creado = Date.now(); estado.deudas.push(a); }
      guardar(); cerrar(); pintar(); aviso('Guardado');
    },
    cat: function (fd) {
      const nombre = String(fd.get('nombre') || '').trim();
      if (!nombre) return fallo('Ponle un nombre.');
      const lista = estado.categorias[hoja.tipoCat];
      const repetida = lista.some(function (c) { return c.id !== hoja.id && c.nombre.toLowerCase() === nombre.toLowerCase(); });
      if (repetida) return fallo('Ya hay una categoría con ese nombre.');
      if (hoja.id) lista.filter(function (c) { return c.id === hoja.id; })[0].nombre = nombre;
      else lista.push({ id: { gasto: 'c-', ingreso: 'i-', arkosGasto: 'ag-', arkosIngreso: 'ai-' }[hoja.tipoCat] + L.uid(), nombre: nombre });
      guardar(); cerrar(); pintar();
    },
    cambio: function (fd) {
      const tc = L.parseCambio(fd.get('tc'));
      if (!tc) return fallo('Pon el tipo de cambio, por ejemplo 3.50.');
      estado.tc = tc;
      guardar(); cerrar(); pintar();
    }
  };

  // ---------- eventos ----------

  document.addEventListener('click', function (e) {
    const b = e.target.closest('[data-accion]');
    if (!b) return;
    if (b.tagName === 'A') e.preventDefault();
    acciones[b.dataset.accion](b.dataset, b);
  });
  document.addEventListener('submit', function (e) {
    e.preventDefault();
    envios[e.target.dataset.form](new FormData(e.target));
  });
  document.addEventListener('change', function (e) {
    if (e.target.id === 'archivo') { if (e.target.files[0]) (paraAgregar ? agregarArchivo : restaurar)(e.target.files[0]); return; }
    if (!e.target.matches('[data-repinta]') || !hoja) return;
    leerBorrador();
    hoja.error = '';
    if (hoja.tipo === 'mov') {
      const d = hoja.d;
      const cta = elegida(d.cuenta).cta || estado.cuentas[0];
      if (d.tipo === 'transferencia') {
        d.cuenta = cta.id;   // Yape y Plin no transfieren: queda su cuenta
        if (!d.destino || d.destino === cta.id) {
          const otra = estado.cuentas.filter(function (c) { return c.id !== cta.id; })[0];
          d.destino = otra ? otra.id : '';
        }
      } else {
        // "Fuera de mis cuentas" es solo de Arkos: al volver a "Mío" se elige una cuenta
        if (d.para !== 'arkos' && d.cuenta === '') d.cuenta = estado.cuentas[0].id;
        // al elegir cuenta, la moneda se acomoda a la de la cuenta; después se puede cambiar
        if (e.target.name === 'cuenta' && d.cuenta !== '') d.mon = cta.mon;
        const cats = estado.categorias[L.claveCats({ tipo: d.tipo, arkos: d.para === 'arkos' })];
        if (!cats.some(function (c) { return c.id === d.cat; })) d.cat = cats[0].id;
        // "Otra persona": se suma a las opciones y queda marcada
        const otra = String(d.otra || '').trim();
        if (d.tipo === 'gasto' && otra) {
          d.con = d.con || [];
          const conocido = nombresConocidos(d).filter(function (x) { return L.claveDe(x) === L.claveDe(otra); })[0];
          if (!conocido) d.extras = (d.extras || []).concat(otra);
          if (!d.con.some(function (x) { return L.claveDe(x) === L.claveDe(otra); })) d.con.push(conocido || otra);
        }
        d.otra = '';
      }
    }
    if (hoja.tipo === 'sub') {
      const d = hoja.d, c = elegida(d.cuenta).cta;
      if (e.target.name === 'cuenta' && c) d.mon = c.mon;
      const cats = estado.categorias[L.claveCats({ tipo: d.tipo, arkos: d.para === 'arkos' })];
      if (!cats.some(function (x) { return x.id === d.cat; })) d.cat = cats[0].id;
    }
    if (hoja.tipo === 'deuda') {
      const c = L.cuentaDe(estado, hoja.d.cuenta);
      if (!c || c.mon !== hoja.d.mon) hoja.d.cuenta = '';
    }
    pintarHoja();
  });
  // mientras se tipea el monto, se actualiza el estimado del campo de al lado
  document.addEventListener('input', function (e) {
    if (e.target.id === 'q') { busqueda = e.target.value; $('#resultados').innerHTML = resultados(); return; }
    if (!hoja) return;
    if (e.target.name === 'monto') {
      const i = $('#hoja [data-estima]');
      if (i) i.placeholder = estimado(e.target.value, i.dataset.de, i.dataset.a);
    }
    if (e.target.name === 'monto' || e.target.hasAttribute('data-parte')) actualizarReparto();
  });
  window.addEventListener('hashchange', function () {
    if (hoja) cerrar();
    pintar();
    window.scrollTo(0, 0);
  });
  window.addEventListener('error', function (e) { aviso('Error: ' + e.message, true); });
  window.addEventListener('unhandledrejection', function (e) { aviso('Error: ' + (e.reason && e.reason.message || e.reason), true); });

  pintar();
  if (location.hash === '#nuevo') acciones['nuevo-mov']();

  const local = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || local)) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
    // cuando entra una versión nueva se recarga sola, salvo que estés anotando algo
    const habia = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (habia && !hoja) location.reload();
    });
  }
})();
