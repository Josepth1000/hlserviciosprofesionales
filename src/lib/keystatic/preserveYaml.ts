import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parse, parseDocument } from 'yaml';

/**
 * Keystatic reescribe el archivo YAML completo cada vez que se guarda: quita
 * los comentarios, convierte los bloques `|` en `>` y reordena algunas claves.
 * El contenido es el mismo, pero el diff de git deja de mostrar solo el campo
 * editado.
 *
 * Estas funciones leen el texto original de los archivos que el guardado va a
 * reescribir y, después de guardar, aplican al original únicamente los valores
 * que cambiaron. Así se conservan comentarios, estilos de bloque y orden.
 */

type UpdateBody = { additions?: Array<{ path?: unknown; contents?: unknown }> };

type Change = { path: Array<string | number>; value: unknown };

export type PendingYamlFile = { file: string; original: string };

// Solo se tocan archivos de contenido en formato YAML.
const YAML_PATH = /^src[\\/]content[\\/][\w./-]+\.ya?ml$/;

function decodeBody(raw: string): UpdateBody | null {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as UpdateBody) : null;
  } catch {
    return null;
  }
}

// Keystatic envía el contenido en base64url.
function decodeContents(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  let normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  while (normalized.length % 4) normalized += '=';
  return Buffer.from(normalized, 'base64').toString('utf8');
}

function resolveFile(value: unknown): string | null {
  if (typeof value !== 'string' || !YAML_PATH.test(value)) return null;
  const root = path.resolve(process.cwd(), 'src/content');
  const file = path.resolve(process.cwd(), value);
  return file.startsWith(root + path.sep) ? file : null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((key) => key in b && deepEqual(a[key], b[key]));
  }
  return false;
}

// Recorre ambos documentos y devuelve solo las hojas que cambiaron. Los arrays
// que crecen o se acortan se reemplazan completos para no dejar huecos.
function collectChanges(previous: unknown, next: unknown, prefix: Array<string | number> = [], changes: Change[] = []): Change[] {
  if (deepEqual(previous, next)) return changes;

  if (isPlainObject(previous) && isPlainObject(next)) {
    for (const key of Object.keys(next)) collectChanges(previous[key], next[key], [...prefix, key], changes);
    for (const key of Object.keys(previous)) {
      if (!(key in next)) changes.push({ path: [...prefix, key], value: undefined });
    }
    return changes;
  }

  if (Array.isArray(previous) && Array.isArray(next) && previous.length === next.length) {
    next.forEach((item, index) => collectChanges(previous[index], item, [...prefix, index], changes));
    return changes;
  }

  changes.push({ path: prefix, value: next });
  return changes;
}

/** Texto del YAML con el formato original y solo los valores actualizados. */
export function mergeYaml(original: string, updated: string): string | null {
  const document = parseDocument(original);
  if (document.errors.length) return null;

  let next: unknown;
  try {
    next = parse(updated);
  } catch {
    return null;
  }
  if (!isPlainObject(next)) return null;

  for (const change of collectChanges(document.toJS(), next)) {
    if (!change.path.length) return null;
    if (change.value === undefined) document.deleteIn(change.path);
    else document.setIn(change.path, change.value);
  }

  // Se usa el ancho de línea por defecto (80): es el que ya tienen los bloques
  // plegados del original, así que no se reajustan al volver a escribirlos.
  const text = document.toString();

  // Si el resultado no dice lo mismo que escribió Keystatic, se descarta.
  try {
    return deepEqual(parse(text), next) ? text : null;
  } catch {
    return null;
  }
}

/** Texto actual de los YAML que el guardado va a reescribir. */
export async function readPendingYaml(rawBody: string): Promise<PendingYamlFile[]> {
  const body = decodeBody(rawBody);
  if (!body?.additions) return [];

  const files: PendingYamlFile[] = [];
  for (const addition of body.additions) {
    const file = resolveFile(addition?.path);
    if (!file) continue;
    try {
      files.push({ file, original: await readFile(file, 'utf8') });
    } catch {
      // Archivo nuevo: no hay formato original que conservar.
    }
  }
  return files;
}

/** Devuelve a cada YAML su formato original conservando los valores guardados. */
export async function restoreOriginalFormat(rawBody: string, pending: PendingYamlFile[]): Promise<void> {
  if (!pending.length) return;

  const body = decodeBody(rawBody);
  if (!body?.additions) return;

  const originals = new Map(pending.map((entry) => [entry.file, entry.original]));

  for (const addition of body.additions) {
    const file = resolveFile(addition?.path);
    if (!file) continue;

    const original = originals.get(file);
    const updated = decodeContents(addition?.contents);
    if (original === undefined || updated === null) continue;

    const merged = mergeYaml(original, updated);
    if (!merged || merged === updated) continue;

    try {
      await writeFile(file, merged, 'utf8');
    } catch {
      // Si no se puede escribir, se deja lo que guardó Keystatic.
    }
  }
}
