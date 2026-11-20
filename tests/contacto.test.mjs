import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

// La ruta importa módulos virtuales de Astro (astro:env/server, astro:content):
// el loader los cambia por dobles vacíos antes de cargarla.
register(new URL('./apoyo/astro-falso-loader.mjs', import.meta.url));
const { GET, POST } = await import('../src/pages/api/contacto.ts');

const URL_RUTA = 'https://sitio.test/api/contacto';

function enviar(cuerpo, { ip = '10.2.0.10', origen = 'https://sitio.test', cabeceras = {} } = {}) {
  const headers = { 'content-type': 'application/json', host: 'sitio.test', ...cabeceras };
  if (origen !== null) headers.origin = origen;

  return POST({
    request: new Request(URL_RUTA, { method: 'POST', body: JSON.stringify(cuerpo), headers }),
    clientAddress: ip,
  });
}

const incompleto = { nombre: 'A', telefono: '+57 315 340 1391', servicio: 'salud', mensaje: 'Hola' };

test('GET /api/contacto no es un recurso: 405 con Allow: POST', async () => {
  const respuesta = await GET({});

  assert.equal(respuesta.status, 405);
  assert.equal(respuesta.headers.get('allow'), 'POST');
  assert.match(respuesta.headers.get('cache-control') ?? '', /no-store/);
});

test('un origen ajeno se rechaza con 403 antes de validar el formulario', async () => {
  const respuesta = await enviar(incompleto, { origen: 'https://otro-sitio.test' });

  assert.equal(respuesta.status, 403);
  assert.deepEqual(await respuesta.json(), { ok: false, error: 'origen' });
});

test('un origen que no es una URL también se rechaza', async () => {
  const respuesta = await enviar(incompleto, { origen: 'no-es-una-url' });

  assert.equal(respuesta.status, 403);
  assert.deepEqual(await respuesta.json(), { ok: false, error: 'origen' });
});

test('sin cabecera Origin se acepta (peticiones que no vienen de un navegador)', async () => {
  const respuesta = await enviar(incompleto, { origen: null });

  assert.equal(respuesta.status, 422);
  assert.deepEqual(await respuesta.json(), { ok: false, error: 'nombre' });
});

test('el mismo origen pasa el filtro y llega a la validación', async () => {
  const respuesta = await enviar(incompleto);

  assert.equal(respuesta.status, 422);
  assert.deepEqual(await respuesta.json(), { ok: false, error: 'nombre' });
});

test('el límite por IP responde 429 al sexto envío', async () => {
  const ip = '10.2.0.99';

  for (let intento = 1; intento <= 5; intento++) {
    const respuesta = await enviar(incompleto, { ip });
    assert.equal(respuesta.status, 422);
  }

  const bloqueado = await enviar(incompleto, { ip });
  assert.equal(bloqueado.status, 429);
  assert.deepEqual(await bloqueado.json(), { ok: false, error: 'limite' });
});

test('un JSON ilegible responde 400 con el camino del formato', async (t) => {
  // La ruta deja un console.error con el detalle: aquí solo interesa el 400.
  t.mock.method(console, 'error', () => {});

  const respuesta = await POST({
    request: new Request(URL_RUTA, {
      method: 'POST',
      body: '{roto',
      headers: { 'content-type': 'application/json', host: 'sitio.test', origin: 'https://sitio.test' },
    }),
    clientAddress: '10.2.0.11',
  });

  assert.equal(respuesta.status, 400);
  assert.deepEqual(await respuesta.json(), { ok: false, error: 'formato' });
});
