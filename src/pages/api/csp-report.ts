import type { APIRoute } from 'astro';

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
const LIMITE = 40;
const VENTANA_MS = 10 * 60 * 1000;
const MAX_CUERPO = 24 * 1024;
const intentos = new Map<string, number[]>();

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

const sinRespuesta = () =>
  new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });

const recortar = (valor: unknown, maximo = 300): string =>
  typeof valor === 'string' ? valor.slice(0, maximo) : '';

interface Informe {
  tipo: string;
  directiva: string;
  bloqueado: string;
  documento: string;
  origen: string;
  disposicion: string;
}

function normalizar(entrada: unknown): Informe | null {
  if (!entrada || typeof entrada !== 'object') return null;
  const registro = entrada as Record<string, unknown>;

  // Reporting API: { type, body: { … } }
  // CSP clásico:   { "csp-report": { … } }
  const cuerpo =
    registro.body && typeof registro.body === 'object'
      ? (registro.body as Record<string, unknown>)
      : registro['csp-report'] && typeof registro['csp-report'] === 'object'
        ? (registro['csp-report'] as Record<string, unknown>)
        : registro;

  if (typeof registro.type === 'string' && registro.type !== 'csp-violation') return null;

  // CSP clásico: { "csp-report": { "blocked-uri": … } } (claves con guiones)
  const directiva =
    cuerpo.effectiveDirective ?? cuerpo.violatedDirective ?? cuerpo['violated-directive'];
  const bloqueado = cuerpo.blockedURL ?? cuerpo.blockedUri ?? cuerpo['blocked-uri'];
  const documento = cuerpo.documentURL ?? cuerpo.documentUri ?? cuerpo['document-uri'];

  if (!directiva && !bloqueado) return null;

  return {
    tipo: 'csp-violation',
    directiva: recortar(directiva, 120),
    bloqueado: recortar(bloqueado),
    documento: recortar(documento),
    origen: recortar(cuerpo.sourceFile ?? cuerpo['source-file']),
    disposicion: recortar(cuerpo.disposition, 40),
  };
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  let ip = 'desconocida';
  try {
    ip = clientAddress || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || ip;
  } catch {
    /* algunos entornos no exponen clientAddress */
  }
  if (!permitido(ip)) return sinRespuesta();

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
    .map(normalizar)
    .filter((informe): informe is Informe => informe !== null);

  for (const informe of informes) {
    console.warn('[csp]', JSON.stringify({ ...informe, ip }));
  }

  return sinRespuesta();
};

export const GET: APIRoute = () => new Response(null, { status: 405, headers: { Allow: 'POST' } });
