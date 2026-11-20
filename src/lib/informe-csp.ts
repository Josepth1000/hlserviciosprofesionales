/**
 * Normaliza un informe de violación de la CSP al formato que se escribe en los
 * logs. Los navegadores envían dos formas distintas del mismo aviso:
 *
 *  - Reporting API → { type: 'csp-violation', body: { blockedURL, effectiveDirective, … } }
 *    (claves en camelCase)
 *  - CSP clásico   → { "csp-report": { "blocked-uri": …, "violated-directive": … } }
 *    (claves con guiones)
 *
 * Todo lo que no se reconozca se descarta: los logs no deben llenarse con basura.
 */

const MAX_TEXTO = 300;
const MAX_DIRECTIVA = 120;
const MAX_DISPOSICION = 40;

const recortar = (valor: unknown, maximo = MAX_TEXTO): string =>
  typeof valor === 'string' ? valor.slice(0, maximo) : '';

export interface InformeCsp {
  tipo: string;
  directiva: string;
  bloqueado: string;
  documento: string;
  origen: string;
  disposicion: string;
}

export function normalizarInforme(entrada: unknown): InformeCsp | null {
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

  // La Reporting API puede mandar otros tipos (deprecation, intervention…).
  if (typeof registro.type === 'string' && registro.type !== 'csp-violation') return null;

  // CSP clásico: { "csp-report": { "blocked-uri": … } } (claves con guiones)
  const directiva =
    cuerpo.effectiveDirective ?? cuerpo.violatedDirective ?? cuerpo['violated-directive'];
  const bloqueado = cuerpo.blockedURL ?? cuerpo.blockedUri ?? cuerpo['blocked-uri'];
  const documento = cuerpo.documentURL ?? cuerpo.documentUri ?? cuerpo['document-uri'];

  if (!directiva && !bloqueado) return null;

  return {
    tipo: 'csp-violation',
    directiva: recortar(directiva, MAX_DIRECTIVA),
    bloqueado: recortar(bloqueado),
    documento: recortar(documento),
    origen: recortar(cuerpo.sourceFile ?? cuerpo['source-file']),
    disposicion: recortar(cuerpo.disposition, MAX_DISPOSICION),
  };
}
