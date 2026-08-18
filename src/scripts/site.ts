/**
 * Interacciones globales del sitio.
 *
 * Diseñado para sobrevivir a las View Transitions de Astro (<ClientRouter />):
 *  - Los listeners delegados se registran una sola vez sobre `document`
 *    (el documento persiste entre navegaciones; el <body> se reemplaza).
 *  - Todo lo que necesita observar el DOM nuevo se re-ejecuta en
 *    `astro:page-load`, que dispara en la carga inicial y tras cada navegación.
 *
 * Todas las animaciones respetan `prefers-reduced-motion`.
 */

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

document.documentElement.classList.add('js');

// ---------------------------------------------------------------- helpers
const q = <T extends Element>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const qa = <T extends Element>(sel: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll<T>(sel));

// ------------------------------------------------------- estado de navegación
// Evita que `scroll-behavior: smooth` anime el reseteo de scroll del router.
document.addEventListener('astro:before-swap', () => {
  document.documentElement.style.scrollBehavior = 'auto';
});
document.addEventListener('astro:after-swap', () => {
  document.documentElement.style.scrollBehavior = '';
});

// ------------------------------------------------------------------- reveal
// Los elementos con `[data-reveal]` aparecen con un suave ascenso al entrar
// en el viewport. `--reveal-delay` (inline) permite escalonar en grupos.
let revealObserver: IntersectionObserver | null = null;

function initReveal() {
  if (reducedMotion) return;
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add('is-revealed');
            revealObserver?.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
  }
  for (const el of qa<HTMLElement>('[data-reveal]:not(.is-revealed)')) {
    revealObserver.observe(el);
  }
}

// ------------------------------------------------------------- contadores
// `[data-counter]` anima el número de su texto ("10+", "100%") al entrar en
// vista, conservando el sufijo. Se ignora bajo prefers-reduced-motion.
let counterObserver: IntersectionObserver | null = null;

function animateCounter(el: HTMLElement) {
  const raw = el.textContent?.trim() ?? '';
  const match = raw.match(/^([\d]+(?:[.,]\d+)?)(.*)$/);
  if (!match) return;
  const target = parseFloat(match[1].replace(',', '.'));
  const suffix = match[2];
  const hasDecimals = /[.,]/.test(match[1]);
  if (reducedMotion || Number.isNaN(target)) {
    el.textContent = raw;
    return;
  }
  const format = (v: number) => (hasDecimals ? v.toFixed(1).replace('.', ',') : String(Math.round(v)));
  const duration = 1400;
  const start = performance.now();
  const tick = (now: number) => {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = format(target * eased) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function initCounters() {
  if (reducedMotion) return;
  if (!counterObserver) {
    counterObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            animateCounter(entry.target as HTMLElement);
            counterObserver?.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.4 },
    );
  }
  for (const el of qa<HTMLElement>('[data-counter]')) {
    counterObserver.observe(el);
  }
}

// ------------------------------------------------------------------ header
let header: HTMLElement | null = null;

function onHeaderScroll() {
  header?.classList.toggle('is-scrolled', window.scrollY > 10);
}

function initHeader() {
  header = q<HTMLElement>('.site-header');
  onHeaderScroll();
}

// -------------------------------------------------------------- back-to-top
let toTop: HTMLElement | null = null;

function onToTopScroll() {
  toTop?.classList.toggle('is-visible', window.scrollY > 560);
}

function initToTop() {
  toTop = q<HTMLElement>('#back-to-top');
  onToTopScroll();
}

// -------------------------------------------------------- barra de progreso
// Hilo dorado superior (#scroll-progress) que avanza con el scroll de la
// página. Se actualiza por transform (scaleX) para no tocar layout.
let progressEl: HTMLElement | null = null;

function onProgressScroll() {
  if (!progressEl) return;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
  progressEl.style.transform = `scaleX(${p})`;
}

function initProgress() {
  progressEl = q<HTMLElement>('#scroll-progress');
  onProgressScroll();
}

// Un solo listener de scroll que actualiza header, botón y progreso (delegado
// en el documento; las referencias se refrescan en cada astro:page-load).
window.addEventListener(
  'scroll',
  () => {
    onHeaderScroll();
    onToTopScroll();
    onProgressScroll();
  },
  { passive: true },
);

