# Notas de PC 3 (rama `marca`)

## Decisiones

- **Identidad:** propuesta 1, "Noche de cancha". Fondo carbón, lima neón, Barlow Condensed para títulos e Inter para textos.
- **Logo:** la "R" es media cancha. El palo es la línea media, la panza es el círculo central y el punto es el punto del medio.
- **Plano, cancha ocupada:** se pinta con `fill-slate-400` (gris de Tailwind). No es un token: lo pidió así el equipo.
- **Landing:** el logo del encabezado y del pie es el ícono SVG más el texto en `font-titulo`, para que use la tipografía real.

## Valores de `assets/js/config.js`

El Paso 0 todavía no está en `main`. Cuando llegue, pasar estos valores a su `config.js` sin cambiar los nombres de los tokens:

| Token | Valor |
| --- | --- |
| `marca` / `marca-claro` / `marca-oscuro` | `#C6F432` / `#F3F5F0` / `#0E1311` |
| `club` / `club-claro` / `club-oscuro` | `#2F7BFF` / `#8DB8FF` / `#1747A6` (PROVISORIO, hasta tener los de GOLES) |
| `libre` | `#22B45E` |
| `ocupado` | `#FF5A4E` |
| `fijo` | `#FFB547` |
| `alerta` | `#FF5A4E` |
| `font-titulo` | `"Barlow Condensed"`, `"Arial Narrow"`, sans-serif |
| `font-texto` | `Inter`, system-ui, sans-serif |

Google Fonts: `family=Barlow+Condensed:wght@600;700;800&family=Inter:wght@400;500;600;700`

## Pendientes para la integración

- Agregar el plano a `prueba.html` (solo agregar): cargar `assets/js/plano.js` y `<div data-include="componentes/plano.html"></div>`.
- El iframe de la landing apunta a `goles/index.html`, que hace PC 1. Hasta que exista, el celular se ve vacío.
- La landing usa Lucide `0.460.0` desde unpkg. Si el Paso 0 elige otra versión, unificar.
- Antes de la versión final: pasar a trazos el texto de `reservando-logo.svg` y `goles-logo.svg`. Como `<img>` no cargan Google Fonts y se ven con la tipografía de respaldo.
- Favicon solo en SVG. Si hace falta en Safari viejo, sumar un PNG de 180 px (`apple-touch-icon`).
- WhatsApp de contacto de la landing: PROVISORIO (`+54 9 11 0000-0000`).

## GitHub Pages (para todas las PCs)

En Pages la demo vive en `https://mendezciroco.github.io/RESERVANDO/`, no en la raíz del dominio. Por eso:

- **Nada de rutas que empiecen con `/`**: `/assets/...` apuntaría a `mendezciroco.github.io/assets/...` y daría 404.
- Desde `goles/index.html` y `goles/panel.html` las rutas llevan `../`: `../assets/js/store.js`, `data-include="../componentes/plano.html"`.
- Dentro de un componente, cualquier `src` o `href` se resuelve **desde la página que lo incluye**, no desde `componentes/`. Por eso los componentes de PC 3 no tienen rutas a archivos.
- Cada página lleva `<title>`, `<meta name="description">` y favicon. Pendiente en páginas de otras PCs:
  - `goles/index.html` y `goles/panel.html` (PC 1 y PC 2): `<link rel="icon" type="image/svg+xml" href="../assets/img/favicon.svg">`.
  - `prueba.html` (Paso 0): `<link rel="icon" type="image/svg+xml" href="assets/img/favicon.svg">`.
- En la raíz hay un `.nojekyll` vacío, para que Pages publique los archivos tal cual, sin procesarlos con Jekyll.
