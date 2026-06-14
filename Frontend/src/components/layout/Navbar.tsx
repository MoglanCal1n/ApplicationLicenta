import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '../../context/NotificationContext';
import { useState, useEffect, useRef } from 'react';
import {
  Moon,
  Sun,
  Bell,
  LogOut,
  UserCircle,
  Languages,
  ChevronDown,
  Calendar,
  FileText,
  Activity,
  CheckCheck,
  Trash2
} from 'lucide-react';
import api, { API_BASE_URL } from '../../api';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications
  } = useNotifications();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      api.get('/profiles/me/full').then((res) => setProfile(res.data)).catch(() => {});
    }
  }, [user]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target as Node)) {
        setNotifDropdownOpen(false);
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

  const formatTimeAgo = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return t('common.just_now', 'Just now');
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const handleNotificationClick = async (notif: any) => {
    setNotifDropdownOpen(false);
    if (!notif.is_read) {
      await markAsRead(notif.id);
    }
    
    // Smart routing based on notification metadata / type
    if (user?.role === 'PATIENT') {
      navigate('/ehealth/dashboard');
    } else if (user?.role === 'DOCTOR') {
      if (notif.type === 'APPOINTMENT_BOOKED') {
        navigate('/ehealth/dashboard');
      } else {
        navigate('/ehealth/consultations');
      }
    }
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

  const getNotifIcon = (type: string) => {
    if (type.startsWith('APPOINTMENT_')) return <Calendar className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />;
    if (type.startsWith('CONSULTATION_')) return <FileText className="h-4 w-4" style={{ color: 'var(--color-info)' }} />;
    return <Activity className="h-4 w-4" style={{ color: 'var(--color-success)' }} />;
  };

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

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifDropdownRef}>
          <button
            onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
            className="relative p-2.5 rounded-lg transition-all duration-200 hover:bg-[var(--color-surface-hover)]"
            style={{ color: 'var(--color-text-secondary)' }}
            title={t('nav.notifications')}
          >
            <Bell className="h-[18px] w-[18px]" />
            {/* Notification Badge */}
            {unreadCount > 0 && (
              <span
                className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {notifDropdownOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-80 max-w-sm rounded-xl border py-2 animate-scale-in"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                boxShadow: 'var(--shadow-dropdown)',
              }}
            >
              {/* Dropdown Header */}
              <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <span className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                  {t('notifications.title', 'Notifications')}
                </span>
                <div className="flex items-center gap-3">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="flex items-center gap-1 text-xs font-semibold transition-colors hover:opacity-80"
                      style={{ color: 'var(--color-primary)' }}
                      title={t('notifications.mark_all_read', 'Read all')}
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      {t('notifications.mark_all_read', 'Read all')}
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={clearAllNotifications}
                      className="flex items-center gap-1 text-xs font-semibold transition-colors hover:opacity-80"
                      style={{ color: 'var(--color-error)' }}
                      title={t('notifications.clear_all', 'Clear all notifications')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t('notifications.clear_all', 'Clear all')}
                    </button>
                  )}
                </div>
              </div>

              {/* Notification List */}
              <div className="max-h-72 overflow-y-auto divide-y">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                    {t('notifications.empty', 'No notifications yet.')}
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-[var(--color-surface-hover)] relative group ${
                        !notif.is_read ? 'bg-[var(--color-surface-elevated)]' : ''
                      }`}
                    >
                      {/* Icon */}
                      <div className="p-1.5 rounded-lg bg-[var(--color-surface)] border" style={{ borderColor: 'var(--color-border)' }}>
                        {getNotifIcon(notif.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pr-6">
                        <div className="flex items-start justify-between gap-1.5">
                          <p className={`text-xs truncate ${!notif.is_read ? 'font-bold' : 'font-medium'}`} style={{ color: 'var(--color-text-primary)' }}>
                            {notif.title}
                          </p>
                          <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--color-text-tertiary)' }}>
                            {formatTimeAgo(notif.created_at)}
                          </span>
                        </div>
                        <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>
                          {notif.message}
                        </p>
                      </div>

                      {/* Unread Dot or Delete Button on Hover */}
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
                        {!notif.is_read && (
                          <div className="h-1.5 w-1.5 rounded-full group-hover:hidden" style={{ backgroundColor: 'var(--color-primary)' }} />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notif.id);
                          }}
                          className="p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--color-surface-hover)]"
                          style={{ color: 'var(--color-text-tertiary)' }}
                          title={t('common.delete', 'Delete')}
                        >
                          <Trash2 className="h-3.5 w-3.5 hover:text-[var(--color-error)]" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

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
