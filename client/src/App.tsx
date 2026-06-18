import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import SpaceList from '@/pages/SpaceList';
import SubjectLibrary from '@/pages/SubjectLibrary';
import TopicList from '@/pages/TopicList';
import TopicCanvas from '@/pages/TopicCanvas';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import { AuthSuccess } from '@/pages/AuthSuccess';
import TestDashboard from '@/pages/TestDashboard';
import TestScreen from '@/pages/TestScreen';

import { Navbar } from '@/components/common/Navbar';
import { GlobalPrompt } from '@/components/common/GlobalPrompt';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

const TitleUpdater = () => {
  const { user } = useAuthStore();

  useEffect(() => {
    if (user?.name) {
      const firstName = user.name.split(' ')[0];
      document.title = `${firstName} Prep`;
    } else {
      document.title = 'ExamPrep';
    }
  }, [user]);

  return null;
};

const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

const PublicRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) {
    return <Navigate to="/spaces" replace />;
  }
  return children;
};

const AppContent = () => {
  const location = useLocation();
  // Check if the current path matches /tests/:id (but not /tests dashboard)
  const isTestScreen = /^\/tests\/[^/]+$/.test(location.pathname);
  
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {!isTestScreen && <Navbar />}
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
        <Route path="/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
        <Route path="/auth-success" element={<AuthSuccess />} />

        <Route path="/" element={<Navigate to="/spaces" replace />} />

        <Route path="/spaces" element={
          <RequireAuth>
            <SpaceList />
          </RequireAuth>
        } />
        <Route path="/spaces/:spaceSlug/library" element={
          <RequireAuth>
            <SubjectLibrary />
          </RequireAuth>
        } />
        <Route path="/spaces/:spaceSlug/:subjectSlug" element={
          <RequireAuth>
            <TopicList />
          </RequireAuth>
        } />
        <Route path="/spaces/:spaceSlug/:subjectSlug/:topicSlug" element={
          <RequireAuth>
            <TopicCanvas />
          </RequireAuth>
        } />
        <Route path="/tests" element={
          <RequireAuth>
            <TestDashboard />
          </RequireAuth>
        } />
        <Route path="/tests/:id" element={
          <RequireAuth>
            <TestScreen />
          </RequireAuth>
        } />

      </Routes>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <TitleUpdater />
      <GlobalPrompt />
      <Toaster position="top-right" />
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
