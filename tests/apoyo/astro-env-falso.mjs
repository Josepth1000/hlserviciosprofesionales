/**
 * Doble de `astro:env/server`: sin variables, la ruta de contacto responde 500
 * «configuracion» y no envía nada. Las pruebas del camino de envío fijan sus
 * valores con `fijarVariables` (ver tests/contacto.test.mjs).
 *
 * Son `let` exportados a propósito: Node propaga el enlace vivo, así que la ruta
 * ve el valor nuevo aunque ya se haya importado.
 */
export let RESEND_API_KEY;
export let CONTACT_TO;
export let CONTACT_FROM;

/** Fija las variables del doble. Sin argumentos las deja vacías otra vez. */
export function fijarVariables({ apiKey, destino, remitente } = {}) {
  RESEND_API_KEY = apiKey;
  CONTACT_TO = destino;
  CONTACT_FROM = remitente;
}
