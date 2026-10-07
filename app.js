/* Pantallas de la app. Todo el estado vive en un solo objeto que se guarda
   en el almacenamiento del celular; los cálculos están en logica.js. */
(function () {
  'use strict';

  const L = window.Logica;
  const CLAVE = 'finanzas.v1';
  const DEMO = /[?&]demo\b/.test(location.search);   // datos de muestra, no guarda
  const VISTAS = ['resumen', 'movimientos', 'presupuesto', 'metas', 'deudas', 'ajustes'];
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
    ajustes: '<svg class="ico" viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><path d="M14 4.5h4v5h-4zM6 14.5h4v5H6z"/></svg>'
  };

  let estado = cargar();
  let mes = L.mesDe(L.hoyISO());
  let filtro = 'todo';
  let filtroCuenta = '';   // id de la cuenta que se está mirando en Movimientos, o vacío
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
  function filaMov(m) {
    const cta = L.cuentaDe(estado, m.cuenta);
    const abre = '<button class="fila" data-accion="editar-mov" data-id="' + esc(m.id) + '"><span class="izq"><b>';
    if (m.tipo === 'transferencia') {
      const dest = L.cuentaDe(estado, m.destino);
      return abre + 'Transferencia</b><span class="meta">' + esc(cta ? cta.nombre : '') + ' → ' + esc(dest ? dest.nombre : '') +
        (m.nota ? ' · ' + esc(m.nota) : '') + '</span></span><span class="der neutro">' + L.fmt(m.monto, m.mon) +
        (dest && dest.mon !== m.mon ? '<span class="meta' + (m.estimado ? ' pendiente' : '') + '">' + (m.estimado ? '≈ ' : '') +
          L.fmt(m.llega, dest.mon) + '</span>' : '') + '</span></button>';
    }
    const ing = m.tipo === 'ingreso';
    let sub = '';
    if (m.monCuenta) {
      sub = '<span class="meta' + (m.estimado ? ' pendiente' : '') + '">' + (m.estimado ? '≈ ' : '') +
        L.fmt(m.cobrado, m.monCuenta) + (m.estimado ? ' · por confirmar' : '') + '</span>';
    } else if (m.mon === 'USD') {
      sub = '<span class="meta">≈ ' + L.fmt(L.aSoles(m), 'PEN') + '</span>';
    }
    return abre + esc(L.nombreCat(estado, m.tipo, m.cat)) + '</b><span class="meta">' + esc(cta ? cta.nombre : '') +
      (m.nota ? ' · ' + esc(m.nota) : '') + '</span></span>' +
      '<span class="der' + (ing ? ' ingreso' : '') + '">' + (ing ? '+ ' : '') + L.fmt(m.monto, m.mon) + sub + '</span></button>';
  }
  function seccionCuentas() {
    const s = L.saldos(estado);
    let h = '<div class="encabezado"><span class="eyebrow">Cuentas — saldo de hoy</span>' +
      '<a class="eyebrow enlace" href="#ajustes">Editar</a></div><div class="lista">';
    for (const f of s.filas) {
      h += '<button class="fila" data-accion="ver-cuenta" data-id="' + esc(f.id) + '"><span class="izq"><b>' + esc(f.nombre) +
        '</b></span><span class="der' + (f.saldo < 0 ? ' negativo' : '') + '">' + L.fmt(f.saldo, f.mon) + '</span></button>';
    }
    return h + '<div class="fila total"><span class="izq"><b>Total</b><span class="meta libre">' +
      (s.USD ? 'En soles, con ' + L.fmt(s.USD, 'USD') + ' al cambio de ' + tcTexto() : 'En soles') + '</span></span>' +
      '<span class="der' + (s.total < 0 ? ' negativo' : '') + '">' + L.fmt(s.total, 'PEN') + '</span></div></div>';
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
  function seccionDeudas() {
    const pendientes = L.deudasPorPersona(estado).filter(function (f) { return f.pendiente; });
    const h = '<div class="encabezado"><span class="eyebrow">Por cobrar y por pagar</span>' +
      '<a class="eyebrow enlace" href="#deudas">' + (pendientes.length ? 'Ver todo' : 'Anotar') + '</a></div><div class="lista">';
    if (!pendientes.length) {
      return h + '<div class="fila"><span class="izq"><span class="meta libre">Nadie te debe ni le debes nada. ' +
        'Si compartes un taxi, anótalo acá para acordarte.</span></span></div></div>';
    }
    return h + pendientes.slice(0, 3).map(filaPersona).join('') + '</div>';
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
    let h;
    if (v === 'ajustes' || v === 'deudas') {
      h = '<a class="cuadro" href="#resumen" style="border-left:0;border-right:1px solid var(--regla)" aria-label="Volver">' + ICO.izq + '</a>' +
        '<div class="titulo"><span class="eyebrow gris">Finanzas</span><h1>' + (v === 'deudas' ? 'Personas' : 'Ajustes') + '</h1></div>';
    } else if (v === 'metas') {
      h = '<div class="titulo"><span class="eyebrow gris">Ahorro</span><h1>Metas</h1></div>' +
        '<a class="cuadro" href="#ajustes" aria-label="Ajustes">' + ICO.ajustes + '</a>';
    } else {
      const n = L.nombreMes(mes);
      h = '<div class="titulo"><span class="eyebrow gris">N° ' + n.numero + ' — ' + n.anio +
        (DEMO ? ' — Demo' : '') + '</span><h1>' + n.nombre + '</h1></div>' +
        '<button class="cuadro" data-accion="mes" data-d="-1" aria-label="Mes anterior">' + ICO.izq + '</button>' +
        '<button class="cuadro" data-accion="mes" data-d="1" aria-label="Mes siguiente">' + ICO.der + '</button>' +
        '<a class="cuadro" href="#ajustes" aria-label="Ajustes">' + ICO.ajustes + '</a>';
    }
    $('#cabecera').innerHTML = h;
  }

  function pintarBarra(v) {
    const a = function (id, texto) {
      return '<a href="#' + id + '"' + (v === id ? ' class="on"' : '') + '>' + texto + '</a>';
    };
    $('#barra').innerHTML = a('resumen', 'Resumen') + a('movimientos', 'Movimientos') +
      '<button data-accion="nuevo-mov" aria-label="Nuevo movimiento">' + ICO.mas + '</button>' +
      a('presupuesto', 'Presupuesto') + a('metas', 'Metas');
  }

  function vResumen() {
    const r = L.resumenMes(estado, mes);
    let h = '';
    const dias = diasDesdeRespaldo();
    if (estado.movs.length >= 10 && (dias === null || dias >= DIAS_SIN_RESPALDO)) {
      h += '<div class="franja"><p>' + (dias === null ? 'Todavía no tienes un respaldo.' :
        'Tu último respaldo es de hace ' + dias + ' días.') + '</p>' +
        '<button class="btn sec chico" data-accion="respaldo">Guardar</button></div>';
    }
    const largo = Math.abs(r.queda) >= 10000000 ? ' largo' : '';
    h += '<section class="celda"><span class="eyebrow">Queda este mes</span>' +
      num(r.queda, 'PEN', 'grande' + largo) +
      '<p class="meta">Ingresos menos gastos y ahorro, en soles.' +
      (r.ingresos.USD || r.gastos.USD ? ' Los dólares van al cambio con que se anotaron.' : '') + '</p></section>';
    h += '<section class="reticula tres">' +
      '<div class="celda"><span class="eyebrow">Ingresos</span>' + num(r.ingresos.total, 'PEN', 'medio') +
      (r.ingresos.USD ? '<span class="meta">' + L.fmt(r.ingresos.USD, 'USD') + ' incl.</span>' : '') + '</div>' +
      '<div class="celda"><span class="eyebrow">Gastos</span>' + num(r.gastos.total, 'PEN', 'medio') +
      (r.gastos.USD ? '<span class="meta">' + L.fmt(r.gastos.USD, 'USD') + ' incl.</span>' : '') + '</div>' +
      '<div class="celda"><span class="eyebrow">Ahorro</span>' + num(r.ahorro, 'PEN', 'medio') + '</div>' +
      '</section>';

    if (!r.n) {
      return h + '<section class="vacio"><span class="eyebrow gris">Sin movimientos</span>' +
        '<p>Todavía no hay nada anotado en este mes.</p>' +
        '<span class="meta">Toca el botón + de abajo para registrar un gasto o un ingreso.</span></section>' + seccionCuentas() + seccionDeudas();
    }
    h += seccionCuentas() + seccionDeudas();

    if (r.porCategoria.length) {
      h += '<div class="encabezado"><span class="eyebrow">Gasto por categoría</span>' +
        '<a class="eyebrow enlace" href="#presupuesto">Presupuesto</a></div><div class="lista">';
      for (const c of r.porCategoria) {
        h += '<div class="fila bloque"><span class="arriba"><b>' + esc(c.nombre) + '</b><span>' +
          L.fmt(c.total, 'PEN') + ' <span class="meta">' + c.pct + '%</span></span></span>' + barraAv(c.pct) + '</div>';
      }
      h += '</div>';
    }

    const ultimos = [];
    for (const d of L.diasDelMes(estado, mes, 'todo')) {
      for (const m of d.movs) if (ultimos.length < 5) ultimos.push(m);
    }
    h += '<div class="encabezado"><span class="eyebrow">Últimos movimientos</span>' +
      '<a class="eyebrow enlace" href="#movimientos">Ver todos</a></div><div class="lista">' +
      ultimos.map(filaMov).join('') + '</div>';
    return h;
  }

  function vMovimientos() {
    const chip = function (id, texto) {
      return '<a class="chip' + (filtro === id ? ' on' : '') + '" href="#movimientos" data-accion="filtro" data-f="' + id + '">' + texto + '</a>';
    };
    const chipCta = function (id, texto) {
      return '<a class="chip' + (filtroCuenta === id ? ' on' : '') + '" href="#movimientos" data-accion="filtro-cuenta" data-id="' + esc(id) + '">' + esc(texto) + '</a>';
    };
    let h = '<div class="filtros tira">' + chip('todo', 'Todo') + chip('gasto', 'Gastos') + chip('ingreso', 'Ingresos') + '</div>' +
      '<div class="filtros tira">' + chipCta('', 'Todas las cuentas') + estado.cuentas.map(function (c) { return chipCta(c.id, c.nombre); }).join('') + '</div>';
    const dias = L.diasDelMes(estado, mes, filtro, filtroCuenta);
    if (!dias.length) {
      return h + '<section class="vacio"><span class="eyebrow gris">Sin movimientos</span>' +
        '<p>No hay nada anotado con este filtro en el mes.</p></section>';
    }
    for (const d of dias) {
      h += '<div class="dia"><span class="eyebrow">' + L.etiquetaDia(d.fecha) + '</span>' +
        '<span class="meta">' + (d.neto > 0 ? '+ ' : '') + L.fmt(d.neto, 'PEN') + '</span></div>' +
        '<div class="lista" style="border-top:0">' + d.movs.map(filaMov).join('') + '</div>';
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
    return h + '<div class="celda" style="border-bottom:0"><button class="btn sec ancho" data-accion="nueva-meta">Nueva meta</button></div>';
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
    return h + '<div class="celda" style="border-bottom:0"><button class="btn sec ancho" data-accion="nueva-deuda">Nuevo apunte</button></div>';
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
    return ctas + '<div class="encabezado"><span class="eyebrow">Dólares</span></div><div class="lista">' +
      '<button class="fila" data-accion="cambio"><span class="izq"><b>Tipo de cambio</b>' +
      '<span class="meta libre">Para estimar lo que anotes en dólares y para el total de las cuentas. Lo ya anotado no cambia.</span></span>' +
      '<span class="der">S/ ' + tcTexto() + '</span></button></div>' +

      '<div class="encabezado"><span class="eyebrow">Respaldo</span><span class="eyebrow gris">' +
      (dias === null ? 'Nunca' : dias === 0 ? 'Hoy' : 'Hace ' + dias + (dias === 1 ? ' día' : ' días')) + '</span></div>' +
      '<div class="celda" style="border-top:1px solid var(--linea-2)"><p class="meta">Los datos viven solo en este celular. ' +
      'Guarda un respaldo de vez en cuando en Archivos o iCloud: si pierdes el teléfono o borras la app, es lo único que los recupera.</p>' +
      '<div class="acciones"><button class="btn prim" data-accion="respaldo">Guardar respaldo</button>' +
      '<button class="btn sec" data-accion="restaurar">Restaurar</button>' +
      '<button class="btn sec" data-accion="excel">Exportar a Excel</button></div></div>' +

      cats('gasto', 'Categorías de gasto') + cats('ingreso', 'Categorías de ingreso') +

      '<div class="celda" style="border-bottom:0;padding-top:32px"><button class="btn peligro" data-accion="borrar-todo">Borrar todos los datos</button>' +
      '<p class="meta" style="margin-top:18px">' + estado.movs.length + ' movimientos guardados · versión ' + L.VERSION + '</p></div>';
  }

  // ---------- hojas ----------

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
      const cta = L.cuentaDe(estado, d.cuenta) || estado.cuentas[0];
      const chips = function (nombre, valor, excluir) {
        return '<div class="tira">' + estado.cuentas.filter(function (c) { return c.id !== excluir; }).map(function (c) {
          return '<label class="chip"><input type="radio" name="' + nombre + '" value="' + esc(c.id) + '"' + (c.id === valor ? ' checked' : '') +
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
      let h = topeHoja(hoja.id ? 'Editar movimiento' : 'Nuevo movimiento') + '<form data-form="mov">' +
        '<div class="campo">' + seg('tipo', [['gasto', 'Gasto'], ['ingreso', 'Ingreso'], ['transferencia', 'Transferir']], d.tipo, true) + '</div>';
      if (transf) {
        const dest = L.cuentaDe(estado, d.destino);
        h += campoMonto({ monto: d.monto, mon: cta.mon }, 'Monto') +
          '<div class="campo"><span class="eyebrow">Sale de</span>' + chips('cuenta', cta.id) + '</div>' +
          '<div class="campo"><span class="eyebrow">Va a</span>' + chips('destino', d.destino, cta.id) + '</div>' +
          (dest && dest.mon !== cta.mon ? real('llega', 'Llega a ' + esc(dest.nombre), cta.mon, dest.mon) : '');
      } else {
        h += campoMonto(d, 'Monto') +
          '<div class="campo"><span class="eyebrow">Moneda</span>' + seg('mon', MONEDAS, d.mon, true) + '</div>' +
          '<div class="campo"><span class="eyebrow">' + (d.tipo === 'ingreso' ? 'Entra a' : 'Sale de') + '</span>' + chips('cuenta', cta.id) + '</div>' +
          (cta.mon !== d.mon ? real('cobrado', (d.tipo === 'ingreso' ? 'Recibido en ' : 'Cobrado en ') + esc(cta.nombre), d.mon, cta.mon) : '') +
          '<div class="campo"><span class="eyebrow">Categoría</span><div class="tira">' + estado.categorias[d.tipo].map(function (c) {
            return '<label class="chip"><input type="radio" name="cat" value="' + esc(c.id) + '"' + (c.id === d.cat ? ' checked' : '') + '><span>' + esc(c.nombre) + '</span></label>';
          }).join('') + '</div></div>';
      }
      return h + '<div class="dos">' + campoFecha('fecha', 'Fecha', d.fecha) + campoTexto('nota', 'Nota', d.nota, 'placeholder="Opcional" maxlength="200"') + '</div>' +
        errorHoja() + '<div class="pie-hoja"><button class="btn prim ancho">Guardar</button>' +
        (hoja.id ? '<button type="button" class="btn peligro ancho" data-accion="borrar-mov">Eliminar</button>' : '') + '</div></form>';
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
        h += '<p class="meta" style="padding:0 var(--margen) 20px">Todavía no hay aportes.</p>';
      }
      return h + '<div class="pie-hoja"><button class="btn sec ancho" data-accion="editar-meta" data-id="' + esc(g.id) + '">Editar la meta</button></div></div>';
    },
    deuda: function () {
      const d = hoja.d;
      const nombres = {};
      estado.deudas.forEach(function (x) { nombres[L.claveDe(x.persona)] = x.persona; });
      return topeHoja(hoja.id ? 'Editar apunte' : 'Nuevo apunte') + '<form data-form="deuda">' +
        '<div class="campo">' + seg('tipo', [['medebe', 'Me debe'], ['ledebo', 'Le debo'], ['mepago', 'Me pagó'], ['lepague', 'Le pagué']], d.tipo, false) + '</div>' +
        '<label class="campo"><span class="eyebrow">Persona</span><input type="text" name="persona" list="personas" autocomplete="off" ' +
        'maxlength="40" placeholder="Andrea" value="' + esc(d.persona) + '"><datalist id="personas">' +
        Object.keys(nombres).map(function (k) { return '<option value="' + esc(nombres[k]) + '">'; }).join('') + '</datalist></label>' +
        campoMonto(d, 'Cuánto') +
        '<div class="campo"><span class="eyebrow">Moneda</span>' + seg('mon', MONEDAS, d.mon, true) + '</div>' +
        campoTexto('nota', 'De qué', d.nota, 'placeholder="Taxi al aeropuerto" maxlength="200"') +
        campoFecha('fecha', 'Fecha', d.fecha) +
        '<p class="meta nota-hoja">Es solo una libreta: no mueve el saldo de tus cuentas ni cuenta como ingreso o gasto.</p>' +
        errorHoja() + '<div class="pie-hoja"><button class="btn prim ancho">Guardar</button>' +
        (hoja.id ? '<button type="button" class="btn peligro ancho" data-accion="borrar-deuda">Eliminar</button>' : '') + '</div></form>';
    },
    persona: function () {
      const f = persona(hoja.id);
      const meDebe = f.saldo.PEN > 0 || f.saldo.USD > 0, leDebo = f.saldo.PEN < 0 || f.saldo.USD < 0;
      const titulo = !f.pendiente ? 'Saldado' : meDebe && !leDebo ? 'Te debe' : leDebo && !meDebe ? 'Le debes' : 'Saldo';
      let h = topeHoja(esc(f.nombre)) + '<div class="cuerpo"><section class="celda"><span class="eyebrow">' + titulo + '</span>' +
        '<div class="saldo-persona">' + (f.pendiente ? saldoPersona(f) : '<span class="meta">No queda nada pendiente.</span>') + '</div>' +
        '<div class="acciones">' + (f.pendiente ? '<button class="btn prim" data-accion="saldar" data-id="' + esc(f.clave) + '">Saldar</button>' : '') +
        '<button class="btn sec" data-accion="nueva-deuda" data-persona="' + esc(f.nombre) + '">Anotar</button></div></section>' +
        (f.pendiente ? '<div class="encabezado"><span class="eyebrow">Lo que falta</span></div><div class="lista">' + L.abiertos(f).map(function (x) {
          const a = x.apunte, parcial = Math.abs(x.resto) !== Math.abs(a.monto);
          return '<div class="fila"><span class="izq"><b>' + (a.nota ? esc(a.nota) : 'Sin detalle') + '</b><span class="meta">' +
            L.fechaCorta(a.fecha) + (parcial ? ' · de ' + L.fmt(Math.abs(a.monto), a.mon) + ', ya pagó una parte' : '') + '</span></span>' +
            '<span class="der ' + (x.resto > 0 ? 'por-cobrar' : 'negativo') + '">' + (x.resto > 0 ? '+ ' : '') + L.fmt(x.resto, x.mon) + '</span></div>';
        }).join('') + '</div>' : '') +
        '<div class="encabezado"><span class="eyebrow">Historial</span><span class="eyebrow gris">Toca para editar</span></div><div class="lista">';
      h += f.apuntes.map(function (a) {
        return '<button class="fila" data-accion="editar-deuda" data-id="' + esc(a.id) + '"><span class="izq"><b>' + L.ROTULO_DEUDA[L.tipoDeuda(a)] +
          '</b><span class="meta">' + L.fechaCorta(a.fecha) + (a.nota ? ' · ' + esc(a.nota) : '') + '</span></span>' +
          '<span class="der' + (a.pago ? ' neutro' : a.monto > 0 ? ' por-cobrar' : ' negativo') + '">' + (a.monto > 0 ? '+ ' : '') + L.fmt(a.monto, a.mon) + '</span></button>';
      }).join('');
      return h + '</div></div>';
    },
    cat: function () {
      const usos = hoja.id ? L.usosCat(estado, hoja.id) : 0;
      const unica = estado.categorias[hoja.tipoCat].length <= 1;
      let pie = '';
      if (hoja.id && usos) pie = '<p class="meta nota-hoja">Tiene ' + usos + (usos === 1 ? ' movimiento' : ' movimientos') + '. Se puede renombrar, pero no borrar.</p>';
      return topeHoja(hoja.id ? 'Editar categoría' : 'Nueva categoría de ' + hoja.tipoCat) + '<form data-form="cat">' +
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
    new FormData(f).forEach(function (v, k) { hoja.d[k] = v; });
  }
  function fallo(texto) { leerBorrador(); hoja.error = texto; pintarHoja(); }

  function pintarHoja() {
    const el = $('#hoja');
    document.body.classList.toggle('con-hoja', !!hoja);
    el.hidden = !hoja;
    el.innerHTML = hoja ? HOJAS[hoja.tipo]() : '';
  }

  // ---------- pintar ----------

  function pintar() {
    const v = vistaActual();
    pintarCabecera(v);
    pintarBarra(v);
    $('#vista').innerHTML = { resumen: vResumen, movimientos: vMovimientos, presupuesto: vPresupuesto, metas: vMetas, deudas: vDeudas, ajustes: vAjustes }[v]();
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

  function restaurar(archivo) {
    const lector = new FileReader();
    lector.onerror = function () { aviso('No se pudo leer el archivo.', true); };
    lector.onload = function () {
      let r;
      try { r = L.validar(JSON.parse(lector.result)); }
      catch (e) { r = { ok: false, error: 'Ese archivo no es un respaldo de esta app.' }; }
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

    'nuevo-mov': function () {
      // arranca en la última cuenta usada; si se mira otro mes, la fecha cae en ese mes
      const hoy = L.hoyISO();
      let ultimo = null;
      for (const m of estado.movs) if (m.tipo !== 'transferencia' && (!ultimo || (m.creado || 0) > (ultimo.creado || 0))) ultimo = m;
      const cta = (ultimo && L.cuentaDe(estado, ultimo.cuenta)) || estado.cuentas[0];
      const otra = estado.cuentas.filter(function (c) { return c.id !== cta.id; })[0];
      abrir({
        tipo: 'mov', id: null, tc: estado.tc,
        d: { tipo: 'gasto', monto: '', mon: cta.mon, cuenta: cta.id, destino: otra ? otra.id : '', cobrado: '', llega: '',
          cat: estado.categorias.gasto[0].id, fecha: L.mesDe(hoy) === mes ? hoy : mes + '-01', nota: '' }
      }, 'monto');
    },
    'editar-mov': function (d) {
      const m = estado.movs.filter(function (x) { return x.id === d.id; })[0];
      if (!m) return;
      const transf = m.tipo === 'transferencia';
      const otra = estado.cuentas.filter(function (c) { return c.id !== m.cuenta; })[0];
      abrir({
        tipo: 'mov', id: m.id, tc: m.tc || estado.tc,
        d: { tipo: m.tipo, monto: L.aTexto(m.monto), mon: m.mon, cuenta: m.cuenta, destino: m.destino || (otra ? otra.id : ''),
          cobrado: m.monCuenta && !m.estimado ? L.aTexto(m.cobrado) : '',
          llega: transf && !m.estimado && m.llega !== m.monto ? L.aTexto(m.llega) : '',
          cat: transf ? estado.categorias.gasto[0].id : m.cat, fecha: m.fecha, nota: m.nota || '' }
      });
    },
    'borrar-mov': function () {
      if (!confirm('¿Eliminar este movimiento?')) return;
      estado.movs = estado.movs.filter(function (x) { return x.id !== hoja.id; });
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
      abrir({ tipo: 'deuda', id: null, d: { tipo: 'medebe', persona: d.persona || '', monto: '', mon: 'PEN', nota: '', fecha: L.hoyISO() } },
        d.persona ? 'monto' : 'persona');
    },
    'editar-deuda': function (d) {
      const a = estado.deudas.filter(function (x) { return x.id === d.id; })[0];
      if (!a) return;
      abrir({ tipo: 'deuda', id: a.id, d: { tipo: L.tipoDeuda(a), persona: a.persona, monto: L.aTexto(a.monto), mon: a.mon, nota: a.nota || '', fecha: a.fecha } });
    },
    saldar: function (d) {
      // lo que falta, en la moneda de mayor saldo, como pago en sentido contrario
      const f = persona(d.id);
      const mon = Math.abs(f.saldo.PEN) >= Math.abs(f.saldo.USD) * estado.tc ? 'PEN' : 'USD';
      abrir({ tipo: 'deuda', id: null, d: { tipo: f.saldo[mon] > 0 ? 'mepago' : 'lepague', persona: f.nombre,
        monto: L.aTexto(f.saldo[mon]), mon: mon, nota: '', fecha: L.hoyISO() } }, 'monto');
    },
    'borrar-deuda': function () {
      if (!confirm('¿Eliminar este apunte?')) return;
      estado.deudas = estado.deudas.filter(function (x) { return x.id !== hoja.id; });
      guardar(); cerrar(); pintar(); aviso('Apunte eliminado');
    },
    persona: function (d) { abrir({ tipo: 'persona', id: d.id }); },

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
      if (filtroCuenta === hoja.id) filtroCuenta = '';
      guardar(); cerrar(); pintar();
    },

    respaldo: async function () {
      const ok = await entregar('finanzas-respaldo-' + L.hoyISO() + '.json', JSON.stringify(estado, null, 1), 'application/json');
      if (!ok) return;
      estado.ultimoRespaldo = new Date().toISOString();
      guardar(); pintar();
    },
    excel: function () { entregar('finanzas-' + L.hoyISO() + '.csv', L.aCSV(estado), 'text/csv'); },
    restaurar: function () { const i = $('#archivo'); i.value = ''; i.click(); },
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
      const cta = L.cuentaDe(estado, fd.get('cuenta'));
      if (!cta) return fallo('Elige una cuenta.');
      const viejo = hoja.id ? estado.movs.filter(function (x) { return x.id === hoja.id; })[0] : null;
      const m = { tipo: tipo, monto: monto, mon: tipo === 'transferencia' ? cta.mon : fd.get('mon'), tc: hoja.tc,
        cuenta: cta.id, cat: '', nota: String(fd.get('nota') || '').trim(), fecha: fecha };
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
        if (cta.mon !== m.mon) {
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
      mes = L.mesDe(fecha);
      guardar(); cerrar(); pintar(); aviso('Guardado');
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
    deuda: function (fd) {
      const nombre = String(fd.get('persona') || '').trim();
      if (!nombre) return fallo('Ponle el nombre de la persona.');
      const monto = L.parseMonto(fd.get('monto'));
      if (!monto) return fallo('Pon un monto mayor que cero.');
      if (!fd.get('fecha')) return fallo('Falta la fecha.');
      const tipo = fd.get('tipo');
      // si "andrea" ya existe con otra grafía, se respeta cómo se escribió la primera vez
      const previa = estado.deudas.filter(function (x) { return L.claveDe(x.persona) === L.claveDe(nombre); })[0];
      const a = { persona: previa ? previa.persona : nombre, mon: fd.get('mon'), nota: String(fd.get('nota') || '').trim(), fecha: fd.get('fecha'),
        monto: (tipo === 'medebe' || tipo === 'lepague' ? 1 : -1) * monto, pago: tipo === 'mepago' || tipo === 'lepague' };
      const viejo = hoja.id ? estado.deudas.filter(function (x) { return x.id === hoja.id; })[0] : null;
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
      else lista.push({ id: (hoja.tipoCat === 'gasto' ? 'c-' : 'i-') + L.uid(), nombre: nombre });
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
    if (e.target.id === 'archivo') { if (e.target.files[0]) restaurar(e.target.files[0]); return; }
    if (!e.target.matches('[data-repinta]') || !hoja) return;
    leerBorrador();
    hoja.error = '';
    if (hoja.tipo === 'mov') {
      const d = hoja.d;
      const cta = L.cuentaDe(estado, d.cuenta) || estado.cuentas[0];
      if (d.tipo === 'transferencia') {
        if (!d.destino || d.destino === cta.id) {
          const otra = estado.cuentas.filter(function (c) { return c.id !== cta.id; })[0];
          d.destino = otra ? otra.id : '';
        }
      } else {
        // al elegir cuenta, la moneda se acomoda a la de la cuenta; después se puede cambiar
        if (e.target.name === 'cuenta') d.mon = cta.mon;
        const cats = estado.categorias[d.tipo];
        if (!cats.some(function (c) { return c.id === d.cat; })) d.cat = cats[0].id;
      }
    }
    pintarHoja();
  });
  // mientras se tipea el monto, se actualiza el estimado del campo de al lado
  document.addEventListener('input', function (e) {
    if (e.target.name !== 'monto' || !hoja) return;
    const i = $('#hoja [data-estima]');
    if (i) i.placeholder = estimado(e.target.value, i.dataset.de, i.dataset.a);
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
  }
})();
