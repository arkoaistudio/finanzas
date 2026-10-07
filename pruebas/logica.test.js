// Pruebas de la lógica. Se corren con:  node --test pruebas/logica.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../logica.js');

test('parseMonto: punto y coma decimal, miles y basura', () => {
  assert.equal(L.parseMonto('18'), 1800);
  assert.equal(L.parseMonto('18.35'), 1835);
  assert.equal(L.parseMonto('18,35'), 1835);
  assert.equal(L.parseMonto('12,5'), 1250);
  assert.equal(L.parseMonto('1,250'), 125000);
  assert.equal(L.parseMonto('1,250.50'), 125050);
  assert.equal(L.parseMonto('1.250,50'), 125050);
  assert.equal(L.parseMonto('1.250.000'), 125000000);
  assert.equal(L.parseMonto('S/ 2 300.10'), 230010);
  assert.equal(L.parseMonto('0.29'), 29);
  assert.equal(L.parseMonto(''), null);
  assert.equal(L.parseMonto('0'), null);
  assert.equal(L.parseMonto('abc'), null);
  assert.equal(L.parseMonto(','), null);
});

test('fmt: miles con coma, dos decimales y negativos', () => {
  assert.equal(L.fmt(125050, 'PEN'), 'S/ 1,250.50');
  assert.equal(L.fmt(5, 'USD'), 'US$ 0.05');
  assert.equal(L.fmt(-123456789, 'PEN'), '− S/ 1,234,567.89');
  assert.equal(L.fmt(0, 'PEN'), 'S/ 0.00');
});

test('moverMes cruza el año en ambos sentidos', () => {
  assert.equal(L.moverMes('2026-12', 1), '2027-01');
  assert.equal(L.moverMes('2026-01', -1), '2025-12');
  assert.equal(L.moverMes('2026-10', 9), '2027-07');
  assert.equal(L.moverMes('2026-10', -22), '2024-12');
});

test('fechas en hora local', () => {
  assert.equal(L.hoyISO(new Date(2026, 9, 1, 23, 50)), '2026-10-01');
  assert.equal(L.etiquetaDia('2026-10-01'), 'jue 01 oct');
  assert.equal(L.nombreMes('2026-09').nombre, 'Setiembre');
});

function base() {
  const e = L.estadoInicial();
  e.movs = [
    { id: '1', tipo: 'ingreso', monto: 500000, mon: 'PEN', tc: 3.5, cuenta: 'k-bcp', cat: 'i-sueldo', nota: '', fecha: '2026-10-01', creado: 1 },
    { id: '2', tipo: 'ingreso', monto: 10000, mon: 'USD', tc: 3.5, cuenta: 'k-paypal', cat: 'i-honorarios', nota: '', fecha: '2026-10-02', creado: 2 },
    { id: '3', tipo: 'gasto', monto: 30000, mon: 'PEN', tc: 3.5, cuenta: 'k-scotiabank', cat: 'c-comida', nota: '', fecha: '2026-10-03', creado: 3 },
    // US$ 20 pagados con BCP: el banco cobró S/ 80.00
    { id: '4', tipo: 'gasto', monto: 2000, mon: 'USD', tc: 3.5, cuenta: 'k-bcp', monCuenta: 'PEN', cobrado: 8000, cat: 'c-comida', nota: 'a "prueba"; rara', fecha: '2026-10-03', creado: 4 },
    { id: '5', tipo: 'gasto', monto: 10000, mon: 'PEN', tc: 3.5, cuenta: 'k-bcp', cat: 'c-ocio', nota: '', fecha: '2026-10-05', creado: 5 },
    { id: '6', tipo: 'gasto', monto: 99900, mon: 'PEN', tc: 3.5, cuenta: 'k-bcp', cat: 'c-ocio', nota: '', fecha: '2026-09-30', creado: 6 }
  ];
  e.cuentas[0].inicial = 100000;
  e.topes = { 'c-comida': 35000, 'c-ocio': 20000 };
  e.metas = [{
    id: 'g', nombre: 'Viaje', objetivo: 100000, mon: 'USD', fecha: '2027-03-15',
    aportes: [
      { id: 'a', monto: 20000, fecha: '2026-10-04', nota: '', tc: 3.5 },
      { id: 'b', monto: -5000, fecha: '2026-10-06', nota: '', tc: 3.5 },
      { id: 'c', monto: 10000, fecha: '2026-09-10', nota: '', tc: 3.5 }
    ]
  }];
  return e;
}

