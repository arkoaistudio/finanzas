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
    { id: '1', tipo: 'ingreso', monto: 500000, mon: 'PEN', cat: 'i-sueldo', nota: '', fecha: '2026-10-01', creado: 1 },
    { id: '2', tipo: 'ingreso', monto: 10000, mon: 'USD', tc: 3.5, cat: 'i-honorarios', nota: '', fecha: '2026-10-02', creado: 2 },
    { id: '3', tipo: 'gasto', monto: 30000, mon: 'PEN', cat: 'c-comida', nota: '', fecha: '2026-10-03', creado: 3 },
    { id: '4', tipo: 'gasto', monto: 2000, mon: 'USD', tc: 4, cat: 'c-comida', nota: 'a "prueba"; rara', fecha: '2026-10-03', creado: 4 },
    { id: '5', tipo: 'gasto', monto: 10000, mon: 'PEN', cat: 'c-ocio', nota: '', fecha: '2026-10-05', creado: 5 },
    { id: '6', tipo: 'gasto', monto: 99900, mon: 'PEN', cat: 'c-ocio', nota: '', fecha: '2026-09-30', creado: 6 }
  ];
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
  assert.equal(lineas[0], 'Fecha;Tipo;Categoría;Nota;Moneda;Monto;Tipo de cambio;Monto en soles');
  assert.equal(lineas.length, 1 + 6 + 3);
  assert.ok(lineas[1].startsWith('2026-09-10;Ahorro;Viaje'));
  assert.ok(csv.includes('2026-10-03;Gasto;Comida;"a ""prueba""; rara";USD;20.00;4;80.00'));
  assert.ok(csv.includes('2026-10-06;Retiro de ahorro;Viaje;;USD;-50.00;3.5;-175.00'));
});

test('demo: es un estado válido', () => {
  const d = L.demo('2026-10-01');
  assert.deepEqual(L.validar(JSON.parse(JSON.stringify(d))).estado, d);
});
