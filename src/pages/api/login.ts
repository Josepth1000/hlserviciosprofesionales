import type { APIRoute } from 'astro';
import { SESSION_COOKIE, createSessionToken, getCredentials, SESSION_COOKIE_OPTIONS } from '../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
  const form = await request.formData();
  const username = String(form.get('username') ?? '');
  const password = String(form.get('password') ?? '');
  const creds = getCredentials();

  if (!creds) {
    return new Response('Credenciales de administración no configuradas', { status: 500 });
  }

  if (username === creds.username && password === creds.password) {
    cookies.set(SESSION_COOKIE, createSessionToken(), SESSION_COOKIE_OPTIONS);

    const nextParam = url.searchParams.get('next');
    const safeNext = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/keystatic';
    return redirect(safeNext);
  }

  return redirect('/keystatic/login?error=1');
};
