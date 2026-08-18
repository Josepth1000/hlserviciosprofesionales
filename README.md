# HL Servicios Profesionales

Sitio web moderno de **Henry López – Servicios Profesionales** (Bucaramanga, Santander), construido sobre **Astro + Tailwind CSS v4** con **Keystatic CMS** como panel de administración, en lugar del antiguo WordPress 4.6.

## ✨ Características

- **9 páginas** (Inicio, Quiénes Somos, Servicios, Cómo me afilio, Noticias, Contacto y 3 artículos)
- **Panel de administración** en `/keystatic` para editar cada sección e ítem del sitio sin tocar código
- Diseño **100% responsive** (mobile-first) con la **paleta corporativa** extraída del logo de la firma (rojo carmesí `#C02C2C` + neutros cálidos)
- **SEO**: meta tags, Open Graph, canonical y `sitemap.xml` automático
- Botones de **WhatsApp** integrados, mapa de Google Maps embebido
- Imágenes originales del sitio migradas desde el archivo de Wayback Machine

## 🚀 Puesta en marcha

```sh
npm install
npm run dev        # sitio en http://localhost:4321 — panel en http://localhost:4321/keystatic
npm run build      # genera el sitio en ./dist (HTML estático + servidor para el panel)
npm run preview    # previsualiza el build
npx astro check    # typecheck del proyecto
```

## 🎛️ Panel de administración

Abre **http://localhost:4321/keystatic** en el navegador (pide usuario y contraseña, ver abajo). El panel está **brandado con el logo y el nombre de la firma**, en **español** (`locale: 'es-ES'` + textos restantes traducidos por inyección: Escoger imagen, Eliminar, Regenerar slug, menús y diálogos), con **navegación agrupada** (Contenido / Sitio web) y **estética dorada** (hover dorado en filas y campos de formulario, botones Editar/Eliminar por registro, miniaturas de imagen en la lista de Servicios). Los botones de fila **Editar / Eliminar** aparecen al pasar el mouse por cada registro; **Eliminar** abre una ventana modal de confirmación («¿Seguro? Esta acción no se puede deshacer.») y borra el registro directamente, sin pasar por el formulario. Al pulsar **Guardar / Crear** aparece un popup («Elemento guardado correctamente») y el panel vuelve automáticamente a la lista de todos los elementos — todo definido en `keystatic.config.ts` y en la personalización inyectada por `src/middleware.ts`. Desde ahí puedes editar:

| Sección del panel | Qué edita | Dónde se ve |
|---|---|---|
| **Configuración del sitio** | Nombre, **marca (texto cursiva)**, eslogan, **animación del puntero (activar/desactivar, efecto: halo dorado / anillo / destellos, tamaño del halo)**, **logo (subible)**, **color principal y color oscuro de la paleta**, **tipografías (texto, títulos y marca, con URL de Google Fonts)**, SEO, teléfono, WhatsApp, correo, dirección, horario, Instagram, portada (hero, **con imagen de fondo subible**), cifras destacadas, **imágenes de los servicios (subibles)**, valores | Todo el sitio |
| **✍️ Configuración del Contenido** | **Todos** los textos, botones, títulos e imágenes de las páginas: menú de navegación, pie de página, banda de llamada a la acción, cada sección de la portada, héroes de todas las páginas (título, subtítulo e imagen — **con preview en vivo y avatar cuando no hay imagen**), textos de Quiénes Somos (incluida la tarjeta del fundador), **formulario de contacto completo** (etiquetas, marcadores, opciones del desplegable, URL de envío), **plantilla del mensaje de WhatsApp al cotizar un plan**, **URLs del mapa y de “Cómo llegar”**, mensajes de WhatsApp y textos de SEO | Todo el sitio |
| **Cómo me afilio** | Texto introductorio, los 5 planes con precios, requisitos de vinculación, notas informativas. En la página, cada combinación de la tabla es **clicable y abre WhatsApp** con un mensaje personalizado (p. ej. *“Hola, estoy interesado en el Plan 1 + SALUD por valor de $ 70.000 mensuales”*) | Página /como-me-afilio |
| **Servicios** | Los 4 servicios: título, orden, icono, imagen, resumen, descripción y características | Inicio, Servicios y pie de página |
| **Testimonios** | Testimonios de clientes: nombre, cargo/empresa, texto, valoración (1-5 estrellas) y orden | Portada |
| **Preguntas frecuentes** | Preguntas y respuestas del acordeón, con orden | Portada |
| **Noticias** | Artículos del blog: título, resumen, fecha, categoría, etiquetas y contenido | Inicio, Noticias y /blog/... |

