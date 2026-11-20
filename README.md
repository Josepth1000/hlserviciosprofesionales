# HL Servicios Profesionales

Sitio web moderno de **Henry López – Servicios Profesionales** (Bucaramanga, Santander), construido sobre **Astro + Tailwind CSS v4** con **Keystatic CMS** como panel de administración, en lugar del antiguo WordPress 4.6.

## ✨ Características

- **16 rutas** (Inicio, Quiénes Somos, Servicios, Cómo me afilio, Noticias, Contacto, Aviso legal, Tratamiento de datos, Cookies y 7 artículos)
- **Panel de administración** en `/keystatic` para editar cada sección e ítem del sitio sin tocar código
- Diseño **100% responsive** (mobile-first) con la **identidad corporativa** de la firma (dorado `#C9A227` + negro `#0B0B0D`, con `brand-700 #866619` para texto dorado sobre fondos claros)
- **SEO**: meta tags, Open Graph, canonical y `sitemap.xml` automático
- Botones de **WhatsApp** integrados, mapa de Google Maps embebido
- Imágenes originales del sitio migradas desde el archivo de Wayback Machine

## ⏳ Pendientes

> Estado al 20 de noviembre de 2026. Solo lo que sigue abierto y bloquea la puesta en marcha.

| # | Pendiente | Estado | Por qué importa |
|---|---|---|---|
| 1 | **Buzón `contacto@hlserviciosprofesionales.com`** (Zoho Mail) | ⏳ **PENDIENTE — aparcado a petición del cliente** | El dominio no tiene MX ni DMARC: ese buzón no existe. Resend acepta el envío del formulario y el correo rebota después, así que **los mensajes se pierden en silencio**. Registros listos en [Correo del dominio](#-correo-del-dominio-zoho-mail--resend). |
| 2 | **Adjuntar `hlserviciosprofesionales.com` y `www` a este proyecto de Vercel** | ⏳ Pendiente | Hoy el apex lo ocupa otro proyecto y sirve un **WordPress 4.6** antiguo (sin CSP). El sitio nuevo solo responde en `pruebas.` (con `noindex`) y en `vercel.app`. |
| 3 | **Quitar `PUBLIC_SITE_URL` de Vercel al migrar** | ⏳ Pendiente | Está fijada a `hlserviciosprofesionales.vercel.app`, así que `og:image` y el JSON-LD apuntan a ese host aunque el canónico sea `www`. Al migrar el dominio, se borra y todo vuelve a `site`. |
| 4 | **Callback `www` en la GitHub App** | ⏳ Pendiente | La cookie del token de Keystatic es por dominio: sin el callback `https://www.…/api/keystatic/github/oauth/callback` no se podrá iniciar sesión desde el dominio definitivo. |

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
| **Configuración del sitio** | Nombre, **marca (texto cursiva)**, eslogan (solo SEO y pantalla de acceso), **animación del puntero (activar/desactivar, efecto: halo dorado / anillo / destellos, tamaño del halo)**, **logo (subible)**, **color principal y color oscuro de la paleta**, **tipografías (texto, títulos y marca, con URL de Google Fonts)**, SEO, teléfono, WhatsApp, correo, dirección, horario, Instagram, portada (hero, **con imagen de fondo subible**), cifras destacadas, **imágenes de los servicios (subibles)**, valores | Todo el sitio |
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
- **Modo GitHub**: define `PUBLIC_KEYSTATIC_GITHUB_REPO=usuario/repositorio` para activarlo. Keystatic conecta el panel al repositorio y cada cambio se **publica automáticamente** al desplegar. Exige una **GitHub App** instalada en el repositorio con permiso *Contents: Read and write* (una OAuth App no sirve, ver [Publicación automática con GitHub](#-publicación-automática-con-github-paso-a-paso)).

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

Los tokens viven en `src/styles/global.css` (`@theme`). Tipografías: **Playfair Display** (títulos) + **Instrument Sans** (texto) + **Great Vibes** (marca). La especificación completa del sistema de diseño y del dashboard está en [`docs/ESPECIFICACION-DASHBOARD.md`](docs/ESPECIFICACION-DASHBOARD.md); las decisiones de identidad (degradado reservado a la marca, contraste, movimiento) están en [`docs/DESIGN.md`](docs/DESIGN.md).

## 🚀 Publicación automática con GitHub (paso a paso)

Con el modo GitHub activo, editas desde la web y los cambios se publican solos: al pulsar **Guardar**, Keystatic crea un commit en el repositorio y Vercel redespliega.

> ⚠️ **Keystatic necesita una GitHub App, no una OAuth App.** Es el error más común al dejar el panel operativo: con una OAuth App el login con GitHub funciona y el contenido se ve, pero al guardar aparece
> `[GraphQL] Your token has not been granted the required scopes to execute this query. The 'createCommitOnBranch' field requires one of the following scopes: ['public_repo'], but your token has only been granted the: [''] scopes`.
> Se distinguen a simple vista: el **Client ID** de una OAuth App empieza por `Ov…` (el de este proyecto, `Ov23li…`); el de una GitHub App, por `Iv…`.

### 1. Sube el proyecto a GitHub

Crea el repositorio (en este proyecto: `Josepth1000/hlserviciosprofesionales`) y sube el código **excepto** `node_modules` y `.env`.

### 2. Activa el modo GitHub

En el `.env` local y en el panel de variables del hosting:

```env
PUBLIC_KEYSTATIC_GITHUB_REPO=Josepth1000/hlserviciosprofesionales
```

Sin esa variable el panel usa el **modo local** (edita archivos en disco), que no sirve en un hosting serverless.

### 3. Crea la GitHub App a mano en GitHub

El asistente **Create GitHub App** que aparece en el panel **solo funciona con `npm run dev`**: el handler `createdGithubApp` de Keystatic responde *«App setup only allowed in development»* cuando `NODE_ENV` no es `development`, así que en producción (Vercel) la app se crea directamente en GitHub.

1. **GitHub → Settings → Developer settings → GitHub Apps → New GitHub App** (`https://github.com/settings/apps/new`).
2. **GitHub App name**: `HL Keystatic` (el nombre es único en todo GitHub; si está ocupado, añade un sufijo).
3. **Homepage URL**: `https://hlserviciosprofesionales.vercel.app`.
4. **Callback URL**: una por cada origen desde el que se entra al panel (GitHub admite hasta 10). Debe coincidir **exactamente** — esquema, dominio y ruta, sin barra final:
   - `https://hlserviciosprofesionales.vercel.app/api/keystatic/github/oauth/callback`
   - `https://pruebas.hlserviciosprofesionales.com/api/keystatic/github/oauth/callback`
   - `https://hlserviciosprofesionales.com/api/keystatic/github/oauth/callback` (cuando el dominio apunte a este proyecto)
   - `http://127.0.0.1:4321/api/keystatic/github/oauth/callback` (solo si además vas a editar en local; entra al panel por `127.0.0.1`, no por `localhost`, porque Keystatic usa el origen exacto de la petición)
5. **Webhook**: deja **Active** desmarcado; Keystatic no usa webhooks. En **User authorization (OAuth)**, deja marcado *Request user authorization (OAuth) during installation* (el asistente de Keystatic crea la app con esa opción: al terminar la instalación GitHub encadena la autorización y vuelves directo al panel).
6. **Repository permissions**: *Contents* → **Read and write** y *Pull requests* → **Read-only**. Es exactamente lo que pide el manifiesto del propio asistente de Keystatic (`contents: write`, `metadata: read`, `pull_requests: read`); *Metadata* queda en *Read-only* automáticamente y el resto, en **No access**. No concedas permisos de cuenta.
7. **Where can this GitHub App be installed?**: *Only on this account* (o *Any account* si el repositorio es de una organización). El asistente de Keystatic la crea como pública —instalable por cualquier cuenta—; limitarla a la tuya funciona igual y es más estricta.
8. **Create GitHub App**.
9. En la página de la app, copia el **Client ID** (`Iv…`) y pulsa **Generate a new client secret**. El secreto solo se muestra una vez.
10. **Install App** → elige la cuenta → **Only select repositories** → `hlserviciosprofesionales` → *Install*.

### 4. Define las variables de entorno

| Variable | Valor |
|---|---|
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | credenciales del panel (contraseña larga y única) |
| `PUBLIC_KEYSTATIC_GITHUB_REPO` | `Josepth1000/hlserviciosprofesionales` |
| `KEYSTATIC_GITHUB_CLIENT_ID` | el **Client ID** de la GitHub App (`Iv…`) |
| `KEYSTATIC_GITHUB_CLIENT_SECRET` | el client secret generado en el paso 3.9 |
| `KEYSTATIC_SECRET` | cadena aleatoria de 32+ caracteres; cifra la cookie del *refresh token*. Si tiene menos, la API falla con *«KEYSTATIC_SECRET must be at least 32 characters long»* |
| `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG` | *slug* de la app: la parte final de `https://github.com/settings/apps/<slug>` (`hl-keystatic` si usaste ese nombre). Keystatic lo usa para el botón **Install GitHub App** (`https://github.com/apps/<slug>/installations/new`); si falta, el panel muestra *«Find the App on GitHub and add the repo»* |

Para generar `KEYSTATIC_SECRET`:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Las variables `PUBLIC_*` se insertan en el bundle durante `npm run build`, así que cambiar `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG` o `PUBLIC_KEYSTATIC_GITHUB_REPO` exige compilar de nuevo (en Vercel, un despliegue nuevo).

En Vercel: *Project → Settings → Environment Variables*, en **Production** y **Preview**. Las variables solo entran en vigor en un despliegue nuevo, así que después de guardarlas hay que **redesplegar**.

### 5. Entra al panel y comprueba el guardado

1. Abre `https://…/keystatic`, inicia sesión con tu contraseña y pulsa **Log in with GitHub**.
2. Si aparece *«The redirect_uri is not associated with this application»*, falta el callback del origen exacto desde el que estás entrando (paso 3.4).
3. Edita algo en *Configuración del sitio* y pulsa **Guardar**: debe crearse un commit en la rama que muestre el selector (por defecto `main`) y Vercel redespliega solo.
4. Si antes habías entrado con la OAuth App, **cierra la sesión de GitHub** en el panel (menú de usuario → *Log out*, o visita `/api/keystatic/github/logout`) y vuelve a entrar: la cookie `keystatic-gh-access-token` anterior seguiría apuntando a la app vieja. Si el error de scopes persiste, revoca la autorización en `https://github.com/settings/applications` y borra las cookies del sitio.

> 📌 **El token de GitHub es una cookie por dominio.** `keystatic-gh-access-token` no se comparte entre orígenes: si el panel se abre desde otro dominio del mismo despliegue (`vercel.app`, `pruebas.…`, `hlserviciosprofesionales.com`), el navegador arrastra el token del login anterior y al guardar aparece el error de scopes con `['']`. En cada dominio hay que hacer **Log out** (menú de usuario → *Log out*, o `/api/keystatic/github/logout`) y volver a pulsar **Log in with GitHub** antes de guardar.

> El modo GitHub añade la autenticación de GitHub encima de la contraseña del panel: dos capas de seguridad. Solo quien tenga acceso de escritura al repositorio **y** la contraseña puede publicar.

> 🔎 **Contrastado con el código instalado** (`@keystatic/core` 0.6.10, `@keystatic/astro` 5.2.0): `githubLogin` fija el callback en `<origen>/api/keystatic/github/oauth/callback` y no envía `scope`; `createdGithubApp` solo responde en desarrollo; el manifiesto del asistente declara esas callbacks, `request_oauth_on_install: true` y los permisos `contents: write` / `metadata: read` / `pull_requests: read`; el botón de instalación se arma con `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG`; y `deriveKey` exige 32 caracteres de `KEYSTATIC_SECRET`. Si actualizas Keystatic, vuelve a revisar estos pasos.

### Alternativa descartada: OAuth App con el scope `public_repo`

Una OAuth App **podría** servir en teoría —GitHub pide exactamente `public_repo` en el error de `createCommitOnBranch`—, pero Keystatic no permite pedir scopes: `githubLogin` (en `@keystatic/core@0.6.10`) construye `https://github.com/login/oauth/authorize` con `client_id` y `redirect_uri` únicamente, sin `scope`, y no hay opción de configuración ni variable de entorno para añadirlo. Para que funcionara habría que parchear `node_modules/@keystatic/core` o interceptar `/api/keystatic/github/login` con una ruta propia que redirija con `scope=public_repo`; ambas cosas se pierden en el siguiente `npm ci` (Vercel usa `installCommand: npm ci`) y dependen de detalles internos de Keystatic. Hay un detalle más: el callback de Keystatic exige que la respuesta del token traiga `expires_in` y `refresh_token` —si faltan, devuelve 401 *«Authorization failed»*—, así que la OAuth App tiene que tener activada *Expire user authorization tokens* en GitHub. Los riesgos frente a la GitHub App, además, son claros:

| | OAuth App con `public_repo` | GitHub App (Contents: Read and write) |
|---|---|---|
| Alcance del token | Escritura en **todos** los repositorios públicos donde el usuario tenga permisos, no solo en este | Solo el repositorio donde se instaló, y solo su contenido |
| Duración | Token de usuario de 8 h, con un *refresh token* que se renueva solo mientras se use: el permiso concedido persiste hasta revocarlo en GitHub | Token de instalación de ~1 hora, renovado por Keystatic |
| Si se filtra | Permite escribir en todos esos repositorios mientras el token siga vigente | Permite escribir en este repositorio, menos de 1 hora |
| Autoría del commit | Tu cuenta personal | La app (`…[bot]`), separada de tu identidad |
| Mantenimiento | Exige parche o wrapper propio en cada actualización de Keystatic | Ruta soportada y documentada por Keystatic |

Por eso este proyecto usa la **GitHub App**. Si creaste una OAuth App para probar, revócala en `https://github.com/settings/applications` y bórrala una vez validada la GitHub App.

## 📦 Despliegue en Vercel (recomendado)

El proyecto está configurado con el adaptador **`@astrojs/vercel`**: las 9 páginas se publican como HTML estático (CDN de Vercel) y el panel de administración (`/keystatic`, `/api/keystatic`, login) se sirve como función serverless con Node 24.

### Pasos

1. **Sube el proyecto a GitHub** (necesario para el despliegue automático y para el modo GitHub del panel).
2. **Crea la GitHub App** siguiendo [la guía de arriba](#-publicación-automática-con-github-paso-a-paso): se crea en GitHub, no desde el panel. Ten a mano su *Client ID* y su client secret.
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
6. Si al autenticarte con GitHub aparece el error *“The redirect_uri is not associated with this application”*, añade la ruta completa `https://tu-sitio.vercel.app/api/keystatic/github/oauth/callback` (no solo el dominio) como **Callback URL** en la configuración de tu GitHub App.

> ⚠️ **Importante:** en Vercel el panel **debe** funcionar en **modo GitHub** (con `PUBLIC_KEYSTATIC_GITHUB_REPO` definido). El modo local no puede guardar archivos en la nube. Cada vez que guardes un cambio en el panel, Keystatic hace push a GitHub y Vercel **redespliega automáticamente**.

### Alternativa: host con Node (Render / Railway / VPS)

Si prefieres otro hosting, instala el adaptador de Node y revierte el de Vercel:

```sh
npm install @astrojs/node
npm uninstall @astrojs/vercel
```

En `astro.config.mjs` cambia `vercel()` por `node({ mode: 'standalone' })`. Build: `npm run build`; start: `node dist/server/entry.mjs`. El panel en modo local solo es recomendable en un servidor propio (escribe archivos en disco).

## 📧 Correo del dominio (Zoho Mail + Resend)

> **Estado: ⏳ pendiente** (nº 1 en [Pendientes](#-pendientes)). Falta crear la cuenta y publicar los registros de abajo; hasta entonces los envíos del formulario no llegan a ninguna bandeja.

Hay dos piezas distintas y conviene no confundirlas:

- **Envío del formulario** → Resend, ya operativo. `src/pages/api/contacto.ts` valida la solicitud y llama a `https://api.resend.com/emails` con `RESEND_API_KEY`; el remitente es `no-reply@hlserviciosprofesionales.com` (`CONTACT_FROM`) y el destino `CONTACT_TO`. La verificación de Resend vive en el subdominio `send.hlserviciosprofesionales.com` (MX hacia `feedback.forge.rmta.net`, SPF propio y DKIM en `resend._domainkey`), así que **no hay que tocar esos registros**.
- **Recepción en buzones reales** → Zoho Mail. Mientras el dominio no tenga MX, cualquier mensaje a `contacto@hlserviciosprofesionales.com` rebota: el formulario puede responder `{"ok":true}` y el visitante ver «Mensaje enviado» sin que el correo llegue a ninguna bandeja.

### Registros en el DNS de Vercel

Todos en el dominio raíz salvo el DKIM, que va en su selector. En el panel de Vercel el nombre se escribe **sin el dominio** (`@` para el raíz) y el valor **sin punto final**.

| Tipo | Nombre | Valor | Prioridad |
|---|---|---|---|
| MX | `@` | `mx.zoho.com` | 10 |
| MX | `@` | `mx2.zoho.com` | 20 |
| MX | `@` | `mx3.zoho.com` | 50 |
| TXT | `@` | `zoho-verification=zbXXXXXXXXXXXXXX.zmverify.zoho.com` | — |
| TXT | `@` | `v=spf1 include:zohomail.com ~all` | — |
| TXT | `zmail._domainkey` | `v=DKIM1; k=rsa; p=<clave que genera el panel>` | — |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:contacto@hlserviciosprofesionales.com; adkim=r; aspf=r; pct=100` | — |

- **Los MX dependen del centro de datos** de la cuenta: `mx.zoho.com` es el de EE. UU. (el que corresponde a Colombia); en `zoho.eu` o `zoho.in` los hostnames cambian. El valor válido es siempre el de *Admin Console → Email Delivery → Tools & Configurations*.
- **El registro de verificación** lo entrega Zoho al añadir el dominio y es obligatorio antes de activar el buzón; el `zb…` es único de tu cuenta.
- **DKIM**: el selector es `zmail._domainkey` y la clave se genera en el panel tras verificar el dominio. Copia el valor literal (`v=DKIM1; k=rsa; p=…`).
- **SPF**: debe quedar **un solo** registro `v=spf1` en el dominio raíz; dos registros se invalidan entre sí. No hay que añadir Resend aquí: sus envíos salen por el subdominio `send.…`, que tiene su propio SPF y return-path, y firman el `From` con el DKIM del dominio.
- **DMARC**: empieza en `p=none` para observar sin bloquear; cuando los informes estén limpios, sube a `p=quarantine` y luego a `p=reject`. `rua` apunta al buzón que vas a crear, así que ese correo debe existir.

### Orden de aplicación

1. Crear la cuenta de Zoho Mail y añadir `hlserviciosprofesionales.com` como dominio.
2. Publicar el TXT de verificación y verificar el dominio en el panel de Zoho.
3. Añadir los tres MX y el SPF.
4. Generar DKIM en Zoho, publicar `zmail._domainkey` y esperar a que el panel lo marque como activo.
5. Publicar `_dmarc` en `p=none`.
6. Crear el buzón `contacto@` (y los alias que necesites) y hacer las pruebas de la sección siguiente.

### Cómo verificarlos

```sh
nslookup -type=MX hlserviciosprofesionales.com 8.8.8.8
nslookup -type=TXT hlserviciosprofesionales.com 8.8.8.8
nslookup -type=TXT zmail._domainkey.hlserviciosprofesionales.com 8.8.8.8
nslookup -type=TXT _dmarc.hlserviciosprofesionales.com 8.8.8.8
```

Sin `nslookup`, sirve DNS-over-HTTPS:

```sh
curl -s -H 'accept: application/dns-json' \
  'https://cloudflare-dns.com/dns-query?name=hlserviciosprofesionales.com&type=MX'
```

Qué debe salir y qué comprobar:

- **MX**: exactamente tres registros (10, 20, 50) y ningún otro; un MX de un proveedor anterior desvía o pierde correo.
- **SPF**: un único TXT que empieza por `v=spf1`, con `include:zohomail.com`. Si aparecen dos, está roto.
- **DKIM**: el TXT del selector devuelve la clave pública (`p=`).
- **DMARC**: `_dmarc` devuelve `v=DMARC1; p=none; …`.
- **Prueba real**: envía un correo desde fuera (Gmail) a `contacto@`, responde desde Zoho y comprueba en «Mostrar original» que salen `spf=pass`, `dkim=pass` y `dmarc=pass`.
- **Formulario**: envía una solicitud desde `/contacto` y confirma que llega al buzón de `CONTACT_TO`.

### Lista de comprobación copiable

```markdown
- [ ] Cuenta de Zoho Mail creada y dominio hlserviciosprofesionales.com añadido
- [ ] TXT zoho-verification publicado y dominio verificado en el panel de Zoho
- [ ] MX 10  mx.zoho.com
- [ ] MX 20  mx2.zoho.com
- [ ] MX 50  mx3.zoho.com
- [ ] TXT SPF  v=spf1 include:zohomail.com ~all  (único v=spf1 del raíz)
- [ ] TXT DKIM zmail._domainkey  v=DKIM1; k=rsa; p=…  (clave del panel)
- [ ] TXT _dmarc  v=DMARC1; p=none; rua=mailto:contacto@hlserviciosprofesionales.com; adkim=r; aspf=r; pct=100
- [ ] Buzón contacto@ creado (y alias de gerencia@ si hace falta)
- [ ] nslookup -type=MX devuelve los tres MX, sin sobrantes
- [ ] nslookup -type=TXT devuelve un solo v=spf1
- [ ] Correo desde fuera llega a contacto@ y se puede responder
- [ ] Solicitud del formulario llega al buzón de CONTACT_TO
- [ ] Cabeceras con spf=pass, dkim=pass, dmarc=pass
- [ ] send.hlserviciosprofesionales.com y resend._domainkey intactos (Resend sigue enviando)
- [ ] CONTACT_FROM / CONTACT_TO revisados en Vercel → Settings → Environment Variables
```

## ✏️ Antes de publicar

1. **Contenido y datos de contacto** → Panel → *Configuración del sitio* y *✍️ Textos del sitio*. Teléfono y WhatsApp están unificados en `+57 315 340 1391` y el correo publicado es `contacto@hlserviciosprofesionales.com`.
2. **Buzón del dominio** → pendiente nº 1 de [Pendientes](#-pendientes). Los registros, el orden de aplicación y la verificación están en [Correo del dominio](#-correo-del-dominio-zoho-mail--resend); mientras el buzón no exista, el formulario responde «enviado» y el mensaje no llega a nadie.
3. **Dominio** → pendiente nº 2: adjuntar `hlserviciosprofesionales.com` y `www` a este proyecto. La rama `preparar-dominio-produccion` deja listo el apex y el TLS lo emite Vercel.
4. **Panel** → al entrar por un dominio nuevo, *Log out* + *Log in with GitHub* (la cookie del token es por dominio).

## ➕ Añadir un artículo

Dos formas equivalentes:
- **Panel**: *Noticias* → *Add* → rellena y guarda (se crea el archivo automáticamente).
- **A mano**: crea un Markdown en `src/content/blog/` con el encabezado `title`, `description`, `pubDate`, `category` y `tags`.
