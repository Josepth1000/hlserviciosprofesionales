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
import { decidirAcceso, pideHtml } from './lib/acceso-panel';

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, cookies, request } = context;
  const path = url.pathname;

  const html = pideHtml(request.headers.get('accept'));
  const sesion = validateSession(cookies.get(SESSION_COOKIE)?.value);
  const decision = decidirAcceso(path, {
    configurado: isConfigured(),
    sesion: { valida: sesion.valid, motivo: sesion.reason },
  });

  // Las rutas del sitio y la pantalla de login no pasan por el control.
  if (decision.tipo === 'publico') return next();

  // Sin credenciales configuradas (producción) → panel deshabilitado
  if (decision.tipo === 'deshabilitado') {
    const body = html
      ? '<!doctype html><html lang="es"><body style="font-family:sans-serif;padding:3rem;text-align:center"><h1>Panel deshabilitado</h1><p>Configura las variables <code>ADMIN_PASSWORD</code> y <code>SESSION_SECRET</code> para habilitar el panel de administración.</p></body></html>'
      : JSON.stringify({ error: 'Panel deshabilitado: configura ADMIN_PASSWORD y SESSION_SECRET' });
    return new Response(body, {
      status: 503,
      headers: {
        'Content-Type': html ? 'text/html; charset=utf-8' : 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }

  // Cierre automático por inactividad o por el tope absoluto de 7 días.
  if (decision.tipo === 'expirada') {
    cookies.delete(SESSION_COOKIE, { path: '/' });
    if (html) return context.redirect(decision.redirigir);
    return new Response(JSON.stringify({ error: decision.mensaje }), {
      status: 401,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  // Navegación del navegador → al login; peticiones de API → 401.
  if (decision.tipo === 'sin-sesion') {
    if (html) return context.redirect(decision.redirigir);
    return new Response(JSON.stringify({ error: decision.mensaje }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }

  // Sesión válida: se deja pasar y se inyecta la personalización del panel.
  // Guardado del panel: Keystatic reescribe el YAML completo. Antes de dejarlo
  // pasar se guarda el texto original, y después de escribir se le devuelve su
  // formato para que el diff muestre solo el campo editado.
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
  if (path.startsWith('/keystatic') && html) {
    const serviceImages = await getServiceImageMap();
    finalResponse = await injectPanelTheme(response, serviceImages);
  }

  // Refresca el token de sesión (a lo sumo una vez por minuto) para mantener
  // viva la sesión. El cookie se envía como header Set-Cookie directamente en
  // la respuesta, sin depender de JavaScript del cliente, y con los mismos
  // atributos que fija el login (ver sessionCookieHeader).
  if (sesion.age > ACTIVITY_REFRESH_MS) {
    finalResponse.headers.append('Set-Cookie', sessionCookieHeader(createRefreshedToken(sesion.createdAt)));
  }
  return finalResponse;
});

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
