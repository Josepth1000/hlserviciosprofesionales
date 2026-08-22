import { config, collection, fields, singleton } from '@keystatic/core';
import { createElement } from 'react';
import { colorField } from './src/lib/keystatic/colorField';
import { imageField } from './src/lib/keystatic/imageField';

// Marca del panel: logo corporativo (monograma dorado) sobre círculo negro
// para que sea visible tanto en modo claro como oscuro del panel.
const brandMark = ({ colorScheme }: { colorScheme: 'light' | 'dark' }) =>
  createElement('img', {
    src: '/images/logo.png',
    alt: 'HL',
    width: 64,
    height: 64,
    style: {
      height: '32px',
      width: '32px',
      objectFit: 'cover',
      borderRadius: '50%',
      background: '#0b0b0d',
      display: 'block',
      boxShadow: colorScheme === 'dark' ? '0 1px 3px rgba(0,0,0,.35)' : '0 1px 3px rgba(0,0,0,.15)',
    },
  });

const iconOptions = [
  { label: 'Balanza (jurídico)', value: 'scale' },
  { label: 'Calculadora (contable)', value: 'calculator' },
  { label: 'Escudo (seguridad social)', value: 'shield' },
  { label: 'Paraguas (seguros)', value: 'umbrella' },
  { label: 'Check', value: 'check' },
  { label: 'Personas', value: 'users' },
  { label: 'Pin de ubicación', value: 'pin' },
  { label: 'Teléfono', value: 'phone' },
  { label: 'Correo', value: 'mail' },
  { label: 'Reloj', value: 'clock' },
];

const socialIconOptions = [
  { label: 'Instagram', value: 'instagram' },
  { label: 'Facebook', value: 'facebook' },
  { label: 'WhatsApp', value: 'whatsapp' },
  { label: 'TikTok', value: 'tiktok' },
  { label: 'YouTube', value: 'youtube' },
  { label: 'LinkedIn', value: 'linkedin' },
  { label: 'X (Twitter)', value: 'x' },
];

const paletteTokenOptions = [
  { label: 'brand-50 · dorado muy claro (fondos, hover)', value: 'brand-50' },
  { label: 'brand-100 · dorado claro (badges, checks)', value: 'brand-100' },
  { label: 'brand-200 · dorado suave (notas)', value: 'brand-200' },
  { label: 'brand-300 · dorado medio (textos sobre oscuro)', value: 'brand-300' },
  { label: 'brand-400 · dorado brillante (resaltados, iconos)', value: 'brand-400' },
  { label: 'brand-500 · dorado principal (botones, CTAs)', value: 'brand-500' },
  { label: 'brand-600 · dorado oscuro (checks, hovers)', value: 'brand-600' },
  { label: 'brand-700 · dorado profundo (textos sobre claro)', value: 'brand-700' },
  { label: 'brand-800 · dorado muy oscuro (detalles)', value: 'brand-800' },
  { label: 'brand-900 · dorado profundo', value: 'brand-900' },
  { label: 'brand-950 · dorado oscurísimo (acentos)', value: 'brand-950' },
  { label: 'ink-50 · casi blanco (fondos claros)', value: 'ink-50' },
  { label: 'ink-100 · gris claro (texto sobre oscuro)', value: 'ink-100' },
  { label: 'ink-200 · gris claro medio', value: 'ink-200' },
  { label: 'ink-300 · gris medio tenue', value: 'ink-300' },
  { label: 'ink-400 · gris (placeholders)', value: 'ink-400' },
  { label: 'ink-500 · gris medio', value: 'ink-500' },
  { label: 'ink-600 · gris (texto base)', value: 'ink-600' },
  { label: 'ink-700 · gris oscuro (texto fuerte)', value: 'ink-700' },
  { label: 'ink-800 · gris muy oscuro (bordes, iconos)', value: 'ink-800' },
  { label: 'ink-900 · casi negro (superficies, títulos)', value: 'ink-900' },
  { label: 'ink-950 · negro (fondo header, hero, footer)', value: 'ink-950' },
  { label: 'ocre · ocre apagado (fondo FAQ)', value: 'ocre' },
];

const categoryOptions = [
  { label: 'Seguridad Social', value: 'Seguridad Social' },
  { label: 'Laboral', value: 'Laboral' },
  { label: 'Legal', value: 'Legal' },
  { label: 'Otros', value: 'Otros' },
];

