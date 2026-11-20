import test from 'node:test';
import assert from 'node:assert/strict';

import { GET, POST } from '../src/pages/api/csp-report.ts';

const URL_RUTA = 'https://sitio.test/api/csp-report';

const informe = (marca) => [
  {
    type: 'csp-violation',
    body: {
      blockedURL: `https://ejemplo.test/${marca}.js`,
      effectiveDirective: 'script-src',
      documentURL: URL_RUTA,
      disposition: 'enforce',
    },
  },
];

function enviar(cuerpo, { ip = '10.1.0.10', headers = {} } = {}) {
  return POST({
    request: new Request(URL_RUTA, {
      method: 'POST',
      body: typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo),
      headers: { 'content-type': 'application/reports+json', ...headers },
    }),
    clientAddress: ip,
  });
}

test('un informe válido responde 204 y se registra con la IP recortada', async (t) => {
  const warn = t.mock.method(console, 'warn', () => {});

  const respuesta = await enviar(informe('valido'));

  assert.equal(respuesta.status, 204);
  assert.equal(respuesta.headers.get('cache-control'), 'no-store');
  assert.equal(warn.mock.callCount(), 1);

  const [etiqueta, linea] = warn.mock.calls[0].arguments;
  assert.equal(etiqueta, '[csp]');
  const registro = JSON.parse(linea);
  assert.equal(registro.directiva, 'script-src');
  assert.equal(registro.bloqueado, 'https://ejemplo.test/valido.js');
  assert.equal(registro.ipRed, '10.1.0.0');
});

test('un cuerpo que no es JSON responde 204 sin registrar nada', async (t) => {
  const warn = t.mock.method(console, 'warn', () => {});

  const respuesta = await enviar('{roto');

  assert.equal(respuesta.status, 204);
  assert.equal(warn.mock.callCount(), 0);
});

test('un cuerpo por encima de 24 KB se descarta sin registrar', async (t) => {
  const warn = t.mock.method(console, 'warn', () => {});
  const enorme = JSON.stringify(informe('enorme')) + ' '.repeat(24 * 1024);

  const respuesta = await enviar(enorme);

  assert.equal(respuesta.status, 204);
  assert.equal(warn.mock.callCount(), 0);
});

test('los informes de otro tipo no se registran', async (t) => {
  const warn = t.mock.method(console, 'warn', () => {});

  const respuesta = await enviar({ type: 'intervention', body: { sourceFile: 'x.js' } });

  assert.equal(respuesta.status, 204);
  assert.equal(warn.mock.callCount(), 0);
});

test('el límite por IP corta la ráfaga sin dejar de responder 204', async (t) => {
  const warn = t.mock.method(console, 'warn', () => {});
  const ip = '10.1.0.99';

  for (let intento = 1; intento <= 40; intento++) {
    const respuesta = await enviar(informe(`rafaga-${intento}`), { ip });
    assert.equal(respuesta.status, 204);
  }
  assert.equal(warn.mock.callCount(), 40);

  const bloqueado = await enviar(informe('bloqueado'), { ip });
  assert.equal(bloqueado.status, 204);
  assert.equal(warn.mock.callCount(), 40, 'el informe número 41 no debe registrarse');
});

test('GET /api/csp-report no atiende informes: 405 con Allow: POST', async () => {
  const respuesta = await GET({});

  assert.equal(respuesta.status, 405);
  assert.equal(respuesta.headers.get('allow'), 'POST');
});
