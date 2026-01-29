import React, { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { apiBaseUrl } from '../../config';

interface Props {
  token: string;
  onSelectPosition: (fen: string) => void;
}

type GameSource = 'lichess' | 'chess.com';

interface TrainingGame {
  id: string;
  source: GameSource;
  url: string;
  white: string;
  black: string;
  result: string;
  endTime: string;
  fens: string[];
}

export const GameHistoryExplorer: React.FC<Props> = ({ token, onSelectPosition }) => {
  const [games, setGames] = useState<TrainingGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [plyIndex, setPlyIndex] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;

    const loadGames = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiBaseUrl}/chess/my-games?limit=15`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || 'Failed to load recent games');
        }
        const json = (await res.json()) as TrainingGame[];
        if (cancelled) return;
        setGames(json);
        if (json.length > 0) {
          setSelectedGameId(json[0].id);
        } else {
          setSelectedGameId(null);
        }
        setPlyIndex(0);
      } catch (err: any) {
        if (cancelled) return;
        setError(err.message ?? 'Error loading games');
        setGames([]);
        setSelectedGameId(null);
        setPlyIndex(0);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadGames();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const selectedGame: TrainingGame | null = useMemo(() => {
    if (games.length === 0) return null;
    const found = games.find((g) => g.id === selectedGameId);
    return found ?? games[0];
  }, [games, selectedGameId]);

  const maxPly = useMemo(() => {
    if (!selectedGame || !selectedGame.fens.length) return 0;
    return Math.max(0, selectedGame.fens.length - 1);
  }, [selectedGame]);

  const clampedPlyIndex = useMemo(
    () => Math.min(Math.max(0, plyIndex), maxPly),
    [plyIndex, maxPly],
  );

  const currentFen = useMemo(() => {
    if (!selectedGame || !selectedGame.fens.length) {
      return new Chess().fen();
    }
    return selectedGame.fens[clampedPlyIndex] ?? selectedGame.fens[0];
  }, [selectedGame, clampedPlyIndex]);

  useEffect(() => {
    if (currentFen) {
      onSelectPosition(currentFen);
    }
  }, [currentFen, onSelectPosition]);

  useEffect(() => {
    // When the selected game changes, start from the 10th ply if possible,
    // otherwise from the last available position.
    if (!selectedGame || !selectedGame.fens.length) {
      setPlyIndex(0);
      return;
    }
    const lastIndex = selectedGame.fens.length - 1;
    const preferredIndex = 10; // 10th ply (index 10; index 0 is the initial position)
    const targetIndex = Math.min(lastIndex, preferredIndex);
    setPlyIndex(targetIndex);
  }, [selectedGame?.id]);

  const handlePrev = () => {
    setPlyIndex((idx) => Math.max(0, idx - 1));
  };

  const handleNext = () => {
    setPlyIndex((idx) => Math.min(maxPly, idx + 1));
  };

  const formatGameLabel = (g: TrainingGame): string => {
    const date = new Date(g.endTime);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const sourceLabel = g.source === 'lichess' ? 'Lichess' : 'chess.com';
    return `${sourceLabel} · ${yyyy}-${mm}-${dd} · ${g.white} vs ${g.black} (${g.result})`;
  };

  return (
    <div className="opening-explorer">
      <h3>Your recent games</h3>
      {loading ? <p>Loading games…</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      {!loading && !error && games.length === 0 ? (
        <p>
          No games found. Make sure you have set your Lichess or chess.com username in the
          settings page.
        </p>
      ) : null}

      {games.length > 0 ? (
        <>
          <label className="field">
            <span>Select game</span>
            <select
              value={selectedGame?.id ?? ''}
              onChange={(e) => setSelectedGameId(e.target.value || null)}
            >
              {games.map((g) => (
                <option key={g.id} value={g.id}>
                  {formatGameLabel(g)}
                </option>
              ))}
            </select>
          </label>

          {selectedGame ? (
            <div className="opening-details">
              <p className="opening-name">
                <strong>
                  {selectedGame.white} vs {selectedGame.black}
                </strong>{' '}
                · {selectedGame.result}
              </p>
              <p className="opening-moves">
                Browsing move {clampedPlyIndex} of {maxPly}
              </p>

              <div className="opening-controls">
                <div className="opening-ply-info">
                  <span>
                    Ply: {clampedPlyIndex} / {maxPly}
                  </span>
                </div>
                <div className="opening-nav-buttons">
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={clampedPlyIndex === 0}
                    className="btn-secondary"
                  >
                    ◀ Previous move
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={clampedPlyIndex === maxPly}
                    className="btn-secondary"
                  >
                    Next move ▶
                  </button>
                </div>
              </div>
              <p className="opening-moves">
                When you are on the position you want to practice, start or restart the session on
                the left. You can also make your own moves on the main board before starting.
              </p>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
};

