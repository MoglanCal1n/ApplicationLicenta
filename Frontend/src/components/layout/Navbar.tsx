import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import {
  Moon,
  Sun,
  Bell,
  LogOut,
  UserCircle,
  Languages,
  ChevronDown,
} from 'lucide-react';
import api, { API_BASE_URL } from '../../api';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      api.get('/profiles/me/full').then((res) => setProfile(res.data)).catch(() => {});
    }
  }, [user]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'ro' ? 'en' : 'ro');
  };

  if (!user) return null;

  const displayName =
    profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : user.email;

  const initials =
    profile?.first_name && profile?.last_name
      ? `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
      : user.email[0].toUpperCase();

  const avatarUrl = profile?.profile_picture_url
    ? `${API_BASE_URL}${profile.profile_picture_url}`
    : null;

  const roleLabel =
    user.role === 'DOCTOR'
      ? t('common.doctor_role')
      : user.role === 'ADMIN'
        ? 'Admin'
        : t('common.patient_role');

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 border-b h-[var(--navbar-height)]"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        boxShadow: 'var(--shadow-navbar)',
      }}
    >
      {/* Left — spacer / breadcrumb placeholder */}
      <div className="flex items-center gap-4">
        {/* This space is intentionally left for sidebar to tuck under */}
      </div>

      {/* Right — controls */}
      <div className="flex items-center gap-1">
        {/* Language toggle */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-[var(--color-surface-hover)]"
          style={{ color: 'var(--color-text-secondary)' }}
          title={i18n.language === 'ro' ? 'Switch to English' : 'Schimbă în Română'}
        >
          <Languages className="h-4 w-4" />
          <span className="uppercase text-xs font-bold">{i18n.language === 'ro' ? 'RO' : 'EN'}</span>
        </button>

        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-lg transition-all duration-200 hover:bg-[var(--color-surface-hover)]"
          style={{ color: 'var(--color-text-secondary)' }}
          title={isDark ? 'Light mode' : 'Dark mode'}
        >
          {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </button>

        {/* Notifications */}
        <button
          className="relative p-2.5 rounded-lg transition-all duration-200 hover:bg-[var(--color-surface-hover)]"
          style={{ color: 'var(--color-text-secondary)' }}
          title={t('nav.notifications')}
        >
          <Bell className="h-[18px] w-[18px]" />
          {/* Notification dot */}
          <span
            className="absolute top-2 right-2 h-2 w-2 rounded-full"
            style={{ backgroundColor: 'var(--color-primary)' }}
          />
        </button>

        {/* Divider */}
        <div className="h-8 w-px mx-2" style={{ backgroundColor: 'var(--color-border)' }} />

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 px-2 py-1.5 rounded-xl transition-all duration-200 hover:bg-[var(--color-surface-hover)]"
          >
            {/* Avatar */}
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="avatar"
                className="h-8 w-8 rounded-full object-cover border-2"
                style={{ borderColor: 'var(--color-primary-light)' }}
              />
            ) : (
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-primary-foreground)',
                }}
              >
                {initials}
              </div>
            )}

            {/* Name & role */}
            <div className="text-left hidden md:block">
              <p
                className="text-sm font-semibold leading-tight"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {displayName}
              </p>
              <p
                className="text-xs font-medium"
                style={{ color: 'var(--color-primary)' }}
              >
                {roleLabel}
              </p>
            </div>

            <ChevronDown
              className={`h-4 w-4 hidden md:block transition-transform duration-200 ${
                dropdownOpen ? 'rotate-180' : ''
              }`}
              style={{ color: 'var(--color-text-tertiary)' }}
            />
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-56 rounded-xl border py-1.5 animate-scale-in"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                boxShadow: 'var(--shadow-dropdown)',
              }}
            >
              {/* User info header */}
              <div className="px-4 py-2.5 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <p
                  className="text-sm font-semibold truncate"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {displayName}
                </p>
                <p
                  className="text-xs truncate"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  {user.email}
                </p>
              </div>

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  navigate('/ehealth/profile');
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--color-surface-hover)]"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <UserCircle className="h-4 w-4" />
                {t('nav.profile')}
              </button>

              <div className="mx-3 my-1 border-t" style={{ borderColor: 'var(--color-border)' }} />

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--color-error-light)]"
                style={{ color: 'var(--color-error)' }}
              >
                <LogOut className="h-4 w-4" />
                {t('common.logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
