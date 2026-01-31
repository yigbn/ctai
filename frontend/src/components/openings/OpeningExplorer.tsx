import React, { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { OPENING_BOOK, OpeningLine } from '../../openings/openingBook';

interface Props {
  /** When false, the main board has deviated from this line; stop pushing FEN and disable nav. */
  attached: boolean;
  onSelectPosition: (fen: string) => void;
}

export const OpeningExplorer: React.FC<Props> = ({ attached, onSelectPosition }) => {
  const [selectedId, setSelectedId] = useState<string>(OPENING_BOOK[0]?.id ?? '');
  const [plyIndex, setPlyIndex] = useState<number>(0);

  const opening: OpeningLine | undefined = useMemo(
    () => OPENING_BOOK.find((o) => o.id === selectedId) ?? OPENING_BOOK[0],
    [selectedId],
  );

  const positionFens: string[] = useMemo(() => {
    if (!opening) return [];
    const chess = new Chess();
    const fens: string[] = [chess.fen()];
    for (const san of opening.moves) {
      try {
        chess.move(san);
        fens.push(chess.fen());
      } catch {
        break;
      }
    }
    return fens;
  }, [opening]);

  // When the user picks a new opening, jump to the *final* position by default.
  useEffect(() => {
    const max = Math.max(0, positionFens.length - 1);
    setPlyIndex(max);
  }, [opening?.id, positionFens.length]);

  const maxPly = Math.max(0, positionFens.length - 1);
  const clampedPlyIndex = Math.min(plyIndex, maxPly);
  const currentFen = positionFens[clampedPlyIndex] ?? new Chess().fen();

  const handlePrev = () => {
    setPlyIndex((idx) => Math.max(0, idx - 1));
  };

  const handleNext = () => {
    setPlyIndex((idx) => Math.min(maxPly, idx + 1));
  };

  const handleUsePosition = () => {
    const fen = positionFens[clampedPlyIndex];
    if (fen) {
      onSelectPosition(fen);
    }
  };

  const movesLabel = useMemo(() => {
    if (!opening) return '';
    const parts: string[] = [];
    for (let i = 0; i < opening.moves.length; i += 2) {
      const moveNumber = i / 2 + 1;
      const whiteMove = opening.moves[i];
      const blackMove = opening.moves[i + 1];
      if (blackMove) {
        parts.push(`${moveNumber}. ${whiteMove} ${blackMove}`);
      } else {
        parts.push(`${moveNumber}. ${whiteMove}`);
      }
    }
    return parts.join(' ');
  }, [opening]);

  // When attached, push current FEN so the main board follows. When detached (user deviated), don't overwrite.
  useEffect(() => {
    if (attached && currentFen) {
      onSelectPosition(currentFen);
    }
  }, [attached, currentFen, onSelectPosition]);

  return (
    <div className="opening-explorer">
      <h3>Opening explorer</h3>
      <label className="field">
        <span>Select opening</span>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          {OPENING_BOOK.map((o) => (
            <option key={o.id} value={o.id}>
              {o.eco} · {o.name} ({o.side === 'white' ? 'White' : 'Black'})
            </option>
          ))}
        </select>
      </label>

      {opening ? (
        <div className="opening-details">
          <p className="opening-name">
            <strong>{opening.name}</strong> ({opening.eco}) ·{' '}
            {opening.side === 'white' ? 'Play as White' : 'Play as Black'}
          </p>
          <p className="opening-moves">{movesLabel}</p>

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
                disabled={!attached || clampedPlyIndex === 0}
                className="btn-secondary"
              >
                ◀ Previous move
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={!attached || clampedPlyIndex === maxPly}
                className="btn-secondary"
              >
                Next move ▶
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

