import type { BasicFormField, FormFieldInputProps } from '@keystatic/core';

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const INVALID_MSG = 'Debe ser un color en formato hexadecimal, p. ej. #C9A227';

/**
 * Campo personalizado de color para Keystatic:
 * - Preview del color en vivo
 * - Selector nativo de color (clic en el swatch)
 * - Entrada del código hexadecimal a mano
 *
 * El valor guardado es el hex en mayúsculas (p. ej. #C9A227), igual que el
 * campo de texto anterior, así que el resto del sitio no cambia.
 */
export function colorField(options: { label: string; defaultValue?: string }): BasicFormField<string> {
  const defaultValue = options.defaultValue ?? '#C9A227';

  function assertValidHex(value: string): string {
    if (!HEX_RE.test(value)) throw new Error(INVALID_MSG);
    return value;
  }

  return {
    kind: 'form',
    label: options.label,
    Input(props) {
      return <ColorFieldInput {...props} label={options.label} />;
    },
    defaultValue() {
      return defaultValue;
    },
    parse(value) {
      if (typeof value !== 'string') throw new Error(INVALID_MSG);
      return assertValidHex(value);
    },
    serialize(value) {
      return { value: assertValidHex(value) };
    },
    validate(value) {
      return assertValidHex(value);
    },
    reader: {
      parse(value) {
        if (typeof value === 'string' && HEX_RE.test(value)) return value;
        return defaultValue;
      },
    },
  };
}

function ColorFieldInput({
  value,
  onChange,
  label,
}: FormFieldInputProps<string> & { label: string }) {
  const current = HEX_RE.test(value) ? value : '#C9A227';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {/* Swatch con selector nativo de color */}
      <label
        title="Seleccionar color"
        aria-label={`Seleccionar color (${label})`}
        style={{
          position: 'relative',
          width: 44,
          height: 44,
          flexShrink: 0,
          borderRadius: 10,
          overflow: 'hidden',
          cursor: 'pointer',
          background: current,
          boxShadow: 'inset 0 0 0 1px rgba(127,127,127,.4)',
        }}
      >
        <input
          type="color"
          value={current}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          style={{
            position: 'absolute',
            inset: -14,
            width: 72,
            height: 72,
            border: 0,
            padding: 0,
            margin: 0,
            opacity: 0,
            cursor: 'pointer',
          }}
        />
      </label>

      {/* Entrada hexadecimal editable */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#C9A227"
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        aria-label={`Código hexadecimal (${label})`}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'rgba(127,127,127,.8)';
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(201,162,39,.25)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'rgba(127,127,127,.4)';
          e.currentTarget.style.boxShadow = 'none';
        }}
        style={{
          width: '100%',
          minWidth: 0,
          fontFamily: 'inherit',
          fontSize: 14,
          lineHeight: 1.5,
          padding: '9px 12px',
          borderRadius: 8,
          border: '1px solid rgba(127,127,127,.4)',
          background: 'transparent',
          color: 'inherit',
          outline: 'none',
          transition: 'border-color .15s ease, box-shadow .15s ease',
        }}
      />
    </div>
  );
}
