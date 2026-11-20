import { createHmac, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'hl_admin_session';
export const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutos sin actividad
export const MAX_SESSION_MS = 7 * 24 * 60 * 60 * 1000; // tope absoluto desde el login
export const ACTIVITY_REFRESH_MS = 60 * 1000; // refrescar el token a lo sumo una vez por minuto

/**
 * Variables de entorno del panel.
 *
 * `import.meta.env` lo sustituye Vite al compilar, y es de donde salen en el
 * sitio publicado. En Node (pruebas con `node --test`) no existe, así que se lee
 * sin romper y se cae a `process.env`. Como el módulo solo se importa desde el
 * servidor, ninguna de las dos fuentes llega al navegador.
 */
const importMeta = import.meta as unknown as { env?: Record<string, string | undefined> };
const env: Record<string, string | undefined> = importMeta.env ?? process.env;

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
  const password = env.ADMIN_PASSWORD ?? '';
  if (!password) {
    if (env.DEV) {
      return { username: 'admin', password: 'admin' };
    }
    return null;
  }
  return {
    username: env.ADMIN_USERNAME || 'admin',
    password,
  };
}

/**
 * Clave de firma de las cookies de sesión: una cadena aleatoria y larga, guardada
 * en SESSION_SECRET y **distinta de la contraseña**.
 *
 * Antes se firmaba con ADMIN_PASSWORD, de modo que quien capturara una cookie
 * podía probar contraseñas fuera de línea, sin el límite de intentos del login.
 * Al no estar la contraseña en el token, esa vía desaparece: sin el secreto no
 * hay forma de fabricar ni de verificar una sesión.
 *
 * En desarrollo no se exige la variable (se usa una clave fija local); en
 * producción sin ella no se puede firmar y el panel queda deshabilitado.
 */
function getSessionSecret(): string | null {
  if (env.SESSION_SECRET) return env.SESSION_SECRET;
  if (env.DEV) return 'desarrollo-sesion-local-no-usar-en-produccion';
  return null;
}

export function isConfigured(): boolean {
  return getCredentials() !== null && getSessionSecret() !== null;
}

/**
 * Firma HMAC-SHA256 del payload dado usando el secreto de sesión como clave.
 */
function sign(payload: string): string {
  const secret = getSessionSecret();
  if (!secret) throw new Error('SESSION_SECRET no configurada');
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Construye el token de sesión.
 * Formato: `username.createdAt.lastActivity.hmac`
 * - username: nombre de usuario
 * - createdAt: Date.now() del login; fija el tope absoluto de vida
 * - lastActivity: Date.now() de la última actividad; fija el cierre por inactividad
 * - hmac: firma de los tres campos anteriores
 */
function buildToken(username: string, createdAt: number, lastActivity: number): string {
  const payload = `${username}.${createdAt}.${lastActivity}`;
  return `${payload}.${sign(payload)}`;
}

/**
 * Crea el token de sesión de un login nuevo.
 */
export function createSessionToken(): string {
  const creds = getCredentials();
  if (!creds) throw new Error('Credenciales de administración no configuradas');
  const ahora = Date.now();
  return buildToken(creds.username, ahora, ahora);
}

/**
 * Resultado de validar un token de sesión.
 * - valid: el token es criptográficamente válido
 * - expired: el token es válido pero debe cerrarse (inactividad o antigüedad)
 * - reason: motivo de la caducidad, para poder explicarlo en la pantalla de login
 * - createdAt / lastActivity: inicio de sesión y última actividad (ms desde epoch)
 * - age: milisegundos desde la última actividad
 */
export interface SessionValidation {
  valid: boolean;
  expired: boolean;
  reason: 'inactividad' | 'antiguedad' | null;
  createdAt: number;
  lastActivity: number;
  age: number;
}

/**
 * Valida un token de sesión y devuelve información sobre su estado.
 * Los tokens del formato anterior (sin fecha de inicio) se rechazan: no se puede
 * saber cuánto llevan vivos, así que no pueden respetar el tope absoluto.
 */
export function validateSession(token: string | undefined): SessionValidation {
  const vacio: SessionValidation = {
    valid: false,
    expired: false,
    reason: null,
    createdAt: 0,
    lastActivity: 0,
    age: 0,
  };
  if (!token) return vacio;

  const parts = token.split('.');
  if (parts.length !== 4) return vacio;

  const [username, createdAtStr, lastActivityStr, sig] = parts;
  const creds = getCredentials();
  if (!creds || !getSessionSecret() || !sig || username !== creds.username) return vacio;

  // Verificar firma HMAC antes de interpretar las fechas.
  const expected = Buffer.from(sign(`${username}.${createdAtStr}.${lastActivityStr}`));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length) return vacio;
  if (!timingSafeEqual(expected, actual)) return vacio;

  // Fechas no numéricas o en cero dejarían una sesión sin caducidad: se rechaza
  // el token entero en lugar de aceptarlo.
  const createdAt = Number(createdAtStr);
  const lastActivity = Number(lastActivityStr);
  if (!Number.isFinite(createdAt) || createdAt <= 0) return vacio;
  if (!Number.isFinite(lastActivity) || lastActivity <= 0) return vacio;

  const now = Date.now();
  const age = now - lastActivity;
  const vida = now - createdAt;
  const base = { valid: true, createdAt, lastActivity, age };

  // El tope absoluto manda sobre el refresco: una sesión abierta y usada a
  // diario deja de servir a los 7 días y hay que volver a entrar.
  if (vida > MAX_SESSION_MS) return { ...base, expired: true, reason: 'antiguedad' };
  if (age > INACTIVITY_MS) return { ...base, expired: true, reason: 'inactividad' };

  return { ...base, expired: false, reason: null };
}

/**
 * Crea un token con la actividad al día pero conservando el inicio de sesión:
 * el tope absoluto se cuenta desde el login, no desde el último clic.
 */
export function createRefreshedToken(createdAt: number): string {
  const creds = getCredentials();
  if (!creds) throw new Error('Credenciales de administración no configuradas');
  const ahora = Date.now();
  const inicio = Number.isFinite(createdAt) && createdAt > 0 ? createdAt : ahora;
  return buildToken(creds.username, inicio, ahora);
}

/**
 * Cookie options para el token de sesión en producción. La duración coincide con
 * el tope absoluto: pasado ese plazo el navegador ni siquiera la reenvía.
 */
export const SESSION_COOKIE_OPTIONS = {
  path: '/',
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: Boolean(env.PROD),
  maxAge: MAX_SESSION_MS / 1000,
};

/**
 * Cabecera `Set-Cookie` del token de sesión, construida desde
 * `SESSION_COOKIE_OPTIONS`. El middleware la usa al refrescar la sesión sobre una
 * respuesta ya creada; al salir de la misma definición, un cambio de atributos
 * (SameSite, Secure, ruta o duración) no puede aplicarse en el login y quedarse
 * sin aplicar en el refresco.
 */
export function sessionCookieHeader(token: string): string {
  const { path, httpOnly, sameSite, secure, maxAge } = SESSION_COOKIE_OPTIONS;
  const partes = [
    `${SESSION_COOKIE}=${token}`,
    `Path=${path}`,
    `Max-Age=${maxAge}`,
    `SameSite=${sameSite.charAt(0).toUpperCase()}${sameSite.slice(1)}`,
  ];
  if (httpOnly) partes.push('HttpOnly');
  if (secure) partes.push('Secure');
  return partes.join('; ');
}
