import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const FINANCE_QUOTES = [
  {
    quote: "Beware of little expenses. A small leak will sink a great ship.",
    author: "Benjamin Franklin"
  },
  {
    quote: "Financial peace isn't the acquisition of stuff. It's learning to live on less than you make.",
    author: "Dave Ramsey"
  },
  {
    quote: "An investment in knowledge pays the best interest.",
    author: "Benjamin Franklin"
  },
  {
    quote: "Do not save what is left after spending, but spend what is left after saving.",
    author: "Warren Buffett"
  }
];

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const [activeQuoteIndex, setActiveQuoteIndex] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const navigate = useNavigate();

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);

    const interval = setInterval(() => {
      setActiveQuoteIndex((prev) => (prev + 1) % FINANCE_QUOTES.length);
    }, 6000);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearInterval(interval);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const endpoint = isRegister ? '/auth/register' : '/auth/login';
    const payload = isRegister ? { name, email, password } : { email, password };

    try {
      const res = await api.post(endpoint, payload);
      
      if (res.data.token) {
        localStorage.setItem('ledgr_token', res.data.token);
      }
      if (res.data.user) {
        localStorage.setItem('ledgr_user', JSON.stringify(res.data.user));
      } else {
        localStorage.setItem('ledgr_user', JSON.stringify({ name: name || email.split('@')[0], email }));
      }

      navigate('/dashboard');
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageContainerStyle}>
      <style>{customCSS}</style>

      {/* DYNAMIC SPOTLIGHT */}
      <div
        style={{
          ...cursorSpotlightStyle,
          left: `${mousePos.x}px`,
          top: `${mousePos.y}px`,
        }}
      />

      {/* BACKGROUND ELEMENTS */}
      <div style={gridBackgroundStyle} />
      <div style={topGlowStyle} />
      <div style={bottomGlowStyle} />

      {/* SPLIT LAYOUT */}
      <div style={splitLayoutGridStyle}>
        
        {/* ================= LEFT HERO COLUMN ================= */}
        <div style={leftHeroSideStyle}>
          
          {/* LOGO */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={heroLogoIconStyle}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
            </div>
            <span style={heroLogoTextStyle}>LEDGR</span>
          </div>

          {/* CONTENT BLOCK */}
          <div style={{ marginTop: '40px' }}>
            <div style={taglineBadgeStyle}>
              <span style={badgeDotStyle} /> ENTERPRISE LEDGER ENGINE
            </div>

            <h1 style={heroMainHeadingStyle}>
              Smart expense sharing <br />
              <span style={gradientTextStyle}>simplified to perfection.</span>
            </h1>

            {/* QUOTE CONTAINER */}
            <div style={quoteCardStyle}>
              <p key={activeQuoteIndex} className="quote-fade" style={quoteTextStyle}>
                "{FINANCE_QUOTES[activeQuoteIndex].quote}"
              </p>
              <div style={quoteAuthorStyle}>
                — {FINANCE_QUOTES[activeQuoteIndex].author}
              </div>
            </div>

            {/* FEATURE CHIPS */}
            <div style={featureGridStyle}>
              <div style={featurePillStyle}>
                <span style={pillDotStyle} /> Real-time Calculation
              </div>
              <div style={featurePillStyle}>
                <span style={pillDotStyle} /> Zero-friction Balancing
              </div>
              <div style={featurePillStyle}>
                <span style={pillDotStyle} /> Graph Debt Minimization
              </div>
            </div>
          </div>

        </div>

        {/* ================= RIGHT FORM COLUMN ================= */}
        <div style={rightWidgetSideStyle}>
          <div className="animated-gradient-border" style={{ width: '100%', maxWidth: '420px' }}>
            <div style={authCardStyle}>
              
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <h2 style={formTitleStyle}>
                  {isRegister ? 'Create Account' : 'Welcome Back'}
                </h2>
                <p style={subtitleStyle}>
                  {isRegister 
                    ? 'Enter your details to create your secure workspace' 
                    : 'Enter your credentials to access your ledgers'}
                </p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {isRegister && (
                  <div>
                    <label style={labelStyle}>Full Name</label>
                    <input
                      type="text"
                      placeholder="Alex Morgan"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      style={inputStyle}
                      className="glow-input"
                    />
                  </div>
                )}

                <div>
                  <label style={labelStyle}>Email Address</label>
                  <input
                    type="email"
                    placeholder="name@company.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={inputStyle}
                    className="glow-input"
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>Password</label>
                    {!isRegister && (
                      <span style={forgotPasswordStyle} onClick={() => alert('Password reset link dispatched.')}>
                        Forgot password?
                      </span>
                    )}
                  </div>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={inputStyle}
                    className="glow-input"
                  />
                </div>

                {errorMsg && <div style={errorBannerStyle}>{errorMsg}</div>}

                <button type="submit" disabled={loading} className="hyper-button">
                  {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <span className="spinner" /> Authenticating...
                    </span>
                  ) : isRegister ? (
                    'Create Account'
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>

              <div style={footerTextStyle}>
                {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
                <span
                  style={toggleLinkStyle}
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setErrorMsg('');
                  }}
                >
                  {isRegister ? 'Sign in' : 'Register'}
                </span>
              </div>

              <div style={demoNoteStyle}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <span>End-to-end encrypted ledger security</span>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// --- CSS KEYFRAMES & STYLES ---
const customCSS = `
  @keyframes gradientRotate {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  @keyframes quoteFadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .quote-fade {
    animation: quoteFadeIn 0.6s ease-out forwards;
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
    margin-top: 6px;
    box-shadow: 0 4px 20px rgba(109, 40, 217, 0.35);
    transition: all 0.2s ease;
  }
  .hyper-button:hover {
    opacity: 0.95;
    transform: translateY(-1px);
    box-shadow: 0 6px 24px rgba(109, 40, 217, 0.45);
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
  padding: '40px 32px',
  boxSizing: 'border-box',
  overflow: 'hidden',
};

const splitLayoutGridStyle = {
  display: 'grid',
  gridTemplateColumns: '1.1fr 0.9fr',
  maxWidth: '1100px',
  width: '100%',
  gap: '80px',
  alignItems: 'center',
  position: 'relative',
  zIndex: 10,
};

const leftHeroSideStyle = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
};

const rightWidgetSideStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  alignItems: 'center',
};

const cursorSpotlightStyle = {
  position: 'fixed',
  width: '600px',
  height: '600px',
  borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(109, 40, 217, 0.08) 0%, rgba(0, 0, 0, 0) 70%)',
  transform: 'translate(-50%, -50%)',
  pointerEvents: 'none',
  zIndex: 1,
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
  top: '-200px',
  left: '20%',
  width: '600px',
  height: '400px',
  background: 'radial-gradient(circle, rgba(109, 40, 217, 0.18) 0%, rgba(0,0,0,0) 70%)',
  pointerEvents: 'none',
  zIndex: 2,
};

const bottomGlowStyle = {
  position: 'absolute',
  bottom: '-200px',
  right: '10%',
  width: '500px',
  height: '500px',
  background: 'radial-gradient(circle, rgba(79, 70, 229, 0.12) 0%, rgba(0,0,0,0) 70%)',
  pointerEvents: 'none',
  zIndex: 2,
};

const heroLogoIconStyle = {
  width: '36px',
  height: '36px',
  background: 'linear-gradient(135deg, #6d28d9 0%, #4f46e5 100%)',
  borderRadius: '10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 4px 15px rgba(109, 40, 217, 0.35)',
};

const heroLogoTextStyle = {
  fontSize: '1.25rem',
  fontWeight: '800',
  letterSpacing: '1.5px',
  color: '#ffffff',
};

const taglineBadgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '6px 14px',
  borderRadius: '20px',
  backgroundColor: 'rgba(124, 58, 237, 0.08)',
  border: '1px solid rgba(124, 58, 237, 0.2)',
  color: '#a78bfa',
  fontSize: '0.72rem',
  fontWeight: '700',
  letterSpacing: '0.8px',
  marginBottom: '20px',
};

const badgeDotStyle = {
  width: '6px',
  height: '6px',
  borderRadius: '50%',
  backgroundColor: '#a78bfa',
};

const heroMainHeadingStyle = {
  fontSize: '2.6rem',
  fontWeight: '800',
  lineHeight: '1.25',
  color: '#ffffff',
  margin: '0 0 24px 0',
  letterSpacing: '-0.5px',
};

const gradientTextStyle = {
  background: 'linear-gradient(135deg, #c084fc 0%, #a78bfa 50%, #818cf8 100%)',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  display: 'inline-block',
};

const quoteCardStyle = {
  backgroundColor: 'rgba(255, 255, 255, 0.02)',
  borderLeft: '2px solid #7c3aed',
  padding: '16px 20px',
  borderRadius: '0 12px 12px 0',
  marginBottom: '28px',
};

const quoteTextStyle = {
  fontSize: '0.98rem',
  color: '#cbd5e1',
  fontStyle: 'italic',
  margin: '0 0 8px 0',
  lineHeight: '1.5',
};

const quoteAuthorStyle = {
  fontSize: '0.82rem',
  fontWeight: '600',
  color: '#64748b',
};

const featureGridStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '10px',
};

const featurePillStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  backgroundColor: 'rgba(255, 255, 255, 0.02)',
  border: '1px solid rgba(255, 255, 255, 0.06)',
  padding: '7px 12px',
  borderRadius: '8px',
  fontSize: '0.8rem',
  color: '#94a3b8',
  fontWeight: '600',
};

const pillDotStyle = {
  width: '5px',
  height: '5px',
  borderRadius: '50%',
  backgroundColor: '#6d28d9',
};

const authCardStyle = {
  backgroundColor: 'rgba(11, 14, 22, 0.92)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  padding: '36px 30px',
  borderRadius: '19px',
  boxSizing: 'border-box',
};

const formTitleStyle = {
  fontSize: '1.4rem',
  fontWeight: '800',
  color: '#ffffff',
  margin: '0 0 6px 0',
  letterSpacing: '-0.3px',
};

const subtitleStyle = {
  color: '#64748b',
  fontSize: '0.82rem',
  margin: 0,
  lineHeight: '1.4',
};

const labelStyle = {
  display: 'block',
  fontSize: '0.7rem',
  fontWeight: '700',
  color: '#94a3b8',
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.6px',
};

const inputStyle = {
  width: '100%',
  padding: '11px 14px',
  backgroundColor: 'rgba(255, 255, 255, 0.02)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '10px',
  color: '#ffffff',
  fontSize: '0.88rem',
  boxSizing: 'border-box',
  outline: 'none',
};

const forgotPasswordStyle = {
  fontSize: '0.75rem',
  color: '#a78bfa',
  cursor: 'pointer',
  fontWeight: '600',
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

const footerTextStyle = {
  textAlign: 'center',
  marginTop: '22px',
  fontSize: '0.82rem',
  color: '#64748b',
};

const toggleLinkStyle = {
  color: '#a78bfa',
  fontWeight: '700',
  cursor: 'pointer',
  marginLeft: '4px',
};

const demoNoteStyle = {
  marginTop: '22px',
  paddingTop: '16px',
  borderTop: '1px solid rgba(255, 255, 255, 0.05)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  fontSize: '0.72rem',
  color: '#475569',
  fontWeight: '500',
};