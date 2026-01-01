import React, { useMemo, useState } from 'react';
import { Chess } from 'chess.js';

interface Props {
  chess: Chess;
  userColor: 'white' | 'black';
  onUserMove: (moveUci: string) => void;
}

interface SquareCoords {
  file: number;
  rank: number;
}

const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

export const Chessboard: React.FC<Props> = ({ chess, userColor, onUserMove }) => {
  const [selected, setSelected] = useState<SquareCoords | null>(null);

  const boardSquares = useMemo(() => {
    const result: { square: string; piece: string | null; color: 'light' | 'dark' }[] = [];

    const ranks = [...Array(8).keys()].map((i) => i + 1);
    const orientedRanks = userColor === 'white' ? ranks.slice().reverse() : ranks;
    const orientedFiles = userColor === 'white' ? files : [...files].reverse();

    for (const rank of orientedRanks) {
      for (const fileIdx in orientedFiles) {
        const file = orientedFiles[fileIdx as any];
        const square = `${file}${rank}`;
        const piece = chess.get(square as any);
        const pieceChar = piece ? (piece.color === 'w' ? piece.type.toUpperCase() : piece.type) : null;
        const isDark = (rank + (files.indexOf(file) + 1)) % 2 === 0;
        result.push({
          square,
          piece: pieceChar,
          color: isDark ? 'dark' : 'light',
        });
      }
    }
    return result;
  }, [chess, userColor]);

  const handleSquareClick = (square: string) => {
    const file = files.indexOf(square[0] as (typeof files)[number]);
    const rank = parseInt(square[1], 10) - 1;
    if (file < 0 || rank < 0) return;

    const coords: SquareCoords = { file, rank };

    const piece = chess.get(square as any);

    if (!selected) {
      if (!piece) return;
      const pieceColor = piece.color === 'w' ? 'white' : 'black';
      if (pieceColor !== userColor) return;
      setSelected(coords);
    } else {
      const fromFileChar = files[selected.file];
      const fromRank = selected.rank + 1;
      const fromSquare = `${fromFileChar}${fromRank}`;
      const moveUci = `${fromSquare}${square}`;
      setSelected(null);
      onUserMove(moveUci);
    }
  };

  return (
    <div className="chessboard">
      {boardSquares.map((sq) => (
        <button
          key={sq.square}
          type="button"
          className={`square square-${sq.color}`}
          onClick={() => handleSquareClick(sq.square)}
        >
          {sq.piece ? <span className="piece">{pieceToUnicode(sq.piece)}</span> : null}
        </button>
      ))}
    </div>
  );
};

function pieceToUnicode(piece: string): string {
  switch (piece) {
    case 'P':
      return '♙';
    case 'N':
      return '♘';
    case 'B':
      return '♗';
    case 'R':
      return '♖';
    case 'Q':
      return '♕';
    case 'K':
      return '♔';
    case 'p':
      return '♟';
    case 'n':
      return '♞';
    case 'b':
      return '♝';
    case 'r':
      return '♜';
    case 'q':
      return '♛';
    case 'k':
      return '♚';
    default:
      return '';
  }
}


