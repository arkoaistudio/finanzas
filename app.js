/* Pantallas de la app. Todo el estado vive en un solo objeto que se guarda
   en el almacenamiento del celular; los cálculos están en logica.js. */
(function () {
  'use strict';

  const L = window.Logica;
  const CLAVE = 'finanzas.v1';
  const DEMO = /[?&]demo\b/.test(location.search);   // datos de muestra, no guarda
  const VISTAS = ['resumen', 'movimientos', 'presupuesto', 'metas', 'ajustes'];
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
  function filaMov(m) {
    const ing = m.tipo === 'ingreso';
    return '<button class="fila" data-accion="editar-mov" data-id="' + esc(m.id) + '">' +
      '<span class="izq"><b>' + esc(L.nombreCat(estado, m.tipo, m.cat)) + '</b>' +
      (m.nota ? '<span class="meta">' + esc(m.nota) + '</span>' : '') + '</span>' +
      '<span class="der' + (ing ? ' ingreso' : '') + '">' + (ing ? '+ ' : '') + L.fmt(m.monto, m.mon) +
      (m.mon === 'USD' ? '<span class="meta">≈ ' + L.fmt(L.aSoles(m), 'PEN') + '</span>' : '') +
      '</span></button>';
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
    if (v === 'ajustes') {
      h = '<a class="cuadro" href="#resumen" style="border-left:0;border-right:1px solid var(--regla)" aria-label="Volver">' + ICO.izq + '</a>' +
        '<div class="titulo"><span class="eyebrow gris">Finanzas</span><h1>Ajustes</h1></div>';
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
        '<span class="meta">Toca el botón + de abajo para registrar un gasto o un ingreso.</span></section>';
    }

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
    let h = '<div class="filtros tira">' + chip('todo', 'Todo') + chip('gasto', 'Gastos') + chip('ingreso', 'Ingresos') + '</div>';
    const dias = L.diasDelMes(estado, mes, filtro);
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
    return '<div class="encabezado"><span class="eyebrow">Dólares</span></div><div class="lista">' +
      '<button class="fila" data-accion="cambio"><span class="izq"><b>Tipo de cambio</b>' +
      '<span class="meta libre">Para lo nuevo que anotes en dólares. Lo ya anotado no cambia.</span></span>' +
      '<span class="der">S/ ' + estado.tc.toFixed(3).replace(/0$/, '') + '</span></button></div>' +

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
      const cats = estado.categorias[d.tipo];
      return topeHoja(hoja.id ? 'Editar movimiento' : 'Nuevo movimiento') + '<form data-form="mov">' +
        '<div class="campo">' + seg('tipo', [['gasto', 'Gasto'], ['ingreso', 'Ingreso']], d.tipo, true) + '</div>' +
        campoMonto(d, 'Monto') +
        '<div class="campo"><span class="eyebrow">Moneda</span>' + seg('mon', MONEDAS, d.mon, true) + '</div>' +
        (d.mon === 'USD' ? campoTexto('tc', 'Tipo de cambio (soles por dólar)', d.tc, 'inputmode="decimal"') : '') +
        '<div class="campo"><span class="eyebrow">Categoría</span><div class="tira">' + cats.map(function (c) {
          return '<label class="chip"><input type="radio" name="cat" value="' + esc(c.id) + '"' + (c.id === d.cat ? ' checked' : '') + '><span>' + esc(c.nombre) + '</span></label>';
        }).join('') + '</div></div>' +
        '<div class="dos">' + campoFecha('fecha', 'Fecha', d.fecha) + campoTexto('nota', 'Nota', d.nota, 'placeholder="Opcional" maxlength="200"') + '</div>' +
        errorHoja() + '<div class="pie-hoja"><button class="btn prim ancho">Guardar</button>' +
        (hoja.id ? '<button type="button" class="btn peligro ancho" data-accion="borrar-mov">Eliminar</button>' : '') + '</div></form>';
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

  function errorHoja() { return hoja.error ? '<p class="error">' + esc(hoja.error) + '</p>' : ''; }
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
    $('#vista').innerHTML = { resumen: vResumen, movimientos: vMovimientos, presupuesto: vPresupuesto, metas: vMetas, ajustes: vAjustes }[v]();
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

    'nuevo-mov': function () {
      // si se está mirando otro mes, la fecha arranca en ese mes
      const hoy = L.hoyISO();
      abrir({
        tipo: 'mov', id: null,
        d: { tipo: 'gasto', monto: '', mon: 'PEN', tc: String(estado.tc), cat: estado.categorias.gasto[0].id,
          fecha: L.mesDe(hoy) === mes ? hoy : mes + '-01', nota: '' }
      }, 'monto');
    },
    'editar-mov': function (d) {
      const m = estado.movs.filter(function (x) { return x.id === d.id; })[0];
      if (!m) return;
      abrir({
        tipo: 'mov', id: m.id,
        d: { tipo: m.tipo, monto: L.aTexto(m.monto), mon: m.mon, tc: String(m.tc || estado.tc), cat: m.cat, fecha: m.fecha, nota: m.nota || '' }
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
      const tipo = fd.get('tipo'), mon = fd.get('mon'), fecha = fd.get('fecha');
      if (!fecha) return fallo('Falta la fecha.');
      if (!fd.get('cat')) return fallo('Elige una categoría.');
      const m = { tipo: tipo, monto: monto, mon: mon, cat: fd.get('cat'), nota: String(fd.get('nota') || '').trim(), fecha: fecha };
      if (mon === 'USD') {
        const tc = L.parseCambio(fd.get('tc'));
        if (!tc) return fallo('Pon el tipo de cambio, por ejemplo 3.50.');
        m.tc = tc;
        estado.tc = tc;
      }
      if (hoja.id) {
        const viejo = estado.movs.filter(function (x) { return x.id === hoja.id; })[0];
        m.id = viejo.id; m.creado = viejo.creado;
        estado.movs[estado.movs.indexOf(viejo)] = m;
      } else {
        m.id = L.uid(); m.creado = Date.now();
        estado.movs.push(m);
      }
      mes = L.mesDe(fecha);
      guardar(); cerrar(); pintar(); aviso('Guardado');
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
      const cats = estado.categorias[hoja.d.tipo];
      if (!cats.some(function (c) { return c.id === hoja.d.cat; })) hoja.d.cat = cats[0].id;
    }
    pintarHoja();
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
