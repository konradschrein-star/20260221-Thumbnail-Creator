'use client';

import { colors, spacing, borderRadius } from '../../styles';

interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
}

export default function ErrorMessage({ message, onDismiss }: ErrorMessageProps) {
  if (!message) return null;

  return (
    <div
      style={{
        backgroundColor: colors.errorLight,
        border: `1px solid ${colors.error}`,
        color: colors.error,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.md,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div style={{ flex: 1 }}>
        <strong>Error:</strong> {message}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.25rem',
            cursor: 'pointer',
            color: colors.error,
            padding: spacing.sm,
            marginLeft: spacing.md,
          }}
          aria-label="Dismiss error"
        >
          ×
        </button>
      )}
    </div>
  );
}
