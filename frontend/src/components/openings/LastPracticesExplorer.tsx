import React from 'react';

export interface LastPracticePosition {
  fen: string;
  savedAt: string;
}

interface Props {
  positions: LastPracticePosition[];
  selectedIndex: number;
  onSelectPosition: (fen: string, index: number) => void;
  /** When false, the main board has deviated; disable nav. */
  attached: boolean;
  /** Called when the user selects a different position (parent may abort session). */
  onPositionChanged?: () => void;
}

function formatLabel(pos: LastPracticePosition, index: number): string {
  try {
    const date = new Date(pos.savedAt);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `Practice ${index + 1} · ${mm}/${dd} ${hh}:${min}`;
  } catch {
    return `Practice ${index + 1}`;
  }
}

export const LastPracticesExplorer: React.FC<Props> = ({
  positions,
  selectedIndex,
  onSelectPosition,
  attached,
  onPositionChanged,
}) => {
  if (positions.length === 0) {
    return (
      <div className="opening-explorer">
        <h3>My last practices</h3>
        <p>No saved practice positions yet. Start a practice from any source to add one here.</p>
      </div>
    );
  }

  const selected = positions[selectedIndex];
  const fen = selected?.fen;

  return (
    <div className="opening-explorer">
      <h3>My last practices</h3>
      <label className="field">
        <span>Select position</span>
        <select
          value={selectedIndex}
          onChange={(e) => {
            const next = parseInt(e.target.value, 10);
            if (!Number.isNaN(next) && positions[next]) {
              onSelectPosition(positions[next].fen, next);
              onPositionChanged?.();
            }
          }}
        >
          {positions.map((pos, i) => (
            <option key={`${pos.savedAt}-${i}`} value={i}>
              {formatLabel(pos, i)}
            </option>
          ))}
        </select>
      </label>
      {selected ? (
        <div className="opening-details">
          <p className="opening-moves">
            You can deviate on the board, then click &quot;Start practice&quot; to begin from the
            current position (it will be saved here).
          </p>
        </div>
      ) : null}
    </div>
  );
};
