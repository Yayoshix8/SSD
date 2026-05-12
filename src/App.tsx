import { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Layout, { View } from './components/Layout';
import PipelineView from './views/PipelineView';
import CommodityView from './views/CommodityView';
import EventsView from './views/EventsView';
import WeeklyReviewView from './views/WeeklyReviewView';
import BlacklistView from './views/BlacklistView';
import SupplierDrawer from './components/SupplierDrawer';
import SupplierRegistrationForm from './views/SupplierRegistrationForm';

// Use query param (?register) so it works on any static host without server rewrites
const isPublicRegisterPage =
  window.location.pathname === '/register' ||
  new URLSearchParams(window.location.search).has('register');

function AppInner() {
  const [activeView, setActiveView] = useState<View>('pipeline');
  const { loading, selectedSupplierId } = useApp();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-white font-semibold text-sm">Loading Supplier Scouting and Dev Pipeline...</p>
          <p className="text-slate-500 text-xs mt-1">Nexteer Automotive</p>
        </div>
      </div>
    );
  }

  return (
    <Layout activeView={activeView} onViewChange={setActiveView}>
      {activeView === 'pipeline'  && <PipelineView />}
      {activeView === 'commodity' && <CommodityView />}
      {activeView === 'events'    && <EventsView />}
      {activeView === 'weekly'    && <WeeklyReviewView />}
      {activeView === 'blacklist' && <BlacklistView />}
      {selectedSupplierId && <SupplierDrawer />}
    </Layout>
  );
}

export default function App() {
  if (isPublicRegisterPage) {
    return <SupplierRegistrationForm />;
  }
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
