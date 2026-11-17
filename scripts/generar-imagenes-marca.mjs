// Regenera las versiones web de la identidad a partir de los originales de
// "LOGO DEFINITIVO" (emblema vectorial + logotipo en script).
//
//   cd sitio && node scripts/generar-imagenes-marca.mjs
//
// Produce: public/images/logo.png (cabecera, pie y login), favicon.ico
// multi-tamaño, favicon-48.png, apple-touch-icon.png, icons/icon-192.png,
// icons/icon-512.png, og-image.jpg (1200×630) y site.webmanifest.
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Rutas resueltas desde el propio archivo: funciona se lance desde donde se lance.
const SITIO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = path.resolve(SITIO, '..', 'LOGO DEFINITIVO');
const OUT = path.join(SITIO, 'public');
const INK = '#0B0B0D';

const iconSvg = path.join(ROOT, 'elementos_por_separado/HL_icono.svg');
const marcaPng = path.join(ROOT, 'elementos_por_separado/HL_servicios_profesionales_dorado.png');

// Icono maestro: se rasteriza el SVG (vectorial, con alfa real) a 1024 px.
const maestro = await sharp(iconSvg, { density: 300 })
  .resize({ width: 1024, height: 1024, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();
const meta = await sharp(maestro).metadata();
console.log('icono maestro', meta.width + 'x' + meta.height, 'alfa:', meta.hasAlpha);

// 1. Logo del sitio: mismo path que ya consume el CMS (site.logo).
await sharp(maestro)
  .resize({ width: 512, height: 512, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9 })
  .toFile(path.join(OUT, 'images/logo.png'));

// 2. Iconos de app: emblema centrado sobre tinta (fondo opaco para iOS).
async function cuadro(tam, radio, relleno, salida) {
  const icono = await sharp(maestro)
    .resize({ width: Math.round(tam * relleno), height: Math.round(tam * relleno), fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const fondo = Buffer.from(`<svg width="${tam}" height="${tam}"><rect width="${tam}" height="${tam}" rx="${radio}" fill="${INK}"/></svg>`);
  await sharp(fondo).composite([{ input: icono, gravity: 'center' }]).png({ compressionLevel: 9 }).toFile(salida);
}

await cuadro(180, 0, 0.74, path.join(OUT, 'apple-touch-icon.png'));
await cuadro(192, 0, 0.72, path.join(OUT, 'icons/icon-192.png'));
await cuadro(512, 0, 0.72, path.join(OUT, 'icons/icon-512.png'));
await cuadro(48, 10, 0.72, path.join(OUT, 'favicon-48.png'));

// 3. favicon.ico multi-tamaño: contenedor ICO con entradas PNG (Vista en adelante).
const tamanos = [16, 32, 48];
const pngs = [];
for (const t of tamanos) {
  const icono = await sharp(maestro)
    .resize({ width: Math.round(t * 0.72), height: Math.round(t * 0.72), fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const fondo = Buffer.from(`<svg width="${t}" height="${t}"><rect width="${t}" height="${t}" rx="${Math.round(t / 5)}" fill="${INK}"/></svg>`);
  pngs.push(await sharp(fondo).composite([{ input: icono, gravity: 'center' }]).png().toBuffer());
}
const cabecera = Buffer.alloc(6);
cabecera.writeUInt16LE(0, 0);
cabecera.writeUInt16LE(1, 2);
cabecera.writeUInt16LE(pngs.length, 4);
const entradas = Buffer.alloc(16 * pngs.length);
let offset = 6 + 16 * pngs.length;
pngs.forEach((buf, i) => {
  const e = i * 16;
  entradas.writeUInt8(tamanos[i] >= 256 ? 0 : tamanos[i], e);
  entradas.writeUInt8(tamanos[i] >= 256 ? 0 : tamanos[i], e + 1);
  entradas.writeUInt16LE(1, e + 4);
  entradas.writeUInt16LE(32, e + 6);
  entradas.writeUInt32LE(buf.length, e + 8);
  entradas.writeUInt32LE(offset, e + 12);
  offset += buf.length;
});
fs.writeFileSync(path.join(OUT, 'favicon.ico'), Buffer.concat([cabecera, entradas, ...pngs]));

// 4. Open Graph 1200×630: tinta con halo dorado, emblema y logotipo en script.
const ancho = 1200;
const alto = 630;
const fondoOg = Buffer.from(`<svg width="${ancho}" height="${alto}">
  <defs>
    <radialGradient id="halo" cx="28%" cy="45%" r="60%">
      <stop offset="0" stop-color="#C9A227" stop-opacity="0.22"/>
      <stop offset="0.55" stop-color="#C9A227" stop-opacity="0.06"/>
      <stop offset="1" stop-color="${INK}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${ancho}" height="${alto}" fill="${INK}"/>
  <rect width="${ancho}" height="${alto}" fill="url(#halo)"/>
  <rect x="0" y="0" width="${ancho}" height="4" fill="#C9A227"/>
</svg>`);
const iconoOg = await sharp(maestro)
  .resize({ width: 300, height: 300, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();
const marca = await sharp(marcaPng).resize({ width: 620 }).png().toBuffer();
const marcaMeta = await sharp(marca).metadata();
await sharp(fondoOg)
  .composite([
    { input: iconoOg, left: 120, top: Math.round((alto - 300) / 2) },
    { input: marca, left: 470, top: Math.round((alto - (marcaMeta.height ?? 120)) / 2) },
  ])
  .jpeg({ quality: 92, mozjpeg: true })
  .toFile(path.join(OUT, 'og-image.jpg'));

// 5. Línea de marca «SERVICIOS CONTABLES & OUTSOURCING» en blanco, recortada del
// lockup blanco (misma retícula que el vectorial): se usa como elemento gráfico
// en cabecera y pie, en lugar del eslogan de texto. En blanco contrasta más sobre
// la tinta que el dorado apagado de la versión principal.
const vectorial = await sharp(path.join(ROOT, 'HL_logo_blanco_transparente.png')).png().toBuffer();
const vb = await sharp(vectorial).metadata();
const banda = await sharp(vectorial)
  .extract({ left: 0, top: Math.round(vb.height * 0.886), width: vb.width, height: Math.round(vb.height * 0.114) })
  .png()
  .toBuffer();
const tinta = await sharp(banda).trim({ threshold: 1 }).png().toBuffer();
// Se añade un margen transparente para que el recorte no muerda los bordes del glifo.
await sharp(tinta)
  .extend({ top: 6, bottom: 6, left: 6, right: 6, background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .resize({ width: 640 })
  .png({ compressionLevel: 9 })
  .toFile(path.join(OUT, 'images/marca-tagline.png'));

// 6. Manifiesto para "añadir a la pantalla de inicio".
fs.writeFileSync(
  path.join(OUT, 'site.webmanifest'),
  JSON.stringify(
    {
      name: 'HL Servicios Profesionales',
      short_name: 'HL Servicios',
      description: 'Asesoría jurídica, contable y seguridad social en Bucaramanga.',
      start_url: '/',
      display: 'standalone',
      background_color: INK,
      theme_color: INK,
      lang: 'es-CO',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    null,
    2,
  ) + '\n',
);

console.log('listo: logo 512, favicon.ico 16/32/48, favicon-48, apple-touch 180, iconos 192/512, og-image 1200x630, manifiesto');
