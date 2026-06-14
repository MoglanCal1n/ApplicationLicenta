import React, { useEffect, useState, useCallback } from 'react';
import {
  Users, Plus, Mail, Shield, Key, Search,
  ChevronLeft, ChevronRight, RefreshCw, ArrowLeft, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useToast, SectionCard, Spinner } from '../components/ui';

const inputCls = "w-full rounded-xl px-4 py-3 text-sm outline-none transition-all";
const inputStyle = {
  backgroundColor: 'var(--color-surface-elevated)',
  border: '2px solid var(--color-border)',
  color: 'var(--color-text-primary)',
};

export default function AdminUsers() {
  const navigate = useNavigate();
  const { show: showToast, ToastNode } = useToast();

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  // Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'PATIENT'
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (roleFilter) params.role = roleFilter;

      const res = await api.get('/admin/users/list', { params });
      setUsers(res.data.items || []);
      setTotalPages(res.data.pages || 1);
      setTotalUsers(res.data.total || 0);
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to load users.', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, limit, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRoleFilter(e.target.value);
    setPage(1);
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      showToast('Please fill in all fields.', 'error');
      return;
    }

    setModalLoading(true);
    try {
      await api.post('/admin/users/create', formData);
      showToast('User account created successfully!', 'success');
      setCreateModalOpen(false);
      setFormData({ email: '', password: '', role: 'PATIENT' });
      fetchUsers();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to create user account.', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl animate-fade-in">
      {ToastNode}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <button
            onClick={() => navigate('/ehealth/admin')}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-2 transition-colors hover:opacity-80"
            style={{ color: 'var(--color-primary)' }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <Users className="h-8 w-8" style={{ color: 'var(--color-primary)' }} />
            User Management
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Search, filter, and create user accounts directly for your E-Health platform.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="p-3 rounded-xl transition-all border hover:opacity-80 active:scale-95 disabled:opacity-50"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)'
            }}
            title="Refresh List"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold shadow-md transition-all hover:opacity-90 active:scale-95 text-white"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Plus className="h-5 w-5" />
            Create User
          </button>
        </div>
      </div>

      {/* Filter and Table Container */}
      <SectionCard>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5" style={{ color: 'var(--color-text-secondary)' }} />
              <input
                type="text"
                placeholder="Search is done by filtering roles..."
                disabled
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none border cursor-not-allowed opacity-60"
                style={{
                  backgroundColor: 'var(--color-surface-elevated)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
              Filter Role:
            </label>
            <select
              value={roleFilter}
              onChange={handleRoleFilterChange}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold outline-none border transition-all cursor-pointer"
              style={{
                backgroundColor: 'var(--color-surface-elevated)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            >
              <option value="">All Roles</option>
              <option value="PATIENT">Patient</option>
              <option value="DOCTOR">Doctor</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--color-border)' }}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-surface-elevated)', borderBottom: '1px solid var(--color-border)' }}>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>User</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>Role</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>Details</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Spinner size="lg" />
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Loading user accounts...</p>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>No user accounts found matching your filters.</p>
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-[var(--color-surface-elevated)] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full flex items-center justify-center font-bold text-white text-sm" style={{ backgroundColor: u.role === 'ADMIN' ? 'var(--color-primary)' : u.role === 'DOCTOR' ? 'var(--color-info)' : 'var(--color-success)' }}>
                          {u.profile_picture_url ? (
                            <img src={u.profile_picture_url} alt="Profile" className="h-full w-full rounded-full object-cover" />
                          ) : (
                            (u.first_name?.[0] || u.email[0]).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                            {u.first_name || u.last_name ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : 'Unnamed Account'}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{
                        backgroundColor: u.role === 'ADMIN' ? 'var(--color-primary-light)' : u.role === 'DOCTOR' ? 'var(--color-info-light)' : 'var(--color-success-light)',
                        color: u.role === 'ADMIN' ? 'var(--color-primary)' : u.role === 'DOCTOR' ? 'var(--color-info)' : 'var(--color-success)',
                        border: `1px solid ${u.role === 'ADMIN' ? 'var(--color-primary)' : u.role === 'DOCTOR' ? 'var(--color-info)' : 'var(--color-success)'}`
                      }}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs space-y-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                        {u.role === 'PATIENT' && (
                          <p><span className="font-semibold text-[var(--color-text-primary)]">CNP:</span> {u.cnp || 'N/A'}</p>
                        )}
                        {u.role === 'DOCTOR' && (
                          <>
                            <p><span className="font-semibold text-[var(--color-text-primary)]">Specialization:</span> {u.specialization || 'N/A'}</p>
                            <p><span className="font-semibold text-[var(--color-text-primary)]">License:</span> {u.license_number || 'N/A'}</p>
                          </>
                        )}
                        {u.role === 'ADMIN' && <p>System Administrator</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                      {new Date(u.created_at).toLocaleDateString(navigator.language, {
                        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              Showing Page <span className="font-bold text-[var(--color-text-primary)]">{page}</span> of <span className="font-bold text-[var(--color-text-primary)]">{totalPages}</span> ({totalUsers} total users)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border transition-all hover:bg-[var(--color-surface-elevated)] disabled:opacity-40"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="p-2 rounded-lg border transition-all hover:bg-[var(--color-surface-elevated)] disabled:opacity-40"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Create User Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div
            className="w-full max-w-md rounded-2xl p-6 shadow-2xl border animate-slide-in-up"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)'
            }}
          >
            <h2 className="text-xl font-bold mb-1.5 flex items-center gap-2">
              <Plus className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
              Create User Account
            </h2>
            <p className="text-xs mb-6" style={{ color: 'var(--color-text-secondary)' }}>
              Add a new authenticated patient, doctor, or administrator directly to the E-Health database.
            </p>

            <form onSubmit={handleCreateUserSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4" style={{ color: 'var(--color-text-secondary)' }} />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@example.com"
                    className={`${inputCls} pl-10`}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                  Password
                </label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-3.5 h-4 w-4" style={{ color: 'var(--color-text-secondary)' }} />
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className={`${inputCls} pl-10`}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                  Account Role
                </label>
                <div className="relative">
                  <Shield className="absolute left-3.5 top-3.5 h-4 w-4" style={{ color: 'var(--color-text-secondary)' }} />
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className={`${inputCls} pl-10 cursor-pointer`}
                    style={inputStyle}
                  >
                    <option value="PATIENT">Patient</option>
                    <option value="DOCTOR">Doctor</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-[var(--color-surface-elevated)]"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-all hover:opacity-90 active:scale-95 text-white disabled:opacity-50"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {modalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
