import test from 'node:test';
import assert from 'node:assert/strict';

import { createRateLimiter, getClientIp } from '../src/lib/rate-limit.ts';

/** Congela Date.now para poder mover el reloj a voluntad. */
function relojFijo(inicio = 1_000_000) {
  const real = Date.now;
  let ahora = inicio;
  Date.now = () => ahora;
  return {
    avanzar: (ms) => {
      ahora += ms;
    },
    restaurar: () => {
      Date.now = real;
    },
  };
}

test('permite el número de intentos configurado y bloquea el siguiente', () => {
  const limite = createRateLimiter({ limit: 3, windowMs: 60_000 });
  assert.deepEqual(
    [limite.check('1.1.1.1'), limite.check('1.1.1.1'), limite.check('1.1.1.1'), limite.check('1.1.1.1')],
    [true, true, true, false],
  );
});

test('cada IP tiene su propio contador', () => {
  const limite = createRateLimiter({ limit: 1, windowMs: 60_000 });
  assert.equal(limite.check('1.1.1.1'), true);
  assert.equal(limite.check('1.1.1.1'), false);
  assert.equal(limite.check('2.2.2.2'), true);
});

test('forget reinicia el contador de una sola IP', () => {
  const limite = createRateLimiter({ limit: 1, windowMs: 60_000 });
  limite.check('1.1.1.1');
  limite.check('2.2.2.2');
  limite.forget('1.1.1.1');
  assert.equal(limite.check('1.1.1.1'), true);
  assert.equal(limite.check('2.2.2.2'), false);
});

test('libera el cupo cuando caduca la ventana', () => {
  const reloj = relojFijo();
  try {
    const limite = createRateLimiter({ limit: 2, windowMs: 1_000 });
    assert.equal(limite.check('a'), true);
    assert.equal(limite.check('a'), true);
    assert.equal(limite.check('a'), false);
    reloj.avanzar(1_001);
    assert.equal(limite.check('a'), true);
  } finally {
    reloj.restaurar();
  }
});

test('con más de 1000 IPs vistas sigue respetando el límite (rama del barrido)', () => {
  const limite = createRateLimiter({ limit: 1, windowMs: 60_000 });
  for (let i = 0; i < 1_100; i += 1) {
    assert.equal(limite.check(`ip-${i}`), true);
  }
  assert.equal(limite.check('ip-0'), false);
  assert.equal(limite.check('ip-nueva'), true);
});

test('getClientIp prioriza clientAddress y usa la primera IP de la cabecera', () => {
  const conCabecera = new Request('https://ejemplo.test/', {
    headers: { 'x-forwarded-for': '9.9.9.9, 10.0.0.1' },
  });
  assert.equal(getClientIp(conCabecera, '1.2.3.4'), '1.2.3.4');
  assert.equal(getClientIp(conCabecera), '9.9.9.9');
  assert.equal(getClientIp(new Request('https://ejemplo.test/')), 'desconocida');
});