test('resumenMes: separa monedas y convierte al cambio de cada movimiento', () => {
  const r = L.resumenMes(base(), '2026-10');
  assert.deepEqual(r.ingresos, { PEN: 500000, USD: 10000, total: 535000 });
  assert.deepEqual(r.gastos, { PEN: 40000, USD: 2000, total: 48000 });
  assert.equal(r.ahorro, 52500);               // (200 − 50) US$ × 3.5
  assert.equal(r.queda, 535000 - 48000 - 52500);
  assert.equal(r.n, 5);
  assert.deepEqual(r.porCategoria.map(c => [c.nombre, c.total, c.pct]),
    [['Comida', 38000, 79], ['Ocio', 10000, 21]]);
});

test('resumenMes de un mes vacío', () => {
  const r = L.resumenMes(base(), '2026-01');
  assert.equal(r.queda, 0);
  assert.equal(r.n, 0);
  assert.deepEqual(r.porCategoria, []);
});

test('diasDelMes: agrupa por día, lo más reciente arriba, y filtra', () => {
  const d = L.diasDelMes(base(), '2026-10', 'todo');
  assert.deepEqual(d.map(x => x.fecha), ['2026-10-05', '2026-10-03', '2026-10-02', '2026-10-01']);
  assert.deepEqual(d[1].movs.map(m => m.id), ['4', '3']);
  assert.equal(d[1].neto, -38000);
  assert.equal(L.diasDelMes(base(), '2026-10', 'ingreso').length, 2);
});

test('presupuestoMes: topes, pasados y disponible', () => {
  const p = L.presupuestoMes(base(), '2026-10');
  const comida = p.filas.find(f => f.cat === 'c-comida');
  const ocio = p.filas.find(f => f.cat === 'c-ocio');
  assert.equal(comida.gastado, 38000);
  assert.equal(comida.pasado, true);
  assert.equal(comida.resto, -3000);
  assert.equal(comida.pct, 100);
  assert.equal(ocio.pasado, false);
  assert.equal(ocio.pct, 50);
  assert.equal(p.topeTotal, 55000);
  assert.equal(p.disponible, 55000 - 48000);
  assert.equal(p.filas.find(f => f.cat === 'c-casa').tope, 0);
});

test('progresoMeta: acumulado, meses y cuota', () => {
  const m = base().metas[0];
  const p = L.progresoMeta(m, '2026-10-01');
  assert.equal(p.acumulado, 25000);
  assert.equal(p.pct, 25);
  assert.equal(p.falta, 75000);
  assert.equal(p.meses, 6);                    // de octubre a marzo
  assert.equal(p.porMes, 12500);
  assert.equal(L.progresoMeta(m, '2027-04-01').vencida, true);
  const lograda = L.progresoMeta({ objetivo: 100, mon: 'PEN', fecha: '', aportes: [{ monto: 150 }] }, '2026-10-01');
  assert.equal(lograda.pct, 100);
  assert.equal(lograda.lograda, true);
});

test('respaldo: ida y vuelta sin perder nada', () => {
  const e = base();
  const r = L.validar(JSON.parse(JSON.stringify(e)));
  assert.equal(r.ok, true);
  assert.deepEqual(r.estado, e);
});

test('respaldo: rechaza lo ajeno y descarta filas dañadas', () => {
  assert.equal(L.validar(null).ok, false);
  assert.equal(L.validar({ hola: 1 }).ok, false);
  assert.equal(L.validar({ v: 99, movs: [] }).ok, false);
  const r = L.validar({
    v: 1, movs: [
      { tipo: 'gasto', monto: 12.5, mon: 'PEN', fecha: '2026-10-01' },
      { tipo: 'gasto', monto: 100, mon: 'EUR', fecha: '2026-10-01' },
      { tipo: 'gasto', monto: 100, mon: 'PEN', fecha: 'ayer' },
      { tipo: 'regalo', monto: 100, mon: 'PEN', fecha: '2026-10-01' },
      { tipo: 'gasto', monto: 100, mon: 'PEN', fecha: '2026-10-01', cat: 'c-comida' }
    ], metas: 'x', topes: { 'c-comida': -5, 'c-ocio': 1000 }
  });
  assert.equal(r.ok, true);
  assert.equal(r.estado.movs.length, 1);
  assert.deepEqual(r.estado.topes, { 'c-ocio': 1000 });
  assert.equal(r.estado.categorias.gasto.length, 10);
});

test('aCSV: orden por fecha, comillas y ahorro incluido', () => {
  const csv = L.aCSV(base());
  const lineas = csv.replace('﻿', '').trim().split('\r\n');
  assert.equal(lineas[0], 'Fecha;Tipo;Cuenta;Categoría o persona;Nota;Moneda;Monto;Tipo de cambio;Monto en soles');
  assert.equal(lineas.length, 1 + 6 + 3);
  assert.ok(lineas[1].startsWith('2026-09-10;Ahorro;;Viaje'));
  assert.ok(csv.includes('2026-10-03;Gasto;BCP;Comida;"a ""prueba""; rara";USD;20.00;3.5;80.00'));
  assert.ok(csv.includes('2026-10-06;Retiro de ahorro;;Viaje;;USD;-50.00;3.5;-175.00'));
});

