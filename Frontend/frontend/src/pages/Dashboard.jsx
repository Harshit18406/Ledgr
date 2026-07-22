import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Dashboard() {
  const [groups, setGroups] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Example calculated balances (wire up to your backend endpoints)
  const [overallOwe, setOverallOwe] = useState(50.0);
  const [overallOwed, setOverallOwed] = useState(0.0);

  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('nova_user') || localStorage.getItem('ledgr_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/groups');
      setGroups(res.data);
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const netBalance = overallOwed - overallOwe;

  return (
    <div style={pageContainerStyle}>
      {/* BACKGROUND MESH GLOWS */}
      <div style={topGlowStyle} />
      <div style={bottomGlowStyle} />

      {/* TOP NAVIGATION BAR */}
      <header style={navbarStyle}>
        {/* Brand Logo */}
        <div style={logoWrapperStyle} onClick={() => navigate('/dashboard')}>
          <div style={logoIconStyle}>⚡</div>
          <span style={logoTextStyle}>LEDGR</span>
          <span style={dotStyle}>.</span>
        </div>

        {/* User Pill + Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', zIndex: 10 }}>
          <div style={userInfoPillStyle}>
            <div style={avatarStyle}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <span style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: '600' }}>
              {user?.name || 'User'}
            </span>
            <span style={verifiedBadgeStyle}>PRO</span>
          </div>

          <button
            onClick={handleLogout}
            style={logoutButtonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
              e.currentTarget.style.color = '#ef4444';
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = '#94a3b8';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main style={mainContentStyle}>
        {/* HERO TITLE HEADER */}
        <div style={{ marginBottom: '36px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={pillTagStyle}>FINTECH LEDGER AGGREGATOR</div>
            <h1 style={titleStyle}>Dashboard Overview</h1>
            <p style={subtitleStyle}>
              Monitor real-time net expenses, peer split balances, and settlements.
            </p>
          </div>

          <button
            onClick={() => navigate('/create-group')}
            style={primaryGradientBtnStyle}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <span style={{ fontSize: '1.2rem', lineHeight: '1' }}>+</span> Create Group
          </button>
        </div>

        {/* METRIC SUMMARY CARDS */}
        <div style={statsGridStyle}>
          {/* NET BALANCE CARD */}
          <div style={glassCardStyle}>
            <div style={cardHeaderRow}>
              <span style={cardLabelStyle}>Overall Net Balance</span>
              <span style={badgeIconStyle}>💳</span>
            </div>
            <div
              style={{
                fontSize: '2.2rem',
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: '700',
                margin: '12px 0 6px 0',
                color: netBalance < 0 ? '#ff5252' : netBalance > 0 ? '#10b981' : '#ffffff',
                textShadow: netBalance < 0 ? '0 0 20px rgba(255,82,82,0.3)' : '0 0 20px rgba(16,185,129,0.3)',
              }}
            >
              {netBalance < 0 ? `-₹${Math.abs(netBalance).toFixed(2)}` : `₹${netBalance.toFixed(2)}`}
            </div>
            <div style={cardFooterStatus}>
              <span style={{ ...statusDotStyle, backgroundColor: netBalance < 0 ? '#ff5252' : '#10b981' }} />
              {netBalance < 0 ? 'You owe group members money' : netBalance > 0 ? 'You are owed money overall' : 'You are completely settled up'}
            </div>
          </div>

          {/* YOU OWE CARD */}
          <div style={glassCardStyle}>
            <div style={cardHeaderRow}>
              <span style={cardLabelStyle}>Total Payables</span>
              <span style={{ fontSize: '0.8rem', color: '#ff5252', fontWeight: '700' }}>YOU OWE</span>
            </div>
            <div style={{ fontSize: '2.2rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: '700', margin: '12px 0 6px 0', color: '#ff5252' }}>
              ₹{overallOwe.toFixed(2)}
            </div>
            <div style={cardFooterStatus}>
              Pending payments across all active groups
            </div>
          </div>

          {/* YOU ARE OWED CARD */}
          <div style={glassCardStyle}>
            <div style={cardHeaderRow}>
              <span style={cardLabelStyle}>Total Receivables</span>
              <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: '700' }}>OWED TO YOU</span>
            </div>
            <div style={{ fontSize: '2.2rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: '700', margin: '12px 0 6px 0', color: '#10b981' }}>
              ₹{overallOwed.toFixed(2)}
            </div>
            <div style={cardFooterStatus}>
              Pending collectables across all active groups
            </div>
          </div>
        </div>

        {/* GROUPS LIST SECTION */}
        <div style={{ margin: '48px 0 20px 0' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#f8fafc', margin: 0 }}>
            Active Ledger Groups ({groups.length})
          </h2>
        </div>

        {loading ? (
          <div style={{ color: '#64748b', padding: '40px 0', textAlign: 'center' }}>
            Fetching ledgers...
          </div>
        ) : groups.length === 0 ? (
          <div style={emptyStateStyle}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📂</div>
            <h3 style={{ margin: '0 0 6px 0', color: '#f8fafc' }}>No Ledgers Found</h3>
            <p style={{ margin: '0 0 20px 0', color: '#64748b', fontSize: '0.9rem' }}>
              Create a group to start adding expenses and optimizing settlements.
            </p>
            <button onClick={() => navigate('/create-group')} style={primaryGradientBtnStyle}>
              + Create First Group
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {groups.map((group) => (
              <div
                key={group.id}
                onClick={() => navigate(`/groups/${group.id}`)}
                style={groupRowGlassStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.5)';
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(124, 58, 237, 0.15)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.07)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                  <div style={groupAvatarStyle}>
                    {group.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#f8fafc' }}>
                      {group.name}
                    </div>
                    <div style={{ fontSize: '0.83rem', color: '#64748b', marginTop: '3px' }}>
                      {group.description || 'Shared expense pool'}
                    </div>
                  </div>
                </div>

                <div style={viewLinkStyle}>
                  Open Ledger <span style={{ fontSize: '1.1rem' }}>→</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// --- DESIGN SYSTEM & STYLES ---

const pageContainerStyle = {
  minHeight: '100vh',
  backgroundColor: '#090a0f',
  color: '#f8fafc',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  position: 'relative',
  overflowX: 'hidden',
};

const topGlowStyle = {
  position: 'absolute',
  top: '-150px',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '600px',
  height: '350px',
  background: 'radial-gradient(circle, rgba(124, 58, 237, 0.18) 0%, rgba(0,0,0,0) 70%)',
  pointerEvents: 'none',
};

const bottomGlowStyle = {
  position: 'absolute',
  bottom: '-100px',
  right: '-100px',
  width: '500px',
  height: '500px',
  background: 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, rgba(0,0,0,0) 70%)',
  pointerEvents: 'none',
};

const navbarStyle = {
  height: '72px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0 48px',
  backgroundColor: 'rgba(15, 23, 42, 0.6)',
  backdropFilter: 'blur(16px)',
  borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
  position: 'sticky',
  top: 0,
  zIndex: 50,
};

const logoWrapperStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  cursor: 'pointer',
  zIndex: 10,
};

const logoIconStyle = {
  width: '32px',
  height: '32px',
  background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1.1rem',
  boxShadow: '0 0 15px rgba(124, 58, 237, 0.4)',
};

const logoTextStyle = {
  fontSize: '1.3rem',
  fontWeight: '800',
  letterSpacing: '1px',
  background: 'linear-gradient(180deg, #ffffff 0%, #cbd5e1 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
};

const dotStyle = {
  color: '#10b981',
  fontSize: '1.5rem',
  fontWeight: '900',
};

const userInfoPillStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  backgroundColor: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  padding: '6px 14px 6px 8px',
  borderRadius: '40px',
};

const avatarStyle = {
  width: '28px',
  height: '28px',
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: '700',
  fontSize: '0.8rem',
};

const verifiedBadgeStyle = {
  backgroundColor: 'rgba(124, 58, 237, 0.2)',
  color: '#a78bfa',
  fontSize: '0.65rem',
  fontWeight: '800',
  padding: '2px 6px',
  borderRadius: '4px',
  border: '1px solid rgba(124, 58, 237, 0.3)',
};

const logoutButtonStyle = {
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  color: '#94a3b8',
  padding: '8px 16px',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '0.83rem',
  fontWeight: '600',
  transition: 'all 0.2s ease',
};

const mainContentStyle = {
  maxWidth: '1100px',
  margin: '0 auto',
  padding: '48px 24px',
  position: 'relative',
  zIndex: 1,
};

const pillTagStyle = {
  display: 'inline-block',
  fontSize: '0.7rem',
  fontWeight: '800',
  letterSpacing: '1px',
  color: '#a78bfa',
  backgroundColor: 'rgba(124, 58, 237, 0.12)',
  padding: '4px 10px',
  borderRadius: '20px',
  border: '1px solid rgba(124, 58, 237, 0.25)',
  marginBottom: '10px',
};

const titleStyle = {
  fontSize: '2rem',
  fontWeight: '800',
  margin: '0 0 6px 0',
  color: '#ffffff',
  letterSpacing: '-0.5px',
};

const subtitleStyle = {
  color: '#64748b',
  fontSize: '0.95rem',
  margin: 0,
};

const primaryGradientBtnStyle = {
  background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
  color: '#ffffff',
  padding: '12px 24px',
  border: 'none',
  borderRadius: '10px',
  fontWeight: '700',
  fontSize: '0.9rem',
  cursor: 'pointer',
  boxShadow: '0 4px 20px rgba(124, 58, 237, 0.4)',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  transition: 'transform 0.2s ease',
};

const statsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '20px',
};

const glassCardStyle = {
  backgroundColor: 'rgba(18, 22, 34, 0.65)',
  backdropFilter: 'blur(12px)',
  padding: '24px',
  borderRadius: '16px',
  border: '1px solid rgba(255, 255, 255, 0.07)',
  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
};

const cardHeaderRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const cardLabelStyle = {
  fontSize: '0.78rem',
  color: '#94a3b8',
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
};

const badgeIconStyle = {
  fontSize: '1rem',
};

const cardFooterStatus = {
  fontSize: '0.82rem',
  color: '#64748b',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginTop: '8px',
};

const statusDotStyle = {
  width: '6px',
  height: '6px',
  borderRadius: '50%',
};

const groupRowGlassStyle = {
  backgroundColor: 'rgba(18, 22, 34, 0.5)',
  backdropFilter: 'blur(10px)',
  padding: '18px 28px',
  borderRadius: '14px',
  border: '1px solid rgba(255, 255, 255, 0.07)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  cursor: 'pointer',
  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
};

const groupAvatarStyle = {
  width: '44px',
  height: '44px',
  borderRadius: '12px',
  background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.2) 0%, rgba(79, 70, 229, 0.2) 100%)',
  border: '1px solid rgba(124, 58, 237, 0.3)',
  color: '#a78bfa',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: '800',
  fontSize: '1.1rem',
};

const viewLinkStyle = {
  color: '#a78bfa',
  fontWeight: '700',
  fontSize: '0.88rem',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
};

const emptyStateStyle = {
  backgroundColor: 'rgba(18, 22, 34, 0.4)',
  padding: '60px 20px',
  textAlign: 'center',
  borderRadius: '16px',
  border: '1px dashed rgba(255, 255, 255, 0.12)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};