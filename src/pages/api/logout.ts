import type { APIRoute } from 'astro';
import { SESSION_COOKIE, ACTIVITY_COOKIE } from '../../lib/auth';

export const prerender = false;

export const GET: APIRoute = async ({ cookies, redirect }) => {
  cookies.delete(SESSION_COOKIE, { path: '/' });
  cookies.delete(ACTIVITY_COOKIE, { path: '/' });
  return redirect('/keystatic/login');
};
