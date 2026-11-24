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

// ── Camino de envío ───────────────────────────────────────────────────────────
// Un formulario válido llega a Resend. Ni la red ni las variables de Astro son
// reales: `fetch` se sustituye por un doble y `astro:env/server` por el doble
// con `fijarVariables`, así que se comprueba el correo que se manda sin enviar
// ninguno.

const { fijarVariables } = await import('./apoyo/astro-env-falso.mjs');

const DATOS_VALIDOS = {
  nombre: 'Ana Pérez',
  telefono: '+57 315 340 1391',
  email: 'ana@ejemplo.test',
  servicio: 'juridicos',
  mensaje: 'Necesito asesoría <b>urgente</b>.',
};

const VARIABLES = {
  apiKey: 're_clave_de_prueba',
  destino: 'bandeja@ejemplo.test',
  remitente: 'HL Pruebas <no-reply@ejemplo.test>',
};

function conVariables(t) {
  fijarVariables(VARIABLES);
  t.after(() => fijarVariables());
}

test('un formulario válido envía a Resend el cuerpo esperado', async (t) => {
  conVariables(t);

  let peticion;
  t.mock.method(globalThis, 'fetch', async (url, opciones) => {
    peticion = { url, opciones };
    return new Response('{"id":"re_prueba"}', { status: 200 });
  });

  const respuesta = await enviar(DATOS_VALIDOS, { ip: '10.4.0.1' });

  assert.equal(respuesta.status, 200);
  assert.deepEqual(await respuesta.json(), { ok: true });

  assert.equal(peticion.url, 'https://api.resend.com/emails');
  assert.equal(peticion.opciones.method, 'POST');
  assert.equal(peticion.opciones.headers.Authorization, `Bearer ${VARIABLES.apiKey}`);

  const cuerpo = JSON.parse(peticion.opciones.body);
  assert.equal(cuerpo.from, VARIABLES.remitente);
  assert.deepEqual(cuerpo.to, [VARIABLES.destino]);
  assert.equal(cuerpo.reply_to, DATOS_VALIDOS.email);
  // El asunto lleva la etiqueta del panel, no el valor técnico del formulario.
  assert.equal(cuerpo.subject, 'Nuevo mensaje de Solicitud de Asesoría · Tema: Servicios Jurídicos');
  assert.match(cuerpo.text, /Nombre: Ana Pérez/);
  assert.match(cuerpo.text, /Correo: ana@ejemplo\.test/);
  assert.match(cuerpo.text, /Servicio de interés: Servicios Jurídicos/);
  assert.match(cuerpo.text, /Mensaje:\nNecesito asesoría <b>urgente<\/b>\./);
  // El HTML escapa lo que llega del formulario.
  assert.match(cuerpo.html, /&lt;b&gt;urgente&lt;\/b&gt;/);
  assert.doesNotMatch(cuerpo.html, /<b>urgente<\/b>/);
});

test('si Resend responde con error, la ruta devuelve 502 sin confirmar el envío', async (t) => {
  conVariables(t);
  t.mock.method(console, 'error', () => {});
  t.mock.method(
    globalThis,
    'fetch',
    async () => new Response('{"message":"El dominio no está verificado"}', { status: 422 }),
  );

  const respuesta = await enviar(DATOS_VALIDOS, { ip: '10.4.0.2' });

  assert.equal(respuesta.status, 502);
  assert.deepEqual(await respuesta.json(), { ok: false, error: 'envio' });
});

test('si la llamada a Resend ni siquiera responde, también es 502', async (t) => {
  conVariables(t);
  t.mock.method(console, 'error', () => {});
  t.mock.method(globalThis, 'fetch', async () => {
    throw new Error('tiempo de espera agotado');
  });

  const respuesta = await enviar(DATOS_VALIDOS, { ip: '10.4.0.3' });

  assert.equal(respuesta.status, 502);
  assert.deepEqual(await respuesta.json(), { ok: false, error: 'envio' });
});
