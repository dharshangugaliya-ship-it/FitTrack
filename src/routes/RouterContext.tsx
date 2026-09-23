import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AppMode } from '../types';
import { useAuth } from '../context/AuthContext';

interface RouteParams {
  id?: string;
  challengeId?: string;
}

interface RouterContextType {
  currentPath: string;
  mode: AppMode;
  params: RouteParams;
  navigate: (path: string) => void;
  setMode: (mode: AppMode) => void;
  toggleMode: () => void;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  workoutModalOpen: boolean;
  setWorkoutModalOpen: (open: boolean) => void;
  selectedChallengeId: string | null;
  setSelectedChallengeId: (id: string | null) => void;
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

export const isProtectedRoute = (path: string): boolean => {
  return (
    path === '/dashboard' ||
    path === '/my-challenges' ||
    path === '/points' ||
    path.startsWith('/workout/') ||
    path === '/profile' ||
    path === '/organizer' ||
    path.startsWith('/organizer/')
  );
};

function parsePathAndParams(pathname: string): { path: string; params: RouteParams } {
  let path = pathname || '/';
  if (!path.startsWith('/')) path = '/' + path;

  if (path.includes('#')) {
    path = path.split('#')[1] || '/';
    if (!path.startsWith('/')) path = '/' + path;
  }
  if (path.includes('?')) {
    path = path.split('?')[0];
  }

  const params: RouteParams = {};

  const challengeDetailMatch = path.match(/^\/challenges\/([^/]+)$/);
  if (challengeDetailMatch) {
    params.id = challengeDetailMatch[1];
    params.challengeId = challengeDetailMatch[1];
  }

  const leaderboardMatch = path.match(/^\/leaderboard\/([^/]+)$/);
  if (leaderboardMatch) {
    params.challengeId = leaderboardMatch[1];
  }

  const workoutMatch = path.match(/^\/workout\/([^/]+)$/);
  if (workoutMatch) {
    params.challengeId = workoutMatch[1];
  }

  const verifyMatch = path.match(/^\/verify\/([^/]+)$/);
  if (verifyMatch) {
    params.challengeId = verifyMatch[1];
  }

  const analyticsMatch = path.match(/^\/organizer\/analytics\/([^/]+)$/);
  if (analyticsMatch) {
    params.challengeId = analyticsMatch[1];
  }

  const editDraftMatch = path.match(/^\/organizer\/create\/([^/]+)$/);
  if (editDraftMatch) {
    params.id = editDraftMatch[1];
    params.challengeId = editDraftMatch[1];
  }

  return { path, params };
}

export const RouterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const {
    profile,
    updateProfileMode,
    isAuthenticated,
    loading: authLoading,
  } = useAuth();

  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (window.location.hash) {
      return window.location.hash.replace('#', '') || '/';
    }
    return window.location.pathname || '/';
  });

  const [mode, setModeState] = useState<AppMode>(() => {
    const saved = localStorage.getItem('fittrack_app_mode');
    if (saved === 'ORGANIZER' || saved === 'CHALLENGER') return saved;
    const initialPath = window.location.pathname || window.location.hash;
    return initialPath.includes('/organizer') ? 'ORGANIZER' : 'CHALLENGER';
  });

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [workoutModalOpen, setWorkoutModalOpen] = useState(false);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);

  // Sync mode with profile mode from Supabase when loaded
  useEffect(() => {
    if (profile?.mode) {
      const mappedMode = profile.mode === 'organizer' ? 'ORGANIZER' : 'CHALLENGER';
      setModeState(mappedMode);
      localStorage.setItem('fittrack_app_mode', mappedMode);
    }
  }, [profile?.mode]);

  // Sync with browser popstate
  useEffect(() => {
    const handlePopState = () => {
      const p = window.location.hash ? window.location.hash.replace('#', '') : window.location.pathname;
      setCurrentPath(p || '/');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Guard protected routes once auth finishes initializing
  useEffect(() => {
    if (!authLoading && !isAuthenticated && isProtectedRoute(currentPath)) {
      // Unauthenticated user attempting to access protected route -> redirect to login
      navigate('/login');
    }
  }, [currentPath, isAuthenticated, authLoading]);

  const navigate = (newPath: string) => {
    // If not authenticated and target is protected, redirect to /login
    if (!authLoading && !isAuthenticated && isProtectedRoute(newPath)) {
      newPath = '/login';
    }

    if (newPath.startsWith('/organizer') && mode !== 'ORGANIZER') {
      setModeState('ORGANIZER');
      localStorage.setItem('fittrack_app_mode', 'ORGANIZER');
      updateProfileMode('ORGANIZER');
    } else if (
      !newPath.startsWith('/organizer') &&
      mode === 'ORGANIZER' &&
      (newPath === '/dashboard' || newPath === '/my-challenges' || newPath.startsWith('/workout/'))
    ) {
      setModeState('CHALLENGER');
      localStorage.setItem('fittrack_app_mode', 'CHALLENGER');
      updateProfileMode('CHALLENGER');
    }

    setCurrentPath(newPath);
    window.history.pushState({}, '', newPath);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const setMode = (newMode: AppMode) => {
    setModeState(newMode);
    localStorage.setItem('fittrack_app_mode', newMode);
    updateProfileMode(newMode);

    if (newMode === 'ORGANIZER') {
      if (!currentPath.startsWith('/organizer')) {
        navigate('/organizer');
      }
    } else {
      if (currentPath.startsWith('/organizer')) {
        navigate('/dashboard');
      }
    }
  };

  const toggleMode = () => {
    if (mode === 'CHALLENGER') {
      setMode('ORGANIZER');
    } else {
      setMode('CHALLENGER');
    }
  };

  const { params } = parsePathAndParams(currentPath);

  return (
    <RouterContext.Provider
      value={{
        currentPath,
        mode,
        params,
        navigate,
        setMode,
        toggleMode,
        authModalOpen,
        setAuthModalOpen,
        workoutModalOpen,
        setWorkoutModalOpen,
        selectedChallengeId,
        setSelectedChallengeId,
      }}
    >
      {children}
    </RouterContext.Provider>
  );
};

export const useRouter = (): RouterContextType => {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
};
