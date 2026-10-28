# Reservando.com — Contexto del proyecto (demo)

> Este archivo es la fuente de verdad del proyecto y es el mismo en las 3 PCs.
> Claude Code: leelo completo antes de cada tarea y respetá sus reglas.
> Si una instrucción del chat choca con este archivo, avisá antes de hacer nada.

---

## 1. Qué es Reservando.com

Plataforma web para que los jugadores reserven turnos de cancha de fútbol solos, desde el celular, sin escribirle al dueño.
Cada complejo cliente tendrá su propio subdominio y su marca, por ejemplo `goles.reservando.com`.

**El problema que resolvemos:** hoy el dueño de GOLES maneja las reservas por WhatsApp (muchas veces con audios mientras maneja) y tiene que ir a la cancha para confirmar si un horario está libre.

## 2. Objetivo de esta etapa: la demo

- Demo **muy visual y navegable** para mostrarle al dueño de GOLES cómo quedaría.
- **Sin backend ni base de datos.** Los datos viven en el navegador (localStorage) a través de `store.js`.
- Tiene que **funcionar de punta a punta** mientras la mostramos: un jugador reserva y el turno aparece solo en el panel del dueño.
- Se publica en **GitHub Pages**.
- Después vamos a construir el sistema real en **Django** reutilizando al máximo este HTML, Tailwind y Alpine (ver sección 12).

## 3. Primer cliente: GOLES

| Dato | Valor |
| --- | --- |
| Canchas | 2 canchas techadas de césped sintético: una de fútbol 5 (F5) y una de fútbol 7 (F7) |
| Horario | De 13:00 a 00:00. El último turno es de 23:00 a 00:00 |
| Turnos | De 1 hora. Se pueden reservar varios turnos seguidos de la misma cancha |
| Seña | $5.000 por hora de turno |
| Precio por hora | **PROVISORIO** (inventar valores razonables, distintos para F5 y F7, marcados como provisorios en `datos.js`) |
| Dirección, WhatsApp, logo y colores | **PROVISORIOS** hasta que GOLES nos los pase |

## 4. Reglas de negocio (ya definidas, no cambiarlas)

- **Login solo con teléfono.** Sin Google, sin email, sin contraseña. El jugador pone su celular, recibe un código y listo.
  - En la demo el código es **simulado**: aparece en una notificación que imita a WhatsApp dentro de la pantalla.
  - La **sesión queda abierta**: si recarga la página, sigue logueado.
- **Seña con Mercado Pago.** En la demo es una pantalla **simulada**, siempre con la etiqueta visible "Simulación — no se cobra nada".
- **La comisión de Mercado Pago la paga el complejo**, no el jugador.
- **Sin cancelación gratuita.** Se avisa en el resumen antes de pagar.
- **Turnos fijos:** los carga el dueño desde el panel. **Arrancan vacíos** (le entregamos la agenda de fijos en blanco).
- Roles de la demo: **jugador** y **dueño**.

## 5. Stack técnico de la demo

Todo por CDN, **sin npm, sin build, sin frameworks**.

| Qué | Cómo |
| --- | --- |
| Estilos | Tailwind CSS v3 Play CDN: `<script src="https://cdn.tailwindcss.com"></script>` |
| Configuración de Tailwind | `assets/js/config.js` define `tailwind.config` (cargarlo justo después del CDN) |
| Interacciones | Alpine.js v3: `<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>` |
| Íconos | Lucide por CDN (`lucide.createIcons()` después de renderizar) |
| Tipografías | Google Fonts |
| Datos | `localStorage`, siempre a través de `assets/js/store.js` |

**No usar:** React, Vue, jQuery, Bootstrap, npm, bundlers, TypeScript ni backends. Nada que después no pase limpio a templates de Django.

**Orden de scripts en el `<head>` de cada página:**

1. Tailwind CDN
2. `assets/js/config.js`
3. Google Fonts y `assets/css/estilos.css`
4. Lucide
5. `datos.js`, `formato.js`, `store.js`, `include.js`
6. El JS propio de la página (`jugador.js`, `panel.js`, `plano.js`...)
7. Alpine.js con `defer`, último

