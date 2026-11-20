import test from 'node:test';
import assert from 'node:assert/strict';

import { POST, GET } from '../src/pages/api/logout.ts';

const redirigir = (destino, status = 302) =>
  new Response(null, { status, headers: { Location: destino } });

const cookiesFalsas = () => {
  const borradas = [];
  return {
    borradas,
    delete(nombre, opciones) {
      borradas.push({ nombre, opciones });
    },
  };
};

test('POST /api/logout borra la cookie y redirige con 303 al login', async () => {
  const cookies = cookiesFalsas();
  const respuesta = await POST({ cookies, redirect: redirigir });

  assert.equal(respuesta.status, 303);
  assert.equal(respuesta.headers.get('location'), '/keystatic/login');
  assert.deepEqual(cookies.borradas, [{ nombre: 'hl_admin_session', opciones: { path: '/' } }]);
});

test('GET /api/logout no cierra sesión: 405 con Allow: POST y sin caché', async () => {
  const respuesta = await GET({});

  assert.equal(respuesta.status, 405);
  assert.equal(respuesta.headers.get('allow'), 'POST');
  assert.match(respuesta.headers.get('cache-control') ?? '', /no-store/);
  assert.equal(await respuesta.text(), '');
});
