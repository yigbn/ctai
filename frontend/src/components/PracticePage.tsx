import React, { useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { apiBaseUrl } from '../config';
import { Chessboard } from './board/Chessboard';
import { OpeningExplorer } from './openings/OpeningExplorer';

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

type PositionSource = 'opening' | 'myGames' | 'topGame';

export const PracticePage: React.FC<Props> = ({ token }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [userColor, setUserColor] = useState<'white' | 'black'>('white');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [lastEngineMove, setLastEngineMove] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [boardFen, setBoardFen] = useState<string | null>(null);
  const [positionSource, setPositionSource] = useState<PositionSource>('opening');
  const [selectedOpeningFen, setSelectedOpeningFen] = useState<string | null>(null);

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }),
    [token],
  );

  const createSession = async () => {
    const baseFen =
      positionSource === 'opening'
        ? boardFen ?? selectedOpeningFen
        : null;

    if (positionSource === 'opening' && !baseFen) {
      setStatus('Choose an opening position first.');
      return;
    }

    setLoading(true);
    setStatus(null);
    setExplanation(null);
    setLastEngineMove(null);
    try {
      const body: { initialFen?: string; userColor: 'white' | 'black' } = {
        userColor,
      };

      if (positionSource === 'opening' && baseFen) {
        body.initialFen = baseFen;
      }

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
      setBoardFen(json.currentFen);
      setStatus('Session started');
    } catch (err: any) {
      setStatus(err.message ?? 'Error creating session');
    } finally {
      setLoading(false);
    }
  };

  const handleUserMoveInSession = async (moveUci: string) => {
    if (!session) return;
    const from = moveUci.slice(0, 2);
    const to = moveUci.slice(2, 4);

    // Optimistically apply the move on the client so it shows immediately.
    try {
      const baseFen = boardFen ?? session.currentFen;
      const chess = new Chess(baseFen);
      const move = chess.move({ from, to, promotion: 'q' });
      if (!move) {
        setStatus('Illegal move');
        return;
      }
      setBoardFen(chess.fen());
    } catch {
      // If anything goes wrong, just rely on server state.
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
      setBoardFen(json.session.currentFen);
      setLastEngineMove(json.engineMove ?? null);
      setExplanation(json.explanation ?? null);
      setStatus('Move played');
    } catch (err: any) {
      setStatus(err.message ?? 'Error sending move');
      // Revert board to the last known server position.
      if (session) {
        setBoardFen(session.currentFen);
      }
    } finally {
      setLoading(false);
    }
  };

  // Allow the user to freely tweak the opening position on the client
  // before starting or restarting a session.
  const handleUserMovePreview = (moveUci: string) => {
    const from = moveUci.slice(0, 2);
    const to = moveUci.slice(2, 4);
    const rawFen = boardFen ?? selectedOpeningFen ?? new Chess().fen();

    // Force side-to-move to match the side the user selected, so they can
    // always make a move even if the book position is technically the other
    // side's turn.
    const parts = rawFen.split(' ');
    if (parts.length >= 2) {
      parts[1] = userColor === 'white' ? 'w' : 'b';
    }
    const baseFen = parts.join(' ');

    try {
      const chess = new Chess(baseFen);
      const move = chess.move({ from, to, promotion: 'q' });
      if (!move) {
        setStatus('Illegal move');
        return;
      }
      setBoardFen(chess.fen());
    } catch {
      setStatus('Illegal move');
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
      setBoardFen(json.currentFen);
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
      setBoardFen(json.currentFen);
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
            <span>Your side</span>
            <select
              value={userColor}
              onChange={(e) => setUserColor(e.target.value as 'white' | 'black')}
            >
              <option value="white">White</option>
              <option value="black">Black</option>
            </select>
          </label>
          <label className="field">
            <span>Training source</span>
            <select
              value={positionSource}
              onChange={(e) => setPositionSource(e.target.value as PositionSource)}
            >
              <option value="opening">From opening</option>
              <option value="myGames" disabled>
                From my games (coming soon)
              </option>
              <option value="topGame" disabled>
                From top game (coming soon)
              </option>
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
            fen={
              boardFen ??
              (session
                ? session.currentFen
                : selectedOpeningFen ?? new Chess().fen())
            }
            userColor={session?.userColor ?? userColor}
            onUserMove={positionSource === 'opening' ? handleUserMovePreview : handleUserMoveInSession}
            disabled={loading}
          />
        </div>
      </section>

      <section className="practice-right">
        {positionSource === 'opening' ? (
          <div className="panel">
            <OpeningExplorer
              onSelectPosition={(fen) => {
                setSelectedOpeningFen(fen);
                if (!session) {
                  setBoardFen(fen);
                }
              }}
            />
          </div>
        ) : null}
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

