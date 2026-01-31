import React, { useState } from 'react';
import { AuthPage } from './components/AuthPage';
import { PracticePage } from './components/PracticePage';
import { PracticeGuide } from './components/PracticeGuide';
import { UserSettings } from './components/UserSettings';

export interface AuthState {
  token: string;
  email: string;
  displayName?: string;
  chessComUsername?: string;
  lichessUsername?: string;
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

  const [showSettings, setShowSettings] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const handleAuth = (next: AuthState | null) => {
    setAuth(next);
    if (next) {
      localStorage.setItem('auth', JSON.stringify(next));
    } else {
      localStorage.removeItem('auth');
      setShowSettings(false);
      setShowGuide(false);
    }
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="brand">
          <span className="brand-logo">♟</span>
          <span className="brand-name">Chess AI Dojo</span>
        </div>
        <div className="header-right">
          {auth ? (
            <>
              <span className="user-email">
                {auth.displayName || auth.email}
              </span>
              {!showGuide ? (
                <button
                  className="btn-secondary"
                  onClick={() => setShowGuide(true)}
                >
                  Guide
                </button>
              ) : null}
              <button
                className="btn-secondary"
                onClick={() => setShowSettings((v) => !v)}
              >
                Settings
              </button>
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
        ) : showSettings ? (
          <UserSettings auth={auth} onAuthChange={handleAuth} onBack={() => setShowSettings(false)} />
        ) : showGuide ? (
          <PracticeGuide onBack={() => setShowGuide(false)} />
        ) : (
          <PracticePage token={auth.token} />
        )}
      </main>
      <footer className="app-footer" />
    </div>
  );
};