document.addEventListener('click', (event) => {
  const btn = (event.target as Element).closest('#back-to-top');
  if (!btn) return;
  window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
});

// ------------------------------------------------------- menú móvil animado
// El estado se rastrea con la clase .is-open. El atributo `hidden` se usa para
// quitar el menú del flujo de teclado/lectores al cerrarlo.
function closeMobileMenu(instant = false) {
  const menu = q<HTMLElement>('#mobile-menu');
  const toggle = q<HTMLButtonElement>('#menu-toggle');
  if (!menu || !menu.classList.contains('is-open')) return;
  menu.classList.remove('is-open');
  toggle?.setAttribute('aria-expanded', 'false');
  if (reducedMotion || instant) {
    menu.hidden = true;
    menu.style.maxHeight = '';
    return;
  }
  menu.style.maxHeight = '0px';
  menu.addEventListener(
    'transitionend',
    () => {
      if (!menu.classList.contains('is-open')) menu.hidden = true;
    },
    { once: true },
  );
}

function openMobileMenu() {
  const menu = q<HTMLElement>('#mobile-menu');
  const toggle = q<HTMLButtonElement>('#menu-toggle');
  if (!menu || menu.classList.contains('is-open')) return;
  menu.hidden = false;
  menu.classList.add('is-open');
  toggle?.setAttribute('aria-expanded', 'true');
  if (reducedMotion) {
    menu.style.maxHeight = '';
    return;
  }
  requestAnimationFrame(() => {
    menu.style.maxHeight = `${menu.scrollHeight}px`;
  });
}

document.addEventListener('click', (event) => {
  if (q('#menu-toggle')?.contains(event.target as Node)) {
    const menu = q<HTMLElement>('#mobile-menu');
    if (menu) {
      if (menu.classList.contains('is-open')) closeMobileMenu();
      else openMobileMenu();
    }
    return;
  }
  // Al pulsar un enlace del menú se cierra al instante (sin animación ni espera
  // de transitionend), para que el menú nunca aparezca abierto en la
  // instantánea de la view transition ni quede sobrepuesto a la nueva página.
  if ((event.target as Element).closest('#mobile-menu a')) {
    closeMobileMenu(true);
  }
});

// --------------------------------------------------------------- acordeón FAQ
function setFaq(item: HTMLElement, open: boolean) {
  const toggle = item.querySelector<HTMLButtonElement>('.faq-toggle');
  if (!toggle) return;
  toggle.setAttribute('aria-expanded', String(open));
  item.classList.toggle('is-open', open);
}

document.addEventListener('click', (event) => {
  const toggle = (event.target as Element).closest<HTMLButtonElement>('.faq-toggle');
  if (!toggle) return;
  const item = toggle.closest<HTMLElement>('.faq-item');
  if (!item) return;
  const open = toggle.getAttribute('aria-expanded') === 'true';
  // Comportamiento de acordeón: una sola pregunta abierta a la vez
  if (!open) {
    for (const other of qa<HTMLElement>('.faq-item.is-open', item.parentElement ?? document)) {
      if (other !== item) setFaq(other, false);
    }
  }
  setFaq(item, !open);
});

// --------------------------------------------------------- spotlight cards
// Un halo dorado que sigue al cursor dentro de las tarjetas con [data-spotlight]
// (guiño al efecto "gooey": luz líquida que se desliza sobre la superficie).
if (finePointer && !reducedMotion) {
  document.addEventListener(
    'pointermove',
    (event) => {
      const card = (event.target as Element).closest<HTMLElement>('[data-spotlight]');
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
      card.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
    },
    { passive: true },
  );
}

// ------------------------------------------------------- botones magnéticos
// Los CTAs con [data-magnetic] se desplazan unos píxeles hacia el cursor
// (atracción sutil, guiño a las micro-interacciones tipo "amicro"). Solo con
// puntero fino y respetando prefers-reduced-motion.
if (finePointer && !reducedMotion) {
  document.addEventListener(
    'pointermove',
    (event) => {
      const btn = (event.target as Element).closest<HTMLElement>('[data-magnetic]');
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      // Desplazamiento acotado y suavizado para que el botón no se "escape"
      const tx = Math.max(-9, Math.min(9, dx * 0.2));
      const ty = Math.max(-6, Math.min(6, dy * 0.3));
      btn.style.transform = `translate(${tx}px, ${ty}px)`;
      btn.classList.add('is-magnetized');
    },
    { passive: true },
  );
  document.addEventListener('pointerout', (event) => {
    const btn = (event.target as Element).closest<HTMLElement>('[data-magnetic]');
    if (!btn) return;
    // Si el puntero pasó a un hijo (p. ej. el icono del botón), no se suelta
    const related = event.relatedTarget as Node | null;
    if (related && btn.contains(related)) return;
    btn.classList.remove('is-magnetized');
    btn.style.transform = '';
  });
}

