import type { APIRoute } from 'astro';
// Las extensiones `.ts` son para que `tests/login-panel.test.mjs` pueda cargar
// esta ruta con Node a secas; Astro y Vite las aceptan igual.
import { SESSION_COOKIE, createSessionToken, getCredentials, SESSION_COOKIE_OPTIONS } from '../../lib/auth.ts';
import { createRateLimiter, getClientIp } from '../../lib/rate-limit.ts';
import { decidirLogin, type FormularioLogin } from '../../lib/login-panel.ts';
import { RUTA_LOGIN } from '../../lib/acceso-panel.ts';

export const prerender = false;

// Límite por IP compartido con el resto de rutas (ver src/lib/rate-limit.ts):
// frena la fuerza bruta contra la contraseña del panel. En Vercel cada
// instancia lleva su propio contador, así que es una barrera, no una cuota.
const limite = createRateLimiter({ limit: 10, windowMs: 15 * 60 * 1000 });

// Un cuerpo que no sea de formulario (p. ej. un POST vacío de un bot) hace
// fallar `formData()`: se marca como inválido en lugar de dejar caer un 500.
async function leerFormulario(request: Request): Promise<FormularioLogin | null> {
  try {
    const form = await request.formData();
    return {
      username: String(form.get('username') ?? ''),
      password: String(form.get('password') ?? ''),
    };
  } catch {
    return null;
  }
}

export const POST: APIRoute = async ({ request, cookies, redirect, url, clientAddress }) => {
  const ip = getClientIp(request, clientAddress);
  // Antes de leer el cuerpo: un bot no llega a hacer trabajar al servidor.
  const permitido = limite.check(ip);

  // Las reglas viven en src/lib/login-panel.ts, donde se prueban sin Astro.
  const resultado = decidirLogin({
    permitido,
    formulario: permitido ? await leerFormulario(request) : null,
    credenciales: getCredentials(),
    next: url.searchParams.get('next'),
  });

  switch (resultado.estado) {
    case 'limite':
      return redirect(`${RUTA_LOGIN}?reason=limite`);
    case 'invalido':
      return new Response('Solicitud inválida: se esperaba un formulario', { status: 400 });
    case 'sin-configuracion':
      return new Response('Credenciales de administración no configuradas', { status: 500 });
    case 'rechazado':
      return redirect(`${RUTA_LOGIN}?error=1`);
    case 'ok':
      limite.forget(ip);
      cookies.set(SESSION_COOKIE, createSessionToken(), SESSION_COOKIE_OPTIONS);
      return redirect(resultado.next);
  }
};
