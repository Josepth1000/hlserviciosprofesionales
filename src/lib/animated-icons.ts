import type { IconData } from '@animateicons/vanilla';

/**
 * Puente entre los nombres de `Icon.astro` y las colecciones animadas de
 * `@animateicons/vanilla`. El nombre del componente se queda como estaba; aquí
 * se decide qué icono del paquete lo representa.
 *
 * Cargadores (no datos) para que el build los resuelva en el servidor y el
 * navegador descargue solo los iconos que usa de verdad.
 */
export const iconLoaders: Record<string, () => Promise<IconData>> = {
  // Servicios y navegación (Lucide)
  arrow: () => import('@animateicons/vanilla/lucide/arrow-right').then((m) => m.ArrowRight),
  calculator: () => import('@animateicons/vanilla/lucide/calculator').then((m) => m.Calculator),
  calendar: () => import('@animateicons/vanilla/lucide/calendar').then((m) => m.Calendar),
  check: () => import('@animateicons/vanilla/lucide/check').then((m) => m.Check),
  chevron: () => import('@animateicons/vanilla/lucide/chevron-down').then((m) => m.ChevronDown),
  clock: () => import('@animateicons/vanilla/lucide/clock').then((m) => m.Clock),
  document: () => import('@animateicons/vanilla/lucide/file-text').then((m) => m.FileText),
  mail: () => import('@animateicons/vanilla/lucide/mail').then((m) => m.Mail),
  phone: () => import('@animateicons/vanilla/lucide/phone').then((m) => m.Phone),
  pin: () => import('@animateicons/vanilla/lucide/map-pin').then((m) => m.MapPin),
  shield: () => import('@animateicons/vanilla/lucide/shield-check').then((m) => m.ShieldCheck),
  umbrella: () => import('@animateicons/vanilla/lucide/umbrella').then((m) => m.Umbrella),
  users: () => import('@animateicons/vanilla/lucide/users').then((m) => m.Users),

  // Redes sociales: cada colección cubre marcas distintas, así que se mezclan.
  facebook: () => import('@animateicons/vanilla/lucide/facebook').then((m) => m.Facebook),
  instagram: () => import('@animateicons/vanilla/huge/instagram').then((m) => m.Instagram),
  linkedin: () => import('@animateicons/vanilla/lucide/linkedin').then((m) => m.Linkedin),
  tiktok: () => import('@animateicons/vanilla/huge/tiktok').then((m) => m.Tiktok),
  whatsapp: () => import('@animateicons/vanilla/huge/whatsapp').then((m) => m.Whatsapp),
  x: () => import('@animateicons/vanilla/lucide/x').then((m) => m.X),
  youtube: () => import('@animateicons/vanilla/huge/youtube').then((m) => m.Youtube),
};

// Fuera del mapa, dos iconos se quedan con el trazo estático de `Icon.astro`:
// `scale` (la balanza no existe en las colecciones del paquete) y `star` (la
// calificación se lee mejor rellena que en contorno).
