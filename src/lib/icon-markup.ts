import { restingAttributes } from '@animateicons/vanilla';
import type { IconData, IconNode } from '@animateicons/vanilla';

const SELF_CLOSING = new Set(['path', 'circle', 'line', 'polyline', 'polygon', 'ellipse', 'rect', 'use']);

const escapeAttr = (value: string | number) =>
  String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

const serializeAttrs = (attrs: Record<string, string>) =>
  Object.entries(attrs)
    .map(([key, value]) => ` ${key}="${escapeAttr(value)}"`)
    .join('');

function serializeNode(node: IconNode): string {
  const attrs = serializeAttrs(restingAttributes(node));
  const children = (node.children ?? []).map(serializeNode).join('');

  if (!children && SELF_CLOSING.has(node.tag)) return `<${node.tag}${attrs} />`;
  return `<${node.tag}${attrs}>${children}</${node.tag}>`;
}

/**
 * Markup del icono en reposo, generado con los mismos datos que anima
 * `play()` en el navegador. Como el `svg` ya viene en el HTML, se ve sin JS y
 * la animación se aplica sobre los mismos nodos: no hay reemplazo ni CLS.
 */
export function iconMarkup(data: IconData, { name, className }: { name: string; className: string }): string {
  const attrs = serializeAttrs({
    ...restingAttributes(data, true),
    class: className,
    // El sitio dibuja a 1,5 px; el paquete usa 2 px por defecto.
    'stroke-width': '1.5',
    'aria-hidden': 'true',
    'data-icon': name,
  });
  const children = (data.children ?? []).map(serializeNode).join('');

  return `<svg${attrs}>${children}</svg>`;
}
