import type { APIRoute } from 'astro';
// Extensiones `.ts` para que las pruebas puedan cargar la ruta con Node a secas.
import { createRateLimiter, getClientIp } from '../../lib/rate-limit.ts';
import { redactarIp } from '../../lib/redactar-ip.ts';
import { normalizarInforme, type InformeCsp } from '../../lib/informe-csp.ts';

// Recibe los informes de violación de la CSP que envían los navegadores de los
// visitantes (incluido el panel). Sirve para detectar bloqueos reales que el
// análisis estático no puede ver, sin abrir ninguna fuente en la política.
//
// Acepta los dos formatos vigentes:
//  - Reporting API → Content-Type: application/reports+json, cuerpo: array de
//    { type: 'csp-violation', body: { blockedURL, effectiveDirective, … } }
//  - CSP clásico  → Content-Type: application/csp-report, cuerpo:
//    { "csp-report": { "blocked-uri": …, "violated-directive": … } }
//
// Escribe una línea por informe en los logs de la función (Vercel → Logs) y
// responde 204 sin cuerpo: el navegador no necesita nada más.
export const prerender = false;

// Los informes pueden llegar en ráfagas (una página con muchos recursos
// bloqueados envía uno por recurso). El límite es por IP y por instancia.
const limite = createRateLimiter({ limit: 40, windowMs: 10 * 60 * 1000 });
const MAX_CUERPO = 24 * 1024;

const sinRespuesta = () =>
  new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ip = getClientIp(request, clientAddress);
  if (!limite.check(ip)) return sinRespuesta();

  const largoDeclarado = Number(request.headers.get('content-length') ?? 0);
  if (largoDeclarado > MAX_CUERPO) return sinRespuesta();

  let texto: string;
  try {
    texto = await request.text();
  } catch {
    return sinRespuesta();
  }
  if (!texto || texto.length > MAX_CUERPO) return sinRespuesta();

  let datos: unknown;
  try {
    datos = JSON.parse(texto);
  } catch {
    // Un cuerpo que no es JSON no se registra: evita llenar los logs con basura.
    return sinRespuesta();
  }

  const lista = Array.isArray(datos) ? datos : [datos];
  const informes = lista
    .slice(0, 10)
    .map(normalizarInforme)
    .filter((informe): informe is InformeCsp => informe !== null);

  for (const informe of informes) {
    // La IP va recortada: el aviso de privacidad del sitio dice que no se guardan
    // direcciones IP completas, y para depurar un bloqueo basta la red.
    console.warn('[csp]', JSON.stringify({ ...informe, ipRed: redactarIp(ip) }));
  }

  return sinRespuesta();
};

export const GET: APIRoute = () => new Response(null, { status: 405, headers: { Allow: 'POST' } });
