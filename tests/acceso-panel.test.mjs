import test from 'node:test';
import assert from 'node:assert/strict';

import { decidirAcceso, pideHtml } from '../src/lib/acceso-panel.ts';

const valida = { valida: true, motivo: null };
const expiradaPorInactividad = { valida: true, motivo: 'inactividad' };
const expiradaPorAntiguedad = { valida: true, motivo: 'antiguedad' };
const sinSesion = { valida: false, motivo: null };
const configurado = { configurado: true };

test('las rutas públicas no pasan por el control de acceso', () => {
  for (const path of ['/', '/contacto', '/noticias', '/api/contacto']) {
    assert.deepEqual(decidirAcceso(path, { configurado: false, sesion: sinSesion }), {
      tipo: 'publico',
    });
  }
});

test('la pantalla de login es pública aunque falte configuración', () => {
  assert.deepEqual(decidirAcceso('/keystatic/login', { configurado: false, sesion: sinSesion }), {
    tipo: 'publico',
  });
});

test('sin credenciales ni secreto, el panel responde deshabilitado', () => {
  assert.deepEqual(decidirAcceso('/keystatic', { configurado: false, sesion: sinSesion }), {
    tipo: 'deshabilitado',
  });
  assert.deepEqual(
    decidirAcceso('/api/keystatic/github/oauth/callback', {
      configurado: false,
      sesion: valida,
    }),
    { tipo: 'deshabilitado' },
  );
});

test('sin sesión se vuelve al login recordando la ruta pedida', () => {
  const decision = decidirAcceso('/keystatic/collection/posts', {
    ...configurado,
    sesion: sinSesion,
  });

  assert.equal(decision.tipo, 'sin-sesion');
  assert.equal(decision.redirigir, '/keystatic/login?next=%2Fkeystatic%2Fcollection%2Fposts');
  assert.equal(decision.mensaje, 'No autorizado');
});

test('la ruta de vuelta se codifica y nunca sale del sitio', () => {
  const anidada = decidirAcceso('/keystatic/singleton/configuracion', {
    ...configurado,
    sesion: sinSesion,
  });
  const api = decidirAcceso('/api/keystatic/update', { ...configurado, sesion: sinSesion });

  assert.equal(anidada.redirigir, '/keystatic/login?next=%2Fkeystatic%2Fsingleton%2Fconfiguracion');
  assert.equal(api.redirigir, '/keystatic/login?next=%2Fapi%2Fkeystatic%2Fupdate');
  assert.ok(anidada.redirigir.startsWith('/keystatic/login?next=%2F'));
});

test('una sesión expirada por inactividad pide volver a entrar', () => {
  const decision = decidirAcceso('/keystatic', {
    ...configurado,
    sesion: expiradaPorInactividad,
  });

  assert.deepEqual(decision, {
    tipo: 'expirada',
    reason: 'expired',
    redirigir: '/keystatic/login?error=1&reason=expired',
    mensaje: 'Sesión expirada por inactividad',
  });
});

test('el tope absoluto se distingue de la inactividad en el login', () => {
  const decision = decidirAcceso('/api/keystatic/update', {
    ...configurado,
    sesion: expiradaPorAntiguedad,
  });

  assert.equal(decision.tipo, 'expirada');
  assert.equal(decision.reason, 'antiguedad');
  assert.equal(decision.redirigir, '/keystatic/login?error=1&reason=antiguedad');
  assert.match(decision.mensaje, /plazo máximo/);
});

test('una sesión válida sigue adelante', () => {
  assert.deepEqual(decidirAcceso('/keystatic/collection/servicios', {
    ...configurado,
    sesion: valida,
  }), { tipo: 'continuar' });
});

test('los prefijos parecidos ni abren el panel ni lo bloquean', () => {
  for (const path of ['/keystaticooo', '/api/keystatico']) {
    assert.deepEqual(decidirAcceso(path, { ...configurado, sesion: sinSesion }), {
      tipo: 'publico',
    });
  }
  for (const path of ['/keystatic', '/keystatic/', '/api/keystatic', '/api/keystatic/update']) {
    assert.deepEqual(decidirAcceso(path, { ...configurado, sesion: sinSesion }), {
      tipo: 'sin-sesion',
      redirigir: `/keystatic/login?next=${encodeURIComponent(path)}`,
      mensaje: 'No autorizado',
    });
  }
});

test('solo una navegación del navegador cuenta como HTML', () => {
  assert.equal(pideHtml('text/html,application/xhtml+xml;q=0.9'), true);
  assert.equal(pideHtml('TEXT/HTML'), true);
  assert.equal(pideHtml('application/json'), false);
  assert.equal(pideHtml('*/*'), false);
  assert.equal(pideHtml(null), false);
  assert.equal(pideHtml(undefined), false);
});