## 6. Estructura de carpetas y quién toca qué

```
reservando/
├── CLAUDE.md
├── index.html                    # landing de Reservando.com
├── prueba.html                   # página de prueba del store (Paso 0)
├── goles/
│   ├── index.html                # app del jugador
│   └── panel.html                # panel del dueño
├── componentes/                  # pedazos de HTML que se incluyen con include.js
│   ├── login-telefono.html
│   ├── plano.html
│   └── proximamente.html
└── assets/
    ├── css/estilos.css
    ├── js/
    │   ├── config.js             # tokens de Tailwind (colores, tipografías)
    │   ├── datos.js              # datos de GOLES y reservas de ejemplo
    │   ├── formato.js            # pesos, fechas, horas, teléfonos
    │   ├── store.js              # ÚNICA puerta a los datos
    │   ├── include.js            # carga los componentes
    │   ├── jugador.js
    │   ├── panel.js
    │   └── plano.js
    └── img/                      # logos, favicon, imágenes
```

| Archivo | Quién lo toca |
| --- | --- |
| `goles/index.html`, `assets/js/jugador.js`, `componentes/login-telefono.html` | **PC 1** (rama `jugador`) |
| `goles/panel.html`, `assets/js/panel.js` | **PC 2** (rama `panel`) |
| `index.html`, `componentes/plano.html`, `componentes/proximamente.html`, `assets/js/plano.js`, `assets/img/` | **PC 3** (rama `marca`) |
| `assets/js/config.js` | Lo crea el Paso 0; después **solo PC 3** cambia los colores, sin cambiar los nombres de los tokens |
| `store.js`, `datos.js`, `formato.js`, `include.js`, `estilos.css`, `prueba.html` | Los crea el Paso 0. Después solo se **agregan** cosas, nunca se cambia lo que ya existe, y se avisa a las otras PCs |
| `CLAUDE.md` | Solo de común acuerdo entre los tres |

Si una PC necesita cambiar un archivo que no es suyo, **no lo cambia**: lo anota en su `NOTAS-PC<N>.md` y lo resolvemos en la integración.

## 7. Diseño

- **Estilo:** deportivo, moderno y con mucho contraste. Tarjetas con bordes redondeados, transiciones suaves, nada amontonado. Tiene que impresionar en un celular.
- **Mobile-first:** diseñar para 390 px de ancho y verificar en 360 px. Botones de al menos 44 px de alto.
- **Textos en español rioplatense** ("Reservá", "Elegí tu turno", "Tu código es").
- **Colores solo con estos tokens** (definidos en `config.js`; nunca colores sueltos ni hex en el HTML):

| Token | Uso | Ejemplo de clase |
| --- | --- | --- |
| `marca` (`DEFAULT`, `claro`, `oscuro`) | Identidad de Reservando | `bg-marca`, `text-marca-oscuro` |
| `club` (`DEFAULT`, `claro`, `oscuro`) | Color del complejo (GOLES) | `bg-club` |
| `libre` | Turno o cancha disponible | `bg-libre` |
| `ocupado` | Turno reservado | `bg-ocupado` |
| `fijo` | Turno fijo | `border-fijo` |
| `alerta` | Avisos importantes | `text-alerta` |

- **Tipografías:** `font-titulo` y `font-texto`, definidas en `config.js`.
- Los valores iniciales de los tokens son provisorios. PC 3 los reemplaza por los de la marca final **sin cambiar los nombres**.

## 8. Datos: el contrato de `store.js`

**Regla de oro:** ninguna pantalla lee ni escribe `localStorage` por su cuenta. Todo pasa por `Store`. En Django, `store.js` se reemplaza por vistas y las pantallas quedan iguales.

