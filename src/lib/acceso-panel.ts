/**
 * Decide quién entra al panel y quién no. Vive fuera de `src/middleware.ts`
 * porque ese archivo importa `astro:middleware` y `astro:content`, que no
 * existen fuera de Astro y, por tanto, no se pueden cargar con `node --test`.
 *
 * Aquí no hay cookies ni respuestas: la función recibe la ruta y el estado ya
 * resuelto (configuración y sesión) y devuelve qué hacer. El middleware traduce
 * el veredicto a un `Response`.
 */

const PREFIJOS_PROTEGIDOS = ['/keystatic', '/api/keystatic'];
const RUTA_LOGIN = '/keystatic/login';

export type EstadoSesion = {
  /** El token es criptográficamente válido. */
  valida: boolean;
  /**
   * Motivo por el que una sesión válida debe cerrarse. El validador de sesión
   * solo lo informa cuando el token está caducado, así que basta con esto: no
   * hace falta un `expirada` aparte que pudiera contradecirlo.
   */
  motivo?: 'inactividad' | 'antiguedad' | null;
};

export type DecisionPanel =
  | { tipo: 'publico' }
  | { tipo: 'continuar' }
  | { tipo: 'deshabilitado' }
  | { tipo: 'expirada'; reason: 'antiguedad' | 'expired'; redirigir: string; mensaje: string }
  | { tipo: 'sin-sesion'; redirigir: string; mensaje: string };

/** `Accept` con `text/html` significa navegación; el resto, llamada de API. */
export function pideHtml(accept: string | null | undefined): boolean {
  return (accept ?? '').toLowerCase().includes('text/html');
}

/** `/keystatic` y `/api/keystatic` con sus subrutas, sin prefijos engañosos. */
function esRutaProtegida(path: string): boolean {
  return PREFIJOS_PROTEGIDOS.some(
    (prefijo) => path === prefijo || path.startsWith(`${prefijo}/`),
  );
}

/** A dónde volver tras el login, sin abrir redirecciones externas. */
function destinoLogin(path: string): string {
  return `${RUTA_LOGIN}?next=${encodeURIComponent(path)}`;
}

export function decidirAcceso(
  path: string,
  opciones: { configurado: boolean; sesion: EstadoSesion },
): DecisionPanel {
  // Las rutas del sitio y la pantalla de login no pasan por el control.
  if (!esRutaProtegida(path) || path === RUTA_LOGIN) return { tipo: 'publico' };

  // Sin ADMIN_PASSWORD y SESSION_SECRET el panel no puede ni firmar sesiones:
  // se avisa con 503 en lugar de fingir un login que no va a funcionar.
  if (!opciones.configurado) return { tipo: 'deshabilitado' };

  const { sesion } = opciones;

  if (sesion.valida && sesion.motivo) {
    const porAntiguedad = sesion.motivo === 'antiguedad';
    const reason = porAntiguedad ? 'antiguedad' : 'expired';
    return {
      tipo: 'expirada',
      reason,
      redirigir: `${RUTA_LOGIN}?error=1&reason=${reason}`,
      mensaje: porAntiguedad
        ? 'Sesión caducada: ha pasado el plazo máximo, vuelve a iniciar sesión'
        : 'Sesión expirada por inactividad',
    };
  }

  if (sesion.valida) return { tipo: 'continuar' };

  return {
    tipo: 'sin-sesion',
    redirigir: destinoLogin(path),
    mensaje: 'No autorizado',
  };
}
