import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function CreateGroup() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      // 1. Post request returns the newly created group object containing its 'id'
      const res = await api.post('/groups', {
        name,
        description,
      });

      const newGroupId = res.data.id;

      // 2. Redirect directly to the newly created group page
      // Note: Make sure your router matches this path (e.g., /groups/:id)
      if (newGroupId) {
        navigate(`/groups/${newGroupId}`);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Group Creation Error:', err);
      setErrorMsg(
        err.response?.data?.error || 
        err.response?.data?.message || 
        'Failed to create group. Please check backend connection.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageContainerStyle}>
      <style>{customCSS}</style>

      {/* BACKGROUND GLOWS & GRID */}
      <div style={gridBackgroundStyle} />
      <div style={topGlowStyle} />

      <div style={contentWrapperStyle}>
        {/* BACK BUTTON */}
        <button onClick={() => navigate('/dashboard')} style={backButtonStyle} className="back-btn-hover">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back to Dashboard
        </button>

        {/* CARD CONTAINER WITH GRADIENT BORDER */}
        <div className="animated-gradient-border" style={{ width: '100%', maxWidth: '480px', marginTop: '16px' }}>
          <div style={cardInnerStyle}>
            
            {/* HEADER */}
            <div style={{ marginBottom: '28px' }}>
              <div style={badgeStyle}>
                <span style={badgeDotStyle} /> NEW WORKSPACE
              </div>
              <h1 style={titleStyle}>Create New Group</h1>
              <p style={subtitleStyle}>
                Set up a shared ledger to track expenses with friends, roommates, or team members.
              </p>
            </div>

            {/* FORM */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* GROUP NAME */}
              <div>
                <label style={labelStyle}>
                  Group Name <span style={{ color: '#a78bfa' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Goa Trip, Apartment 302"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={inputStyle}
                  className="glow-input"
                />
              </div>

              {/* DESCRIPTION */}
              <div>
                <label style={labelStyle}>Description <span style={{ color: '#64748b', fontWeight: '400' }}>(Optional)</span></label>
                <textarea
                  rows="3"
                  placeholder="e.g. Shared expenses for hotel bookings, flights, and dinners."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ ...inputStyle, resize: 'none', fontFamily: 'inherit' }}
                  className="glow-input"
                />
              </div>

              {errorMsg && <div style={errorBannerStyle}>{errorMsg}</div>}

              {/* SUBMIT BUTTON */}
              <button type="submit" disabled={loading} className="hyper-button">
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span className="spinner" /> Creating Group...
                  </span>
                ) : (
                  'Create Group'
                )}
              </button>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
}

// --- CSS STYLES & ANIMATIONS ---
const customCSS = `
  @keyframes gradientRotate {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .animated-gradient-border {
    border-radius: 20px;
    padding: 1px;
    background: linear-gradient(135deg, rgba(124, 58, 237, 0.4), rgba(255, 255, 255, 0.05), rgba(79, 70, 229, 0.4));
    background-size: 200% 200%;
    animation: gradientRotate 10s ease infinite;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
  }

  .glow-input {
    transition: all 0.2s ease !important;
  }
  .glow-input:focus {
    background-color: rgba(255, 255, 255, 0.05) !important;
    border-color: rgba(167, 139, 250, 0.6) !important;
    box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15) !important;
  }

  .hyper-button {
    width: 100%;
    background: linear-gradient(135deg, #6d28d9 0%, #4f46e5 100%);
    color: #ffffff;
    padding: 13px;
    border: none;
    border-radius: 10px;
    font-weight: 700;
    font-size: 0.9rem;
    cursor: pointer;
    margin-top: 8px;
    box-shadow: 0 4px 20px rgba(109, 40, 217, 0.35);
    transition: all 0.2s ease;
  }
  .hyper-button:hover {
    opacity: 0.95;
    transform: translateY(-1px);
    box-shadow: 0 6px 24px rgba(109, 40, 217, 0.45);
  }

  .back-btn-hover {
    transition: all 0.2s ease;
  }
  .back-btn-hover:hover {
    color: #ffffff !important;
    transform: translateX(-3px);
  }

  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top: 2px solid #ffffff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
`;

const pageContainerStyle = {
  minHeight: '100vh',
  backgroundColor: '#07080c',
  color: '#f8fafc',
  fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '40px 20px',
  boxSizing: 'border-box',
  overflow: 'hidden',
};

const gridBackgroundStyle = {
  position: 'absolute',
  inset: 0,
  backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)`,
  backgroundSize: '32px 32px',
  pointerEvents: 'none',
  opacity: 0.6,
};

const topGlowStyle = {
  position: 'absolute',
  top: '-150px',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '600px',
  height: '400px',
  background: 'radial-gradient(circle, rgba(109, 40, 217, 0.18) 0%, rgba(0,0,0,0) 70%)',
  pointerEvents: 'none',
  zIndex: 2,
};

const contentWrapperStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  position: 'relative',
  zIndex: 10,
  width: '100%',
  maxWidth: '480px',
};

const backButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  background: 'none',
  border: 'none',
  color: '#94a3b8',
  fontSize: '0.85rem',
  fontWeight: '600',
  cursor: 'pointer',
  padding: '0',
  marginBottom: '8px',
};

const cardInnerStyle = {
  backgroundColor: 'rgba(11, 14, 22, 0.92)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  padding: '36px 32px',
  borderRadius: '19px',
  boxSizing: 'border-box',
};

const badgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '5px 12px',
  borderRadius: '20px',
  backgroundColor: 'rgba(124, 58, 237, 0.08)',
  border: '1px solid rgba(124, 58, 237, 0.2)',
  color: '#a78bfa',
  fontSize: '0.7rem',
  fontWeight: '700',
  letterSpacing: '0.8px',
  marginBottom: '14px',
};

const badgeDotStyle = {
  width: '6px',
  height: '6px',
  borderRadius: '50%',
  backgroundColor: '#a78bfa',
};

const titleStyle = {
  fontSize: '1.6rem',
  fontWeight: '800',
  color: '#ffffff',
  margin: '0 0 8px 0',
  letterSpacing: '-0.3px',
};

const subtitleStyle = {
  color: '#64748b',
  fontSize: '0.85rem',
  margin: 0,
  lineHeight: '1.5',
};

const labelStyle = {
  display: 'block',
  fontSize: '0.72rem',
  fontWeight: '700',
  color: '#94a3b8',
  marginBottom: '8px',
  textTransform: 'uppercase',
  letterSpacing: '0.6px',
};

const inputStyle = {
  width: '100%',
  padding: '12px 16px',
  backgroundColor: 'rgba(255, 255, 255, 0.02)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '10px',
  color: '#ffffff',
  fontSize: '0.9rem',
  boxSizing: 'border-box',
  outline: 'none',
};

const errorBannerStyle = {
  backgroundColor: 'rgba(239, 68, 68, 0.1)',
  border: '1px solid rgba(239, 68, 68, 0.25)',
  color: '#f87171',
  padding: '10px 12px',
  borderRadius: '8px',
  fontSize: '0.8rem',
  textAlign: 'center',
  fontWeight: '500',
};