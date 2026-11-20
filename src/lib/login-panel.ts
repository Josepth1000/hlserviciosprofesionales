/**
 * Decisiones del inicio de sesión del panel. Vive fuera de
 * `src/pages/api/login.ts` porque esa ruta importa `astro:env` y el contexto de
 * Astro; aquí solo entran datos y sale un veredicto, que se prueba con
 * `node --test`.
 */

import { timingSafeEqual } from 'node:crypto';
// Extensión explícita: este módulo se carga desde las pruebas con Node a secas,
// que no resuelve imports sin extensión (Astro y Vite sí).
import { RUTA_PANEL } from './acceso-panel.ts';

export type Credenciales = { username: string; password: string };
export type FormularioLogin = { username: string; password: string };

export type ResultadoLogin =
  | { estado: 'limite' }
  | { estado: 'invalido' }
  | { estado: 'sin-configuracion' }
  | { estado: 'rechazado' }
  | { estado: 'ok'; next: string };

/**
 * A dónde volver tras entrar. Solo rutas internas: `//host` y `/\host` los
 * interpreta el navegador como otro origen, así que también se descartan.
 */
export function sanearNext(valor: string | null | undefined): string {
  const next = valor ?? '';
  if (!next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return RUTA_PANEL;
  return next;
}

/**
 * Comparación en tiempo constante: ni el usuario ni la contraseña deben
 * delatarse por lo que tarda la respuesta. Longitudes distintas no llegan a
 * `timingSafeEqual`, que exige buffers del mismo tamaño.
 */
export function credencialesIguales(dato: string, esperado: string): boolean {
  const a = Buffer.from(dato);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function decidirLogin(entrada: {
  /** El limitador por IP deja pasar el intento. */
  permitido: boolean;
  /** null cuando el cuerpo no era un formulario legible. */
  formulario: FormularioLogin | null;
  /** null cuando faltan ADMIN_PASSWORD o SESSION_SECRET. */
  credenciales: Credenciales | null;
  next?: string | null;
}): ResultadoLogin {
  // El límite se comprueba antes que nada: un bot no llega a hacer trabajar al
  // servidor ni a revelar si el usuario existe.
  if (!entrada.permitido) return { estado: 'limite' };
  if (!entrada.formulario) return { estado: 'invalido' };
  if (!entrada.credenciales) return { estado: 'sin-configuracion' };

  const { username, password } = entrada.formulario;
  const coincide =
    credencialesIguales(username, entrada.credenciales.username) &&
    credencialesIguales(password, entrada.credenciales.password);

  if (!coincide) return { estado: 'rechazado' };

  return { estado: 'ok', next: sanearNext(entrada.next) };
}
