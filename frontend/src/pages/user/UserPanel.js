import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';

/* ═════════════════════════════════════════════════════
   USER PANEL — citizen profile, reports, edit, activity
═════════════════════════════════════════════════════ */
const UserPanel = () => {
  const { user, updateUser } = useAuth();
  const [tab, setTab] = useState('profile');

  // my reports
  const [reports, setReports]     = useState([]);
  const [rLoading, setRLoading]   = useState(false);
  const [rPage, setRPage]         = useState(1);
  const [rPag, setRPag]           = useState({});

  // edit profile form
  const [form, setForm]      = useState({ name:'', phone:'', zone:'' });
  const [pwForm, setPwForm]  = useState({ currentPassword:'', newPassword:'', confirmPassword:'' });
  const [saving, setSaving]  = useState(false);

  // activity stats
  const [activity, setActivity] = useState(null);

  /* ── init form from user ── */
  useEffect(() => {
    if (user) {
      setForm({ name: user.name||'', phone: user.phone||'', zone: user.zone||'' });
    }
  }, [user]);

  /* ── fetch my reports ── */
  const fetchMyReports = useCallback(async () => {
    setRLoading(true);
    try {
      const {data} = await axios.get('/api/reports', {params:{page:rPage, limit:8, mine:true}});
      setReports(data.reports || []);
      setRPag(data.pagination || {});
      // Compute activity stats from data
      const all = data.reports || [];
      setActivity({
        total    : data.pagination?.total || 0,
        resolved : all.filter(r=>r.status==='resolved').length,
        open     : all.filter(r=>r.status==='open').length,
        upvotes  : all.reduce((sum,r)=>(r.upvotes?.length||0)+sum, 0),
      });
    } catch { toast.error('Failed to load your reports'); }
    finally { setRLoading(false); }
  }, [rPage]);

  useEffect(() => {
    if (tab === 'reports' || tab === 'activity') fetchMyReports();
  }, [tab, fetchMyReports]);

  /* ── save profile ── */
  const saveProfile = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Name is required');
    setSaving(true);
    try {
      const {data} = await axios.patch('/api/users/profile', form);
      updateUser(data.user);
      toast.success('Profile updated! 🎉');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setSaving(false); }
  };

  /* ── change password ── */
  const changePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) return toast.error('Passwords do not match');
    if (pwForm.newPassword.length < 6) return toast.error('Min 6 chars');
    setSaving(true);
    try {
      await axios.patch('/api/users/change-password', {
        currentPassword: pwForm.currentPassword,
        newPassword    : pwForm.newPassword,
      });
      toast.success('Password changed!');
      setPwForm({currentPassword:'',newPassword:'',confirmPassword:''});
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally { setSaving(false); }
  };

  /* ══ Styles ══ */
  const S = {
    layout: {
      display: 'flex', minHeight: '100vh',
      background: 'var(--bg-primary)',
      paddingTop: 64,
    },
    sidebar: {
      width: 260, flexShrink: 0,
      background: 'rgba(15,18,30,0.95)',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: 64,
      height: 'calc(100vh - 64px)',
    },
    main: { flex: 1, padding: '32px 36px', minWidth: 0, maxWidth: 860 },
    card: {
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 14,
    },
    sideTab: (active) => ({
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 20px', cursor: 'pointer',
      borderRadius: 10, margin: '2px 10px',
      transition: 'all 0.2s',
      background: active ? 'var(--accent-glow)' : 'transparent',
      color: active ? 'var(--accent)' : 'var(--text-secondary)',
      border: active ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent',
      fontWeight: active ? 600 : 400, fontSize: 14,
    }),
    statBox: (color, bg) => ({
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '20px 24px',
      display: 'flex', alignItems: 'center', gap: 14,
    }),
    formGroup: { marginBottom: 18 },
    label: { display: 'block', fontSize: 12, fontWeight: 600,
      color: 'var(--text-muted)', textTransform: 'uppercase',
      letterSpacing: 0.7, marginBottom: 6 },
  };

  const TABS = [
    { key:'profile',  icon:'🪪', label:'Profile'      },
    { key:'reports',  icon:'📋', label:'My Reports'   },
    { key:'edit',     icon:'✏️', label:'Edit Profile'  },
    { key:'activity', icon:'🏆', label:'My Activity'  },
  ];

  const statusColors = { open:'#3B82F6', in_progress:'#F59E0B', resolved:'#10B981', rejected:'#EF4444' };

  /* ── Avatar circle ── */
  const Avatar = ({size=60}) => (
    <div style={{
      width:size, height:size, borderRadius:'50%',
      background:'var(--accent-gradient)',
      display:'flex', alignItems:'center', justifyContent:'center',
      color:'#fff', fontWeight:800, fontSize:size*0.38,
      flexShrink:0, boxShadow:'0 0 20px rgba(99,102,241,0.4)',
    }}>
      {user?.name?.[0]?.toUpperCase() || 'U'}
    </div>
  );

  /* ─── PROFILE TAB ─── */
  const ProfileTab = () => (
    <>
      <h2 style={{fontSize:20,fontWeight:700,color:'var(--text-primary)',marginBottom:24}}>👤 My Profile</h2>

      {/* Profile hero */}
      <div style={{
        ...S.card, padding:28, marginBottom:20,
        background:'linear-gradient(135deg,rgba(99,102,241,0.08)0%,rgba(16,185,129,0.04)100%)',
        display:'flex', alignItems:'center', gap:24, flexWrap:'wrap',
      }}>
        <Avatar size={72}/>
        <div style={{flex:1}}>
          <h3 style={{fontSize:20,fontWeight:700,color:'var(--text-primary)',marginBottom:4}}>{user?.name}</h3>
          <p style={{fontSize:13,color:'var(--text-muted)',marginBottom:10}}>{user?.email}</p>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <span style={{
              fontSize:11,padding:'4px 12px',borderRadius:100,fontWeight:600,
              background:'var(--accent-glow)',color:'var(--accent)',
              border:'1px solid rgba(99,102,241,0.3)',textTransform:'capitalize',
            }}>
              {user?.role}
            </span>
            {user?.zone && (
              <span style={{fontSize:11,padding:'4px 12px',borderRadius:100,
                background:'rgba(16,185,129,0.1)',color:'#10B981',
                border:'1px solid rgba(16,185,129,0.3)'}}>
                📍 {user.zone}
              </span>
            )}
            {user?.isVerified && (
              <span style={{fontSize:11,padding:'4px 12px',borderRadius:100,
                background:'rgba(16,185,129,0.1)',color:'#10B981',
                border:'1px solid rgba(16,185,129,0.3)'}}>
                ✓ Verified
              </span>
            )}
          </div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:11,color:'var(--text-muted)'}}>Member since</div>
          <div style={{fontSize:13,fontWeight:600,color:'var(--text-primary)'}}>
            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN',{month:'long',year:'numeric'}) : '—'}
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div style={{...S.card,padding:24}}>
        <h4 style={{fontSize:14,fontWeight:600,color:'var(--text-primary)',marginBottom:16}}>Account Details</h4>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:16}}>
          {[
            {label:'Full Name',  value:user?.name   || '—', icon:'👤'},
            {label:'Email',      value:user?.email  || '—', icon:'📧'},
            {label:'Phone',      value:user?.phone  || '—', icon:'📱'},
            {label:'Zone / Area',value:user?.zone   || '—', icon:'📍'},
            {label:'Role',       value:user?.role   || '—', icon:'🛡️'},
            {label:'Verified',   value:user?.isVerified ? 'Yes' : 'No', icon:'✅'},
          ].map((f,i)=>(
            <div key={i} style={{
              background:'rgba(255,255,255,0.03)',borderRadius:10,
              padding:'14px 16px',border:'1px solid rgba(255,255,255,0.05)',
            }}>
              <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:4}}>
                {f.icon} {f.label}
              </div>
              <div style={{fontSize:14,color:'var(--text-primary)',fontWeight:500}}>{f.value}</div>
            </div>
          ))}
        </div>
        <button className="btn btn-secondary btn-sm" onClick={()=>setTab('edit')}
          style={{marginTop:20}}>
          ✏️ Edit Profile
        </button>
      </div>
    </>
  );

  /* ─── MY REPORTS TAB ─── */
  const ReportsTab = () => (
    <>
      <h2 style={{fontSize:20,fontWeight:700,color:'var(--text-primary)',marginBottom:8}}>📋 My Reports</h2>
      <p style={{fontSize:13,color:'var(--text-muted)',marginBottom:24}}>
        All issues you've submitted to the community. ({rPag.total||0} total)
      </p>

      {rLoading ? (
        <div style={{display:'flex',justifyContent:'center',padding:60}}><div className="spinner"/></div>
      ) : reports.length === 0 ? (
        <div style={{...S.card,padding:'60px 20px',textAlign:'center'}}>
          <div style={{fontSize:52,marginBottom:16}}>📭</div>
          <h3 style={{marginBottom:8,color:'var(--text-primary)'}}>No reports yet</h3>
          <p style={{color:'var(--text-muted)',marginBottom:24}}>Start making your community better!</p>
          <Link to="/submit-report" className="btn btn-primary">✍️ Submit a Report</Link>
        </div>
      ) : (
        <>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {reports.map(r=>(
              <div key={r._id} style={{
                ...S.card, padding:'16px 20px',
                display:'flex', alignItems:'center', gap:16,
                transition:'all 0.2s',
              }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--accent)';e.currentTarget.style.transform='translateX(4px)';}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.transform='none';}}
              >
                {/* Status strip */}
                <div style={{
                  width:4,height:44,borderRadius:4,flexShrink:0,
                  background:statusColors[r.status]||'#6366F1',
                }}/>
                <div style={{flex:1,minWidth:0}}>
                  <Link to={`/report/${r._id}`}
                    style={{fontSize:14,fontWeight:600,color:'var(--text-primary)',textDecoration:'none',
                      display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {r.title}
                  </Link>
                  <div style={{display:'flex',gap:12,marginTop:4,flexWrap:'wrap'}}>
                    <span style={{fontSize:11,color:'var(--text-muted)',textTransform:'capitalize'}}>{r.category}</span>
                    <span style={{fontSize:11,color:'var(--text-muted)'}}>
                      {new Date(r.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                    </span>
                    <span style={{fontSize:11,color:'var(--text-muted)'}}>👍 {r.upvotes?.length||0}</span>
                  </div>
                </div>
                <StatusBadge status={r.status} size="sm"/>
                <Link to={`/report/${r._id}`} className="btn btn-ghost btn-sm">View →</Link>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {rPag.pages > 1 && (
            <div style={{display:'flex',justifyContent:'center',gap:8,marginTop:20}}>
              <button className="btn btn-secondary btn-sm" disabled={rPage===1} onClick={()=>setRPage(p=>p-1)}>← Prev</button>
              <span style={{padding:'6px 16px',background:'var(--bg-card)',border:'1px solid var(--border)',
                borderRadius:6,fontSize:13,color:'var(--text-secondary)'}}>
                {rPage} / {rPag.pages}
              </span>
              <button className="btn btn-secondary btn-sm" disabled={rPage===rPag.pages} onClick={()=>setRPage(p=>p+1)}>Next →</button>
            </div>
          )}
        </>
      )}
    </>
  );

  /* ─── EDIT PROFILE TAB ─── */
  const EditTab = () => (
    <>
      <h2 style={{fontSize:20,fontWeight:700,color:'var(--text-primary)',marginBottom:24}}>✏️ Edit Profile</h2>

      {/* Profile info form */}
      <div style={{...S.card,padding:28,marginBottom:20}}>
        <h4 style={{fontSize:14,fontWeight:600,color:'var(--text-primary)',marginBottom:20}}>Personal Information</h4>
        <form onSubmit={saveProfile}>
          <div className=\"responsive-grid-2\" style={{gap:16}}>
            <div style={S.formGroup}>
              <label style={S.label}>Full Name *</label>
              <input className="form-input" value={form.name}
                onChange={e=>setForm(f=>({...f,name:e.target.value}))}
                placeholder="Your full name" required/>
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>Phone</label>
              <input className="form-input" type="tel" value={form.phone}
                onChange={e=>setForm(f=>({...f,phone:e.target.value}))}
                placeholder="+91 9999999999"/>
            </div>
            <div style={{...S.formGroup, gridColumn:'1/-1'}}>
              <label style={S.label}>Zone / Area</label>
              <input className="form-input" value={form.zone}
                onChange={e=>setForm(f=>({...f,zone:e.target.value}))}
                placeholder="e.g. North Ward, Zone 3"/>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <><span className="spinner" style={{width:16,height:16,borderWidth:2}}/> Saving…</> : '💾 Save Changes'}
          </button>
        </form>
      </div>

      {/* Change password */}
      <div style={{...S.card,padding:28}}>
        <h4 style={{fontSize:14,fontWeight:600,color:'var(--text-primary)',marginBottom:20}}>🔐 Change Password</h4>
        <form onSubmit={changePassword}>
          <div style={{display:'grid',gridTemplateColumns:'1fr',gap:14,maxWidth:400}}>
            <div style={S.formGroup}>
              <label style={S.label}>Current Password</label>
              <input className="form-input" type="password"
                value={pwForm.currentPassword}
                onChange={e=>setPwForm(f=>({...f,currentPassword:e.target.value}))}
                placeholder="Enter current password" required/>
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>New Password</label>
              <input className="form-input" type="password"
                value={pwForm.newPassword}
                onChange={e=>setPwForm(f=>({...f,newPassword:e.target.value}))}
                placeholder="Min. 6 characters" required/>
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>Confirm New Password</label>
              <input className="form-input" type="password"
                value={pwForm.confirmPassword}
                onChange={e=>setPwForm(f=>({...f,confirmPassword:e.target.value}))}
                placeholder="Re-enter new password" required/>
            </div>
          </div>
          <button type="submit" className="btn btn-secondary" disabled={saving} style={{marginTop:8}}>
            {saving ? 'Updating…' : '🔑 Change Password'}
          </button>
        </form>
      </div>
    </>
  );

  /* ─── ACTIVITY TAB ─── */
  const ActivityTab = () => {
    const actStats = [
      {label:'Total Reports',  value:rPag.total||0,               icon:'📋', color:'#6366F1', bg:'rgba(99,102,241,0.12)'},
      {label:'Resolved',       value:activity?.resolved||0,       icon:'✅', color:'#10B981', bg:'rgba(16,185,129,0.12)'},
      {label:'Open',           value:activity?.open||0,           icon:'🔵', color:'#3B82F6', bg:'rgba(59,130,246,0.12)'},
      {label:'Upvotes Received',value:activity?.upvotes||0,       icon:'👍', color:'#F59E0B', bg:'rgba(245,158,11,0.12)'},
    ];

    const resolutionRate = rPag.total
      ? Math.round(((activity?.resolved||0) / rPag.total) * 100)
      : 0;

    return (
      <>
        <h2 style={{fontSize:20,fontWeight:700,color:'var(--text-primary)',marginBottom:8}}>🏆 My Activity</h2>
        <p style={{fontSize:13,color:'var(--text-muted)',marginBottom:24}}>
          Your contribution to the community so far.
        </p>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:14,marginBottom:24}}>
          {actStats.map((s,i)=>(
            <div key={i} style={{
              ...S.card, padding:'20px 22px',
              display:'flex', alignItems:'center', gap:14,
              transition:'transform 0.2s,box-shadow 0.2s',
            }}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 32px rgba(0,0,0,0.3)';}}
              onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none';}}
            >
              <div style={{
                width:44,height:44,borderRadius:12,background:s.bg,
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:20,flexShrink:0,
              }}>{s.icon}</div>
              <div>
                <div style={{fontSize:26,fontWeight:800,color:s.color,lineHeight:1}}>{s.value}</div>
                <div style={{fontSize:11,color:'var(--text-muted)',marginTop:3}}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Resolution rate */}
        <div style={{...S.card,padding:24,marginBottom:20}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <h4 style={{fontSize:14,fontWeight:600,color:'var(--text-primary)'}}>Resolution Rate</h4>
            <span style={{fontSize:20,fontWeight:800,color:'#10B981'}}>{resolutionRate}%</span>
          </div>
          <div style={{height:10,borderRadius:5,background:'rgba(255,255,255,0.06)'}}>
            <div style={{
              height:'100%',borderRadius:5,
              background:'linear-gradient(90deg,#6366F1,#10B981)',
              width:`${resolutionRate}%`,
              transition:'width 1s ease',
            }}/>
          </div>
          <p style={{fontSize:12,color:'var(--text-muted)',marginTop:8}}>
            {activity?.resolved||0} of {rPag.total||0} reports have been resolved
          </p>
        </div>

        {/* Achievement badges */}
        <div style={{...S.card,padding:24}}>
          <h4 style={{fontSize:14,fontWeight:600,color:'var(--text-primary)',marginBottom:16}}>🏅 Badges</h4>
          <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
            {[
              {icon:'🌱', label:'First Report', earned:(rPag.total||0)>=1},
              {icon:'📣', label:'Active Reporter', earned:(rPag.total||0)>=5},
              {icon:'⭐', label:'Community Star', earned:(rPag.total||0)>=10},
              {icon:'🔥', label:'Problem Solver', earned:(activity?.resolved||0)>=3},
              {icon:'👑', label:'Civic Champion', earned:(rPag.total||0)>=20},
            ].map((b,i)=>(
              <div key={i} style={{
                display:'flex',flexDirection:'column',alignItems:'center',gap:6,
                padding:'14px 16px',borderRadius:12,minWidth:80,
                background: b.earned ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)',
                border: b.earned ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.06)',
                opacity: b.earned ? 1 : 0.4,
                transition:'all 0.2s',
              }}>
                <span style={{fontSize:28,filter:b.earned?'none':'grayscale(1)'}}>{b.icon}</span>
                <span style={{fontSize:10,color:b.earned?'var(--accent)':'var(--text-muted)',
                  fontWeight:b.earned?600:400,textAlign:'center'}}>
                  {b.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  };

  const TAB_CONTENT = {
    profile  : <ProfileTab/>,
    reports  : <ReportsTab/>,
    edit     : <EditTab/>,
    activity : <ActivityTab/>,
  };

  return (
    <div style={S.layout}>
      {/* ── Sidebar ── */}
      <aside style={S.sidebar}>
        {/* Profile mini-card */}
        <div style={{
          padding:'24px 20px 20px',
          borderBottom:'1px solid rgba(255,255,255,0.06)',
          textAlign:'center',
        }}>
          <div style={{
            width:56,height:56,borderRadius:'50%',
            background:'var(--accent-gradient)',
            display:'flex',alignItems:'center',justifyContent:'center',
            color:'#fff',fontWeight:800,fontSize:22,
            margin:'0 auto 10px',
            boxShadow:'0 0 20px rgba(99,102,241,0.35)',
          }}>
            {user?.name?.[0]?.toUpperCase()||'U'}
          </div>
          <div style={{fontSize:14,fontWeight:700,color:'var(--text-primary)',marginBottom:2}}>{user?.name}</div>
          <div style={{
            display:'inline-block',fontSize:10,padding:'3px 10px',
            borderRadius:100,fontWeight:600,textTransform:'capitalize',
            background:'var(--accent-glow)',color:'var(--accent)',
            border:'1px solid rgba(99,102,241,0.3)',marginBottom:4,
          }}>{user?.role}</div>
          {user?.zone && (
            <div style={{fontSize:11,color:'var(--text-muted)'}}>📍 {user.zone}</div>
          )}
        </div>

        {/* Nav tabs */}
        <nav style={{padding:'12px 0',flex:1}}>
          {TABS.map(t=>(
            <div key={t.key} style={S.sideTab(tab===t.key)} onClick={()=>setTab(t.key)}>
              <span style={{fontSize:18,flexShrink:0}}>{t.icon}</span>
              <span>{t.label}</span>
            </div>
          ))}
        </nav>

        {/* Actions */}
        <div style={{padding:'12px 10px',borderTop:'1px solid rgba(255,255,255,0.06)',display:'flex',flexDirection:'column',gap:4}}>
          <Link to="/submit-report"
            style={{
              display:'flex',alignItems:'center',gap:10,
              padding:'10px 20px',borderRadius:10,textDecoration:'none',
              background:'var(--accent-glow)',color:'var(--accent)',
              border:'1px solid rgba(99,102,241,0.25)',fontSize:13,fontWeight:600,
              transition:'all 0.2s',
            }}
            onMouseEnter={e=>{e.currentTarget.style.background='var(--accent-gradient)';e.currentTarget.style.color='#fff';}}
            onMouseLeave={e=>{e.currentTarget.style.background='var(--accent-glow)';e.currentTarget.style.color='var(--accent)';}}
          >
            ✍️ New Report
          </Link>
          <Link to="/dashboard"
            style={{
              display:'flex',alignItems:'center',gap:10,
              padding:'10px 20px',borderRadius:10,textDecoration:'none',
              color:'var(--text-muted)',fontSize:13,transition:'all 0.2s',
            }}
            onMouseEnter={e=>{e.currentTarget.style.color='var(--text-primary)';e.currentTarget.style.background='var(--bg-card)';}}
            onMouseLeave={e=>{e.currentTarget.style.color='var(--text-muted)';e.currentTarget.style.background='transparent';}}
          >
            🏠 Dashboard
          </Link>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={S.main}>
        {TAB_CONTENT[tab]}
      </main>
    </div>
  );
};

export default UserPanel;