// ------------------------------------------------- animación del puntero
// Configurable desde el panel (✨ Animación del puntero): activar/desactivar,
// elegir efecto (halo dorado, anillo o destellos) y tamaño del halo. La
// configuración viaja en data-attributes del <body> (se re-renderiza en cada
// página). Los elementos se recrean tras cada navegación porque el <body> se
// reemplaza en las view transitions.
type CursorEffect = 'halo' | 'ring' | 'sparkles';

let cursorConfig: { enabled: boolean; effect: CursorEffect } = { enabled: true, effect: 'halo' };
let cursorEl: HTMLElement | null = null;
let cursorX = window.innerWidth / 2;
let cursorY = window.innerHeight / 2;
let cursorTx = cursorX;
let cursorTy = cursorY;
let cursorRunning = false;
let sparklesActive = false;
let lastSparkTime = 0;

function getCursorConfig() {
  const body = document.body;
  return {
    enabled: body.dataset.cursorEnabled !== 'false',
    effect: (body.dataset.cursorEffect ?? 'halo') as CursorEffect,
  };
}

function removeCursorElements() {
  document.getElementById('cursor-glow')?.remove();
  document.getElementById('cursor-ring')?.remove();
}

function ensureCursorElement(effect: CursorEffect): HTMLElement | null {
  if (!finePointer || reducedMotion || !cursorConfig.enabled) {
    removeCursorElements();
    return null;
  }
  const id = effect === 'ring' ? 'cursor-ring' : 'cursor-glow';
  // Quitar el elemento del otro efecto (por si se cambió la configuración)
  for (const otherId of ['cursor-glow', 'cursor-ring']) {
    if (otherId !== id) document.getElementById(otherId)?.remove();
  }
  const existing = document.getElementById(id);
  if (existing && existing.isConnected) return existing;
  const el = document.createElement('div');
  el.id = id;
  document.body.appendChild(el);
  return el;
}

