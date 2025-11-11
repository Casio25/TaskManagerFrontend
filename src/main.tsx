import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import App from './App.tsx';
import { AuthProvider } from './lib/auth';
import { ThemeProvider } from './lib/theme';
import { I18nProvider } from './lib/i18n';
import LoginPage from './pages/Login.tsx';
import RegisterPage from './pages/Register.tsx';
import DashboardPage from './pages/Dashboard.tsx';
import ProtectedRoute from './components/ProtectedRoute.tsx';
import CreateProjectPage from './pages/CreateProject.tsx';
import AcceptInvitePage from './pages/AcceptInvite.tsx';
import CalendarMePage from './pages/CalendarMe.tsx';
import ParticipantsPage from './pages/Participants.tsx';
import HistoryPage from './pages/History.tsx';
import HomePage from './pages/Home.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<App />}>
                <Route index element={<HomePage />} />
                <Route path="login" element={<LoginPage />} />
                <Route path="register" element={<RegisterPage />} />
                <Route element={<ProtectedRoute />}>
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="projects" element={<CreateProjectPage />} />
                  <Route path="participants" element={<ParticipantsPage />} />
                  <Route path="history" element={<HistoryPage />} />
                  <Route path="calendar" element={<CalendarMePage />} />
                  <Route path="invites/accept" element={<AcceptInvitePage />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </I18nProvider>
  </StrictMode>,
);
