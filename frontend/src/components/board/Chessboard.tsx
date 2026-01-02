import React from 'react';
import { Chessboard as RcChessboard } from 'react-chessboard';

interface Props {
  fen: string;
  userColor: 'white' | 'black';
  onUserMove: (moveUci: string) => void;
  disabled?: boolean;
}

export const Chessboard: React.FC<Props> = ({ fen, userColor, onUserMove, disabled }) => {
  const position = fen;

  const handlePieceDrop = (sourceSquare: string, targetSquare: string, piece: string) => {
    // Only allow moving your own pieces and only when it's your turn.
    const uci = `${sourceSquare}${targetSquare}`;
    onUserMove(uci);
    // Let the parent validate and, if needed, snap back via updated FEN.
    return true;
  };

  return (
    <div className="board-wrapper">
      <RcChessboard
        position={position}
        boardOrientation={userColor}
        onPieceDrop={handlePieceDrop}
        animationDuration={200}
        arePiecesDraggable={!disabled}
        customBoardStyle={{
          borderRadius: '0.75rem',
          boxShadow: '0 18px 36px rgba(15, 23, 42, 0.7)',
        }}
      />
    </div>
  );
};


