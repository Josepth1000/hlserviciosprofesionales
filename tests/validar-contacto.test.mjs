import test from 'node:test';
import assert from 'node:assert/strict';

import { validarContacto } from '../src/lib/validar-contacto.ts';

const base = {
  nombre: 'Ana María',
  telefono: '+57 315 340 1391',
  email: 'ana@ejemplo.com',
  servicio: 'salud',
  mensaje: 'Quisiera cotizar el plan familiar.',
};

test('acepta un formulario completo y recorta los espacios', () => {
  const resultado = validarContacto({
    ...base,
    nombre: '  Ana María ',
    mensaje: '  Quisiera cotizar el plan familiar.  ',
  });

  assert.equal(resultado.estado, 'valido');
  assert.deepEqual(resultado.datos, { ...base });
});

test('el correo es opcional', () => {
  const resultado = validarContacto({ ...base, email: '' });
  assert.equal(resultado.estado, 'valido');
  assert.equal(resultado.datos.email, '');
});

test('rechaza un nombre demasiado corto o largo', () => {
  assert.deepEqual(validarContacto({ ...base, nombre: 'A' }), {
    estado: 'invalido',
    campo: 'nombre',
  });
  assert.equal(validarContacto({ ...base, nombre: 'x'.repeat(81) }).campo, 'nombre');
});

test('rechaza teléfonos con letras, demasiado cortos o demasiado largos', () => {
  for (const telefono of ['llámame', '123', '+57 315 340 1391 interno 2', '']) {
    assert.deepEqual(validarContacto({ ...base, telefono }), {
      estado: 'invalido',
      campo: 'telefono',
    });
  }
});

test('rechaza un correo con forma inválida', () => {
  for (const email of ['ana', 'ana@', 'ana@ejemplo', 'ana ejemplo@correo.com']) {
    assert.deepEqual(validarContacto({ ...base, email }), { estado: 'invalido', campo: 'email' });
  }
});

test('exige un servicio y le pone tope de longitud', () => {
  assert.deepEqual(validarContacto({ ...base, servicio: '   ' }), {
    estado: 'invalido',
    campo: 'servicio',
  });
  assert.equal(validarContacto({ ...base, servicio: 's'.repeat(61) }).campo, 'servicio');
});

test('exige un mensaje de al menos cinco caracteres y con tope de 2000', () => {
  assert.deepEqual(validarContacto({ ...base, mensaje: 'Hola' }), {
    estado: 'invalido',
    campo: 'mensaje',
  });
  assert.equal(validarContacto({ ...base, mensaje: 'm'.repeat(2001) }).campo, 'mensaje');
  assert.equal(validarContacto({ ...base, mensaje: '12345' }).estado, 'valido');
});

test('el honeypot relleno se marca como spam; vacío o con espacios, no', () => {
  assert.deepEqual(validarContacto({ ...base, _empresa: 'Acme' }), { estado: 'spam' });
  assert.deepEqual(validarContacto({ ...base, _empresa: '   ' }), {
    estado: 'valido',
    datos: { ...base },
  });
});

test('valida el primer campo en el orden del formulario', () => {
  assert.deepEqual(validarContacto({ ...base, nombre: 'A', telefono: 'x' }), {
    estado: 'invalido',
    campo: 'nombre',
  });
  assert.deepEqual(validarContacto({ ...base, telefono: 'x', email: 'no' }), {
    estado: 'invalido',
    campo: 'telefono',
  });
});

test('entradas que no son un objeto no lanzan: fallan como campo vacío', () => {
  for (const entrada of [null, undefined, 'texto', 42, []]) {
    assert.deepEqual(validarContacto(entrada), { estado: 'invalido', campo: 'nombre' });
  }
});

test('un campo con tipo equivocado se trata como vacío, sin romper', () => {
  assert.deepEqual(validarContacto({ ...base, nombre: 123 }), {
    estado: 'invalido',
    campo: 'nombre',
  });
  assert.equal(validarContacto({ ...base, telefono: { a: 1 } }).campo, 'telefono');
  assert.equal(validarContacto({ ...base, mensaje: ['hola mundo'] }).campo, 'mensaje');
});
