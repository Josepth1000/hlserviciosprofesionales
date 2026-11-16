/**
 * Analítica del sitio — Umami (sin cookies, sin banner).
 *
 * Decisiones:
 *  - El script se inyecta desde aquí (no desde el HTML) para que el visitante
 *    nunca cargue un tercero que no vaya a usarse: si no hay ID o estamos en
 *    local, no se descarga nada.
 *  - `data-auto-track="false"`: con las View Transitions de Astro el documento
 *    no se recarga, así que el pageview se envía a mano en `astro:page-load`
 *    (que dispara en la carga inicial y en cada navegación).
 *  - Los eventos de negocio se capturan por delegación sobre `document`:
 *    funciona con el contenido que sustituye el router sin tocar componentes.
 *  - Una sola propiedad por evento: en Umami cada propiedad guardada cuenta
 *    como un evento más y el plan gratuito son 100.000 al mes.
 *  - `data-do-not-track="true"`: quien activa DNT no se mide.
 *
 * Si algún día se reactiva la CSP en `src/middleware.ts` (hoy está comentada),
 * debe permitir los dos hosts reales de Umami (el script se sirve desde cloud
 * y los eventos se envían a gateway):
 *   script-src  https://cloud.umami.is
 *   connect-src https://cloud.umami.is https://gateway.umami.is
 */

type Props = Record<string, string | number | boolean | null | undefined>;
type Umami = { track: (name?: string | Props, data?: Props) => void };

/** ID público del sitio en Umami (viaja en el HTML de cualquier web que lo use). */
const DEFAULT_WEBSITE_ID = '9dd88ebc-9255-4d57-986f-4fb6cf071436';
const DEFAULT_HOST = 'https://cloud.umami.is';

const env = import.meta.env as Record<string, string | undefined>;
const WEBSITE_ID = env.PUBLIC_UMAMI_WEBSITE_ID || DEFAULT_WEBSITE_ID;
const HOST = (env.PUBLIC_UMAMI_HOST || DEFAULT_HOST).replace(/\/+$/, '');
const DEBUG = String(env.PUBLIC_UMAMI_DEBUG ?? '') === 'true';

const isLoopback = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(window.location.hostname);
/** En local no se envía nada salvo que se active PUBLIC_UMAMI_DEBUG. */
const ENABLED = Boolean(WEBSITE_ID) && (!isLoopback || DEBUG);

let queue: Array<(u: Umami) => void> = [];
let scriptRequested = false;

function flush() {
  const u = window.umami;
  if (!u || !queue.length) return;
  const pending = queue;
  queue = [];
  for (const send of pending) send(u);
}

function injectScript() {
  if (scriptRequested) return;
  scriptRequested = true;
  const s = document.createElement('script');
  s.src = `${HOST}/script.js`;
  s.async = true;
  s.defer = true;
  s.dataset.websiteId = WEBSITE_ID;
  s.dataset.autoTrack = 'false';
  s.dataset.doNotTrack = 'true';
  s.dataset.cache = 'true';
  s.addEventListener('load', flush, { once: true });
  document.head.appendChild(s);
  // Red de seguridad: si el evento load no llega (caché, bloqueadores),
  // reintentar el vaciado cuando `window.umami` ya exista.
  window.setTimeout(flush, 1200);
  window.setTimeout(flush, 3000);
}

/** Envía un evento (`name`) o un pageview (sin argumentos). */
export function track(name?: string, data?: Props) {
  if (!ENABLED) return;
  const send = (u: Umami) => (name ? u.track(name, data) : u.track());
  if (window.umami) {
    send(window.umami);
    return;
  }
  if (queue.length > 20) return; // no acumular si el script no carga
  queue.push(send);
  injectScript();
}

declare global {
  interface Window {
    umami?: Umami;
  }
}

// ---------------------------------------------------------------- origen del clic
function origenDe(a: HTMLAnchorElement): string {
  const custom = a.dataset.analyticsOrigen;
  if (custom) return custom;
  if (a.id === 'wa-fab') return 'flotante';
  if (a.closest('.plan-cell')) return 'planes';
  if (a.closest('header')) return 'cabecera';
  if (a.closest('footer')) return 'pie';
  return 'contenido';
}

const REDES: Array<[RegExp, string]> = [
  [/instagram\.com/i, 'Instagram'],
  [/facebook\.com/i, 'Facebook'],
  [/tiktok\.com/i, 'TikTok'],
  [/youtube\.com|youtu\.be/i, 'YouTube'],
  [/linkedin\.com/i, 'LinkedIn'],
  [/^https?:\/\/(www\.)?(x|twitter)\.com/i, 'X'],
];

// ------------------------------------------------------------- eventos (delegado)
document.addEventListener(
  'click',
  (event) => {
    if (!ENABLED) return;
    const a = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!a) return;
    const href = a.getAttribute('href') ?? '';

    if (/wa\.me|api\.whatsapp\.com|whatsapp:\/\//i.test(href)) {
      track('whatsapp', { origen: origenDe(a) });
      return;
    }
    if (href.startsWith('tel:')) {
      track('telefono', { origen: origenDe(a) });
      return;
    }
    if (href.startsWith('mailto:')) {
      track('correo', { origen: origenDe(a) });
      return;
    }
    if (/google\.[a-z.]+\/maps|maps\.google|goo\.gl\/maps/i.test(href)) {
      track('mapa', { origen: origenDe(a) });
      return;
    }
    for (const [re, red] of REDES) {
      if (re.test(href)) {
        track('red-social', { red });
        return;
      }
    }
  },
  { capture: true },
);

// ------------------------------------------------------- profundidad de lectura
let enviado75 = false;

function onScroll() {
  if (!ENABLED || enviado75) return;
  const recorrible = document.documentElement.scrollHeight - window.innerHeight;
  if (recorrible < window.innerHeight * 0.5) return; // páginas cortas: no aplica
  if (window.scrollY / recorrible >= 0.75) {
    enviado75 = true;
    track('lectura-75');
  }
}

window.addEventListener('scroll', onScroll, { passive: true });

// ------------------------------------------------------------------- arranque
document.addEventListener('astro:page-load', () => {
  if (!ENABLED) return;
  enviado75 = false;
  injectScript();
  track(); // pageview (incluye las navegaciones del ClientRouter)
  onScroll(); // por si la página llega ya desplazada
});