Cada cambio se guarda en archivos Markdown/YAML dentro de `src/content/` y se refleja en el sitio al guardar (en `npm run dev` es inmediato; en producción requiere recompilar o usar el modo GitHub).

> ✍️ **100% personalizable:** la sección *Configuración del Contenido* agrupa por página todos los textos e imágenes que antes estaban fijos en el código (menú, footer, CTA, héroes, formulario de contacto, blog…). Los campos de imagen muestran **preview en vivo** de la imagen publicada y, si no hay ninguna, un **avatar** con el mensaje *«No hay imagen cargada o publicada»*. Cada cambio guardado se refleja al instante en el sitio.
>
> 🎨 **Paleta configurable por Elemento:** la sección *Paleta de colores por Elemento* lista cada color **identificado por lo que pinta en la página** (p. ej. «Fondo oscuro principal», «Botones, CTAs y enlaces principales», «Fondo de Preguntas frecuentes») con su token técnico como detalle secundario. Cada color tiene **selector de color nativo** (clic en el swatch abre el selector), **preview en vivo**, **entrada hexadecimal editable** y el detalle de en qué páginas se usa (campo personalizado en `src/lib/keystatic/colorField.tsx`). Los colores se agrupan por categoría (fondos y superficies → acentos dorados, botones y enlaces → textos neutros) y cada token aparece una única vez en el YAML, por lo que **cualquier cambio guardado surte efecto de inmediato en el sitio** (botones, enlaces, superficies, texto dorado de la marca, fondo del FAQ…). El logo se sube con el campo *Logo* (se guarda en `public/images/`).
>
> ✅ **Los cambios del panel se reflejan solos (sin pasos manuales):** `npm run dev` y `npm run build` limpian automáticamente la caché de contenido de Astro (`.astro/data-store.json`) antes de arrancar, y el servidor de desarrollo usa **watch por polling** (`vite.server.watch.usePolling` en `astro.config.mjs`) para que ningún guardado de Keystatic se pierda en Windows. Si alguna vez un cambio no aparece, basta reiniciar `npm run dev` — el arranque siempre relee el contenido desde los archivos YAML. Ya no hace falta borrar nada a mano.

### Modo local vs. modo GitHub

El modo se elige automáticamente con la variable `PUBLIC_KEYSTATIC_GITHUB_REPO` (ver `keystatic.config.ts`):

- **Modo local** (por defecto): edita directamente los archivos del proyecto. Ideal para desarrollo.
- **Modo GitHub**: define `PUBLIC_KEYSTATIC_GITHUB_REPO=usuario/repositorio` para activarlo. Keystatic conecta el panel al repositorio y cada cambio se **publica automáticamente** al desplegar.

### 🔒 Protección del panel con contraseña

El panel está protegido por un **inicio de sesión con contraseña**: al visitar `/keystatic` sin sesión se redirige a `/keystatic/login`, y las peticiones a la API del panel (`/api/keystatic/*`) devuelven `401` sin sesión válida.

