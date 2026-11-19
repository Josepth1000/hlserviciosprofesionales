// @ts-check
import { defineConfig, envField } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

import react from '@astrojs/react';
import keystatic from '@keystatic/astro';
import vercel from '@astrojs/vercel';
import { generarVariantesHero } from './scripts/variantes-hero.mjs';

// Antes de compilar se dejan al día las variantes responsive de las imágenes de
// encabezado (las que vienen del panel). Astro copia public/ al terminar, así
// que el srcset de las páginas encuentra los archivos recién generados.
const variantesHero = {
  name: 'variantes-hero',
  hooks: {
    'astro:build:start': async () => {
      await generarVariantesHero();
    },
  },
};

// https://astro.build/config
export default defineConfig({
  site: 'https://www.hlserviciosprofesionales.com',
  // Las páginas se generan como HTML estático; el adaptador sirve las rutas del
  // panel de administración (/keystatic y /api/keystatic) como funciones.
  adapter: vercel(),
  integrations: [variantesHero, sitemap(), react(), keystatic()],
  build: {
    // La hoja de estilos se incrusta en el HTML: el primer pintado ya no espera
    // una petición de CSS aparte (era el último recurso bloqueante del render).
    inlineStylesheets: 'always',
  },
  // Variables del formulario. `access: 'secret'` impide que Astro las exponga al
  // cliente y no las incrusta en el bundle: se leen del entorno en tiempo de
  // ejecución (en desarrollo, desde los archivos .env).
  env: {
    schema: {
      RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      CONTACT_TO: envField.string({ context: 'server', access: 'secret', optional: true }),
      CONTACT_FROM: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      // React 19 + rolldown-vite: el pre-bundle de jsx-runtime puede perder las
      // exportaciones nombradas ("does not provide an export named 't'"), lo
      // que rompe la hidratación del panel /keystatic en desarrollo. Se sirve
      // el módulo sin pre-bundlear (solo afecta a `npm run dev`).
      exclude: ['react/jsx-runtime', 'react/jsx-dev-runtime'],
      // El panel se carga con un import dinámico (astro-island), así que el
      // escáner inicial no ve `@keystatic/core` ni su interfaz: Vite los
      // optimizaba a mitad de sesión, cambiaba el hash de la caché y los
      // módulos ya servidos quedaban con "504 (Outdated Optimize Dep)", dejando
      // el panel en blanco. Al declararlos aquí se pre-bundlean al arrancar.
      include: ['@keystatic/core', '@keystatic/core/ui'],
    },
    server: {
      watch: {
        // Windows: los eventos del sistema de archivos pueden perderse cuando
        // Keystatic guarda el YAML (escritura atómica). El polling hace que el
        // content layer detecte SIEMPRE los cambios en vivo, sin reiniciar.
        usePolling: true,
        interval: 250,
      },
    },
  },
});
