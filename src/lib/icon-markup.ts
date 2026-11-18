import { restingAttributes } from '@animateicons/vanilla';
import type { IconData, IconNode } from '@animateicons/vanilla';

const SELF_CLOSING = new Set(['path', 'circle', 'line', 'polyline', 'polygon', 'ellipse', 'rect', 'use']);

const escapeAttr = (value: string | number) =>
  String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function serializeNode(node: IconNode, idScope: string): string {
  const attrs = Object.entries(restingAttributes(node, false, idScope))
    .map(([key, value]) => ` ${key}="${escapeAttr(value)}"`)
    .join('');
  const children = (node.children ?? []).map((child) => serializeNode(child, idScope)).join('');

  if (!children && SELF_CLOSING.has(node.tag)) return `<${node.tag}${attrs} />`;
  return `<${node.tag}${attrs}>${children}</${node.tag}>`;
}

/**
 * Markup del icono en reposo, generado con los mismos datos que anima
 * `play()` en el navegador. Como el `svg` ya viene en el HTML, se ve sin JS y
 * la animación se aplica sobre los mismos nodos: no hay reemplazo ni CLS.
 */
export function iconMarkup(
  data: IconData,
  { name, className, idScope }: { name: string; className: string; idScope: string }
): string {
  const rootAttrs = restingAttributes(data, true, idScope);
  const attrs = {
    ...rootAttrs,
    class: className,
    // El sitio dibuja a 1,5 px; el paquete usa 2 px por defecto.
    'stroke-width': '1.5',
    'aria-hidden': 'true',
    'data-icon': name,
    'data-icon-anim': '',
  };
  const root = Object.entries(attrs)
    .map(([key, value]) => ` ${key}="${escapeAttr(value)}"`)
    .join('');
  const children = (data.children ?? []).map((child) => serializeNode(child, idScope)).join('');

  return `<svg${root}>${children}</svg>`;
}
