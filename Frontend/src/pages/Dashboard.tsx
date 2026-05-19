import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import DoctorDashboard from './DoctorDashboard';
import PatientDashboard from './PatientDashboard';
import AdminDashboard from './AdminDashboard';
import { Navigate, useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import api from '../api';

const API_BASE = 'http://localhost:8000';

export default function Dashboard() {
  const { user, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      api.get('/profiles/me/full').then(res => setProfile(res.data)).catch(() => {});
    }
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;

  const displayName = profile?.first_name && profile?.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : user.email;

  const initials = profile?.first_name && profile?.last_name
    ? `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
    : user.email[0].toUpperCase();

  const avatarUrl = profile?.profile_picture_url ? `${API_BASE}${profile.profile_picture_url}` : null;

  return (
    <div className="min-h-screen bg-muted/10">
      <header className="bg-white border-b sticky top-0 z-10 px-6 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏥</span>
          <h1 className="text-xl font-bold text-primary">E-Health AI</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Profile button */}
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-3 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors group"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold leading-none">{displayName}</p>
              <p className="text-xs text-primary font-bold mt-0.5">
                {user.role === 'DOCTOR' ? '👨‍⚕️ Doctor' : user.role === 'ADMIN' ? '🛡️ Admin' : '🧑 Pacient'}
              </p>
            </div>
            {/* Avatar */}
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="h-9 w-9 rounded-full object-cover border-2 border-primary/30 shadow-sm" />
            ) : (
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-blue-400 text-white flex items-center justify-center text-sm font-bold shadow-sm border-2 border-primary/20">
                {initials}
              </div>
            )}
            <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors hidden sm:block">
              <User className="h-3.5 w-3.5" />
            </span>
          </button>

          <div className="h-8 w-px bg-border" />

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-destructive transition-colors px-2 py-1.5 rounded-lg hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:block">Logout</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {user.role === 'DOCTOR' ? <DoctorDashboard /> : user.role === 'ADMIN' ? <AdminDashboard /> : <PatientDashboard />}
      </main>
    </div>
  );
}
