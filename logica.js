/* Lógica de la app, sin nada de pantalla: montos, fechas, resúmenes y respaldo.
   Corre igual en el navegador (window.Logica) y en Node (para las pruebas).
   Los montos se guardan siempre en céntimos enteros, nunca con decimales. */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.Logica = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VERSION = 1;
  const SIMBOLO = { PEN: 'S/', USD: 'US$' };
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];
  const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const FECHA = /^\d{4}-\d{2}-\d{2}$/;

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function dos(n) { return String(n).padStart(2, '0'); }

  // ---------- fechas (siempre en hora local, como texto AAAA-MM-DD) ----------

  function hoyISO(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + dos(d.getMonth() + 1) + '-' + dos(d.getDate());
  }
  function mesDe(fecha) { return fecha.slice(0, 7); }
  function moverMes(mes, delta) {
    const p = mes.split('-').map(Number);
    const total = p[0] * 12 + (p[1] - 1) + delta;
    return Math.floor(total / 12) + '-' + dos(total % 12 + 1);
  }
  function nombreMes(mes) {
    const p = mes.split('-').map(Number);
    const n = MESES[p[1] - 1];
    return { nombre: n.charAt(0).toUpperCase() + n.slice(1), anio: p[0], numero: dos(p[1]) };
  }
  function etiquetaDia(fecha) {
    const p = fecha.split('-').map(Number);
    const dia = new Date(p[0], p[1] - 1, p[2]).getDay();
    return DIAS[dia] + ' ' + dos(p[2]) + ' ' + MESES[p[1] - 1].slice(0, 3);
  }
  function fechaCorta(fecha) {
    const p = fecha.split('-').map(Number);
    return dos(p[2]) + ' ' + MESES[p[1] - 1].slice(0, 3) + ' ' + p[0];
  }

  // ---------- montos ----------

  /* Lee lo que se tipea y devuelve céntimos, o null si no es un monto válido.
     Acepta punto o coma decimal (el teclado del iPhone cambia según la región)
     y separadores de miles: "1,250.50", "1250,5", "1.250,50", "1,250". */
  function parseMonto(texto) {
    if (typeof texto === 'number') {
      return Number.isFinite(texto) && texto > 0 ? Math.round(texto * 100) : null;
    }
    const t = String(texto == null ? '' : texto).replace(/[^\d.,]/g, '');
    if (!/\d/.test(t)) return null;
    const uc = t.lastIndexOf(','), up = t.lastIndexOf('.');
    let dec = -1;
    if (uc >= 0 && up >= 0) dec = Math.max(uc, up);
    else if (up >= 0) dec = t.indexOf('.') === up ? up : -1;
    else if (uc >= 0) {
      // una sola coma seguida de tres cifras es separador de miles: "1,250"
      const unica = t.indexOf(',') === uc;
      dec = unica && t.length - uc - 1 !== 3 ? uc : -1;
    }
    const entero = (dec >= 0 ? t.slice(0, dec) : t).replace(/[.,]/g, '');
    const frac = dec >= 0 ? t.slice(dec + 1).replace(/[.,]/g, '') : '';
    const n = Number((entero || '0') + '.' + (frac || '0'));
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.round(n * 100);
  }

  function parseCambio(texto) {
    const n = parseFloat(String(texto == null ? '' : texto).replace(',', '.'));
    return Number.isFinite(n) && n > 0 && n < 100 ? Math.round(n * 1000) / 1000 : null;
  }

  function partes(centimos, mon) {
    const neg = centimos < 0;
    const c = Math.abs(Math.round(centimos));
    return {
      neg: neg,
      sim: SIMBOLO[mon] || '',
      ent: String(Math.floor(c / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ','),
      dec: dos(c % 100)
    };
  }
  function fmt(centimos, mon) {
    const p = partes(centimos, mon);
    return (p.neg ? '− ' : '') + p.sim + ' ' + p.ent + '.' + p.dec;
  }
  function aTexto(centimos) { return (Math.abs(centimos) / 100).toFixed(2); }

  // Lo que vale en soles un movimiento o aporte, al cambio con que se registró.
  function aSoles(x) {
    return x.mon === 'USD' ? Math.round(x.monto * (x.tc || 1)) : x.monto;
  }

  // ---------- estado ----------

  function estadoInicial() {
    const cat = function (n) { return { id: 'c-' + n.toLowerCase().replace(/[^a-z]/g, ''), nombre: n }; };
    return {
      v: VERSION,
      tc: 3.5,
      categorias: {
        gasto: ['Comida', 'Mercado', 'Transporte', 'Casa', 'Servicios', 'Salud',
          'Ocio', 'Ropa', 'Suscripciones', 'Otros'].map(cat),
        ingreso: ['Sueldo', 'Honorarios', 'Otros'].map(function (n) {
          const c = cat(n); c.id = 'i-' + c.id.slice(2); return c;
        })
      },
      movs: [],
      topes: {},
      metas: [],
      ultimoRespaldo: null
    };
  }

  function nombreCat(estado, tipo, id) {
    const lista = estado.categorias[tipo] || [];
    for (let i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i].nombre;
    return 'Sin categoría';
  }

  function usosCat(estado, id) {
    let n = 0;
    for (const m of estado.movs) if (m.cat === id) n++;
    return n;
  }

  // ---------- resúmenes ----------

  function resumenMes(estado, mes) {
    const r = {
      ingresos: { PEN: 0, USD: 0, total: 0 },
      gastos: { PEN: 0, USD: 0, total: 0 },
      ahorro: 0, queda: 0, n: 0, porCategoria: []
    };
    const porCat = {};
    for (const m of estado.movs) {
      if (mesDe(m.fecha) !== mes) continue;
      const g = m.tipo === 'ingreso' ? r.ingresos : r.gastos;
      const s = aSoles(m);
      g[m.mon] += m.monto;
      g.total += s;
      if (m.tipo === 'gasto') porCat[m.cat] = (porCat[m.cat] || 0) + s;
      r.n++;
    }
    for (const meta of estado.metas) {
      for (const a of meta.aportes) {
        if (mesDe(a.fecha) === mes) r.ahorro += aSoles({ monto: a.monto, mon: meta.mon, tc: a.tc });
      }
    }
    r.queda = r.ingresos.total - r.gastos.total - r.ahorro;
    r.porCategoria = Object.keys(porCat).map(function (id) {
      return {
        cat: id, nombre: nombreCat(estado, 'gasto', id), total: porCat[id],
        pct: r.gastos.total ? Math.round(porCat[id] / r.gastos.total * 100) : 0
      };
    }).sort(function (a, b) { return b.total - a.total; });
    return r;
  }

  // Movimientos de un mes agrupados por día, lo más reciente arriba.
  function diasDelMes(estado, mes, filtro) {
    const dias = {};
    for (const m of estado.movs) {
      if (mesDe(m.fecha) !== mes) continue;
      if (filtro && filtro !== 'todo' && m.tipo !== filtro) continue;
      (dias[m.fecha] = dias[m.fecha] || []).push(m);
    }
    return Object.keys(dias).sort().reverse().map(function (f) {
      const movs = dias[f].sort(function (a, b) { return (b.creado || 0) - (a.creado || 0); });
      let neto = 0;
      for (const m of movs) neto += (m.tipo === 'ingreso' ? 1 : -1) * aSoles(m);
      return { fecha: f, movs: movs, neto: neto };
    });
  }

  // Topes en soles; los gastos en dólares entran convertidos.
  function presupuestoMes(estado, mes) {
    const gastado = {};
    for (const m of estado.movs) {
      if (m.tipo !== 'gasto' || mesDe(m.fecha) !== mes) continue;
      gastado[m.cat] = (gastado[m.cat] || 0) + aSoles(m);
    }
    const r = { filas: [], topeTotal: 0, gastadoConTope: 0, disponible: 0, hayTopes: false };
    for (const c of estado.categorias.gasto) {
      const tope = estado.topes[c.id] || 0;
      const g = gastado[c.id] || 0;
      r.filas.push({
        cat: c.id, nombre: c.nombre, tope: tope, gastado: g, resto: tope - g,
        pct: tope ? Math.min(100, Math.round(g / tope * 100)) : 0,
        pasado: tope > 0 && g > tope
      });
      if (tope > 0) { r.topeTotal += tope; r.gastadoConTope += g; r.hayTopes = true; }
    }
    r.disponible = r.topeTotal - r.gastadoConTope;
    return r;
  }

  function progresoMeta(meta, hoy) {
    let acumulado = 0;
    for (const a of meta.aportes) acumulado += a.monto;
    const falta = Math.max(0, meta.objetivo - acumulado);
    const r = {
      acumulado: acumulado, falta: falta, lograda: falta === 0,
      pct: meta.objetivo > 0 ? Math.max(0, Math.min(100, Math.floor(acumulado / meta.objetivo * 100))) : 0,
      meses: null, porMes: null, vencida: false
    };
    if (meta.fecha && !r.lograda) {
      if (meta.fecha < hoy) r.vencida = true;
      else {
        const a = mesDe(hoy).split('-').map(Number), b = mesDe(meta.fecha).split('-').map(Number);
        r.meses = (b[0] - a[0]) * 12 + (b[1] - a[1]) + 1;   // cuenta el mes en curso
        r.porMes = Math.ceil(falta / r.meses);
      }
    }
    return r;
  }

  // ---------- respaldo ----------

  /* Revisa un respaldo antes de cargarlo y descarta lo que venga mal formado,
     para que un archivo dañado no rompa la app. */
  function validar(o) {
    if (!o || typeof o !== 'object' || !Array.isArray(o.movs)) {
      return { ok: false, error: 'Ese archivo no es un respaldo de esta app.' };
    }
    if (typeof o.v === 'number' && o.v > VERSION) {
      return { ok: false, error: 'El respaldo es de una versión más nueva de la app.' };
    }
    const base = estadoInicial();
    const entero = function (n) { return typeof n === 'number' && Number.isFinite(n) && Math.round(n) === n; };
    const texto = function (s, max) { return typeof s === 'string' ? s.slice(0, max || 120) : ''; };
    const cats = function (lista, porDefecto) {
      const ok = Array.isArray(lista) ? lista.filter(function (c) {
        return c && typeof c.id === 'string' && c.id && typeof c.nombre === 'string' && c.nombre.trim();
      }).map(function (c) { return { id: c.id, nombre: texto(c.nombre.trim(), 40) }; }) : [];
      return ok.length ? ok : porDefecto;
    };
    const e = {
      v: VERSION,
      tc: typeof o.tc === 'number' && o.tc > 0 && o.tc < 100 ? o.tc : base.tc,
      categorias: {
        gasto: cats(o.categorias && o.categorias.gasto, base.categorias.gasto),
        ingreso: cats(o.categorias && o.categorias.ingreso, base.categorias.ingreso)
      },
      movs: [], topes: {}, metas: [],
      ultimoRespaldo: typeof o.ultimoRespaldo === 'string' ? o.ultimoRespaldo : null
    };
    for (const m of o.movs) {
      if (!m || (m.tipo !== 'gasto' && m.tipo !== 'ingreso')) continue;
      if (!entero(m.monto) || m.monto <= 0 || !SIMBOLO[m.mon] || !FECHA.test(m.fecha)) continue;
      const limpio = {
        id: texto(m.id) || uid(), tipo: m.tipo, monto: m.monto, mon: m.mon,
        cat: texto(m.cat), nota: texto(m.nota, 200), fecha: m.fecha,
        creado: typeof m.creado === 'number' ? m.creado : 0
      };
      if (m.mon === 'USD') limpio.tc = typeof m.tc === 'number' && m.tc > 0 ? m.tc : e.tc;
      e.movs.push(limpio);
    }
    if (o.topes && typeof o.topes === 'object') {
      for (const id of Object.keys(o.topes)) {
        if (entero(o.topes[id]) && o.topes[id] > 0) e.topes[id] = o.topes[id];
      }
    }
    if (Array.isArray(o.metas)) {
      for (const g of o.metas) {
        if (!g || !texto(g.nombre).trim() || !entero(g.objetivo) || g.objetivo <= 0 || !SIMBOLO[g.mon]) continue;
        const meta = {
          id: texto(g.id) || uid(), nombre: texto(g.nombre.trim(), 60), objetivo: g.objetivo,
          mon: g.mon, fecha: FECHA.test(g.fecha) ? g.fecha : '', aportes: []
        };
        for (const a of Array.isArray(g.aportes) ? g.aportes : []) {
          if (!a || !entero(a.monto) || a.monto === 0 || !FECHA.test(a.fecha)) continue;
          const ap = { id: texto(a.id) || uid(), monto: a.monto, fecha: a.fecha, nota: texto(a.nota, 200) };
          if (g.mon === 'USD') ap.tc = typeof a.tc === 'number' && a.tc > 0 ? a.tc : e.tc;
          meta.aportes.push(ap);
        }
        e.metas.push(meta);
      }
    }
    return { ok: true, estado: e };
  }

  // Hoja para Excel: el separador es ";" porque es el de Windows en es-PE.
  function aCSV(estado) {
    const celda = function (v) {
      const s = String(v == null ? '' : v);
      return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const plata = function (c) { return (c / 100).toFixed(2); };
    const filas = [];
    for (const m of estado.movs) {
      filas.push([m.fecha, m.tipo === 'ingreso' ? 'Ingreso' : 'Gasto', nombreCat(estado, m.tipo, m.cat),
        m.nota || '', m.mon, plata(m.monto), m.mon === 'USD' ? m.tc : '', plata(aSoles(m))]);
    }
    for (const g of estado.metas) {
      for (const a of g.aportes) {
        filas.push([a.fecha, a.monto < 0 ? 'Retiro de ahorro' : 'Ahorro', g.nombre, a.nota || '', g.mon,
          plata(a.monto), g.mon === 'USD' ? a.tc : '', plata(aSoles({ monto: a.monto, mon: g.mon, tc: a.tc }))]);
      }
    }
    filas.sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0; });
    filas.unshift(['Fecha', 'Tipo', 'Categoría', 'Nota', 'Moneda', 'Monto', 'Tipo de cambio', 'Monto en soles']);
    return '﻿' + filas.map(function (f) { return f.map(celda).join(';'); }).join('\r\n') + '\r\n';
  }

  // Datos de muestra para ver la app llena (index.html?demo). No se guardan.
  function demo(hoy) {
    const e = estadoInicial();
    const mes = mesDe(hoy), antes = moverMes(mes, -1);
    const dia = function (m, d) { return m + '-' + dos(d); };
    let n = 0;
    const mov = function (tipo, soles, cat, nota, fecha, mon) {
      const m = { id: 'd' + (++n), tipo: tipo, monto: Math.round(soles * 100), mon: mon || 'PEN', cat: cat, nota: nota, fecha: fecha, creado: n };
      if (m.mon === 'USD') m.tc = e.tc;
      e.movs.push(m);
    };
    e.tc = 3.52;
    mov('ingreso', 4800, 'i-sueldo', 'Quincena y fin de mes', dia(mes, 1));
    mov('ingreso', 320, 'i-honorarios', 'Renders para un cliente', dia(mes, 1), 'USD');
    mov('gasto', 1400, 'c-casa', 'Alquiler', dia(mes, 1));
    mov('gasto', 286.4, 'c-mercado', 'Compra de la semana', dia(mes, 1));
    mov('gasto', 18, 'c-comida', 'Menú', dia(mes, 1));
    mov('gasto', 24.5, 'c-transporte', 'Taxi', dia(mes, 1));
    mov('gasto', 20, 'c-suscripciones', 'Claude', dia(mes, 1), 'USD');
    mov('gasto', 189.9, 'c-servicios', 'Luz e internet', dia(mes, 1));
    mov('gasto', 95, 'c-ocio', 'Cine y cena', dia(mes, 1));
    mov('ingreso', 4800, 'i-sueldo', '', dia(antes, 1));
    mov('gasto', 1400, 'c-casa', 'Alquiler', dia(antes, 2));
    mov('gasto', 940, 'c-mercado', '', dia(antes, 12));
    e.topes = { 'c-comida': 60000, 'c-mercado': 120000, 'c-transporte': 30000, 'c-ocio': 8000, 'c-casa': 140000 };
    e.metas = [
      { id: 'g1', nombre: 'Fondo de emergencia', objetivo: 1500000, mon: 'PEN', fecha: moverMes(mes, 9) + '-28',
        aportes: [{ id: 'a1', monto: 420000, fecha: dia(antes, 5), nota: '' }, { id: 'a2', monto: 60000, fecha: dia(mes, 1), nota: 'Aporte del mes' }] },
      { id: 'g2', nombre: 'Viaje', objetivo: 200000, mon: 'USD', fecha: '',
        aportes: [{ id: 'a3', monto: 65000, fecha: dia(antes, 20), nota: '', tc: 3.52 }] }
    ];
    return e;
  }

  return {
    VERSION: VERSION, SIMBOLO: SIMBOLO, uid: uid, hoyISO: hoyISO, mesDe: mesDe, moverMes: moverMes,
    nombreMes: nombreMes, etiquetaDia: etiquetaDia, fechaCorta: fechaCorta, parseMonto: parseMonto,
    parseCambio: parseCambio, partes: partes, fmt: fmt, aTexto: aTexto, aSoles: aSoles,
    estadoInicial: estadoInicial, nombreCat: nombreCat, usosCat: usosCat, resumenMes: resumenMes,
    diasDelMes: diasDelMes, presupuestoMes: presupuestoMes, progresoMeta: progresoMeta,
    validar: validar, aCSV: aCSV, demo: demo
  };
});
