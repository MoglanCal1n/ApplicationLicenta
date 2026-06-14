import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Search,
  CalendarDays,
  Mic,
  FileText,
  UserCircle,
  Shield,
  Users,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  ClipboardList,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  roles: Array<'PATIENT' | 'DOCTOR' | 'ADMIN'>;
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/ehealth/dashboard',
    icon: LayoutDashboard,
    label: 'nav.dashboard',
    roles: ['PATIENT', 'DOCTOR', 'ADMIN'],
  },
  {
    to: '/ehealth/appointments',
    icon: CalendarDays,
    label: 'nav.book_appointment',
    roles: ['PATIENT'],
  },
  {
    to: '/ehealth/consultation',
    icon: Mic,
    label: 'nav.consultation_studio',
    roles: ['DOCTOR'],
  },
  {
    to: '/ehealth/consultations',
    icon: FileText,
    label: 'nav.my_consultations',
    roles: ['DOCTOR'],
  },
  {
    to: '/ehealth/admin',
    icon: Shield,
    label: 'nav.admin_panel',
    roles: ['ADMIN'],
  },
  {
    to: '/ehealth/admin/users',
    icon: Users,
    label: 'nav.admin_users',
    roles: ['ADMIN'],
  },
  {
    to: '/ehealth/profile',
    icon: UserCircle,
    label: 'nav.profile',
    roles: ['PATIENT', 'DOCTOR', 'ADMIN'],
  },
];

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!user) return null;

  const filteredItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(user.role)
  );

  return (
    <aside
      className={`fixed top-[var(--navbar-height)] left-0 bottom-0 z-30 flex flex-col border-r transition-all duration-300 ease-in-out ${
        collapsed ? 'w-[var(--sidebar-collapsed-width)]' : 'w-[var(--sidebar-width)]'
      }`}
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Logo area */}
      <div
        className={`flex items-center gap-2.5 px-4 py-5 border-b cursor-pointer transition-all ${
          collapsed ? 'justify-center' : ''
        }`}
        style={{ borderColor: 'var(--color-border)' }}
        onClick={() => navigate('/ehealth/dashboard')}
      >
        <div
          className="flex items-center justify-center rounded-lg p-1.5 shrink-0"
          style={{ backgroundColor: 'var(--color-primary-light)' }}
        >
          <Stethoscope
            className="h-6 w-6"
            style={{ color: 'var(--color-primary)' }}
          />
        </div>
        {!collapsed && (
          <span
            className="text-lg font-bold tracking-tight whitespace-nowrap"
            style={{ color: 'var(--color-text-primary)' }}
          >
            E-Health <span style={{ color: 'var(--color-primary)' }}>AI</span>
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 no-scrollbar">
        <ul className="space-y-1">
          {filteredItems.map((item) => (
            <li key={item.to + item.label}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative ${
                    collapsed ? 'justify-center' : ''
                  } ${
                    isActive
                      ? ''
                      : 'hover:bg-[var(--color-surface-hover)]'
                  }`
                }
                style={({ isActive }) => ({
                  backgroundColor: isActive
                    ? 'var(--color-primary-light)'
                    : undefined,
                  color: isActive
                    ? 'var(--color-primary)'
                    : 'var(--color-text-secondary)',
                })}
              >
                {({ isActive }) => (
                  <>
                    {/* Active indicator bar */}
                    {isActive && (
                      <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full"
                        style={{ backgroundColor: 'var(--color-primary)' }}
                      />
                    )}
                    <item.icon
                      className={`h-5 w-5 shrink-0 transition-colors ${
                        isActive ? '' : 'group-hover:text-[var(--color-primary)]'
                      }`}
                    />
                    {!collapsed && (
                      <span className="truncate">{t(item.label)}</span>
                    )}

                    {/* Tooltip for collapsed state */}
                    {collapsed && (
                      <div
                        className="absolute left-full ml-2 px-2.5 py-1.5 rounded-md text-xs font-medium opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none"
                        style={{
                          backgroundColor: 'var(--color-text-primary)',
                          color: 'var(--color-text-inverse)',
                        }}
                      >
                        {t(item.label)}
                      </div>
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Collapse toggle */}
      <div
        className="border-t p-2"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <button
          onClick={onToggle}
          className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-[var(--color-surface-hover)] ${
            collapsed ? 'justify-center' : ''
          }`}
          style={{ color: 'var(--color-text-tertiary)' }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5" />
              <span>{t('nav.collapse')}</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
