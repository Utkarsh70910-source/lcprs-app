import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

let socketInstance = null;

const ChatBox = ({ reportId }) => {
  const { user, accessToken } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [connected, setConnected] = useState(false);
  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);
  const socketRef = useRef(null);

  // Load message history
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const { data } = await axios.get(`/api/chat/${reportId}`);
        setMessages(data.messages);
        // Mark as seen
        await axios.patch(`/api/chat/${reportId}/seen`);
      } catch (err) {
        console.error('Load messages error:', err);
      } finally {
        setLoading(false);
      }
    };
    loadMessages();
  }, [reportId]);

  // Socket.io setup
  useEffect(() => {
    if (!accessToken) return;

    const socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join_report_room', reportId);
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('new_message', ({ message }) => {
      setMessages((prev) => {
        if (prev.find((m) => m._id === message._id)) return prev;
        return [...prev, message];
      });
      // Mark incoming as seen
      axios.patch(`/api/chat/${reportId}/seen`).catch(() => {});
    });

    socket.on('user_typing', ({ userName, userId }) => {
      if (userId === user._id) return;
      setTypingUsers((prev) => {
        if (prev.find((u) => u.userId === userId)) return prev;
        return [...prev, { userId, userName }];
      });
    });

    socket.on('user_stop_typing', ({ userId }) => {
      setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
    });

    return () => {
      socket.emit('leave_report_room', reportId);
      socket.disconnect();
    };
  }, [accessToken, reportId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const handleTyping = (e) => {
    setText(e.target.value);
    socketRef.current?.emit('typing', { reportId });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socketRef.current?.emit('stop_typing', { reportId });
    }, 1500);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    const msgText = text.trim();
    setText('');
    setSending(true);
    socketRef.current?.emit('stop_typing', { reportId });

    try {
      if (socketRef.current?.connected) {
        socketRef.current.emit('send_message', { reportId, text: msgText });
      } else {
        const { data } = await axios.post(`/api/chat/${reportId}`, { text: msgText });
        setMessages((prev) => [...prev, data.message]);
      }
    } catch (err) {
      console.error('Send message error:', err);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (date) => {
    try { return format(new Date(date), 'HH:mm'); } catch { return ''; }
  };

  const isOwn = (msg) => msg.senderId?._id === user._id || msg.senderId === user._id;

  return (
    <div
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: 480,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-card)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>💬</span>
          <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>
            Report Chat
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: connected ? '#10B981' : '#EF4444',
              display: 'inline-block',
            }}
          />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {connected ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : messages.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">💬</span>
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const own = isOwn(msg);
            return (
              <div
                key={msg._id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: own ? 'flex-end' : 'flex-start',
                  gap: 4,
                  animation: 'fadeIn 0.2s ease',
                }}
              >
                {!own && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
                    {msg.senderId?.name || 'Unknown'} · {msg.senderRole}
                  </span>
                )}
                <div
                  style={{
                    maxWidth: '75%',
                    padding: '10px 14px',
                    borderRadius: own ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: own
                      ? 'linear-gradient(135deg, #6366F1, #8B5CF6)'
                      : 'var(--bg-card)',
                    border: own ? 'none' : '1px solid var(--border)',
                    color: own ? '#fff' : 'var(--text-primary)',
                    fontSize: 14,
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.text}
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {formatTime(msg.createdAt)}
                  {own && msg.seenAt && ' · Seen'}
                </span>
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '16px 16px 16px 4px',
                padding: '10px 16px',
                display: 'flex',
                gap: 4,
                alignItems: 'center',
              }}
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    display: 'inline-block',
                    animation: `pulse 1.2s ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {typingUsers.map((u) => u.userName).join(', ')} typing...
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={sendMessage}
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          gap: 10,
          background: 'var(--bg-card)',
        }}
      >
        <input
          value={text}
          onChange={handleTyping}
          placeholder="Type a message..."
          style={{
            flex: 1,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-full)',
            color: 'var(--text-primary)',
            fontSize: 14,
            padding: '10px 16px',
            outline: 'none',
            fontFamily: 'Inter, sans-serif',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          style={{
            background: 'var(--accent-gradient)',
            border: 'none',
            borderRadius: 'var(--radius-full)',
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: text.trim() && !sending ? 'pointer' : 'not-allowed',
            opacity: text.trim() && !sending ? 1 : 0.5,
            fontSize: 18,
            transition: 'all 0.2s',
            flexShrink: 0,
          }}
        >
          {sending ? '⏳' : '➤'}
        </button>
      </form>
    </div>
  );
};

export default ChatBox;
