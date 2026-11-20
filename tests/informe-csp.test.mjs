import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizarInforme } from '../src/lib/informe-csp.ts';

test('formato Reporting API: extrae los campos del cuerpo en camelCase', () => {
  const informe = normalizarInforme({
    type: 'csp-violation',
    body: {
      blockedURL: 'https://ejemplo.test/bloqueado.js',
      effectiveDirective: 'script-src',
      documentURL: 'https://sitio.test/pagina',
      sourceFile: 'https://sitio.test/app.js',
      disposition: 'enforce',
    },
  });

  assert.deepEqual(informe, {
    tipo: 'csp-violation',
    directiva: 'script-src',
    bloqueado: 'https://ejemplo.test/bloqueado.js',
    documento: 'https://sitio.test/pagina',
    origen: 'https://sitio.test/app.js',
    disposicion: 'enforce',
  });
});

test('formato CSP clásico: entiende las claves con guiones dentro de "csp-report"', () => {
  const informe = normalizarInforme({
    'csp-report': {
      'blocked-uri': 'https://ejemplo.test/x.css',
      'violated-directive': 'style-src',
      'document-uri': 'https://sitio.test/',
      'source-file': 'https://sitio.test/estilos.css',
      disposition: 'report',
    },
  });

  assert.deepEqual(informe, {
    tipo: 'csp-violation',
    directiva: 'style-src',
    bloqueado: 'https://ejemplo.test/x.css',
    documento: 'https://sitio.test/',
    origen: 'https://sitio.test/estilos.css',
    disposicion: 'report',
  });
});

test('acepta el objeto plano y las variantes en camelCase sin envoltorio', () => {
  assert.equal(
    normalizarInforme({ blockedURL: 'https://x.test/a', effectiveDirective: 'img-src' }).directiva,
    'img-src',
  );
  assert.equal(
    normalizarInforme({ 'csp-report': { blockedUri: 'https://x.test/b', violatedDirective: 'font-src' } })
      .directiva,
    'font-src',
  );
});

test('descarta entradas que no son un informe', () => {
  assert.equal(normalizarInforme(null), null);
  assert.equal(normalizarInforme(undefined), null);
  assert.equal(normalizarInforme('texto suelto'), null);
  assert.equal(normalizarInforme(42), null);
  assert.equal(normalizarInforme([]), null);
});

test('descarta informes de CSP vacíos o de otro tipo', () => {
  assert.equal(normalizarInforme({}), null);
  assert.equal(normalizarInforme({ 'csp-report': {} }), null);
  assert.equal(normalizarInforme({ type: 'csp-violation', body: {} }), null);
  assert.equal(
    normalizarInforme({ type: 'intervention', body: { effectiveDirective: 'script-src' } }),
    null,
  );
});

test('recorta los campos largos y no convierte números en texto', () => {
  const informe = normalizarInforme({
    type: 'csp-violation',
    body: {
      effectiveDirective: 'x'.repeat(200),
      blockedURL: 'y'.repeat(400),
      documentURL: 'z'.repeat(400),
      disposition: 'd'.repeat(100),
      sourceFile: 123,
    },
  });

  assert.equal(informe.directiva.length, 120);
  assert.equal(informe.bloqueado.length, 300);
  assert.equal(informe.documento.length, 300);
  assert.equal(informe.disposicion.length, 40);
  assert.equal(informe.origen, '');
});
