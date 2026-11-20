import type { APIRoute } from 'astro';
import { CONTACT_FROM, CONTACT_TO, RESEND_API_KEY } from 'astro:env/server';
import { getTextosData } from '../../lib/content';
import { createRateLimiter, getClientIp } from '../../lib/rate-limit';
import { validarContacto } from '../../lib/validar-contacto';

// Función de servidor: recibe el formulario de contacto y lo entrega por correo
// con Resend. La clave vive en la variable de entorno RESEND_API_KEY (Vercel →
// Settings → Environment Variables), nunca en el código.
export const prerender = false;

// Destino y remitente se resuelven al atender la petición (no al importar el
// módulo): así el lector de `.env` de desarrollo ya está inicializado.
const DESTINO_POR_DEFECTO = 'contacto@hlserviciosprofesionales.com';
const REMITENTE_POR_DEFECTO =
  'HL Servicios Profesionales <no-reply@hlserviciosprofesionales.com>';

// Límite por IP compartido con el resto de rutas (ver src/lib/rate-limit.ts).
// En Vercel cada instancia lleva su contador: es una barrera contra ráfagas,
// no una cuota exacta.
const limite = createRateLimiter({ limit: 5, windowMs: 10 * 60 * 1000 });

// Las variables llegan por `astro:env/server` (esquema en astro.config.mjs):
// son `secret`, así que Astro no las expone al cliente ni las incrusta en el
// bundle, y en desarrollo las toma de `.env` sin lectores propios.

function json(cuerpo: unknown, status = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

const escapar = (texto: string) =>
  texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

// Solo acepta envíos: un GET a esta ruta no es una página ni un recurso.
export const GET: APIRoute = () =>
  new Response(null, { status: 405, headers: { Allow: 'POST', 'Cache-Control': 'no-store' } });

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

  const ip = getClientIp(request, clientAddress);
  if (!limite.check(ip)) return json({ ok: false, error: 'limite' }, 429);

  let datos: unknown;
  try {
    datos = await request.json();
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

  // Las reglas del formulario viven en src/lib/validar-contacto.ts, donde se
  // prueban sin arrancar Astro.
  const revision = validarContacto(datos);

  // Honeypot: si el campo invisible viene relleno, se responde como si todo
  // fuera bien para no dar pistas al bot, pero no se envía nada.
  if (revision.estado === 'spam') return json({ ok: true });
  if (revision.estado === 'invalido') {
    return json({ ok: false, error: revision.campo }, 422);
  }
  const { nombre, telefono, email, servicio, mensaje } = revision.datos;

  const apiKey = RESEND_API_KEY;
  if (!apiKey) return json({ ok: false, error: 'configuracion' }, 500);
  const destino = CONTACT_TO ?? DESTINO_POR_DEFECTO;
  const remitente = CONTACT_FROM ?? REMITENTE_POR_DEFECTO;

  // El formulario envía el valor técnico («seguros»); el correo debe leer la
  // etiqueta del panel («Seguros»). Si el contenido no estuviera disponible en
  // tiempo de ejecución, se cae al valor técnico sin romper el envío.
  let etiquetaServicio = servicio;
  try {
    const textos = await getTextosData();
    const opcion = textos.contact.form.serviceOptions.find((o) => o.value === servicio);
    if (opcion) etiquetaServicio = opcion.label;
  } catch (error) {
    console.warn('[contacto] sin etiqueta del servicio', error instanceof Error ? error.message : error);
  }

  const filas: Array<[string, string]> = [
    ['Nombre', nombre],
    ['Teléfono', telefono],
    ['Correo', email || 'No indicado'],
    ['Servicio de interés', etiquetaServicio],
  ];

  const texto = [
    'Nuevo mensaje desde el formulario de Solicitud de Asesoría',
    '',
    ...filas.map(([k, v]) => `${k}: ${v}`),
    '',
    'Mensaje:',
    mensaje,
  ].join('\n');

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;color:#0B0B0D;line-height:1.6">
      <h2 style="margin:0 0 16px;font-size:18px">Nuevo mensaje desde el formulario de Solicitud de Asesoría</h2>
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

  const asunto = `Nuevo mensaje de Solicitud de Asesoría · Tema: ${etiquetaServicio}`;

  try {
    const respuesta = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: remitente,
        to: [destino],
        reply_to: email || undefined,
        subject: asunto,
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