```js
// Complejo y canchas
Store.complejo()                        // → objeto GOLES de datos.js
Store.canchas()                         // → [Cancha]

// Fechas (hora de Argentina)
Store.hoy()                             // → 'AAAA-MM-DD'
Store.proximosDias(n)                   // → ['AAAA-MM-DD', ...] empezando hoy

// Turnos y reservas
Store.turnosDelDia(fecha, canchaId?)    // → [Turno] de las 13 a las 23 (el de 23 termina a las 00)
Store.reservar(datos)                   // → { ok: true, reserva } | { ok: false, error }
Store.reservasDelDia(fecha)             // → [Reserva], incluye los turnos fijos de ese día con origen 'fijo'
Store.reservasDeUsuario(telefono)       // → [Reserva] futuras, ordenadas por fecha y hora
Store.marcarAsistencia(reservaId, estado) // estado: 'vino' | 'no_vino'
Store.marcarSenaEfectivo(reservaId)

// Turnos fijos
Store.turnosFijos()                     // → [TurnoFijo]
Store.crearTurnoFijo(datos)             // → { ok: true, turnoFijo } | { ok: false, error }
Store.borrarTurnoFijo(id)

// Sesión. Ámbitos 'jugador' y 'panel', independientes entre sí
Store.enviarCodigo(telefono)            // → '4821' (código simulado de 4 dígitos)
Store.verificarCodigo(telefono, codigo) // → true | false
Store.login(telefono, nombre, ambito)   // → Usuario
Store.usuarioActual(ambito)             // → Usuario | null
Store.logout(ambito)
Store.esDuenio(telefono)                // → true si es el teléfono del dueño en datos.js

// Demo
Store.reiniciarDemo()                   // borra todo y vuelve a los datos iniciales

// Cambios en vivo: avisa en esta pestaña y en otras pestañas o iframes del mismo navegador
Store.alCambiar(callback)               // callback({ tipo, datos })
// tipos: 'reserva-nueva', 'reserva-actualizada', 'fijo-nuevo', 'fijo-borrado', 'demo-reiniciada'
```

**Formas de los datos:**

```js
Cancha    = { id: 'f5', nombre: 'Cancha F5', tipo: 'F5', techada: true, superficie: 'Sintético', precioHora }
Turno     = { canchaId, fecha, hora /* 13..23 */, estado /* 'libre' | 'reservado' | 'fijo' */, precio, reservaId }
Reserva   = { id, canchaId, fecha, hora, horas, nombre, telefono,
              origen /* 'web' | 'manual' | 'fijo' */, sena, senaPagada,
              medioSena /* 'mercadopago' | 'efectivo' | null */,
              asistencia /* null | 'vino' | 'no_vino' */, creadaEn }
TurnoFijo = { id, canchaId, diaSemana /* 0..6, 0 = domingo */, hora, horas, responsable, telefono }
Usuario   = { telefono, nombre, rol /* 'jugador' | 'duenio' */ }
```

**Reglas del store:**

- `reservar()` rechaza cualquier superposición con otra reserva o con un turno fijo, y turnos fuera del horario. Nunca puede haber dos reservas pisadas.
- La seña es `5000 × horas`.
- Teléfonos guardados como 10 dígitos (código de área + número, sin 0 ni 15), por ejemplo `1123456789`. Se muestran con `Fmt.telefono()`.
- Las **reservas de ejemplo** se generan **relativas a la fecha de hoy** (unas 10 entre hoy y mañana, sobre todo de 18 a 23), con nombres comunes. Así la demo siempre se ve viva, sea el día que sea.
- Los turnos fijos arrancan **vacíos**.
- Todo se guarda con el prefijo `reservando:` en localStorage.

**`formato.js` (objeto `Fmt`):** `Fmt.pesos(5000)` → `$5.000` · `Fmt.dia(fecha)` → `Jue 30` · `Fmt.diaLargo(fecha)` → `jueves 30 de octubre` · `Fmt.hora(21)` → `21:00` · `Fmt.rango(21, 2)` → `21:00 a 23:00` · `Fmt.telefono('1123456789')` → `11 2345-6789`.

## 9. Componentes compartidos

