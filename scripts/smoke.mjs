#!/usr/bin/env node
/**
 * Prueba de humo contra una URL ya publicada.
 *
 * Las pruebas de `tests/` cubren módulos puros; esto cubre el pegamento que solo
 * existe desplegado: que Vercel sirva el middleware, la protección del panel y
 * las funciones de /api con el comportamiento que espera el código.
 *
 * Uso:
 *   npm run smoke
 *   node scripts/smoke.mjs https://hlserviciosprofesionales.com
 *   SMOKE_URL=https://… npm run smoke
 *
 * Termina con código 1 si alguna comprobación falla. Sin dependencias: usa el
 * `fetch` de Node 22.
 */

const DESTINO = 'https://smoke.invalid/smoke.js';

const base = (process.argv[2] ?? process.env.SMOKE_URL ?? 'https://pruebas.hlserviciosprofesionales.com')
  .replace(/\/+$/, '');

function url(ruta) {
  return `${base}${ruta}`;
}

async function pedir(ruta, opciones = {}) {
  return fetch(url(ruta), {
    redirect: 'manual',
    signal: AbortSignal.timeout(15000),
    ...opciones,
    headers: { 'user-agent': 'hl-smoke', ...(opciones.headers ?? {}) },
  });
}

function exigir(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje);
}

const comprobaciones = [
  {
    nombre: 'GET / → 200 y HTML',
    async correr() {
      const respuesta = await pedir('/');
      exigir(respuesta.status === 200, `se esperaba 200 y llegó ${respuesta.status}`);
      const tipo = respuesta.headers.get('content-type') ?? '';
      exigir(tipo.includes('text/html'), `content-type inesperado: ${tipo}`);
      const cuerpo = await respuesta.text();
      exigir(/<html/i.test(cuerpo), 'la respuesta no parece HTML');
    },
  },
  {
    nombre: 'GET /keystatic → 302 al login con next',
    async correr() {
      const respuesta = await pedir('/keystatic', { headers: { accept: 'text/html' } });
      exigir(respuesta.status === 302, `se esperaba 302 y llegó ${respuesta.status}`);
      const destino = respuesta.headers.get('location') ?? '';
      exigir(
        destino === '/keystatic/login?next=%2Fkeystatic',
        `location inesperado: ${destino || '(vacío)'}`,
      );
    },
  },
  {
    nombre: 'GET /api/keystatic/update → 401 no-store',
    async correr() {
      const respuesta = await pedir('/api/keystatic/update', {
        headers: { accept: 'application/json' },
      });
      exigir(respuesta.status === 401, `se esperaba 401 y llegó ${respuesta.status}`);
      const cache = respuesta.headers.get('cache-control') ?? '';
      exigir(cache.includes('no-store'), `falta Cache-Control: no-store (llegó «${cache}»)`);
      const cuerpo = await respuesta.json();
      exigir(cuerpo?.error === 'No autorizado', `cuerpo inesperado: ${JSON.stringify(cuerpo)}`);
    },
  },
  {
    nombre: 'GET /api/contacto → 405 con Allow: POST',
    async correr() {
      const respuesta = await pedir('/api/contacto');
      exigir(respuesta.status === 405, `se esperaba 405 y llegó ${respuesta.status}`);
      const permitidos = respuesta.headers.get('allow') ?? '';
      exigir(/POST/i.test(permitidos), `Allow inesperado: ${permitidos || '(vacío)'}`);
    },
  },
  {
    // El filtro de origen va antes del cuerpo, del limitador y de Resend: la
    // petición muere en el 403, así que el humo no gasta intentos ni envía nada.
    nombre: 'POST /api/contacto con origen ajeno → 403 sin enviar',
    async correr() {
      const respuesta = await pedir('/api/contacto', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'https://smoke.invalid' },
        body: JSON.stringify({
          nombre: 'Prueba de humo',
          telefono: '+57 300 000 0000',
          email: 'humo@smoke.invalid',
          servicio: 'juridicos',
          mensaje: 'Comprobación de origen: no debe enviarse ningún correo.',
        }),
      });
      exigir(respuesta.status === 403, `se esperaba 403 y llegó ${respuesta.status}`);
      const cuerpo = await respuesta.json();
      exigir(cuerpo?.error === 'origen', `cuerpo inesperado: ${JSON.stringify(cuerpo)}`);
    },
  },
  {
    // Honeypot: el campo invisible `_empresa` relleno delata a un bot. La ruta
    // responde como si todo fuera bien para no darle pistas, pero se sale antes
    // de construir el correo y de llamar a Resend.
    nombre: 'POST /api/contacto con honeypot relleno → 200 sin enviar',
    async correr() {
      const respuesta = await pedir('/api/contacto', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: base },
        body: JSON.stringify({
          nombre: 'Prueba de humo',
          telefono: '+57 300 000 0000',
          email: 'humo@smoke.invalid',
          servicio: 'juridicos',
          mensaje: 'Comprobación del honeypot: no debe enviarse ningún correo.',
          _empresa: 'bot',
        }),
      });
      exigir(respuesta.status === 200, `se esperaba 200 y llegó ${respuesta.status}`);
      const cuerpo = await respuesta.json();
      exigir(cuerpo?.ok === true, `cuerpo inesperado: ${JSON.stringify(cuerpo)}`);
    },
  },
  {
    nombre: 'POST /api/csp-report → 204',
    async correr() {
      const respuesta = await pedir('/api/csp-report', {
        method: 'POST',
        headers: { 'content-type': 'application/reports+json' },
        body: JSON.stringify([
          {
            type: 'csp-violation',
            body: {
              blockedURL: DESTINO,
              effectiveDirective: 'script-src',
              documentURL: url('/'),
              disposition: 'enforce',
            },
          },
        ]),
      });
      exigir(respuesta.status === 204, `se esperaba 204 y llegó ${respuesta.status}`);
    },
  },
];

console.log(`Prueba de humo contra ${base}\n`);

const fallos = [];
for (const { nombre, correr } of comprobaciones) {
  try {
    await correr();
    console.log(`✔ ${nombre}`);
  } catch (error) {
    fallos.push(nombre);
    console.error(`✖ ${nombre}\n  ${error.message}`);
  }
}

console.log('');
if (fallos.length) {
  console.error(`${fallos.length} de ${comprobaciones.length} comprobaciones fallaron.`);
  process.exit(1);
}

console.log(`${comprobaciones.length} comprobaciones correctas.`);
