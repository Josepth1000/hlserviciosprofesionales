# Especificación — HL Servicios Profesionales (web + dashboard)

Documento rellenado a partir del prompt de especificación, con los datos reales del proyecto. Lo que **ya está implementado** se marca ✅; lo **propuesto para la siguiente fase** se marca 🔜.

---

## 1. CONTEXTO DEL PROYECTO

- **Nombre del negocio/marca:** HL Servicios Profesionales (Henry López – Servicios Profesionales), Instagram `@serviciosprofesionaleshl`. Lema: *“Servir es nuestro compromiso”*.
- **Industria/nicho:** Servicios profesionales — Seguridad Social (EPS · ARL · CCF · AFP), servicios administrativos, jurídicos y contables, y seguros.
- **Público objetivo del sitio público:** Contratistas, independientes y empresas de Bucaramanga/Santander (Colombia) que necesitan afiliación y asesoría en seguridad social, trámites jurídicos y contables.
- **Público objetivo del dashboard:** Administradores del sitio (el dueño de la firma y/o el equipo interno). No hay roles públicos.
- **Objetivo del sitio público:** Captar leads (asesoría vía WhatsApp/teléfono/formulario), informar sobre servicios y planes, y posicionar la firma como autoridad local (blog de seguridad social).
- **Objetivo del dashboard:** Gestionar todo el contenido del sitio sin código: servicios, planes de afiliación, testimonios, preguntas frecuentes, noticias y configuración global (contacto, hero, cifras, valores). 🔜 En el futuro: métricas de tráfico y leads recibidos.
- **Competidores de referencia:** Bufetes y asesores de seguridad social de Bucaramanga (sin URLs concretas por ahora).
- **Tono de marca:** Serio y confiable, con calidez humana — firma de asesoría con 10+ años de trayectoria. El logo oficial (dorado + negro) impone el carácter.

## 2. ARQUITECTURA DEL PROYECTO (HÍBRIDA)

- ✅ **Astro en modo SSG + rutas dinámicas:** las páginas públicas se prerenderizan como HTML estático (SEO-first); las rutas del panel (`/keystatic`, `/api/keystatic/*`, `/keystatic/login`, `/api/login`, `/api/logout`) se sirven por servidor con el adaptador `@astrojs/vercel` (función serverless Node 24).
- ✅ **Separación de zonas:**
  - `/src/pages/*` → sitio público estático
  - `/src/pages/keystatic/*` y `/src/pages/api/*` → zona autenticada (panel + API)
- ✅ **Autenticación:** propia (usuario/contraseña por variables de entorno `ADMIN_USERNAME` / `ADMIN_PASSWORD`), cookie de sesión firmada con HMAC-SHA256 (httpOnly, SameSite=Lax, Secure en producción, 30 días). 🔜 Se puede migrar a Auth.js/Clerk si se necesita multi-usuario.
- ✅ **Middleware de Astro** (`src/middleware.ts`) protege `/keystatic` y `/api/keystatic` (redirige a login; 401 en API sin sesión).
- ✅ **Fuente de datos:** archivos locales gestionados por **Keystatic CMS** (YAML/Markdown en `src/content/`), con **modo GitHub** opcional (`PUBLIC_KEYSTATIC_GITHUB_REPO`) para publicación automática desde la web. 🔜 Si se añade analítica: Supabase/PostgreSQL vía ORM.
- ✅ **Content Collections de Astro con Zod** (`src/content.config.ts`) para contenido tipado del sitio público (site, afiliación, services, testimonials, faqs, blog).

## 3. STACK TÉCNICO

- ✅ **Framework:** Astro 7 (estable).
- ✅ **Integraciones:** `@tailwindcss/vite` (Tailwind v4), `@astrojs/sitemap`, `@astrojs/react` (islas del panel), `@keystatic/astro`, `@astrojs/vercel`.
- ✅ **Optimización de imágenes:** imágenes optimizadas bajo demanda; se pueden migrar a `astro:assets` (WebP/AVIF) como mejora 🔜.
- ✅ **Islands:** el panel de Keystatic se monta como isla React (`client:load`); el sitio público es HTML estático sin JavaScript de interacción salvo menú móvil y acordeón (scripts vanilla mínimos).
- 🔜 **Dashboard de analítica (propuesto):** React + **shadcn/ui** + Tailwind; gráficas **Recharts**; estado remoto **TanStack Query**; UI state **Zustand**; animaciones **motion**; notificaciones **sonner**.

