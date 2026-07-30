# Design

## Visual theme

Un pasaporte de vacunación impreso en cartulina de color. La referencia física
sigue siendo el documento — campos etiquetados, foto de pasaporte, línea de datos
monoespaciada al pie — pero el material es papel pastel, no cuero oscuro.

La regla que sostiene toda la paleta: **el pastel es superficie, nunca tinta.**
Un pastel solo funciona si lo que va encima es profundo y del mismo tono. Rosa
palo con tinta ciruela se lee; rosa palo con gris claro es ilegible, y es
exactamente el fallo típico de un rediseño "en pasteles".

Estructura:

- **El carnet** es cartulina rosa palo con tinta ciruela, en modo claro y en
  oscuro por igual. Es un objeto físico: una tarjeta no cambia de color según la
  luz de la habitación.
- **El resto de la app** es blanco puro con superficies teñidas apenas hacia el
  rosa. El fondo NO es pastel: si lo fuera, los pasteles de la interfaz dejarían
  de leerse como color.

## Color

Estrategia: **Restrained** en la app, **Committed** en el carnet. Todo en OKLCH.

### Modo claro

| Rol | Valor | Uso |
|---|---|---|
| `--bg` | `oklch(1 0 0)` | Fondo de la app. Blanco puro, sin tinte. |
| `--surface` | `oklch(0.975 0.012 14)` | Paneles y filas, apenas teñidos hacia el rosa. |
| `--surface-2` | `oklch(0.955 0.018 14)` | Campos de formulario, hover. |
| `--line` | `oklch(0.902 0.022 14)` | Reglas y bordes de 1px. |
| `--ink` | `oklch(0.26 0.038 15)` | Ciruela profunda, no negro. 12.9:1 sobre `--bg`. |
| `--muted` | `oklch(0.48 0.032 15)` | Etiquetas de campo, metadatos. 7.4:1. |
| `--primary` | `oklch(0.875 0.068 14)` | Rosa palo. Relleno de acciones primarias. |
| `--on-primary` | `oklch(0.25 0.060 15)` | Tinta sobre el rosa. 10.9:1. |
| `--primary-on-bg` | `oklch(0.45 0.130 15)` | Rosa profundo para enlaces, foco e iconos. |
| `--accent` | `oklch(0.86 0.058 86)` | Mantequilla. Sellos de dosis aplicada. |

Un relleno pastel necesita **borde propio**: sin él, el botón principal se
difumina contra el blanco y deja de leerse como acción. De ahí que `.btn--primary`
lleve un borde derivado de su propia tinta.

### Modo oscuro

Fondo `oklch(0.17 0 0)` — negro real, croma 0. La tinta sube a
`oklch(0.94 0.012 28)` y los rellenos primarios **siguen siendo pastel con tinta
oscura**: en un fondo negro es justo lo que hace que el botón principal resalte
en vez de fundirse. Los fondos de estado se invierten (tinte profundo con tinta
pastel), pero el carnet se mantiene idéntico.

### Semántica de estado

Tres estados, y **ninguno depende solo del color** — crítico aquí, porque en
pastel los tonos se acercan entre sí. Cada uno lleva etiqueta de texto y una
forma distinta:

| Estado | Tono | Forma | Etiqueta |
|---|---|---|---|
| Al día | salvia, hue 155 | punto sólido | `Al día · en N meses` |
| Por vencer (≤30 días) | mantequilla, hue 88 | anillo hueco | `Toca en N días` |
| Vencida | ladrillo, hue 28 | barra vertical | `Vencida hace N días` |

Los tres tonos están deliberadamente separados en la rueda para que se distingan
aun a baja saturación.

### La regla de texto sobre relleno

Invertida respecto de una paleta saturada: aquí **todos los rellenos son pálidos
(L > 0.85), así que todos llevan texto oscuro**. Nunca texto blanco sobre pastel
— es el error que convierte un pastel en algo ilegible.

## Typography

Cero fuentes externas: la app debe cargar offline y sin build. Se usan stacks del
sistema, elegidos por eje de contraste (serif + sans + mono), no por parecido.

| Rol | Stack | Uso |
|---|---|---|
| `--font-doc` | `ui-serif, Georgia, "Times New Roman", serif` | Identidad del documento: nombre de la mascota, título de secciones del carnet. |
| `--font-ui` | `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` | Todo lo demás: etiquetas, botones, cuerpo, datos. |
| `--font-data` | `ui-monospace, "Cascadia Mono", "SF Mono", Consolas, monospace` | Fechas, lotes, microchip y la línea tipo MRZ al pie del carnet. |

Escala fija en rem (no fluida — es UI de producto), razón 1.2:
`0.75 / 0.8125 / 0.875 / 1 / 1.125 / 1.375 / 1.75 / 2.25 rem`.

Etiquetas de campo: sans, 0.75rem, versalitas reales vía `font-variant-caps`
donde exista, con tracking `0.08em`. Es vocabulario de documento, no el "eyebrow"
decorativo de landing page: solo aparece sobre campos de dato, nunca sobre
secciones.

## Layout

Mobile-first. Una sola columna hasta 720px; a partir de ahí el carnet se fija a
la izquierda y el historial ocupa la derecha (grid de 2 columnas, máximo 1100px).

- Escala de espaciado en múltiplos de 4px: `4 8 12 16 24 32 48 64`.
- El carnet mantiene proporción de tarjeta (≈1.586:1, formato ID-1) hasta 480px
  de ancho; arriba de eso crece solo en alto.
- Radio: `--r-card: 14px`, `--r-field: 8px`, `--r-pill: 999px`.
- Escala z semántica: `--z-sticky: 10`, `--z-sheet-backdrop: 20`,
  `--z-sheet: 30`, `--z-toast: 40`.

## Motion

150–250 ms, `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out-quint). La motion comunica
estado, nunca decora:

- El carnet gira en 3D (`rotateY`) al pasar de anverso a reverso. Es la única
  animación con carácter, y existe porque el objeto real se voltea.
- Las hojas de captura entran desde abajo (`translateY`), 200 ms.
- Las filas nuevas del historial hacen un destello de fondo al insertarse.

Con `prefers-reduced-motion: reduce`, todo se degrada a un cambio instantáneo o
un crossfade de 1ms. El giro del carnet se vuelve un corte seco.

## Print

Hoja de estilos de impresión obligatoria: el carnet y el historial completo deben
salir en papel en blanco y negro legible, sin controles de interfaz. Es el
respaldo real cuando el teléfono no está.
