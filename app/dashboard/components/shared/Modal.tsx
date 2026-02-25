'use client';

import { useEffect } from 'react';
import { colors, commonStyles, spacing } from '../../styles';
import Button from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children, footer }: ModalProps) {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={commonStyles.modal.overlay}
      onClick={(e) => {
        // Close modal when clicking overlay
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div style={commonStyles.modal.content}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing.lg,
            paddingBottom: spacing.md,
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: colors.textLight,
              padding: spacing.sm,
            }}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ marginBottom: spacing.lg }}>{children}</div>

        {/* Footer */}
        {footer && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: spacing.md,
              paddingTop: spacing.md,
              borderTop: `1px solid ${colors.border}`,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
