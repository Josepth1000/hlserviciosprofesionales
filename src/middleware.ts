import { defineMiddleware } from 'astro:middleware';
import { readPendingYaml, restoreOriginalFormat, type PendingYamlFile } from './lib/keystatic/preserveYaml';
import { getCollection, getEntry } from 'astro:content';
import { injectPanelTheme } from './lib/keystatic/panel';
import {
  SESSION_COOKIE,
  ACTIVITY_REFRESH_MS,
  isConfigured,
  validateSession,
  createRefreshedToken,
  sessionCookieHeader,
} from './lib/auth';

const PROTECTED_PREFIXES = ['/keystatic', '/api/keystatic'];

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, cookies, request } = context;
  const path = url.pathname;

  const isProtected = PROTECTED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
  if (!isProtected) return next();

  // La página de inicio de sesión es pública
  if (path === '/keystatic/login') return next();

  // Sin credenciales configuradas (producción) → panel deshabilitado
  if (!isConfigured()) {
    const body = isHtmlRequest(request)
      ? '<!doctype html><html lang="es"><body style="font-family:sans-serif;padding:3rem;text-align:center"><h1>Panel deshabilitado</h1><p>Configura la variable <code>ADMIN_PASSWORD</code> para habilitar el panel de administración.</p></body></html>'
      : JSON.stringify({ error: 'Panel deshabilitado: configura ADMIN_PASSWORD' });
    return new Response(body, {
      status: 503,
      headers: { 'Content-Type': isHtmlRequest(request) ? 'text/html; charset=utf-8' : 'application/json' },
    });
  }

  // Sesión válida → continúa (e inyecta la personalización del panel)
  const session = validateSession(cookies.get(SESSION_COOKIE)?.value);
  if (session.valid) {
    // Cierre automático por inactividad: el timestamp viene embebido en
    // el token de sesión (formato: username.timestamp.hmac). Si la última
    // actividad fue hace más de 30 minutos, se cierra la sesión.
    if (session.expired) {
      cookies.delete(SESSION_COOKIE, { path: '/' });
      if (isHtmlRequest(request)) {
        return context.redirect('/keystatic/login?error=1&reason=expired');
      }
      return new Response(JSON.stringify({ error: 'Sesión expirada por inactividad' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    // Guardado del panel: Keystatic reescribe el YAML completo. Antes de
    // dejarlo pasar se guarda el texto original, y después de escribir se le
    // devuelve su formato para que el diff muestre solo el campo editado.
    const isUpdate = request.method === 'POST' && path === '/api/keystatic/update';
    let updateBody = '';
    let pendingYaml: PendingYamlFile[] = [];
    if (isUpdate) {
      try {
        updateBody = await request.clone().text();
        pendingYaml = await readPendingYaml(updateBody);
      } catch {
        pendingYaml = [];
      }
    }

    const response = await next();

    if (pendingYaml.length && response.ok) {
      await restoreOriginalFormat(updateBody, pendingYaml);
    }

    // Se inyecta en cualquier ruta del panel (no solo /keystatic): la app de
    // Keystatic navega por rutas como /keystatic/collection/... y /keystatic/
    // singleton/... y al recargar directamente ahí también debe llevar la
    // personalización. /keystatic/login ya retornó antes.
    let finalResponse = response;
    if (path.startsWith('/keystatic') && isHtmlRequest(request)) {
      const serviceImages = await getServiceImageMap();
      finalResponse = await injectPanelTheme(response, serviceImages);
    }

    // Refresca el token de sesión (a lo sumo una vez por minuto) para
    // mantener viva la sesión. El cookie se envía como header Set-Cookie
    // directamente en la respuesta, sin depender de JavaScript del cliente, y
    // con los mismos atributos que fija el login (ver sessionCookieHeader).
    if (session.age > ACTIVITY_REFRESH_MS) {
      finalResponse.headers.append('Set-Cookie', sessionCookieHeader(createRefreshedToken()));
    }
    return finalResponse;
  }

  // Navegación del navegador → redirigir al inicio de sesión
  if (isHtmlRequest(request)) {
    return context.redirect(`/keystatic/login?next=${encodeURIComponent(path)}`);
  }

  // Peticiones de API sin sesión → 401
  return new Response(JSON.stringify({ error: 'No autorizado' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
});

function isHtmlRequest(request: Request): boolean {
  return request.headers.get('accept')?.includes('text/html') ?? false;
}

// Imágenes efectivas de los servicios para miniaturas del panel y respaldo del
// editor. La fuente principal es la propia ficha de cada servicio (campo
// "Imagen" de la colección, que es donde el cliente sube las imágenes); la
// Configuración del sitio queda solo como respaldo para servicios sin imagen.
// Si el contenido no está disponible (p. ej. arranque), se devuelve un mapa
// vacío y la lista usa la imagen de cada ficha (que ya está en la celda).
async function getServiceImageMap(): Promise<Record<string, string>> {
  try {
    const [services, site] = await Promise.all([
      getCollection('services'),
      getEntry('site', 'index'),
    ]);
    // Configuración del sitio como respaldo (servicios sin imagen propia)
    const fallback: Record<string, string> = {};
    for (const item of site?.data.serviceImages ?? []) {
      if (item?.service && item?.image) fallback[item.service] = item.image;
    }
    const map: Record<string, string> = {};
    for (const s of services) {
      const img = s.data.image ?? fallback[s.data.title] ?? '';
      map[s.data.title] = img;
      // Clave adicional por slug para que enhanceTable() pueda buscar
      // por el data-key del row en producción (modo GitHub)
      map[s.id] = img;
    }
    return map;
  } catch (err) {
    console.error('[HL] getServiceImageMap error:', err);
    return {};
  }
}
