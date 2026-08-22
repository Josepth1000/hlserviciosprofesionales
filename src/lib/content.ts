import { getCollection, getEntry } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

export type SiteData = CollectionEntry<'site'>['data'];
export type ServiceEntry = CollectionEntry<'services'>;
export type ServiceData = ServiceEntry['data'];
export type AfiliacionData = CollectionEntry<'afiliacion'>['data'];
export type TestimonialEntry = CollectionEntry<'testimonials'>;
export type FaqEntry = CollectionEntry<'faqs'>;
export type TextosData = CollectionEntry<'textos'>['data'];

export async function getSiteData(): Promise<SiteData> {
  const entry = await getEntry('site', 'index');
  if (!entry) {
    throw new Error('Falta el archivo de configuración del sitio: src/content/site/index.yaml');
  }
  return entry.data;
}

// Mapa servicio → imagen personalizada, definido en la Configuración del sitio.
// Si un servicio no tiene imagen personalizada, se usa la de su propia ficha.
export function getServiceImageMap(site: SiteData): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of site.serviceImages ?? []) {
    if (item.service && item.image) map.set(item.service, item.image);
  }
  return map;
}

export async function getServices(): Promise<ServiceEntry[]> {
  const entries = await getCollection('services');
  return entries.sort((a, b) => a.data.order - b.data.order);
}

export async function getTestimonials(): Promise<TestimonialEntry[]> {
  const entries = await getCollection('testimonials');
  return entries.sort((a, b) => a.data.order - b.data.order);
}

export async function getFaqs(): Promise<FaqEntry[]> {
  const entries = await getCollection('faqs');
  return entries.sort((a, b) => a.data.order - b.data.order);
}

export async function getAfiliacionData(): Promise<AfiliacionData> {
  const entry = await getEntry('afiliacion', 'index');
  if (!entry) {
    throw new Error('Falta el archivo de configuración de afiliación: src/content/afiliacion/index.yaml');
  }
  return entry.data;
}

// Textos del sitio (panel → ✍️ Textos del sitio). Todos los textos e imágenes
// que se muestran en el sitio se pueden editar desde ahí, sin tocar código.
export async function getTextosData(): Promise<TextosData> {
  const entry = await getEntry('textos', 'index');
  if (!entry) {
    throw new Error('Falta el archivo de configuración de textos: src/content/textos/index.yaml');
  }
  return entry.data;
}

export function getWhatsAppLink(whatsapp: string, message: string): string {
  return `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;
}
