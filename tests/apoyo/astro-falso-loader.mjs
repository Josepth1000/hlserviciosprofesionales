/**
 * `astro:env/server` y `astro:content` son módulos virtuales que solo existen
 * dentro de Astro. Para probar una ruta que los importa con Node a secas, este
 * loader los sustituye por dobles vacíos: las pruebas cubren la puerta de la
 * ruta (método, origen, límite) y no el envío de correo.
 */

const DOBLES = {
  'astro:env/server': new URL('./astro-env-falso.mjs', import.meta.url).href,
  'astro:content': new URL('./astro-content-falso.mjs', import.meta.url).href,
};

export async function resolve(specifier, context, nextResolve) {
  const doble = DOBLES[specifier];
  if (doble) return { url: doble, shortCircuit: true };
  return nextResolve(specifier, context);
}
