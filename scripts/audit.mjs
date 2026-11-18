// Auditoría de dependencias para el flujo de CI.
//
// `npm audit --audit-level=high` no sirve tal cual: npm agrega los avisos por
// paquete, así que un mismo nodo recibe el rango unión de todos sus avisos y la
// severidad del peor de ellos. Eso hace que `astro` aparezca como «critical»
// aunque ningún aviso cubra la versión instalada (el crítico termina en 7.2.8 y
// aquí hay 7.4.13).
//
// Este script revisa aviso por aviso contra la versión realmente instalada y
// solo bloquea lo que se puede arreglar sin cambiar de versión mayor:
//   · aplicable + alta o crítica + `fixAvailable: true`  → falla (hay parche).
//   · aplicable + alta o crítica + solo con salto mayor  → avisa, no falla.
//   · ningún aviso aplicable a la versión instalada      → lo ignora y lo dice.
//
// Uso:
//   node scripts/audit.mjs              # ejecuta npm audit
//   node scripts/audit.mjs --from x.json  # analiza una salida ya guardada

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// `semver` no está declarado en package.json, pero npm lo instala por las
// dependencias de Astro. Si no estuviera, se trata todo aviso como aplicable:
// el flujo se vuelve más estricto, nunca más laxo.
let semver = null;
try {
  semver = require('semver');
} catch {
  semver = null;
}

const archivo = process.argv.indexOf('--from');
let salida;
if (archivo !== -1) {
  salida = readFileSync(process.argv[archivo + 1], 'utf8');
} else {
  // Comando fijo, sin datos del usuario: con `execSync` funciona igual en
  // Windows (`npm.cmd` no se puede lanzar sin shell) y en Linux.
  try {
    salida = execSync('npm audit --json', { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  } catch (error) {
    // npm sale con código 1 cuando encuentra algo; el JSON viene igual.
    salida = error.stdout?.toString() ?? '';
  }
}

let informe;
try {
  informe = JSON.parse(salida || '{}');
} catch {
  console.error('No se pudo leer el informe de npm audit.');
  process.exit(2);
}

// Si npm no llegó a ejecutarse, el JSON llega vacío: hay que fallar, nunca
// dar por buena una auditoría que no se hizo.
if (!informe || typeof informe.vulnerabilities !== 'object' || informe.vulnerabilities === null) {
  console.error('npm audit no devolvió un informe válido; revisa la instalación de npm.');
  process.exit(2);
}

// La versión se lee del lockfile, que sí conoce las copias anidadas (y no falla
// con los paquetes cuyo `exports` esconde el package.json, como sharp).
const lock = (() => {
  try {
    return JSON.parse(readFileSync('package-lock.json', 'utf8'));
  } catch {
    return null;
  }
})();

const versionInstalada = (nombre, dato) => {
  for (const ruta of dato.nodes ?? []) {
    const version = lock?.packages?.[ruta]?.version;
    if (version) return version;
  }
  try {
    return require(`${nombre}/package.json`).version;
  } catch {
    return null;
  }
};

const aplica = (version, rango) => {
  if (!version) return true; // sin versión a mano, se asume afectada
  if (!semver) return true;
  return semver.satisfies(version, rango, { includePrerelease: true });
};

const peso = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 };

const bloqueantes = [];
const avisos = [];
const ignoradas = [];

for (const [nombre, dato] of Object.entries(informe.vulnerabilities ?? {})) {
  const version = versionInstalada(nombre, dato);
  const propios = (dato.via ?? []).filter((via) => typeof via === 'object');

  // Un nodo puede venir marcado solo por propagación (su `via` son nombres de
  // otros paquetes). Esos no se evalúan aquí: se evalúa el paquete de origen.
  if (!propios.length) continue;

  const aplicables = propios.filter((via) => aplica(version, via.range));
  if (!aplicables.length) {
    ignoradas.push({ nombre, version, severidad: dato.severity });
    continue;
  }

  const peor = aplicables.reduce((a, b) => (peso[b.severity] > peso[a.severity] ? b : a));
  if (peso[peor.severity] < peso.high) continue;

  const arreglo = dato.fixAvailable;
  const tieneParche = arreglo === true;
  const soloMayor = typeof arreglo === 'object' && arreglo?.isSemVerMajor === true;

  const linea = {
    nombre,
    version,
    severidad: peor.severity,
    rango: peor.range,
    aviso: (peor.url ?? '').split('/').pop() ?? '',
    arreglo: tieneParche ? 'parche disponible' : soloMayor ? 'requiere salto de versión mayor' : 'sin parche',
  };

  if (tieneParche) bloqueantes.push(linea);
  else avisos.push(linea);
}

const escribir = (titulo, lista) => {
  if (!lista.length) return;
  console.log(`\n${titulo} (${lista.length}):`);
  for (const v of lista) {
    console.log(`  · ${v.nombre}@${v.version} — ${v.severidad} — ${v.aviso || v.rango} — ${v.arreglo}`);
  }
};

console.log('Auditoría de dependencias');
escribir('Bloqueantes: hay vulnerabilidad y parche sin romper nada', bloqueantes);
escribir('Avisos: hay vulnerabilidad, pero el parche pide cambiar de versión mayor', avisos);
if (ignoradas.length) {
  console.log(`\nIgnoradas (${ignoradas.length}): npm marca el paquete, pero ningún aviso cubre la versión instalada`);
  for (const v of ignoradas) console.log(`  · ${v.nombre}@${v.version ?? '?'} — npm dice ${v.severidad}`);
}

if (bloqueantes.length) {
  console.log('\nFalla: corrige las bloqueantes con `npm audit fix`.');
  process.exit(1);
}

console.log('\nSin vulnerabilidades pendientes que se puedan parchear.');
