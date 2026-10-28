# Notas de PC 1 (rama `jugador`)

## Jornada del 28/10/2026

### Qué hicimos

- **App del jugador** (`goles/index.html` + `assets/js/jugador.js`): barra de navegador dibujada, encabezado de GOLES,
  plano (include de PC 3), tira de 7 días con turnos libres por día, grilla F5/F7 con selección de varios turnos
  seguidos, resumen con seña y "Sin cancelación gratuita", Mercado Pago simulado, confirmación con tilde animado,
  `.ics` y "Compartir por WhatsApp", "Mis reservas" (ícono arriba a la derecha) y "Lo que viene" (include de PC 3).
- **Login con teléfono** (`componentes/login-telefono.html` + `assets/js/login-telefono.js`), reutilizable con
  `data-ambito="jugador"` o `"panel"`.
- **Integración** (acordada con PC 2): el panel ya usa el componente. Se borraron `entrarComoDuenio()`,
  `datosDuenio()` y `error` de `panel.js`.
- Merge de `main` (panel de PC 2) en `jugador` y de `jugador` en `main`.
- Revisado a 390 y 360 px: sin scroll horizontal, botones de 44 px o más, nada cortado.
- Recorrido de punta a punta automático (jugador y panel en el mismo navegador): 33 de 33 pasos OK, sin errores de JS.

### Decisiones

- **Eventos nuevos en `window`** (no están en CLAUDE.md; sumarlos de común acuerdo):
  - `pedir-login` → `{ ambito }`: abre el ingreso con teléfono.
  - `sesion-iniciada` → `{ ambito, usuario }`: el componente avisa que alguien entró (`Store.login` no dispara `alCambiar`).
- **`data-modo`** del componente: `"hoja"` (por defecto, hoja desde abajo que se puede cerrar; la usa el jugador) o
  `"pagina"` (tarjeta fija, sin cerrar, abierta mientras no haya sesión; la usa el panel). En el panel, `salir()`
  dispara `pedir-login` para que vuelva a aparecer.
- **Archivo nuevo** `assets/js/login-telefono.js`: falta en la estructura de carpetas de CLAUDE.md. Cada página que use
  el componente lo carga antes de su propio JS.
- **Nombre "la primera vez"**: sin tocar `store.js`. Se busca en la sesión del otro ámbito y en
  `Store.reservasDeUsuario` (solo reservas futuras). Si alguien solo tiene reservas pasadas, se le vuelve a pedir el nombre.
  Si hace falta algo mejor, sumar `Store.nombreDe(telefono)` (solo agregar).
- **Tocar la notificación de WhatsApp completa el código** (ayuda para la demo).
- **Pago simulado**: no usa el logo de Mercado Pago, solo el nombre en texto y la franja "Simulación — no se cobra nada".
- **"Reiniciar demo"** sigue volviendo a loguear al dueño solo (como lo dejó PC 2), para no cortar la presentación.
- Colores: solo tokens. Uso `text-white` sobre `bg-libre` y `bg-club`, igual que el panel.

### Pendientes

- **PC 3:** si después de tocar una cancha en el plano el jugador elige un turno de la otra cancha en la grilla, el
  plano sigue marcando la primera. Haría falta un evento (por ejemplo, que el plano escuche la selección) o que el
  plano se limpie con `cambio-horario`.
- **PC 3:** a 360 px, "Las 2 canchas están libres. Tocá una." deja "una." sola en el segundo renglón.
- **Los tres:** sumar a CLAUDE.md los eventos `pedir-login` / `sesion-iniciada`, `assets/js/login-telefono.js` y
  `presentacion.html`.
- Probar en un celular real (lo automático fue Chrome de escritorio con iframes de 390 y 360 px).
