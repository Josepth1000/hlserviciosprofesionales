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

// Cada pregunta tiene su ancla (#faq-<slug>): al abrir el enlace se despliega
// esa respuesta, se lleva el foco a la pregunta y se deja a la vista bajo el
// header fijo (el margen lo pone `.faq-item` en el CSS).
function openFaq(id: string, focus = true) {
  const item = document.getElementById(id);
  if (!item || !item.classList.contains('faq-item')) return;

  for (const other of qa<HTMLElement>('.faq-item.is-open', item.parentElement ?? document)) {
    if (other !== item) setFaq(other, false);
  }
  setFaq(item, true);
  item.scrollIntoView({ block: 'start', behavior: reducedMotion ? 'auto' : 'smooth' });
  if (focus) item.querySelector<HTMLElement>('.faq-toggle')?.focus({ preventScroll: true });
}

function openFaqFromHash() {
  const hash = decodeURIComponent(window.location.hash.replace(/^#/, ''));
  if (hash) openFaq(hash);
}

window.addEventListener('hashchange', openFaqFromHash);

// Copiar el enlace de una pregunta: es lo que se pega en redes o en un chat.
// El sitio se sirve por https, así que el portapapeles moderno basta; si el
// navegador lo niega, se avisa y queda la URL en la barra de direcciones.
async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

const copyTimers = new WeakMap<HTMLElement, number>();
let toastTimer: number | undefined;

document.addEventListener('click', async (event) => {
  const button = (event.target as Element).closest<HTMLElement>('[data-faq-copy]');
  const anchor = button?.dataset.faqCopy;
  if (!button || !anchor) return;

  // Abre la pregunta y deja la URL a la vista, pero sin robar el foco al botón
  // que acaba de pulsarse.
  openFaq(anchor, false);
  window.history.replaceState(null, '', `#${anchor}`);
  const copied = await copyText(new URL(`#${anchor}`, window.location.href).href);

  const status = document.getElementById('faq-copy-status');
  if (status) {
    status.textContent = copied ? 'Enlace copiado' : 'No se pudo copiar el enlace';
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      status.textContent = '';
    }, 2400);
  }

  button.classList.toggle('is-copied', copied);
  button.setAttribute(
    'aria-label',
    copied ? 'Enlace copiado' : 'No se pudo copiar el enlace de la pregunta',
  );

  const pending = copyTimers.get(button);
  if (pending) window.clearTimeout(pending);
  copyTimers.set(
    button,
    window.setTimeout(() => {
      button.classList.remove('is-copied');
      const original = button.getAttribute('data-faq-label');
      if (original) button.setAttribute('aria-label', original);
    }, 2200),
  );
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
// elegir efecto (halo dorado o anillo) y tamaño del halo. La
// configuración viaja en data-attributes del <body> (se re-renderiza en cada
// página). Los elementos se recrean tras cada navegación porque el <body> se
// reemplaza en las view transitions.
type CursorEffect = 'halo' | 'ring';

let cursorConfig: { enabled: boolean; effect: CursorEffect } = { enabled: true, effect: 'halo' };
let cursorEl: HTMLElement | null = null;
let cursorX = window.innerWidth / 2;
let cursorY = window.innerHeight / 2;
let cursorTx = cursorX;
let cursorTy = cursorY;
let cursorRunning = false;

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
      // Anillo: crece al pasar sobre enlaces y controles
      const target = event.target as Element | null;
      const overInteractive = !!target?.closest('a, button, [role="button"], input, select, textarea, summary');
      cursorEl?.classList.toggle('is-big', overInteractive);
      cursorEl?.classList.add('is-active');
    },
    { passive: true },
  );
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

