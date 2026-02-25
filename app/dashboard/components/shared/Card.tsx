'use client';

import { colors, commonStyles, spacing } from '../../styles';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  style?: React.CSSProperties;
}

export default function Card({ children, title, style = {} }: CardProps) {
  return (
    <div style={{ ...commonStyles.card, ...style }}>
      {title && (
        <h3
          style={{
            marginTop: 0,
            marginBottom: spacing.md,
            color: colors.text,
            fontSize: '1.25rem',
          }}
        >
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
