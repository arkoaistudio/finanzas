# Oink (Finanzas)

App personal para el celular (se llama Oink: chanchito negro, prima de `jc\oink`): gastos e ingresos por cuenta (BCP, Scotiabank,
PayPal…), presupuesto mensual por categoría y metas de ahorro, en soles y dólares. Es una página que se instala
como app (PWA). No tiene servidor ni cuentas: **los datos viven solo en el
celular**, en el almacenamiento del navegador.

No es del estudio. Vive aparte de `jc\estudio` a propósito.

## Archivos

- `index.html`, `estilo.css` — la página y el estilo (negro con acento lima; Inter Tight y Caveat para frases cortas).
- `logica.js` — montos, fechas, resúmenes y respaldo. Sin nada de pantalla.
- `app.js` — las pantallas y los formularios.
- `sw.js` — deja la app funcionando sin internet.
- `manifest.webmanifest`, `iconos/` — lo que la hace instalable.
- `pruebas/` — pruebas de la lógica y de uso.

No hay paso de compilación ni dependencias.

## Verla en la PC

    node pruebas/servidor.js

Y abrir http://127.0.0.1:8377/?demo — `?demo` carga datos de muestra y no
guarda nada. Sin `?demo` es la app real (guarda en ese navegador).

## Pruebas

    node --test pruebas/logica.test.js

La prueba de uso corre en el navegador: con el servidor prendido, abrir
http://127.0.0.1:8377/_uso.html. Anota, edita y borra como una persona y
deja el resultado en `pruebas/resultado.json`. Ojo: borra los datos de la app
en ese navegador (solo en 127.0.0.1, no toca el celular).

## Instalarla en el iPhone

Tiene que estar publicada con https (GitHub Pages sirve y es gratis).

1. Abrir la dirección en **Safari**.
2. Compartir → **Agregar a pantalla de inicio**.
3. Abrirla siempre desde ese ícono. Safari y la app instalada guardan datos
   por separado: lo que se anote en Safari no aparece en la app.

## Cosas a tener presentes

- **Respaldo.** Ajustes → Guardar respaldo, y dejar el archivo en Archivos o
  iCloud. Si se borra la app o se pierde el celular, es lo único que recupera
  los datos. La app lo recuerda cuando pasan 14 días.
- **Cuentas.** Cada movimiento sale o entra de una cuenta, y cada cuenta tiene
  su moneda y un saldo inicial. El saldo es inicial + ingresos − gastos ±
  transferencias. El total va en soles, con los dólares al cambio de Ajustes.