- Un componente es un archivo HTML en `componentes/`. Se incluye con `<div data-include="../componentes/plano.html"></div>` (ruta relativa a la página).
- `include.js` reemplaza esos `div` por el contenido del archivo, después dispara el evento `componentes-listos` en `window` y llama a `lucide.createIcons()`.
- Si un componente **todavía no existe**, `include.js` muestra en su lugar un recuadro gris con el nombre del archivo, sin romper la página. Así cada PC avanza sin esperar a las otras.
- La lógica de un componente vive en una función global en `assets/js/`, usada con `x-data`, por ejemplo `x-data="plano()"`.
- **Comunicación entre componentes**, con eventos en `window`:
  - `cambio-horario` → `{ fecha, hora }`: la app del jugador avisa qué día y hora se están mirando.
  - `cancha-elegida` → `{ canchaId }`: el plano avisa qué cancha tocó el jugador.
- `login-telefono.html` recibe el ámbito con un atributo (`data-ambito="jugador"` o `"panel"`), así sirve para la app y para el panel.
- `include.js` usa `fetch`, que **no funciona abriendo el archivo con doble clic** (`file://`). Siempre probar con Live Server.

## 10. Pantallas de la demo

- **Landing (`index.html`):** qué es Reservando, beneficios, cómo funciona, botón "Ver demo de GOLES", próximamente y contacto.
- **App del jugador (`goles/index.html`):** barra de navegador dibujada con `goles.reservando.com`, encabezado de GOLES, plano del predio, selector de día, grilla de turnos, login por teléfono, resumen y seña, Mercado Pago simulado, confirmación, "Mis reservas" y banner de próximamente.
- **Panel del dueño (`goles/panel.html`):** resumen del día, agenda de las 2 canchas que se actualiza en vivo, reserva manual, turnos fijos, acciones (vino, no vino, seña en efectivo), configuración de solo vista, "Reiniciar demo" y "Lo que viene".
- **Próximamente:** bot de WhatsApp para reservar y recibir recordatorios, programa de puntos, pago total por anticipado, lista de espera y estadísticas del complejo.

## 11. Cómo trabajamos

- **Ramas:** `main` (base estable), `jugador` (PC 1), `panel` (PC 2), `marca` (PC 3). Nadie trabaja directo en `main` salvo el Paso 0 y la integración.
- **La marca se mergea temprano:** PC 3 sube los colores finales a `main` en la primera hora y las otras PCs los traen a su rama.
- **Commits chicos y seguidos**, con mensajes en español que digan qué cambió ("Grilla de turnos con selección múltiple").
- **Antes de cada commit:** probar en el navegador y revisar que no se tocaron archivos de otra PC.
- **Para tareas grandes:** primero mostrar un plan corto y esperar el OK; después escribir código.
- **Si algo no está claro, preguntar** en vez de suponer.
- **Notas por PC:** al terminar cada jornada, cada PC deja sus pendientes y decisiones en `NOTAS-PC<N>.md` (así no hay conflictos en este archivo).
- **Integración:** se mergea a `main` en este orden: `marca` → `jugador` → `panel`.

## 12. Pensando en Django (para reutilizar el diseño)

- HTML semántico y prolijo: cada pantalla y componente va a ser un template de Django y cada `data-include` un `{% include %}`.
- Los datos se muestran con `x-for` y `x-text` de Alpine sobre lo que devuelve `Store`. **Evitar armar HTML con strings dentro del JS**: eso no se puede pasar a templates.
- Nada de lógica de negocio en el HTML: las reglas viven en `store.js` (en Django serán vistas y modelos).
- Comentarios en español en las partes que después hay que conectar al servidor (`// En Django: esto viene de la vista X`).

## 13. Cómo probar

- Abrir la carpeta del repo en VS Code y usar **Live Server**.
- Probar siempre con el navegador en modo celular (herramientas de desarrollador, 390 px) y además en un celular real conectado a la misma red Wi-Fi.
- Para probar el "en vivo": app del jugador en una pestaña y panel en otra. Al reservar en una, la otra se actualiza sola.
- Antes de presentar: "Reiniciar demo".

## 14. Pendientes y datos provisorios

- Precios por hora de F5 y F7, dirección, WhatsApp, logo y colores de GOLES.
- Teléfono del dueño para el login del panel (en la demo, uno inventado y marcado como provisorio en `datos.js`).
- Dominio: confirmar si `reservando.com` está disponible o qué dominio vamos a usar. En la demo el subdominio es solo visual.
