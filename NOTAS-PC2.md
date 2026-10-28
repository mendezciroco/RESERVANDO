# Notas PC 2 — Panel del dueño

## Hecho
- `goles/panel.html` + `assets/js/panel.js`: entrada provisoria, encabezado, resumen de hoy y agenda F5/F7 con navegación de días.
- En vivo con `Store.alCambiar`: la reserva de un jugador dispara un aviso ("Nueva reserva de Martín — F5, 21 hs"),
  el destello del turno y de la tarjeta "Reservados", un sonido corto y el título de la pestaña, y la agenda va hasta el turno
  (cambia de día si hace falta).
- Reserva manual: al tocar un hueco libre se abre un formulario (nombre, teléfono, duración, seña en efectivo) que
  guarda con `Store.reservar({ ..., origen: 'manual', medioSena: 'efectivo' | null })`.
- Turnos fijos (pestaña dentro de la tarjeta de la agenda): estado vacío con invitación, formulario (cancha, día,
  hora, cantidad de horas, responsable, teléfono) con `Store.crearTurnoFijo`, lista por día de la semana y borrado con
  confirmación de dos toques (`Store.borrarTurnoFijo`).
- Acciones de cada reserva: al tocar el bloque se abre un detalle con Llamar / WhatsApp, "Vino" / "No vino"
  (`Store.marcarAsistencia`; tocar de nuevo la opción marcada la deshace) y "Seña cobrada en efectivo"
  (`Store.marcarSenaEfectivo`). Anda también sobre los días de un turno fijo. La agenda muestra ✓ / ✗ y tacha a quien no vino.
- Menú en el encabezado: Configuración, Lo que viene, Reiniciar demo y Salir.
- Configuración de solo vista, con los datos de `Store.complejo()`: precio por hora de cada cancha, horario, duración del
  turno, seña por hora, comisión de MP y cancelación.
- Reiniciar demo con confirmación (`Store.reiniciarDemo`). Como el reinicio borra las sesiones, el dueño vuelve a
  entrar solo (también si se reinicia desde otra pestaña o desde `prueba.html`), para no cortar la presentación.
- "Lo que viene" al final con `<div data-include="../componentes/proximamente.html">` (el componente trae su título).
- Identidad "Noche de cancha" de PC 3: Barlow Condensed + Inter, fondo `marca-claro`, oscuros con `marca-oscuro`, favicon.
  Sin grises sueltos: todo con tokens (más `white` en tarjetas y textos sobre fondo oscuro).

## Probado contra el Store real (28/10/2026)
Recorrido automático de 26 pasos con `panel.html` y `prueba.html` en dos iframes del mismo navegador: entrada,
resumen = Store, agenda completa, "Lo que viene" incluido, reserva desde `prueba.html` que llega en vivo con aviso y
destello, reserva manual (teléfono inválido, "011 15 …" y seña en efectivo), Vino / deshacer / No vino, seña en efectivo,
fijos vacíos, fijo que choca (muestra el error del Store), fijo válido bloqueado hoy y en 7 días, asistencia en un día
de fijo, borrado con confirmación, flechas y gestos de día, configuración, reiniciar (menú y `prueba.html`) y salir.
Todos OK y sin errores de JavaScript. Capturas a 390 px y 1366 px.

Arreglos que salieron de la prueba:
- El logo de GOLES es una placa ancha: se recortaba en el cuadrado ("OLE"). Ahora se muestra con su proporción.
- El menú usaba `x-transition`: al salir, Alpine esperaba esa transición para ocultar el panel y quedaba armado
  debajo de la entrada. Ahora el menú solo anima la entrada con CSS.
- En el celular, deslizar la tira de días también cambiaba el día de la agenda.

## Integración
- **28/10/2026: `panel` se mergeó a `main` antes que `jugador`** (decisión de PC 2; CLAUDE.md dice marca → jugador → panel).
  No toca archivos de PC 1. **PC 1: antes de integrar, traé `main` a tu rama** (`git fetch` + `git merge origin/main` en `jugador`).

## Pendiente para la integración
- **Login:** reemplazar la sección "Entrada (PROVISORIA)" de `panel.html` por
  `<div data-include="../componentes/login-telefono.html" data-ambito="panel"></div>` y borrar
  `entrarComoDuenio()` y `datosDuenio()` de `panel.js`. Hoy entra con `Store.complejo().telefonoDuenio`.
- **Reiniciar con el login real:** el panel vuelve a hacer `Store.login` del dueño después de `reiniciarDemo`. Con el
  componente de PC 1 conviene mantener ese comportamiento (o decidir entre los tres que el reinicio saque al dueño).

## Para revisar entre los tres
- **`white`:** las tarjetas de la agenda y los textos sobre fondo oscuro usan `white` de Tailwind (no hay token).
  Si PC 3 prefiere `marca-claro` también ahí, es un cambio de clases.
- **Contraste:** texto blanco sobre `club`, `libre` y `alerta`; texto `marca-oscuro` sobre `fijo` (es claro).
- **`ocupado` y `alerta` son el mismo rojo:** las reservas (fondo `ocupado/10`) y el chip "Seña pendiente" (`alerta`)
  comparten color. Se distinguen bien, pero si PC 3 cambia uno de los dos, el panel lo toma solo.
- **Animaciones:** están en un `<style type="text/tailwindcss">` dentro de `panel.html` (usan `theme()` con los tokens).
