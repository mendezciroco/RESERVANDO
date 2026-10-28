# Notas PC 2 — Panel del dueño

## Hecho
- `goles/panel.html` + `assets/js/panel.js`: entrada provisoria, encabezado, resumen de hoy y agenda F5/F7 con navegación de días.
- En vivo con `Store.alCambiar`: la reserva de un jugador dispara un aviso ("Nueva reserva de Martín — F5, 21 hs"),
  el destello del turno y de la tarjeta "Reservados", un sonido corto y el título de la pestaña, y la agenda va hasta el turno
  (cambia de día si hace falta).
- Reserva manual: al tocar un hueco libre se abre un formulario (nombre, teléfono, duración, seña en efectivo) que
  guarda con `Store.reservar({ ..., origen: 'manual' })` y, si corresponde, `Store.marcarSenaEfectivo`.
- Turnos fijos (pestaña dentro de la tarjeta de la agenda): estado vacío con invitación, formulario (cancha, día,
  hora, cantidad de horas, responsable, teléfono) con `Store.crearTurnoFijo`, lista por día de la semana y borrado con
  confirmación de dos toques (`Store.borrarTurnoFijo`).
- Acciones de cada reserva: al tocar el bloque se abre un detalle con Llamar / WhatsApp, "Vino" / "No vino"
  (`Store.marcarAsistencia`) y "Seña cobrada en efectivo" (`Store.marcarSenaEfectivo`). La agenda muestra ✓ / ✗ y tacha
  a quien no vino.
- Menú en el encabezado: Configuración, Lo que viene, Reiniciar demo y Salir.
- Configuración de solo vista: precio por hora de cada cancha, horario, turnos de 1 hora, seña por hora, comisión de
  MP a cargo del complejo y sin cancelación gratuita.
- Reiniciar demo con confirmación (`Store.reiniciarDemo`). Si el reinicio cierra la sesión del panel, el dueño vuelve a
  entrar solo (también si se reinicia desde otra pestaña), para no cortar la presentación.
- Sección "Lo que viene" al final con `<div data-include="../componentes/proximamente.html">`.
- Probado con un Store simulado (el Paso 0 todavía no estaba en esta PC). Falta probar contra el `store.js` real.

## Pendiente para la integración
- **Login:** reemplazar la sección "Entrada (PROVISORIA)" de `panel.html` por
  `<div data-include="../componentes/login-telefono.html" data-ambito="panel"></div>` y borrar
  `entrarComoDuenio()` y `datosDuenio()` de `panel.js`.
- **Teléfono del dueño:** `datosDuenio()` lo busca en `Store.complejo().duenio.telefono` o
  `Store.complejo().telefonoDuenio`. Ajustar al nombre real del campo en `datos.js`.
- **Logo:** se usa `Store.complejo().logo` (ruta relativa a la raíz). Si no hay logo, se muestran las iniciales sobre `bg-club`.
- **Cancha.tipo:** en el celular las columnas se titulan con `cancha.tipo` ("F5"/"F7").

## Para revisar entre los tres
- **Tipografías:** `panel.html` carga Bricolage Grotesque + Inter de Google Fonts. Tiene que ser el mismo `<link>` que
  corresponde a las familias de `config.js` (`font-titulo` / `font-texto`). Unificar con `prueba.html`.
- **Grises:** CLAUDE.md define tokens de color pero no neutros. Uso `zinc`, `white` y `black` de Tailwind para
  fondos y textos secundarios. Si preferimos tokens neutros (`fondo`, `texto`...), PC 3 los agrega en `config.js`.
- **Contraste:** el texto va en blanco sobre `bg-club`, `bg-libre` y `bg-alerta`. Si los colores finales son claros, PC 3 avisa.
- **Lucide:** fijado en `lucide@0.460.0` (unpkg). Unificar la versión en todas las páginas.
- **`Store.alCambiar`:** para el aviso de "Nueva reserva" asumo que en `reserva-nueva` `datos` es la reserva o `{ reserva }`.
  Las reservas con `origen: 'manual'` no muestran el aviso de "Nueva reserva" (las carga el mismo dueño).
- **`Store.reservar(datos)`:** mando `{ canchaId, fecha, hora, horas, nombre, telefono, origen }`. Confirmar que sean esos nombres.
- **Seña por hora:** el formulario muestra `complejo.senaPorHora` o, si no existe, 5000. Mejor que `datos.js` la exponga.
- **Teléfono:** `limpiarTelefono()` en `panel.js` acepta "011 15 2345-6789" o "+54 9 11...". Si el Store o PC 1 ya
  normalizan, unificamos en `formato.js`.
- **`Store.crearTurnoFijo(datos)`:** mando `{ canchaId, diaSemana, hora, horas, responsable, telefono }`. Definir qué pasa si el
  fijo choca con una reserva ya hecha en alguna fecha futura: ¿lo rechaza el Store? Hoy el panel muestra el `error` que devuelva.
- **Asistencia y seña en turnos fijos:** las ocurrencias de un fijo vienen de `reservasDelDia` con `origen: 'fijo'`.
  El panel deja marcar Vino / No vino / Seña sobre ellas con el `id` que traen. Confirmar que el Store lo soporte
  (por ejemplo, guardando la asistencia por fijo + fecha).
- **"Lo que viene" (PC 3):** el panel pone un título propio ("Próximamente / Lo que viene") arriba del include. Si
  `proximamente.html` ya trae su título, saco el del panel en la integración.
- **Configuración:** lee `cancha.precioHora`, `cancha.techada`, `cancha.superficie` y `complejo.senaPorHora` (si no existe, usa 5000).
  El horario sale de las horas de la agenda (13 a 23) y usa `Fmt.hora(0)` para mostrar "00:00".
- **Animaciones:** están en un `<style type="text/tailwindcss">` dentro de `panel.html` (usan `theme()` con los tokens).
