import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { apiBaseUrl } from '../config';
import { Chessboard } from './board/Chessboard';
import { OpeningExplorer } from './openings/OpeningExplorer';
import { GameHistoryExplorer } from './openings/GameHistoryExplorer';
import { TopGamesExplorer } from './openings/TopGamesExplorer';
import {
  LastPracticesExplorer,
  type LastPracticePosition,
} from './openings/LastPracticesExplorer';
import { PgnExplorer } from './openings/PgnExplorer';
import { FenExplorer } from './openings/FenExplorer';

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

type PositionSource = 'opening' | 'myGames' | 'topGames' | 'lastPractices' | 'pgn' | 'fen';

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
  const [previewMoves, setPreviewMoves] = useState<string[]>([]);
  const [isPreviewDetached, setIsPreviewDetached] = useState(false);
  const [lastPracticePositions, setLastPracticePositions] = useState<LastPracticePosition[]>([]);
  const [lastPracticeSelectedIndex, setLastPracticeSelectedIndex] = useState(0);
  const isPreviewDetachedRef = useRef(false);
  useEffect(() => {
    isPreviewDetachedRef.current = isPreviewDetached;
  }, [isPreviewDetached]);

  const isUsingPreviewSource =
    positionSource === 'opening' ||
    positionSource === 'myGames' ||
    positionSource === 'topGames' ||
    positionSource === 'lastPractices' ||
    positionSource === 'pgn' ||
    positionSource === 'fen';

  const previewFen =
    boardFen ??
    (session ? null : selectedOpeningFen ?? lastPracticePositions[lastPracticeSelectedIndex]?.fen ?? new Chess().fen());
  const turnToMove = useMemo(() => {
    if (!previewFen || session) return null;
    const parts = previewFen.split(/\s/);
    return parts[1] === 'b' ? 'black' : 'white';
  }, [previewFen, session]);

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }),
    [token],
  );

  // Fetch last practice positions when switching to "My last practices".
  useEffect(() => {
    if (positionSource !== 'lastPractices') return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const user = (await res.json()) as { lastPracticePositions?: LastPracticePosition[] };
        if (cancelled) return;
        const list = Array.isArray(user?.lastPracticePositions) ? user.lastPracticePositions : [];
        setLastPracticePositions(list);
        setLastPracticeSelectedIndex(0);
        if (list.length > 0 && !isPreviewDetachedRef.current) {
          setBoardFen(list[0].fen);
          setSelectedOpeningFen(list[0].fen);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [positionSource, token]);

  const createSession = async () => {
    const usesCustomPosition = isUsingPreviewSource;
    const baseFen = usesCustomPosition
      ? boardFen ?? selectedOpeningFen ?? lastPracticePositions[lastPracticeSelectedIndex]?.fen ?? null
      : null;

    if (usesCustomPosition && !baseFen) {
      setStatus('Choose a starting position first.');
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

      if (usesCustomPosition && baseFen) {
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
      isPreviewDetachedRef.current = false;
      setSession(json);
      setBoardFen(json.currentFen);
      setPreviewMoves([]);
      setIsPreviewDetached(false);
      setStatus('Practice started');

      // Save this start position to last practices (max 15).
      if (usesCustomPosition && baseFen) {
        const newEntry: LastPracticePosition = {
          fen: baseFen,
          savedAt: new Date().toISOString(),
        };
        const nextList = [newEntry, ...lastPracticePositions].slice(0, 15);
        setLastPracticePositions(nextList);
        try {
          await fetch(`${apiBaseUrl}/users/me`, {
            method: 'PATCH',
            headers: authHeaders,
            body: JSON.stringify({ lastPracticePositions: nextList }),
          });
        } catch {
          // non-fatal
        }
      }
    } catch (err: any) {
      setStatus(err.message ?? 'Error starting practice');
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
    // Set ref immediately so any explorer effect in this commit cannot overwrite boardFen.
    isPreviewDetachedRef.current = true;

    const from = moveUci.slice(0, 2);
    const to = moveUci.slice(2, 4);
    const baseFen = boardFen ?? selectedOpeningFen ?? new Chess().fen();

    try {
      const chess = new Chess(baseFen);
      const move = chess.move({ from, to, promotion: 'q' });
      if (!move) {
        isPreviewDetachedRef.current = false;
        setStatus('Illegal move');
        return;
      }
      setBoardFen(chess.fen());
      setPreviewMoves((prev) => [...prev, moveUci]);
      setIsPreviewDetached(true);
    } catch {
      isPreviewDetachedRef.current = false;
      setStatus('Illegal move');
    }
  };

  // Reset preview state when switching training source. Abort current session when changing source.
  useEffect(() => {
    setSession(null);
    isPreviewDetachedRef.current = false;
    setPreviewMoves([]);
    setIsPreviewDetached(false);
    setBoardFen(null);
    setSelectedOpeningFen(null);
  }, [positionSource]);

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
          <h2>Practice</h2>
          <label className="field">
            <span>Training source</span>
            <select
              value={positionSource}
              onChange={(e) => setPositionSource(e.target.value as PositionSource)}
            >
              <option value="opening">From opening</option>
              <option value="myGames">From my games</option>
              <option value="topGames">From top games</option>
              <option value="lastPractices">My last practices</option>
              <option value="pgn">From PGN</option>
              <option value="fen">From FEN</option>
            </select>
          </label>
          <button className="btn-primary btn-start-practice" onClick={createSession} disabled={loading}>
            Start practice
          </button>
          {status ? <div className="status-text">{status}</div> : null}
        </div>

        <div className="board-card">
          <div className="board-header">
            <h2>Board</h2>
            <div className="board-actions">
              {!session && isUsingPreviewSource && turnToMove != null ? (
                <span className="turn-indicator" aria-live="polite">
                  {turnToMove === 'white' ? 'White' : 'Black'} to move
                </span>
              ) : null}
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
                : selectedOpeningFen ??
                  lastPracticePositions[lastPracticeSelectedIndex]?.fen ??
                  new Chess().fen())
            }
            userColor={session?.userColor ?? userColor}
            onUserMove={
              !session && isUsingPreviewSource
                ? handleUserMovePreview
                : handleUserMoveInSession
            }
            disabled={loading}
          />
        </div>
      </section>

      <section className="practice-right">
        {positionSource === 'pgn' ? (
          <div className="panel">
            <PgnExplorer
              attached={!isPreviewDetached && !session}
              onSelectPosition={(fen) => {
                setSelectedOpeningFen(fen);
                if (!session && !isPreviewDetachedRef.current) {
                  setBoardFen(fen);
                  setPreviewMoves([]);
                }
              }}
            />
          </div>
        ) : null}
        {positionSource === 'fen' ? (
          <div className="panel">
            <FenExplorer
              onSelectPosition={(fen) => {
                setSelectedOpeningFen(fen);
                if (!session && !isPreviewDetachedRef.current) {
                  setBoardFen(fen);
                  setPreviewMoves([]);
                }
              }}
            />
          </div>
        ) : null}
        {positionSource === 'opening' ? (
          <div className="panel">
            <OpeningExplorer
              attached={!isPreviewDetached && !session}
              onSelectPosition={(fen) => {
                setSelectedOpeningFen(fen);
                if (!session && !isPreviewDetachedRef.current) {
                  setBoardFen(fen);
                  setPreviewMoves([]);
                }
              }}
            />
          </div>
        ) : null}
        {positionSource === 'myGames' ? (
          <div className="panel">
            <GameHistoryExplorer
              token={token}
              onSelectPosition={(fen) => {
                setSelectedOpeningFen(fen);
                if (!session && !isPreviewDetachedRef.current) {
                  setBoardFen(fen);
                  setPreviewMoves([]);
                }
              }}
              attached={!isPreviewDetached && !session}
              onGameChanged={() => {
                setSession(null);
                setIsPreviewDetached(false);
                setPreviewMoves([]);
                setBoardFen(null);
              }}
            />
          </div>
        ) : null}
        {positionSource === 'topGames' ? (
          <div className="panel">
            <TopGamesExplorer
              token={token}
              onSelectPosition={(fen) => {
                setSelectedOpeningFen(fen);
                if (!session && !isPreviewDetachedRef.current) {
                  setBoardFen(fen);
                  setPreviewMoves([]);
                }
              }}
              attached={!isPreviewDetached && !session}
              onGameChanged={() => {
                setSession(null);
                setIsPreviewDetached(false);
                setPreviewMoves([]);
                setBoardFen(null);
              }}
            />
          </div>
        ) : null}
        {positionSource === 'lastPractices' ? (
          <div className="panel">
            <LastPracticesExplorer
              positions={lastPracticePositions}
              selectedIndex={lastPracticeSelectedIndex}
              onSelectPosition={(fen, index) => {
                setLastPracticeSelectedIndex(index);
                setSelectedOpeningFen(fen);
                if (!session && !isPreviewDetachedRef.current) {
                  setBoardFen(fen);
                  setPreviewMoves([]);
                }
              }}
              attached={!isPreviewDetached && !session}
              onPositionChanged={() => setSession(null)}
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
          ) : session ? (
            <p>No moves played yet.</p>
          ) : (
            <p>No moves yet. Start practice to play.</p>
          )}
        </div>
      </section>
    </div>
  );
};

