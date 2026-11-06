import React, { useState, useEffect } from 'react';
import { api, getToken, setToken, getSavedAccounts } from './services/api';
import { User, Partner, ReflectionSession, AnalyticsData } from './types';
import { Navbar } from './components/Navbar';
import { LandingPage } from './views/LandingPage';
import { AuthModal } from './views/AuthModal';
import { DashboardView } from './views/DashboardView';
import { ChatView } from './views/ChatView';
import { PartnerView } from './views/PartnerView';
import { ReflectionsView } from './views/ReflectionsView';
import { InsightsView } from './views/InsightsView';
import { HistoryView } from './views/HistoryView';
import { SettingsView } from './views/SettingsView';
import { DualPartnerDemoView } from './views/DualPartnerDemoView';
import { ProjectStudioView } from './views/ProjectStudioView';

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [currentTab, setCurrentTab] = useState<string>('landing');
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Shared state for reflections & analytics
  const [reflections, setReflections] = useState<ReflectionSession[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  // Dual-Partner Interactive Demo Modal
  const [isDemoActive, setIsDemoActive] = useState(false);

  const fetchUserData = async () => {
    try {
      if (!getToken()) {
        setUser(null);
        setPartner(null);
        setLoadingInitial(false);
        return;
      }

      const me = await api.getMe();
      setUser(me.user);
      setPartner(me.partner);

      if (me.partner) {
        const [refRes, anaRes] = await Promise.all([
          api.getReflections().catch(() => ({ reflections: [] })),
          api.getAnalytics().catch(() => null),
        ]);
        setReflections(refRes.reflections || []);
        setAnalytics(anaRes);
      }
    } catch (err) {
      api.logout();
      setUser(null);
      setPartner(null);
    } finally {
      setLoadingInitial(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  // Add Account modal overlay
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);

  const handleAuthSuccess = (authenticatedUser: User, linkedPartner: Partner | null) => {
    setUser(authenticatedUser);
    setPartner(linkedPartner);
    setShowAddAccountModal(false);
    setCurrentTab('dashboard');
    fetchUserData();
  };

  const handleSwitchAccount = async (targetToken: string) => {
    setToken(targetToken);
    const target = getSavedAccounts().find((a) => a.token === targetToken);
    if (target) {
      setUser(target.user);
      setPartner(null);
    }
    await fetchUserData();
  };

  const handleLogout = () => {
    if (user) {
      const saved = getSavedAccounts().filter((a) => a.user.id !== user.id);
      localStorage.setItem('betweenus_saved_accounts', JSON.stringify(saved));
      if (saved.length > 0) {
        setToken(saved[0].token);
        window.location.reload();
        return;
      }
    }
    setToken('');
    api.logout();
    setUser(null);
    setPartner(null);
    setCurrentTab('landing');
    window.location.reload();
  };

  if (loadingInitial) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0d14] text-slate-400 text-xs">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
          <span>Starting BetweenUs...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0d14] text-slate-100 flex flex-col font-['Plus_Jakarta_Sans']">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          if (tab === 'demo') {
            setIsDemoActive(true);
          } else {
            setCurrentTab(tab);
          }
        }}
        user={user}
        partner={partner}
        onLogout={handleLogout}
        onOpenDemoMode={() => setIsDemoActive(true)}
        isDemoActive={isDemoActive}
        onAddAccount={() => setShowAddAccountModal(true)}
        onSwitchAccount={handleSwitchAccount}
      />

      {/* Add Account Modal overlay if requested from top-right avatar menu */}
      {showAddAccountModal && (
        <AuthModal
          initialTab="register"
          onSuccess={handleAuthSuccess}
          onCancel={() => setShowAddAccountModal(false)}
        />
      )}

      {/* Main View Router */}
      <main className="flex-1">
        {/* Dual Partner Demo Mode overlay */}
        {isDemoActive && (
          <DualPartnerDemoView
            onClose={() => setIsDemoActive(false)}
            currentUser={user}
            linkedPartner={partner}
            onPartnerLinked={fetchUserData}
            onNavigateToAuth={() => setCurrentTab('auth_login')}
          />
        )}

        {/* Big Data Project Studio */}
        {currentTab === 'bigdata' ? (
          <ProjectStudioView onBack={() => setCurrentTab(user ? 'dashboard' : 'landing')} />
        ) : !user ? (
          /* Public / Unauthenticated Views */
          currentTab === 'auth_login' ? (
            <AuthModal
              initialTab="login"
              onSuccess={handleAuthSuccess}
              onCancel={() => setCurrentTab('landing')}
            />
          ) : currentTab === 'auth_register' ? (
            <AuthModal
              initialTab="register"
              onSuccess={handleAuthSuccess}
              onCancel={() => setCurrentTab('landing')}
            />
          ) : (
            <LandingPage
              onGetStarted={() => setCurrentTab('auth_register')}
              onSignIn={() => setCurrentTab('auth_login')}
              onOpenDemoMode={() => setIsDemoActive(true)}
            />
          )
        ) : (
          /* Authenticated User Views */
          <>
            {currentTab === 'dashboard' && (
              <DashboardView
                user={user}
                partner={partner}
                reflections={reflections}
                analytics={analytics}
                onNavigate={setCurrentTab}
                onStartReflection={() => setCurrentTab('reflections')}
              />
            )}

            {currentTab === 'messages' && (
              <ChatView
                user={user}
                partner={partner}
                onNavigateToPartner={() => setCurrentTab('partner')}
                onStartReflection={() => setCurrentTab('reflections')}
              />
            )}

            {currentTab === 'partner' && (
              <PartnerView
                user={user}
                partner={partner}
                onPartnerLinked={(newPartner) => {
                  setPartner(newPartner);
                  fetchUserData();
                }}
                onPartnerUnlinked={() => {
                  setPartner(null);
                  fetchUserData();
                }}
              />
            )}

            {currentTab === 'reflections' && (
              <ReflectionsView
                user={user}
                partner={partner}
                reflections={reflections}
                onRefresh={fetchUserData}
                onNavigateToPartner={() => setCurrentTab('partner')}
              />
            )}

            {currentTab === 'insights' && (
              <InsightsView
                analytics={analytics}
                partner={partner}
                onNavigateToReflections={() => setCurrentTab('reflections')}
                onNavigateToChat={() => setCurrentTab('messages')}
              />
            )}

            {currentTab === 'history' && (
              <HistoryView
                user={user}
                partner={partner}
                reflections={reflections}
                onNavigateToReflections={() => setCurrentTab('reflections')}
                onNavigateToChat={() => setCurrentTab('messages')}
                onRefresh={fetchUserData}
              />
            )}

            {currentTab === 'settings' && (
              <SettingsView
                user={user}
                partner={partner}
                onLogout={handleLogout}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
