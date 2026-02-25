'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import DashboardLayout from './components/layout/DashboardLayout';
import TabNavigation, { type TabType } from './components/layout/TabNavigation';
import ChannelList from './components/channels/ChannelList';
import ArchetypeList from './components/archetypes/ArchetypeList';
import GenerateForm from './components/generate/GenerateForm';
import JobHistoryTable from './components/jobs/JobHistoryTable';
import { spacing } from './styles';

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = (searchParams.get('tab') as TabType) || 'channels';

  const handleTabChange = (tab: TabType) => {
    router.push(`/dashboard?tab=${tab}`);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'channels':
        return <ChannelList />;
      case 'archetypes':
        return <ArchetypeList />;
      case 'generate':
        return <GenerateForm />;
      case 'history':
        return <JobHistoryTable />;
      default:
        return <ChannelList />;
    }
  };

  return (
    <DashboardLayout>
      <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />
      <div style={{ marginTop: spacing.xl }}>{renderTabContent()}</div>
    </DashboardLayout>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: spacing.xl, textAlign: 'center' }}>Loading dashboard...</div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
