/**
 * Validación del formulario de contacto. Vive fuera de la ruta para poder
 * probarla con `node --test`: el endpoint importa `astro:env/server`, que solo
 * existe dentro de Astro.
 *
 * No conoce la petición ni Resend: recibe lo que llegó en el JSON y devuelve el
 * veredicto (spam, campo inválido o datos ya recortados).
 */

const TELEFONO = /^[\d\s+().-]{6,30}$/;
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type CampoContacto = 'nombre' | 'telefono' | 'email' | 'servicio' | 'mensaje';

export type DatosContacto = {
  nombre: string;
  telefono: string;
  email: string;
  servicio: string;
  mensaje: string;
};

export type ResultadoContacto =
  | { estado: 'spam' }
  | { estado: 'invalido'; campo: CampoContacto }
  | { estado: 'valido'; datos: DatosContacto };

// Un valor que no sea texto se trata como vacío: un número o un objeto en el
// JSON hace fallar la validación del campo, no la petición entera.
const texto = (valor: unknown): string => (typeof valor === 'string' ? valor.trim() : '');

export function validarContacto(entrada: unknown): ResultadoContacto {
  const cuerpo = (entrada && typeof entrada === 'object' ? entrada : {}) as Record<string, unknown>;

  // Honeypot: el campo invisible relleno delata a un bot.
  if (texto(cuerpo._empresa)) return { estado: 'spam' };

  const nombre = texto(cuerpo.nombre);
  const telefono = texto(cuerpo.telefono);
  const email = texto(cuerpo.email);
  const servicio = texto(cuerpo.servicio);
  const mensaje = texto(cuerpo.mensaje);

  if (nombre.length < 2 || nombre.length > 80) return { estado: 'invalido', campo: 'nombre' };
  if (!TELEFONO.test(telefono)) return { estado: 'invalido', campo: 'telefono' };
  if (email && !CORREO.test(email)) return { estado: 'invalido', campo: 'email' };
  if (!servicio || servicio.length > 60) return { estado: 'invalido', campo: 'servicio' };
  if (mensaje.length < 5 || mensaje.length > 2000) return { estado: 'invalido', campo: 'mensaje' };

  return { estado: 'valido', datos: { nombre, telefono, email, servicio, mensaje } };
}
