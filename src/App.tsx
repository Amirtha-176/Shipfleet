import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { SocketProvider } from './context/SocketContext.tsx';
import { ToastProvider, useToast } from './components/Toast.tsx';
import { LandingPage } from './components/LandingPage.tsx';
import { LoginModal } from './components/LoginModal.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { VesselsPage } from './pages/VesselsPage.tsx';
import { VesselDetailsPage } from './pages/VesselDetailsPage.tsx';
import { VoyagesPage } from './pages/VoyagesPage.tsx';
import { RouteTrackingPage } from './pages/RouteTrackingPage.tsx';
import { CargoPage } from './pages/CargoPage.tsx';
import { FuelPage } from './pages/FuelPage.tsx';
import { MaintenancePage } from './pages/MaintenancePage.tsx';
import { PortsPage } from './pages/PortsPage.tsx';
import { CrewPage } from './pages/CrewPage.tsx';
import { AlertsPage } from './pages/AlertsPage.tsx';
import { ReportsPage } from './pages/ReportsPage.tsx';
import { UsersPage } from './pages/UsersPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { ApiDocsPage } from './pages/ApiDocsPage.tsx';
import { HistoryPage } from './pages/HistoryPage.tsx';

function MainApp() {
  const { user, isLoading, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [activePage, setActivePage] = useState<string>('dashboard');
  const [selectedVesselId, setSelectedVesselId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Login Modal (2 Logins: Admin and User)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginModalRole, setLoginModalRole] = useState<'admin' | 'user'>('admin');
  const [loginModalTab, setLoginModalTab] = useState<'signin' | 'signup'>('signin');

  // Handle page transitions
  const handleNavigate = (page: string, param?: string) => {
    if (page === 'vessel-details' && param) {
      setSelectedVesselId(param);
    }

    // Role protection on client side (Admin only sections)
    if ((page === 'users' || page === 'history' || page === 'api-docs') && !isAdmin) {
      showToast('error', 'Access Restricted', 'This operational area requires Administrator privileges.');
      setActivePage('dashboard');
      return;
    }

    setActivePage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenLogin = (role: 'admin' | 'user' = 'admin', tab: 'signin' | 'signup' = 'signin') => {
    setLoginModalRole(role);
    setLoginModalTab(tab);
    setIsLoginModalOpen(true);
  };

  const handleLoginSuccess = (_role: string) => {
    setActivePage('dashboard');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
        <div className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
          Initializing FleetOps Telemetry...
        </div>
      </div>
    );
  }

  // If user not authenticated, render the public Landing Page
  if (!user) {
    return (
      <>
        <LandingPage onOpenLogin={handleOpenLogin} />
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          defaultRole={loginModalRole}
          initialTab={loginModalTab}
          onSuccess={handleLoginSuccess}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <Navbar onNavigate={handleNavigate} activePage={activePage} />

      {/* Main Content Area: Sidebar + Active Page */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activePage={activePage}
          onNavigate={handleNavigate}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        <main className="flex-1 overflow-y-auto bg-slate-950 min-h-[calc(100vh-4rem)]">
          {activePage === 'dashboard' && <DashboardPage onNavigate={handleNavigate} />}
          {activePage === 'vessels' && <VesselsPage onNavigate={handleNavigate} />}
          {activePage === 'vessel-details' && selectedVesselId && (
            <VesselDetailsPage vesselId={selectedVesselId} onNavigate={handleNavigate} />
          )}
          {activePage === 'voyages' && <VoyagesPage onNavigate={handleNavigate} />}
          {activePage === 'route-tracking' && <RouteTrackingPage onNavigate={handleNavigate} />}
          {activePage === 'cargo' && <CargoPage onNavigate={handleNavigate} />}
          {activePage === 'fuel' && <FuelPage onNavigate={handleNavigate} />}
          {activePage === 'maintenance' && <MaintenancePage onNavigate={handleNavigate} />}
          {activePage === 'ports' && <PortsPage onNavigate={handleNavigate} />}
          {activePage === 'crew' && <CrewPage onNavigate={handleNavigate} />}
          {activePage === 'alerts' && <AlertsPage onNavigate={handleNavigate} />}
          {activePage === 'reports' && <ReportsPage onNavigate={handleNavigate} />}
          {activePage === 'users' && <UsersPage onNavigate={handleNavigate} />}
          {activePage === 'settings' && <SettingsPage onNavigate={handleNavigate} />}
          {activePage === 'history' && <HistoryPage onNavigate={handleNavigate} />}
          {activePage === 'api-docs' && <ApiDocsPage onNavigate={handleNavigate} />}
        </main>
      </div>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        defaultRole={loginModalRole}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <ToastProvider>
          <MainApp />
        </ToastProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
