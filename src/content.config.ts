import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const site = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/site' }),
  schema: z.object({
    name: z.string(),
    brandName: z.string().default('Servicios Profesionales'),
    slogan: z.string(),
    logo: z.string().default('/images/logo.png'),
    cursor: z
      .object({
        enabled: z.boolean().default(true),
        effect: z.enum(['halo', 'ring', 'sparkles']).default('halo'),
        size: z.number().default(360),
      })
      .default({ enabled: true, effect: 'halo', size: 360 }),
    fonts: z
      .object({
        body: z.string().default('Inter'),
        display: z.string().default('Playfair Display'),
        script: z.string().default('Great Vibes'),
        googleFontsUrl: z
          .string()
          .default(
            'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&family=Great+Vibes&display=swap',
          ),
      })
      .default({
        body: 'Inter',
        display: 'Playfair Display',
        script: 'Great Vibes',
        googleFontsUrl:
          'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&family=Great+Vibes&display=swap',
      }),
    palette: z
      .array(
        z.object({
          token: z.string(),
          hex: z.string(),
          elemento: z.string(),
          description: z.string().default(''),
          pages: z.string().default(''),
        }),
      )
      .default([]),
    description: z.string(),
    address: z.string(),
    phone: z.string(),
    whatsapp: z.string(),
    email: z.string(),
    hours: z.string(),
    instagram: z.string(),
    social: z
      .array(
        z.object({
          name: z.string(),
          url: z.string(),
          icon: z.string().default('instagram'),
        }),
      )
      .default([
        { name: 'Instagram', url: 'https://www.instagram.com/serviciosprofesionaleshl/', icon: 'instagram' },
        { name: 'WhatsApp', url: 'https://wa.me/573153401391', icon: 'whatsapp' },
      ]),
    hero: z.object({
      badge: z.string(),
      titlePrefix: z.string(),
      highlight: z.string(),
      titleSuffix: z.string(),
      subtitle: z.string(),
      image: z.string().default('/images/hero/image.jpg'),
    }),
    stats: z.array(z.object({ value: z.string(), label: z.string() })),
    serviceImages: z
      .array(z.object({ service: z.string(), image: z.string() }))
      .default([]),
    values: z.array(z.object({ icon: z.string(), title: z.string(), text: z.string() })),
  }),
});

const afiliacion = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/afiliacion' }),
  schema: z.object({
    intro: z.string(),
    plans: z.array(
      z.object({
        id: z.string(),
        salud: z.number(),
        saludCcf: z.number(),
        saludPension: z.number(),
        completo: z.number(),
      }),
    ),
    requirements: z.array(z.string()),
    notes: z.array(z.string()),
  }),
});

const services = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/services' }),
  schema: z.object({
    title: z.string(),
    order: z.number(),
    icon: z.string(),
    image: z.string(),
    short: z.string(),
    description: z.string(),
    items: z.array(z.string()),
  }),
});

const testimonials = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/testimonials' }),
  schema: z.object({
    name: z.string(),
    role: z.string(),
    text: z.string(),
    rating: z.number(),
    order: z.number(),
  }),
});

const faqs = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/faqs' }),
  schema: z.object({
    question: z.string(),
    answer: z.string(),
    order: z.number(),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    category: z.string().default('Otros'),
    tags: z.array(z.string()).default([]),
  }),
});

// Páginas creadas por el usuario desde el panel (✍️ o 🧩 Páginas). El cuerpo
// es un editor enriquecido (fields.document) que Keystatic guarda en markdown.
const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string().default(''),
    seoTitle: z.string().nullable().optional(),
    seoDescription: z.string().nullable().optional(),
    heroTitle: z.string().nullable().optional(),
    heroSubtitle: z.string().nullable().optional(),
    heroImage: z.string().nullable().optional(),
    showInNav: z.boolean().default(false),
    order: z.number().default(0),
    status: z.enum(['publicada', 'borrador']).default('publicada'),
  }),
});

