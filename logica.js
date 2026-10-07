/* Lógica de la app, sin nada de pantalla: montos, fechas, resúmenes y respaldo.
   Corre igual en el navegador (window.Logica) y en Node (para las pruebas).
   Los montos se guardan siempre en céntimos enteros, nunca con decimales. */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.Logica = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VERSION = 3;
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

  function convertir(monto, de, a, tc) {
    if (de === a) return monto;
    return de === 'USD' ? Math.round(monto * tc) : Math.round(monto / tc);
  }

  /* Lo que vale en soles un movimiento o aporte. Si fue en dólares pero salió
     de una cuenta en soles, vale lo que cobró el banco, no el cambio teórico. */
  function aSoles(x) {
    if (x.mon !== 'USD') return x.monto;
    if (x.monCuenta === 'PEN' && x.cobrado) return x.cobrado;
    return Math.round(x.monto * (x.tc || 1));
  }

  /* Un gasto compartido guarda lo que se pagó entero (eso es lo que sale de la cuenta)
     y en `partes` lo que le toca a cada otra persona. Lo mío es lo que sobra:
     eso es lo que cuenta para el presupuesto y el resumen del mes. */
  function propio(m) {
    let o = m.monto;
    for (const p of m.partes || []) o -= p.monto;
    return o;
  }
  function aSolesPropio(m) {
    const t = aSoles(m);
    return m.partes && m.partes.length ? Math.round(t * propio(m) / m.monto) : t;
  }

  // Lo que el movimiento mueve en su cuenta, en la moneda de la cuenta.
  function enCuenta(m) {
    return m.monCuenta && m.monCuenta !== m.mon ? m.cobrado : m.monto;
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
      cuentas: [
        { id: 'k-bcp', nombre: 'BCP', mon: 'PEN', inicial: 0 },
        { id: 'k-scotiabank', nombre: 'Scotiabank', mon: 'PEN', inicial: 0 },
        { id: 'k-paypal', nombre: 'PayPal', mon: 'USD', inicial: 0 },
        { id: 'k-efectivo', nombre: 'Efectivo', mon: 'PEN', inicial: 0 }
      ],
      movs: [],
      topes: {},
      metas: [],
      deudas: [],
      ultimoRespaldo: null
    };
  }

  function cuentaDe(estado, id) {
    for (const c of estado.cuentas) if (c.id === id) return c;
    return null;
  }
  function usosCuenta(estado, id) {
    let n = 0;
    for (const m of estado.movs) if (m.cuenta === id || m.destino === id) n++;
    for (const d of estado.deudas || []) if (d.cuenta === id) n++;
    return n;
  }

  /* Saldo de cada cuenta: lo que tenía al empezar, más lo que entró, menos lo
     que salió. El total va en soles, con los dólares al cambio de hoy. */
  function saldos(estado) {
    const s = {};
    for (const c of estado.cuentas) s[c.id] = c.inicial || 0;
    for (const m of estado.movs) {
      if (!(m.cuenta in s)) continue;
      if (m.tipo === 'transferencia') {
        s[m.cuenta] -= m.monto;
        if (m.destino in s) s[m.destino] += m.llega;
      } else {
        s[m.cuenta] += (m.tipo === 'ingreso' ? 1 : -1) * enCuenta(m);
      }
    }
    // un pago de una deuda que entró a (o salió de) una cuenta también la mueve
    for (const d of estado.deudas || []) if (d.cuenta && d.cuenta in s) s[d.cuenta] -= d.monto;
    const r = { filas: [], PEN: 0, USD: 0, total: 0 };
    for (const c of estado.cuentas) {
      r.filas.push({ id: c.id, nombre: c.nombre, mon: c.mon, saldo: s[c.id] });
      r[c.mon] += s[c.id];
    }
    r.total = r.PEN + Math.round(r.USD * estado.tc);
    return r;
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
      if (mesDe(m.fecha) !== mes || m.tipo === 'transferencia') continue;
      const g = m.tipo === 'ingreso' ? r.ingresos : r.gastos;
      const s = aSolesPropio(m);
      g[m.mon] += propio(m);
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
  function diasDelMes(estado, mes, filtro, cuenta) {
    const dias = {};
    for (const m of estado.movs) {
      if (mesDe(m.fecha) !== mes) continue;
      if (filtro && filtro !== 'todo' && m.tipo !== filtro) continue;
      if (cuenta && m.cuenta !== cuenta && m.destino !== cuenta) continue;
      (dias[m.fecha] = dias[m.fecha] || []).push(m);
    }
    return Object.keys(dias).sort().reverse().map(function (f) {
      const movs = dias[f].sort(function (a, b) { return (b.creado || 0) - (a.creado || 0); });
      let neto = 0;
      for (const m of movs) if (m.tipo !== 'transferencia') neto += (m.tipo === 'ingreso' ? 1 : -1) * aSolesPropio(m);
      return { fecha: f, movs: movs, neto: neto };
    });
  }

  // Topes en soles; los gastos en dólares entran convertidos.
  function presupuestoMes(estado, mes) {
    const gastado = {};
    for (const m of estado.movs) {
      if (m.tipo !== 'gasto' || mesDe(m.fecha) !== mes) continue;
      gastado[m.cat] = (gastado[m.cat] || 0) + aSolesPropio(m);
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

  // ---------- cuentas por cobrar / por pagar ----------

  /* Cada apunte es una cantidad con signo: positivo = esa persona me debe más,
     negativo = le debo más a esa persona. Un pago es otro apunte (`pago: true`)
     con el signo contrario, así el saldo siempre es la suma y nada se borra. */
  function claveDe(nombre) { return String(nombre || '').trim().toLowerCase(); }

  function tipoDeuda(d) {
    if (d.pago) return d.monto < 0 ? 'mepago' : 'lepague';
    return d.monto > 0 ? 'medebe' : 'ledebo';
  }
  const ROTULO_DEUDA = { medebe: 'Me debe', ledebo: 'Le debo', mepago: 'Me pagó', lepague: 'Le pagué' };

  // Una fila por persona con su saldo en cada moneda y sus apuntes, lo nuevo arriba.
  function deudasPorPersona(estado) {
    const por = {};
    for (const d of estado.deudas || []) {
      const k = claveDe(d.persona);
      const f = por[k] = por[k] || { clave: k, nombre: d.persona, saldo: { PEN: 0, USD: 0 }, apuntes: [] };
      f.saldo[d.mon] += d.monto;
      f.apuntes.push(d);
    }
    return Object.keys(por).map(function (k) {
      const f = por[k];
      f.apuntes.sort(function (a, b) {
        return a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : (b.creado || 0) - (a.creado || 0);
      });
      f.nombre = f.apuntes[0].persona;
      f.pendiente = f.saldo.PEN !== 0 || f.saldo.USD !== 0;
      return f;
    }).sort(function (a, b) {
      if (a.pendiente !== b.pendiente) return a.pendiente ? -1 : 1;
      const peso = function (f) { return Math.abs(f.saldo.PEN) + Math.round(Math.abs(f.saldo.USD) * estado.tc); };
      return peso(b) - peso(a);
    });
  }

  /* Lo que sigue abierto de una persona: el saldo se explica con los conceptos más
     recientes en ese sentido; lo más antiguo es lo que ya se fue pagando. Devuelve
     cada concepto con lo que le falta, lo más nuevo arriba. Sirve para decir "de qué"
     es lo que queda, no solo cuánto. */
  function abiertos(f) {
    const r = [];
    for (const mon of ['PEN', 'USD']) {
      const saldo = f.saldo[mon];
      if (!saldo) continue;
      const dir = saldo > 0 ? 1 : -1;
      let falta = Math.abs(saldo);
      for (const a of f.apuntes) {   // ya vienen de lo más nuevo a lo más viejo
        if (a.mon !== mon || a.pago || a.monto * dir <= 0 || falta <= 0) continue;
        const parte = Math.min(falta, Math.abs(a.monto));
        falta -= parte;
        r.push({ apunte: a, resto: dir * parte, mon: mon });
      }
    }
    return r;
  }

  /* Reparte un gasto entre los demás y yo. `lista` trae a cada persona con su parte
     fija (en céntimos) o null; los que no la tienen se reparten en partes iguales
     con yo lo que quede. A cada persona se le sube a la siguiente décima (8.33 → 8.40):
     el redondeo va a favor de quien pagó, y lo que reste es mi parte. */
  function repartir(monto, lista) {
    const vacio = { ok: false, error: '', partes: [], mia: null };
    if (!monto || !lista.length) return vacio;
    let fijos = 0, libres = 0;
    for (const x of lista) { if (x.fijo) fijos += x.fijo; else libres++; }
    const resto = monto - fijos;
    if (resto < 0) return { ok: false, error: 'Lo que les toca a ellos suma más que el gasto.', partes: [], mia: null };
    let base = Math.ceil(resto / (libres + 1) / 10) * 10;
    if (base * libres > resto) base = Math.floor(resto / (libres + 1));   // no alcanza para redondear: reparto exacto
    const partes = lista.map(function (x) { return { persona: x.persona, monto: x.fijo || base }; });
    if (partes.some(function (p) { return p.monto <= 0; })) return { ok: false, error: 'Es muy poco para repartirlo.', partes: [], mia: null };
    let suman = 0;
    for (const p of partes) suman += p.monto;
    return { ok: true, error: '', partes: partes, mia: monto - suman };
  }

  /* Deja las deudas de un gasto compartido como dicen sus `partes`: borra las que
     había de ese gasto y las crea de nuevo. Los pagos son apuntes aparte y no se tocan. */
  function sincronizarPartes(estado, m) {
    estado.deudas = estado.deudas.filter(function (d) { return d.mov !== m.id; });
    for (const p of m.partes || []) {
      const previa = estado.deudas.filter(function (x) { return claveDe(x.persona) === claveDe(p.persona); })[0];
      estado.deudas.push({
        id: uid(), persona: previa ? previa.persona : p.persona, monto: p.monto, mon: m.mon,
        nota: m.nota || nombreCat(estado, 'gasto', m.cat), fecha: m.fecha, pago: false, creado: m.creado || Date.now(), mov: m.id
      });
    }
  }

  // Lo que me deben y lo que debo, sumado por moneda.
  function totalDeudas(estado) {
    const r = { meDeben: { PEN: 0, USD: 0 }, debo: { PEN: 0, USD: 0 } };
    for (const f of deudasPorPersona(estado)) {
      for (const mon of ['PEN', 'USD']) {
        if (f.saldo[mon] > 0) r.meDeben[mon] += f.saldo[mon];
        else r.debo[mon] -= f.saldo[mon];
      }
    }
    return r;
  }

  // "S/ 12.50 · US$ 3.00" con lo que queda en cada moneda, o "Saldado".
  function textoSaldo(saldo) {
    const t = [];
    for (const mon of ['PEN', 'USD']) if (saldo[mon]) t.push(fmt(Math.abs(saldo[mon]), mon));
    return t.length ? t.join(' · ') : 'Saldado';
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
      cuentas: [], movs: [], topes: {}, metas: [], deudas: [],
      ultimoRespaldo: typeof o.ultimoRespaldo === 'string' ? o.ultimoRespaldo : null
    };
    for (const c of Array.isArray(o.cuentas) ? o.cuentas : []) {
      if (!c || !texto(c.id) || !texto(c.nombre).trim() || !SIMBOLO[c.mon]) continue;
      e.cuentas.push({ id: c.id, nombre: texto(c.nombre.trim(), 40), mon: c.mon, inicial: entero(c.inicial) ? c.inicial : 0 });
    }
    if (!e.cuentas.length) e.cuentas = base.cuentas;   // respaldos de antes de que hubiera cuentas
    for (const m of o.movs) {
      if (!m || (m.tipo !== 'gasto' && m.tipo !== 'ingreso' && m.tipo !== 'transferencia')) continue;
      if (!entero(m.monto) || m.monto <= 0 || !SIMBOLO[m.mon] || !FECHA.test(m.fecha)) continue;
      const cta = cuentaDe(e, m.cuenta) || e.cuentas[0];
      const limpio = {
        id: texto(m.id) || uid(), tipo: m.tipo, monto: m.monto, mon: m.mon,
        tc: typeof m.tc === 'number' && m.tc > 0 ? m.tc : e.tc,
        cuenta: cta.id, cat: texto(m.cat), nota: texto(m.nota, 200), fecha: m.fecha,
        creado: typeof m.creado === 'number' ? m.creado : 0
      };
      if (m.tipo === 'gasto' && Array.isArray(m.partes) && m.partes.length) {
        const partes = m.partes.filter(function (p) { return p && texto(p.persona).trim() && entero(p.monto) && p.monto > 0; })
          .map(function (p) { return { persona: texto(p.persona.trim(), 40), monto: p.monto }; });
        let suman = 0;
        for (const p of partes) suman += p.monto;
        if (partes.length === m.partes.length && suman <= m.monto) limpio.partes = partes;
      }
      if (m.tipo === 'transferencia') {
        const dest = cuentaDe(e, m.destino);
        if (!dest || dest.id === cta.id) continue;
        limpio.mon = cta.mon;
        limpio.cat = '';
        limpio.destino = dest.id;
        limpio.llega = entero(m.llega) && m.llega > 0 ? m.llega : convertir(m.monto, cta.mon, dest.mon, limpio.tc);
        if (m.estimado && cta.mon !== dest.mon) limpio.estimado = true;
      } else if (cta.mon !== m.mon) {
        // pagado en una moneda desde una cuenta en otra: se guarda lo que movió en la cuenta
        const sabe = entero(m.cobrado) && m.cobrado > 0 && m.monCuenta === cta.mon;
        limpio.monCuenta = cta.mon;
        limpio.cobrado = sabe ? m.cobrado : convertir(m.monto, m.mon, cta.mon, limpio.tc);
        if (!sabe || m.estimado) limpio.estimado = true;
      }
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
    for (const d of Array.isArray(o.deudas) ? o.deudas : []) {
      if (!d || !texto(d.persona).trim() || !entero(d.monto) || d.monto === 0 || !SIMBOLO[d.mon] || !FECHA.test(d.fecha)) continue;
      const ap = {
        id: texto(d.id) || uid(), persona: texto(d.persona.trim(), 40), monto: d.monto, mon: d.mon,
        nota: texto(d.nota, 200), fecha: d.fecha, pago: d.pago === true, creado: typeof d.creado === 'number' ? d.creado : 0
      };
      const cta = d.pago === true ? cuentaDe(e, d.cuenta) : null;
      if (cta && cta.mon === d.mon) ap.cuenta = cta.id;
      const gasto = typeof d.mov === 'string' ? e.movs.filter(function (m) { return m.id === d.mov && m.partes; })[0] : null;
      if (gasto && d.pago !== true) ap.mov = gasto.id;
      e.deudas.push(ap);
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
      const cta = (cuentaDe(estado, m.cuenta) || {}).nombre || '';
      if (m.tipo === 'transferencia') {
        filas.push([m.fecha, 'Transferencia', cta + ' → ' + ((cuentaDe(estado, m.destino) || {}).nombre || ''), '',
          m.nota || '', m.mon, plata(m.monto), m.mon === 'USD' ? m.tc : '', plata(aSoles(m))]);
      } else {
        filas.push([m.fecha, m.tipo === 'ingreso' ? 'Ingreso' : 'Gasto', cta, nombreCat(estado, m.tipo, m.cat),
          m.nota || '', m.mon, plata(m.monto), m.mon === 'USD' ? m.tc : '', plata(aSoles(m))]);
      }
    }
    for (const g of estado.metas) {
      for (const a of g.aportes) {
        filas.push([a.fecha, a.monto < 0 ? 'Retiro de ahorro' : 'Ahorro', '', g.nombre, a.nota || '', g.mon,
          plata(a.monto), g.mon === 'USD' ? a.tc : '', plata(aSoles({ monto: a.monto, mon: g.mon, tc: a.tc }))]);
      }
    }
    for (const d of estado.deudas || []) {
      filas.push([d.fecha, ROTULO_DEUDA[tipoDeuda(d)], d.persona, '', d.nota || '', d.mon, plata(d.monto),
        d.mon === 'USD' ? estado.tc : '', '']);
    }
    filas.sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0; });
    filas.unshift(['Fecha', 'Tipo', 'Cuenta', 'Categoría o persona', 'Nota', 'Moneda', 'Monto', 'Tipo de cambio', 'Monto en soles']);
    return '﻿' + filas.map(function (f) { return f.map(celda).join(';'); }).join('\r\n') + '\r\n';
  }

  // Datos de muestra para ver la app llena (index.html?demo). No se guardan.
  function demo(hoy) {
    const e = estadoInicial();
    const mes = mesDe(hoy), antes = moverMes(mes, -1);
    const dia = function (m, d) { return m + '-' + dos(d); };
    let n = 0;
    e.tc = 3.52;
    e.cuentas[0].inicial = 250000; e.cuentas[1].inicial = 180000; e.cuentas[2].inicial = 41000; e.cuentas[3].inicial = 20000;
    const mov = function (tipo, plata, cat, nota, fecha, mon, cuenta) {
      const m = { id: 'd' + (++n), tipo: tipo, monto: Math.round(plata * 100), mon: mon || 'PEN', tc: e.tc,
        cuenta: cuenta || 'k-bcp', cat: cat, nota: nota, fecha: fecha, creado: n };
      const cta = cuentaDe(e, m.cuenta);
      if (cta.mon !== m.mon) { m.monCuenta = cta.mon; m.cobrado = convertir(m.monto, m.mon, cta.mon, e.tc); m.estimado = true; }
      e.movs.push(m);
    };
    mov('ingreso', 4800, 'i-sueldo', 'Quincena y fin de mes', dia(mes, 1));
    mov('ingreso', 320, 'i-honorarios', 'Renders para un cliente', dia(mes, 1), 'USD', 'k-paypal');
    mov('gasto', 1400, 'c-casa', 'Alquiler', dia(mes, 1));
    mov('gasto', 286.4, 'c-mercado', 'Compra de la semana', dia(mes, 1), 'PEN', 'k-scotiabank');
    mov('gasto', 18, 'c-comida', 'Menú', dia(mes, 1), 'PEN', 'k-efectivo');
    mov('gasto', 24.5, 'c-transporte', 'Taxi', dia(mes, 1));
    e.movs[e.movs.length - 1].partes = [{ persona: 'Andrea', monto: 1225 }];
    mov('gasto', 20, 'c-suscripciones', 'Claude', dia(mes, 1), 'USD');
    mov('gasto', 189.9, 'c-servicios', 'Luz e internet', dia(mes, 1));
    mov('gasto', 95, 'c-ocio', 'Cine y cena', dia(mes, 1), 'PEN', 'k-scotiabank');
    e.movs.push({ id: 'd' + (++n), tipo: 'transferencia', monto: 15000, mon: 'USD', tc: e.tc, cuenta: 'k-paypal', destino: 'k-bcp',
      llega: 52100, cat: '', nota: 'Retiro a mi cuenta', fecha: dia(mes, 1), creado: n });
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
    e.deudas = [
      { id: 'q1', persona: 'Andrea', monto: 1225, mon: 'PEN', nota: 'Taxi', fecha: dia(mes, 1), pago: false, creado: 1, mov: 'd6' },
      { id: 'q2', persona: 'Andrea', monto: 900, mon: 'PEN', nota: 'Taxi de regreso', fecha: dia(antes, 20), pago: false, creado: 2 },
      { id: 'q3', persona: 'Andrea', monto: -900, mon: 'PEN', nota: '', fecha: dia(mes, 1), pago: true, creado: 3 },
      { id: 'q4', persona: 'Mamá', monto: -4500, mon: 'PEN', nota: 'Mi parte del regalo', fecha: dia(antes, 8), pago: false, creado: 4 }
    ];
    return e;
  }

  return {
    VERSION: VERSION, SIMBOLO: SIMBOLO, uid: uid, hoyISO: hoyISO, mesDe: mesDe, moverMes: moverMes,
    nombreMes: nombreMes, etiquetaDia: etiquetaDia, fechaCorta: fechaCorta, parseMonto: parseMonto,
    parseCambio: parseCambio, partes: partes, fmt: fmt, aTexto: aTexto, aSoles: aSoles,
    convertir: convertir, enCuenta: enCuenta, cuentaDe: cuentaDe, usosCuenta: usosCuenta, saldos: saldos,
    estadoInicial: estadoInicial, nombreCat: nombreCat, usosCat: usosCat, resumenMes: resumenMes,
    diasDelMes: diasDelMes, presupuestoMes: presupuestoMes, progresoMeta: progresoMeta,
    tipoDeuda: tipoDeuda, ROTULO_DEUDA: ROTULO_DEUDA, deudasPorPersona: deudasPorPersona, abiertos: abiertos, propio: propio, aSolesPropio: aSolesPropio,
    repartir: repartir, sincronizarPartes: sincronizarPartes,
    totalDeudas: totalDeudas, textoSaldo: textoSaldo, claveDe: claveDe,
    validar: validar, aCSV: aCSV, demo: demo
  };
});
