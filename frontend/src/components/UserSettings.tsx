import React, { useState } from 'react';
import type { AuthState } from '../App';
import { apiBaseUrl } from '../config';

interface Props {
  auth: AuthState;
  onAuthChange: (next: AuthState) => void;
  onBack: () => void;
}

export const UserSettings: React.FC<Props> = ({ auth, onAuthChange, onBack }) => {
  const [displayName, setDisplayName] = useState(auth.displayName ?? '');
  const [chessComUsername, setChessComUsername] = useState(auth.chessComUsername ?? '');
  const [lichessUsername, setLichessUsername] = useState(auth.lichessUsername ?? '');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          displayName: displayName || null,
          chessComUsername: chessComUsername || null,
          lichessUsername: lichessUsername || null,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to save settings');
      }
      const json = await res.json();
      const nextAuth: AuthState = {
        ...auth,
        displayName: json.displayName,
        chessComUsername: json.chessComUsername,
        lichessUsername: json.lichessUsername,
      };
      onAuthChange(nextAuth);
      setStatus('Settings saved');
    } catch (err: any) {
      setError(err.message ?? 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-card">
        <button type="button" className="btn-back" onClick={onBack} aria-label="Back to practice">
          ← Back
        </button>
        <h2>User Settings</h2>
        <p className="settings-subtitle">
          All fields are optional. These will be used later to integrate with your online chess
          accounts.
        </p>
        <form className="settings-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Display name</span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="What should we call you?"
            />
          </label>
          <label className="field">
            <span>chess.com username</span>
            <input
              type="text"
              value={chessComUsername}
              onChange={(e) => setChessComUsername(e.target.value)}
              placeholder="Optional"
            />
          </label>
          <label className="field">
            <span>lichess.org username</span>
            <input
              type="text"
              value={lichessUsername}
              onChange={(e) => setLichessUsername(e.target.value)}
              placeholder="Optional"
            />
          </label>
          {error ? <div className="error-text">{error}</div> : null}
          {status ? <div className="status-text">{status}</div> : null}
          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </form>
      </div>
    </div>
  );
};



