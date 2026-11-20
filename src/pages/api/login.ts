import type { APIRoute } from 'astro';
import { timingSafeEqual } from 'node:crypto';
import { SESSION_COOKIE, createSessionToken, getCredentials, SESSION_COOKIE_OPTIONS } from '../../lib/auth';
import { createRateLimiter, getClientIp } from '../../lib/rate-limit';

export const prerender = false;

// Límite por IP compartido con el resto de rutas (ver src/lib/rate-limit.ts):
// frena la fuerza bruta contra la contraseña del panel. En Vercel cada
// instancia lleva su propio contador, así que es una barrera, no una cuota.
const limite = createRateLimiter({ limit: 10, windowMs: 15 * 60 * 1000 });

// Comparación en tiempo constante: ni el usuario ni la contraseña deben
// delatarse por lo que tarda la respuesta. Longitudes distintas no llegan a
// `timingSafeEqual`, que exige buffers del mismo tamaño.
function iguales(dato: string, esperado: string): boolean {
  const a = Buffer.from(dato);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const POST: APIRoute = async ({ request, cookies, redirect, url, clientAddress }) => {
  const ip = getClientIp(request, clientAddress);
  // Antes de leer el cuerpo: un bot no llega a hacer trabajar al servidor.
  if (!limite.check(ip)) return redirect('/keystatic/login?reason=limite');

  // Un cuerpo que no sea de formulario (p. ej. un POST vacío de un bot) hace
  // fallar `formData()`; se responde 400 en lugar de dejar caer un 500.
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return new Response('Solicitud inválida: se esperaba un formulario', { status: 400 });
  }
  const username = String(form.get('username') ?? '');
  const password = String(form.get('password') ?? '');
  const creds = getCredentials();

  if (!creds) {
    return new Response('Credenciales de administración no configuradas', { status: 500 });
  }

  if (iguales(username, creds.username) && iguales(password, creds.password)) {
    limite.forget(ip);
    cookies.set(SESSION_COOKIE, createSessionToken(), SESSION_COOKIE_OPTIONS);

    const nextParam = url.searchParams.get('next');
    const safeNext = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/keystatic';
    return redirect(safeNext);
  }

  return redirect('/keystatic/login?error=1');
};