// ------------------------------------------------------------- formulario
// Envío sin recarga: el formulario va a /api/contacto (función de Vercel, que
// entrega el mensaje por correo) y el resultado se muestra en el propio lugar.
// Solo cuando el servidor confirma el envío se emite `hl:form-enviado`, que es
// lo que cuenta la analítica: así el evento significa «mensaje entregado» y no
// «alguien pulsó enviar».
function mostrarEstado(form: HTMLFormElement, texto: string, tono: 'info' | 'ok' | 'error') {
  const status = form.querySelector<HTMLElement>('[data-form-status]');
  if (!status) return;
  status.textContent = texto;
  status.classList.remove('hidden', 'text-slate-600', 'text-brand-700', 'text-red-600');
  status.classList.add(tono === 'ok' ? 'text-brand-700' : tono === 'error' ? 'text-red-600' : 'text-slate-600');
}

function resetSelect(form: HTMLFormElement) {
  const select = form.querySelector<HTMLElement>('[data-select]');
  if (!select) return;
  // Los <input type="hidden"> no cuentan como campos «reseteables» para
  // `form.reset()`, así que se vacían a mano o el servicio quedaría pegado.
  const input = select.querySelector<HTMLInputElement>('[data-select-input]');
  if (input) input.value = '';
  const valueEl = select.querySelector<HTMLElement>('[data-select-value]');
  const placeholder = select.querySelector('[data-select-option=""]')?.textContent?.trim() ?? '';
  if (valueEl) {
    valueEl.textContent = placeholder;
    valueEl.classList.add('text-slate-400');
    valueEl.classList.remove('text-ink-900');
  }
  syncSelectMenu(select);
}

async function enviarFormulario(form: HTMLFormElement) {
  const action = form.getAttribute('action') || '/api/contacto';
  const boton = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const datos = new FormData(form);
  const cuerpo = {
    nombre: String(datos.get('nombre') ?? ''),
    telefono: String(datos.get('telefono') ?? ''),
    email: String(datos.get('email') ?? ''),
    servicio: String(datos.get('servicio') ?? ''),
    mensaje: String(datos.get('mensaje') ?? ''),
    _empresa: String(datos.get('_empresa') ?? ''),
  };
  // Texto visible del desplegable («Seguridad Social»), no su valor técnico
  // («seguridad-social»): es lo que se lee en el panel de analítica. Se toma
  // ahora, antes de que el reseteo devuelva el marcador al desplegable.
  const etiquetaServicio =
    form.querySelector('[data-select-value]')?.textContent?.trim() || cuerpo.servicio;

  mostrarEstado(form, form.dataset.msgEnviando ?? 'Enviando…', 'info');
  if (boton) boton.disabled = true;

  try {
    const respuesta = await fetch(action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(cuerpo),
    });
    const resultado = (await respuesta.json().catch(() => ({}))) as { ok?: boolean };
    if (!respuesta.ok || !resultado.ok) throw new Error('envio');

    form.reset();
    resetSelect(form); // el desplegable propio devuelve su marcador
    mostrarEstado(form, form.dataset.msgExito ?? 'Mensaje enviado.', 'ok');
    form.dispatchEvent(new CustomEvent('hl:form-enviado', { bubbles: true, detail: { servicio: etiquetaServicio } }));
  } catch {
    mostrarEstado(form, form.dataset.msgError ?? 'No se pudo enviar el mensaje.', 'error');
  } finally {
    if (boton) boton.disabled = false;
  }
}

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
  // El servicio de interés es obligatorio: no hay <select> nativo que lo exija.
  const select = form.querySelector<HTMLElement>('[data-select]');
  const input = select?.querySelector<HTMLInputElement>('[data-select-input]');
  if (select && input && !input.value.trim()) {
    event.preventDefault();
    const toggle = select.querySelector<HTMLButtonElement>('[data-select-toggle]');
    toggle?.classList.add('border-brand-600', 'ring-2', 'ring-brand-600/20');
    toggle?.focus();
    return;
  }
  event.preventDefault();
  void enviarFormulario(form);
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
  openFaqFromHash();
  // El menú móvil siempre arranca cerrado (el estado no sobrevive a la
  // navegación; el DOM nuevo se sirve sin la clase is-open).
  const menu = q<HTMLElement>('#mobile-menu');
  if (menu) {
    menu.style.maxHeight = '0px';
  }
}

document.addEventListener('astro:page-load', init as EventListener);
