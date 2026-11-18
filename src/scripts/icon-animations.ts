import { iconLoaders } from '../lib/animated-icons';

/**
 * Anima los iconos del paquete sobre el mismo `svg` que ya viene en el HTML.
 *
 * El build deja el icono dibujado en reposo (se ve sin JS) y aquí solo se
 * arranca `play()` cuando el visitante interactúa con el enlace, el botón o la
 * tarjeta que lo contiene. No se reemplaza ningún nodo, así que no hay CLS.
 */
type Player = { start: () => void };

const players = new WeakMap<SVGSVGElement, Player>();
const wired = new WeakSet<SVGSVGElement>();
let engine: Promise<typeof import('@animateicons/vanilla')> | null = null;

const loadEngine = () => (engine ??= import('@animateicons/vanilla'));

function animate(svg: SVGSVGElement) {
  const ready = players.get(svg);
  if (ready) {
    ready.start();
    return;
  }

  const loader = svg.dataset.icon ? iconLoaders[svg.dataset.icon] : undefined;
  if (!loader) return;

  void Promise.all([loadEngine(), loader()]).then(([{ play }, data]) => {
    if (!svg.isConnected || players.has(svg)) return;
    const player = play(svg, data);
    players.set(svg, player);
    player.start();
  });
}

function wire() {
  document.querySelectorAll<SVGSVGElement>('svg[data-icon]').forEach((svg) => {
    if (wired.has(svg)) return;
    wired.add(svg);

    const host = svg.closest<HTMLElement>('a, button, [data-icon-hover]') ?? svg;
    const trigger = () => animate(svg);
    host.addEventListener('pointerenter', trigger, { passive: true });
    host.addEventListener('focusin', trigger);
  });
}

function init() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  wire();
}

document.addEventListener('astro:page-load', init);
