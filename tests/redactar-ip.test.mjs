import test from 'node:test';
import assert from 'node:assert/strict';

import { redactarIp } from '../src/lib/redactar-ip.ts';

test('IPv4: conserva la red /24 y pone a cero el último octeto', () => {
  assert.equal(redactarIp('181.55.22.34'), '181.55.22.0');
  assert.equal(redactarIp('10.0.0.255'), '10.0.0.0');
  assert.equal(redactarIp('127.0.0.1'), '127.0.0.0');
});

test('IPv6: conserva los tres primeros grupos (red /48)', () => {
  assert.equal(redactarIp('2a01:cb0c:1234:5678:9abc:def0:1234:5678'), '2a01:cb0c:1234::');
  assert.equal(redactarIp('2a01:cb0c:1234::1'), '2a01:cb0c:1234::');
  assert.equal(redactarIp('::1'), '::');
});

test('valor no reconocido: no se inventa una IP', () => {
  assert.equal(redactarIp('desconocida'), 'desconocida');
  assert.equal(redactarIp(''), 'desconocida');
  assert.equal(redactarIp('no-es-una-ip'), 'desconocida');
});

test('nunca devuelve la dirección original completa', () => {
  for (const ip of ['181.55.22.34', '2a01:cb0c:1234:5678::9']) {
    assert.notEqual(redactarIp(ip), ip);
  }
});
