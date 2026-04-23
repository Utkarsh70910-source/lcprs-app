import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import ChatBox from '../components/ChatBox';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const CATEGORY_ICONS = {
  pothole: '🕳️', garbage: '🗑️', streetlight: '💡',
  waterleakage: '💧', encroachment: '🚧', other: '📋',
};

const ReportDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState([]);
  const [statusModal, setStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [selectedImg, setSelectedImg] = useState(null);

  useEffect(() => {
    const loadReport = async () => {
      try {
        const { data } = await axios.get(`/api/reports/${id}`);
        setReport(data.report);
        setNewStatus(data.report.status);
      } catch {
        toast.error('Report not found');
      } finally {
        setLoading(false);
      }
    };
    loadReport();
  }, [id]);

  useEffect(() => {
    if (user?.role === 'admin') {
      axios.get('/api/users/staff').then(({ data }) => setStaff(data.staff)).catch(() => {});
    }
  }, [user]);

  const updateStatus = async () => {
    setUpdating(true);
    try {
      const { data } = await axios.patch(`/api/reports/${id}/status`, {
        status: newStatus,
        note: statusNote,
      });
      setReport(data.report);
      setStatusModal(false);
      setStatusNote('');
      toast.success('Status updated!');
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const assignStaff = async (staffId) => {
    try {
      const { data } = await axios.patch(`/api/reports/${id}/assign`, { assignedTo: staffId });
      setReport(data.report);
      toast.success('Staff assigned!');
    } catch {
      toast.error('Failed to assign staff');
    }
  };

  if (loading) return <div className="loading-center" style={{ height: '80vh' }}><div className="spinner" /></div>;
  if (!report) return (
    <div className="container"><div className="empty-state"><span className="empty-icon">❌</span><p>Report not found</p></div></div>
  );

  const coords = report.location?.coordinates;
  const lat = coords?.[1];
  const lng = coords?.[0];

  return (
    <div className="container" style={{ paddingBottom: 60 }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 24, marginBottom: 20, fontSize: 13, color: 'var(--text-muted)' }}>
        <Link to="/dashboard" style={{ color: 'var(--text-muted)' }}>Dashboard</Link>
        <span>›</span>
        <span style={{ color: 'var(--text-primary)' }}>Report #{id.slice(-6).toUpperCase()}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <span style={{ fontSize: 32 }}>{CATEGORY_ICONS[report.category] || '📋'}</span>
            <h1 style={{ fontSize: 24 }}>{report.title}</h1>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <StatusBadge status={report.status} />
            <StatusBadge status={report.priority} type="priority" />
            <span style={{ fontSize: 13, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
              {report.category}
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              · {new Date(report.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Actions for admin/staff */}
        {(user?.role === 'admin' || user?.role === 'staff') && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn-secondary"
              onClick={() => setStatusModal(true)}
            >
              🔄 Update Status
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 4, width: 'fit-content' }}>
        {['details', 'history', 'chat'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 20px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: activeTab === tab ? 'var(--accent-gradient)' : 'transparent',
              color: activeTab === tab ? '#fff' : 'var(--text-muted)',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              textTransform: 'capitalize',
              transition: 'all 0.2s',
            }}
          >
            {tab === 'details' ? '📋 Details' : tab === 'history' ? '📜 History' : '💬 Chat'}
          </button>
        ))}
      </div>

      <div className="submit-form-grid" style={{ alignItems: 'start' }}>
        {/* Main content */}
        <div>
          {activeTab === 'details' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Description */}
              <div className="card">
                <h3 style={{ fontSize: 16, marginBottom: 12 }}>Description</h3>
                <p style={{ lineHeight: 1.8, color: 'var(--text-secondary)' }}>{report.description}</p>
              </div>

              {/* Images */}
              {report.images?.length > 0 && (
                <div className="card">
                  <h3 style={{ fontSize: 16, marginBottom: 16 }}>Photos ({report.images.length})</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                    {report.images.map((img, i) => (
                      <img
                        key={i}
                        src={img.url}
                        alt={`report ${i + 1}`}
                        onClick={() => setSelectedImg(img.url)}
                        style={{
                          width: '100%',
                          aspectRatio: '1',
                          objectFit: 'cover',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                          border: '1px solid var(--border)',
                          transition: 'transform 0.2s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.03)')}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Map */}
              {lat && lng && (
                <div className="card">
                  <h3 style={{ fontSize: 16, marginBottom: 12 }}>📍 Location</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>{report.location?.address}</p>
                  <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', height: 240 }}>
                    <MapContainer center={[lat, lng]} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false} dragging={false} scrollWheelZoom={false}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <Marker position={[lat, lng]} />
                    </MapContainer>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="card">
              <h3 style={{ fontSize: 16, marginBottom: 20 }}>Status Timeline</h3>
              <div style={{ position: 'relative' }}>
                {report.statusHistory?.length === 0 && (
                  <div className="empty-state"><p>No status history yet</p></div>
                )}
                {report.statusHistory?.map((h, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      gap: 16,
                      paddingBottom: i < report.statusHistory.length - 1 ? 24 : 0,
                      position: 'relative',
                    }}
                  >
                    {/* Line */}
                    {i < report.statusHistory.length - 1 && (
                      <div style={{ position: 'absolute', left: 15, top: 32, bottom: 0, width: 2, background: 'var(--border)' }} />
                    )}
                    {/* Dot */}
                    <div style={{ flexShrink: 0 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'var(--bg-secondary)', border: '2px solid var(--accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                        position: 'relative', zIndex: 1,
                      }}>
                        {h.status === 'resolved' ? '✅' : h.status === 'rejected' ? '❌' : h.status === 'in_progress' ? '⚙️' : '📋'}
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <StatusBadge status={h.status} size="sm" />
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          by {h.changedBy?.name || 'System'}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          · {new Date(h.changedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {h.note && (
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                          "{h.note}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <ChatBox reportId={id} />
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Report Info */}
          <div className="card">
            <h4 style={{ fontSize: 15, marginBottom: 16 }}>Report Info</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Submitted by', value: report.submittedBy?.name || 'Unknown', detail: report.submittedBy?.email },
                { label: 'Date', value: new Date(report.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) },
                { label: 'Upvotes', value: `▲ ${report.upvotes || 0}` },
              ].map((item, i) => (
                <div key={i}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3, fontWeight: 600 }}>
                    {item.label}
                  </p>
                  <p style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{item.value}</p>
                  {item.detail && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.detail}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Assigned Staff */}
          <div className="card">
            <h4 style={{ fontSize: 15, marginBottom: 16 }}>Assigned To</h4>
            {report.assignedTo ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>
                  {report.assignedTo.name?.[0]}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{report.assignedTo.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{report.assignedTo.email}</p>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Not yet assigned</p>
            )}

            {user?.role === 'admin' && staff.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Reassign to:</p>
                <select
                  className="form-select"
                  onChange={(e) => assignStaff(e.target.value)}
                  defaultValue=""
                >
                  <option value="" disabled>Select staff member...</option>
                  {staff.map((s) => (
                    <option key={s._id} value={s._id}>{s.name} — {s.zone || 'No zone'}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Resolution date if resolved */}
          {report.resolvedAt && (
            <div className="card" style={{ border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--green)' }}>
                <span style={{ fontSize: 20 }}>✅</span>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--green)', margin: 0 }}>Resolved</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                    {new Date(report.resolvedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Update Modal */}
      {statusModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 9999, padding: 20,
          }}
          onClick={(e) => e.target === e.currentTarget && setStatusModal(false)}
        >
          <div className="card fade-in" style={{ width: '100%', maxWidth: 440 }}>
            <h3 style={{ marginBottom: 24 }}>Update Report Status</h3>
            <div className="form-group">
              <label className="form-label">New Status</label>
              <select className="form-select" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                {['open', 'in_progress', 'resolved', 'rejected'].map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Note (optional)</label>
              <textarea className="form-textarea" value={statusNote} onChange={(e) => setStatusNote(e.target.value)} placeholder="Add a note for the reporter..." rows={3} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => setStatusModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={updateStatus} disabled={updating}>
                {updating ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {selectedImg && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}
          onClick={() => setSelectedImg(null)}
        >
          <img src={selectedImg} alt="full" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 'var(--radius-md)' }} />
        </div>
      )}
    </div>
  );
};

export default ReportDetail;