**Credenciales (variables de entorno):**

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=cambia-esta-contrasena
```

- Copia `.env.example` a `.env` y define `ADMIN_PASSWORD` **antes de publicar**.
- En desarrollo, si no se define, se usan `admin` / `admin` (solo localhost, con aviso en la pantalla de login).
- En producción sin `ADMIN_PASSWORD`, el panel queda **deshabilitado** por seguridad.

La sesión se guarda en una cookie firmada (HMAC) de 30 días; la contraseña nunca viaja en la cookie y la comparación es a prueba de tiempos (`timingSafeEqual`). Cierre de sesión: botón **Salir** (flotante, con icono) dentro del panel, botón **Cerrar sesión** en la pantalla de login, o la ruta `/api/logout`.

## 🗂️ Estructura del contenido

```text
src/content/
├── site/index.yaml           # Configuración global + hero + cifras + valores + tipografías
├── textos/index.yaml         # Configuración del Contenido (100% personalizable desde el panel)
├── afiliacion/index.yaml     # Planes, requisitos y notas de afiliación
├── services/*.yaml           # Los 4 servicios
└── blog/*.md                 # Artículos de noticias
```

El esquema de cada colección está en `keystatic.config.ts` (panel) y debe coincidir con `src/content.config.ts` (tipos de Astro). `src/lib/content.ts` expone helpers tipados para leer los datos.

## 📂 Estructura del proyecto

```text
/
├── keystatic.config.ts       # Definición del panel (colecciones y secciones)
├── public/images/            # Imágenes del sitio (gestionables desde el panel)
├── src/
│   ├── components/           # Header, Footer, tarjetas, secciones
│   ├── content/              # Contenido gestionado por el panel
│   ├── layouts/Layout.astro
│   ├── lib/                  # content.ts (lectura), format.ts (fechas/moneda es-CO)
│   └── pages/                # Las rutas del sitio
├── astro.config.mjs          # Tailwind, sitemap, React, Keystatic, adaptador Vercel
└── src/styles/global.css     # Tema (design tokens: paleta corporativa y tipografías)
```

## 🎨 Identidad corporativa

La paleta se extrajo del **logo oficial del perfil de Instagram** (`@serviciosprofesionaleshl`): **dorado + negro**. La identidad visual usa tres elementos separados: **logo** (monograma HL dorado en anillo, `public/images/logo.png`, PNG transparente), **“Servicios Profesionales”** (tipografía script con degradado dorado) y **“Servir es nuestro compromiso”** (lema en mayúsculas blancas). El conjunto se muestra en el header, el footer, el login y el panel.

| Token | Color | Uso |
|---|---|---|
| `brand-500` | `#C9A227` dorado corporativo | Botones, enlaces, acentos y resaltados |
| `brand-50…400` | Dorados claros | Fondos de sección, iconos, hover |
| `ink-950` | `#0B0B0D` negro | Héroes, header, footer y superficies oscuras |
| `ink-100…500` | Grises neutros | Texto y elementos secundarios |

Los tokens viven en `src/styles/global.css` (`@theme`). Tipografías: **Playfair Display** (títulos) + **Inter** (texto). La especificación completa del sistema de diseño y del dashboard está en [`docs/ESPECIFICACION-DASHBOARD.md`](docs/ESPECIFICACION-DASHBOARD.md).

## 🚀 Publicación automática con GitHub (paso a paso)

Con el modo GitHub activo, editas desde la web y los cambios se publican solos. Requiere una sola configuración manual: **crear la GitHub App** (el propio panel te guía).

### 1. Sube el proyecto a GitHub

Crea un repositorio (p. ej. `hl-servicios-profesionales`) en tu cuenta de GitHub y sube el proyecto (todos los archivos **excepto** `node_modules` y `.env`).

### 2. Activa el modo GitHub localmente

En tu `.env` local (copia de `.env.example`):

```env
PUBLIC_KEYSTATIC_GITHUB_REPO=tu-usuario/hl-servicios-profesionales
```

### 3. Crea la GitHub App desde el panel

Con el servidor local corriendo, entra a **`/keystatic`** → inicia sesión con tu contraseña → pulsa **“Log in with GitHub”**. La primera vez, el propio Keystatic te guía para **crear la GitHub App** y concederle acceso al repositorio. Al terminar se generan estas variables en tu `.env`:

```env
KEYSTATIC_GITHUB_CLIENT_ID=...
KEYSTATIC_GITHUB_CLIENT_SECRET=...
KEYSTATIC_SECRET=...
PUBLIC_KEYSTATIC_GITHUB_APP_SLUG=...
```

### 4. Despliega con publicación automática

Elige un hosting con **Node.js** y **despliegue automático al hacer push**:

- **Render (recomendado)** → conecta el repositorio; *Build Command* `npm run build`, *Start Command* `node dist/server/entry.mjs`, auto-deploy ON.
- **Railway / Fly.io** → mismos requisitos (Node + auto-deploy).
- **Vercel / Netlify** → cambia el adaptador en `astro.config.mjs` (`@astrojs/vercel` o `@astrojs/netlify`) y conecta el repositorio.

Copia al panel de variables del hosting las **6 variables**: `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `PUBLIC_KEYSTATIC_GITHUB_REPO`, `KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET`, `KEYSTATIC_SECRET` y `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG`.

### 5. Añade la URL del sitio a la GitHub App

Si al autenticarte en la web publicada aparece el error *“The redirect_uri is not associated with this application”*, añade la URL del sitio desplegado como **Callback URL** en la configuración de tu GitHub App (GitHub → Settings → Developer settings → GitHub Apps).

### 6. ¡A publicar!

En `https://tu-sitio.com/keystatic`: inicia sesión (contraseña + GitHub) → edita cualquier sección → guarda. Keystatic hace **commit y push** al repositorio y el hosting **redespliega solo**. En unos minutos tu web muestra los cambios.

> El modo GitHub añade la autenticación de GitHub encima de la contraseña del panel: dos capas de seguridad.

## 📦 Despliegue en Vercel (recomendado)

El proyecto está configurado con el adaptador **`@astrojs/vercel`**: las 9 páginas se publican como HTML estático (CDN de Vercel) y el panel de administración (`/keystatic`, `/api/keystatic`, login) se sirve como función serverless con Node 24.

### Pasos

1. **Sube el proyecto a GitHub** (necesario para el despliegue automático y para el modo GitHub del panel).
2. **Crea la GitHub App del panel** siguiendo la guía de arriba (con el servidor local) y copia las variables `KEYSTATIC_*` generadas en tu `.env`.
3. **Importa el repositorio en Vercel** (vercel.com/new → *Import* → repositorio). Vercel detecta Astro automáticamente:
   - *Build Command*: `npm run build`
   - *Output Directory*: se configura solo con el adaptador (`.vercel/output`)
   - *Framework Preset*: Astro
4. **Añade las variables de entorno** en *Project → Settings → Environment Variables* (entorno *Production*):
   ```env
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=tu-contraseña-segura
   PUBLIC_KEYSTATIC_GITHUB_REPO=tu-usuario/hl-servicios-profesionales
   KEYSTATIC_GITHUB_CLIENT_ID=...
   KEYSTATIC_GITHUB_CLIENT_SECRET=...
   KEYSTATIC_SECRET=...
   PUBLIC_KEYSTATIC_GITHUB_APP_SLUG=...
   ```
5. **Despliega.** El panel quedará disponible en `https://tu-sitio.vercel.app/keystatic`.
6. Si al autenticarte con GitHub aparece el error *“The redirect_uri is not associated with this application”*, añade `https://tu-sitio.vercel.app` como **Callback URL** en la configuración de tu GitHub App.

> ⚠️ **Importante:** en Vercel el panel **debe** funcionar en **modo GitHub** (con `PUBLIC_KEYSTATIC_GITHUB_REPO` definido). El modo local no puede guardar archivos en la nube. Cada vez que guardes un cambio en el panel, Keystatic hace push a GitHub y Vercel **redespliega automáticamente**.

### Alternativa: host con Node (Render / Railway / VPS)

Si prefieres otro hosting, instala el adaptador de Node y revierte el de Vercel:

```sh
npm install @astrojs/node
npm uninstall @astrojs/vercel
```

En `astro.config.mjs` cambia `vercel()` por `node({ mode: 'standalone' })`. Build: `npm run build`; start: `node dist/server/entry.mjs`. El panel en modo local solo es recomendable en un servidor propio (escribe archivos en disco).

## ✏️ Antes de publicar

1. **Datos de contacto** → Panel → *Configuración del sitio*. WhatsApp/teléfono ya actualizados con el número real (`+57 315 340 1391`, de la bio de Instagram); falta confirmar el **correo electrónico** real.
2. **Formulario** → en `src/pages/contacto.astro` reemplaza la acción `https://formspree.io/f/YOUR_FORM_ID` por tu endpoint real.
3. **Dominio** → cambia `site` en `astro.config.mjs` y renueva/arregla el certificado SSL del hosting (el actual está roto).

## ➕ Añadir un artículo

Dos formas equivalentes:
- **Panel**: *Noticias* → *Add* → rellena y guarda (se crea el archivo automáticamente).
- **A mano**: crea un Markdown en `src/content/blog/` con el encabezado `title`, `description`, `pubDate`, `category` y `tags`.