## 4. SISTEMA DE DISEÑO

- ✅ **Estilo visual:** moderno, corporativo, mobile-first. Héroes oscuros con **glassmorphism sutil** (blur + transparencia) y **brillos radiales** del color de marca; secciones claras con tarjetas redondeadas.
- ✅ **Paleta de colores/marca (extraída del logo oficial de Instagram `@serviciosprofesionaleshl`):**

  | Token | Color | Uso |
  |---|---|---|
  | `brand-500` | `#C9A227` dorado corporativo | Botones, enlaces, resaltados |
  | `brand-50…400` | Dorados claros | Fondos de sección, iconos, hovers |
  | `ink-950` | `#0B0B0D` negro | Héroes, header, footer |
  | `ink-100…500` | Grises neutros | Texto secundario |

  Definidos como design tokens en `src/styles/global.css` (`@theme`).
- ✅ **Tipografía:** Playfair Display (títulos, serif de firma de abogados) + Inter (texto, sans moderna).
- ✅ **Dark mode:** el panel de Keystatic sigue la preferencia del sistema (oscuro/claro); el sitio público usa secciones oscuras + claras por diseño.
- ✅ **Iconografía:** iconos SVG propios (diccionario en `src/components/Icon.astro`). 🔜 Lucide/Phosphor si se crea el dashboard de analítica.
- 🔜 **Bento grid** para el futuro dashboard de KPIs.
- ✅ **Accesible:** contraste AA, `aria-expanded` en acordeón, navegación por teclado, `prefers-reduced-motion` respetado por las transiciones nativas.

## 5. COMPONENTES DEL DASHBOARD

Estado actual (panel Keystatic):
- ✅ Sidebar de navegación con **grupos** (`Contenido`: Servicios, Testimonios, Preguntas frecuentes, Noticias; `Sitio web`: Configuración del sitio, Cómo me afilio).
- ✅ Cabecera con **logo corporativo + nombre de la firma** (`ui.brand`).
- ✅ Interfaz del panel en **español** (`locale: 'es-ES'`).
- ✅ Página de **login propia** (marca, glassmorphism, badges de servicios).
- ✅ Tablas/colecciones con orden, filtros y edición; subida de imágenes; orden arrastrable.

🔜 Propuesto para la fase de analítica:
- Sidebar colapsable + topbar con búsqueda y perfil.
- Cards de KPIs con tendencia (↑↓ %): visitas, formularios recibidos, leads por servicio, mensajes de WhatsApp.
- Gráficas de líneas/barras/dona (Recharts).
- Tablas con ordenamiento, filtros y paginación; empty states y skeletons.

## 6. MICRO-ANIMACIONES DE ESTADO

🔜 Recomendación para el dashboard de analítica (a implementar con motion + sonner):
- **Carga:** skeletons con shimmer replicando la forma del contenido; barra de progreso superior estilo Vercel; spinners solo en acciones puntuales.
- **Guardado:** botón morphing (texto → spinner → check con micro-bounce); optimistic UI con rollback; dim sutil del formulario durante el envío.
- **Feedback:** toasts con slide+fade y auto-dismiss; highlight momentáneo (~600ms) en filas actualizadas; shake + borde rojo en validación.
- **Transiciones:** fade+scale con stagger (50–80ms); count-up en KPIs; morph suave entre datasets; duración 150–500ms; `prefers-reduced-motion` obligatorio.
- ✅ En el sitio público: View Transitions nativas de Astro se pueden activar 🔜; el acordeón ya anima con transiciones CSS.

## 7. ESTRUCTURA Y CONTENIDO

