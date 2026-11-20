import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

// El módulo lee el entorno al importarse: en Node no existe `import.meta.env`,
// así que toma `process.env`. Se define antes del import dinámico.
process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_PASSWORD = 'contrasena-de-prueba';
process.env.SESSION_SECRET = 'secreto-de-prueba-0123456789abcdef0123456789abcdef';

const auth = await import('../src/lib/auth.ts');

const SECRETO = process.env.SESSION_SECRET;
const CONTRASENA = process.env.ADMIN_PASSWORD;

const firmar = (payload, clave = SECRETO) =>
  createHmac('sha256', clave).update(payload).digest('hex');

/** Fabrica un token válido con las fechas indicadas (mismo formato que auth.ts). */
function token(createdAt, lastActivity, usuario = 'admin', clave = SECRETO) {
  const payload = `${usuario}.${createdAt}.${lastActivity}`;
  return `${payload}.${firmar(payload, clave)}`;
}

test('acepta un token recién creado y lo marca como no expirado', () => {
  const creado = auth.createSessionToken();
  const estado = auth.validateSession(creado);
  assert.equal(estado.valid, true);
  assert.equal(estado.expired, false);
  assert.equal(estado.reason, null);
  assert.ok(estado.createdAt > 0);
});

test('rechaza un token sin firma, con firma manipulada o de otro usuario', () => {
  const ahora = Date.now();
  const bueno = token(ahora, ahora);
  const [usuario, creado, actividad, firma] = bueno.split('.');
  const rota = `${usuario}.${creado}.${actividad}.${firma[0] === 'a' ? 'b' : 'a'}${firma.slice(1)}`;

  assert.equal(auth.validateSession(undefined).valid, false);
  assert.equal(auth.validateSession('').valid, false);
  assert.equal(auth.validateSession(rota).valid, false);
  assert.equal(auth.validateSession(token(ahora, ahora, 'otro')).valid, false);
});

test('rechaza el formato anterior de tres partes (sesiones previas invalidadas)', () => {
  const ahora = Date.now();
  const payload = `admin.${ahora}`;
  const antiguo = `${payload}.${firmar(payload)}`;
  assert.equal(auth.validateSession(antiguo).valid, false);
});

test('no acepta un token firmado con la contraseña en lugar del secreto', () => {
  const ahora = Date.now();
  assert.equal(auth.validateSession(token(ahora, ahora, 'admin', CONTRASENA)).valid, false);
});

test('cierra la sesión tras 30 minutos sin actividad', () => {
  const ahora = Date.now();
  const estado = auth.validateSession(token(ahora - 31 * 60 * 1000, ahora - 31 * 60 * 1000));
  assert.equal(estado.valid, true);
  assert.equal(estado.expired, true);
  assert.equal(estado.reason, 'inactividad');
});

test('cierra la sesión a los 7 días aunque haya actividad reciente', () => {
  const ahora = Date.now();
  const inicio = ahora - 8 * 24 * 60 * 60 * 1000;
  const estado = auth.validateSession(token(inicio, ahora));
  assert.equal(estado.valid, true);
  assert.equal(estado.expired, true);
  assert.equal(estado.reason, 'antiguedad');
});

test('a los 6 días con actividad reciente la sesión sigue viva', () => {
  const ahora = Date.now();
  const inicio = ahora - 6 * 24 * 60 * 60 * 1000;
  const estado = auth.validateSession(token(inicio, ahora - 60 * 1000));
  assert.equal(estado.valid, true);
  assert.equal(estado.expired, false);
});

test('el refresco conserva el inicio de sesión (y con él el tope absoluto)', () => {
  const inicio = Date.now() - 2 * 24 * 60 * 60 * 1000;
  const refrescado = auth.createRefreshedToken(inicio);
  assert.equal(Number(refrescado.split('.')[1]), inicio);
  assert.equal(auth.validateSession(refrescado).expired, false);

  const viejo = auth.createRefreshedToken(Date.now() - 8 * 24 * 60 * 60 * 1000);
  const estado = auth.validateSession(viejo);
  assert.equal(estado.expired, true);
  assert.equal(estado.reason, 'antiguedad');
});

test('rechaza fechas no numéricas o en cero en lugar de dejarlas sin caducidad', () => {
  assert.equal(auth.validateSession(token('abc', 'abc')).valid, false);
  assert.equal(auth.validateSession(token(0, 0)).valid, false);
});

test('la cookie se emite con la duración del tope absoluto y sus atributos', () => {
  const cabecera = auth.sessionCookieHeader('a.b.c');
  assert.equal(auth.MAX_SESSION_MS / 1000, 604800);
  assert.match(cabecera, /^hl_admin_session=a\.b\.c;/);
  assert.match(cabecera, /Path=\//);
  assert.match(cabecera, /Max-Age=604800/);
  assert.match(cabecera, /SameSite=Lax/);
  assert.match(cabecera, /HttpOnly/);
});
