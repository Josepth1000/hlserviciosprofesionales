import { createHmac, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'hl_admin_session';

// Marca de última actividad: la sesión se cierra si pasa este tiempo sin
// ninguna interacción con el panel (peticiones + "latido" del navegador).
export const ACTIVITY_COOKIE = 'hl_admin_activity';
export const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutos sin actividad
export const ACTIVITY_REFRESH_MS = 60 * 1000; // refrescar la marca a lo sumo cada minuto

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

function sign(username: string): string {
  const creds = getCredentials();
  if (!creds) throw new Error('Credenciales de administración no configuradas');
  return createHmac('sha256', creds.password).update(username).digest('hex');
}

export function createSessionToken(): string {
  const creds = getCredentials();
  if (!creds) throw new Error('Credenciales de administración no configuradas');
  return `${creds.username}.${sign(creds.username)}`;
}

export function isValidSession(token: string | undefined): boolean {
  if (!token) return false;
  const [username, sig] = token.split('.');
  const creds = getCredentials();
  if (!creds || !sig || username !== creds.username) return false;

  const expected = Buffer.from(sign(username));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
