'use client';

import { colors, spacing, borderRadius } from '../../styles';
import Button from '../shared/Button';
import type { Archetype } from '../../hooks/useArchetypes';

interface ArchetypeCardProps {
  archetype: Archetype;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ArchetypeCard({ archetype, onEdit, onDelete }: ArchetypeCardProps) {
  const truncateText = (text: string, maxLength: number = 100): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div
      style={{
        backgroundColor: colors.white,
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.md,
        overflow: 'hidden',
        transition: 'box-shadow 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Image Preview */}
      <div
        style={{
          width: '100%',
          height: '180px',
          backgroundColor: colors.backgroundDark,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <img
          src={archetype.imageUrl}
          alt={archetype.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          onError={(e) => {
            // Fallback for broken images
            e.currentTarget.style.display = 'none';
            e.currentTarget.parentElement!.innerHTML = '<div style="color: #999; font-size: 2rem;">🖼️</div>';
          }}
        />
      </div>

      {/* Content */}
      <div style={{ padding: spacing.md }}>
        <h4 style={{ margin: 0, marginBottom: spacing.sm, color: colors.text }}>
          {archetype.name}
        </h4>

        {archetype.channel && (
          <div
            style={{
              fontSize: '0.875rem',
              color: colors.textMuted,
              marginBottom: spacing.sm,
            }}
          >
            Channel: {archetype.channel.name}
          </div>
        )}

        <p
          style={{
            fontSize: '0.875rem',
            color: colors.textLight,
            marginBottom: spacing.md,
            minHeight: '2.5rem',
          }}
        >
          {truncateText(archetype.layoutInstructions || 'No layout instructions', 100)}
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', gap: spacing.sm }}>
          <Button size="small" variant="secondary" onClick={onEdit} style={{ flex: 1 }}>
            Edit
          </Button>
          <Button size="small" variant="danger" onClick={onDelete} style={{ flex: 1 }}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
