'use client';

import { colors, spacing } from '../../styles';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: colors.background,
      }}
    >
      {/* Header */}
      <header
        style={{
          backgroundColor: colors.white,
          borderBottom: `1px solid ${colors.border}`,
          padding: `${spacing.lg} ${spacing.xl}`,
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', color: colors.text }}>
                🎨 Thumbnail Creator Dashboard
              </h1>
              <p style={{ margin: 0, marginTop: spacing.xs, color: colors.textMuted, fontSize: '0.875rem' }}>
                Manage channels, archetypes, and generate thumbnails
              </p>
            </div>
            <a
              href="/"
              style={{
                color: colors.primary,
                textDecoration: 'none',
                fontSize: '0.875rem',
              }}
            >
              ← Back to Home
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: spacing.xl,
        }}
      >
        {children}
      </main>

      {/* Footer */}
      <footer
        style={{
          backgroundColor: colors.white,
          borderTop: `1px solid ${colors.border}`,
          padding: spacing.lg,
          marginTop: spacing.xxl,
          textAlign: 'center',
          color: colors.textMuted,
          fontSize: '0.875rem',
        }}
      >
        <p style={{ margin: 0 }}>
          Powered by Google's Nano Banana API (gemini-3-pro-image-preview)
        </p>
      </footer>
    </div>
  );
}
