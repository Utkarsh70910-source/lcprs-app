import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';

const CATEGORY_ICONS = {
  pothole: '🕳️',
  garbage: '🗑️',
  streetlight: '💡',
  waterleakage: '💧',
  encroachment: '🚧',
  other: '📋',
};

const ReportCard = ({ report, onUpvote, showActions = false }) => {
  const icon = CATEGORY_ICONS[report.category] || '📋';
  const date = new Date(report.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div
      className="card fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        padding: 0,
        overflow: 'hidden',
        transition: 'all 0.25s ease',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.5)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '';
        e.currentTarget.style.borderColor = '';
      }}
    >
      {/* Image preview if available */}
      {report.images?.length > 0 && (
        <div
          style={{
            height: 160,
            background: `url(${report.images[0].url}) center/cover no-repeat`,
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, transparent 40%, rgba(17,24,39,0.9))',
            }}
          />
          {report.images.length > 1 && (
            <span
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(8px)',
                color: '#fff',
                fontSize: 12,
                padding: '3px 10px',
                borderRadius: 100,
              }}
            >
              +{report.images.length - 1} photos
            </span>
          )}
        </div>
      )}

      <div style={{ padding: '20px 20px 16px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <span
            style={{
              fontSize: 28,
              flexShrink: 0,
              width: 44,
              height: 44,
              background: 'rgba(99,102,241,0.1)',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Link
              to={`/report/${report._id}`}
              style={{
                color: 'var(--text-primary)',
                fontWeight: 600,
                fontSize: 15,
                display: 'block',
                marginBottom: 4,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {report.title}
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <StatusBadge status={report.status} size="sm" />
              <StatusBadge status={report.priority} type="priority" size="sm" />
            </div>
          </div>
        </div>

        {/* Description */}
        <p
          style={{
            fontSize: 13,
            color: 'var(--text-muted)',
            marginBottom: 16,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: 1.6,
          }}
        >
          {report.description}
        </p>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 12,
            borderTop: '1px solid var(--border)',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              📍 {report.location?.address || 'Location pinned'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{date}</span>
            {onUpvote && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onUpvote(report._id);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  background: 'rgba(99,102,241,0.1)',
                  border: '1px solid rgba(99,102,241,0.2)',
                  borderRadius: 100,
                  padding: '4px 12px',
                  color: 'var(--accent)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99,102,241,0.2)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(99,102,241,0.1)')}
              >
                ▲ {report.upvotes || 0}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportCard;
