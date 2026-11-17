import type { APIRoute } from 'astro';
import { CONTACT_FROM, CONTACT_TO, RESEND_API_KEY } from 'astro:env/server';

// Función de servidor: recibe el formulario de contacto y lo entrega por correo
// con Resend. La clave vive en la variable de entorno RESEND_API_KEY (Vercel →
// Settings → Environment Variables), nunca en el código.
export const prerender = false;

// Destino y remitente se resuelven al atender la petición (no al importar el
// módulo): así el lector de `.env` de desarrollo ya está inicializado.
const DESTINO_POR_DEFECTO = 'contacto@hlserviciosprofesionales.com';
const REMITENTE_POR_DEFECTO =
  'HL Servicios Profesionales <no-reply@hlserviciosprofesionales.com>';

// Límite por IP en memoria: en Vercel cada instancia tiene la suya, así que es
// una barrera básica contra ráfagas, no un cuota exacta.
const LIMITE = 5;
const VENTANA_MS = 10 * 60 * 1000;
const intentos = new Map<string, number[]>();

// Las variables llegan por `astro:env/server` (esquema en astro.config.mjs):
// son `secret`, así que Astro no las expone al cliente ni las incrusta en el
// bundle, y en desarrollo las toma de `.env` sin lectores propios.

function json(cuerpo: unknown, status = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function permitido(ip: string): boolean {
  const ahora = Date.now();
  const previos = (intentos.get(ip) ?? []).filter((t) => ahora - t < VENTANA_MS);
  if (previos.length >= LIMITE) {
    intentos.set(ip, previos);
    return false;
  }
  previos.push(ahora);
  intentos.set(ip, previos);
  return true;
}

const escapar = (texto: string) =>
  texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

type Cuerpo = {
  nombre?: string;
  telefono?: string;
  email?: string;
  servicio?: string;
  mensaje?: string;
  _empresa?: string;
};

export const POST: APIRoute = async ({ request, clientAddress }) => {
  // Mismo origen: evita que otros sitios usen el endpoint como relay de spam.
  const origen = request.headers.get('origin');
  if (origen) {
    try {
      if (new URL(origen).host !== request.headers.get('host')) {
        return json({ ok: false, error: 'origen' }, 403);
      }
    } catch {
      return json({ ok: false, error: 'origen' }, 403);
    }
  }

  let ip = 'desconocida';
  try {
    ip = clientAddress || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || ip;
  } catch {
    /* en algunos entornos no hay clientAddress */
  }
  if (!permitido(ip)) return json({ ok: false, error: 'limite' }, 429);

  let datos: Cuerpo;
  try {
    datos = (await request.json()) as Cuerpo;
  } catch (error) {
    console.error(
      '[contacto] cuerpo ilegible',
      JSON.stringify({
        tipo: request.headers.get('content-type'),
        largo: request.headers.get('content-length'),
        origen: request.headers.get('origin'),
        modo: request.mode,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return json({ ok: false, error: 'formato' }, 400);
  }

  // Honeypot: si el campo invisible viene relleno, se responde como si todo
  // fuera bien para no dar pistas al bot, pero no se envía nada.
  if ((datos._empresa ?? '').trim()) return json({ ok: true });

  const nombre = (datos.nombre ?? '').trim();
  const telefono = (datos.telefono ?? '').trim();
  const email = (datos.email ?? '').trim();
  const servicio = (datos.servicio ?? '').trim();
  const mensaje = (datos.mensaje ?? '').trim();

  if (nombre.length < 2 || nombre.length > 80) return json({ ok: false, error: 'nombre' }, 422);
  if (!/^[\d\s+().-]{6,30}$/.test(telefono)) return json({ ok: false, error: 'telefono' }, 422);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return json({ ok: false, error: 'email' }, 422);
  }
  if (!servicio || servicio.length > 60) return json({ ok: false, error: 'servicio' }, 422);
  if (mensaje.length < 5 || mensaje.length > 2000) return json({ ok: false, error: 'mensaje' }, 422);

  const apiKey = RESEND_API_KEY;
  if (!apiKey) return json({ ok: false, error: 'configuracion' }, 500);
  const destino = CONTACT_TO ?? DESTINO_POR_DEFECTO;
  const remitente = CONTACT_FROM ?? REMITENTE_POR_DEFECTO;

  const filas: Array<[string, string]> = [
    ['Nombre', nombre],
    ['Teléfono', telefono],
    ['Correo', email || 'No indicado'],
    ['Servicio de interés', servicio],
  ];

  const texto = [
    'Nuevo mensaje desde el formulario del sitio',
    '',
    ...filas.map(([k, v]) => `${k}: ${v}`),
    '',
    'Mensaje:',
    mensaje,
  ].join('\n');

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;color:#0B0B0D;line-height:1.6">
      <h2 style="margin:0 0 16px;font-size:18px">Nuevo mensaje desde el formulario del sitio</h2>
      <table style="border-collapse:collapse;font-size:14px">
        ${filas
          .map(
            ([k, v]) =>
              `<tr><td style="padding:4px 16px 4px 0;color:#6C6C75">${escapar(k)}</td><td style="padding:4px 0"><strong>${escapar(v)}</strong></td></tr>`,
          )
          .join('')}
      </table>
      <p style="margin:16px 0 4px;color:#6C6C75;font-size:14px">Mensaje</p>
      <p style="margin:0;white-space:pre-wrap">${escapar(mensaje)}</p>
    </div>`;

  try {
    const respuesta = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: remitente,
        to: [destino],
        reply_to: email || undefined,
        subject: `Nuevo mensaje del sitio · ${servicio}`,
        text: texto,
        html,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!respuesta.ok) {
      const detalle = await respuesta.text();
      console.error('[contacto] Resend respondió', respuesta.status, detalle.slice(0, 300));
      return json({ ok: false, error: 'envio' }, 502);
    }
  } catch (error) {
    console.error('[contacto] fallo al llamar a Resend', error instanceof Error ? error.message : error);
    return json({ ok: false, error: 'envio' }, 502);
  }

  return json({ ok: true });
};
