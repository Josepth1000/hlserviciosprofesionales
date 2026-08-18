import { createElement, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { fields } from '@keystatic/core';
import type { AssetFormField, FormFieldInputProps } from '@keystatic/core';

/**
 * Campo de imagen personalizado para el panel de Keystatic.
 *
 * Reutiliza toda la maquinaria de `fields.image` (subida, parseo, escritura de
 * archivos) y solo sustituye la interfaz:
 *  - Con imagen: preview en vivo de la imagen publicada.
 *  - Sin imagen: un avatar en la zona de preview indicando que no hay imagen
 *    cargada o publicada.
 *
 * La tipografía (fuente, tamaños y pesos) replica la de los campos nativos del
 * panel para que el campo se vea idéntico al resto de elementos del formulario.
 */

export type ImageFieldValue = { data: Uint8Array; extension: string; filename: string } | null;

type ImageFieldConfig = {
  label: string;
  description?: string;
  directory?: string;
  publicPath?: string;
};

// Misma pila de fuentes que usan las etiquetas y descripciones del panel.
const UI_FONT = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

// Estilos de la etiqueta y descripción: iguales a los de los demás campos
// (FieldLabel 14px/500 y FieldDescription 12px/400 del panel).
const labelStyle: CSSProperties = {
  display: 'block',
  fontFamily: UI_FONT,
  fontSize: 14,
  fontWeight: 500,
  lineHeight: 1.4,
  color: 'inherit',
};
const descriptionStyle: CSSProperties = {
  display: 'block',
  marginTop: 2,
  fontFamily: UI_FONT,
  fontSize: 12,
  fontWeight: 400,
  lineHeight: 1.4,
  color: 'inherit',
  opacity: 0.65,
};
const textStyle: CSSProperties = {
  fontFamily: UI_FONT,
  color: 'inherit',
};
// Botones con la apariencia de los ActionButton del panel (16px, radio 9px).
const buttonBaseStyle: CSSProperties = {
  fontFamily: 'inherit',
  fontSize: 16,
  fontWeight: 400,
  padding: '3px 10px',
  borderRadius: 9,
  cursor: 'pointer',
  transition: 'background-color .15s ease, border-color .15s ease, box-shadow .15s ease',
};

export function imageField(config: ImageFieldConfig): AssetFormField<ImageFieldValue, ImageFieldValue, string | null> {
  // Toda la lógica de assets/subida/lectura viene de fields.image.
  const base = fields.image(config);

  return {
    ...base,
    Input(props: FormFieldInputProps<ImageFieldValue>) {
      return createElement(ImageFieldWithPreview, {
        ...props,
        label: config.label,
        description: config.description,
        publicPath: config.publicPath ?? '',
      });
    },
  };
}

/** Abre el selector de archivos y devuelve el contenido + nombre del archivo. */
function pickImageFile(): Promise<{ content: Uint8Array; filename: string } | undefined> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.style.display = 'none';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(undefined);
        return;
      }
      file.arrayBuffer().then((buf) => resolve({ content: new Uint8Array(buf), filename: file.name }));
    };
    document.body.appendChild(input);
    input.click();
  });
}

function ImageFieldWithPreview({
  value,
  onChange,
  label,
  description,
  publicPath,
}: FormFieldInputProps<ImageFieldValue> & { label: string; description?: string; publicPath: string }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!value?.data) {
      setObjectUrl(null);
      return;
    }
    // Copia exacta del buffer para que sea un ArrayBuffer puro (BlobPart).
    const bytes = value.data.buffer.slice(
      value.data.byteOffset,
      value.data.byteOffset + value.data.byteLength,
    ) as ArrayBuffer;
    const url = URL.createObjectURL(
      new Blob([bytes], { type: value.extension === 'svg' ? 'image/svg+xml' : undefined }),
    );
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value?.data, value?.extension]);

  const hasValue = value !== null;
  // Si el blob no está disponible (p. ej. archivo preexistente), se muestra la
  // ruta publicada real (publicPath + nombre de archivo).
  const publishedPath = value ? `${publicPath.replace(/\/+$/, '')}/${value.filename}` : null;
  const previewSrc = objectUrl ?? publishedPath;

  async function onPick() {
    const file = await pickImageFile();
    if (!file) return;
    const match = file.filename.match(/\.([^.]+$)/);
    const extension = match ? match[1] : '';
    if (!extension) return;
    onChange({ data: file.content, extension, filename: file.filename });
  }

  return (
    <div style={{ minWidth: 0 }}>
      {/* Etiqueta + descripción (tipografía nativa del panel) */}
      <span style={labelStyle}>{label}</span>
      {description && <span style={descriptionStyle}>{description}</span>}

      {/* Vista previa (o avatar indicando que no hay imagen) */}
      <div
        style={{
          marginTop: 8,
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid rgba(127,127,127,.35)',
          background: 'rgba(127,127,127,.06)',
        }}
      >
        {hasValue && previewSrc ? (
          <div style={{ position: 'relative' }}>
            <img
              src={previewSrc}
              alt={`Vista previa de ${label}`}
              className="hl-img-preview-img"
              style={{
                display: 'block',
                width: '100%',
                height: 'auto',
                maxHeight: 150,
                objectFit: 'cover',
                background: '#0b0b0d',
              }}
            />
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '26px 16px',
            }}
          >
            {/* Avatar circular indicando que no hay imagen */}
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(127,127,127,.16)',
                boxShadow: 'inset 0 0 0 1px rgba(127,127,127,.45)',
                color: 'rgba(127,127,127,.75)',
              }}
              aria-hidden="true"
            >
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
            </div>
            <p style={{ ...textStyle, margin: 0, fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>Sin imagen</p>
            <p style={{ ...textStyle, margin: 0, fontSize: 12, lineHeight: 1.4, opacity: 0.65 }}>
              No hay imagen cargada o publicada.
            </p>
          </div>
        )}
      </div>

      {/* Estado + ruta de la imagen publicada */}
      {hasValue && (
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              ...textStyle,
              fontSize: 12,
              fontWeight: 600,
              padding: '3px 10px',
              borderRadius: 999,
              background: 'rgba(201,162,39,.18)',
              color: '#a9831f',
              boxShadow: 'inset 0 0 0 1px rgba(201,162,39,.4)',
            }}
          >
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            Imagen cargada y publicada
          </span>
          {publishedPath && (
            <span style={{ ...textStyle, fontSize: 11, opacity: 0.55, wordBreak: 'break-all' }}>{publishedPath}</span>
          )}
        </div>
      )}

      {/* Botones de acción */}
      <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={onPick}
          style={{
            ...buttonBaseStyle,
            border: '1px solid rgba(127,127,127,.45)',
            background: 'transparent',
            color: 'inherit',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(201,162,39,.8)';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(201,162,39,.18)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(127,127,127,.45)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          Escoger imagen
        </button>
        {hasValue && (
          <button
            type="button"
            onClick={() => onChange(null)}
            style={{
              ...buttonBaseStyle,
              border: '1px solid transparent',
              background: 'transparent',
              color: 'rgba(200,90,80,.95)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(200,90,80,.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            Eliminar
          </button>
        )}
      </div>
    </div>
  );
}