function initCursor() {
  cursorConfig = getCursorConfig();
  document.documentElement.classList.toggle('no-cursor-anim', !cursorConfig.enabled);

  if (cursorConfig.effect === 'sparkles') {
    removeCursorElements();
    cursorEl = null;
    cursorRunning = false;
    sparklesActive = cursorConfig.enabled && finePointer && !reducedMotion;
    return;
  }
  sparklesActive = false;
  cursorEl = ensureCursorElement(cursorConfig.effect);
  if (!cursorEl || cursorRunning) return;
  cursorRunning = true;
  const ease = cursorConfig.effect === 'ring' ? 0.22 : 0.14;
  const loop = () => {
    if (!cursorEl) return;
    cursorX += (cursorTx - cursorX) * ease;
    cursorY += (cursorTy - cursorY) * ease;
    cursorEl.style.transform = `translate3d(${cursorX - cursorEl.offsetWidth / 2}px, ${
      cursorY - cursorEl.offsetHeight / 2
    }px, 0)`;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

if (finePointer && !reducedMotion) {
  document.addEventListener(
    'pointermove',
    (event) => {
      cursorTx = event.clientX;
      cursorTy = event.clientY;
      if (sparklesActive) {
        spawnSpark(event.clientX, event.clientY);
        return;
      }
      // Anillo: crece al pasar sobre enlaces y controles
      const target = event.target as Element | null;
      const overInteractive = !!target?.closest('a, button, [role="button"], input, select, textarea, summary');
      cursorEl?.classList.toggle('is-big', overInteractive);
      cursorEl?.classList.add('is-active');
    },
    { passive: true },
  );
}

function spawnSpark(x: number, y: number) {
  const now = performance.now();
  if (now - lastSparkTime < 45) return;
  lastSparkTime = now;
  const spark = document.createElement('span');
  spark.className = 'cursor-spark';
  const size = 3 + Math.random() * 4;
  spark.style.width = `${size}px`;
  spark.style.height = `${size}px`;
  spark.style.left = `${x}px`;
  spark.style.top = `${y}px`;
  document.body.appendChild(spark);
  const dx = (Math.random() - 0.5) * 70;
  const dy = -Math.random() * 55 - 8;
  const anim = spark.animate(
    [
      { opacity: 0.9, transform: 'translate(-50%, -50%) scale(1)' },
      {
        opacity: 0,
        transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.35)`,
      },
    ],
    { duration: 550 + Math.random() * 350, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
  );
  anim.onfinish = () => spark.remove();
  // Red de seguridad: si la animación no avanza (rAF congelado), el destello
  // no queda acumulado en el DOM.
  window.setTimeout(() => spark.remove(), 1600);
}

// --------------------------------------------------- desplegable personalizado
// Sustituye al <select> nativo (que algunos navegadores pintan de azul) por un
// menú con la identidad de la marca. El valor real viaja en un input oculto y
// la validación del formulario se hace en el submit.
function setSelectOpen(select: HTMLElement, open: boolean) {
  const toggle = select.querySelector<HTMLButtonElement>('[data-select-toggle]');
  const menu = select.querySelector<HTMLElement>('[data-select-menu]');
  const chevron = toggle?.querySelector<SVGElement>('svg');
  if (!toggle || !menu) return;
  toggle.setAttribute('aria-expanded', String(open));
  menu.classList.toggle('invisible', !open);
  menu.classList.toggle('opacity-0', !open);
  chevron?.classList.toggle('rotate-180', open);
}

function syncSelectMenu(select: HTMLElement) {
  const input = select.querySelector<HTMLInputElement>('[data-select-input]');
  const value = input?.value ?? '';
  for (const opt of qa<HTMLButtonElement>('[data-select-option]', select)) {
    const selected = opt.dataset.selectOption === value;
    opt.setAttribute('aria-selected', String(selected));
    opt.classList.toggle('bg-brand-500', selected);
    opt.classList.toggle('text-white', selected);
    opt.classList.toggle('text-ink-700', !selected);
    opt.classList.toggle('hover:bg-brand-100', !selected);
    opt.classList.toggle('hover:text-brand-800', !selected);
  }
}

document.addEventListener('click', (event) => {
  const target = event.target as Element;
  // Abrir/cerrar con el botón del desplegable
  const toggle = target.closest<HTMLButtonElement>('[data-select-toggle]');
  if (toggle) {
    const select = toggle.closest<HTMLElement>('[data-select]');
    if (!select) return;
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    for (const other of qa<HTMLElement>('[data-select]')) setSelectOpen(other, false);
    setSelectOpen(select, !isOpen);
    return;
  }
  // Elegir una opción
  const opt = target.closest<HTMLButtonElement>('[data-select-option]');
  if (opt) {
    const select = opt.closest<HTMLElement>('[data-select]');
    if (!select) return;
    const input = select.querySelector<HTMLInputElement>('[data-select-input]');
    const valueEl = select.querySelector<HTMLElement>('[data-select-value]');
    const value = opt.dataset.selectOption ?? '';
    if (input) input.value = value;
    if (valueEl) {
      valueEl.textContent = opt.textContent?.trim() ?? '';
      valueEl.classList.toggle('text-slate-400', value === '');
      valueEl.classList.toggle('text-ink-900', value !== '');
    }
    syncSelectMenu(select);
    setSelectOpen(select, false);
    return;
  }
  // Clic fuera: cerrar todos
  if (!target.closest('[data-select]')) {
    for (const select of qa<HTMLElement>('[data-select]')) setSelectOpen(select, false);
  }
});

// Navegación por teclado del desplegable personalizado (patrón ARIA listbox):
// Flechas abajo/arriba abren el menú y mueven el foco entre opciones,
// Intro/Espacio seleccionan, Home/End saltan al inicio/fin y Escape cierra.
document.addEventListener('keydown', (event) => {
  const target = event.target as Element;
  const opts = qa<HTMLButtonElement>('[data-select-option]');
  if (!opts.length) return;
  const select = target.closest?.('[data-select]') as HTMLElement | null;
  if (!select) return;

  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    setSelectOpen(select, true);
    const dir = event.key === 'ArrowDown' ? 1 : -1;
    const options = qa<HTMLButtonElement>('[data-select-option]', select);
    let next = dir === 1 ? 0 : options.length - 1;
    const cur = options.indexOf(document.activeElement as HTMLButtonElement);
    if (cur !== -1) next = (cur + dir + options.length) % options.length;
    options[next]?.focus();
  } else if (event.key === 'Home' || event.key === 'End') {
    const toggle = select.querySelector<HTMLButtonElement>('[data-select-toggle]');
    if (toggle?.getAttribute('aria-expanded') !== 'true') return;
    event.preventDefault();
    const options = qa<HTMLButtonElement>('[data-select-option]', select);
    (event.key === 'Home' ? options[0] : options[options.length - 1])?.focus();
  } else if (event.key === 'Escape') {
    setSelectOpen(select, false);
    select.querySelector<HTMLButtonElement>('[data-select-toggle]')?.focus();
  } else if ((event.key === 'Enter' || event.key === ' ') && target.hasAttribute('data-select-option')) {
    event.preventDefault();
    (target as HTMLButtonElement).click();
  }
});

// Validación del formulario: el servicio de interés es obligatorio
document.addEventListener('submit', (event) => {
  const form = event.target as HTMLFormElement;
  if (!form.hasAttribute('data-contact-form')) return;
  // Honeypot anti-spam: si un bot rellenó el campo invisible, se descarta
  // el envío en silencio (sin errores para no delatar al usuario real).
  const hp = form.querySelector<HTMLInputElement>('[data-hp]');
  if (hp && hp.value.trim()) {
    event.preventDefault();
    return;
  }
  const select = form.querySelector<HTMLElement>('[data-select]');
  const input = select?.querySelector<HTMLInputElement>('[data-select-input]');
  if (select && input && !input.value.trim()) {
    event.preventDefault();
    const toggle = select.querySelector<HTMLButtonElement>('[data-select-toggle]');
    toggle?.classList.add('border-brand-600', 'ring-2', 'ring-brand-600/20');
    toggle?.focus();
  }
});

// ------------------------------------------------------- servicios: lectura activa
// En la página de Servicios, el bloque que el usuario está leyendo (el más
// visible) se destaca con animaciones sutiles en su imagen y su botón CTA.
let readingObserver: IntersectionObserver | null = null;

function initServiceReading() {
  if (reducedMotion) return;
  const blocks = qa<HTMLElement>('[data-reading-observe]');
  if (!blocks.length) return;
  if (!readingObserver) {
    readingObserver = new IntersectionObserver(
      (entries) => {
        let best: IntersectionObserverEntry | null = null;
        for (const entry of entries) {
          if (entry.isIntersecting && (!best || entry.intersectionRatio > best.intersectionRatio)) {
            best = entry;
          }
        }
        for (const entry of entries) {
          entry.target.classList.toggle('is-reading', entry === best);
        }
      },
      { threshold: [0.35, 0.55, 0.75], rootMargin: '0px 0px -8% 0px' },
    );
  }
  for (const el of blocks) readingObserver.observe(el);
}

// ------------------------------------------------------- planes: selección
// En la tabla de planes, al hacer clic en una combinación se marca como
// seleccionada (además de abrir WhatsApp con el mensaje personalizado).
document.addEventListener('click', (event) => {
  const cell = (event.target as Element).closest<HTMLElement>('[data-plan-cell]');
  if (!cell) return;
  for (const other of qa<HTMLElement>('[data-plan-cell].is-selected')) {
    if (other !== cell) other.classList.remove('is-selected');
  }
  cell.classList.add('is-selected');
});

// ------------------------------------------------------- arranque global
function init() {
  // Las view transitions de Astro reemplazan los atributos de <html> en cada
  // navegación, así que hay que re-marcar la clase .js en cada página: sin ella
  // las reglas `html.js …` (revelado y colapso del menú) dejan de aplicar.
  document.documentElement.classList.add('js');
  initHeader();
  initToTop();
  initProgress();
  initReveal();
  initCounters();
  initCursor();
  initServiceReading();
  // El menú móvil siempre arranca cerrado (el estado no sobrevive a la
  // navegación; el DOM nuevo se sirve sin la clase is-open).
  const menu = q<HTMLElement>('#mobile-menu');
  if (menu) {
    menu.style.maxHeight = '0px';
  }
}

document.addEventListener('astro:page-load', init as EventListener);
