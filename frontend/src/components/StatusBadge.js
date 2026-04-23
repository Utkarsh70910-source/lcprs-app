import React from 'react';

const STATUS_CONFIG = {
  open: { label: 'Open', dot: '#3B82F6', bg: 'rgba(59,130,246,0.12)', color: '#3B82F6' },
  in_progress: { label: 'In Progress', dot: '#F59E0B', bg: 'rgba(245,158,11,0.12)', color: '#F59E0B' },
  resolved: { label: 'Resolved', dot: '#10B981', bg: 'rgba(16,185,129,0.12)', color: '#10B981' },
  rejected: { label: 'Rejected', dot: '#EF4444', bg: 'rgba(239,68,68,0.12)', color: '#EF4444' },
};

const PRIORITY_CONFIG = {
  low: { label: 'Low', bg: 'rgba(16,185,129,0.12)', color: '#10B981' },
  medium: { label: 'Medium', bg: 'rgba(245,158,11,0.12)', color: '#F59E0B' },
  high: { label: 'High', bg: 'rgba(239,68,68,0.12)', color: '#EF4444' },
};

const StatusBadge = ({ status, type = 'status', size = 'md' }) => {
  const config =
    type === 'priority' ? PRIORITY_CONFIG[status] : STATUS_CONFIG[status];

  if (!config) return null;

  const fontSize = size === 'sm' ? '11px' : size === 'lg' ? '14px' : '12px';
  const padding = size === 'sm' ? '3px 10px' : size === 'lg' ? '6px 16px' : '4px 12px';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding,
        borderRadius: '100px',
        fontSize,
        fontWeight: 600,
        background: config.bg,
        color: config.color,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        whiteSpace: 'nowrap',
      }}
    >
      {type === 'status' && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: config.color,
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
      )}
      {config.label}
    </span>
  );
};

export default StatusBadge;
