'use client';

import { colors, commonStyles, spacing } from '../../styles';

interface InputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'number';
  error?: string;
  required?: boolean;
  disabled?: boolean;
  multiline?: boolean;
  rows?: number;
  minLength?: number;
  maxLength?: number;
}

export default function Input({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  error,
  required = false,
  disabled = false,
  multiline = false,
  rows = 4,
  minLength,
  maxLength,
}: InputProps) {
  const inputStyle = multiline ? commonStyles.textarea : commonStyles.input;

  const Component = multiline ? 'textarea' : 'input';

  return (
    <div style={{ marginBottom: spacing.md }}>
      {label && (
        <label
          style={{
            display: 'block',
            marginBottom: spacing.sm,
            fontWeight: '500',
            color: colors.text,
          }}
        >
          {label}
          {required && <span style={{ color: colors.error }}> *</span>}
        </label>
      )}

      <Component
        {...(multiline ? { rows } : { type })}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        minLength={minLength}
        maxLength={maxLength}
        style={{
          ...inputStyle,
          borderColor: error ? colors.error : colors.border,
          backgroundColor: disabled ? colors.backgroundDark : colors.white,
          cursor: disabled ? 'not-allowed' : 'text',
        }}
      />

      {error && (
        <div
          style={{
            marginTop: spacing.sm,
            color: colors.error,
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      )}

      {maxLength && (
        <div
          style={{
            marginTop: spacing.xs,
            color: colors.textMuted,
            fontSize: '0.75rem',
            textAlign: 'right',
          }}
        >
          {value.length} / {maxLength}
        </div>
      )}
    </div>
  );
}
