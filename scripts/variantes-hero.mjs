// Genera las variantes responsive de las imágenes de encabezado antes de cada
// build. Las imágenes salen del panel (Keystatic): si alguien cambia el hero de
// la portada o de una página interior, el siguiente build deja las variantes al
// día y el srcset apunta siempre a archivos que existen, sin pasos a mano.
//
//   cd sitio && npm run build                  # hook astro:build:start (lo normal)
//   cd sitio && node scripts/variantes-hero.mjs   # solo regenerar, sin compilar
//
// Convenio de nombres: `/images/hero/image.jpg` → `/images/hero/image-640.jpg`.
// Es el mismo que usa `srcsetDe()` en las páginas, así que el srcset y los
// archivos no se pueden desincronizar.
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import sharp from 'sharp';

const SITIO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENIDO = path.join(SITIO, 'src', 'content');

// `public/` del proyecto. `import.meta.url` vale cuando este archivo corre
// suelto (`node scripts/variantes-hero.mjs`) y cuando lo importa astro.config.mjs,
// pero al importarlo desde una página Astro Vite lo empaqueta y la URL pasa a
// apuntar al bundle: ahí la referencia fiable es el directorio de trabajo, que es
// la raíz del sitio cuando lo lanzan los scripts de npm.
function dirPublico() {
  const desdeScript = path.join(SITIO, 'public');
  return existsSync(path.join(desdeScript, 'images')) ? desdeScript : path.join(process.cwd(), 'public');
}

// Anchos del srcset. El de 1920 cubre las pantallas grandes; siempre que la
// imagen original dé para tanto, es la variante mayor y el original queda solo
// como respaldo del atributo src.
export const ANCHOS = [640, 960, 1280, 1920];

/** Ruta pública de la variante de `ancho` px: `/a/b.jpg` → `/a/b-640.jpg`. */
export function varianteDe(ruta, ancho) {
  return `${ruta.replace(/\.[^./]+$/, '')}-${ancho}.jpg`;
}

/**
 * srcset de `ruta` con las variantes que existan en public/. Devuelve undefined
 * si la imagen no tiene variantes (p. ej. es más pequeña que 640 px o la acaba
 * de cambiar el panel): en ese caso la página sirve el original.
 */
export function srcsetDe(ruta) {
  const partes = [];
  for (const ancho of ANCHOS) {
    const variante = varianteDe(ruta, ancho);
    if (existsSync(path.join(dirPublico(), variante.replace(/^\//, '')))) partes.push(`${variante} ${ancho}w`);
  }
  return partes.length ? partes.join(', ') : undefined;
}

function archivosYaml(dir) {
  const salida = [];
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const completo = path.join(dir, entrada.name);
    if (entrada.isDirectory()) salida.push(...archivosYaml(completo));
    else if (/\.ya?ml$/i.test(entrada.name)) salida.push(completo);
  }
  return salida;
}

// Recorre el YAML y se queda con los valores que son una ruta de imagen local
// bajo una clave `hero…` (hero.image, heroImage, hero.imageMobile…). Así se
// cubren todas las imágenes de encabezado sin listar rutas a mano, y las fotos
// de servicios o del blog no se procesan aquí.
function imagenesHero(nodo, rutaClave, salida) {
  if (!nodo || typeof nodo !== 'object') return;
  for (const [clave, valor] of Object.entries(nodo)) {
    const ruta = [...rutaClave, clave];
    if (typeof valor === 'string') {
      if (ruta.some((segmento) => /^hero/i.test(segmento)) && /^\/images\/.+\.(jpe?g|png|webp|avif)$/i.test(valor)) {
        salida.add(valor);
      }
    } else {
      imagenesHero(valor, ruta, salida);
    }
  }
}

function imagenesDelContenido() {
  const imagenes = new Set();
  for (const archivo of archivosYaml(CONTENIDO)) {
    let datos;
    try {
      datos = parse(readFileSync(archivo, 'utf8'));
    } catch (error) {
      // El YAML roto lo reporta el propio panel/build; aquí solo se ignora.
      console.warn(`  · ${path.relative(SITIO, archivo)}: YAML ilegible, se omite`);
      continue;
    }
    imagenesHero(datos, [], imagenes);
  }
  return [...imagenes];
}

async function generarVariantes(ruta) {
  const publico = dirPublico();
  const origen = path.join(publico, ruta.replace(/^\//, ''));
  if (!existsSync(origen)) {
    console.warn(`  · ${ruta}: el archivo no está en public/, se omiten sus variantes`);
    return { generadas: 0, alDia: 0, eliminadas: 0 };
  }

  const { width } = await sharp(origen).metadata();
  const mtimeOrigen = statSync(origen).mtimeMs;
  const cuenta = { generadas: 0, alDia: 0, eliminadas: 0 };

  for (const ancho of ANCHOS) {
    const destino = path.join(publico, varianteDe(ruta, ancho).replace(/^\//, ''));

    // Recortar no tiene sentido: una variante más ancha que el original solo
    // pesa más. Si quedó de una imagen anterior, sobra y se retira.
    if (width && ancho > width) {
      if (existsSync(destino)) {
        unlinkSync(destino);
        cuenta.eliminadas += 1;
      }
      continue;
    }

    if (existsSync(destino) && statSync(destino).mtimeMs >= mtimeOrigen) {
      cuenta.alDia += 1;
      continue;
    }

    mkdirSync(path.dirname(destino), { recursive: true });
    await sharp(origen)
      .resize({ width: ancho })
      .jpeg({ quality: 78, progressive: true, mozjpeg: true })
      .toFile(destino);
    cuenta.generadas += 1;
  }

  return cuenta;
}

/**
 * Deja al día las variantes de todas las imágenes de encabezado del contenido.
 * Solo recompone lo que cambió: si la imagen y sus variantes están al día, el
 * build no cuesta nada.
 */
export async function generarVariantesHero() {
  const imagenes = imagenesDelContenido();
  if (!imagenes.length) return;

  let generadas = 0;
  for (const ruta of imagenes) {
    const cuenta = await generarVariantes(ruta);
    generadas += cuenta.generadas;
    if (cuenta.generadas || cuenta.eliminadas) {
      console.log(`  · ${ruta}: ${cuenta.generadas} variante(s) generada(s)${cuenta.eliminadas ? `, ${cuenta.eliminadas} retirada(s)` : ''}`);
    }
  }
  console.log(`Variantes del hero: ${imagenes.length} imagen(es), ${generadas} archivo(s) nuevo(s).`);
}

// Ejecución directa (`node scripts/variantes-hero.mjs`).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await generarVariantesHero();
}
