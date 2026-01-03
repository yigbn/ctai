import React, { useState } from 'react';
import { AuthPage } from './components/AuthPage';
import { PracticePage } from './components/PracticePage';

export interface AuthState {
  token: string;
  email: string;
}

export const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState | null>(() => {
    const stored = localStorage.getItem('auth');
    if (!stored) return null;
    try {
      return JSON.parse(stored) as AuthState;
    } catch {
      return null;
    }
  });

  const handleAuth = (next: AuthState | null) => {
    setAuth(next);
    if (next) {
      localStorage.setItem('auth', JSON.stringify(next));
    } else {
      localStorage.removeItem('auth');
    }
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="brand">
          <span className="brand-logo">♟</span>
          <span className="brand-name">Chess Dojo AI</span>
        </div>
        <div className="header-right">
          {auth ? (
            <>
              <span className="user-email">{auth.email}</span>
              <button className="btn-secondary" onClick={() => handleAuth(null)}>
                Logout
              </button>
            </>
          ) : null}
        </div>
      </header>
      <main className="app-main">
        {!auth ? (
          <AuthPage onAuthenticated={handleAuth} />
        ) : (
          <PracticePage token={auth.token} />
        )}
      </main>
      <footer className="app-footer">
        <span>
          Inspired by modern AI chess coaches like{' '}
          <a href="https://senseichess.com/" target="_blank" rel="noreferrer">
            Sensei Chess
          </a>
          .
        </span>
      </footer>
    </div>
  );
};


