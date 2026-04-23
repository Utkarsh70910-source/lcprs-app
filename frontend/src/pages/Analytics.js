import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { CategoryBarChart, TrendLineChart, ResolutionTable } from '../components/AnalyticsCharts';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';

const PRIORITY_COLORS = { high: '#EF4444', medium: '#F59E0B', low: '#10B981' };

const Analytics = () => {
  const [overview, setOverview] = useState(null);
  const [byCategory, setByCategory] = useState([]);
  const [trend, setTrend] = useState([]);
  const [resolution, setResolution] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [ov, cat, tr, res, hm] = await Promise.all([
        axios.get('/api/analytics/overview'),
        axios.get('/api/analytics/by-category'),
        axios.get('/api/analytics/trend'),
        axios.get('/api/analytics/resolution-time'),
        axios.get('/api/analytics/heatmap'),
      ]);
      setOverview(ov.data.data);
      setByCategory(cat.data.data);
      setTrend(tr.data.data);
      setResolution(res.data.data);
      setHeatmap(hm.data.data);
    } catch {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // Auto-refresh every 60s
    const interval = setInterval(() => fetchAll(true), 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="loading-center" style={{ height: '80vh' }}><div className="spinner" /></div>;

  const overviewCards = overview
    ? [
        { label: 'Total Reports', value: overview.total, icon: '📋', color: '#6366F1', bg: 'rgba(99,102,241,0.15)' },
        { label: 'Open', value: overview.open, icon: '🔵', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
        { label: 'In Progress', value: overview.in_progress, icon: '🟡', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
        { label: 'Resolved', value: overview.resolved, icon: '🟢', color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
        { label: 'Rejected', value: overview.rejected, icon: '🔴', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
      ]
    : [];

  const resolutionRate = overview
    ? overview.total > 0
      ? ((overview.resolved / overview.total) * 100).toFixed(1)
      : 0
    : 0;

  // Center map on first heatmap point or India
  const mapCenter = heatmap.length > 0
    ? [heatmap[0].lat, heatmap[0].lng]
    : [20.5937, 78.9629];

  return (
    <div className="container" style={{ paddingBottom: 60 }}>
      <div className="page-header">
        <div>
          <h1>Analytics Dashboard</h1>
          <p>Real-time insights into community issue reporting</p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => fetchAll(true)}
          disabled={refreshing}
        >
          {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Overview Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        {overviewCards.map((s, i) => (
          <div key={i} className="stat-card" style={{ animationDelay: `${i * 0.08}s` }}>
            <div className="stat-icon" style={{ background: s.bg }}>
              <span style={{ fontSize: 22 }}>{s.icon}</span>
            </div>
            <div className="stat-info">
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
        <div className="stat-card" style={{ animationDelay: '0.4s' }}>
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.1)' }}>
            <span style={{ fontSize: 22 }}>✅</span>
          </div>
          <div className="stat-info">
            <div className="stat-value" style={{ color: '#10B981' }}>{resolutionRate}%</div>
            <div className="stat-label">Resolution Rate</div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Bar Chart */}
        <div className="card">
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 16 }}>📊 Reports by Category</h3>
          </div>
          <CategoryBarChart data={byCategory} />
        </div>

        {/* Line Chart */}
        <div className="card">
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 16 }}>📈 30-Day Trend</h3>
          </div>
          <TrendLineChart data={trend} />
        </div>
      </div>

      {/* Heatmap + Resolution Time */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Live Heatmap */}
        <div className="card">
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 16 }}>🗺️ Live Issue Map</h3>
            <span
              style={{
                fontSize: 12, display: 'flex', alignItems: 'center', gap: 5,
                color: 'var(--green)',
                background: 'var(--green-bg)',
                padding: '3px 10px', borderRadius: 100, fontWeight: 600,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
              {heatmap.length} Active
            </span>
          </div>
          <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', height: 300 }}>
            {heatmap.length === 0 ? (
              <div className="empty-state" style={{ height: 300, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                <span className="empty-icon">🗺️</span>
                <p>No active unresolved reports</p>
              </div>
            ) : (
              <MapContainer
                center={mapCenter}
                zoom={heatmap.length === 1 ? 14 : 8}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap contributors'
                />
                {heatmap.map((point, i) => (
                  <CircleMarker
                    key={i}
                    center={[point.lat, point.lng]}
                    radius={point.priority === 'high' ? 12 : point.priority === 'medium' ? 9 : 6}
                    pathOptions={{
                      color: PRIORITY_COLORS[point.priority] || '#6366F1',
                      fillColor: PRIORITY_COLORS[point.priority] || '#6366F1',
                      fillOpacity: 0.5,
                      weight: 2,
                    }}
                  >
                    <Tooltip>
                      <div style={{ fontSize: 12 }}>
                        <strong>{point.category}</strong><br />
                        Priority: {point.priority}
                      </div>
                    </Tooltip>
                  </CircleMarker>
                ))}
              </MapContainer>
            )}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
            {Object.entries(PRIORITY_COLORS).map(([p, c]) => (
              <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block' }} />
                {p}
              </div>
            ))}
          </div>
        </div>

        {/* Resolution Time Table */}
        <div className="card">
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>⏱️ Avg Resolution Time</h3>
          <ResolutionTable data={resolution} />
          {resolution.length > 0 && (
            <div
              style={{
                marginTop: 16,
                padding: '12px 16px',
                background: 'rgba(99,102,241,0.08)',
                border: '1px solid rgba(99,102,241,0.15)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                Overall avg:{' '}
                <strong style={{ color: 'var(--accent)' }}>
                  {(resolution.reduce((a, b) => a + b.avgHours, 0) / resolution.length).toFixed(1)}h
                </strong>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Category Breakdown Cards */}
      {byCategory.length > 0 && (
        <div className="card">
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>📁 Category Breakdown</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {byCategory.map((cat, i) => {
              const total = overview?.total || 1;
              const pct = ((cat.count / total) * 100).toFixed(1);
              return (
                <div
                  key={i}
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                      {cat.category}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{cat.count}</span>
                  </div>
                  {/* Progress bar */}
                  <div style={{ background: 'var(--border)', borderRadius: 100, height: 4, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: 'var(--accent-gradient)',
                        borderRadius: 100,
                        transition: 'width 1s ease',
                      }}
                    />
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{pct}% of total</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
