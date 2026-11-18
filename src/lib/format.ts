export function formatDate(date: Date): string {
  // Las fechas del contenido son solo día (p. ej. 2019-02-01), que Astro parsea
  // como medianoche UTC. Formatear en UTC evita que un build en una zona al
  // oeste de Greenwich (Bogotá) muestre el día anterior.
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}
