'use client';

import { colors, spacing, borderRadius } from '../../styles';

interface LoadingSkeletonProps {
  type?: 'text' | 'card' | 'table';
  count?: number;
}

export default function LoadingSkeleton({ type = 'text', count = 1 }: LoadingSkeletonProps) {
  const skeletonStyle: React.CSSProperties = {
    backgroundColor: colors.backgroundDark,
    borderRadius: borderRadius.md,
    animation: 'pulse 1.5s ease-in-out infinite',
  };

  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <div
            style={{
              ...skeletonStyle,
              height: '300px',
              width: '100%',
            }}
          />
        );

      case 'table':
        return (
          <div>
            {Array.from({ length: count }).map((_, i) => (
              <div
                key={i}
                style={{
                  ...skeletonStyle,
                  height: '60px',
                  marginBottom: spacing.sm,
                }}
              />
            ))}
          </div>
        );

      case 'text':
      default:
        return (
          <div
            style={{
              ...skeletonStyle,
              height: '20px',
              width: '100%',
              marginBottom: spacing.sm,
            }}
          />
        );
    }
  };

  return (
    <>
      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
        `}
      </style>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ marginBottom: spacing.md }}>
          {renderSkeleton()}
        </div>
      ))}
    </>
  );
}
