import test from 'node:test';
import assert from 'node:assert/strict';

import {
  credencialesIguales,
  decidirLogin,
  sanearNext,
} from '../src/lib/login-panel.ts';

// La ruta lee el entorno al importarse: en Node no hay `import.meta.env`, así
// que toma `process.env`. Se define antes del import dinámico.
process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_PASSWORD = 'contrasena-de-prueba';
process.env.SESSION_SECRET = 'secreto-de-prueba-0123456789abcdef0123456789abcdef';

const { POST } = await import('../src/pages/api/login.ts');

const BUENAS = { username: 'admin', password: 'contrasena-de-prueba' };
const MALAS = { username: 'admin', password: 'no-es-esta' };

const cookiesFalsas = () => {
  const puestas = [];
  return {
    puestas,
    set(nombre, valor, opciones) {
      puestas.push({ nombre, valor, opciones });
    },
  };
};

const redirigir = (destino, status = 302) =>
  new Response(null, { status, headers: { Location: destino } });

function peticion({ campos, next, cuerpo } = {}) {
  const url = new URL('https://sitio.test/api/login');
  if (next !== undefined) url.searchParams.set('next', next);

  if (cuerpo !== undefined) {
    return new Request(url, { method: 'POST', body: cuerpo, headers: { 'content-type': 'application/json' } });
  }

  const formulario = new FormData();
  for (const [clave, valor] of Object.entries(campos ?? BUENAS)) formulario.set(clave, valor);
  return new Request(url, { method: 'POST', body: formulario });
}

async function entrar(peticionHecha, ip) {
  const cookies = cookiesFalsas();
  const respuesta = await POST({
    request: peticionHecha,
    cookies,
    redirect: redirigir,
    url: new URL(peticionHecha.url),
    clientAddress: ip,
  });
  return { respuesta, cookies };
}

test('sanearNext solo deja rutas internas', () => {
  assert.equal(sanearNext('/keystatic/collection/posts'), '/keystatic/collection/posts');
  assert.equal(sanearNext('/keystatic/singleton/configuracion'), '/keystatic/singleton/configuracion');

  for (const valor of [
    undefined,
    null,
    '',
    'keystatic',
    'https://evil.test/panel',
    '//evil.test/panel',
    '/\\evil.test/panel',
    '/keystatic\\..\\evil',
  ]) {
    assert.equal(sanearNext(valor), '/keystatic');
  }
});

test('la comparación de credenciales distingue longitudes y contenido', () => {
  assert.equal(credencialesIguales('admin', 'admin'), true);
  assert.equal(credencialesIguales('admin', 'admiN'), false);
  assert.equal(credencialesIguales('admin', 'admin '), false);
  assert.equal(credencialesIguales('', ''), true);
});

test('decidirLogin: el límite manda sobre todo lo demás', () => {
  assert.deepEqual(
    decidirLogin({ permitido: false, formulario: BUENAS, credenciales: BUENAS }),
    { estado: 'limite' },
  );
});

test('decidirLogin: cuerpo ilegible, falta de configuración y credenciales', () => {
  assert.deepEqual(
    decidirLogin({ permitido: true, formulario: null, credenciales: BUENAS }),
    { estado: 'invalido' },
  );
  assert.deepEqual(
    decidirLogin({ permitido: true, formulario: BUENAS, credenciales: null }),
    { estado: 'sin-configuracion' },
  );
  assert.deepEqual(
    decidirLogin({ permitido: true, formulario: MALAS, credenciales: BUENAS }),
    { estado: 'rechazado' },
  );
});

test('decidirLogin: acierto con destino saneado', () => {
  assert.deepEqual(
    decidirLogin({
      permitido: true,
      formulario: BUENAS,
      credenciales: BUENAS,
      next: '/keystatic/collection/posts',
    }),
    { estado: 'ok', next: '/keystatic/collection/posts' },
  );
  assert.deepEqual(
    decidirLogin({ permitido: true, formulario: BUENAS, credenciales: BUENAS, next: '//evil.test' }),
    { estado: 'ok', next: '/keystatic' },
  );
  assert.deepEqual(
    decidirLogin({ permitido: true, formulario: BUENAS, credenciales: BUENAS }),
    { estado: 'ok', next: '/keystatic' },
  );
});

test('POST /api/login con credenciales correctas emite la cookie y vuelve a next', async () => {
  const { respuesta, cookies } = await entrar(
    peticion({ next: '/keystatic/collection/posts' }),
    '10.0.0.1',
  );

  assert.equal(respuesta.status, 302);
  assert.equal(respuesta.headers.get('location'), '/keystatic/collection/posts');
  assert.equal(cookies.puestas.length, 1);
  assert.equal(cookies.puestas[0].nombre, 'hl_admin_session');
  assert.equal(cookies.puestas[0].valor.split('.').length, 4);
  assert.equal(cookies.puestas[0].opciones.path, '/');
});

test('POST /api/login con un next externo cae al panel', async () => {
  const { respuesta } = await entrar(peticion({ next: '//evil.test/panel' }), '10.0.0.2');
  assert.equal(respuesta.headers.get('location'), '/keystatic');
});

test('POST /api/login con credenciales incorrectas vuelve al login sin cookie', async () => {
  const { respuesta, cookies } = await entrar(peticion({ campos: MALAS }), '10.0.0.3');

  assert.equal(respuesta.status, 302);
  assert.equal(respuesta.headers.get('location'), '/keystatic/login?error=1');
  assert.equal(cookies.puestas.length, 0);
});

test('POST /api/login con un cuerpo que no es formulario responde 400', async () => {
  const { respuesta, cookies } = await entrar(peticion({ cuerpo: '{"usuario":"admin"}' }), '10.0.0.4');

  assert.equal(respuesta.status, 400);
  assert.equal(cookies.puestas.length, 0);
});

test('POST /api/login corta al superar los intentos permitidos', async () => {
  const ip = '10.0.0.5';

  for (let intento = 1; intento <= 10; intento++) {
    const { respuesta } = await entrar(peticion({ campos: MALAS }), ip);
    assert.equal(respuesta.headers.get('location'), '/keystatic/login?error=1');
  }

  const { respuesta, cookies } = await entrar(peticion({ campos: MALAS }), ip);
  assert.equal(respuesta.headers.get('location'), '/keystatic/login?reason=limite');
  assert.equal(cookies.puestas.length, 0);

  // Aunque las credenciales sean correctas, el intento ya está bloqueado.
  const { respuesta: conBuenas } = await entrar(peticion(), ip);
  assert.equal(conBuenas.headers.get('location'), '/keystatic/login?reason=limite');
});
