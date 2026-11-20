/**
 * IP sin la parte que identifica a una persona. Los informes de CSP solo se usan
 * para ver qué recurso se bloquea y cuántas veces; con la red (/24 en IPv4, /48
 * en IPv6) basta para agrupar los avisos de una misma conexión sin guardar la
 * dirección completa, que es lo que promete el aviso de privacidad.
 */
export function redactarIp(ip: string): string {
  const ipv4 = ip.match(/^(\d{1,3}(?:\.\d{1,3}){2})\.\d{1,3}$/);
  if (ipv4) return `${ipv4[1]}.0`;
  if (ip.startsWith(':')) return '::';
  if (ip.includes(':')) {
    const grupos = ip.split(':').filter(Boolean).slice(0, 3);
    return grupos.length ? `${grupos.join(':')}::` : '::';
  }
  return 'desconocida';
}
