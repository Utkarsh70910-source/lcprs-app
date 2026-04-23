import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import ReportCard from '../components/ReportCard';
import StatusBadge from '../components/StatusBadge';
import toast from 'react-hot-toast';

const STATUSES = ['all', 'open', 'in_progress', 'resolved', 'rejected'];
const CATEGORIES = ['all', 'pothole', 'garbage', 'streetlight', 'waterleakage', 'encroachment', 'other'];

const Dashboard = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [viewMode, setViewMode] = useState('grid'); // grid | list

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 9 };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      const { data } = await axios.get('/api/reports', { params });
      setReports(data.reports);
      setPagination(data.pagination);
    } catch (err) {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, [statusFilter, categoryFilter, page]);

  const handleUpvote = async (reportId) => {
    try {
      const { data } = await axios.post(`/api/reports/${reportId}/upvote`);
      setReports((prev) =>
        prev.map((r) => r._id === reportId ? { ...r, upvotes: data.upvotes } : r)
      );
    } catch {}
  };

  const stats = {
    total: reports.length,
    open: reports.filter((r) => r.status === 'open').length,
    in_progress: reports.filter((r) => r.status === 'in_progress').length,
    resolved: reports.filter((r) => r.status === 'resolved').length,
  };

  return (
    <div className="container" style={{ paddingTop: 0, paddingBottom: 40 }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>
            {user?.role === 'citizen' ? 'My Reports' : 'All Reports'}
          </h1>
          <p style={{ marginTop: 6, color: 'var(--text-muted)', fontSize: 14 }}>
            Welcome back, {user?.name?.split(' ')[0]}! Here's what's happening in your area.
          </p>
        </div>
        {(user?.role === 'citizen' || user?.role === 'admin') && (
          <Link to="/submit-report" className="btn btn-primary">
            ✍️ Report an Issue
          </Link>
        )}
      </div>

      {/* Stats Row */}
      <div className="stats-grid">
        {[
          { label: 'Total Reports', value: pagination.total || 0, icon: '📋', bg: 'rgba(99,102,241,0.15)', color: '#6366F1' },
          { label: 'Open', value: stats.open, icon: '🔵', bg: 'rgba(59,130,246,0.15)', color: '#3B82F6' },
          { label: 'In Progress', value: stats.in_progress, icon: '🟡', bg: 'rgba(245,158,11,0.15)', color: '#F59E0B' },
          { label: 'Resolved', value: stats.resolved, icon: '🟢', bg: 'rgba(16,185,129,0.15)', color: '#10B981' },
        ].map((s, i) => (
          <div key={i} className="stat-card" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="stat-icon" style={{ background: s.bg }}>
              <span style={{ fontSize: 22 }}>{s.icon}</span>
            </div>
            <div className="stat-info">
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          marginBottom: 24,
          display: 'flex',
          gap: 20,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontWeight: 600 }}>
            Status
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`filter-chip ${statusFilter === s ? 'active' : ''}`}
                style={{ textTransform: 'capitalize' }}
              >
                {s === 'all' ? 'All' : s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div style={{ width: 1, height: 40, background: 'var(--border)' }} />

        <div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontWeight: 600 }}>
            Category
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => { setCategoryFilter(c); setPage(1); }}
                className={`filter-chip ${categoryFilter === c ? 'active' : ''}`}
                style={{ textTransform: 'capitalize' }}
              >
                {c === 'all' ? 'All' : c}
              </button>
            ))}
          </div>
        </div>

        {/* View toggle */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {['grid', 'list'].map((v) => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              style={{
                background: viewMode === v ? 'var(--accent-glow)' : 'var(--bg-secondary)',
                border: `1px solid ${viewMode === v ? 'var(--accent)' : 'var(--border)'}`,
                color: viewMode === v ? 'var(--accent)' : 'var(--text-muted)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 10px',
                cursor: 'pointer',
                fontSize: 16,
              }}
            >
              {v === 'grid' ? '⊞' : '☰'}
            </button>
          ))}
        </div>
      </div>

      {/* Reports */}
      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : reports.length === 0 ? (
        <div
          className="card"
          style={{ textAlign: 'center', padding: '60px 20px' }}
        >
          <div style={{ fontSize: 56, marginBottom: 16 }}>📭</div>
          <h3 style={{ marginBottom: 8 }}>No reports found</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
            {user?.role === 'citizen'
              ? "You haven't submitted any reports yet."
              : 'No reports match the current filters.'}
          </p>
          {user?.role !== 'staff' && (
            <Link to="/submit-report" className="btn btn-primary">
              Submit Your First Report
            </Link>
          )}
        </div>
      ) : (
        <>
          <div
            style={{
              display: viewMode === 'grid'
                ? 'grid'
                : 'flex',
              gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(250px, 1fr))' : undefined,
              flexDirection: viewMode === 'list' ? 'column' : undefined,
              gap: 16,
            }}
          >
            {reports.map((report) => (
              <ReportCard
                key={report._id}
                report={report}
                onUpvote={user?.role === 'citizen' ? handleUpvote : undefined}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 32 }}>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Prev
              </button>
              <span
                style={{
                  padding: '6px 16px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {page} / {pagination.pages}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page === pagination.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
