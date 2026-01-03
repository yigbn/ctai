import React, { useState } from 'react';
import type { AuthState } from '../App';
import { apiBaseUrl } from '../config';

interface Props {
  onAuthenticated: (auth: AuthState) => void;
}

type Mode = 'login' | 'register';

export const AuthPage: React.FC<Props> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Authentication failed');
      }
      const json = await res.json();
      onAuthenticated({
        token: json.token,
        email: json.user.email,
        displayName: json.user.displayName,
        chessComUsername: json.user.chessComUsername,
        lichessUsername: json.user.lichessUsername,
      });
    } catch (err: any) {
      setError(err.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Train with your AI Chess Coach</h1>
        <p className="auth-subtitle">
          Set any position, play against a strong engine, and get human-like explanations for every
          move.
        </p>

        <div className="auth-toggle">
          <button
            className={mode === 'login' ? 'auth-toggle-btn active' : 'auth-toggle-btn'}
            onClick={() => setMode('login')}
          >
            Login
          </button>
          <button
            className={mode === 'register' ? 'auth-toggle-btn active' : 'auth-toggle-btn'}
            onClick={() => setMode('register')}
          >
            Sign Up
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
            />
          </label>
          {error ? <div className="error-text">{error}</div> : null}
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Login' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
};


