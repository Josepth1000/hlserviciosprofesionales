import { defineMiddleware } from 'astro:middleware';
import { getCollection, getEntry } from 'astro:content';
import {
  SESSION_COOKIE,
  INACTIVITY_MS,
  ACTIVITY_REFRESH_MS,
  isConfigured,
  validateSession,
  createRefreshedToken,
  SESSION_COOKIE_OPTIONS,
} from './lib/auth';

const PROTECTED_PREFIXES = ['/keystatic', '/api/keystatic'];

// Personalización del panel (/keystatic) inyectada por el middleware, porque el
// panel es una aplicación React de Keystatic y no se puede tocar su código.
// Incluye:
//  1. Tema de tarjetas elegante (estilos sobre las clases kui-*).
//  2. Sección "Cerrar Sesión" fija abajo a la izquierda.
//  3. Interfaz en español: traduce los textos que Keystatic deja en inglés
//     (Choose file, Remove, Edit Item, Regenerate, menús y diálogos).
//  4. Hover dorado en filas de listas y en los campos de formulario (también
//     cuando están enfocados / en edición).
//  5. Botones de acceso rápido (Editar / Eliminar) en cada fila de las listas
//     de colecciones (Servicios, Testimonios, Preguntas frecuentes, Noticias).
//     "Eliminar" abre una ventana modal de confirmación propia ("¿Seguro? Esta
//     acción no se puede deshacer.") y borra el registro por la API local,
//     sin pasar por el formulario de edición.
//  6. Miniaturas de imagen en la lista de Servicios (celda de texto → imagen),
//     usando la imagen efectiva definida en "Configuración del sitio".
//  7. Al guardar (Guardar / Crear) se muestra un popup "Elemento guardado
//     correctamente" y después se navega a la lista de todos los elementos.
const ICON_EDIT =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"/></svg>';
const ICON_TRASH =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>';
const ICON_CHECK =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4.5 12.75 6 6 9-13.5"/></svg>';

// Directorios y extensiones de cada colección (para construir la ruta del
// archivo al eliminar por la API local). Solo las colecciones con lista.
const COLLECTIONS: Record<string, { dir: string; ext: string }> = {
  services: { dir: 'src/content/services', ext: '.yaml' },
  testimonials: { dir: 'src/content/testimonials', ext: '.yaml' },
  faqs: { dir: 'src/content/faqs', ext: '.yaml' },
  blog: { dir: 'src/content/blog', ext: '.md' },
};

