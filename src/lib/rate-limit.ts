/**
 * Limitador de intentos por IP para las funciones de servidor.
 *
 * En Vercel cada instancia tiene su propia memoria: esto es una barrera contra
 * ráfagas (fuerza bruta en el login, spam en el formulario, informes de CSP en
 * bucle), no una cuota exacta. Cada ruta crea su propio limitador, así que los
 * contadores de una no interfieren con los de otra.
 */

export interface RateLimitOptions {
  /** Intentos permitidos dentro de la ventana. */
  limit: number;
  /** Duración de la ventana, en milisegundos. */
  windowMs: number;
}

export interface RateLimiter {
  /** Registra un intento y responde si se permite. */
  check(ip: string): boolean;
  /** Olvida los intentos de esa IP (se usa tras un acierto). */
  forget(ip: string): void;
}

// Por encima de este número de IPs se barren las que ya no tienen intentos
// vivos. Sin esto, cada IP visitante dejaría una entrada para siempre.
const MAX_IPS = 1000;

export function createRateLimiter({ limit, windowMs }: RateLimitOptions): RateLimiter {
  const intentos = new Map<string, number[]>();

  function limpiar(ahora: number) {
    for (const [ip, marcas] of intentos) {
      if (!marcas.some((t) => ahora - t < windowMs)) intentos.delete(ip);
    }
  }

  return {
    check(ip) {
      const ahora = Date.now();
      if (intentos.size > MAX_IPS) limpiar(ahora);

      const previos = (intentos.get(ip) ?? []).filter((t) => ahora - t < windowMs);
      if (previos.length >= limit) {
        intentos.set(ip, previos);
        return false;
      }
      previos.push(ahora);
      intentos.set(ip, previos);
      return true;
    },
    forget(ip) {
      intentos.delete(ip);
    },
  };
}

/**
 * IP del visitante. `clientAddress` es la fuente fiable en Vercel;
 * `x-forwarded-for` solo cubre entornos que no la exponen.
 */
export function getClientIp(request: Request, clientAddress?: string): string {
  try {
    return clientAddress || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'desconocida';
  } catch {
    return 'desconocida';
  }
}
