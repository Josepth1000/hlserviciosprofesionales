# Sistema de diseño — HL Servicios Profesionales

Documento de decisiones, no de componentes: lo que no se toca porque es la
identidad, y las reglas que cualquier cambio futuro debe respetar. Los valores
viven en `src/styles/global.css` (`@theme`) y, en producción, en el panel de
Keystatic.

## 1. Identidad intocable

- **Dorado + negro.** Dorado `#C9A227` (`brand-500`) y negro `#0B0B0D`
  (`ink-950`). Extraídos del logo oficial; no se sustituyen por «un dorado más
  moderno» ni se añaden colores de acento nuevas.
- **La marca es un degradado.** El nombre «Servicios Profesionales» se pinta en
  Great Vibes con un degradado dorado metálico. Es el único lugar del sitio
  donde el texto lleva degradado (ver punto 4).
- **Logo.** Monograma HL dorado en anillo, PNG transparente, sin recolorear ni
  recortar.

## 2. Paleta y contraste

| Token | Valor | Uso |
|---|---|---|
| `brand-500` | `#C9A227` | Rellenos (botones, subrayados, iconos sobre negro) |
| `brand-700` | `#866619` | Texto dorado sobre fondos claros (AA 5,35:1 sobre blanco) |
| `brand-300` / `brand-400` | `#e4cb7c` / `#d8b453` | Texto y acentos sobre fondos oscuros |
| `ink-950` | `#0B0B0D` | Header, footer, héroes y superficies oscuras |
| `ink-600` | `#4f4f57` | Texto corrido sobre blanco |
| `ocre` | `#e9dfc4` | Fondo de la sección de preguntas frecuentes |

Reglas:

- `brand-500` nunca se usa como color de texto sobre blanco ni sobre `brand-50`:
  a ese tamaño y contraste queda por debajo de AA.
- Texto pequeño dorado sobre claro → `brand-700`. Sobre oscuro → `brand-300`.
- El color no comunica estado por sí solo: los avisos llevan icono y texto.

## 3. Tipografías

| Papel | Familia | Dónde se cambia |
|---|---|---|
| Títulos | Playfair Display | Panel → Tipografías (`fonts.display`) |
| Texto | Instrument Sans | Panel → Tipografías (`fonts.body`) |
| Marca | Great Vibes | Panel → Tipografías (`fonts.script`) |

`Layout.astro` inyecta las tres como variables CSS (`--font-sans`,
`--font-display`, `--font-script`) a partir de la entrada `fonts` del contenido;
`global.css` solo guarda los valores por defecto. Cambiar de familia es una
decisión de contenido, no de código: si se cambia en el panel, hay que ajustar
también `googleFontsUrl` para que la familia se cargue.

## 4. Degradado dorado de texto: solo la marca

`.text-gold-gradient` se aplica **únicamente** al nombre de la marca en el
header, el footer y el login. En ningún otro sitio: ni titulares, ni botones, ni
texto corrido. Un titular con degradado compite con la marca y pierde
legibilidad en tamaños pequeños.

Cómo está hecho: el degradado se calcula con `color-mix()` sobre
`--color-brand-500`, así que sigue al dorado configurable; se recorta con
`background-clip: text` y `color: transparent`. En modo de contraste alto
(`forced-colors`) el fondo se anula y el texto vuelve a `CanvasText` para que la
marca no desaparezca.

## 5. Elevación y movimiento

- Sombras **neutras** (`rgb(0 0 0 / …)`) en reposo; ninguna pieza late ni brilla
  sola. El color aparece solo al interactuar (hover, focus) y nunca como
  elevación permanente.
- El elemento que se está leyendo se destaca con elevación neutra y un borde
  dorado de 1 px (`outline`), no con halos de color.
- Los realces con color se apagan con `prefers-reduced-motion`.
- La marquesina de servicios no declara animación hasta que se pasa el cursor o
  se enfoca; en reposo es una franja quieta.

## 6. Encabezados

Los `h2` de sección llevan numeración editorial («01. Nuestros servicios»)
dentro del propio encabezado, en dorado y al tamaño del titular. Los rótulos
pequeños en mayúsculas sobre el titular están prohibidos: se leen como
decoración suelta. Las etiquetas siguen en el panel (`label`) aunque el render
no las pinte.

## 7. Dónde se edita

- **Colores y tipografías:** panel → Apariencia / Tipografías (colección `site`,
  campos `palette` y `fonts`). Los cambios se emiten como CSS en tiempo de
  build (`PaletteStyle`).
- **Tokens base:** `src/styles/global.css`, bloque `@theme`.
- **Componentes:** `src/components/`; cada patrón repetido (tarjeta de servicio,
  encabezado de sección, testimonio) vive en su propio componente.
