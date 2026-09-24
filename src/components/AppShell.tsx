import React, { useState, useEffect } from 'react';
import { useRouter } from '../routes/RouterContext';
import { useAuth } from '../context/AuthContext';
import { AppHeader } from './AppHeader';
import { SidebarNav } from './SidebarNav';
import { ChallengeModal } from './ChallengeModal';
import { WorkoutLoggerModal } from './WorkoutLoggerModal';
import { AuthModal } from './AuthModal';
import { MOCK_CHALLENGES } from '../data/mockData';

// Views
import { LandingView } from '../views/public/LandingView';
import { ChallengeCatalogView } from '../views/public/ChallengeCatalogView';
import { ChallengeDetailsView } from '../views/public/ChallengeDetailsView';
import { LeaderboardView } from '../views/public/LeaderboardView';
import { HowItWorksView } from '../views/public/HowItWorksView';
import { AuthView } from '../views/public/AuthView';
import { ChallengerDashboardView } from '../views/challenger/ChallengerDashboardView';
import { MyChallengesView } from '../views/challenger/MyChallengesView';
import { PointsHistoryView } from '../views/challenger/PointsHistoryView';
import { WorkoutSessionView } from '../views/challenger/WorkoutSessionView';
import { ProfileView } from '../views/challenger/ProfileView';
import { OrganizerDashboardView } from '../views/organizer/OrganizerDashboardView';
import { CreateChallengeView } from '../views/organizer/CreateChallengeView';
import { ManageChallengesView } from '../views/organizer/ManageChallengesView';
import { SubmissionsReviewView } from '../views/organizer/SubmissionsReviewView';
import { ChallengeAnalyticsView } from '../views/organizer/ChallengeAnalyticsView';
import { OrganizerProfileView } from '../views/organizer/OrganizerProfileView';
import { challengeService } from '../services/challengeService';
import { Challenge } from '../types';

export const AppShell: React.FC = () => {
  const {
    currentPath,
    selectedChallengeId,
    setSelectedChallengeId,
    workoutModalOpen,
    setWorkoutModalOpen,
    authModalOpen,
    setAuthModalOpen,
  } = useRouter();
  const { loading: authLoading, user, isDemoMode } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [modalChallenge, setModalChallenge] = useState<Challenge | null>(null);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [currentPath]);

  // Selected challenge for modal
  useEffect(() => {
    let active = true;
    if (selectedChallengeId) {
      const effectiveUserId = user?.id || (isDemoMode ? 'usr_aarav_01' : null);
      challengeService.getChallengeById(selectedChallengeId, effectiveUserId).then((res) => {
        if (active) setModalChallenge(res.challenge);
      });
    } else {
      setModalChallenge(null);
    }
    return () => {
      active = false;
    };
  }, [selectedChallengeId, user?.id, isDemoMode]);

  // View dispatcher
  const renderCurrentView = () => {
    if (authLoading) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse shadow-lg shadow-emerald-500/10">
            <span className="text-xl">⚡</span>
          </div>
          <p className="text-xs text-slate-400 font-mono tracking-wide animate-pulse">
            Synchronizing FITTRACK Identity Session...
          </p>
        </div>
      );
    }

    if (currentPath === '/') {
      return <LandingView />;
    }
    if (currentPath === '/login') {
      return <AuthView initialMode="login" />;
    }
    if (currentPath === '/signup') {
      return <AuthView initialMode="signup" />;
    }
    if (currentPath.match(/^\/challenges\/[^/]+$/)) {
      return <ChallengeDetailsView />;
    }
    if (currentPath === '/challenges' || currentPath.startsWith('/challenges/')) {
      return <ChallengeCatalogView />;
    }
    if (currentPath.startsWith('/leaderboard')) {
      return <LeaderboardView />;
    }
    if (currentPath === '/how-it-works') {
      return <HowItWorksView />;
    }
    if (currentPath === '/dashboard') {
      return <ChallengerDashboardView />;
    }
    if (currentPath === '/my-challenges') {
      return <MyChallengesView />;
    }
    if (currentPath === '/points') {
      return <PointsHistoryView />;
    }
    if (currentPath.startsWith('/workout/') || currentPath.startsWith('/verify/')) {
      return <WorkoutSessionView />;
    }
    if (currentPath === '/profile') {
      return <ProfileView />;
    }
    if (currentPath === '/organizer') {
      return <OrganizerDashboardView />;
    }
    if (currentPath === '/organizer/create' || currentPath.startsWith('/organizer/create/')) {
      return <CreateChallengeView />;
    }
    if (currentPath === '/organizer/challenges') {
      return <ManageChallengesView />;
    }
    if (currentPath === '/organizer/submissions') {
      return <SubmissionsReviewView />;
    }
    if (currentPath.startsWith('/organizer/analytics/')) {
      return <ChallengeAnalyticsView />;
    }
    if (currentPath === '/organizer/profile' || currentPath === '/organizer/settings') {
      return <OrganizerProfileView />;
    }

    // Default fallback
    return <LandingView />;
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-100 flex flex-col antialiased selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Fixed Sticky Header */}
      <AppHeader
        mobileMenuOpen={mobileMenuOpen}
        onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto relative">
        {/* Desktop Sidebar Rail */}
        <div className="hidden lg:block sticky top-16 h-[calc(100vh-4rem)] shrink-0">
          <SidebarNav />
        </div>

        {/* Mobile / Tablet Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative z-10 w-72 h-full bg-[#0B0E14] border-r border-white/10 shadow-2xl">
              <SidebarNav onCloseMobile={() => setMobileMenuOpen(false)} />
            </div>
          </div>
        )}

        {/* Scrollable View Content Canvas */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-6 lg:pt-8 min-w-0">
          {renderCurrentView()}
        </main>
      </div>

      {/* Global Modals */}
      {modalChallenge && (
        <ChallengeModal
          challenge={modalChallenge}
          onClose={() => setSelectedChallengeId(null)}
        />
      )}

      <WorkoutLoggerModal
        isOpen={workoutModalOpen}
        onClose={() => setWorkoutModalOpen(false)}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
};
