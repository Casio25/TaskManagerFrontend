import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import App from './App.tsx';
import { AuthProvider } from './lib/auth';
import LoginPage from './pages/Login.tsx';
import RegisterPage from './pages/Register.tsx';
import DashboardPage from './pages/Dashboard.tsx';
import ProtectedRoute from './components/ProtectedRoute.tsx';
import ProjectsPage from './pages/Projects.tsx';
import AcceptInvitePage from './pages/AcceptInvite.tsx';
import CalendarMePage from './pages/CalendarMe.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />}> 
            <Route index element={<div className="container"><h2>Welcome</h2><p>Please login or register to continue.</p></div>} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route element={<ProtectedRoute />}> 
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="calendar" element={<CalendarMePage />} />
              <Route path="invites/accept" element={<AcceptInvitePage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
);
