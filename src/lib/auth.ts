import { createHmac, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'hl_admin_session';
export const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutos sin actividad
export const ACTIVITY_REFRESH_MS = 60 * 1000; // refrescar el token a lo sumo una vez por minuto

interface Credentials {
  username: string;
  password: string;
}

/**
 * Credenciales del panel de administración.
 * - En producción se leen de las variables de entorno ADMIN_USERNAME / ADMIN_PASSWORD.
 * - En desarrollo, si ADMIN_PASSWORD no está definida, se usa admin / admin.
 * - En producción sin ADMIN_PASSWORD el panel queda deshabilitado.
 */
export function getCredentials(): Credentials | null {
  const password = import.meta.env.ADMIN_PASSWORD as string | undefined;
  if (!password) {
    if (import.meta.env.DEV) {
      return { username: 'admin', password: 'admin' };
    }
    return null;
  }
  return {
    username: (import.meta.env.ADMIN_USERNAME as string | undefined) ?? 'admin',
    password,
  };
}

export function isConfigured(): boolean {
  return getCredentials() !== null;
}

/**
 * Firma HMAC-SHA256 del payload dado usando la contraseña como clave.
 */
function sign(payload: string): string {
  const creds = getCredentials();
  if (!creds) throw new Error('Credenciales de administración no configuradas');
  return createHmac('sha256', creds.password).update(payload).digest('hex');
}

/**
 * Crea un token de sesión con el timestamp de actividad embebido.
 * Formato: `username.timestamp.hmac`
 * - username: nombre de usuario
 * - timestamp: Date.now() en milisegundos (última actividad conocida)
 * - hmac: firma de `username.timestamp` para evitar manipulación
 */
export function createSessionToken(): string {
  const creds = getCredentials();
  if (!creds) throw new Error('Credenciales de administración no configuradas');
  const ts = Date.now();
  return `${creds.username}.${ts}.${sign(`${creds.username}.${ts}`)}`;
}

/**
 * Resultado de validar un token de sesión.
 * - valid: el token es criptográficamente válido
 * - expired: el token es válido pero la actividad fue hace más de INACTIVITY_MS
 * - lastActivity: timestamp de última actividad (ms desde epoch)
 * - age: milisegundos desde la última actividad
 */
export interface SessionValidation {
  valid: boolean;
  expired: boolean;
  lastActivity: number;
  age: number;
}

/**
 * Valida un token de sesión y devuelve información sobre su estado.
 * El token tiene formato `username.timestamp.hmac`.
 */
export function validateSession(token: string | undefined): SessionValidation {
  const empty = { valid: false, expired: false, lastActivity: 0, age: 0 };
  if (!token) return empty;

  const parts = token.split('.');
  if (parts.length !== 3) return empty;

  const [username, tsStr, sig] = parts;
  const creds = getCredentials();
  if (!creds || !sig || username !== creds.username) return empty;

  // Verificar firma HMAC
  const payload = `${username}.${tsStr}`;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length) return empty;
  if (!timingSafeEqual(expected, actual)) return empty;

  // Token criptográficamente válido — verificar actividad
  const lastActivity = Number(tsStr) || 0;
  const now = Date.now();
  const age = now - lastActivity;
  const expired = lastActivity > 0 && age > INACTIVITY_MS;

  return { valid: true, expired, lastActivity, age };
}

/**
 * Verifica si el token de sesión es criptográficamente válido (sin verificar expiración).
 * Se mantiene por compatibilidad con código existente que solo necesita saber
 * si la sesión es auténtica.
 */
export function isValidSession(token: string | undefined): boolean {
  return validateSession(token).valid;
}

/**
 * Crea un token refrescado con el timestamp actual. Se usa para renovar
 * la sesión en cada petición sin necesidad de un cookie separado de actividad.
 */
export function createRefreshedToken(): string {
  return createSessionToken();
}

/**
 * Cookie options para el token de sesión en producción.
 */
export const SESSION_COOKIE_OPTIONS = {
  path: '/',
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: import.meta.env.PROD,
  maxAge: 60 * 60 * 24 * 30, // 30 días
};