const PANEL_HTML = `<style id="hl-panel-theme">
/* ===== Tema del panel: tarjetas elegantes ===== */
.kui-1oa3qi3{padding:0 8px 16px}
.kui-1na2fkx{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#d8b453 !important;margin:20px 6px 10px !important;font-weight:600}
.kui-kdr5de{position:relative;border-radius:14px;background:linear-gradient(180deg,#202027,#17171c);border:1px solid rgba(255,255,255,.08);box-shadow:0 6px 18px -8px rgba(0,0,0,.55);margin:7px 0;overflow:hidden;transition:border-color .22s ease,transform .22s ease,box-shadow .22s ease}
.kui-kdr5de:hover{border-color:rgba(201,162,39,.5);transform:translateY(-2px);box-shadow:0 10px 26px -10px rgba(0,0,0,.65)}
.kui-s5lau6{padding:14px 12px 14px 14px !important}
.kui-1o33hyo{font-size:15px;font-weight:600;color:#f4f4f5;transition:color .2s ease}
.kui-kdr5de:hover .kui-1o33hyo{color:#e4cb7c}
.kui-1e4eh2p{color:#8e8e97 !important;font-size:12px;margin-top:3px}
.kui-h3uy8{border-radius:9px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);color:#e4cb7c;transition:background .2s ease,border-color .2s ease,transform .2s ease}
.kui-kdr5de:hover .kui-h3uy8{background:rgba(201,162,39,.16);border-color:rgba(201,162,39,.55);transform:scale(1.06)}
@media (max-width:640px){.kui-1oa3qi3{padding:0 4px 12px}.kui-kdr5de{margin:6px 0}}
/* ===== Hover dorado en filas de listas de colecciones ===== */
[role="row"][data-key]{transition:background .18s ease}
[role="row"][data-key]:hover{background:rgba(201,162,39,.09) !important;box-shadow:inset 2.5px 0 0 #c9a227}
[role="row"][data-key]:hover [role="rowheader"]{color:#f4f4f5}
[role="row"][data-key]:hover [role="rowheader"] span{color:#e4cb7c}
/* ===== Botones de acceso rápido por fila (Editar / Eliminar) ===== */
.hl-row-actions{position:absolute;right:8px;top:50%;transform:translateY(-50%);display:flex;gap:4px;opacity:0;z-index:10;pointer-events:none;transition:opacity .15s ease}
[role="row"][data-key]:hover .hl-row-actions,
.hl-row-actions:focus-within,
[role="row"][data-key]:focus-within .hl-row-actions{opacity:1;pointer-events:auto}
.hl-row-actions button{width:25px;height:25px;display:inline-flex;align-items:center;justify-content:center;border-radius:8px;background:#202027;border:1px solid rgba(255,255,255,.16);color:#e4cb7c;cursor:pointer;box-shadow:0 3px 10px -4px rgba(0,0,0,.65);transition:background .15s ease,border-color .15s ease,transform .15s ease,color .15s ease;padding:0}
.hl-row-actions button:hover{background:#2a2a31;border-color:#c9a227;transform:scale(1.1)}
.hl-row-actions button:focus-visible{outline:2px solid #c9a227;outline-offset:1px}
.hl-row-actions button[data-act="delete"]:hover{border-color:#e5484d;color:#ff8086}
/* ===== Hover dorado en campos de formulario (hover + foco/edición) =====
 * Keystatic deja los campos sin borde visible: se les da un borde sutil base
 * y se resaltan en dorado al pasar el mouse y al estar enfocados (edición). */
/* Campos (inputs, textarea, select, editor): borde visible en AMBOS temas.
 * Se usan las variables del tema de Keystatic (--kui-color-scale-slate6 para
 * el borde y slate2 para el fondo): en modo claro el campo tiene borde gris
 * oscuro sobre fondo claro y en modo oscuro borde gris claro sobre fondo
 * oscuro. Antes el borde y el fondo eran blancos translúcidos, invisibles en
 * el modo claro (los campos se veían tenues). */
main input:not([type="file"]),main textarea,main select,main [contenteditable="true"]{
  border:1px solid var(--kui-color-scale-slate6) !important;
  border-radius:8px !important;
  background:var(--kui-color-scale-slate2) !important;
  transition:border-color .18s ease,box-shadow .18s ease,background .18s ease !important;
}
main input:not([type="file"]):hover,main textarea:hover,main select:hover,main [contenteditable="true"]:hover{
  border-color:rgba(201,162,39,.6) !important;
  background:rgba(201,162,39,.06) !important;
}
main input:not([type="file"]):focus,main textarea:focus,main select:focus,main [contenteditable="true"]:focus{
  border-color:#c9a227 !important;
  background:rgba(201,162,39,.07) !important;
  box-shadow:0 0 0 2px rgba(201,162,39,.22) !important;
}
main input:not([type="file"]):focus-visible,main textarea:focus-visible{outline:none !important}
main button.kui-h3uy8:hover{border-color:rgba(201,162,39,.6) !important;color:#e4cb7c !important}
/* ===== Anillos de foco: dorado institucional =====
 * Keystatic (React Aria) pinta el anillo de foco con :focus-visible::before
 * usando su token azul por defecto (#3b5bdb / #3b82f6). Se sobrescribe con el
 * dorado de la marca en cualquier elemento enfocado (inputs, steppers, botones). */
main :focus-visible::before,
main :focus-visible{outline-color:#c9a227 !important}
main :focus-visible::before{border-color:rgba(201,162,39,.65) !important}
main input:focus,main input:focus-visible,main textarea:focus,main select:focus{outline-color:#c9a227 !important}
/* El wrapper de campos (búsqueda y stepper de Orden) se pinta en azul
 * (borde + anillo 1px) al enfocar el campo: se cambia al dorado institucional. */
main [class*="kui"]:focus-within > .kui-1guffr5,
main [class*="kui"]:focus-within.kui-1guffr5{
  border-color:rgba(201,162,39,.6) !important;
  box-shadow:0 0 0 1px rgba(201,162,39,.45) !important;
}
/* Campos con anillo propio (búsqueda, Orden): el input NO dibuja su propio
 * borde ni fondo (el anillo .kui-1guffr5 con z-index -1 ya pinta el borde y
 * el fondo del campo). Así se evita el doble contorno entre la lupa/caja de
 * texto y entre la caja y el spinner. */
main [class*="kui"]:has(> .kui-1guffr5) > input{
  border-color:transparent !important;
  background:transparent !important;
}
main [role="menuitem"]:hover,main [class*="ActionButton"]:hover{border-color:rgba(201,162,39,.5) !important}
main [class*="ActionButton"]:focus-visible{border-color:#c9a227 !important;box-shadow:0 0 0 2px rgba(201,162,39,.25) !important}
/* Botones primarios (Agregar, Guardar): dorado institucional. Keystatic los
 * pinta en azul; el script marca en runtime los azules con .hl-primary. */
main a[class*="kui:Button"],main button[class*="kui:Button"]{transition:box-shadow .18s ease,background .18s ease !important}
.hl-primary{background:linear-gradient(180deg,#e4cb7c,#c9a227) !important;color:#17171a !important;border:1px solid #a9831f !important;box-shadow:0 2px 10px -4px rgba(201,162,39,.55) !important;text-shadow:none !important}
.hl-primary:hover{background:linear-gradient(180deg,#e4cb7c,#d8b453) !important;box-shadow:0 0 0 2px rgba(201,162,39,.35) !important}
/* ===== Botón Guardar/Crear: inactivo sin cambios + animación social-idle al activarse =====
 * La animación replica la de los botones de redes sociales del footer
 * (social-idle: pulso dorado + ring) para mantener la identidad visual.
 *  - Sin cambios: aspecto inactivo (atenuado, sin clic).
 *  - Con cambios: la misma animación de social-idle que los iconos del footer.
 * En items de colección Keystatic deshabilita el botón con !hasChanged;
 * el pulso sigue ese estado (activo = hay cambios). */
button[form="singleton-form"],button[form="item-edit-form"],button[form="item-create-form"]{transition:opacity .22s ease,box-shadow .22s ease,filter .22s ease !important;position:relative}
button[form="singleton-form"].hl-save-clean,button[form="item-create-form"].hl-save-clean{opacity:.4 !important;filter:saturate(.3) !important;cursor:default !important;box-shadow:none !important}
/* --- Idle pulse: replica exacta de social-idle (footer) --- */
button[form="singleton-form"].hl-save-dirty,button[form="item-edit-form"].hl-save-dirty,button[form="item-create-form"].hl-save-dirty{animation:hlSaveIdle 2.6s ease-in-out infinite !important}
@keyframes hlSaveIdle{
  0%,100%{box-shadow:0 2px 10px -4px rgba(201,162,39,.5)}
  50%{box-shadow:0 8px 22px -8px rgba(201,162,39,.55),0 0 0 3px rgba(201,162,39,.18)}
}
/* --- Ping ring: replica de social-ping (::after) --- */
button[form="singleton-form"].hl-save-dirty::after,button[form="item-edit-form"].hl-save-dirty::after,button[form="item-create-form"].hl-save-dirty::after{
  content:"";position:absolute;inset:0;border-radius:inherit;
  border:2px solid rgba(201,162,39,.85);
  opacity:0;pointer-events:none;
  animation:hlSavePing 1.5s ease-out infinite !important;
}
@keyframes hlSavePing{
  0%{transform:scale(1);opacity:.75}
  75%,100%{transform:scale(1.6);opacity:0}
}
@media (prefers-reduced-motion:reduce){
  button[form="singleton-form"].hl-save-dirty,button[form="item-edit-form"].hl-save-dirty,button[form="item-create-form"].hl-save-dirty,
  button[form="singleton-form"].hl-save-dirty::after,button[form="item-edit-form"].hl-save-dirty::after,button[form="item-create-form"].hl-save-dirty::after{animation:none !important}
}
/* Botón de búsqueda y ActionButtons: neutros en reposo; el dorado solo se
 * activa al pasar el mouse o al enfocar (así los demás elementos no parecen
 * activos todo el tiempo). Los colores usan las variables del tema para que
 * en modo claro (fondo blanco) el texto sea oscuro y el borde visible
 * (antes eran claros y el botón quedaba invisible/tenue). */
main [class*="ActionButton"]{border-color:var(--kui-color-scale-slate6) !important;color:var(--kui-color-scale-slate11) !important}
main [class*="ActionButton"]:hover{border-color:rgba(201,162,39,.65) !important;background:rgba(201,162,39,.10) !important}
/* Botón "Abrir navegación" (aparece en la barra superior cuando el panel
 * lateral está colapsado en escritorio): píldora oscura con icono dorado
 * para que se vea sobre el contenido claro en el modo claro. */
header button[aria-label="Abrir navegación"]{
  background:#1d1d22 !important;
  border:1px solid rgba(201,162,39,.5) !important;
  border-radius:9px !important;
  color:#e4cb7c !important;
  box-shadow:0 2px 10px -4px rgba(0,0,0,.55) !important;
  transition:background .18s ease,border-color .18s ease !important;
}
header button[aria-label="Abrir navegación"]:hover{background:#26262d !important;border-color:#c9a227 !important}
header button[aria-label="Abrir navegación"] svg{color:currentColor !important;stroke:currentColor !important}
/* ===== Migas de pan: ítem actual en dorado institucional =====
 * Keystatic/React Aria pinta el ítem actual con el acento por defecto
 * (subrayado verde). Se fuerza el dorado de la marca en color y subrayado. */
nav[aria-label="Migas de pan"] [aria-current]{
  color:#e4cb7c !important;
  text-decoration-color:#c9a227 !important;
}
nav[aria-label="Migas de pan"] [aria-current]::after{
  background-color:#c9a227 !important;
}
nav[aria-label="Migas de pan"] [aria-current]:focus-visible,
nav[aria-label="Migas de pan"] [aria-current]:focus{
  outline:2px solid #c9a227 !important;
  outline-offset:1px;
  box-shadow:none !important;
}
/* ===== Preview de imagen en el campo Imagen del editor ===== */
.hl-img-preview{position:relative;display:inline-flex;align-items:center;gap:8px;margin-left:10px}
.hl-img-preview-img{width:88px;height:56px;object-fit:cover;border-radius:8px;border:1px solid rgba(201,162,39,.5);box-shadow:0 3px 10px -4px rgba(0,0,0,.55);display:block;transition:opacity .18s ease,filter .18s ease}
.hl-img-preview.loading .hl-img-preview-img{opacity:.22;filter:blur(1px)}
.hl-img-preview.ready::after{content:"✓";position:absolute;top:-7px;right:-7px;width:20px;height:20px;border-radius:50%;background:#c9a227;color:#0d0d10;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.5);border:2px solid #101014}
.hl-img-spinner{position:absolute;inset:0;display:none;align-items:center;justify-content:center;gap:7px;flex-direction:column}
.hl-img-preview.loading .hl-img-spinner{display:flex}
.hl-img-spinner-ring{width:26px;height:26px;border-radius:50%;border:3px solid rgba(201,162,39,.25);border-top-color:#c9a227;animation:hlSpin .8s linear infinite}
.hl-img-spinner-txt{font-size:10.5px;color:#d8c47f;font-weight:600;letter-spacing:.2px}
@keyframes hlSpin{to{transform:rotate(360deg)}}
.hl-img-preview .hl-img-empty{font-size:11.5px;color:#8b8b95;font-style:italic}
/* Oculta vistas previas internas que Keystatic pinte (caja verde IMG / blob interno); el preview propio (hl-img-preview-img) queda visible */
main [role="group"] img[src][src*="blob"]:not(.hl-img-preview-img),main [role="group"] img[src$=".svg"]:not(.hl-img-preview-img){display:none !important}
/* ===== Miniaturas de imagen en la lista de Servicios ===== */
/* Anula containment de Keystatic (contain:size layout style) en celdas de imagen
   para que las miniaturas inyectadas por JS se rendericen correctamente. */
[role="rowheader"][data-key*="image"]{contain:none !important;overflow:visible !important;position:relative !important}
.hl-thumb-wrap{display:inline-flex !important;align-items:center !important;margin-right:6px !important;position:relative !important;z-index:2 !important;flex-shrink:0 !important}
.hl-thumb{width:40px !important;height:28px !important;object-fit:cover !important;border-radius:6px !important;border:1px solid rgba(201,162,39,.35) !important;display:block !important;box-shadow:0 2px 6px -2px rgba(0,0,0,.5) !important;background:#1a1a22 !important;position:relative !important;z-index:2 !important;flex-shrink:0 !important}
/* El texto de la URL se oculta via JS (enhanceTable) solo cuando el thumbnail se crea. */
/* NO usar CSS display:none aqui porque si enhanceTable falla, la celda quedaria vacia. */
/* ===== Modal de confirmación de borrado ===== */
#hl-confirm-overlay{position:fixed;inset:0;background:rgba(8,8,10,.66);backdrop-filter:blur(3px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;font-family:Inter,system-ui,sans-serif}
.hl-confirm{background:linear-gradient(180deg,#202027,#16161b);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:26px 28px 22px;max-width:370px;width:100%;box-shadow:0 24px 60px -18px rgba(0,0,0,.8);text-align:center;animation:hlPop .22s cubic-bezier(.2,.9,.3,1.3)}
@keyframes hlPop{from{transform:scale(.92);opacity:0}to{transform:scale(1);opacity:1}}
.hl-confirm-icon{width:46px;height:46px;margin:0 auto 14px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:rgba(229,72,77,.12);border:1px solid rgba(229,72,77,.35);color:#ff8086}
.hl-confirm h3{margin:0 0 10px;font-size:17px;color:#f4f4f5}
.hl-confirm .hl-confirm-q{margin:0 0 6px;font-size:14px;color:#e4e4e8;font-weight:600;line-height:1.45}
.hl-confirm .hl-confirm-sub{margin:0 0 22px;font-size:12.5px;color:#9a9aa3;line-height:1.5}
.hl-confirm-actions{display:flex;gap:10px}
.hl-confirm-actions button{flex:1;padding:10px 0;border-radius:10px;font-size:13.5px;font-weight:600;cursor:pointer;border:1px solid transparent;transition:background .15s ease,border-color .15s ease,box-shadow .15s ease,opacity .15s ease}
.hl-confirm-cancel{background:rgba(255,255,255,.06);color:#e4e4e8;border-color:rgba(255,255,255,.14) !important}
.hl-confirm-cancel:hover{background:rgba(255,255,255,.12)}
.hl-confirm-danger{background:linear-gradient(180deg,#f2555a,#d93a40);color:#fff}
.hl-confirm-danger:hover{box-shadow:0 0 0 2px rgba(229,72,77,.4)}
.hl-confirm-danger[disabled]{opacity:.6;cursor:default;box-shadow:none}
/* ===== Popup (toast) de guardado ===== */
#hl-toast{position:fixed;top:18px;left:50%;transform:translateX(-50%) translateY(-90px);z-index:100000;background:#1d1d22;border:1px solid rgba(201,162,39,.55);color:#f4f4f5;padding:12px 20px;border-radius:12px;font-size:14px;font-weight:600;display:flex;align-items:center;gap:10px;box-shadow:0 12px 34px -10px rgba(0,0,0,.7);opacity:0;transition:transform .3s cubic-bezier(.2,.9,.3,1.2),opacity .3s ease;pointer-events:none;font-family:Inter,system-ui,sans-serif}
#hl-toast.hl-show{transform:translateX(-50%) translateY(0);opacity:1}
#hl-toast svg{color:#c9a227;flex:none}
/* ===== Transparencia: ocultar TODOS los elementos de GitHub del panel =====
 * El cliente (usuario no técnico) no debe ver ramas, repositorios, ni su foto
 * de GitHub. Se usa una doble capa: CSS que oculta directamente por atributos/
 * contenido + JS (cleanupTransparency) que marca con data-hl-hide para cubrir
 * casos que CSS no puede resolver por solo selector. */
[data-hl-hide="true"]{display:none !important}
/* --- CSS directo: oculta elementos de GitHub por atributos (rápido, sin JS) --- */
/* Botón "git actions" (menú de rama/PR/repo en el header) */
button[aria-label="git actions"]{display:none !important}
/* Menú de usuario (avatar + nombre de GitHub) */
button[aria-label="User menu" i],button[aria-label="User Menu" i]{display:none !important}
/* Selector de rama / branch (combobox + labels + wrapper presentation) */
input[aria-label*="branch" i],input[aria-label*="rama" i],select[aria-label*="branch" i],select[aria-label*="rama" i],button[aria-label*="branch" i],button[aria-label*="rama" i]{display:none !important}
/* Oculta el wrapper React Aria (div[role=presentation]) que envuelve el combobox de rama.
 * Usar :has() sin > para cubrir cualquier profundidad de descendencia. */
div[role="presentation"]:has(input[aria-label*="rama" i]),div[role="presentation"]:has(input[aria-label*="branch" i]),div[role="presentation"]:has(button[aria-label*="rama" i]),div[role="presentation"]:has(button[aria-label*="branch" i]){display:none !important}

/* ===== Sección "Cerrar Sesión" (abajo a la izquierda) ===== */
#hl-logout-section{position:fixed;left:16px;bottom:18px;z-index:9999;font-family:Inter,system-ui,sans-serif;width:max-content;max-width:calc(100% - 32px)}
#hl-logout-card{display:flex;align-items:center;gap:12px;padding:12px 16px 12px 12px;border-radius:16px;background:linear-gradient(150deg,rgba(26,26,31,.96),rgba(14,14,18,.96));border:1px solid rgba(255,255,255,.1);box-shadow:0 14px 34px -12px rgba(0,0,0,.75);backdrop-filter:blur(6px)}
#hl-logout-avatar{flex:none;display:flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:13px;background:linear-gradient(150deg,#2a2a31,#1a1a20);border:1px solid rgba(201,162,39,.55);color:#e4cb7c;font-size:17px;font-weight:700;letter-spacing:.02em;box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 6px 16px -6px rgba(201,162,39,.45)}
#hl-logout-meta{min-width:0;line-height:1.25}
#hl-logout-user{display:block;font-size:14px;font-weight:700;color:#f4f4f5;letter-spacing:.01em}
#hl-logout-role{display:block;margin-top:1px;font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#a6a6ae}
#hl-logout{display:inline-flex;align-items:center;justify-content:center;flex:none;width:38px;height:38px;border-radius:11px;background:#1d1d22;color:#e4cb7c;border:1px solid rgba(255,255,255,.12);text-decoration:none;box-shadow:0 8px 22px -10px rgba(0,0,0,.6);transition:border-color .2s ease,background .2s ease,transform .2s ease;cursor:pointer}
#hl-logout:hover{background:#26262d;border-color:rgba(201,162,39,.6);transform:translateY(-1px)}
#hl-logout:focus-visible{outline:2px solid #c9a227;outline-offset:2px}
#hl-logout-avatar,#hl-logout{user-select:none;-webkit-user-select:none}
@media (max-width:640px){#hl-logout-section{left:10px;bottom:12px}#hl-logout-card{gap:10px;padding:10px 12px 10px 10px;border-radius:14px}#hl-logout-avatar{width:36px;height:36px;border-radius:11px;font-size:15px}}
@media (max-width:640px){#hl-logout-section{left:10px;bottom:12px}}
/* El botón de Cerrar Sesión solo debe verse cuando la navegación lateral está
 * realmente visible: drawer móvil abierto (data-visible="true") o sidebar de
 * escritorio expandido (handle sin colapsar). Con el drawer cerrado en móvil
 * (o el sidebar colapsado en escritorio) la sección quedaba flotando sobre el
 * contenido: en móvil oscurecía las últimas filas del editor ("Cómo me
 * afilio") y en escritorio colapsado tapaba el área de trabajo. */
#hl-logout-section{display:none}
body:has(#keystatic-side-panel[data-visible="true"]) #hl-logout-section,
body:has([data-split-view-resize-handle]:not([data-split-view-collapsed])) #hl-logout-section{display:block}
/* ======================================================================
 * Panel lateral (barra de navegación) — tema oscuro propio
 * .hl-sidebar lo marca el script en runtime y cubre los dos casos:
 *   - #keystatic-side-panel (drawer móvil/tablet, se abre desde el header)
 *   - SidebarPanel de escritorio (ScrollView > nav con enlaces /keystatic)
 * Fondo más oscuro que el contenido para dar contraste, micro-interacciones
 * doradas sutiles y animación escalonada elegante al abrir el drawer.
 * ====================================================================== */
.hl-sidebar{
  background:linear-gradient(180deg,#18181e 0%,#0f0f13 100%) !important;
  border-inline-end:1px solid rgba(201,162,39,.16) !important;
}
/* Cabecera (logo + botón de tema): separación y brillo dorado sutil */
.hl-sidebar > div:first-child{
  background:rgba(255,255,255,.02) !important;
  border-bottom:1px solid rgba(255,255,255,.06) !important;
  display:flex !important;align-items:center !important;flex-wrap:nowrap !important;
}
/* El botón Tema se mueve al sidebar via JS (moveThemeButton). */
/* La cabecera siempre va sobre fondo oscuro (el tema del panel es propio), así
 * que el texto y el icono del botón de tema deben ser CLAROS en cualquier tema
 * de Keystatic: en modo claro Keystatic los pinta oscuros (#2c2c2c) y quedan
 * invisibles sobre el panel. Se fuerza color claro + brillo sutil. */
.hl-sidebar > div:first-child span{
  color:#e8e8ea !important;
}
.hl-sidebar > div:first-child span.kui-8jc9vp{
  text-shadow:0 1px 8px rgba(0,0,0,.55);
}
.hl-sidebar > div:first-child button{
  color:#d8d8dc !important;
  border-color:rgba(255,255,255,.18) !important;
  background:rgba(255,255,255,.05) !important;
}
.hl-sidebar > div:first-child button svg{
  color:currentColor !important;
  stroke:currentColor !important;
}
/* Botón Tema dentro de la fila de la marca (logo + texto): se empuja a la
 * derecha del texto sin romper la fila, con tamaño compacto y hover dorado. */
.hl-sidebar button[aria-label="Tema"],.hl-sidebar button[aria-label="theme" i]{
  margin-left:auto !important;flex:none !important;
  width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;
  border-radius:8px !important;border:1px solid rgba(255,255,255,.14) !important;
}
.hl-sidebar button[aria-label="Tema"]:hover,.hl-sidebar button[aria-label="theme" i]:hover{
  background:rgba(201,162,39,.12) !important;
  border-color:rgba(201,162,39,.55) !important;
  color:#e4cb7c !important;
}
.hl-sidebar > div:first-child img{
  box-shadow:0 0 0 1px rgba(201,162,39,.45),0 4px 16px -6px rgba(201,162,39,.55) !important;
  filter:none !important;
  opacity:1 !important;
}
/* Etiquetas de grupo (Contenido / Sitio web): dorado en mayúsculas */
.hl-sidebar-nav h3{
  font-size:10.5px !important;
  font-weight:700 !important;
  letter-spacing:.16em !important;
  text-transform:uppercase !important;
  color:#c9a227 !important;
  opacity:.85;
  margin:18px 10px 8px !important;
}
/* Ítems de navegación: área de clic cómoda, hover dorado sutil */
.hl-sidebar-nav a{
  display:flex;
  align-items:center;
  border-radius:9px !important;
  padding:7px 11px !important;
  margin:1px 6px !important;
  color:#b9b9bc !important;
  transition:background-color .22s ease,color .22s ease,transform .22s ease,box-shadow .22s ease !important;
}
.hl-sidebar-nav a:hover{
  background:rgba(201,162,39,.10) !important;
  color:#e4cb7c !important;
  transform:translateX(3px);
}
.hl-sidebar-nav a:focus-visible{
  outline:2px solid #c9a227 !important;
  outline-offset:1px;
}
/* Ítem activo: fondo dorado degradado + barra lateral dorada */
.hl-sidebar-nav a[aria-current="page"]{
  background:linear-gradient(90deg,rgba(201,162,39,.20),rgba(201,162,39,.04)) !important;
  color:#e4cb7c !important;
  font-weight:600 !important;
  box-shadow:inset 2.5px 0 0 #c9a227 !important;
}
/* ===== Botón "Ocultar panel" (colapso del sidebar en escritorio) =====
 * El SplitView de Keystatic solo permite colapsar el panel arrastrando el
 * borde o pulsando Enter sobre el handle; se inyecta un botón en la cabecera
 * del sidebar que dispara ese mismo atajo de teclado (ver initCollapseButton
 * en el script). Solo se muestra en escritorio (>= 992px, el breakpoint de
 * Keystatic para el sidebar) — en móvil la navegación se cierra con el
 * propio drawer. */
#hl-collapse-sidebar{
  display:none;align-items:center;justify-content:center;margin-left:auto;
  width:30px;height:30px;padding:0;
  background:rgba(255,255,255,.05) !important;
  border:1px solid rgba(255,255,255,.14) !important;
  color:#d6d6db !important;border-radius:8px !important;
  cursor:pointer;flex:none;
  transition:background .18s ease,border-color .18s ease,color .18s ease !important;
}
#hl-collapse-sidebar:hover{background:rgba(201,162,39,.12) !important;border-color:rgba(201,162,39,.55) !important;color:#e4cb7c !important}
#hl-collapse-sidebar svg{flex:none}
@media (min-width:992px){#hl-collapse-sidebar{display:inline-flex}}
/* Scrollbar del panel: sutil y dorada */
.hl-sidebar-scroll{
  scrollbar-width:thin;
  scrollbar-color:rgba(201,162,39,.35) transparent;
  /* Deja sitio para la sección fija de Cuenta/Cerrar sesión: el último ítem de
   * navegación puede scrollear por encima y no queda pegado al botón. */
  padding-bottom:118px !important;
  box-sizing:border-box !important;
}
/* ---- Apertura del drawer: fundido escalonado elegante ----
 * El deslizamiento lateral ya lo anima Keystatic (data-visible); se añade un
 * fundido con leve ascenso para la cabecera/scroll y un escalonado sutil de
 * los grupos de navegación, respetando prefers-reduced-motion. */
#keystatic-side-panel[data-visible="true"] > div:first-child,
#keystatic-side-panel[data-visible="true"] .hl-sidebar-scroll{
  opacity:0;
  animation:hlSidebarIn .5s cubic-bezier(.22,1,.36,1) forwards;
}
#keystatic-side-panel[data-visible="true"] > div:first-child{animation-delay:.05s}
#keystatic-side-panel[data-visible="true"] .hl-sidebar-scroll{animation-delay:.1s}
@keyframes hlSidebarIn{
  from{opacity:0;transform:translateY(10px)}
  to{opacity:1;transform:none}
}
#keystatic-side-panel[data-visible="true"] .hl-sidebar-nav > ul > li{
  opacity:0;
  animation:hlNavIn .45s cubic-bezier(.22,1,.36,1) forwards;
}
#keystatic-side-panel[data-visible="true"] .hl-sidebar-nav > ul > li:nth-child(1){animation-delay:.06s}
#keystatic-side-panel[data-visible="true"] .hl-sidebar-nav > ul > li:nth-child(2){animation-delay:.11s}
#keystatic-side-panel[data-visible="true"] .hl-sidebar-nav > ul > li:nth-child(3){animation-delay:.16s}
#keystatic-side-panel[data-visible="true"] .hl-sidebar-nav > ul > li:nth-child(4){animation-delay:.21s}
#keystatic-side-panel[data-visible="true"] .hl-sidebar-nav > ul > li:nth-child(5){animation-delay:.26s}
#keystatic-side-panel[data-visible="true"] .hl-sidebar-nav > ul > li:nth-child(6){animation-delay:.31s}
#keystatic-side-panel[data-visible="true"] .hl-sidebar-nav > ul > li:nth-child(7){animation-delay:.36s}
#keystatic-side-panel[data-visible="true"] .hl-sidebar-nav > ul > li:nth-child(8){animation-delay:.41s}
@keyframes hlNavIn{
  from{opacity:0;transform:translateX(-10px)}
  to{opacity:1;transform:none}
}
@media (prefers-reduced-motion:reduce){
  #keystatic-side-panel[data-visible="true"] > div:first-child,
  #keystatic-side-panel[data-visible="true"] .hl-sidebar-scroll,
  #keystatic-side-panel[data-visible="true"] .hl-sidebar-nav > ul > li{
    animation:none !important;
    opacity:1 !important;
    transform:none !important;
  }
  .hl-sidebar-nav a{transition:none !important}
}
</style>
<div id="hl-logout-section">
  <div id="hl-logout-card">
    <div id="hl-logout-avatar" aria-hidden="true">A</div>
    <div id="hl-logout-meta">
      <span id="hl-logout-user">Conectado como Admin</span>
      <span id="hl-logout-role">Panel de administración</span>
    </div>
    <a id="hl-logout" href="/api/logout" title="Cerrar sesión" aria-label="Cerrar sesión">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"/></svg>
    </a>
  </div>
</div>
<script id="hl-panel-script">
(function(){
  if (window.__HL_PANEL__) return;
  window.__HL_PANEL__ = true;

  // Imágenes efectivas de los servicios (definidas en Configuración del sitio),
  // inyectadas por el servidor: {"Seguridad Social": "/images/...", ...}
  var IMAGES = __HL_IMAGES__ || {};
  // Directorios y extensiones de las colecciones (inyectadas por el servidor)
  var COLLECTIONS = __HL_COLLECTIONS__ || {};

  // Estado del editor de imagen (por slug de entrada):
  //  - hlCleared[slug] = true cuando el usuario pulsó "Eliminar" (borrado intencional)
  //  - hlOrigImage = valor 'image:' de la ficha en disco (para protegerla al guardar)
  //  - hlSlug = slug de la entrada que se está editando
  var hlCleared = {};
  var hlOrigImage = '';
  var hlSlug = '';
  var hlCapturedFor = '';
  (function(){
    var segs = location.pathname.split('/');
    if (segs[1] === 'keystatic' && segs[2] === 'collection' && segs[3] && segs[4] === 'item') hlSlug = segs[5] || '';
  })();

  var TR = {
    'Choose file': 'Escoger imagen',
    'Remove': 'Eliminar',
    'Edit Item': 'Editar elemento',
    'Edit entry': 'Editar registro',
    'Delete entry': 'Eliminar registro',
    'Reset changes': 'Descartar cambios',
    'Copy entry': 'Copiar registro',
    'Paste entry': 'Pegar registro',
    'Duplicate entry': 'Duplicar registro',
    'Yes, delete': 'Sí, eliminar',
    'Cancel': 'Cancelar',
    'Done': 'Listo',
    'Close': 'Cerrar',
    'Save': 'Guardar',
    'Regenerate': 'Regenerar slug',
    'New item': 'Nuevo elemento',
    'New entry': 'Nuevo registro',
    'Reset': 'Descartar',
    'Duplicate': 'Duplicar',
    'Duplicate entry': 'Duplicar registro',
    'Edit': 'Editar',
    'Delete': 'Eliminar',
    'Add': 'Agregar',
    'Move up': 'Subir',
    'Move down': 'Bajar',
    'Are you sure? This action cannot be undone.': '¿Seguro? Esta acción no se puede deshacer.'
  };
  // aria-labels / títulos de botones sin texto visible
  var AT = {
    'regenerate': 'Regenerar slug',
    'show search': 'Mostrar búsqueda',
    'Open app navigation': 'Abrir navegación',
    'Close navigation': 'Cerrar navegación',
    'theme': 'Tema',
    'Resize': 'Redimensionar panel'
  };

  function norm(s){
    s = (s || '').trim();
    if (s.slice(-1) === '…') s = s.slice(0, -1);
    if (s.slice(-3) === '...') s = s.slice(0, -3);
    return s;
  }

  function replaceInText(el, from, to){
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()){
      var tn = walker.currentNode;
      if (tn.nodeValue && tn.nodeValue.trim()) nodes.push(tn);
    }
    for (var i = 0; i < nodes.length; i++){
      var v = nodes[i].nodeValue || '';
      if (norm(v).indexOf(from) === 0){
        nodes[i].nodeValue = v.replace(from, to);
        return;
      }
    }
  }

  function translateNode(el){
    if (!el || el.nodeType !== 1) return;
    var tag = el.tagName;
    if (tag !== 'BUTTON' && tag !== 'A' && tag !== 'LABEL' && tag !== 'LI' &&
        el.getAttribute('role') !== 'menuitem' && el.getAttribute('role') !== 'columnheader' &&
        el.getAttribute('role') !== 'button' && el.getAttribute('role') !== 'heading' &&
        el.getAttribute('role') !== 'tooltip' && el.getAttribute('role') !== 'separator') return;
    // aria-label y title
    ['aria-label', 'title'].forEach(function(attr){
      var v = el.getAttribute(attr);
      if (v && AT[norm(v)] !== undefined) el.setAttribute(attr, AT[norm(v)]);
      else if (v && TR[norm(v)] !== undefined) el.setAttribute(attr, TR[norm(v)]);
    });
    // texto visible
    var t = norm(el.textContent);
    if (t && TR[t] !== undefined){
      var hasIcon = el.querySelector && (el.querySelector('svg') || el.querySelector('img'));
      var role = el.getAttribute('role');
      // En tooltips y elementos con icono se reemplaza solo el texto (nunca el
      // contenido completo), para no romper la estructura del componente. Los
      // tooltips de Keystatic se montan en un portal con role="tooltip" y por
      // eso el texto (p. ej. "Paste entry") quedaba en inglés al pasar el mouse.
      if (hasIcon || role === 'tooltip') replaceInText(el, t, TR[t]);
      else el.textContent = TR[t];
    }
  }

  function translateCounts(){
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()){
      var tn = walker.currentNode;
      if (tn.nodeValue && tn.nodeValue.indexOf('entries') !== -1) nodes.push(tn);
    }
    for (var i = 0; i < nodes.length; i++){
      nodes[i].nodeValue = nodes[i].nodeValue.replace(/entries?/gi, function(word){
        return word.length > 5 ? 'registros' : 'registro';
      });
    }
  }

  function scan(){
    translateCounts();
    var nodes = document.querySelectorAll('button, a, label, li, [role="menuitem"], [role="columnheader"], [role="button"], [role="heading"], [role="tooltip"], [role="separator"]');
    for (var i = 0; i < nodes.length; i++) translateNode(nodes[i]);
    var dlg = document.querySelector('[role="alertdialog"]');
    if (dlg){
      var ps = dlg.querySelectorAll('p, span, h1, h2, h3');
      for (var j = 0; j < ps.length; j++){
        var pt = norm(ps[j].textContent);
        if (pt && TR[pt] !== undefined) ps[j].textContent = TR[pt];
      }
    }
  }

  // ---------- Popup (toast) ----------
  function hlToast(msg){
    var t = document.getElementById('hl-toast');
    if (!t){
      t = document.createElement('div');
      t.id = 'hl-toast';
      t.innerHTML = '${ICON_CHECK}<span></span>';
      document.body.appendChild(t);
    }
    t.querySelector('span').textContent = msg;
    requestAnimationFrame(function(){ t.classList.add('hl-show'); });
    clearTimeout(t.__hlTimer);
    t.__hlTimer = setTimeout(function(){ t.classList.remove('hl-show'); }, 2300);
  }

  // ---------- Modal de confirmación de borrado ----------
  function hlConfirmDelete(path, slug){
    if (document.getElementById('hl-confirm-overlay')) return;
    var ov = document.createElement('div');
    ov.id = 'hl-confirm-overlay';
    ov.innerHTML =
      '<div class="hl-confirm" role="alertdialog" aria-modal="true" aria-labelledby="hl-confirm-title" aria-describedby="hl-confirm-desc">' +
        '<div class="hl-confirm-icon">${ICON_TRASH}</div>' +
        '<h3 id="hl-confirm-title">Eliminar registro</h3>' +
        '<p class="hl-confirm-q">¿Seguro? Esta acción no se puede deshacer.</p>' +
        '<p class="hl-confirm-sub">Se eliminará el registro “' + slug + '” de la lista y no podrás recuperarlo.</p>' +
        '<div class="hl-confirm-actions">' +
          '<button type="button" class="hl-confirm-cancel">Cancelar</button>' +
          '<button type="button" class="hl-confirm-danger">Sí, eliminar</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(ov);
    var done = false;
    function close(){
      if (!document.body.contains(ov)) return;
      document.body.removeChild(ov);
      document.removeEventListener('keydown', esc);
    }
    function esc(e){ if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', esc);
    ov.querySelector('.hl-confirm-cancel').addEventListener('click', close);
    ov.addEventListener('click', function(e){ if (e.target === ov) close(); });
    ov.querySelector('.hl-confirm-danger').addEventListener('click', function(){
      if (done) return;
      done = true;
      var btn = this;
      btn.disabled = true;
      btn.textContent = 'Eliminando…';
      fetch('/api/keystatic/update', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'no-cors': '1' },
        body: JSON.stringify({ additions: [], deletions: [{ path: path }] })
      }).then(function(res){
        if (res.ok) location.reload();
        else {
          btn.disabled = false;
          btn.textContent = 'Sí, eliminar';
          close();
          hlToast('No se pudo eliminar. Inténtalo de nuevo.');
        }
      }).catch(function(){
        btn.disabled = false;
        btn.textContent = 'Sí, eliminar';
        close();
        hlToast('No se pudo eliminar. Inténtalo de nuevo.');
      });
    });
  }

  // ---------- Mejoras a la tabla ----------
  // La tabla es virtualizada y React recicla los elementos de las filas, así
  // que aquí SOLO se añade markup (sin listeners) y los clics se resuelven en
  // el momento con un listener delegado que busca la fila viva en cada clic.
  function enhanceTable(){
    var grid = document.querySelector('[role="grid"]');
    if (!grid) return;
    if (!grid.__hlScrolled){ grid.__hlScrolled = true; grid.addEventListener('scroll', enhanceTable, { passive: true }); }
    // Estrategia dual: buscar celdas de imagen directamente.
    // Local mode: la fila tiene role="row" + data-key="key:contables".
    // GitHub mode: la fila es div[role="presentation"] sin data-key;
    //             el data-key ("imagecontables") está solo en la celda.
    var imgCells = grid.querySelectorAll('[role="rowheader"][data-key*="image"]');
    for (var i = 0; i < imgCells.length; i++){
      var imgCell = imgCells[i];
      // Encontrar el contenedor de la fila: role="row" (local) o el padre más cercano
      var row = imgCell.closest('[role="row"]') || imgCell.parentElement;
      var rowKey = (row && row.getAttribute('data-key')) || imgCell.getAttribute('data-key') || '';

      // Miniatura: se añade como hermano del span de texto (sin tocarlo, para
      // no pelear con React) y se sincroniza la URL en cada pase.
      if (imgCell){
        var span = imgCell.querySelector('span[title]');
        var url = (imgCell.getAttribute('title') || '');
        if (!url && span) url = span.getAttribute('title') || span.textContent.trim();
        // Fallback: extraer de img[src] si la celda tiene una imagen nativa de Keystatic
        if (!url){
          var nativeImg = imgCell.querySelector('img[src]:not(.hl-thumb)');
          if (nativeImg && nativeImg.getAttribute('src')) url = nativeImg.getAttribute('src');
        }
        // Fallback: extraer de cualquier texto en la celda que parezca una ruta de imagen
        if (!url){
          var cellText = (imgCell.textContent || '').trim();
          if (cellText && cellText.charAt(0) === '/') url = cellText;
        }
        var titleCell = (row || imgCell.parentElement).querySelector('[role="rowheader"][data-key*="title"]');
        var title = titleCell ? (titleCell.textContent || '').trim() : '';
        if (IMAGES[title]) url = IMAGES[title];
        // Fallback: buscar por slug — extraer del data-key
        // Local: "key:contables" → "contables"
        // GitHub cell: "imagecontables" → "contables" (quitar prefijo "image")
        if (!url){
          var rawKey = rowKey || '';
          var slug = rawKey.replace(/^key:/, '');
          // GitHub mode: data-key empieza con "image" + slug (ej. "imagecontables")
          if (slug.indexOf('image') === 0 && slug.length > 5) slug = slug.substring(5);
          var lastSlash = slug.lastIndexOf('/');
          slug = lastSlash >= 0 ? slug.substring(lastSlash + 1) : slug;
          if (slug.length > 5 && slug.slice(-5) === '.yaml') slug = slug.slice(0, -5);
          else if (slug.length > 4 && slug.slice(-4) === '.yml') slug = slug.slice(0, -4);
          if (IMAGES[slug]) url = IMAGES[slug];
        }
        var thumb = imgCell.querySelector('.hl-thumb');
        if (url){
          if (thumb){
            if (thumb.getAttribute('src') !== url) thumb.setAttribute('src', url);
          } else {
            // Anular containment de Keystatic en la celda de imagen para que
            // la miniatura se renderice correctamente en ambos modos (local/GitHub).
            imgCell.style.cssText = 'contain:none !important;overflow:visible !important';
            var img = document.createElement('img');
            img.src = url;
            img.alt = '';
            // NO usar loading="lazy" — las imágenes insertadas dinámicamente a
            // veces no activan el IntersectionObserver del navegador y nunca cargan.
            img.className = 'hl-thumb';
            // Inline styles como respaldo ante specificity de Keystatic
            img.style.cssText = 'width:40px;height:28px;object-fit:cover;border-radius:6px;border:1px solid rgba(201,162,39,.35);display:block;box-shadow:0 2px 6px -2px rgba(0,0,0,.5);background:#1a1a22;flex-shrink:0';
            var wrap = document.createElement('span');
            wrap.className = 'hl-thumb-wrap';
            wrap.style.cssText = 'display:inline-flex !important;align-items:center;margin-right:6px;position:relative;z-index:2;flex-shrink:0';
            wrap.appendChild(img);
            imgCell.insertBefore(wrap, imgCell.firstChild);
          }
        }
      }
      // Ocultar TODO el contenido de texto de la celda excepto el thumbnail wrap
      var children = imgCell.children;
      for (var ci = 0; ci < children.length; ci++){
        if (children[ci].className && children[ci].className.indexOf('hl-thumb') === -1){
          children[ci].style.cssText = 'visibility:hidden !important;height:0 !important;overflow:hidden !important;margin:0 !important;padding:0 !important';
        }
      }

      // Botones de acción: solo una vez por fila (sin listeners propios).
      // Marcar el contenedor para que el listener delegado lo encuentre.
      if (row.__hlEnhanced) continue;
      row.__hlEnhanced = true;
      row.setAttribute('data-hl-row', '1');
      var acts = document.createElement('div');
      acts.className = 'hl-row-actions';
      acts.innerHTML = '<button data-act="edit" title="Editar registro" aria-label="Editar registro">${ICON_EDIT}</button><button data-act="delete" title="Eliminar registro" aria-label="Eliminar registro">${ICON_TRASH}</button>';
      row.appendChild(acts);
    }
  }

  // Marca en runtime los botones primarios que Keystatic pinta en azul para
  // darles el dorado institucional (la clase .hl-primary está en el CSS).
  function markPrimary(){
    var els = document.querySelectorAll('a[class*="kui:Button"], button[class*="kui:Button"]');
    for (var i = 0; i < els.length; i++){
      var el = els[i];
      if (el.classList.contains('hl-primary')) continue;
      var bg = getComputedStyle(el).backgroundColor || '';
      // 'rgb(r, g, b)' — es azul institucional si el canal azul domina.
      var nums = bg.replace(/[^0-9,]/g, '').split(',');
      if (nums.length >= 3){
        var r = Number(nums[0]);
        var g = Number(nums[1]);
        var b = Number(nums[2]);
        if (b > r && b > g) el.classList.add('hl-primary');
      }
    }
  }

  // ---------- Colapso del sidebar en escritorio ----------
  // Keystatic solo permite colapsar el panel lateral arrastrando el borde o
  // pulsando Enter sobre el handle (separator). Se inyecta un botón "Ocultar
  // panel" en la cabecera del sidebar que dispara ese mismo atajo de teclado
  // (tecla Enter sobre el handle de redimensionado), igual que haría un
  // usuario de teclado. Solo existe en escritorio (el handle del SplitView
  // solo se renderiza ahí); en móvil el drawer se cierra con su propio botón.
  function initCollapseButton(){
    if (window.__HL_COLLAPSE_INIT__) return;
    var handle = document.querySelector('[data-split-view-resize-handle]');
    var drawer = document.getElementById('keystatic-side-panel');
    if (!handle || !drawer) return;
    window.__HL_COLLAPSE_INIT__ = true;
    var header = drawer.firstElementChild;
    if (!header || document.getElementById('hl-collapse-sidebar')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'hl-collapse-sidebar';
    btn.title = 'Ocultar panel';
    btn.setAttribute('aria-label', 'Ocultar panel');
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 5h18v14H3z"/><path d="M9 3v18"/><path d="m14 9-3 3 3 3"/></svg>';
    btn.addEventListener('click', function(){
      var h = document.querySelector('[data-split-view-resize-handle]');
      if (!h) return;
      h.focus();
      h.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    });
    header.appendChild(btn);
  }

  // Mueve el botón "Tema" de Keystatic a la fila de la marca en el sidebar,
  // justo al lado del texto "HL Servicios Profesionales".
  // Estructura real renderizada por Keystatic:
  //   div.kui-9lfu2n > div.kui-tnny0k > [img logo, span[title="HL Servicios Profesionales"]]
  // Se inserta el botón dentro de esa fila (después del texto). Antes se
  // agregaba a drawer.firstElementChild y con la estructura actual terminaba
  // visualmente en la parte inferior del panel.
  function moveThemeButton(){
    var themeBtn = document.querySelector('button[aria-label="Tema"], button[aria-label="theme" i]');
    if (!themeBtn || themeBtn.__hlMoved) return;
    // Fila de la marca: el contenedor que envuelve logo + texto.
    var brandSpan = document.querySelector('#keystatic-side-panel span[title="HL Servicios Profesionales"], .hl-sidebar span[title="HL Servicios Profesionales"]');
    var row = null;
    if (brandSpan){
      row = brandSpan.parentElement;
      // La fila debe contener también el logo (img); si no, subir un nivel.
      if (row && !row.querySelector('img') && row.parentElement && row.parentElement.querySelector('img')){
        row = row.parentElement;
      }
    }
    // Respaldo: cabecera del drawer si la marca aún no está en el DOM.
    var drawer = document.getElementById('keystatic-side-panel');
    var header = drawer && drawer.firstElementChild;
    var target = row || header;
    if (!target) return;
    themeBtn.__hlMoved = true;
    target.appendChild(themeBtn);
  }

  // Marca el panel lateral de navegación con .hl-sidebar para aplicar el tema
  // oscuro propio (el CSS está arriba). Cubre los dos casos que Keystatic
  // renderiza del mismo componente:
  //   - #keystatic-side-panel: el drawer móvil/tablet (id estable).
  //   - SidebarPanel de escritorio: ScrollView (div[data-scroll-indicator])
  //     cuyo primer hijo es un <nav> con enlaces a /keystatic.
  function markSidebar(){
    var drawer = document.getElementById('keystatic-side-panel');
    if (drawer){
      drawer.classList.add('hl-sidebar','hl-sidebar-drawer');
      var dn = drawer.querySelector('nav');
      if (dn) dn.classList.add('hl-sidebar-nav');
      var dsc = drawer.querySelector('div[data-scroll-indicator]');
      if (dsc) dsc.classList.add('hl-sidebar-scroll');
    }
    var scrolls = document.querySelectorAll('div[data-scroll-indicator]');
    for (var i = 0; i < scrolls.length; i++){
      var sc = scrolls[i];
      if (sc.closest && sc.closest('#keystatic-side-panel')) continue;
      var nav = sc.firstElementChild;
      if (!nav || nav.tagName !== 'NAV') continue;
      if (!nav.querySelector('a[href^="/keystatic"]')) continue;
      var panel = sc.parentElement;
      if (panel) panel.classList.add('hl-sidebar');
      sc.classList.add('hl-sidebar-scroll');
      nav.classList.add('hl-sidebar-nav');
    }
  }

  // ---------- Transparencia para el cliente (no técnico) ----------
  // Oculta los detalles de GitHub/repositorio del panel:
  //   - En el dashboard (/keystatic, sin subruta): el saludo "Hello, <nombre>!"
  //     con el avatar de la cuenta de GitHub (UserInfo) y el bloque de la rama
  //     actual + "Nueva rama" (BranchSection).
  //   - El menú "git actions" (selector de rama / pull request / enlace al repo)
  //     del header global se oculta por CSS ([aria-label="git actions"]).
  //   - Selector de rama, "Nueva rama", "View on GitHub", usuario de GitHub.
  //   - NO oculta el botón "Log in with GitHub" (necesario para auth).
  // El contenido cambia con cada ruta de la SPA, así que se recomprueba en
  // cada pase de refresh().
  function cleanupTransparency(){
    // NOTA: NO limpiamos data-hl-hide aquí. Los atributos se acumulan
    // y eso elimina el flash visible que causaba el ciclo clear→re-apply.
    // React crea nodos nuevos para elementos nuevos, así que los viejos
    // marcados simplemente desaparecen del DOM.
    function hide(el){ if (el) el.setAttribute('data-hl-hide', 'true'); }
    function hideSection(el){
      // Sube hasta encontrar un <section> o un contenedor con role, o falla a 2 niveles.
      // IMPORTANTE: no subir más de 2 niveles porque en GitHub mode el dashboard
      // renderiza [UserInfo, BranchSection, DashboardCards] como hijos directos de un
      // Flex. Subir 3+ niveles ocultaría el Flex contenedor y con él DashboardCards.
      // Solo oculta si encontramos un contenedor de sección real; si no lo encontramos,
      // ocultar el contenedor a 2 niveles podría borrar DashboardCards junto con todo.
      var cur = el;
      var found = false;
      for (var i = 0; i < 3 && cur && cur !== document.body; i++){
        if (cur.tagName === 'SECTION' || cur.getAttribute('role') === 'region' || (cur.getAttribute('role') === 'group' && cur.parentElement && cur.parentElement.tagName === 'SECTION')){
          found = true;
          break;
        }
        cur = cur.parentElement;
      }
      if (found && cur && cur !== document.body) hide(cur);
      else if (!found) hide(el);
    }
    // --- Botón "git actions" (menú de rama/repo en el header) ---
    // Solo ocultar el botón, NO su contenedor padre (que puede contener
    // también el botón "Tema" de Keystatic que NO debe ocultarse).
    document.querySelectorAll('button[aria-label="git actions"]').forEach(function(b){
      hide(b);
    });
    // --- Selector de rama (combobox de branch/rama) ---
    document.querySelectorAll('input[aria-label*="branch" i],input[aria-label*="rama" i],select[aria-label*="branch" i],select[aria-label*="rama" i]').forEach(function(el){
      hide(el.closest('[role="group"]') || el.closest('[class*="kui"]') || el.parentElement || el);
    });
    // --- Wrapper React Aria (div[role=presentation]) del combobox de rama ---
    document.querySelectorAll('div[role="presentation"]').forEach(function(el){
      if (el.querySelector('input[aria-label*="rama" i],input[aria-label*="branch" i],button[aria-label*="rama" i],button[aria-label*="branch" i]'))
        hide(el);
    });
    // --- Menú de usuario de GitHub (avatar + nombre) ---
    document.querySelectorAll('[aria-label*="User menu" i]').forEach(function(el){
      hide(el.closest('[class*="kui"]') || el.closest('[role="group"]') || el.parentElement || el);
    });
    // --- "View on GitHub" / enlaces al repo (NO OAuth/login de GitHub) ---
    document.querySelectorAll('a[href*="github.com"]').forEach(function(a){
      var href = (a.getAttribute('href') || '').toLowerCase();
      if (href.indexOf('/login') !== -1 || href.indexOf('/oauth') !== -1 || href.indexOf('authorize') !== -1) return;
      hide(a.closest('[role="group"]') || a.closest('[class*="kui"]') || a.parentElement || a);
    });
    // --- Botón "New branch" / "Nueva rama" / "Create branch" ---
    document.querySelectorAll('button').forEach(function(b){
      var t = (b.textContent || '').trim();
      if (/^(New branch|Nueva rama|Create branch|Delete branch|New branch…)$/i.test(t))
        hide(b.closest('[class*="kui"]') || b.closest('section') || b.parentElement || b);
    });
    // --- Dashboard: "Hello, <usuario>!" ---
    // El texto está en 3 nodos separados: "Hello, ", username, "!"
    // Estructura en GitHub mode: text → p (Heading) → VStack → Flex (UserInfo) → PageBody Flex
    // Subimos 3 niveles desde el texto para ocultar SOLO el Flex de UserInfo
    // (avatar + saludo) sin tocar el contenedor de DashboardCards.
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()){
      var tn = walker.currentNode;
      if (tn.nodeValue && /^\s*(Hello|Hola),/i.test(tn.nodeValue)){
        // text → p (heading) → VStack → Flex (UserInfo) → PageBody Flex
        // Subir exactamente 3 niveles para ocultar SOLO el Flex de UserInfo
        // (avatar + saludo) sin tocar el contenedor de DashboardCards.
        // No usar getComputedStyle porque puede fallar en diferentes modos.
        var helloFlex = tn.parentElement && tn.parentElement.parentElement && tn.parentElement.parentElement.parentElement;
        if (helloFlex && helloFlex !== document.body) hide(helloFlex);
        break;
      }
    }
    // --- Dashboard: bloque de ramas (heading "Current branch"/"Rama actual") ---
    document.querySelectorAll('h1, h2, h3, h4, [role="heading"]').forEach(function(hd){
      var ht = (hd.textContent || '').trim();
      // Keystatic usa "Current branch" (EN) o "Rama actual" (ES) como título
      if (/^(Branches|Branch|Ramas|Rama|Current branch|Rama actual)$/i.test(ht)){
        hideSection(hd);
      }
    });
    // --- Badges de nombre de rama ("main", "master") junto al combobox ---
    document.querySelectorAll('span, div, button').forEach(function(el){
      var t = (el.textContent || '').trim();
      if (/^(main|master)$/i.test(t)){
        var p = el.parentElement;
        if (p && (p.querySelector('[role="combobox"]') || p.querySelector('button[aria-label*="branch" i]') || p.querySelector('button[aria-label*="rama" i]')))
          hide(el);
      }
    });
  }

  // ---------- Guardar: popup + volver a la lista ----------
  // Keystatic guarda con POST /api/keystatic/update y luego RECARGA la página,
  // por eso la señal se guarda en sessionStorage (sobrevive la recarga) y el
  // popup se muestra al cargar de nuevo, para después navegar a la lista.
  function armSaveButton(e){
    var b = e.target && e.target.closest ? e.target.closest('button') : null;
    if (!b) return;
    var t = (b.textContent || '').trim();
    if (!/^(Guardar|Save|Crear|Create)$/.test(t)) return;
    var segs = location.pathname.split('/');
    var to = '';
    if (segs[1] === 'keystatic' && segs[2] === 'collection' && segs.length >= 5){
      to = '/keystatic/collection/' + segs[3];
    }
    window.__HL_SAVE_TO__ = to;
    window.__HL_SAVE_MSG__ = /^Crear|^Create/.test(t) ? 'Elemento creado correctamente' : 'Elemento guardado correctamente';
    window.__HL_SAVE_ARMED__ = true;
  }
  document.addEventListener('click', armSaveButton, true);

  function hlDecodeB64(s){
    try {
      var t = String(s).replace(/-/g, '+').replace(/_/g, '/');
      while (t.length % 4) t += '=';
      return atob(t);
    } catch(e){ return ''; }
  }
  function hlEncodeB64(t){
    try {
      return btoa(t).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
    } catch(e){ return ''; }
  }
  // Protección contra pérdida de la imagen al guardar: si el YAML de una ficha
  // de servicios llega SIN la línea image: (Keystatic no logró cargar el asset),
  // y NO hubo "Eliminar" intencional, se re-inyecta la imagen original de disco.
  function protectImageOnSave(args){
    var opts = args[1] || {};
    if (!hlOrigImage || hlCleared[hlSlug]) return;
    var body = null;
    try { body = JSON.parse(opts.body || ''); } catch(e){ return; }
    if (!body || !Array.isArray(body.additions)) return;
    for (var i = 0; i < body.additions.length; i++){
      var add = body.additions[i];
      if (!add || typeof add.path !== 'string') continue;
      if (add.path.indexOf('src/content/services/') !== 0 || !/\\.(ya?ml|json)$/.test(add.path)) continue;
      var text = hlDecodeB64(add.contents);
      if (!text) continue;
      if (/(^|\\n)\\s*image\\s*:/.test(text)) continue; // ya tiene imagen (nueva o intacta)
      var imgLine = 'image: ' + hlOrigImage;
      var m = text.match(/^icon:.*$/m) || text.match(/^order:.*$/m) || text.match(/^title:.*$/m);
      var enc = '';
      if (m){
        var at = m.index + m[0].length;
        text = text.slice(0, at) + '\\n' + imgLine + text.slice(at);
        enc = hlEncodeB64(text);
      } else {
        enc = hlEncodeB64(imgLine + '\\n' + text);
      }
      if (enc) add.contents = enc;
    }
    if (body){
      args[1] = Object.assign({}, opts, { body: JSON.stringify(body) });
    }
  }

  var hlOrigFetch = window.fetch;
  window.fetch = function(){
    var args = arguments;
    var url = (typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url)) || '';
    var opts = args[1] || {};
    var isUpdate = (opts.method === 'POST' || opts.method === 'PUT') && url.indexOf('/api/keystatic/update') !== -1;
    function hlFinishSaving(){
      if (window.__HL_SAVE_BTN__) window.__HL_SAVE_BTN__.setSaving(false);
    }
    if (isUpdate){
      protectImageOnSave(args);
      opts = args[1] || opts;
      // Mantiene el botón Guardar inactivo mientras la API responde (la página
      // recarga tras un guardado correcto; si falla, se reactiva solo).
      if (window.__HL_SAVE_BTN__) window.__HL_SAVE_BTN__.setSaving(true);
    }
    if (window.__HL_SAVE_ARMED__ && isUpdate){
      var hasAdds = false;
      try {
        var body = JSON.parse(opts.body || '');
        hasAdds = body.additions && body.additions.length > 0;
      } catch(err){}
      if (hasAdds){
        window.__HL_SAVE_ARMED__ = false;
        var msg = window.__HL_SAVE_MSG__ || 'Elemento guardado correctamente';
        var to = window.__HL_SAVE_TO__ || '';
        return hlOrigFetch.apply(this, args).then(function(res){
          hlFinishSaving();
          if (res.ok){
            try {
              sessionStorage.setItem('__HL_SAVED__', '1');
              sessionStorage.setItem('__HL_SAVED_MSG__', msg);
              sessionStorage.setItem('__HL_SAVED_TO__', to);
            } catch(e2){}
          }
          return res;
        }, function(err){ hlFinishSaving(); throw err; });
      }
    }
    return hlOrigFetch.apply(this, args).then(function(res){ if (isUpdate) hlFinishSaving(); return res; }, function(err){ if (isUpdate) hlFinishSaving(); throw err; });
  };

  // Al cargar la página tras un guardado: popup y navegación a la lista.
  function checkSaved(){
    try {
      if (sessionStorage.getItem('__HL_SAVED__') !== '1') return;
      sessionStorage.removeItem('__HL_SAVED__');
      var msg = sessionStorage.getItem('__HL_SAVED_MSG__') || 'Elemento guardado correctamente';
      var to = sessionStorage.getItem('__HL_SAVED_TO__') || '';
      sessionStorage.removeItem('__HL_SAVED_MSG__');
      sessionStorage.removeItem('__HL_SAVED_TO__');
      setTimeout(function(){ hlToast(msg); }, 350);
      if (to) setTimeout(function(){ location.href = to; }, 1700);
    } catch(e3){}
  }

  // ---------- Botón Guardar/Crear: activo solo cuando hay contenido para guardar ----------
  // Keystatic deja el botón siempre activo (solo lo deshabilita durante el
  // guardado). Aquí se detecta si el formulario tiene cambios y se refleja en
  // el botón: inactivo (atenuado, sin clic) cuando no hay nada que guardar, y
  // con un pulso dorado sutil cuando sí hay contenido pendiente.
  //  - singleton-form: la insignia "Unsaved" que pinta el propio Keystatic es
  //    la señal autoritativa de cambios (cubre texto, imágenes, borradores
  //    restaurados...). El botón la sigue en tiempo real.
  //  - item-create-form: sin insignia (aún no hay estado guardado) → detección
  //    por eventos de edición (solo como pulso visual; el clic nunca se
  //    bloquea, de la validación se encarga el propio Keystatic).
  //  - item-edit-form: Keystatic ya deshabilita el botón con !hasChanged;
  //    aquí solo se añade el pulso siguiendo ese mismo estado.
  function unsavedBadge(){
    var els = document.querySelectorAll('span, div, p, strong');
    for (var i = 0; i < els.length; i++){
      var el = els[i];
      if (el.children.length === 0 && (el.textContent || '').trim() === 'Unsaved') return true;
    }
    return false;
  }
  function initSaveButton(){
    var form = document.querySelector('#singleton-form') || document.querySelector('#item-create-form') || document.querySelector('#item-edit-form');
    if (!form || form.__hlSaveInit) return;
    var btn = document.querySelector('button[form="' + form.id + '"]');
    if (!btn) return;
    form.__hlSaveInit = true;
    var isCreate = form.id === 'item-create-form';
    var dirty = isCreate ? false : unsavedBadge();
    var saving = false;

    function currentBtn(){
      var b = document.querySelector('button[form="' + form.id + '"]');
      if (b) btn = b;
      return btn;
    }
    function apply(){
      var b = currentBtn();
      if (!b) return;
      if (form.id === 'singleton-form'){
        var active = dirty && !saving;
        b.classList.toggle('hl-save-dirty', active);
        b.classList.toggle('hl-save-clean', !active);
        b.disabled = !active;
      } else {
        b.classList.toggle('hl-save-dirty', !b.disabled);
        b.classList.remove('hl-save-clean');
      }
    }
    function mark(){ if (!dirty){ dirty = true; apply(); } }
    function reset(){ dirty = false; saving = false; apply(); }
    function syncFromBadge(){
      if (isCreate) return;
      var hasBadge = unsavedBadge();
      if (hasBadge !== dirty){ dirty = hasBadge; apply(); }
    }

    if (isCreate){
      // Diálogo Crear: sin insignia → cualquier edición cuenta como cambio.
      form.addEventListener('input', mark, true);
      form.addEventListener('change', mark, true);
      form.addEventListener('compositionend', mark, true);
      form.addEventListener('click', function(e){
        var t = e.target;
        if (!t || !t.closest) return;
        if (t.closest('input:not([type="checkbox"]):not([type="radio"]):not([type="file"]), textarea, [contenteditable="true"]')) return;
        mark();
      }, true);
      // Imágenes/archivos en el diálogo: elegir o eliminar cambia sin input
      new MutationObserver(function(muts){
        for (var i = 0; i < muts.length; i++){
          var m = muts[i];
          if (m.type !== 'childList') continue;
          for (var j = 0; j < m.addedNodes.length; j++){
            var n = m.addedNodes[j];
            if (n.nodeType !== 1) continue;
            if ((n.matches && n.matches('img[src^="blob:"]')) || (n.querySelector && n.querySelector('img[src^="blob:"]'))){
              mark(); return;
            }
          }
          for (var k = 0; k < m.removedNodes.length; k++){
            var r = m.removedNodes[k];
            if (r.nodeType === 1 && r.matches && r.matches('button') && (r.textContent || '').trim() === 'Eliminar'){
              mark(); return;
            }
          }
        }
      }).observe(form, { childList: true, subtree: true });
      // Descartar cambios en el diálogo → estado original
      document.addEventListener('click', function(e){
        var b = e.target && e.target.closest ? e.target.closest('button, [role="button"], [role="menuitem"]') : null;
        if (!b) return;
        var t = (b.textContent || '').trim();
        if (t === 'Descartar cambios' || t === 'Reset changes' || t === 'Reset' || t === 'Descartar') setTimeout(reset, 80);
      }, true);
    } else {
      // Singleton: seguir en vivo la insignia "Unsaved" de Keystatic.
      new MutationObserver(function(){ syncFromBadge(); }).observe(document.body, { childList: true, subtree: true });
    }

// Red de seguridad: si un clic llega al botón del singleton estando limpio
  // (React podría re-habilitarlo en un re-render), se bloquea y se avisa.
  // En formularios de colección (crear/editar) nunca se bloquea: Keystatic
  // valida y gestiona el guardado por sí mismo.
  document.addEventListener('click', function(e){
    var b = e.target && e.target.closest ? e.target.closest('button[form="' + form.id + '"]') : null;
    if (!b || form.id !== 'singleton-form') return;
      if (!dirty || saving){
        e.preventDefault();
        e.stopPropagation();
        if (!dirty && !saving) hlToast('Aún no hay cambios para guardar');
        return;
      }
    }, true);

    window.__HL_SAVE_BTN__ = {
      setSaving: function(v){ saving = !!v; apply(); },
      sync: syncFromBadge,
      reset: reset,
      apply: apply
    };
    apply();
  }

  // ---------- Listener delegado de los botones de fila ----------
  // FASE DE CAPTURA: resuelve la fila viva en cada clic (React recicla los
  // elementos de las filas de la tabla virtualizada) y se ejecuta ANTES que
  // React, que detiene la propagación en fase de burbuja.
  document.addEventListener('click', function(e){
    var btn = e.target && e.target.closest ? e.target.closest('.hl-row-actions [data-act]') : null;
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    // Buscar la fila contenedora: role="row" (local) o data-hl-row (GitHub mode)
    var row = btn.closest('[role="row"][data-key]') || btn.closest('[role="row"]') || btn.closest('[data-hl-row]');
    if (!row) return;
    if (btn.getAttribute('data-act') === 'edit'){ row.click(); return; }
    // Eliminar: modal de confirmación directo (sin abrir el formulario)
    // Extraer slug de cualquier data-key disponible
    var rowKey = row.getAttribute('data-key') || '';
    // Si el contenedor no tiene data-key, buscar la celda de imagen más cercana
    if (!rowKey){
      var nearImg = row.querySelector('[role="rowheader"][data-key*="image"]');
      if (nearImg) rowKey = nearImg.getAttribute('data-key') || '';
    }
    var slug = rowKey.replace(/^key:/, '');
    // GitHub mode: data-key empieza con "image" + slug
    if (slug.indexOf('image') === 0 && slug.length > 5) slug = slug.substring(5);
    var lastSlash = slug.lastIndexOf('/');
    slug = lastSlash >= 0 ? slug.substring(lastSlash + 1) : slug;
    var segs = location.pathname.split('/');
    var col = (segs[1] === 'keystatic' && segs[2] === 'collection' && segs[3]) ? segs[3] : '';
    var meta = COLLECTIONS[col];
    if (!meta || !slug) return;
    hlConfirmDelete(meta.dir + '/' + slug + meta.ext, slug);
  }, true);

  // Helpers de path: funcionan tanto en local (/keystatic/collection/...)
  // como en GitHub mode (/keystatic/branch/main/collection/...).
  function isCollPage(){ return location.pathname.indexOf('/collection/') !== -1; }
  function getCollSegs(){
    var segs = location.pathname.split('/');
    var idx = segs.indexOf('collection');
    if (idx === -1) return null;
    // segs[idx] = 'collection', segs[idx+1] = nombre, segs[idx+2] = 'item'|etc
    return { collection: segs[idx+1] || '', item: segs[idx+2] === 'item' ? segs[idx+3] || '' : '' };
  }

  // Preview de imagen junto al botón "Escoger imagen", reflejando el estado EN VIVO
  // del campo de Keystatic:
  //  - Si el campo tiene valor (Keystatic muestra su botón "Eliminar"), prefiere el blob
  //    que Keystatic renderiza (imagen recién elegida o cargada); si aún no hay blob,
  //    cae a la imagen efectiva de la configuración del sitio (mapa IMAGES por título).
  //  - Muestra carga progresiva (spinner dorado) mientras la imagen nueva se decodifica
  //    y un check dorado cuando ya está lista para guardar.
  //  - Si el campo queda vacío:
  //      * con "Eliminar" pulsado (borrado intencional) → el preview se oculta;
  //      * sin "Eliminar" (Keystatic no logró cargar el asset) → muestra la imagen
  //        efectiva guardada, para que nunca parezca que el registro perdió su imagen.
  function enhanceImagePreview(){
    if (!isCollPage()) return;
    var cs = getCollSegs();
    if (cs && cs.item) hlSlug = cs.item;
    var groups = document.querySelectorAll('main [role="group"]');
    var titleInput = document.querySelector('main input');
    var title = titleInput ? (titleInput.value || '').trim() : '';
    var saved = IMAGES[title] || '';
    for (var i = 0; i < groups.length; i++){
      var g = groups[i];
      if (!g || (g.textContent || '').indexOf('Escoger imagen') === -1) continue;
      var row = g.querySelector('[data-align]') || g;
      var wrap = g.querySelector('.hl-img-preview');
      // Keystatic solo pinta "Eliminar" cuando el campo tiene valor: es la señal fiable
      var hasValue = false;
      var btns = g.querySelectorAll('button');
      for (var b = 0; b < btns.length; b++){
        if ((btns[b].textContent || '').trim() === 'Eliminar'){ hasValue = true; break; }
      }
      // Blob en vivo de Keystatic: imagen recién elegida o cargada desde el archivo.
      // OJO: se excluye el preview propio (hl-img-preview-img) — es el primer blob
      // del grupo en orden de documento y haría que liveSrc fuese siempre el propio
      // src obsoleto, impidiendo mostrar la imagen recién elegida.
      var liveSrc = '';
      var liveImg = g.querySelector('img[src^="blob:"]:not(.hl-img-preview-img)');
      if (liveImg) liveSrc = liveImg.getAttribute('src') || '';
      var showSrc = hasValue ? (liveSrc || saved) : (hlCleared[hlSlug] ? '' : saved);
      // Construir el contenedor una sola vez
      if (!wrap){
        wrap = document.createElement('div');
        wrap.className = 'hl-img-preview';
        var img = document.createElement('img');
        img.className = 'hl-img-preview-img';
        img.alt = 'Vista previa de la imagen';
        img.decoding = 'async';
        wrap.appendChild(img);
        var spinner = document.createElement('span');
        spinner.className = 'hl-img-spinner';
        var ring = document.createElement('span');
        ring.className = 'hl-img-spinner-ring';
        var txt = document.createElement('span');
        txt.className = 'hl-img-spinner-txt';
        txt.textContent = 'Cargando…';
        spinner.appendChild(ring);
        spinner.appendChild(txt);
        wrap.appendChild(spinner);
        img.onload = function(){ wrap.classList.remove('loading'); wrap.classList.add('ready'); };
        img.onerror = function(){ wrap.classList.remove('loading'); };
        row.appendChild(wrap);
      }
      var imgEl = wrap.querySelector('img');
      if (showSrc){
        wrap.style.display = '';
        if (imgEl.getAttribute('src') !== showSrc){
          imgEl.setAttribute('src', showSrc);
          wrap.classList.remove('ready');
          wrap.classList.add('loading');
        }
        // Si la imagen ya terminó de decodificar (cacheada o blob inmediato), salir del modo carga
        if (imgEl.complete){
          if (imgEl.naturalWidth > 0){
            wrap.classList.remove('loading');
            wrap.classList.add('ready');
          } else {
            wrap.classList.add('loading');
          }
        }
      } else {
        wrap.style.display = 'none';
        wrap.classList.remove('loading', 'ready');
        imgEl.removeAttribute('src');
      }
      // Oculta miniaturas rotas o placeholders de Keystatic dentro del campo
      var imgs = g.querySelectorAll('img');
      for (var j = 0; j < imgs.length; j++){
        var im = imgs[j];
        if (im === imgEl) continue;
        if (im.complete && im.naturalWidth === 0){
          im.style.display = 'none';
          if (im.parentElement && im.parentElement !== row) im.parentElement.style.display = 'none';
        }
      }
    }
  }

  // Marca el borrado intencional cuando se pulsa el botón "Eliminar" del campo
  // de imagen (fase de captura, antes de que React detenga la propagación).
  // Con esto el preview se oculta y el guardado NO re-inyecta la imagen anterior.
  document.addEventListener('click', function(e){
    var btn = e.target && e.target.closest ? e.target.closest('button') : null;
    if (!btn) return;
    if ((btn.textContent || '').trim() !== 'Eliminar') return;
    var g = btn.closest('[role="group"]');
    if (!g || (g.textContent || '').indexOf('Escoger imagen') === -1) return;
    if (hlSlug) hlCleared[hlSlug] = true;
  }, true);

  // Lee del árbol/blob el valor 'image:' que la ficha tiene en disco. Sirve de
  // respaldo cuando Keystatic no logra cargar el asset (bug intermitente de modo
  // local): al guardar, si el YAML nuevo pierde la imagen y NO hubo "Eliminar"
  // intencional, se re-inyecta la línea original para que nunca se borre sola.
  function captureOriginalImage(){
    if (!isCollPage()) return;
    var cs = getCollSegs();
    if (!cs || !cs.item) return;
    // Solo se captura una vez por entrada (evita fetchs repetidos en cada pase)
    if (hlCapturedFor === cs.item) return;
    hlCapturedFor = cs.item;
    var meta = COLLECTIONS[cs.collection];
    if (!meta) return;
    hlOrigImage = '';
    var dataPath = meta.dir + '/' + segs[5] + meta.ext;
    fetch('/api/keystatic/tree', { headers: { 'no-cors': '1' } })
      .then(function(r){ return r.json(); })
      .then(function(entries){
        var entry = (entries || []).find(function(x){ return x.path === dataPath; });
        if (!entry) return;
        return fetch('/api/keystatic/blob/' + entry.sha + '/' + dataPath, { headers: { 'no-cors': '1' } })
          .then(function(r){ return r.arrayBuffer(); })
          .then(function(buf){
            var text = new TextDecoder().decode(buf);
            var m = text.match(/^image:\\s*(.+)$/m);
            if (m) hlOrigImage = m[1].trim();
          });
      })
      .catch(function(){});
  }

  function refresh(){
    cleanupTransparency();
    scan();
    markPrimary();
    markSidebar();
    initCollapseButton();
    moveThemeButton();
    initSaveButton();
    if (window.__HL_SAVE_BTN__ && window.__HL_SAVE_BTN__.sync) window.__HL_SAVE_BTN__.sync();
    if (isCollPage()){
      enhanceTable();
      enhanceImagePreview();
      captureOriginalImage();
    }
  }

  checkSaved();
  cleanupTransparency();
  scan();
  markPrimary();
  markSidebar();
  initCollapseButton();
  moveThemeButton();
  initSaveButton();
  enhanceTable();
  new MutationObserver(function(){
    refresh();
  }).observe(document.body, { childList: true, subtree: true });
  // Refresco periódico ligero: el observer solo ve mutaciones childList y React
  // a veces solo cambia atributos (p. ej. src del blob al guardar/recargar), lo
  // que no dispararía el preview. Un pase cada 500ms mantiene el preview en vivo.
  // Se ejecuta en TODAS las rutas de Keystatic (no solo collection) para que
  // cleanupTransparency() oculte los elementos de GitHub que React renderiza
  // después de la carga inicial (dashboard, branch selector, etc.).
  setInterval(function(){
    if (location.pathname.indexOf('/keystatic') === 0) refresh();
  }, 500);
})();
</script>`;

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, cookies, request } = context;
  const path = url.pathname;

  const isProtected = PROTECTED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
  if (!isProtected) return next();

  // La página de inicio de sesión es pública
  if (path === '/keystatic/login') return next();

  // Sin credenciales configuradas (producción) → panel deshabilitado
  if (!isConfigured()) {
    const body = isHtmlRequest(request)
      ? '<!doctype html><html lang="es"><body style="font-family:sans-serif;padding:3rem;text-align:center"><h1>Panel deshabilitado</h1><p>Configura la variable <code>ADMIN_PASSWORD</code> para habilitar el panel de administración.</p></body></html>'
      : JSON.stringify({ error: 'Panel deshabilitado: configura ADMIN_PASSWORD' });
    return new Response(body, {
      status: 503,
      headers: { 'Content-Type': isHtmlRequest(request) ? 'text/html; charset=utf-8' : 'application/json' },
    });
  }

  // Sesión válida → continúa (e inyecta la personalización del panel)
  const session = validateSession(cookies.get(SESSION_COOKIE)?.value);
  if (session.valid) {
    // Cierre automático por inactividad: el timestamp viene embebido en
    // el token de sesión (formato: username.timestamp.hmac). Si la última
    // actividad fue hace más de 30 minutos, se cierra la sesión.
    if (session.expired) {
      cookies.delete(SESSION_COOKIE, { path: '/' });
      if (isHtmlRequest(request)) {
        return context.redirect('/keystatic/login?error=1&reason=expired');
      }
      return new Response(JSON.stringify({ error: 'Sesión expirada por inactividad' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    const response = await next();

    // Se inyecta en cualquier ruta del panel (no solo /keystatic): la app de
    // Keystatic navega por rutas como /keystatic/collection/... y /keystatic/
    // singleton/... y al recargar directamente ahí también debe llevar la
    // personalización. /keystatic/login ya retornó antes.
    let finalResponse = response;
    if (path.startsWith('/keystatic') && isHtmlRequest(request)) {
      const serviceImages = await getServiceImageMap();
      finalResponse = await injectPanelTheme(response, serviceImages);
    }

    // Refresca el token de sesión (a lo sumo una vez por minuto) para
    // mantener viva la sesión. El cookie se envía como header Set-Cookie
    // directamente en la respuesta, sin depender de JavaScript del cliente.
    if (session.age > ACTIVITY_REFRESH_MS) {
      const refreshed = createRefreshedToken();
      finalResponse.headers.append('Set-Cookie',
        `${SESSION_COOKIE}=${refreshed}; Path=/; HttpOnly; SameSite=Lax${import.meta.env.PROD ? '; Secure' : ''}; Max-Age=${60 * 60 * 24 * 30}`
      );
    }
    return finalResponse;
  }

  // Navegación del navegador → redirigir al inicio de sesión
  if (isHtmlRequest(request)) {
    return context.redirect(`/keystatic/login?next=${encodeURIComponent(path)}`);
  }

  // Peticiones de API sin sesión → 401
  return new Response(JSON.stringify({ error: 'No autorizado' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
});

function isHtmlRequest(request: Request): boolean {
  return request.headers.get('accept')?.includes('text/html') ?? false;
}

// Imágenes efectivas de los servicios para miniaturas del panel y respaldo del
// editor. La fuente principal es la propia ficha de cada servicio (campo
// "Imagen" de la colección, que es donde el cliente sube las imágenes); la
// Configuración del sitio queda solo como respaldo para servicios sin imagen.
// Si el contenido no está disponible (p. ej. arranque), se devuelve un mapa
// vacío y la lista usa la imagen de cada ficha (que ya está en la celda).
async function getServiceImageMap(): Promise<Record<string, string>> {
  try {
    const [services, site] = await Promise.all([
      getCollection('services'),
      getEntry('site', 'index'),
    ]);
    // Configuración del sitio como respaldo (servicios sin imagen propia)
    const fallback: Record<string, string> = {};
    for (const item of site?.data.serviceImages ?? []) {
      if (item?.service && item?.image) fallback[item.service] = item.image;
    }
    const map: Record<string, string> = {};
    for (const s of services) {
      const img = s.data.image ?? fallback[s.data.title] ?? '';
      map[s.data.title] = img;
      // Clave adicional por slug para que enhanceTable() pueda buscar
      // por el data-key del row en producción (modo GitHub)
      map[s.id] = img;
    }
    return map;
  } catch (err) {
    console.error('[HL] getServiceImageMap error:', err);
    return {};
  }
}

async function injectPanelTheme(response: Response, serviceImages: Record<string, string>): Promise<Response> {
  const html = await response.text();
  if (!html) return response;
  const payload = PANEL_HTML
    .replace('__HL_IMAGES__', JSON.stringify(serviceImages))
    .replace('__HL_COLLECTIONS__', JSON.stringify(COLLECTIONS));
  // El HTML del panel no siempre cierra con </body>: se inserta la
  // personalización antes de </body> si existe, antes de </html> si no,
  // o al final de la página.
  let updated: string;
  if (html.includes('</body>')) {
    updated = html.replace('</body>', `${payload}</body>`);
  } else if (html.includes('</html>')) {
    updated = html.replace('</html>', `${payload}</html>`);
  } else {
    updated = `${html}${payload}`;
  }
  const headers = new Headers(response.headers);
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.delete('Content-Length');
  // CSP deshabilitado para diagnosticar problema de Chrome con datos del singleton.
  // Si Chrome funciona sin CSP, el problema es la directiva script-src.
  // return new Response(updated, {
  //   status: response.status,
  //   statusText: response.statusText,
  //   headers,
  // });
  return new Response(updated, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