test('demo: es un estado válido', () => {
  const d = L.demo('2026-10-01');
  assert.deepEqual(L.validar(JSON.parse(JSON.stringify(d))).estado, d);
});

test('saldos: cada cuenta en su moneda y el total en soles', () => {
  const e = base();
  e.movs.push({ id: 't', tipo: 'transferencia', monto: 5000, mon: 'USD', tc: 3.5, cuenta: 'k-paypal', destino: 'k-bcp', llega: 17200, cat: '', nota: '', fecha: '2026-10-06', creado: 7 });
  const s = L.saldos(e);
  const de = id => s.filas.find(f => f.id === id).saldo;
  assert.equal(de('k-bcp'), 100000 + 500000 - 8000 - 10000 - 99900 + 17200);
  assert.equal(de('k-scotiabank'), -30000);
  assert.equal(de('k-paypal'), 10000 - 5000);
  assert.equal(de('k-efectivo'), 0);
  assert.equal(s.USD, 5000);
  assert.equal(s.total, s.PEN + Math.round(5000 * e.tc));
  // la transferencia no cuenta como ingreso ni gasto
  assert.equal(L.resumenMes(e, '2026-10').queda, L.resumenMes(base(), '2026-10').queda);
  assert.equal(L.diasDelMes(e, '2026-10', 'todo', 'k-paypal').reduce((n, d) => n + d.movs.length, 0), 2);
});

test('dólares pagados desde una cuenta en soles: vale lo que cobró el banco', () => {
  const m = { tipo: 'gasto', monto: 2000, mon: 'USD', tc: 3.5, monCuenta: 'PEN', cobrado: 7183 };
  assert.equal(L.aSoles(m), 7183);
  assert.equal(L.enCuenta(m), 7183);
  assert.equal(L.aSoles({ monto: 2000, mon: 'USD', tc: 3.5 }), 7000);
  assert.equal(L.enCuenta({ monto: 2000, mon: 'USD', tc: 3.5 }), 2000);
  assert.equal(L.convertir(2000, 'USD', 'PEN', 3.5), 7000);
  assert.equal(L.convertir(7000, 'PEN', 'USD', 3.5), 2000);
});

test('respaldo de la versión anterior (sin cuentas) se migra', () => {
  const r = L.validar({
    v: 1, tc: 3.6, movs: [
      { id: 'a', tipo: 'gasto', monto: 1850, mon: 'PEN', cat: 'c-comida', nota: '', fecha: '2026-10-01', creado: 1 },
      { id: 'b', tipo: 'gasto', monto: 2000, mon: 'USD', tc: 3.6, cat: 'c-suscripciones', nota: '', fecha: '2026-10-01', creado: 2 }
    ]
  });
  assert.equal(r.ok, true);
  assert.equal(r.estado.v, L.VERSION);
  assert.deepEqual(r.estado.cuentas.map(c => c.nombre), ['BCP', 'Scotiabank', 'PayPal', 'Efectivo']);
  assert.equal(r.estado.movs[0].cuenta, 'k-bcp');
  assert.equal(r.estado.movs[1].cobrado, 7200);
  assert.equal(r.estado.movs[1].estimado, true);
  assert.equal(L.saldos(r.estado).filas[0].saldo, -1850 - 7200);
});

test('respaldo: transferencias mal formadas se descartan', () => {
  const r = L.validar({
    v: 2, movs: [
      { tipo: 'transferencia', monto: 100, mon: 'PEN', cuenta: 'k-bcp', destino: 'k-bcp', fecha: '2026-10-01' },
      { tipo: 'transferencia', monto: 100, mon: 'PEN', cuenta: 'k-bcp', destino: 'k-nada', fecha: '2026-10-01' },
      { tipo: 'transferencia', monto: 35000, mon: 'PEN', cuenta: 'k-bcp', destino: 'k-paypal', fecha: '2026-10-01', tc: 3.5 }
    ]
  });
  assert.equal(r.estado.movs.length, 1);
  assert.equal(r.estado.movs[0].llega, 10000);
});

