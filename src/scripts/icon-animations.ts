import { iconLoaders } from '../lib/animated-icons';

/**
 * Anima los iconos del paquete sobre el mismo `svg` que ya viene en el HTML.
 *
 * El build deja el icono dibujado en reposo (se ve sin JS) y aquí solo se
 * arranca `play()` cuando el visitante interactúa con el enlace, el botón o la
 * tarjeta que lo contiene. No se reemplaza ningún nodo, así que no hay CLS.
 */
type Player = { start: () => void; stop: () => void };

const players = new WeakMap<SVGSVGElement, Player>();
let engine: Promise<typeof import('@animateicons/vanilla')> | null = null;
let warmed = false;

const loadEngine = () => (engine ??= import('@animateicons/vanilla'));

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

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
  document.querySelectorAll<SVGSVGElement>('svg[data-icon-anim]').forEach((svg) => {
    if (svg.dataset.iconWired) return;
    svg.dataset.iconWired = '1';

    const host = svg.closest<HTMLElement>('a, button, [data-icon-hover]') ?? svg;
    const trigger = () => animate(svg);
    host.addEventListener('pointerenter', trigger, { passive: true });
    host.addEventListener('focusin', trigger);
  });
}

function warmEngine() {
  if (warmed || !document.querySelector('svg[data-icon-anim]')) return;
  warmed = true;
  void loadEngine();
}

function init() {
  if (reducedMotion()) return;
  wire();

  // Adelanta el motor de animación cuando el navegador está libre, para que el
  // primer hover no espere a la red.
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void })
    .requestIdleCallback;
  if (idle) idle(warmEngine, { timeout: 3000 });
  else window.setTimeout(warmEngine, 2000);
}

document.addEventListener('astro:page-load', init);
