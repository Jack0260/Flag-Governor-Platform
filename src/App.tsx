import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Layout } from '@/components/Layout';
import { AuthPage } from '@/pages/AuthPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { FlagsPage, FlagDetailPage } from '@/pages/FlagsPage';
import { RiskReviewPage } from '@/pages/RiskReviewPage';
import { AuditPage } from '@/pages/AuditPage';
import { ExperimentsPage } from '@/pages/ExperimentsPage';
import { SegmentSimulatorPage } from '@/pages/SegmentSimulatorPage';
import { CalendarPage } from '@/pages/CalendarPage';
import { SdkExamplesPage } from '@/pages/SdkExamplesPage';
import { ApiKeysPage } from '@/pages/ApiKeysPage';
import { DocsPage } from '@/pages/DocsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { Spinner, Button } from '@/components/ui';
import { Flag } from 'lucide-react';

type Page = 'dashboard' | 'flags' | 'flag-detail' | 'risk-review' | 'audit' | 'experiments' | 'segment-simulator' | 'calendar' | 'sdk-examples' | 'api-keys' | 'docs' | 'settings';

function AppContent() {
  const { user, loading, activeOrg, signOut } = useAuth();
  const [page, setPage] = useState<Page>('dashboard');
  const [selectedFlagId, setSelectedFlagId] = useState<string>('');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) return <AuthPage />;

  if (!activeOrg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center shadow-lg mx-auto mb-4">
            <Flag className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No organization found</h2>
          <p className="text-sm text-gray-500 mb-4">Your account is not linked to any organization yet. Try signing out and creating a new account.</p>
          <Button onClick={() => signOut()} variant="secondary">Sign Out</Button>
        </div>
      </div>
    );
  }

  const handleNavigate = (p: string) => {
    setPage(p as Page);
    window.scrollTo(0, 0);
  };

  const handleSelectFlag = (flagId: string) => {
    setSelectedFlagId(flagId);
  };

  return (
    <Layout currentPage={page as any} onNavigate={handleNavigate}>
      {page === 'dashboard' && <DashboardPage onNavigate={handleNavigate} />}
      {page === 'flags' && <FlagsPage onNavigate={handleNavigate} onSelectFlag={handleSelectFlag} />}
      {page === 'flag-detail' && <FlagDetailPage flagId={selectedFlagId} onNavigate={handleNavigate} />}
      {page === 'risk-review' && <RiskReviewPage onNavigate={handleNavigate} />}
      {page === 'audit' && <AuditPage />}
      {page === 'experiments' && <ExperimentsPage />}
      {page === 'segment-simulator' && <SegmentSimulatorPage />}
      {page === 'calendar' && <CalendarPage />}
      {page === 'sdk-examples' && <SdkExamplesPage />}
      {page === 'api-keys' && <ApiKeysPage />}
      {page === 'docs' && <DocsPage />}
      {page === 'settings' && <SettingsPage />}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
