import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/register', { name, email, password });
      localStorage.setItem('nova_token', response.data.token);
      localStorage.setItem('nova_user', JSON.stringify(response.data.user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={boxStyle}>
        <h1 style={{ color: '#6200ee', textAlign: 'center', marginBottom: '5px' }}>✨ NovaSync</h1>
        <p style={{ textAlign: 'center', color: '#aaa', marginBottom: '25px' }}>Create Your Account</p>

        {error && <div style={errorStyle}>{error}</div>}

        <form onSubmit={handleRegister}>
          <div style={{ marginBottom: '15px' }}>
            <label style={labelStyle}>Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={labelStyle}>Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>

          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#aaa', marginTop: '20px' }}>
          Already have an account? <Link to="/login" style={{ color: '#6200ee', textDecoration: 'none' }}>Login</Link>
        </p>
      </div>
    </div>
  );
}

const containerStyle = { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#121212' };
const boxStyle = { width: '100%', maxWidth: '400px', padding: '30px', backgroundColor: '#1e1e24', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' };
const labelStyle = { display: 'block', color: '#ccc', marginBottom: '6px', fontSize: '0.9rem' };
const inputStyle = { width: '100%', padding: '10px', backgroundColor: '#2a2a32', border: '1px solid #444', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' };
const buttonStyle = { width: '100%', padding: '12px', backgroundColor: '#6200ee', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' };
const errorStyle = { padding: '10px', backgroundColor: '#f4433622', border: '1px solid #f44336', color: '#f44336', borderRadius: '6px', marginBottom: '15px', fontSize: '0.9rem' };