# Finanzas

App personal para el celular: gastos e ingresos, presupuesto mensual por
categoría y metas de ahorro, en soles y dólares. Es una página que se instala
como app (PWA). No tiene servidor ni cuentas: **los datos viven solo en el
celular**, en el almacenamiento del navegador.

No es del estudio. Vive aparte de `jc\estudio` a propósito.

## Archivos

- `index.html`, `estilo.css` — la página y el estilo (editorial suizo).
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
- **Dólares.** Cada movimiento guarda el tipo de cambio con que se anotó, así
  cambiar el tipo de cambio no mueve los meses pasados.
- **Actualizar la app.** Al publicar cambios, subir el número de `CACHE` en
  `sw.js`. En el celular el cambio aparece la segunda vez que se abre.
- **Ícono.** Sale de `iconos/icono.html` con una captura de Edge sin ventana
  (`--headless=new --screenshot`) a 180, 192 y 512 px.
- Montos siempre en céntimos enteros. Los topes del presupuesto van en soles
  y son los mismos todos los meses.

## Lo que no hace (todavía)

- Movimientos que se repiten solos (alquiler, sueldo).
- Saldos por cuenta o tarjeta, ni cuotas.
- Sincronizar entre aparatos.
