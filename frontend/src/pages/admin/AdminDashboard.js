import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';

/* ─────────── constants ─────────── */
const STATUSES   = ['all','open','in_progress','resolved','rejected'];
const CATEGORIES = ['all','pothole','garbage','streetlight','waterleakage','encroachment','other'];

const SIDEBAR_ITEMS = [
  { key:'overview',  icon:'🏠', label:'Overview'   },
  { key:'reports',   icon:'📋', label:'Reports'    },
  { key:'users',     icon:'👥', label:'Users'      },
  { key:'analytics', icon:'📊', label:'Analytics'  },
  { key:'settings',  icon:'⚙️', label:'Settings'   },
];

/* ─────────── tiny helpers ─────────── */
const fmt = (d) => new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
const fmtShort = (d) => new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short'});

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [tab, setTab]            = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // reports state
  const [reports, setReports]         = useState([]);
  const [rLoading, setRLoading]       = useState(false);
  const [statusFilter, setStatusFilter]   = useState('all');
  const [catFilter, setCatFilter]         = useState('all');
  const [rPage, setRPage]             = useState(1);
  const [rPag, setRPag]               = useState({});
  const [updating, setUpdating]       = useState(null);

  // users state
  const [users, setUsers]             = useState([]);
  const [uLoading, setULoading]       = useState(false);
  const [uSearch, setUSearch]         = useState('');
  const [uPage, setUPage]             = useState(1);
  const [uPag, setUPag]               = useState({});
  const [showAddUser, setShowAddUser] = useState(false);

  // staff + analytics
  const [staff, setStaff]             = useState([]);
  const [stats, setStats]             = useState(null);
  const [analytics, setAnalytics]     = useState(null);
  const [aLoading, setALoading]       = useState(false);

  /* ── redirect non-admins/staff ── */
  useEffect(() => {
    if (user && user.role === 'citizen') { navigate('/dashboard'); }
  }, [user, navigate]);

  /* ── fetch staff list once ── */
  useEffect(() => {
    axios.get('/api/users/staff').then(({data}) => setStaff(data.staff || [])).catch(()=>{});
  }, []);

  /* ── overview stats ── */
  const fetchStats = useCallback(async () => {
    try {
      const [rRes, uRes] = await Promise.all([
        axios.get('/api/reports', {params:{limit:1}}),
        axios.get('/api/users',   {params:{limit:1}}),
      ]);
      setStats({
        totalReports : rRes.data.pagination?.total || 0,
        totalUsers   : uRes.data.pagination?.total || 0,
      });
    } catch {}
  }, []);

  /* ── reports ── */
  const fetchReports = useCallback(async () => {
    setRLoading(true);
    try {
      const params = {page:rPage, limit:12};
      if (statusFilter !== 'all') params.status   = statusFilter;
      if (catFilter    !== 'all') params.category = catFilter;
      const {data} = await axios.get('/api/reports', {params});
      setReports(data.reports || []);
      setRPag(data.pagination || {});
    } catch { toast.error('Failed to load reports'); }
    finally { setRLoading(false); }
  }, [rPage, statusFilter, catFilter]);

  /* ── users ── */
  const fetchUsers = useCallback(async () => {
    setULoading(true);
    try {
      const params = {page:uPage, limit:12};
      if (uSearch) params.search = uSearch;
      const {data} = await axios.get('/api/users', {params});
      setUsers(data.users || []);
      setUPag(data.pagination || {});
    } catch { toast.error('Failed to load users'); }
    finally { setULoading(false); }
  }, [uPage, uSearch]);

  /* ── analytics ── */
  const fetchAnalytics = useCallback(async () => {
    setALoading(true);
    try {
      const [overviewRes, catRes] = await Promise.all([
        axios.get('/api/analytics/overview'),
        axios.get('/api/analytics/by-category'),
      ]);
      
      const o = overviewRes.data.data;
      setAnalytics({
        byStatus: [
          { _id: 'open', count: o.open || 0 },
          { _id: 'in_progress', count: o.in_progress || 0 },
          { _id: 'resolved', count: o.resolved || 0 },
          { _id: 'rejected', count: o.rejected || 0 },
        ],
        byCategory: catRes.data.data || [],
      });
    } catch {
      toast.error('Failed to load embedded analytics');
    }
    finally { setALoading(false); }
  }, []);

  /* ── trigger fetches based on tab ── */
  useEffect(() => {
    let timeoutId;
    if (tab === 'overview')  { fetchStats(); }
    if (tab === 'reports')   { fetchReports(); }
    if (tab === 'analytics') { fetchAnalytics(); }
    
    if (tab === 'users') {
      // Debounce user search API calls by 400ms to prevent request spam
      timeoutId = setTimeout(() => {
        fetchUsers();
      }, 400);
    }
    
    return () => clearTimeout(timeoutId);
  }, [tab, fetchStats, fetchReports, fetchUsers, fetchAnalytics]);

  /* ── actions ── */
  const updateStatus = async (id, status) => {
    setUpdating(id);
    try {
      const {data} = await axios.patch(`/api/reports/${id}/status`, {status});
      setReports(p => p.map(r => r._id===id ? data.report : r));
      toast.success('Status updated');
    } catch { toast.error('Failed'); }
    finally { setUpdating(null); }
  };

  const assignStaff = async (id, staffId) => {
    try {
      await axios.patch(`/api/reports/${id}/assign`, {assignedTo: staffId||null});
      setReports(p => p.map(r => r._id===id
        ? {...r, assignedTo: staff.find(s=>s._id===staffId)||null}
        : r));
      toast.success('Assigned');
    } catch { toast.error('Assign failed'); }
  };

  const changeRole = async (uid, role) => {
    try {
      await axios.patch(`/api/users/${uid}/role`, {role});
      setUsers(p => p.map(u => u._id===uid ? {...u, role} : u));
      toast.success('Role updated');
    } catch { toast.error('Failed'); }
  };

  const toggleVerification = async (uid) => {
    try {
      const {data} = await axios.patch(`/api/users/${uid}/verify`);
      setUsers(p => p.map(u => u._id===uid ? {...u, isVerified: data.user.isVerified} : u));
      toast.success('Verification status updated');
    } catch { toast.error('Verification failed'); }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Are you absolutely sure you want to permanently delete this user?')) return;
    try {
      await axios.delete(`/api/users/${id}`);
      setUsers(p => p.filter(r => r._id !== id));
      toast.success('User deleted successfully');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to delete user'); }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const {data} = await axios.post('/api/users', Object.fromEntries(fd.entries()));
      setUsers(prev => [data.user, ...prev]);
      setShowAddUser(false);
      toast.success('User successfully created!');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create user'); }
  };

  const deleteReport = async (id) => {
    if (!window.confirm('Delete this report permanently?')) return;
    try {
      await axios.delete(`/api/reports/${id}`);
      setReports(p => p.filter(r => r._id!==id));
      toast.success('Deleted');
    } catch { toast.error('Failed'); }
  };

  /* ══════ styles ══════ */
  const S = {
    layout: {
      display: 'flex', minHeight: '100vh',
      background: 'var(--bg-primary)',
      paddingTop: 64, // account for fixed Navbar
    },
    sidebar: {
      width: sidebarOpen ? 240 : 68,
      flexShrink: 0,
      background: 'rgba(15,18,30,0.95)',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      transition: 'width 0.3s cubic-bezier(.4,0,.2,1)',
      display: 'flex',
      flexDirection: 'column',
      position: 'sticky',
      top: 64,
      height: 'calc(100vh - 64px)',
      overflowX: 'hidden',
      zIndex: 10,
    },
    sidebarHeader: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '20px 16px 16px',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      minHeight: 64,
    },
    sidebarItem: (active) => ({
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 18px',
      borderRadius: 10,
      margin: '2px 8px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      background: active ? 'var(--accent-glow)' : 'transparent',
      color: active ? 'var(--accent)' : 'var(--text-secondary)',
      border: active ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
    }),
    main: {
      flex: 1,
      padding: 28,
      overflowY: 'auto',
      minWidth: 0,
    },
    pageTitle: {
      fontSize: 22, fontWeight: 700, color: 'var(--text-primary)',
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 13, color: 'var(--text-muted)', marginBottom: 28,
    },
    kpiGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      gap: 16, marginBottom: 28,
    },
    kpiCard: (color, bg) => ({
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: '20px 22px',
      display: 'flex', alignItems:'center', gap:16,
      transition: 'transform 0.2s, box-shadow 0.2s',
    }),
    kpiIcon: (bg) => ({
      width: 48, height: 48, borderRadius: 12,
      background: bg, display:'flex', alignItems:'center',
      justifyContent:'center', fontSize: 22, flexShrink:0,
    }),
    table: {
      width: '100%', borderCollapse: 'collapse', fontSize: 13,
    },
    th: {
      padding: '10px 14px', textAlign: 'left',
      color: 'var(--text-muted)', fontWeight: 600,
      fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8,
      borderBottom: '1px solid var(--border)',
    },
    td: {
      padding: '12px 14px',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      color: 'var(--text-secondary)', verticalAlign: 'middle',
    },
    card: {
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      overflow: 'hidden',
    },
    inlineSelect: {
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      color: 'var(--text-primary)',
      fontSize: 12, padding: '4px 8px',
      cursor: 'pointer',
    },
    filterRow: {
      display: 'flex', gap: 10, flexWrap: 'wrap',
      alignItems: 'center', marginBottom: 16,
    },
    roleBadge: (role) => {
      const c = role==='admin' ? '#F59E0B' : role==='staff' ? '#6366F1' : '#10B981';
      const bg= role==='admin' ? 'rgba(245,158,11,0.12)' : role==='staff' ? 'rgba(99,102,241,0.12)' : 'rgba(16,185,129,0.12)';
      return { color:c, background:bg, border:`1px solid ${c}44`, borderRadius:100, padding:'3px 10px', fontSize:11, fontWeight:600, textTransform:'capitalize' };
    },
  };

  /* ═══ render helpers ═══ */
  const Spinner = () => (
    <div style={{display:'flex',justifyContent:'center',padding:60}}>
      <div className="spinner" />
    </div>
  );

  const Pagination = ({page, setPage, pages}) => pages>1 && (
    <div style={{display:'flex',justifyContent:'center',gap:8,padding:16,borderTop:'1px solid var(--border)'}}>
      <button className="btn btn-secondary btn-sm" disabled={page===1} onClick={()=>setPage(p=>p-1)}>← Prev</button>
      <span style={{padding:'6px 16px',background:'var(--bg-secondary)',borderRadius:6,fontSize:13,color:'var(--text-secondary)'}}>
        {page} / {pages}
      </span>
      <button className="btn btn-secondary btn-sm" disabled={page===pages} onClick={()=>setPage(p=>p+1)}>Next →</button>
    </div>
  );

  /* ═══ TAB: Overview ═══ */
  const OverviewTab = () => {
    const kpis = [
      {label:'Total Reports', value: rPag.total ?? stats?.totalReports ?? '—', icon:'📋', bg:'rgba(99,102,241,0.15)', color:'#6366F1'},
      {label:'Total Users',   value: uPag.total ?? stats?.totalUsers   ?? '—', icon:'👥', bg:'rgba(16,185,129,0.15)', color:'#10B981'},
      {label:'Open Issues',   value: analytics?.byStatus?.find(s=>s._id==='open')?.count ?? '—', icon:'🔴', bg:'rgba(239,68,68,0.15)', color:'#EF4444'},
      {label:'Resolved',      value: analytics?.byStatus?.find(s=>s._id==='resolved')?.count ?? '—', icon:'✅', bg:'rgba(16,185,129,0.15)', color:'#34D399'},
    ];

    return (
      <>
        <p style={S.pageTitle}>👋 Welcome back, {user?.name?.split(' ')[0]}</p>
        <p style={S.subtitle}>Here's an overview of the system right now.</p>

        <div style={S.kpiGrid}>
          {kpis.map((k,i) => (
            <div key={i} style={S.kpiCard(k.color, k.bg)}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 12px 40px rgba(0,0,0,0.3)';}}
              onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none';}}
            >
              <div style={S.kpiIcon(k.bg)}>{k.icon}</div>
              <div>
                <div style={{fontSize:28,fontWeight:800,color:k.color,lineHeight:1}}>{k.value}</div>
                <div style={{fontSize:12,color:'var(--text-muted)',marginTop:4}}>{k.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick action cards */}
        <h3 style={{fontSize:15,fontWeight:600,color:'var(--text-primary)',marginBottom:16}}>Quick Actions</h3>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12,marginBottom:28}}>
          {[
            {label:'Manage Reports', icon:'📋', action:()=>setTab('reports'), color:'#6366F1'},
            {label:'Manage Users',   icon:'👥', action:()=>setTab('users'),   color:'#10B981'},
            {label:'View Analytics', icon:'📊', action:()=>setTab('analytics'),color:'#F59E0B'},
          ].map((a,i) => (
            <button key={i} onClick={a.action}
              style={{
                background:'var(--bg-card)', border:`1px solid var(--border)`, borderRadius:12,
                padding:'18px 20px', cursor:'pointer', textAlign:'left',
                display:'flex', alignItems:'center', gap:12,
                transition:'all 0.2s',
              }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=a.color;e.currentTarget.style.background=`${a.color}11`;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.background='var(--bg-card)';}}
            >
              <span style={{fontSize:24}}>{a.icon}</span>
              <span style={{fontSize:14,fontWeight:600,color:'var(--text-primary)'}}>{a.label}</span>
            </button>
          ))}
        </div>
      </>
    );
  };

  /* ═══ TAB: Reports ═══ */
  const ReportsTab = () => (
    <>
      <p style={S.pageTitle}>📋 Reports Management</p>
      <p style={S.subtitle}>Review, update status, and assign staff to reports.</p>

      {/* Filters */}
      <div style={{...S.card, padding:'14px 18px', marginBottom:16}}>
        <div style={S.filterRow}>
          <select className="form-select" value={statusFilter}
            onChange={e=>{setStatusFilter(e.target.value);setRPage(1);}}
            style={{width:'auto',padding:'8px 14px'}}>
            {STATUSES.map(s=><option key={s} value={s}>{s==='all'?'All Statuses':s.replace('_',' ')}</option>)}
          </select>
          <select className="form-select" value={catFilter}
            onChange={e=>{setCatFilter(e.target.value);setRPage(1);}}
            style={{width:'auto',padding:'8px 14px'}}>
            {CATEGORIES.map(c=><option key={c} value={c}>{c==='all'?'All Categories':c}</option>)}
          </select>
          <span style={{marginLeft:'auto',fontSize:13,color:'var(--text-muted)'}}>{rPag.total||0} reports</span>
        </div>
      </div>

      {rLoading ? <Spinner/> : (
        <div style={S.card}>
          <div style={{overflowX:'auto'}}>
            <table style={S.table}>
              <thead>
                <tr>
                  {['Title','Category','Status','Priority','Reported By','Assigned To','Date','Actions'].map(h=>(
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reports.length===0 ? (
                  <tr><td colSpan={8} style={{...S.td,textAlign:'center',padding:40,color:'var(--text-muted)'}}>No reports found</td></tr>
                ) : reports.map(r=>(
                  <tr key={r._id}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.025)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                  >
                    <td style={S.td}>
                      <Link to={`/report/${r._id}`}
                        style={{color:'var(--text-primary)',fontWeight:500,fontSize:13,
                          maxWidth:200,display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {r.title}
                      </Link>
                    </td>
                    <td style={{...S.td,textTransform:'capitalize'}}>{r.category}</td>
                    <td style={S.td}>
                      <select style={S.inlineSelect} value={r.status}
                        onChange={e=>updateStatus(r._id,e.target.value)}
                        disabled={updating===r._id}>
                        {['open','in_progress','resolved','rejected'].map(s=>(
                          <option key={s} value={s}>{s.replace('_',' ')}</option>
                        ))}
                      </select>
                    </td>
                    <td style={S.td}><StatusBadge status={r.priority} type="priority" size="sm"/></td>
                    <td style={S.td}>{r.submittedBy?.name||'—'}</td>
                    <td style={S.td}>
                      {user?.role==='admin' ? (
                        <select style={{...S.inlineSelect,maxWidth:140}} value={r.assignedTo?._id||''}
                          onChange={e=>assignStaff(r._id,e.target.value)}>
                          <option value="">Unassigned</option>
                          {staff.map(s=><option key={s._id} value={s._id}>{s.name}</option>)}
                        </select>
                      ) : (r.assignedTo?.name||'—')}
                    </td>
                    <td style={{...S.td,whiteSpace:'nowrap',fontSize:12}}>{fmtShort(r.createdAt)}</td>
                    <td style={S.td}>
                      <div style={{display:'flex',gap:6}}>
                        <Link to={`/report/${r._id}`} className="btn btn-ghost btn-sm" title="View">👁️</Link>
                        {user?.role==='admin' && (
                          <button className="btn btn-danger btn-sm" onClick={()=>deleteReport(r._id)} title="Delete">🗑️</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={rPage} setPage={setRPage} pages={rPag.pages}/>
        </div>
      )}
    </>
  );

  /* ═══ TAB: Users ═══ */
  const UsersTab = () => (
    <>
      <p style={S.pageTitle}>👥 User Management</p>
      <p style={S.subtitle}>Manage roles and monitor citizen accounts.</p>

      <div style={{marginBottom:16,display:'flex',gap:12,alignItems:'center',justifyContent:'space-between',flexWrap:'wrap'}}>
        <div style={{display:'flex',gap:12,alignItems:'center'}}>
          <input className="form-input" placeholder="Search by name or email…"
            value={uSearch} onChange={e=>{setUSearch(e.target.value);setUPage(1);}}
            style={{maxWidth:320}}/>
          <span style={{fontSize:13,color:'var(--text-muted)'}}>{uPag.total||0} users</span>
        </div>
        {user?.role === 'admin' && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddUser(true)}>
            + Add User / Staff
          </button>
        )}
      </div>

      {uLoading ? <Spinner/> : (
        <div style={S.card}>
          <div style={{overflowX:'auto'}}>
            <table style={S.table}>
              <thead>
                <tr>
                  {['User','Email','Role','Zone','Joined','Status','Actions'].map(h=>(
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u=>(
                  <tr key={u._id}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.025)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                  >
                    <td style={S.td}>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <div style={{
                          width:34,height:34,borderRadius:'50%',
                          background:'var(--accent-gradient)',
                          display:'flex',alignItems:'center',justifyContent:'center',
                          color:'#fff',fontWeight:700,fontSize:13,flexShrink:0
                        }}>{u.name?.[0]?.toUpperCase()}</div>
                        <span style={{fontWeight:500,color:'var(--text-primary)',fontSize:13}}>{u.name}</span>
                      </div>
                    </td>
                    <td style={{...S.td,fontSize:12}}>{u.email}</td>
                    <td style={S.td}>
                      {user?.role==='admin' && u._id!==user._id ? (
                        <select style={S.inlineSelect} value={u.role}
                          onChange={e=>changeRole(u._id,e.target.value)}>
                          {['citizen','staff','admin'].map(r=><option key={r} value={r}>{r}</option>)}
                        </select>
                      ) : (
                        <span style={S.roleBadge(u.role)}>{u.role}</span>
                      )}
                    </td>
                    <td style={{...S.td,fontSize:12,color:'var(--text-muted)'}}>{u.zone||'—'}</td>
                    <td style={{...S.td,fontSize:12}}>{fmt(u.createdAt)}</td>
                    <td style={S.td}>
                      <button 
                        onClick={() => user?.role === 'admin' ? toggleVerification(u._id) : null}
                        disabled={user?.role !== 'admin'}
                        style={{
                          fontSize:11,padding:'4px 12px',borderRadius:100,
                          background: u.isVerified?'rgba(16,185,129,0.12)':'rgba(245,158,11,0.12)',
                          color: u.isVerified?'#10B981':'#F59E0B',
                          border: `1px solid ${u.isVerified?'#10B98144':'#F59E0B44'}`,
                          fontWeight:600,
                          cursor: user?.role === 'admin' ? 'pointer' : 'default',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => user?.role==='admin' ? (e.currentTarget.style.filter='brightness(1.2)') : null}
                        onMouseLeave={e => user?.role==='admin' ? (e.currentTarget.style.filter='none') : null}
                      >
                        {u.isVerified?'✓ Verified':'⏳ Pending'}
                      </button>
                    </td>
                    <td style={S.td}>
                      {user?.role === 'admin' && (
                        <button className="btn btn-danger btn-sm" onClick={() => deleteUser(u._id)} title="Delete User">
                          🗑️
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={uPage} setPage={setUPage} pages={uPag.pages}/>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUser && (
        <div style={{
          position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.6)',
          backdropFilter:'blur(4px)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:20
        }} onClick={()=>setShowAddUser(false)}>
          <div style={{
            background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, 
            width:'100%', maxWidth:500, padding:24, boxShadow:'var(--shadow-lg)'
          }} onClick={e=>e.stopPropagation()}>
            <h3 style={{fontSize:18, fontWeight:700, marginBottom:20}}>Create User Account</h3>
            <form onSubmit={handleCreateUser} style={{display:'flex', flexDirection:'column', gap:14}}>
              <div className=\"responsive-grid-2\" style={{ gap:14}}>
                <div>
                  <label className="form-label" style={{marginBottom:4,display:'block'}}>Full Name</label>
                  <input name="name" className="form-input" required />
                </div>
                <div>
                  <label className="form-label" style={{marginBottom:4,display:'block'}}>Email</label>
                  <input type="email" name="email" className="form-input" required />
                </div>
              </div>
              <div>
                <label className="form-label" style={{marginBottom:4,display:'block'}}>Role</label>
                <select name="role" className="form-select" required>
                  <option value="citizen">Citizen</option>
                  <option value="staff">Staff</option>
                  <option value="admin">System Admin</option>
                </select>
              </div>
              <div className=\"responsive-grid-2\" style={{ gap:14}}>
                <div>
                  <label className="form-label" style={{marginBottom:4,display:'block'}}>Password</label>
                  <input type="text" name="password" className="form-input" placeholder="CivicAlert123!" />
                </div>
                <div>
                  <label className="form-label" style={{marginBottom:4,display:'block'}}>Zone / Ward (Optional)</label>
                  <input name="zone" className="form-input" />
                </div>
              </div>
              <p style={{fontSize:12, color:'var(--text-muted)'}}>Note: New accounts created via this panel are automatically marked as verified and can skip email verification.</p>
              
              <div style={{display:'flex',justifyContent:'flex-end',gap:12,marginTop:16}}>
                <button type="button" className="btn btn-ghost" onClick={()=>setShowAddUser(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Account</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );

  /* ═══ TAB: Analytics ═══ */
  const AnalyticsTab = () => {
    const byStatus   = analytics?.byStatus   || [];
    const byCategory = analytics?.byCategory || [];
    const maxStatus  = Math.max(...byStatus.map(s=>s.count),1);
    const maxCat     = Math.max(...byCategory.map(c=>c.count),1);

    const statusColors = {
      open:'#3B82F6', in_progress:'#F59E0B',
      resolved:'#10B981', rejected:'#EF4444',
    };
    const catColors = ['#6366F1','#8B5CF6','#EC4899','#F59E0B','#10B981','#3B82F6','#EF4444'];

    return (
      <>
        <p style={S.pageTitle}>📊 Analytics</p>
        <p style={S.subtitle}>Visual breakdown of community report data.</p>

        {aLoading ? <Spinner/> : !analytics ? (
          <div style={{...S.card,padding:40,textAlign:'center',color:'var(--text-muted)'}}>
            No analytics data available
          </div>
        ) : (
          <div className=\"responsive-grid-2\" style={{gap:20}}>
            {/* By Status bar chart */}
            <div style={{...S.card,padding:24}}>
              <h3 style={{fontSize:14,fontWeight:600,color:'var(--text-primary)',marginBottom:20}}>Reports by Status</h3>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                {byStatus.map(s=>(
                  <div key={s._id}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                      <span style={{fontSize:12,color:'var(--text-secondary)',textTransform:'capitalize'}}>{s._id?.replace('_',' ')}</span>
                      <span style={{fontSize:12,fontWeight:600,color:statusColors[s._id]||'#6366F1'}}>{s.count}</span>
                    </div>
                    <div style={{height:8,borderRadius:4,background:'rgba(255,255,255,0.06)'}}>
                      <div style={{
                        height:'100%',borderRadius:4,
                        background:statusColors[s._id]||'#6366F1',
                        width:`${(s.count/maxStatus)*100}%`,
                        transition:'width 0.8s ease',
                      }}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* By Category bar chart */}
            <div style={{...S.card,padding:24}}>
              <h3 style={{fontSize:14,fontWeight:600,color:'var(--text-primary)',marginBottom:20}}>Reports by Category</h3>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                {byCategory.map((c,i)=>(
                  <div key={c.category || Math.random()}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                      <span style={{fontSize:12,color:'var(--text-secondary)',textTransform:'capitalize'}}>{c.category}</span>
                      <span style={{fontSize:12,fontWeight:600,color:catColors[i%catColors.length]}}>{c.count}</span>
                    </div>
                    <div style={{height:8,borderRadius:4,background:'rgba(255,255,255,0.06)'}}>
                      <div style={{
                        height:'100%',borderRadius:4,
                        background:catColors[i%catColors.length],
                        width:`${(c.count/maxCat)*100}%`,
                        transition:'width 0.8s ease',
                      }}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resolution rate */}
            <div style={{...S.card,padding:24,gridColumn:'1/-1'}}>
              <h3 style={{fontSize:14,fontWeight:600,color:'var(--text-primary)',marginBottom:16}}>Summary Stats</h3>
              <div style={{display:'flex',gap:24,flexWrap:'wrap'}}>
                {byStatus.map((s,i)=>(
                  <div key={i} style={{
                    background:'rgba(255,255,255,0.03)',borderRadius:10,
                    padding:'16px 24px',border:'1px solid var(--border)',textAlign:'center'
                  }}>
                    <div style={{fontSize:28,fontWeight:800,color:statusColors[s._id]||'#6366F1'}}>{s.count}</div>
                    <div style={{fontSize:11,color:'var(--text-muted)',textTransform:'capitalize',marginTop:4}}>
                      {s._id?.replace('_',' ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  /* ═══ TAB: Settings ═══ */
  const SettingsTab = () => {
    const [activeModal, setActiveModal] = useState(null);

    const handleCardClick = (title) => {
      if (title === 'Staff Management') setTab('users');
      else setActiveModal(title);
    };

    const handleSave = () => {
      toast.success(`${activeModal} updated successfully!`);
      setActiveModal(null);
    };

    return (
      <>
        <p style={S.pageTitle}>⚙️ Settings</p>
        <p style={S.subtitle}>System configuration and preferences.</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))',gap:16}}>
          {[
            {title:'Email Notifications',desc:'Configure SMTP settings and notification triggers',icon:'📧'},
            {title:'Report Categories',desc:'Add or remove issue categories available to citizens',icon:'🏷️'},
            {title:'Zone Management',desc:'Define community zones and ward boundaries',icon:'🗺️'},
            {title:'Staff Management',desc:'Add or remove staff accounts',icon:'👷'},
          ].map((s,i)=>(
            <div key={i} style={{
              ...S.card, padding:22, display:'flex', gap:14, alignItems:'flex-start',
              cursor:'pointer', transition:'all 0.2s',
            }}
              onClick={() => handleCardClick(s.title)}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--accent)';e.currentTarget.style.transform='translateY(-2px)';}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.transform='none';}}
            >
              <span style={{fontSize:28}}>{s.icon}</span>
              <div>
                <div style={{fontWeight:600,fontSize:14,color:'var(--text-primary)',marginBottom:4}}>{s.title}</div>
                <div style={{fontSize:12,color:'var(--text-muted)',lineHeight:1.5}}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{...S.card,padding:24,marginTop:20}}>
          <h4 style={{fontSize:14,fontWeight:600,color:'var(--text-primary)',marginBottom:8}}>System Information</h4>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {[
              ['Platform','CivicAlert — Local Community Problem Reporting System'],
              ['Version','1.0.0'],
              ['Admin','admin@civicalert.com'],
              ['Database','MongoDB Atlas'],
            ].map(([k,v])=>(
              <div key={k} style={{display:'flex',gap:16,fontSize:13}}>
                <span style={{color:'var(--text-muted)',width:100,flexShrink:0}}>{k}</span>
                <span style={{color:'var(--text-primary)'}}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Settings Modals Overlay */}
        {activeModal && (
          <div style={{
            position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.6)',
            backdropFilter:'blur(4px)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:20
          }} onClick={()=>setActiveModal(null)}>
            <div style={{
              background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, 
              width:'100%', maxWidth:500, padding:24, boxShadow:'var(--shadow-lg)'
            }} onClick={e=>e.stopPropagation()}>
              <h3 style={{fontSize:18, fontWeight:700, color:'var(--text-primary)', marginBottom:8}}>{activeModal}</h3>
              <p style={{fontSize:13, color:'var(--text-muted)', marginBottom:24}}>
                Configure system variables for the {activeModal.toLowerCase()}.
              </p>

              {activeModal === 'Email Notifications' && (
                <div style={{display:'flex',flexDirection:'column',gap:16}}>
                  <div className="form-group" style={{margin:0}}>
                    <label className="form-label">SMTP Server Host</label>
                    <input className="form-input" defaultValue="smtp.gmail.com" />
                  </div>
                  <div style={{display:'flex', alignItems:'center', gap:10, marginTop:8}}>
                    <input type="checkbox" defaultChecked style={{width:16,height:16,accentColor:'var(--accent)'}} />
                    <span style={{fontSize:13,color:'var(--text-secondary)'}}>Send email to Citizens on status change</span>
                  </div>
                </div>
              )}

              {activeModal === 'Report Categories' && (
                <div style={{display:'flex',flexDirection:'column',gap:12}}>
                  <span style={{fontSize:13,color:'var(--text-secondary)'}}>Active Categories:</span>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                    {['pothole','garbage','streetlight','waterleakage'].map(c=>(
                      <span key={c} style={{background:'var(--accent-glow)',color:'var(--text-primary)',padding:'4px 12px',borderRadius:100,fontSize:12,border:'1px solid rgba(99,102,241,0.3)'}}>{c} ✕</span>
                    ))}
                    <button style={{background:'var(--bg-secondary)',border:'1px dashed var(--border)',color:'var(--text-muted)',padding:'4px 12px',borderRadius:100,fontSize:12,cursor:'pointer'}}>+ Add New</button>
                  </div>
                </div>
              )}

              {activeModal === 'Zone Management' && (
                <div style={{display:'flex',flexDirection:'column',gap:12}}>
                  <div className="form-group" style={{margin:0}}>
                    <label className="form-label">Default City / Region</label>
                    <input className="form-input" defaultValue="Chandigarh, IN" />
                  </div>
                  <div style={{padding:12, background:'var(--bg-secondary)', borderRadius:8, border:'1px solid var(--border)'}}>
                    <span style={{fontSize:13, color:'var(--text-secondary)'}}>Geofencing bounds are currently locked to active report coordinates.</span>
                  </div>
                </div>
              )}

              <div style={{display:'flex',justifyContent:'flex-end',gap:12,marginTop:28}}>
                <button className="btn btn-ghost" onClick={()=>setActiveModal(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave}>Save Changes</button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  const TAB_CONTENT = {
    overview  : <OverviewTab/>,
    reports   : <ReportsTab/>,
    users     : user?.role==='admin' ? <UsersTab/> : <div style={{color:'var(--text-muted)',padding:40}}>Admin only</div>,
    analytics : <AnalyticsTab/>,
    settings  : user?.role==='admin' ? <SettingsTab/> : <div style={{color:'var(--text-muted)',padding:40}}>Admin only</div>,
  };

  return (
    <div style={S.layout}>
      {/* ── Sidebar ── */}
      <aside style={S.sidebar}>
        <div style={S.sidebarHeader}>
          {sidebarOpen && (
            <div>
              <div style={{fontSize:13,fontWeight:700,color:'var(--text-primary)'}}>
                {user?.role === 'admin' ? '🛡️ Admin Panel' : '⚙️ Staff Panel'}
              </div>
              <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>{user?.name}</div>
            </div>
          )}
          <button onClick={()=>setSidebarOpen(o=>!o)}
            style={{
              background:'var(--bg-secondary)', border:'1px solid var(--border)',
              borderRadius:8, width:32, height:32, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'var(--text-muted)', flexShrink:0, fontSize:14,
            }}>
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        <nav style={{padding:'12px 0', flex:1}}>
          {SIDEBAR_ITEMS
            .filter(item => user?.role==='staff' ? !['users','settings'].includes(item.key) : true)
            .map(item => (
            <div key={item.key}
              style={S.sidebarItem(tab===item.key)}
              onClick={()=>setTab(item.key)}
              title={!sidebarOpen ? item.label : ''}
            >
              <span style={{fontSize:18,flexShrink:0}}>{item.icon}</span>
              {sidebarOpen && (
                <span style={{fontSize:14,fontWeight: tab===item.key ? 600 : 400}}>
                  {item.label}
                </span>
              )}
            </div>
          ))}
        </nav>

        {/* Back to Dashboard */}
        <div style={{padding:'12px 8px', borderTop:'1px solid rgba(255,255,255,0.06)'}}>
          <Link to="/dashboard"
            style={{
              display:'flex', alignItems:'center', gap:12,
              padding:'10px 18px', borderRadius:10, textDecoration:'none',
              color:'var(--text-muted)', fontSize:13,
              transition:'all 0.2s',
            }}
            onMouseEnter={e=>{e.currentTarget.style.color='var(--text-primary)';e.currentTarget.style.background='var(--bg-card)';}}
            onMouseLeave={e=>{e.currentTarget.style.color='var(--text-muted)';e.currentTarget.style.background='transparent';}}
          >
            <span style={{flexShrink:0}}>🏠</span>
            {sidebarOpen && 'Back to Dashboard'}
          </Link>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main style={S.main}>
        {TAB_CONTENT[tab]}
      </main>
    </div>
  );
};

export default AdminDashboard;
