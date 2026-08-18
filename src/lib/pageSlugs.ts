// Slugs de URL reservados (rutas fijas del sitio y recursos). Se comparten
// entre el panel de Keystatic (validación al crear una página) y el enrutado
// (para que una página creada no colisione con una ruta existente).
export const RESERVED_PAGE_SLUGS = [
  '404',
  'api',
  'blog',
  'como-me-afilio',
  'contacto',
  'favicon',
  'home',
  'images',
  'index',
  'keystatic',
  'login',
  'noticias',
  'quienes-somos',
  'robots',
  'servicios',
  'sitemap',
  'sitemap-index',
];

// Páginas de primer nivel: minúsculas, números y guiones. Bloquea los slugs
// reservados (coincidencia exacta o como prefijo de una subruta).
export const PAGE_SLUG_ALLOWED = new RegExp(
  `^(?!(?:${RESERVED_PAGE_SLUGS.join('|')})(?:/|$))[a-z0-9]+(?:-[a-z0-9]+)*$`
);

export function isPageSlugAllowed(slug: string): boolean {
  return PAGE_SLUG_ALLOWED.test(slug);
}
