import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import axios from 'axios';

const Navbar = () => {
  const { user, logout, accessToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const notifRef = useRef(null);
  const menuRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Load notifications from API on component mount
  useEffect(() => {
    const load = async () => {
      try {
        if (!accessToken) return;
        const res = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/notifications`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (res.data.success) {
          setNotifications(res.data.notifications);
        }
      } catch (err) {
        console.error('Failed to load notifications', err);
      }
    };
    load();
  }, [accessToken]);

  // Socket for live notifications
  useEffect(() => {
    if (!accessToken) return;
    const socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
      auth: { token: accessToken },
      transports: ['websocket'],
    });
    socket.on('notification', ({ notification }) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 20));
    });
    return () => socket.disconnect();
  }, [accessToken]);

  const unread = notifications.filter((n) => !n.isRead).length;

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      if (!accessToken) return;
      await axios.patch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/notifications/mark-read`, {}, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
    } catch {}
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
    ...(user?.role === 'citizen'
      ? [
          { path: '/submit-report', label: 'Report Issue', icon: '✍️' },
          { path: '/profile', label: 'My Profile', icon: '🪪' },
        ]
      : []),
    ...(user?.role === 'admin' || user?.role === 'staff'
      ? [
          { path: '/admin', label: user?.role === 'staff' ? 'Staff Panel' : 'Admin Panel', icon: '🛡️' },
          { path: '/analytics', label: 'Analytics', icon: '📊' },
        ]
      : []),
  ];

  const avatarLetter = user?.name?.[0]?.toUpperCase() || 'U';

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'rgba(8,11,20,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        height: 64,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div
        className="container"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}
      >
        {/* Logo */}
        <Link
          to="/dashboard"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: 'var(--text-primary)',
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 700,
            fontSize: 18,
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              background: 'var(--accent-gradient)',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              boxShadow: '0 0 20px rgba(99,102,241,0.4)',
            }}
          >
            🏘️
          </div>
          <span>CivicAlert</span>
        </Link>

        {/* Desktop Nav */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
          className="nav-links-desktop"
        >
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: 14,
                fontWeight: 500,
                color: isActive(link.path) ? 'var(--accent)' : 'var(--text-secondary)',
                background: isActive(link.path) ? 'var(--accent-glow)' : 'transparent',
                border: isActive(link.path)
                  ? '1px solid rgba(99,102,241,0.3)'
                  : '1px solid transparent',
                transition: 'all 0.2s',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => {
                if (!isActive(link.path)) {
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.background = 'var(--bg-card)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive(link.path)) {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <span>{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Notifications Bell */}
          <div style={{ position: 'relative' }} ref={notifRef}>
            <button
              onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs) markAllRead(); }}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-full)',
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                position: 'relative',
                fontSize: 18,
                transition: 'all 0.2s',
              }}
            >
              🔔
              {unread > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    background: 'var(--red)',
                    color: '#fff',
                    borderRadius: '50%',
                    width: 16,
                    height: 16,
                    fontSize: 10,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid var(--bg-primary)',
                  }}
                >
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>

            {showNotifs && (
              <div
                style={{
                  position: 'absolute',
                  top: 48,
                  right: 0,
                  width: 320,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 2000,
                  overflow: 'hidden',
                  animation: 'fadeIn 0.2s ease',
                }}
              >
                <div
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                    Notifications
                  </span>
                </div>
                <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((n, i) => (
                      <div
                        key={i}
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid var(--border)',
                          display: 'flex',
                          gap: 10,
                          background: n.isRead ? 'transparent' : 'rgba(99,102,241,0.05)',
                        }}
                      >
                        <span style={{ fontSize: 18, flexShrink: 0 }}>
                          {n.type === 'report_resolved' ? '✅' :
                           n.type === 'status_update' ? '🔄' :
                           n.type === 'new_message' ? '💬' : '📋'}
                        </span>
                        <div>
                          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                            {n.message}
                          </p>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {new Date(n.createdAt || Date.now()).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div style={{ position: 'relative' }} ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-full)',
                padding: '6px 14px 6px 6px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: user?.avatar
                    ? `url(${user.avatar}) center/cover`
                    : 'var(--accent-gradient)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 14,
                  flexShrink: 0,
                }}
              >
                {!user?.avatar && avatarLetter}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                  {user?.name?.split(' ')[0]}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize', lineHeight: 1.2 }}>
                  {user?.role}
                </div>
              </div>
            </button>

            {showMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: 52,
                  right: 0,
                  width: 200,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 2000,
                  overflow: 'hidden',
                  animation: 'fadeIn 0.2s ease',
                }}
              >
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    {user?.name}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>{user?.email}</p>
                  <span style={{
                    display: 'inline-block', marginTop: 6, fontSize: 10, padding: '2px 8px',
                    borderRadius: 100, fontWeight: 600, textTransform: 'capitalize',
                    background: 'var(--accent-glow)', color: 'var(--accent)',
                    border: '1px solid rgba(99,102,241,0.3)',
                  }}>{user?.role}</span>
                </div>
                <div style={{ padding: '8px' }}>
                  {/* Role-specific quick links */}
                  {user?.role === 'citizen' && (
                    <Link
                      to="/profile"
                      onClick={() => setShowMenu(false)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                        fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)',
                        textDecoration: 'none', transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    >
                      🪪 My Profile
                    </Link>
                  )}
                  {(user?.role === 'admin' || user?.role === 'staff') && (
                    <Link
                      to="/admin"
                      onClick={() => setShowMenu(false)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                        fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)',
                        textDecoration: 'none', transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    >
                      🛡️ {user?.role === 'staff' ? 'Staff Panel' : 'Admin Panel'}
                    </Link>
                  )}
                  <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--red)',
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--red-bg)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    🚪 Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