export default config({
  storage: { kind: 'local' },
  locale: 'es-ES',
  ui: {
    brand: {
      name: 'HL Servicios Profesionales',
      mark: brandMark,
    },
    navigation: {
      Contenido: ['services', 'testimonials', 'faqs', 'blog', 'afiliacion'],
      'Sitio web': ['site', 'textos'],
    },
  },
  collections: {
    services: collection({
      label: 'Servicios',
      slugField: 'title',
      path: 'src/content/services/*',
      format: 'yaml',
      columns: ['image', 'title', 'order'],
      schema: {
        title: fields.slug({ name: { label: 'Título' } }),
        order: fields.integer({ label: 'Orden', defaultValue: 0 }),
        icon: fields.select({ label: 'Icono', options: iconOptions, defaultValue: 'scale' }),
        image: fields.image({ label: 'Imagen', directory: 'public/images', publicPath: '/images/' }),
        short: fields.text({ label: 'Resumen (tarjeta)', multiline: true }),
        description: fields.text({ label: 'Descripción (página)', multiline: true }),
        items: fields.array(fields.text({ label: 'Ítem', multiline: true }), {
          label: 'Características',
          itemLabel: (props) => props.value ?? 'Ítem',
        }),
      },
    }),
    testimonials: collection({
      label: 'Testimonios',
      slugField: 'name',
      path: 'src/content/testimonials/*',
      format: 'yaml',
      columns: ['name', 'order'],
      schema: {
        name: fields.slug({ name: { label: 'Nombre' } }),
        role: fields.text({ label: 'Cargo / Empresa' }),
        text: fields.text({ label: 'Testimonio', multiline: true }),
        rating: fields.integer({
          label: 'Valoración (1-5 estrellas)',
          defaultValue: 5,
          validation: { min: 1, max: 5 },
        }),
        order: fields.integer({ label: 'Orden', defaultValue: 0 }),
      },
    }),
    faqs: collection({
      label: 'Preguntas frecuentes',
      slugField: 'question',
      path: 'src/content/faqs/*',
      format: 'yaml',
      columns: ['question', 'order'],
      schema: {
        question: fields.slug({ name: { label: 'Pregunta' } }),
        answer: fields.text({ label: 'Respuesta', multiline: true }),
        order: fields.integer({ label: 'Orden', defaultValue: 0 }),
      },
    }),
    blog: collection({
      label: 'Noticias',
      slugField: 'title',
      path: 'src/content/blog/*',
      format: { contentField: 'content' },
      columns: ['title', 'pubDate'],
      schema: {
        title: fields.slug({ name: { label: 'Título' } }),
        description: fields.text({ label: 'Resumen', multiline: true }),
        pubDate: fields.date({ label: 'Fecha de publicación' }),
        category: fields.select({
          label: 'Categoría',
          options: categoryOptions,
          defaultValue: 'Otros',
        }),
        tags: fields.array(fields.text({ label: 'Etiqueta' }), { label: 'Etiquetas' }),
        content: fields.markdoc({ label: 'Contenido', extension: 'md' }),
      },
    }),
  },
  singletons: {
    site: singleton({
      label: 'Configuración del sitio',
      path: 'src/content/site/',
      format: 'yaml',
      schema: {
        name: fields.text({ label: 'Nombre de la firma' }),
        brandName: fields.text({ label: 'Marca (texto cursiva del header y footer)' }),
        slogan: fields.text({ label: 'Eslogan' }),
        cursor: fields.object(
          {
            enabled: fields.checkbox({
              label: 'Activar la animación del puntero',
              description:
                'Al desactivarlo se quita el efecto del cursor y el brillo de las tarjetas. Se recomienda dejarlo activo solo en computadores (los móviles lo ignoran).',
              defaultValue: true,
            }),
            effect: fields.select({
              label: 'Efecto del puntero',
              description:
                'Elige la animación que sigue al cursor: halo dorado (resplandor difuso), anillo (aro que se agranda sobre enlaces) o destellos (pequeñas partículas doradas).',
              options: [
                { label: 'Halo dorado (resplandor suave)', value: 'halo' },
                { label: 'Anillo dorado (se agranda en enlaces)', value: 'ring' },
                { label: 'Destellos (partículas doradas)', value: 'sparkles' },
              ],
              defaultValue: 'halo',
            }),
            size: fields.integer({
              label: 'Tamaño del halo (px)',
              description: 'Diámetro del resplandor del halo en píxeles (120 – 800). Solo aplica al efecto “Halo dorado”.',
              defaultValue: 360,
              validation: { min: 120, max: 800 },
            }),
          },
          { label: '✨ Animación del puntero (cursor)' },
        ),
        logo: fields.image({
          label: 'Logo (monograma)',
          directory: 'public/images',
          publicPath: '/images/',
        }),
        palette: fields.array(
          fields.object(
            {
              token: fields.select({
                label: 'Token (identificador técnico)',
                options: paletteTokenOptions,
                defaultValue: 'brand-500',
              }),
              hex: colorField({ label: 'Color' }),
              elemento: fields.text({
                label: 'Elemento (¿qué pinta este color?)',
                description:
                  'Nombre claro e identificable, p. ej. "Botones y CTAs", "Fondo de Preguntas frecuentes", "Texto principal del sitio".',
              }),
              description: fields.text({ label: 'Descripción del uso', multiline: true }),
              pages: fields.text({ label: 'Se usa en (páginas)', multiline: true }),
            },
            { label: 'Color' },
          ),
          {
            label: '🎨 Paleta de colores por Elemento (identifica cada color por lo que pinta en la página)',
            itemLabel: (props) => {
              const elem = props.fields.elemento.value?.trim();
              const token = props.fields.token.value;
              return elem ? `${elem} · ${token}` : token || 'Color';
            },
          },
        ),
        description: fields.text({ label: 'Descripción (SEO)', multiline: true }),
        address: fields.text({ label: 'Dirección' }),
        phone: fields.text({ label: 'Teléfono' }),
        whatsapp: fields.text({ label: 'WhatsApp (número internacional sin +)' }),
        email: fields.text({ label: 'Correo electrónico' }),
        hours: fields.text({ label: 'Horario' }),
        instagram: fields.text({
          label: 'URL de Instagram',
          description:
            'Lo usa el botón “Síguenos en Instagram” de la página de Contacto. Las redes del pie de página se gestionan abajo, en “Redes sociales”.',
        }),
        social: fields.array(
          fields.object(
            {
              name: fields.text({ label: 'Nombre (p. ej. Instagram)' }),
              url: fields.text({ label: 'URL del perfil' }),
              icon: fields.select({
                label: 'Icono',
                options: socialIconOptions,
                defaultValue: 'instagram',
              }),
            },
            { label: 'Red social' },
          ),
          {
            label: '🌐 Redes sociales (pie de página)',
            description:
              'Añade todas las redes que quieras: se muestran como botones animados en el pie de página.',
            itemLabel: (props) => {
              const name = props.fields.name.value?.trim();
              return name ? `${name} (${props.fields.icon.value})` : props.fields.icon.value || 'Red social';
            },
          },
        ),
        hero: fields.object(
          {
            badge: fields.text({ label: 'Texto del sello superior' }),
            titlePrefix: fields.text({ label: 'Título (parte 1)' }),
            highlight: fields.text({ label: 'Título (parte destacada en dorado)' }),
            titleSuffix: fields.text({ label: 'Título (parte final)' }),
            subtitle: fields.text({ label: 'Subtítulo', multiline: true }),
            image: fields.image({
              label: 'Imagen de fondo del hero',
              description:
                'Imagen de fondo de la portada (se oscurece con un degradado). Tamaño recomendado: 1920 × 952 px.',
              directory: 'public/images',
              publicPath: '/images/',
            }),
          },
          { label: 'Portada (hero)' },
        ),
        stats: fields.array(
          fields.object(
            {
              value: fields.text({ label: 'Cifra' }),
              label: fields.text({ label: 'Etiqueta' }),
            },
            { label: 'Cifra' },
          ),
          {
            label: 'Cifras destacadas (portada)',
            itemLabel: (props) => props.fields.value.value ?? 'Cifra',
          },
        ),
        serviceImages: fields.array(
          fields.object(
            {
              service: fields.select({
                label: 'Servicio',
                description:
                  'Elige a qué servicio corresponde esta imagen. Si un servicio no aparece aquí, se usa la imagen de su propia ficha.',
                options: [
                  { label: 'Seguridad Social', value: 'Seguridad Social' },
                  { label: 'Servicios Jurídicos', value: 'Servicios Jurídicos' },
                  { label: 'Servicios Contables', value: 'Servicios Contables' },
                  { label: 'Seguros', value: 'Seguros' },
                ],
                defaultValue: 'Seguridad Social',
              }),
              image: fields.image({
                label: 'Imagen',
                description:
                  'Se muestra en la tarjeta de la portada y en la página de servicios. Tamaño recomendado: 1200 × 800 px (horizontal).',
                directory: 'public/images',
                publicPath: '/images/',
              }),
            },
            { label: 'Imagen' },
          ),
          {
            label: '🖼️ Imágenes de los servicios (portada y página de Servicios)',
            itemLabel: (props) => props.fields.service.value ?? 'Servicio',
          },
        ),
        values: fields.array(
          fields.object(
            {
              icon: fields.select({ label: 'Icono', options: iconOptions, defaultValue: 'check' }),
              title: fields.text({ label: 'Título' }),
              text: fields.text({ label: 'Texto', multiline: true }),
            },
            { label: 'Valor' },
          ),
          {
            label: 'Valores (Quiénes Somos)',
            itemLabel: (props) => props.fields.title.value ?? 'Valor',
          },
        ),
        fonts: fields.object(
          {
            body: fields.text({
              label: 'Tipografía del texto',
              description: 'Familia de Google Fonts para el texto general (por defecto Inter).',
              defaultValue: 'Inter',
            }),
            display: fields.text({
              label: 'Tipografía de títulos',
              description: 'Familia de Google Fonts para títulos y encabezados (por defecto Playfair Display).',
              defaultValue: 'Playfair Display',
            }),
            script: fields.text({
              label: 'Tipografía de la marca (cursiva)',
              description: 'Familia de Google Fonts para el nombre de la marca en cursiva (por defecto Great Vibes).',
              defaultValue: 'Great Vibes',
            }),
            googleFontsUrl: fields.text({
              label: 'URL de Google Fonts',
              description:
                'URL completa de Google Fonts que carga las tres familias. Déjala con el valor predeterminado o pega la tuya propia.',
              defaultValue:
                'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&family=Great+Vibes&display=swap',
            }),
          },
          { label: '🔤 Tipografías' },
        ),
      },
    }),
    textos: singleton({
      label: 'Configuración del Contenido',
      path: 'src/content/textos/',
      format: 'yaml',
      schema: {
        global: fields.object(
          {
            whatsappMessage: fields.text({
              label: 'Mensaje predeterminado de WhatsApp',
              description: 'Texto que se envía al abrir cualquier botón de WhatsApp.',
              multiline: true,
              defaultValue: 'Hola, quiero una asesoría en HL Servicios Profesionales.',
            }),
            pageHeroLabel: fields.text({
              label: 'Etiqueta sobre el título de las páginas internas',
              defaultValue: 'HL Servicios Profesionales',
            }),
            skipLinkLabel: fields.text({
              label: 'Enlace “Saltar al contenido” (accesibilidad)',
              defaultValue: 'Saltar al contenido',
            }),
            backToTopLabel: fields.text({
              label: 'Botón “Volver arriba” (accesibilidad)',
              defaultValue: 'Volver arriba',
            }),
          },
          { label: '🌐 Global' },
        ),
        nav: fields.object(
          {
            items: fields.array(
              fields.object(
                {
                  label: fields.text({ label: 'Texto del enlace' }),
                  href: fields.text({ label: 'Ruta (p. ej. /servicios)' }),
                },
                { label: 'Enlace' },
              ),
              {
                label: 'Menú de navegación',
                description: 'Enlaces del menú superior y del pie de página.',
                itemLabel: (props) => props.fields.label.value ?? 'Enlace',
              },
            ),
            whatsappLabel: fields.text({ label: 'Botón WhatsApp del menú', defaultValue: 'WhatsApp' }),
          },
          { label: '🧭 Menú de navegación' },
        ),
        footer: fields.object(
          {
            description: fields.text({ label: 'Descripción de la firma', multiline: true }),
            linksTitle: fields.text({ label: 'Título de la columna Enlaces', defaultValue: 'Enlaces' }),
            servicesTitle: fields.text({ label: 'Título de la columna Servicios', defaultValue: 'Servicios' }),
            contactTitle: fields.text({ label: 'Título de la columna Contacto', defaultValue: 'Contacto' }),
            cityLine: fields.text({ label: 'Línea de ciudad (pie de página)', defaultValue: 'Bucaramanga, Santander · Colombia' }),
            copyrightSuffix: fields.text({ label: 'Texto tras el © año y nombre', defaultValue: 'Todos los derechos reservados.' }),
          },
          { label: '🦶 Pie de página' },
        ),
        cta: fields.object(
          {
            title: fields.text({ label: 'Título', defaultValue: '¿Necesitas asesoría profesional?' }),
            subtitle: fields.text({ label: 'Texto', multiline: true }),
            whatsappLabel: fields.text({ label: 'Botón de WhatsApp', defaultValue: 'Escríbenos por WhatsApp' }),
            contactLabel: fields.text({ label: 'Botón secundario (contacto)', defaultValue: 'Ir a contacto' }),
          },
          { label: '📣 Banda de llamada a la acción (todas las páginas)' },
        ),
        home: fields.object(
          {
            heroImage: imageField({
              label: 'Imagen de fondo del hero',
              description: 'Se oscurece con un degradado. Tamaño recomendado: 1920 × 952 px.',
              directory: 'public/images',
              publicPath: '/images/',
            }),
            heroPrimaryLabel: fields.text({ label: 'Botón principal del hero', defaultValue: 'Conoce nuestros servicios' }),
            heroSecondaryLabel: fields.text({ label: 'Botón secundario del hero', defaultValue: 'Escríbenos' }),
            services: fields.object(
              {
                label: fields.text({ label: 'Etiqueta', defaultValue: 'Qué hacemos' }),
                title: fields.text({ label: 'Título', defaultValue: 'Nuestros servicios' }),
                intro: fields.text({ label: 'Texto', multiline: true }),
                readMoreLabel: fields.text({ label: 'Enlace “Conocer más” de las tarjetas', defaultValue: 'Conocer más' }),
              },
              { label: 'Sección Servicios' },
            ),
            social: fields.object(
              {
                label: fields.text({ label: 'Etiqueta', defaultValue: 'Seguridad social' }),
                title: fields.text({ label: 'Título', defaultValue: 'Afíliate al sistema de seguridad social sin complicaciones' }),
                text: fields.text({ label: 'Texto', multiline: true }),
                bulletPricePrefix: fields.text({ label: 'Prefijo del primer punto (precio)', defaultValue: 'Planes desde' }),
                bullets: fields.array(fields.text({ label: 'Punto' }), {
                  label: 'Puntos destacados',
                  itemLabel: (props) => props.value ?? 'Punto',
                }),
                floatingTop: fields.text({ label: 'Texto de la insignia flotante (línea 1)', defaultValue: 'EPS · ARL' }),
                floatingBottom: fields.text({ label: 'Texto de la insignia flotante (línea 2)', defaultValue: 'Pensión · Caja de compensación' }),
                buttonLabel: fields.text({ label: 'Botón “Ver planes”', defaultValue: 'Ver planes de afiliación' }),
              },
              { label: 'Sección destacada Seguridad social' },
            ),
            news: fields.object(
              {
                label: fields.text({ label: 'Etiqueta', defaultValue: 'Actualidad' }),
                title: fields.text({ label: 'Título', defaultValue: 'Noticias y publicaciones' }),
                viewAll: fields.text({ label: 'Enlace “Ver todas”', defaultValue: 'Ver todas las noticias' }),
              },
              { label: 'Sección Noticias' },
            ),
            testimonials: fields.object(
              {
                label: fields.text({ label: 'Etiqueta', defaultValue: 'Testimonios' }),
                title: fields.text({ label: 'Título', defaultValue: 'Lo que dicen nuestros clientes' }),
                intro: fields.text({ label: 'Texto', multiline: true }),
              },
              { label: 'Sección Testimonios' },
            ),
            faq: fields.object(
              {
                label: fields.text({ label: 'Etiqueta', defaultValue: 'Ayuda' }),
                title: fields.text({ label: 'Título', defaultValue: 'Preguntas frecuentes' }),
                intro: fields.text({ label: 'Texto', multiline: true }),
              },
              { label: 'Sección Preguntas frecuentes' },
            ),
          },
          { label: '🏠 Portada (Inicio)' },
        ),
        about: fields.object(
          {
            seoTitle: fields.text({ label: 'Título de la pestaña (SEO)', defaultValue: 'Quiénes Somos' }),
            seoDescription: fields.text({ label: 'Descripción SEO', multiline: true }),
            hero: fields.object(
              {
                title: fields.text({ label: 'Título' }),
                subtitle: fields.text({ label: 'Subtítulo', multiline: true }),
                image: imageField({ label: 'Imagen de fondo', directory: 'public/images', publicPath: '/images/' }),
              },
              { label: 'Encabezado de la página' },
            ),
            label: fields.text({ label: 'Etiqueta de la sección', defaultValue: 'Nuestra firma' }),
            title: fields.text({ label: 'Título de la sección', defaultValue: 'Soluciones de éxito para nuestros clientes' }),
            paragraph1: fields.text({ label: 'Primer párrafo', multiline: true }),
            paragraph2: fields.text({ label: 'Segundo párrafo', multiline: true }),
            locationLabel: fields.text({ label: 'Etiqueta de Ubicación', defaultValue: 'Ubicación' }),
            founder: fields.object(
              {
                name: fields.text({ label: 'Nombre', defaultValue: 'Henry López Beltrán' }),
                role: fields.text({ label: 'Cargo', defaultValue: 'Gerente General' }),
                bio: fields.text({ label: 'Biografía', multiline: true }),
                image: imageField({ label: 'Foto', directory: 'public/images', publicPath: '/images/' }),
              },
              { label: 'Tarjeta del fundador' },
            ),
            values: fields.object(
              {
                label: fields.text({ label: 'Etiqueta', defaultValue: 'Nuestros principios' }),
                title: fields.text({ label: 'Título', defaultValue: 'Asesoría con valores' }),
                intro: fields.text({ label: 'Texto', multiline: true }),
              },
              { label: 'Sección Valores' },
            ),
          },
          { label: '👥 Quiénes Somos' },
        ),
        servicesPage: fields.object(
          {
            seoTitle: fields.text({ label: 'Título de la pestaña (SEO)', defaultValue: 'Servicios' }),
            seoDescription: fields.text({ label: 'Descripción SEO', multiline: true }),
            hero: fields.object(
              {
                title: fields.text({ label: 'Título' }),
                subtitle: fields.text({ label: 'Subtítulo', multiline: true }),
                image: imageField({ label: 'Imagen de fondo', directory: 'public/images', publicPath: '/images/' }),
              },
              { label: 'Encabezado de la página' },
            ),
            ctaLabel: fields.text({ label: 'Botón “Solicitar asesoría”', defaultValue: 'Solicitar asesoría' }),
          },
          { label: '🛠️ Servicios' },
        ),
        afiliacion: fields.object(
          {
            seoTitle: fields.text({ label: 'Título de la pestaña (SEO)', defaultValue: 'Cómo me afilio' }),
            seoDescription: fields.text({ label: 'Descripción SEO', multiline: true }),
            hero: fields.object(
              {
                title: fields.text({ label: 'Título' }),
                subtitle: fields.text({ label: 'Subtítulo', multiline: true }),
                image: imageField({ label: 'Imagen de fondo', directory: 'public/images', publicPath: '/images/' }),
              },
              { label: 'Encabezado de la página' },
            ),
            plansLabel: fields.text({ label: 'Etiqueta de la tabla de planes', defaultValue: 'Planes de afiliación' }),
            plansTitle: fields.text({ label: 'Título de la tabla de planes', defaultValue: 'Escoge tu mejor plan' }),
            planColumnHeader: fields.text({ label: 'Encabezado de la columna Plan', defaultValue: 'Plan' }),
            plansWhatsappTemplate: fields.text({
              label: 'Mensaje de WhatsApp al elegir un plan',
              description:
                'Se envía al hacer clic en una combinación de la tabla. Usa {plan}, {combinacion} y {precio} como marcadores.',
              multiline: true,
              defaultValue: 'Hola, estoy interesado en el {plan} {combinacion} por valor de {precio} mensuales',
            }),
            plansHint: fields.text({
              label: 'Pista bajo la tabla de planes',
              description: 'Texto que invita a elegir una combinación para cotizarla por WhatsApp.',
              defaultValue: 'Haz clic en una combinación para cotizarla por WhatsApp.',
            }),
            requirements: fields.object(
              {
                label: fields.text({ label: 'Etiqueta', defaultValue: 'Vinculación' }),
                title: fields.text({ label: 'Título', defaultValue: 'Requisitos para la vinculación al sistema de seguridad social' }),
                intro: fields.text({ label: 'Texto', multiline: true }),
                whatsappButton: fields.text({ label: 'Botón de WhatsApp', defaultValue: 'Consultar por WhatsApp' }),
                whatsappMessage: fields.text({
                  label: 'Mensaje de WhatsApp de requisitos',
                  multiline: true,
                  defaultValue: 'Hola, quiero información sobre los requisitos de afiliación a seguridad social.',
                }),
              },
              { label: 'Sección Requisitos' },
            ),
          },
          { label: '📋 Cómo me afilio' },
        ),
        contact: fields.object(
          {
            seoTitle: fields.text({ label: 'Título de la pestaña (SEO)', defaultValue: 'Contacto' }),
            seoDescription: fields.text({ label: 'Descripción SEO', multiline: true }),
            hero: fields.object(
              {
                title: fields.text({ label: 'Título' }),
                subtitle: fields.text({ label: 'Subtítulo', multiline: true }),
                image: imageField({ label: 'Imagen de fondo', directory: 'public/images', publicPath: '/images/' }),
              },
              { label: 'Encabezado de la página' },
            ),
            label: fields.text({ label: 'Etiqueta del formulario', defaultValue: 'Escríbenos' }),
            title: fields.text({ label: 'Título del formulario', defaultValue: 'Solicita tu asesoría' }),
            intro: fields.text({ label: 'Texto del formulario', multiline: true }),
            form: fields.object(
              {
                action: fields.text({
                  label: 'URL de envío del formulario',
                  description: 'Reemplaza por tu endpoint real de Formspree, Netlify Forms, etc.',
                  defaultValue: 'https://formspree.io/f/YOUR_FORM_ID',
                }),
                nameLabel: fields.text({ label: 'Etiqueta Nombre', defaultValue: 'Nombre completo *' }),
                namePlaceholder: fields.text({ label: 'Marcador Nombre', defaultValue: 'Tu nombre' }),
                phoneLabel: fields.text({ label: 'Etiqueta Teléfono', defaultValue: 'Teléfono *' }),
                phonePlaceholder: fields.text({ label: 'Marcador Teléfono', defaultValue: '300 123 4567' }),
                emailLabel: fields.text({ label: 'Etiqueta Correo', defaultValue: 'Correo electrónico' }),
                emailPlaceholder: fields.text({ label: 'Marcador Correo', defaultValue: 'tucorreo@ejemplo.com' }),
                serviceLabel: fields.text({ label: 'Etiqueta Servicio', defaultValue: 'Servicio de interés *' }),
                servicePlaceholder: fields.text({ label: 'Opción por defecto del desplegable', defaultValue: 'Selecciona un servicio' }),
                serviceOptions: fields.array(
                  fields.object(
                    {
                      value: fields.text({ label: 'Valor técnico' }),
                      label: fields.text({ label: 'Texto visible' }),
                    },
                    { label: 'Opción' },
                  ),
                  {
                    label: 'Opciones del desplegable “Servicio de interés”',
                    itemLabel: (props) => props.fields.label.value ?? 'Opción',
                  },
                ),
                messageLabel: fields.text({ label: 'Etiqueta Mensaje', defaultValue: 'Mensaje *' }),
                messagePlaceholder: fields.text({ label: 'Marcador Mensaje', defaultValue: 'Cuéntanos cómo podemos ayudarte...' }),
                submitLabel: fields.text({ label: 'Botón Enviar', defaultValue: 'Enviar mensaje' }),
              },
              { label: 'Formulario de contacto' },
            ),
            infoTitle: fields.text({ label: 'Título “Información de contacto”', defaultValue: 'Información de contacto' }),
            whatsappButton: fields.text({ label: 'Botón de WhatsApp', defaultValue: 'WhatsApp directo' }),
            instagramButton: fields.text({ label: 'Botón de Instagram', defaultValue: 'Síguenos en Instagram' }),
            map: fields.object(
              {
                label: fields.text({ label: 'Etiqueta del mapa', defaultValue: 'Nuestra oficina' }),
                directionsLabel: fields.text({ label: 'Botón “Cómo llegar”', defaultValue: 'Cómo llegar' }),
                embedUrl: fields.text({
                  label: 'URL del mapa incrustado',
                  description:
                    'Si usas coordenadas (?q=lat,lng) el pin cae exacto en la oficina y no aparece la ciudad equivocada.',
                  multiline: true,
                  defaultValue: 'https://www.google.com/maps?q=7.1181443,-73.127934&z=18&output=embed',
                }),
                directionsUrl: fields.text({
                  label: 'URL de “Cómo llegar”',
                  description: 'Enlace de Google Maps a la ubicación exacta (el edificio Los Castellanos).',
                  multiline: true,
                  defaultValue:
                    'https://www.google.com/maps/place/La+Caleta+De+Los+Gallos/@7.1181656,-73.127781,3a,75y,315.65h,106.3t/data=!3m7!1e1!3m5!1swYQY6jsJ7vIVr0mtnAJgkg!2e0!6shttps:%2F%2Fstreetviewpixels-pa.googleapis.com%2Fv1%2Fthumbnail%3Fcb_client%3Dmaps_sv.tactile%26w%3D900%26h%3D600%26pitch%3D-16.298067307460542%26panoid%3DwYQY6jsJ7vIVr0mtnAJgkg%26yaw%3D315.64744551673454!7i13312!8i6656!4m20!1m13!4m12!1m4!2m2!1d-73.121792!2d7.1172096!4e1!1m6!1m2!1s0x8e683f005d9bbe0f:0x2528e51c605beb0f!2sEdificio+Los+Castellanos,+Cra.+12+%2334-67,+Centro,+Bucaramanga,+Floridablanca,+Santander!2m2!1d-73.1290361!2d7.1179641!3m5!1s0x8e683fd68ddcc10f:0x63121296eca24670!8m2!3d7.1181443!4d-73.127934!16s%2Fg%2F11j1300cpx?entry=ttu&g_ep=EgoyMDI2MDgxMi4wIKXMDSoASAFQAw%3D%3D',
                }),
                lat: fields.number({
                  label: 'Latitud',
                  description: 'Coordenada de la oficina para el mapa Leaflet y los datos de SEO.',
                  defaultValue: 7.1181443,
                }),
                lng: fields.number({
                  label: 'Longitud',
                  description: 'Coordenada de la oficina para el mapa Leaflet y los datos de SEO.',
                  defaultValue: -73.127934,
                }),
              },
              { label: 'Mapa' },
            ),
          },
          { label: '✉️ Contacto' },
        ),
        news: fields.object(
          {
            seoTitle: fields.text({ label: 'Título de la pestaña (SEO)', defaultValue: 'Noticias' }),
            seoDescription: fields.text({ label: 'Descripción SEO', multiline: true }),
            hero: fields.object(
              {
                title: fields.text({ label: 'Título' }),
                subtitle: fields.text({ label: 'Subtítulo', multiline: true }),
                image: imageField({ label: 'Imagen de fondo', directory: 'public/images', publicPath: '/images/' }),
              },
              { label: 'Encabezado de la página' },
            ),
            empty: fields.text({ label: 'Mensaje cuando no hay noticias', defaultValue: 'Aún no hay publicaciones.' }),
          },
          { label: '📰 Noticias' },
        ),
        blog: fields.object(
          {
            authorLabel: fields.text({ label: 'Autor del artículo', defaultValue: 'Por Henry López' }),
            tagsLabel: fields.text({ label: 'Etiqueta de etiquetas', defaultValue: 'Etiquetas:' }),
            backLabel: fields.text({ label: 'Enlace de volver', defaultValue: 'Volver a noticias' }),
            readMoreLabel: fields.text({ label: 'Enlace “Leer más” de las tarjetas', defaultValue: 'Leer más' }),
          },
          { label: '📝 Artículos (blog)' },
        ),
      },
    }),
    afiliacion: singleton({
      label: 'Cómo me afilio',
      path: 'src/content/afiliacion/',
      format: 'yaml',
      schema: {
        intro: fields.text({ label: 'Texto introductorio', multiline: true }),
        plans: fields.array(
          fields.object(
            {
              id: fields.text({ label: 'Nombre del plan' }),
              salud: fields.integer({ label: '+ SALUD' }),
              saludCcf: fields.integer({ label: '+ SALUD + CCF' }),
              saludPension: fields.integer({ label: '+ SALUD + PENSIÓN' }),
              completo: fields.integer({ label: '+ SALUD + PENSIÓN + CCF' }),
            },
            { label: 'Plan' },
          ),
          {
            label: 'Planes de afiliación',
            itemLabel: (props) => props.fields.id.value ?? 'Plan',
          },
        ),
        requirements: fields.array(fields.text({ label: 'Requisito', multiline: true }), {
          label: 'Requisitos de vinculación',
          itemLabel: (props) => {
            const value = props.value;
            if (!value) return 'Requisito';
            return value.length > 50 ? `${value.slice(0, 50)}…` : value;
          },
        }),
        notes: fields.array(fields.text({ label: 'Nota', multiline: true }), {
          label: 'Notas informativas',
          itemLabel: (props) => {
            const value = props.value;
            if (!value) return 'Nota';
            return value.length > 50 ? `${value.slice(0, 50)}…` : value;
          },
        }),
      },
    }),
  },
});
