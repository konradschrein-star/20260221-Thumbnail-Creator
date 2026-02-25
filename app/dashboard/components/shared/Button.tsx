'use client';

import { colors, commonStyles } from '../../styles';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';
export type ButtonSize = 'normal' | 'small';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  style?: React.CSSProperties;
}

export default function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'normal',
  disabled = false,
  type = 'button',
  style = {},
}: ButtonProps) {
  const baseStyle = {
    ...commonStyles.button,
    ...(size === 'small' ? commonStyles.buttonSmall : {}),
  };

  const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      backgroundColor: disabled ? colors.textMuted : colors.primary,
      color: colors.white,
    },
    secondary: {
      backgroundColor: disabled ? colors.backgroundDark : colors.background,
      color: disabled ? colors.textMuted : colors.text,
      border: `1px solid ${colors.border}`,
    },
    danger: {
      backgroundColor: disabled ? colors.textMuted : colors.danger,
      color: colors.white,
    },
  };

  const hoverStyle = !disabled ? {
    ':hover': {
      primary: { backgroundColor: colors.primaryHover },
      secondary: { backgroundColor: colors.backgroundDark },
      danger: { backgroundColor: colors.dangerHover },
    }[variant],
  } : {};

  return (
    <button
      type={type}
      onClick={(e) => onClick && onClick(e)}
      disabled={disabled}
      style={{
        ...baseStyle,
        ...variantStyles[variant],
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled && variant === 'primary') {
          e.currentTarget.style.backgroundColor = colors.primaryHover;
        } else if (!disabled && variant === 'danger') {
          e.currentTarget.style.backgroundColor = colors.dangerHover;
        } else if (!disabled && variant === 'secondary') {
          e.currentTarget.style.backgroundColor = colors.backgroundDark;
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = variantStyles[variant].backgroundColor as string;
        }
      }}
    >
      {children}
    </button>
  );
}
