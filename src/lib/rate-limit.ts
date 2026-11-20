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
  let ultimoBarrido = 0;

  function limpiar(ahora: number) {
    ultimoBarrido = ahora;
    for (const [ip, marcas] of intentos) {
      if (!marcas.some((t) => ahora - t < windowMs)) intentos.delete(ip);
    }
  }

  return {
    check(ip) {
      const ahora = Date.now();
      // El barrido recorre el mapa completo, así que se hace como mucho una vez
      // por ventana: si se lanzara en cada petición, una ráfaga de IPs distintas
      // (justo el caso contra el que protege) convertiría el limitador en trabajo
      // extra por petición en lugar de una barrera barata.
      if (intentos.size > MAX_IPS && ahora - ultimoBarrido >= windowMs) limpiar(ahora);

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
 * IP del visitante. `clientAddress` es la fuente fiable en Vercel (y en
 * `astro dev`); `x-forwarded-for` es una cabecera que el cliente puede escribir,
 * así que solo sirve detrás de un proxy que la sobrescriba. Si no hay ninguna de
 * las dos, todos los visitantes sin identificar comparten un mismo contador.
 */
export function getClientIp(request: Request, clientAddress?: string): string {
  try {
    return clientAddress || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'desconocida';
  } catch {
    return 'desconocida';
  }
}