test('deudas: el saldo por persona suma lo debido y los pagos, sin importar mayúsculas', () => {
  const e = L.estadoInicial();
  const ap = (persona, monto, mon, pago, fecha) =>
    e.deudas.push({ id: persona + fecha + monto, persona, monto, mon: mon || 'PEN', nota: '', fecha, pago: !!pago, creado: e.deudas.length });
  ap('Andrea', 1250, 'PEN', false, '2026-10-01');
  ap('andrea ', 900, 'PEN', false, '2026-10-03');
  ap('Andrea', -900, 'PEN', true, '2026-10-04');
  ap('Andrea', 500, 'USD', false, '2026-10-05');
  ap('Mamá', -4500, 'PEN', false, '2026-09-08');
  ap('Luis', 1000, 'PEN', false, '2026-09-01');
  ap('Luis', -1000, 'PEN', true, '2026-09-02');
  const f = L.deudasPorPersona(e);
  assert.deepEqual(f.map(x => x.nombre), ['Mamá', 'Andrea', 'Luis']);   // los pendientes primero, el saldado al final
  const andrea = f.find(x => x.clave === 'andrea');
  assert.deepEqual(andrea.saldo, { PEN: 1250, USD: 500 });
  assert.equal(andrea.apuntes.length, 4);
  assert.equal(f.find(x => x.clave === 'luis').pendiente, false);
  assert.equal(L.textoSaldo(andrea.saldo), 'S/ 12.50 · US$ 5.00');
  assert.equal(L.textoSaldo({ PEN: 0, USD: 0 }), 'Saldado');
  const t = L.totalDeudas(e);
  assert.deepEqual(t.meDeben, { PEN: 1250, USD: 500 });
  assert.deepEqual(t.debo, { PEN: 4500, USD: 0 });
});

test('deudas: tipo de cada apunte y paso por el respaldo', () => {
  const base = { persona: 'Andrea', mon: 'PEN', nota: 'Taxi', fecha: '2026-10-01' };
  assert.equal(L.tipoDeuda({ ...base, monto: 500, pago: false }), 'medebe');
  assert.equal(L.tipoDeuda({ ...base, monto: -500, pago: false }), 'ledebo');
  assert.equal(L.tipoDeuda({ ...base, monto: -500, pago: true }), 'mepago');
  assert.equal(L.tipoDeuda({ ...base, monto: 500, pago: true }), 'lepague');
  const r = L.validar({ movs: [], deudas: [
    { ...base, id: 'a', monto: 500 },
    { ...base, id: 'b', monto: 0 },                 // sin monto: se descarta
    { ...base, id: 'c', monto: 5.5 },               // decimales: se descarta
    { ...base, id: 'd', persona: '  ', monto: 100 }, // sin nombre: se descarta
    { ...base, id: 'e', monto: 100, mon: 'EUR' },   // moneda ajena: se descarta
    { ...base, id: 'f', monto: -100, fecha: 'ayer' }
  ] });
  assert.equal(r.ok, true);
  assert.deepEqual(r.estado.deudas.map(d => d.id), ['a']);
  assert.deepEqual(L.validar({ movs: [] }).estado.deudas, []);   // respaldos viejos no traen deudas
});

test('aCSV: las deudas salen con su rótulo', () => {
  const e = L.estadoInicial();
  e.deudas.push({ id: 'x', persona: 'Andrea', monto: 1250, mon: 'PEN', nota: 'Taxi', fecha: '2026-10-01', pago: false, creado: 1 });
  e.deudas.push({ id: 'y', persona: 'Andrea', monto: -1250, mon: 'PEN', nota: '', fecha: '2026-10-02', pago: true, creado: 2 });
  const l = L.aCSV(e).trim().split('\r\n');
  assert.equal(l[1], '2026-10-01;Me debe;Andrea;;Taxi;PEN;12.50;;');
  assert.equal(l[2], '2026-10-02;Me pagó;Andrea;;;PEN;-12.50;;');
});

test('deudas: los pagos descuentan primero lo más antiguo y queda lo que falta', () => {
  const e = L.estadoInicial();
  const ap = (monto, nota, fecha, pago) => e.deudas.push({ id: nota + fecha, persona: 'Andrea', monto, mon: 'PEN', nota, fecha, pago: !!pago, creado: e.deudas.length });
  ap(900, 'Taxi de regreso', '2026-09-20');
  ap(1250, 'Taxi al aeropuerto', '2026-10-01');
  ap(-1000, '', '2026-10-02', true);   // paga el primero y 100 del segundo
  const f = L.deudasPorPersona(e)[0];
  const ab = L.abiertos(f);
  assert.equal(ab.length, 1);
  assert.equal(ab[0].apunte.nota, 'Taxi al aeropuerto');
  assert.equal(ab[0].resto, 1150);
  ap(-1150, '', '2026-10-03', true);
  assert.deepEqual(L.abiertos(L.deudasPorPersona(e)[0]), []);   // saldado: nada abierto
  ap(-300, 'Cena', '2026-10-04');       // ahora yo le debo
  const deb = L.abiertos(L.deudasPorPersona(e)[0]);
  assert.equal(deb[0].resto, -300);
});