// Todos los textos e imágenes del sitio editables desde el panel
// (singleton ✍️ Textos del sitio). Cada campo tiene un valor por defecto que
// coincide con el contenido actual del sitio.
const textos = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/textos' }),
  schema: z.object({
    global: z
      .object({
        whatsappMessage: z
          .string()
          .default('Hola, quiero una asesoría en HL Servicios Profesionales.'),
        pageHeroLabel: z.string().default('HL Servicios Profesionales'),
        skipLinkLabel: z.string().default('Saltar al contenido'),
        backToTopLabel: z.string().default('Volver arriba'),
      })
      .default({
        whatsappMessage: 'Hola, quiero una asesoría en HL Servicios Profesionales.',
        pageHeroLabel: 'HL Servicios Profesionales',
        skipLinkLabel: 'Saltar al contenido',
        backToTopLabel: 'Volver arriba',
      }),
    nav: z
      .object({
        items: z
          .array(z.object({ label: z.string(), href: z.string() }))
          .default([
            { label: 'Inicio', href: '/' },
            { label: 'Quiénes Somos', href: '/quienes-somos' },
            { label: 'Servicios', href: '/servicios' },
            { label: 'Cómo me afilio', href: '/como-me-afilio' },
            { label: 'Noticias', href: '/noticias' },
            { label: 'Contacto', href: '/contacto' },
          ]),
        whatsappLabel: z.string().default('WhatsApp'),
      })
      .default({
        items: [
          { label: 'Inicio', href: '/' },
          { label: 'Quiénes Somos', href: '/quienes-somos' },
          { label: 'Servicios', href: '/servicios' },
          { label: 'Cómo me afilio', href: '/como-me-afilio' },
          { label: 'Noticias', href: '/noticias' },
          { label: 'Contacto', href: '/contacto' },
        ],
        whatsappLabel: 'WhatsApp',
      }),
    footer: z
      .object({
        description: z
          .string()
          .default(
            'Firma especializada en asesoría jurídica, contable, seguridad social y seguros. Más de 10 años de servicio valorados por nuestros clientes.',
          ),
        linksTitle: z.string().default('Enlaces'),
        servicesTitle: z.string().default('Servicios'),
        contactTitle: z.string().default('Contacto'),
        cityLine: z.string().default('Bucaramanga, Santander · Colombia'),
        copyrightSuffix: z.string().default('Todos los derechos reservados.'),
      })
      .default({
        description:
          'Firma especializada en asesoría jurídica, contable, seguridad social y seguros. Más de 10 años de servicio valorados por nuestros clientes.',
        linksTitle: 'Enlaces',
        servicesTitle: 'Servicios',
        contactTitle: 'Contacto',
        cityLine: 'Bucaramanga, Santander · Colombia',
        copyrightSuffix: 'Todos los derechos reservados.',
      }),
    cta: z
      .object({
        title: z.string().default('¿Necesitas asesoría profesional?'),
        subtitle: z
          .string()
          .default(
            'Contáctanos y recibe acompañamiento personalizado en seguridad social, asuntos jurídicos, contables y seguros.',
          ),
        whatsappLabel: z.string().default('Escríbenos por WhatsApp'),
        contactLabel: z.string().default('Ir a contacto'),
      })
      .default({
        title: '¿Necesitas asesoría profesional?',
        subtitle:
          'Contáctanos y recibe acompañamiento personalizado en seguridad social, asuntos jurídicos, contables y seguros.',
        whatsappLabel: 'Escríbenos por WhatsApp',
        contactLabel: 'Ir a contacto',
      }),
    home: z
      .object({
        heroImage: z.string().default('/images/hero/image.jpg'),
        heroPrimaryLabel: z.string().default('Conoce nuestros servicios'),
        heroSecondaryLabel: z.string().default('Escríbenos'),
        services: z
          .object({
            label: z.string().default('Qué hacemos'),
            title: z.string().default('Nuestros servicios'),
            intro: z
              .string()
              .default(
                'Acompañamos a personas y empresas con soluciones integrales que protegen su patrimonio, su salud y sus finanzas.',
              ),
            readMoreLabel: z.string().default('Conocer más'),
          })
          .default({
            label: 'Qué hacemos',
            title: 'Nuestros servicios',
            intro:
              'Acompañamos a personas y empresas con soluciones integrales que protegen su patrimonio, su salud y sus finanzas.',
            readMoreLabel: 'Conocer más',
          }),
        social: z
          .object({
            label: z.string().default('Seguridad social'),
            title: z
              .string()
              .default('Afíliate al sistema de seguridad social sin complicaciones'),
            text: z
              .string()
              .default(
                'Somos una firma especializada en prestar servicios de seguridad social para todos los sectores económicos: afiliaciones a salud, ARL, pensión y caja de compensación, con planes que se adaptan a tu presupuesto.',
              ),
            bulletPricePrefix: z.string().default('Planes desde'),
            bullets: z
              .array(z.string())
              .default([
                'Adscritos a La Equidad para riesgos laborales (ARL)',
                'Convenios para empresas y nóminas de empleados',
              ]),
            floatingTop: z.string().default('EPS · ARL'),
            floatingBottom: z.string().default('Pensión · Caja de compensación'),
            buttonLabel: z.string().default('Ver planes de afiliación'),
          })
          .default({
            label: 'Seguridad social',
            title: 'Afíliate al sistema de seguridad social sin complicaciones',
            text:
              'Somos una firma especializada en prestar servicios de seguridad social para todos los sectores económicos: afiliaciones a salud, ARL, pensión y caja de compensación, con planes que se adaptan a tu presupuesto.',
            bulletPricePrefix: 'Planes desde',
            bullets: [
              'Adscritos a La Equidad para riesgos laborales (ARL)',
              'Convenios para empresas y nóminas de empleados',
            ],
            floatingTop: 'EPS · ARL',
            floatingBottom: 'Pensión · Caja de compensación',
            buttonLabel: 'Ver planes de afiliación',
          }),
        news: z
          .object({
            label: z.string().default('Actualidad'),
            title: z.string().default('Noticias y publicaciones'),
            viewAll: z.string().default('Ver todas las noticias'),
          })
          .default({
            label: 'Actualidad',
            title: 'Noticias y publicaciones',
            viewAll: 'Ver todas las noticias',
          }),
        testimonials: z
          .object({
            label: z.string().default('Testimonios'),
            title: z.string().default('Lo que dicen nuestros clientes'),
            intro: z
              .string()
              .default(
                'Más de 10 años de servicio valorados por personas y empresas que confían en nuestra asesoría.',
              ),
          })
          .default({
            label: 'Testimonios',
            title: 'Lo que dicen nuestros clientes',
            intro:
              'Más de 10 años de servicio valorados por personas y empresas que confían en nuestra asesoría.',
          }),
        faq: z
          .object({
            label: z.string().default('Ayuda'),
            title: z.string().default('Preguntas frecuentes'),
            intro: z
              .string()
              .default(
                'Resolvemos las dudas más comunes. Si no encuentras la tuya, escríbenos por WhatsApp.',
              ),
          })
          .default({
            label: 'Ayuda',
            title: 'Preguntas frecuentes',
            intro: 'Resolvemos las dudas más comunes. Si no encuentras la tuya, escríbenos por WhatsApp.',
          }),
      })
      .default({
        heroImage: '/images/hero/image.jpg',
        heroPrimaryLabel: 'Conoce nuestros servicios',
        heroSecondaryLabel: 'Escríbenos',
        services: {
          label: 'Qué hacemos',
          title: 'Nuestros servicios',
          intro:
            'Acompañamos a personas y empresas con soluciones integrales que protegen su patrimonio, su salud y sus finanzas.',
          readMoreLabel: 'Conocer más',
        },
        social: {
          label: 'Seguridad social',
          title: 'Afíliate al sistema de seguridad social sin complicaciones',
          text:
            'Somos una firma especializada en prestar servicios de seguridad social para todos los sectores económicos: afiliaciones a salud, ARL, pensión y caja de compensación, con planes que se adaptan a tu presupuesto.',
          bulletPricePrefix: 'Planes desde',
          bullets: [
            'Adscritos a La Equidad para riesgos laborales (ARL)',
            'Convenios para empresas y nóminas de empleados',
          ],
          floatingTop: 'EPS · ARL',
          floatingBottom: 'Pensión · Caja de compensación',
          buttonLabel: 'Ver planes de afiliación',
        },
        news: { label: 'Actualidad', title: 'Noticias y publicaciones', viewAll: 'Ver todas las noticias' },
        testimonials: {
          label: 'Testimonios',
          title: 'Lo que dicen nuestros clientes',
          intro:
            'Más de 10 años de servicio valorados por personas y empresas que confían en nuestra asesoría.',
        },
        faq: {
          label: 'Ayuda',
          title: 'Preguntas frecuentes',
          intro: 'Resolvemos las dudas más comunes. Si no encuentras la tuya, escríbenos por WhatsApp.',
        },
      }),
    about: z
      .object({
        seoTitle: z.string().default('Quiénes Somos'),
        seoDescription: z
          .string()
          .default(
            'Conozca a HL Servicios Profesionales: más de 10 años de asesoría jurídica, contable y de seguridad social en Bucaramanga, Santander.',
          ),
        hero: z
          .object({
            title: z.string().default('Quiénes Somos'),
            subtitle: z
              .string()
              .default(
                'Más de 10 años brindando soluciones de éxito con una asesoría oportuna, sólida, honesta y confiable.',
              ),
            image: z.string().default('/images/firma-contrato.jpg'),
          })
          .default({
            title: 'Quiénes Somos',
            subtitle:
              'Más de 10 años brindando soluciones de éxito con una asesoría oportuna, sólida, honesta y confiable.',
            image: '/images/firma-contrato.jpg',
          }),
        label: z.string().default('Nuestra firma'),
        title: z.string().default('Soluciones de éxito para nuestros clientes'),
        paragraph1: z
          .string()
          .default(
            'HL Servicios Profesionales es una firma especializada en prestar servicios en seguridad social, dispuesta a brindarle la mejor asesoría en afiliaciones de salud, ARL, pensión y caja de compensación para todos los sectores económicos, además de servicios jurídicos, contables y de seguros.',
          ),
        paragraph2: z
          .string()
          .default(
            'Todos nuestros servicios cuentan con el respaldo de más de 10 años de servicio valorados por nuestros clientes: garantizamos una asesoría oportuna, sólida, honesta y confiable.',
          ),
        locationLabel: z.string().default('Ubicación'),
        founder: z
          .object({
            name: z.string().default('Henry López Beltrán'),
            role: z.string().default('Gerente General'),
            bio: z
              .string()
              .default(
                'Lidera la firma con una visión integral de la asesoría profesional en seguridad social, derecho, contabilidad y seguros.',
              ),
            image: z.string().default('/images/firma-contrato.jpg'),
          })
          .default({
            name: 'Henry López Beltrán',
            role: 'Gerente General',
            bio: 'Lidera la firma con una visión integral de la asesoría profesional en seguridad social, derecho, contabilidad y seguros.',
            image: '/images/firma-contrato.jpg',
          }),
        values: z
          .object({
            label: z.string().default('Nuestros principios'),
            title: z.string().default('Asesoría con valores'),
            intro: z
              .string()
              .default(
                'La confianza de nuestros clientes se construye sobre cuatro principios que nos guían en cada asesoría.',
              ),
          })
          .default({
            label: 'Nuestros principios',
            title: 'Asesoría con valores',
            intro:
              'La confianza de nuestros clientes se construye sobre cuatro principios que nos guían en cada asesoría.',
          }),
      })
      .default({
        seoTitle: 'Quiénes Somos',
        seoDescription:
          'Conozca a HL Servicios Profesionales: más de 10 años de asesoría jurídica, contable y de seguridad social en Bucaramanga, Santander.',
        hero: {
          title: 'Quiénes Somos',
          subtitle:
            'Más de 10 años brindando soluciones de éxito con una asesoría oportuna, sólida, honesta y confiable.',
          image: '/images/firma-contrato.jpg',
        },
        label: 'Nuestra firma',
        title: 'Soluciones de éxito para nuestros clientes',
        paragraph1:
          'HL Servicios Profesionales es una firma especializada en prestar servicios en seguridad social, dispuesta a brindarle la mejor asesoría en afiliaciones de salud, ARL, pensión y caja de compensación para todos los sectores económicos, además de servicios jurídicos, contables y de seguros.',
        paragraph2:
          'Todos nuestros servicios cuentan con el respaldo de más de 10 años de servicio valorados por nuestros clientes: garantizamos una asesoría oportuna, sólida, honesta y confiable.',
        locationLabel: 'Ubicación',
        founder: {
          name: 'Henry López Beltrán',
          role: 'Gerente General',
          bio: 'Lidera la firma con una visión integral de la asesoría profesional en seguridad social, derecho, contabilidad y seguros.',
          image: '/images/firma-contrato.jpg',
        },
        values: {
          label: 'Nuestros principios',
          title: 'Asesoría con valores',
          intro:
            'La confianza de nuestros clientes se construye sobre cuatro principios que nos guían en cada asesoría.',
        },
      }),
    servicesPage: z
      .object({
        seoTitle: z.string().default('Servicios'),
        seoDescription: z
          .string()
          .default(
            'Servicios jurídicos, contables, de seguridad social y seguros. Todos cuentan con el respaldo de más de 10 años de servicio.',
          ),
        hero: z
          .object({
            title: z.string().default('Nuestros Servicios'),
            subtitle: z
              .string()
              .default(
                'Soluciones de éxito: todos nuestros servicios cuentan con el respaldo de más de 10 años de servicio valorados por nuestros clientes. Garantizamos una asesoría oportuna, sólida, honesta y confiable.',
              ),
            image: z.string().default('/images/hero/image.jpg'),
          })
          .default({
            title: 'Nuestros Servicios',
            subtitle:
              'Soluciones de éxito: todos nuestros servicios cuentan con el respaldo de más de 10 años de servicio valorados por nuestros clientes. Garantizamos una asesoría oportuna, sólida, honesta y confiable.',
            image: '/images/hero/image.jpg',
          }),
        ctaLabel: z.string().default('Solicitar asesoría'),
      })
      .default({
        seoTitle: 'Servicios',
        seoDescription:
          'Servicios jurídicos, contables, de seguridad social y seguros. Todos cuentan con el respaldo de más de 10 años de servicio.',
        hero: {
          title: 'Nuestros Servicios',
          subtitle:
            'Soluciones de éxito: todos nuestros servicios cuentan con el respaldo de más de 10 años de servicio valorados por nuestros clientes. Garantizamos una asesoría oportuna, sólida, honesta y confiable.',
          image: '/images/hero/image.jpg',
        },
        ctaLabel: 'Solicitar asesoría',
      }),
    afiliacion: z
      .object({
        seoTitle: z.string().default('Cómo me afilio'),
        seoDescription: z
          .string()
          .default(
            'Conoce los planes de afiliación a seguridad social (salud, ARL, pensión y caja de compensación) y los requisitos para vincularte.',
          ),
        hero: z
          .object({
            title: z.string().default('¿Cómo me afilio?'),
            subtitle: z
              .string()
              .default(
                'Escoge tu mejor plan. Afiliaciones a salud, ARL, pensión y caja de compensación para todos los sectores económicos.',
              ),
            image: z.string().default('/images/seguridad-social/image.avif'),
          })
          .default({
            title: '¿Cómo me afilio?',
            subtitle:
              'Escoge tu mejor plan. Afiliaciones a salud, ARL, pensión y caja de compensación para todos los sectores económicos.',
            image: '/images/seguridad-social/image.avif',
          }),
        plansLabel: z.string().default('Planes de afiliación'),
        plansTitle: z.string().default('Escoge tu mejor plan'),
        planColumnHeader: z.string().default('Plan'),
        plansWhatsappTemplate: z
          .string()
          .default('Hola, estoy interesado en el {plan} {combinacion} por valor de {precio} mensuales'),
        plansHint: z.string().default('Haz clic en una combinación para cotizarla por WhatsApp.'),
        requirements: z
          .object({
            label: z.string().default('Vinculación'),
            title: z
              .string()
              .default('Requisitos para la vinculación al sistema de seguridad social'),
            intro: z
              .string()
              .default(
                'Prepara los siguientes documentos para agilizar tu afiliación. Te acompañamos durante todo el proceso.',
              ),
            whatsappButton: z.string().default('Consultar por WhatsApp'),
            whatsappMessage: z
              .string()
              .default(
                'Hola, quiero información sobre los requisitos de afiliación a seguridad social.',
              ),
          })
          .default({
            label: 'Vinculación',
            title: 'Requisitos para la vinculación al sistema de seguridad social',
            intro:
              'Prepara los siguientes documentos para agilizar tu afiliación. Te acompañamos durante todo el proceso.',
            whatsappButton: 'Consultar por WhatsApp',
            whatsappMessage:
              'Hola, quiero información sobre los requisitos de afiliación a seguridad social.',
          }),
      })
      .default({
        seoTitle: 'Cómo me afilio',
        seoDescription:
          'Conoce los planes de afiliación a seguridad social (salud, ARL, pensión y caja de compensación) y los requisitos para vincularte.',
        hero: {
          title: '¿Cómo me afilio?',
          subtitle:
            'Escoge tu mejor plan. Afiliaciones a salud, ARL, pensión y caja de compensación para todos los sectores económicos.',
          image: '/images/seguridad-social/image.avif',
        },
        plansLabel: 'Planes de afiliación',
        plansTitle: 'Escoge tu mejor plan',
        planColumnHeader: 'Plan',
        plansWhatsappTemplate:
          'Hola, estoy interesado en el {plan} {combinacion} por valor de {precio} mensuales',
        plansHint: 'Haz clic en una combinación para cotizarla por WhatsApp.',
        requirements: {
          label: 'Vinculación',
          title: 'Requisitos para la vinculación al sistema de seguridad social',
          intro:
            'Prepara los siguientes documentos para agilizar tu afiliación. Te acompañamos durante todo el proceso.',
          whatsappButton: 'Consultar por WhatsApp',
          whatsappMessage:
            'Hola, quiero información sobre los requisitos de afiliación a seguridad social.',
        },
      }),
    contact: z
      .object({
        seoTitle: z.string().default('Contacto'),
        seoDescription: z
          .string()
          .default(
            'Contáctanos para recibir asesoría en seguridad social, servicios jurídicos, contables y seguros en Bucaramanga.',
          ),
        hero: z
          .object({
            title: z.string().default('Contacto'),
            subtitle: z
              .string()
              .default(
                'Estamos para ayudarte. Escríbenos, llámanos o visítanos en nuestras oficinas de Bucaramanga.',
              ),
            image: z.string().default('/images/seguros/image.jpg'),
          })
          .default({
            title: 'Contacto',
            subtitle:
              'Estamos para ayudarte. Escríbenos, llámanos o visítanos en nuestras oficinas de Bucaramanga.',
            image: '/images/seguros/image.jpg',
          }),
        label: z.string().default('Escríbenos'),
        title: z.string().default('Solicita tu asesoría'),
        intro: z
          .string()
          .default(
            'Completa el formulario y te responderemos a la brevedad. También puedes escribirnos por WhatsApp para una respuesta inmediata.',
          ),
        form: z
          .object({
            action: z.string().default('https://formspree.io/f/YOUR_FORM_ID'),
            nameLabel: z.string().default('Nombre completo *'),
            namePlaceholder: z.string().default('Tu nombre'),
            phoneLabel: z.string().default('Teléfono *'),
            phonePlaceholder: z.string().default('300 123 4567'),
            emailLabel: z.string().default('Correo electrónico'),
            emailPlaceholder: z.string().default('tucorreo@ejemplo.com'),
            serviceLabel: z.string().default('Servicio de interés *'),
            servicePlaceholder: z.string().default('Selecciona un servicio'),
            serviceOptions: z
              .array(z.object({ value: z.string(), label: z.string() }))
              .default([
                { value: 'juridicos', label: 'Servicios Jurídicos' },
                { value: 'contables', label: 'Servicios Contables' },
                { value: 'seguridad-social', label: 'Seguridad Social' },
                { value: 'seguros', label: 'Seguros' },
                { value: 'otro', label: 'Otro' },
              ]),
            messageLabel: z.string().default('Mensaje *'),
            messagePlaceholder: z
              .string()
              .default('Cuéntanos cómo podemos ayudarte...'),
            submitLabel: z.string().default('Enviar mensaje'),
          })
          .default({
            action: 'https://formspree.io/f/YOUR_FORM_ID',
            nameLabel: 'Nombre completo *',
            namePlaceholder: 'Tu nombre',
            phoneLabel: 'Teléfono *',
            phonePlaceholder: '300 123 4567',
            emailLabel: 'Correo electrónico',
            emailPlaceholder: 'tucorreo@ejemplo.com',
            serviceLabel: 'Servicio de interés *',
            servicePlaceholder: 'Selecciona un servicio',
            serviceOptions: [
              { value: 'juridicos', label: 'Servicios Jurídicos' },
              { value: 'contables', label: 'Servicios Contables' },
              { value: 'seguridad-social', label: 'Seguridad Social' },
              { value: 'seguros', label: 'Seguros' },
              { value: 'otro', label: 'Otro' },
            ],
            messageLabel: 'Mensaje *',
            messagePlaceholder: 'Cuéntanos cómo podemos ayudarte...',
            submitLabel: 'Enviar mensaje',
          }),
        infoTitle: z.string().default('Información de contacto'),
        whatsappButton: z.string().default('WhatsApp directo'),
        instagramButton: z.string().default('Síguenos en Instagram'),
        map: z
          .object({
            label: z.string().default('Nuestra oficina'),
            directionsLabel: z.string().default('Cómo llegar'),
            embedUrl: z
              .string()
              .default('https://www.google.com/maps?q=7.1181443,-73.127934&z=18&output=embed'),
            directionsUrl: z.string().default(''),
            lat: z.number().default(7.1181443),
            lng: z.number().default(-73.127934),
          })
          .default({
            label: 'Nuestra oficina',
            directionsLabel: 'Cómo llegar',
            embedUrl: 'https://www.google.com/maps?q=7.1181443,-73.127934&z=18&output=embed',
            directionsUrl: '',
            lat: 7.1181443,
            lng: -73.127934,
          }),
      })
      .default({
        seoTitle: 'Contacto',
        seoDescription:
          'Contáctanos para recibir asesoría en seguridad social, servicios jurídicos, contables y seguros en Bucaramanga.',
        hero: {
          title: 'Contacto',
          subtitle:
            'Estamos para ayudarte. Escríbenos, llámanos o visítanos en nuestras oficinas de Bucaramanga.',
          image: '/images/seguros/image.jpg',
        },
        label: 'Escríbenos',
        title: 'Solicita tu asesoría',
        intro:
          'Completa el formulario y te responderemos a la brevedad. También puedes escribirnos por WhatsApp para una respuesta inmediata.',
        form: {
          action: 'https://formspree.io/f/YOUR_FORM_ID',
          nameLabel: 'Nombre completo *',
          namePlaceholder: 'Tu nombre',
          phoneLabel: 'Teléfono *',
          phonePlaceholder: '300 123 4567',
          emailLabel: 'Correo electrónico',
          emailPlaceholder: 'tucorreo@ejemplo.com',
          serviceLabel: 'Servicio de interés *',
          servicePlaceholder: 'Selecciona un servicio',
          serviceOptions: [
            { value: 'juridicos', label: 'Servicios Jurídicos' },
            { value: 'contables', label: 'Servicios Contables' },
            { value: 'seguridad-social', label: 'Seguridad Social' },
            { value: 'seguros', label: 'Seguros' },
            { value: 'otro', label: 'Otro' },
          ],
          messageLabel: 'Mensaje *',
          messagePlaceholder: 'Cuéntanos cómo podemos ayudarte...',
          submitLabel: 'Enviar mensaje',
        },
        infoTitle: 'Información de contacto',
        whatsappButton: 'WhatsApp directo',
        instagramButton: 'Síguenos en Instagram',
        map: {
          label: 'Nuestra oficina',
          directionsLabel: 'Cómo llegar',
          embedUrl: 'https://www.google.com/maps?q=7.1181443,-73.127934&z=18&output=embed',
          directionsUrl: '',
          lat: 7.1181443,
          lng: -73.127934,
        },
      }),
    news: z
      .object({
        seoTitle: z.string().default('Noticias'),
        seoDescription: z
          .string()
          .default(
            'Noticias y publicaciones sobre seguridad social, derecho laboral y temas de actualidad que afectan a nuestros clientes.',
          ),
        hero: z
          .object({
            title: z.string().default('Noticias'),
            subtitle: z
              .string()
              .default(
                'Publicaciones y temas de actualidad sobre seguridad social, derecho laboral y asesoría profesional.',
              ),
            image: z.string().default('/images/juridicos/image.jpg'),
          })
          .default({
            title: 'Noticias',
            subtitle:
              'Publicaciones y temas de actualidad sobre seguridad social, derecho laboral y asesoría profesional.',
            image: '/images/juridicos/image.jpg',
          }),
        empty: z.string().default('Aún no hay publicaciones.'),
      })
      .default({
        seoTitle: 'Noticias',
        seoDescription:
          'Noticias y publicaciones sobre seguridad social, derecho laboral y temas de actualidad que afectan a nuestros clientes.',
        hero: {
          title: 'Noticias',
          subtitle:
            'Publicaciones y temas de actualidad sobre seguridad social, derecho laboral y asesoría profesional.',
          image: '/images/juridicos/image.jpg',
        },
        empty: 'Aún no hay publicaciones.',
      }),
    blog: z
      .object({
        authorLabel: z.string().default('Por Henry López'),
        tagsLabel: z.string().default('Etiquetas:'),
        backLabel: z.string().default('Volver a noticias'),
        readMoreLabel: z.string().default('Leer más'),
      })
      .default({
        authorLabel: 'Por Henry López',
        tagsLabel: 'Etiquetas:',
        backLabel: 'Volver a noticias',
        readMoreLabel: 'Leer más',
      }),
  }),
});

export const collections = { site, afiliacion, services, testimonials, faqs, blog, textos, pages };
