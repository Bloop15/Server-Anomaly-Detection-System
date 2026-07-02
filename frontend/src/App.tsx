import React, { useState } from 'react';
import { ReplayProvider } from './contexts/ReplayContext';
import { MainLayout } from './layouts/MainLayout';
import { Overview } from './components/Overview';
import { LiveMonitoring } from './components/LiveMonitoring';
import { Dashboard } from './components/Dashboard';
import { ModelInsights } from './components/ModelInsights';
import { AnomalyExplorer } from './components/AnomalyExplorer';

type View = 'overview' | 'live' | 'dashboard' | 'insights' | 'explorer';

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('overview');

  return (
    <MainLayout
      currentView={currentView}
      setCurrentView={v => setCurrentView(v as View)}
    >
      {currentView === 'overview'  && <Overview />}
      {currentView === 'live'      && <LiveMonitoring />}
      {currentView === 'dashboard' && <Dashboard />}
      {currentView === 'insights'  && <ModelInsights />}
      {currentView === 'explorer'  && <AnomalyExplorer />}
    </MainLayout>
  );
};

export default function App() {
  return (
    <ReplayProvider>
      <AppContent />
    </ReplayProvider>
  );
}
