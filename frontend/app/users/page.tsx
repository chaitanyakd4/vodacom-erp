'use client';
import { useState, useEffect } from 'react';
import { UserPlus, Trash2, Mail, ShieldCheck, RefreshCw, Settings2, Crown, Lock, CheckSquare, Square, Save, X, Eye, EyeOff } from 'lucide-react';
import api from '../../lib/api';
import { ALL_MODULES } from '../../hooks/usePermissions';

interface User {
  id: number;
  email: string;
  is_superadmin: boolean;
  permissions: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // New user form state
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  // Permissions editor state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editPerms, setEditPerms] = useState<Set<string>>(new Set());
  const [savingPerms, setSavingPerms] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/auth/users');
      setUsers(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccess('');
    if (newPassword.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }
    setCreating(true);
    try {
      await api.post('/api/auth/users', { email: newEmail, password: newPassword });
      setSuccess(`User "${newEmail}" created successfully.`);
      setNewEmail('');
      setNewPassword('');
      fetchUsers();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to create user.');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Are you sure you want to delete ${user.email}? This action cannot be undone.`)) return;
    setSuccess('');
    setError('');
    try {
      await api.delete(`/api/auth/users/${user.id}`);
      setSuccess(`User "${user.email}" deleted.`);
      if (editingUser?.id === user.id) setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete user.');
    }
  };

  const openPermEditor = (user: User) => {
    setEditingUser(user);
    if (user.permissions === 'all' || user.is_superadmin) {
      setEditPerms(new Set(ALL_MODULES.map(m => m.slug)));
    } else {
      setEditPerms(new Set(user.permissions.split(',').map(s => s.trim()).filter(Boolean)));
    }
    setSuccess('');
    setError('');
  };

  const toggleModule = (slug: string) => {
    setEditPerms(prev => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const handleSavePerms = async () => {
    if (!editingUser) return;
    setSavingPerms(true);
    setSuccess('');
    setError('');
    try {
      const permStr = editPerms.size === ALL_MODULES.length
        ? 'all'
        : Array.from(editPerms).join(',');
      await api.patch(`/api/auth/users/${editingUser.id}/permissions`, { permissions: permStr });
      setSuccess(`Permissions updated for ${editingUser.email}.`);
      fetchUsers();
      setEditingUser(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update permissions.');
    } finally {
      setSavingPerms(false);
    }
  };

  const handleToggleSuperadmin = async (user: User) => {
    const action = user.is_superadmin ? 'demote from' : 'promote to';
    if (!confirm(`Are you sure you want to ${action} superadmin for ${user.email}?`)) return;
    setSuccess('');
    setError('');
    try {
      await api.patch(`/api/auth/users/${user.id}/superadmin`, { is_superadmin: !user.is_superadmin });
      setSuccess(`${user.email} superadmin status updated.`);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update superadmin status.');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">User Management</h1>
          <p className="text-[11px] text-vodacom-muted mt-0.5">Manage users and control which sections they can access</p>
        </div>
        <button onClick={fetchUsers} className="flex items-center gap-2 text-xs font-semibold text-vodacom-muted hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 transition-all duration-200">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {success && <div className="mb-4 px-4 py-3 rounded-xl bg-vodacom-green/10 border border-vodacom-green/20 text-vodacom-green text-xs font-medium">{success}</div>}
      {error   && <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Add New User ── */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-vodacom-blue/20 border border-vodacom-blue/30 flex items-center justify-center">
                <UserPlus size={16} className="text-vodacom-green" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Add New User</h2>
                <p className="text-[10px] text-vodacom-muted">Grant someone portal access</p>
              </div>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Email Address</label>
                <input
                  type="email" required value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="e.g. john@yourcompany.com"
                  className="w-full px-4 py-2.5 bg-vodacom-darker/60 border border-white/10 rounded-xl text-[13px] text-white placeholder-vodacom-muted focus:outline-none focus:ring-1 focus:ring-vodacom-blue transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-vodacom-muted uppercase tracking-wider mb-1.5">Initial Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'} required minLength={6} value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full pl-4 pr-11 py-2.5 bg-vodacom-darker/60 border border-white/10 rounded-xl text-[13px] text-white placeholder-vodacom-muted focus:outline-none focus:ring-1 focus:ring-vodacom-blue transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-vodacom-muted hover:text-white transition-colors duration-150"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[10px] text-vodacom-muted mt-1.5">New users start with access to ALL modules. Restrict them below after creation.</p>
              </div>
              {formError && <p className="text-red-400 text-xs font-medium">{formError}</p>}
              <button
                type="submit" disabled={creating}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 text-xs font-bold uppercase tracking-wider rounded-xl text-white bg-vodacom-green hover:bg-emerald-500 disabled:opacity-50 transition-all duration-200 shadow-lg shadow-vodacom-green/20"
              >
                <UserPlus size={13} />
                {creating ? 'Creating...' : 'Create User'}
              </button>
            </form>
          </div>

          {/* Permissions Editor Panel */}
          {editingUser && (
            <div className="glass-panel rounded-2xl p-5 border border-vodacom-blue/30 shadow-lg shadow-vodacom-blue/5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Settings2 size={14} className="text-vodacom-blue" />
                    Module Permissions
                  </h3>
                  <p className="text-[10px] text-vodacom-muted mt-0.5 truncate max-w-[160px]">{editingUser.email}</p>
                </div>
                <button onClick={() => setEditingUser(null)} className="text-vodacom-muted hover:text-white transition-colors">
                  <X size={15} />
                </button>
              </div>

              <div className="space-y-2 mb-4">
                {ALL_MODULES.map(mod => {
                  const checked = editPerms.has(mod.slug);
                  return (
                    <button
                      key={mod.slug}
                      onClick={() => toggleModule(mod.slug)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[12px] font-medium transition-all duration-150 border ${
                        checked
                          ? 'bg-vodacom-green/10 border-vodacom-green/30 text-white'
                          : 'bg-white/5 border-white/5 text-vodacom-muted hover:text-white hover:border-white/10'
                      }`}
                    >
                      {checked
                        ? <CheckSquare size={14} className="text-vodacom-green flex-shrink-0" />
                        : <Square size={14} className="flex-shrink-0" />
                      }
                      {mod.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setEditPerms(new Set(ALL_MODULES.map(m => m.slug)))}
                  className="flex-1 text-[10px] font-semibold text-vodacom-muted hover:text-white py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-200"
                >
                  All
                </button>
                <button
                  onClick={() => setEditPerms(new Set())}
                  className="flex-1 text-[10px] font-semibold text-vodacom-muted hover:text-white py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-200"
                >
                  None
                </button>
                <button
                  onClick={handleSavePerms}
                  disabled={savingPerms}
                  className="flex-1 flex justify-center items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white py-2 rounded-lg bg-vodacom-blue hover:bg-blue-600 disabled:opacity-50 transition-all duration-200"
                >
                  <Save size={12} />
                  {savingPerms ? '...' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── User List ── */}
        <div className="lg:col-span-2">
          <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Existing Users</h2>
              <span className="text-[11px] text-vodacom-muted font-mono">
                {loading ? '...' : `${users.length} account${users.length !== 1 ? 's' : ''}`}
              </span>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-7 h-7 border-2 border-vodacom-blue border-t-transparent rounded-full animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <div className="py-12 text-center text-vodacom-muted text-sm">No users found.</div>
            ) : (
              <div className="divide-y divide-white/5">
                {users.map(user => {
                  const isEditing = editingUser?.id === user.id;
                  const permCount = user.permissions === 'all'
                    ? ALL_MODULES.length
                    : user.permissions.split(',').filter(Boolean).length;

                  return (
                    <div
                      key={user.id}
                      className={`flex items-center justify-between px-6 py-4 transition-colors duration-150 group ${isEditing ? 'bg-vodacom-blue/5' : 'hover:bg-white/5'}`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-full bg-vodacom-surface border border-white/10 flex items-center justify-center flex-shrink-0 relative">
                          <span className="text-[12px] font-bold text-vodacom-green">
                            {user.email.split('@')[0].slice(0, 2).toUpperCase()}
                          </span>
                          {user.is_superadmin && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                              <Crown size={8} className="text-black" />
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Mail size={11} className="text-vodacom-muted" />
                            <span className="text-[13px] font-medium text-white">{user.email}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {user.is_superadmin ? (
                              <>
                                <Crown size={9} className="text-yellow-400" />
                                <span className="text-[10px] text-yellow-400 uppercase tracking-wider font-bold">Superadmin · Full Access</span>
                              </>
                            ) : (
                              <>
                                <ShieldCheck size={9} className="text-vodacom-muted" />
                                <span className="text-[10px] text-vodacom-muted uppercase tracking-wider">
                                  Staff · {permCount}/{ALL_MODULES.length} modules
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {/* Permissions editor toggle */}
                        {!user.is_superadmin && (
                          <button
                            onClick={() => isEditing ? setEditingUser(null) : openPermEditor(user)}
                            title="Edit permissions"
                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 ${
                              isEditing
                                ? 'bg-vodacom-blue/20 text-vodacom-blue'
                                : 'text-vodacom-muted hover:text-vodacom-blue hover:bg-vodacom-blue/10'
                            }`}
                          >
                            <Settings2 size={14} />
                          </button>
                        )}

                        {/* Superadmin toggle */}
                        <button
                          onClick={() => handleToggleSuperadmin(user)}
                          title={user.is_superadmin ? 'Remove superadmin' : 'Make superadmin'}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 ${
                            user.is_superadmin
                              ? 'text-yellow-400 hover:text-vodacom-muted hover:bg-white/5'
                              : 'text-vodacom-muted hover:text-yellow-400 hover:bg-yellow-400/10'
                          }`}
                        >
                          {user.is_superadmin ? <Lock size={13} /> : <Crown size={13} />}
                        </button>

                        {/* Delete */}
                        {!user.is_superadmin && (
                          <button
                            onClick={() => handleDelete(user)}
                            title="Delete user"
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-vodacom-muted hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 px-4 py-3 rounded-xl bg-vodacom-blue/10 border border-vodacom-blue/20">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              <span className="text-vodacom-green font-semibold">Tip:</span> Hover any user to manage their permissions. Click <strong className="text-white">Settings</strong> to pick which modules they can access. <strong className="text-yellow-400">Crown</strong> = Superadmin with full unrestricted access.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