- ✅ **Páginas públicas:** Inicio, Quiénes Somos, Servicios, Cómo me afilio (planes), Noticias + artículos, Contacto.
- ✅ **Secciones del dashboard (CMS):** Servicios (4), Testimonios, Preguntas frecuentes (6), Noticias (3), Configuración del sitio, Cómo me afilio (5 planes + requisitos + notas).
- ✅ **CTA principal:** “Solicitar asesoría” / WhatsApp (`wa.me`) — presente en header, hero, banda CTA y contacto.
- ✅ **Contenido disponible:** sí — migrado del sitio original (WordPress) vía Wayback Machine; textos, imágenes y posts reales.

## 8. SEO TÉCNICO (ZONA PÚBLICA)

- ✅ `title`, `description`, canonical, Open Graph y Twitter Cards vía `src/layouts/Layout.astro`.
- ✅ `sitemap.xml` automático (`@astrojs/sitemap`) y `robots.txt`.
- ✅ Panel y login con `noindex, nofollow` (`/keystatic`, `/keystatic/login`); 🔜 añadir `X-Robots-Tag`/disallow si se crea `/dashboard/*`.
- 🔜 Datos estructurados JSON-LD: `Organization` (firma), `Article` (blog), `FAQPage` (preguntas frecuentes — ya hay un acordeón que se puede marcar).
- ✅ URLs limpias y semánticas; enlazado interno (noticias → blog → servicios).
- ✅ Optimización local: NAP consistente (Carrera 12 # 34 - 67, Oficina 205, Edificio Los Castellanos, Bucaramanga - Santander - Colombia) en footer y contacto. 🔜 Google Business Profile.

## 9. RENDIMIENTO

- ✅ Páginas públicas prerenderizadas (SSG) sin JS pesado; objetivo 95+ en Lighthouse (pendiente medir tras el despliegue).
- ✅ El JavaScript del panel **no se carga** en el sitio público (code splitting natural de Astro).
- ✅ Fuentes con `font-display: swap` y preconnect.
- 🔜 Core Web Vitals: LCP < 2.5s, CLS < 0.1, INP < 200ms (medir y optimizar imágenes a WebP/AVIF).

## 10. ASPECTOS TÉCNICOS ADICIONALES

- ✅ Variables de entorno documentadas en `.env.example` (`ADMIN_USERNAME`, `ADMIN_PASSWORD`, `PUBLIC_KEYSTATIC_GITHUB_REPO`, `KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET`, `KEYSTATIC_SECRET`, `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG`).
- ✅ Formulario de contacto con endpoint de terceros (Formspree) 🔜 añadir honeypot + validación anti-spam.
- ✅ Despliegue: **Vercel** (adaptador `@astrojs/vercel`), con alternativa Render/Railway/VPS con adaptador Node documentada en el README.

## 11. ENTREGABLES ESPERADOS — ESTADO

| # | Entregable | Estado |
|---|---|---|
| 1 | Arquitectura (rutas públicas vs panel, modo de renderizado) | ✅ Implementado |
| 2 | Paleta, tipografía y design tokens (light/dark) | ✅ Implementado (extraído del logo) |
| 3 | Wireframe del dashboard (sidebar, topbar, widgets) | 🔜 Fase analítica |
| 4 | Componentes base del dashboard (Sidebar, KPI Card, Chart, Table) | 🔜 Fase analítica |
| 5 | Micro-animaciones por componente | 🔜 Especificado en §6 |
| 6 | Páginas públicas con SEO integrado | ✅ Implementado |
| 7 | Checklist de SEO técnico | ✅ Parcialmente aplicado (§8) |
| 8 | Recomendaciones de librerías para el dashboard | ✅ En §3/§6 |

## 12. PREGUNTAS DE ACLARACIÓN (para la fase de analítica)

1. **Datos del dashboard:** ¿qué métricas quieres ver — visitas, formularios recibidos, leads por servicio, clics en WhatsApp?
2. **Tiempo real:** ¿necesitas actualización en tiempo real (WebSockets/Supabase Realtime) o basta una actualización periódica (diaria/semanal)?
3. **Autenticación y base de datos:** ¿seguimos con la contraseña actual o prefieres Auth.js/Clerk con usuarios múltiples? ¿Supabase/PostgreSQL para los datos?
4. **Roles:** ¿habrá más de un tipo de usuario (p. ej. administrador vs. editor)?
5. **Exportación:** ¿necesitas exportar datos a PDF/Excel/CSV?
