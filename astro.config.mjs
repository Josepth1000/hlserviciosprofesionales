// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

import react from '@astrojs/react';
import keystatic from '@keystatic/astro';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.hlserviciosprofesionales.com',
  // Las páginas se generan como HTML estático; el adaptador sirve las rutas del
  // panel de administración (/keystatic y /api/keystatic) como funciones.
  adapter: vercel(),
  integrations: [sitemap(), react(), keystatic()],
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      // React 19 + rolldown-vite: el pre-bundle de jsx-runtime puede perder las
      // exportaciones nombradas ("does not provide an export named 't'"), lo
      // que rompe la hidratación del panel /keystatic en desarrollo. Se sirve
      // el módulo sin pre-bundlear (solo afecta a `npm run dev`).
      exclude: ['react/jsx-runtime', 'react/jsx-dev-runtime'],
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
