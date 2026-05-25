import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Layouts
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';

// Public pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Protected pages
import Dashboard from './pages/Dashboard';
import AudioConsultation from './pages/AudioConsultation';
import BookAppointment from './pages/BookAppointment';
import DoctorConsultations from './pages/DoctorConsultations';
import ProfilePage from './pages/ProfilePage';
import AdminDashboard from './pages/AdminDashboard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* ── Public routes (no layout shell) ── */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* ── Protected routes under /ehealth/* ── */}
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/ehealth/dashboard" element={<Dashboard />} />
                  <Route path="/ehealth/find-doctors" element={<BookAppointment />} />
                  <Route path="/ehealth/appointments" element={<BookAppointment />} />
                  <Route path="/ehealth/consultation" element={<AudioConsultation />} />
                  <Route path="/ehealth/consultations" element={<DoctorConsultations />} />
                  <Route path="/ehealth/profile" element={<ProfilePage />} />
                  <Route path="/ehealth/admin" element={<AdminDashboard />} />
                </Route>
              </Route>

              {/* ── Legacy redirects (backward compat) ── */}
              <Route path="/dashboard" element={<Navigate to="/ehealth/dashboard" replace />} />
              <Route path="/profile" element={<Navigate to="/ehealth/profile" replace />} />
              <Route path="/audio-consultation" element={<Navigate to="/ehealth/consultation" replace />} />
              <Route path="/book-appointment" element={<Navigate to="/ehealth/appointments" replace />} />
              <Route path="/doctor-consultations" element={<Navigate to="/ehealth/consultations" replace />} />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
