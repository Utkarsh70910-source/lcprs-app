import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const STATUSES = ['all', 'open', 'in_progress', 'resolved', 'rejected'];
const CATEGORIES = ['all', 'pothole', 'garbage', 'streetlight', 'waterleakage', 'encroachment', 'other'];

const AdminPanel = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('reports');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [userPage, setUserPage] = useState(1);
  const [userPagination, setUserPagination] = useState({});
  const [updating, setUpdating] = useState(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      const { data } = await axios.get('/api/reports', { params });
      setReports(data.reports);
      setPagination(data.pagination);
    } catch {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = { page: userPage, limit: 15 };
      if (search) params.search = search;
      const { data } = await axios.get('/api/users', { params });
      setUsers(data.users);
      setUserPagination(data.pagination);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const { data } = await axios.get('/api/users/staff');
      setStaff(data.staff);
    } catch {}
  };

  useEffect(() => {
    if (activeTab === 'reports') fetchReports();
    else if (activeTab === 'users') fetchUsers();
  }, [activeTab, statusFilter, categoryFilter, page, userPage, search]);

  useEffect(() => { fetchStaff(); }, []);

  const updateStatus = async (reportId, status) => {
    setUpdating(reportId);
    try {
      const { data } = await axios.patch(`/api/reports/${reportId}/status`, { status });
      setReports((prev) => prev.map((r) => r._id === reportId ? data.report : r));
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update');
    } finally {
      setUpdating(null);
    }
  };

  const assignStaff = async (reportId, staffId) => {
    try {
      await axios.patch(`/api/reports/${reportId}/assign`, { assignedTo: staffId || null });
      setReports((prev) =>
        prev.map((r) =>
          r._id === reportId
            ? { ...r, assignedTo: staff.find((s) => s._id === staffId) || null }
            : r
        )
      );
      toast.success('Assigned');
    } catch {
      toast.error('Failed to assign');
    }
  };

  const changeRole = async (userId, role) => {
    try {
      await axios.patch(`/api/users/${userId}/role`, { role });
      setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, role } : u));
      toast.success('Role updated');
    } catch {
      toast.error('Failed to update role');
    }
  };

  const deleteReport = async (reportId) => {
    if (!window.confirm('Delete this report permanently?')) return;
    try {
      await axios.delete(`/api/reports/${reportId}`);
      setReports((prev) => prev.filter((r) => r._id !== reportId));
      toast.success('Report deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const tabs = [
    { key: 'reports', label: 'Reports', icon: '📋' },
    ...(user?.role === 'admin' ? [{ key: 'users', label: 'Users', icon: '👥' }] : []),
  ];

  return (
    <div className="container" style={{ paddingBottom: 60 }}>
      <div className="page-header">
        <div>
          <h1>{user?.role === 'admin' ? 'Admin Panel' : 'Manage Reports'}</h1>
          <p>Manage community reports and {user?.role === 'admin' ? 'user accounts' : 'assigned issues'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 4, width: 'fit-content' }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '8px 24px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: activeTab === tab.key ? 'var(--accent-gradient)' : 'transparent',
              color: activeTab === tab.key ? '#fff' : 'var(--text-muted)',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Reports Tab ──────────────────────────────────────────── */}
      {activeTab === 'reports' && (
        <>
          {/* Filters */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 20px', marginBottom: 20, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              style={{ width: 'auto', padding: '8px 14px' }}
            >
              {STATUSES.map((s) => <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.replace('_', ' ')}</option>)}
            </select>
            <select
              className="form-select"
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              style={{ width: 'auto', padding: '8px 14px' }}
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
            </select>
            <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-muted)' }}>
              {pagination.total || 0} total reports
            </span>
          </div>

          {/* Table */}
          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Report</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th>Priority</th>
                      <th>Submitted By</th>
                      {user?.role === 'admin' && <th>Assigned To</th>}
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                          No reports found
                        </td>
                      </tr>
                    ) : (
                      reports.map((r) => (
                        <tr key={r._id}>
                          <td>
                            <Link
                              to={`/report/${r._id}`}
                              style={{
                                color: 'var(--text-primary)',
                                fontWeight: 500,
                                fontSize: 13,
                                maxWidth: 220,
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {r.title}
                            </Link>
                          </td>
                          <td style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{r.category}</td>
                          <td>
                            <select
                              value={r.status}
                              onChange={(e) => updateStatus(r._id, e.target.value)}
                              disabled={updating === r._id || user?.role === 'staff' && r.assignedTo?._id !== user._id}
                              style={{
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--text-primary)',
                                fontSize: 12,
                                padding: '4px 8px',
                                cursor: 'pointer',
                              }}
                            >
                              {['open', 'in_progress', 'resolved', 'rejected'].map((s) => (
                                <option key={s} value={s}>{s.replace('_', ' ')}</option>
                              ))}
                            </select>
                          </td>
                          <td><StatusBadge status={r.priority} type="priority" size="sm" /></td>
                          <td style={{ fontSize: 13 }}>{r.submittedBy?.name || '—'}</td>
                          {user?.role === 'admin' && (
                            <td>
                              <select
                                value={r.assignedTo?._id || ''}
                                onChange={(e) => assignStaff(r._id, e.target.value)}
                                style={{
                                  background: 'var(--bg-secondary)',
                                  border: '1px solid var(--border)',
                                  borderRadius: 'var(--radius-sm)',
                                  color: 'var(--text-primary)',
                                  fontSize: 12,
                                  padding: '4px 8px',
                                  cursor: 'pointer',
                                  maxWidth: 150,
                                }}
                              >
                                <option value="">Unassigned</option>
                                {staff.map((s) => (
                                  <option key={s._id} value={s._id}>{s.name}</option>
                                ))}
                              </select>
                            </td>
                          )}
                          <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                            {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <Link to={`/report/${r._id}`} className="btn btn-ghost btn-sm" title="View">👁️</Link>
                              {user?.role === 'admin' && (
                                <button className="btn btn-danger btn-sm" onClick={() => deleteReport(r._id)} title="Delete">🗑️</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              {pagination.pages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: 16, borderTop: '1px solid var(--border)' }}>
                  <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
                  <span style={{ padding: '6px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--text-secondary)' }}>{page} / {pagination.pages}</span>
                  <button className="btn btn-secondary btn-sm" disabled={page === pagination.pages} onClick={() => setPage((p) => p + 1)}>Next →</button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ─── Users Tab ────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <>
          <div style={{ marginBottom: 20, display: 'flex', gap: 12 }}>
            <input
              className="form-input"
              placeholder="Search users by name or email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setUserPage(1); }}
              style={{ maxWidth: 340 }}
            />
            <span style={{ padding: '12px 0', fontSize: 13, color: 'var(--text-muted)' }}>
              {userPagination.total || 0} users
            </span>
          </div>

          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Zone</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u._id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                              {u.name?.[0]?.toUpperCase()}
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{u.name}</span>
                          </div>
                        </td>
                        <td style={{ fontSize: 13 }}>{u.email}</td>
                        <td>
                          <select
                            value={u.role}
                            onChange={(e) => changeRole(u._id, e.target.value)}
                            disabled={u._id === user._id}
                            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 12, padding: '4px 8px', cursor: 'pointer' }}
                          >
                            {['citizen', 'staff', 'admin'].map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{u.zone || '—'}</td>
                        <td style={{ fontSize: 12 }}>{new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        <td>
                          <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 100, background: u.isVerified ? 'var(--green-bg)' : 'var(--yellow-bg)', color: u.isVerified ? 'var(--green)' : 'var(--yellow)' }}>
                            {u.isVerified ? 'Verified' : 'Unverified'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {userPagination.pages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: 16, borderTop: '1px solid var(--border)' }}>
                  <button className="btn btn-secondary btn-sm" disabled={userPage === 1} onClick={() => setUserPage((p) => p - 1)}>← Prev</button>
                  <span style={{ padding: '6px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--text-secondary)' }}>{userPage} / {userPagination.pages}</span>
                  <button className="btn btn-secondary btn-sm" disabled={userPage === userPagination.pages} onClick={() => setUserPage((p) => p + 1)}>Next →</button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminPanel;