- **Pagar en dólares con una cuenta en soles** (Claude con la tarjeta BCP): se
  anota el precio en dólares y la app estima los soles (`estimado: true`, "por
  confirmar"). Al editar y poner lo que cobró el banco (`cobrado`), ese monto
  es el que vale para el saldo, el resumen y el presupuesto.
- **Transferencias** entre cuentas: no son ingreso ni gasto. Si las monedas son
  distintas se anota cuánto llegó (`llega`).
- **Dólares.** Cada movimiento guarda el tipo de cambio con que se anotó, así
  cambiar el tipo de cambio no mueve los meses pasados.
- **Metas.** Los aportes no se descuentan de ninguna cuenta: son plata apartada
  que sigue en el banco. Sí se restan de lo que "queda este mes".
- **Personas (por cobrar y por pagar).** Pantalla `#deudas`, enlazada desde el Resumen. Un apunte nunca cuenta como ingreso ni gasto. Cada apunte es un monto con signo (`+` me debe, `−` le debo); un pago es otro apunte con `pago: true` y signo contrario, así el saldo por persona y moneda es siempre la suma y nada se borra. Los nombres se agrupan sin mirar mayúsculas. "Lo que falta" explica el saldo con los conceptos más recientes (`abiertos` en `logica.js`); lo más viejo se da por pagado primero.
- **Gastos compartidos.** En un gasto, "Compartido con" marca a las personas; se reparte en partes iguales contigo (a cada persona se le sube a la siguiente décima, 8.33 → 8.40, y lo que reste es mi parte) o con la parte que se escriba a mano, y las deudas se crean solas (`partes` en el movimiento, `mov` en cada apunte). La cuenta paga el monto entero, pero el presupuesto, el resumen y el neto del día usan solo lo mío (`propio`, `aSolesPropio`). Editar el gasto rehace sus deudas (`sincronizarPartes`); borrarlo las borra, pero no los pagos ya anotados.
- **Editar personas.** En la ficha, "Editar": renombra (en apuntes y gastos compartidos; si el nombre ya es de otra persona, se juntan) o elimina con todo su historial. Al eliminar, sus pagos que entraron a una cuenta se quitan y los gastos compartidos con ella vuelven a contar completos como tuyos.
- **Pagos a una cuenta.** Un pago puede ligarse a una cuenta de la misma moneda (`cuenta` en el apunte): `saldos` la sube o baja; sin cuenta solo cambia lo que se debe. "Saldar" propone la cuenta con la que se pagó el gasto.
- **Arkos.** Un gasto o ingreso puede ser "De Arkos" (`arkos: true`): usa sus
  propias categorías (`arkosGasto`, `arkosIngreso`) y cuenta en el resumen y en el
  neto del día como cualquier otro (la plata es mía); en "Gasto por categoría" sale
  como "Arkos · …". No entra al presupuesto. Con "Fuera de mis cuentas" (`cuenta: ''`,
  solo para Arkos) cuenta en su mes pero no mueve ningún saldo: es para lo de antes
  de usar la app. La pantalla `#arkos` (enlazada desde el Resumen) muestra solo Arkos:
  resultado del mes, acumulado y mes a mes (`flujoArkos`). En Movimientos, el filtro
  "Solo Arkos". No se comparte con personas.
- **Agregar desde archivo.** Ajustes → "Agregar desde archivo" suma los movimientos
  de un JSON (`agregar` en `logica.js`) sin borrar nada: categorías por nombre (crea
  las que faltan) y salta los ids que ya están. Restaurar rechaza esos archivos
  (`agregar: true`) para no reemplazar todo por error. Los historiales con datos
  reales no van en este repo, que es público.
- **Versión de los datos.** Va en `VERSION` de `logica.js` (hoy 5). `validar`
  migra lo guardado y los respaldos de versiones anteriores.
- **Actualizar la app.** Al publicar cambios, subir el número de `CACHE` en
  `sw.js`. En el celular el cambio aparece la segunda vez que se abre.
- **Ícono.** Sale de `iconos/icono.html` con una captura de Edge sin ventana a 1024 px,
  reducida después a 180, 192 y 512. Ojo: Edge sin ventana no baja de ~500 px de ancho;
  capturar directo a 180 saca el ícono recortado.
- Montos siempre en céntimos enteros. Los topes del presupuesto van en soles
  y son los mismos todos los meses.

- **Ojito.** En "Tu plata hoy" tapa el total, lo que queda y las cuentas. Se guarda en
  `finanzas.ocultar` del navegador, no en el respaldo.
- **Yape y Plin** (`medios`): botones rápidos al anotar (`m:yape` en el formulario). El
  movimiento sale de la cuenta asignada (Ajustes → Yape y Plin) y guarda `medio`. Se filtran
  en Movimientos.
- **Suscripciones** (`subs`, pantalla `#subs`): lo que se repite cada mes, cobros o lo que
  llega (el sueldo). El día que toca y desde 3 días antes aparecen en el Inicio: Confirmar crea
  el movimiento con `sub` (si es en dólares desde una cuenta en soles queda por confirmar),
  Otro monto abre el formulario y No este mes la deja en `saltadas`. Una nueva cuyo día ya
  pasó arranca el mes siguiente (`desde`).
- **Devoluciones** (`tipo: 'devolucion'`): vuelve a la cuenta y se resta de lo gastado, de
  su categoría y del tope. No es ingreso. Desde un gasto: "Me devolvieron algo de esto".
- **Buscador** (`#buscar`): todos los meses, sin tildes ni mayúsculas (`buscar`).

## Lo que no hace (todavía)

- Compartir un gasto que ya pagó otra persona (hoy se anota a mano como "Le debo").
- Tarjetas de crédito como deuda, ni cuotas. El saldo inicial de una cuenta no
  puede ser negativo (el teclado numérico del iPhone no tiene signo menos).
- Sincronizar entre aparatos.
