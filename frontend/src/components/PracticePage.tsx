import React, { useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { apiBaseUrl } from '../config';
import { Chessboard } from './board/Chessboard';

interface Props {
  token: string;
}

interface Session {
  id: string;
  initialFen: string;
  currentFen: string;
  userColor: 'white' | 'black';
  moveHistory: string[];
}

interface MoveResponse {
  session: Session;
  engineMove?: string;
  analysis?: {
    bestMove: string;
    evaluation: number | null;
    depth: number;
    pv?: string[];
  };
  explanation?: string;
}

export const PracticePage: React.FC<Props> = ({ token }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [initialFen, setInitialFen] = useState<string>('startpos');
  const [userColor, setUserColor] = useState<'white' | 'black'>('white');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [lastEngineMove, setLastEngineMove] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);

  const displayFen = useMemo(() => {
    if (!session) return initialFen === 'startpos' ? undefined : initialFen;
    return session.currentFen;
  }, [session, initialFen]);

  const chess = useMemo(() => {
    if (displayFen && displayFen !== 'startpos') {
      try {
        return new Chess(displayFen);
      } catch {
        return new Chess();
      }
    }
    return new Chess();
  }, [displayFen]);

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }),
    [token],
  );

  const createSession = async () => {
    setLoading(true);
    setStatus(null);
    setExplanation(null);
    setLastEngineMove(null);
    try {
      const body =
        initialFen === 'startpos'
          ? { userColor }
          : {
              initialFen,
              userColor,
            };
      const res = await fetch(`${apiBaseUrl}/chess/session`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to create session');
      }
      const json = (await res.json()) as Session;
      setSession(json);
      setStatus('Session started');
    } catch (err: any) {
      setStatus(err.message ?? 'Error creating session');
    } finally {
      setLoading(false);
    }
  };

  const handleUserMove = async (moveUci: string) => {
    if (!session) {
      setStatus('Create a session first.');
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`${apiBaseUrl}/chess/session/${session.id}/move`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ moveUci }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Move rejected');
      }
      const json = (await res.json()) as MoveResponse;
      setSession(json.session);
      setLastEngineMove(json.engineMove ?? null);
      setExplanation(json.explanation ?? null);
      setStatus('Move played');
    } catch (err: any) {
      setStatus(err.message ?? 'Error sending move');
    } finally {
      setLoading(false);
    }
  };

  const resetSession = async () => {
    if (!session) return;
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`${apiBaseUrl}/chess/session/${session.id}/reset`, {
        method: 'POST',
        headers: authHeaders,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to reset');
      }
      const json = (await res.json()) as Session;
      setSession(json);
      setExplanation(null);
      setLastEngineMove(null);
      setStatus('Position reset to original');
    } catch (err: any) {
      setStatus(err.message ?? 'Error resetting');
    } finally {
      setLoading(false);
    }
  };

  const switchSide = async () => {
    if (!session) return;
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`${apiBaseUrl}/chess/session/${session.id}/switch-side`, {
        method: 'POST',
        headers: authHeaders,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to switch side');
      }
      const json = (await res.json()) as Session;
      setSession(json);
      setExplanation(null);
      setLastEngineMove(null);
      setStatus('Side switched and position reset');
    } catch (err: any) {
      setStatus(err.message ?? 'Error switching side');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="practice-page">
      <section className="practice-left">
        <div className="setup-card">
          <h2>Start a Training Session</h2>
          <label className="field">
            <span>Initial position (FEN or “startpos”)</span>
            <input
              type="text"
              value={initialFen}
              onChange={(e) => setInitialFen(e.target.value)}
              placeholder="startpos"
            />
          </label>
          <label className="field">
            <span>Your side</span>
            <select
              value={userColor}
              onChange={(e) => setUserColor(e.target.value as 'white' | 'black')}
            >
              <option value="white">White</option>
              <option value="black">Black</option>
            </select>
          </label>
          <button className="btn-primary" onClick={createSession} disabled={loading}>
            {session ? 'Restart from new position' : 'Start session'}
          </button>
          {status ? <div className="status-text">{status}</div> : null}
        </div>

        <div className="board-card">
          <div className="board-header">
            <h2>Board</h2>
            <div className="board-actions">
              <button onClick={resetSession} disabled={!session || loading} className="btn-secondary">
                Reset
              </button>
              <button onClick={switchSide} disabled={!session || loading} className="btn-secondary">
                Switch Side
              </button>
            </div>
          </div>

          <Chessboard
            chess={chess}
            userColor={session?.userColor ?? userColor}
            onUserMove={handleUserMove}
          />
        </div>
      </section>

      <section className="practice-right">
        <div className="panel">
          <h3>Engine Insight</h3>
          {lastEngineMove ? (
            <p>
              <strong>Last engine move:</strong> {lastEngineMove}
            </p>
          ) : (
            <p>No engine move yet. Play a move to start the analysis.</p>
          )}
        </div>
        <div className="panel">
          <h3>AI Explanation</h3>
          {explanation ? (
            <p>{explanation}</p>
          ) : (
            <p>
              After each of your moves, the server will request the engine&apos;s response and an AI
              explanation of the ideas behind it.
            </p>
          )}
        </div>
        <div className="panel">
          <h3>Move List (UCI)</h3>
          {session && session.moveHistory.length > 0 ? (
            <ol className="move-list">
              {session.moveHistory.map((m, idx) => (
                <li key={`${m}-${idx}`}>{m}</li>
              ))}
            </ol>
          ) : (
            <p>No moves played yet.</p>
          )}
        </div>
      </section>
    </div>
  );
};


