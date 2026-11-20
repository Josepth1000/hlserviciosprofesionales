import type { APIRoute } from 'astro';
import { SESSION_COOKIE } from '../../lib/auth';

export const prerender = false;

// Cerrar sesión solo por POST: es una acción con efecto, y un GET puede
// dispararse desde un enlace ajeno, una precarga del navegador o un escáner.
// El 303 hace que el navegador siga con un GET a la pantalla de login.
export const POST: APIRoute = async ({ cookies, redirect }) => {
  cookies.delete(SESSION_COOKIE, { path: '/' });
  return redirect('/keystatic/login', 303);
};

export const GET: APIRoute = () =>
  new Response(null, { status: 405, headers: { Allow: 'POST', 'Cache-Control': 'no-store' } });
