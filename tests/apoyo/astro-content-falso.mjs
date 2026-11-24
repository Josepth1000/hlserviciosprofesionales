// Doble de `astro:content`: solo existe el contenido de «textos» que el
// formulario de contacto lee para poner la etiqueta del servicio en el correo.
// El resto de colecciones no se leen en estas pruebas.
const TEXTOS = {
  data: {
    contact: {
      form: {
        serviceOptions: [{ value: 'juridicos', label: 'Servicios Jurídicos' }],
      },
    },
  },
};

export async function getCollection() {
  return [];
}

export async function getEntry(collection, id) {
  if (collection === 'textos' && id === 'index') return TEXTOS;
  return undefined;
}
