'use client';

import { colors, spacing, borderRadius } from '../../styles';

export type TabType = 'channels' | 'archetypes' | 'generate' | 'history';

interface Tab {
  id: TabType;
  label: string;
  icon: string;
}

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabs: Tab[] = [
  { id: 'channels', label: 'Channels', icon: '📺' },
  { id: 'archetypes', label: 'Archetypes', icon: '🎨' },
  { id: 'generate', label: 'Generate', icon: '✨' },
  { id: 'history', label: 'History', icon: '📋' },
];

export default function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <nav
      style={{
        display: 'flex',
        gap: spacing.sm,
        borderBottom: `2px solid ${colors.border}`,
        marginBottom: spacing.xl,
        flexWrap: 'wrap',
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              padding: `${spacing.md} ${spacing.lg}`,
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: isActive ? '600' : '400',
              color: isActive ? colors.primary : colors.textLight,
              borderBottom: isActive ? `3px solid ${colors.primary}` : '3px solid transparent',
              marginBottom: '-2px',
              transition: 'all 0.2s ease',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = colors.text;
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = colors.textLight;
              }
            }}
          >
            <span style={{ marginRight: spacing.sm }}>{tab.icon}</span>
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
