import type { APIRoute } from 'astro';

// Endpoint ligero de "latido": el panel lo llama al interactuar para renovar
// la cookie de actividad. El middleware ya ha validado la sesión y refrescado
// esa cookie antes de llegar aquí.
export const prerender = false;

export const POST: APIRoute = async () => {
  return new Response(null, { status: 204 });
};