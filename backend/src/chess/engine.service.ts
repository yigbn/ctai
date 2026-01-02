import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { spawn } from 'child_process';
import { Chess } from 'chess.js';

export interface EngineAnalysis {
  bestMove: string;
  evaluation: number | null; // centipawns, positive for white
  depth: number;
  pv?: string[];
  source?: 'cloud' | 'local' | 'fallback';
}

interface AnalyzeOptions {
  depth?: number;
}

@Injectable()
export class EngineService {
  async analyzePosition(fen: string, options: AnalyzeOptions = {}): Promise<EngineAnalysis> {
    const depth = options.depth ?? 18;

    // 1) Prefer a local Stockfish binary if configured.
    const enginePath = process.env.STOCKFISH_PATH;
    if (enginePath) {
      try {
        const local = await this.runLocalUciEngine(enginePath, fen, depth);
        return { ...local, source: 'local' };
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Local engine error', err);
      }
    }

    // 2) Optionally use a strong remote engine (e.g. Lichess cloud eval) IF explicitly configured.
    const engineApiUrl = process.env.ENGINE_API_URL;
    const timeoutMs = 5000; // up to ~5 seconds thinking time

    if (engineApiUrl) {
      const url = `${engineApiUrl}?fen=${encodeURIComponent(
        fen,
      )}&multiPv=1&depth=${depth}&variant=standard`;

      try {
        const response = await axios.get(url, { timeout: timeoutMs, validateStatus: () => true });
        if (response.status !== 200) {
          // eslint-disable-next-line no-console
          console.warn(
            'Cloud engine unavailable',
            response.status,
            (response.data as any)?.error ?? '',
          );
          throw new Error(`Cloud engine HTTP ${response.status}`);
        }

        const data: any = response.data;
        const pv0 = data?.pvs?.[0];
        if (!pv0 || !pv0.moves) {
          return this.simpleFallback(fen, depth);
        }

        const movesStr: string = pv0.moves;
        const moves = movesStr.split(' ').filter(Boolean);
        const bestMove: string = moves[0] ?? '';
        const evalCp: number | null =
          typeof pv0.cp === 'number'
            ? (pv0.cp as number)
            : typeof pv0.mate === 'number'
              ? (pv0.mate > 0 ? 100000 : -100000)
              : null;

        return {
          bestMove,
          evaluation: evalCp,
          depth: typeof pv0.depth === 'number' ? pv0.depth : depth,
          pv: moves,
          source: 'cloud',
        };
      } catch (err: any) {
        // On any engine/network error, fall back to a simple internal evaluator
        // so the app never gets "stuck".
        // eslint-disable-next-line no-console
        console.warn('Cloud engine error', err?.message ?? String(err));
        return this.simpleFallback(fen, depth);
      }
    }

    // 3) No local engine and no cloud engine configured → always use fallback.
    return this.simpleFallback(fen, depth);
  }

  private async runLocalUciEngine(
    enginePath: string,
    fen: string,
    depth: number,
  ): Promise<EngineAnalysis> {
    // Use a one-shot UCI session: ask the engine to think for up to ~5 seconds,
    // resolve as soon as we see a "bestmove" line, then quit the process.
    const maxTimeMs = 5000;

    return new Promise<EngineAnalysis>((resolve, reject) => {
      const engine = spawn(enginePath, [], { stdio: ['pipe', 'pipe', 'pipe'] });

      let bestMove = '';
      let evalCp: number | null = null;
      let pv: string[] = [];
      let resolved = false;

      const cleanup = (err: Error | null, result?: EngineAnalysis) => {
        if (resolved) return;
        resolved = true;
        try {
          engine.kill();
        } catch {
          // ignore
        }
        clearTimeout(timeout);
        if (err) {
          reject(err);
        } else if (result) {
          resolve(result);
        } else {
          reject(new Error('Engine finished without result'));
        }
      };

      const timeout = setTimeout(() => {
        cleanup(new Error('Local engine timeout'));
      }, maxTimeMs + 1500);

      engine.stdout.on('data', (data: Buffer) => {
        const lines = data
          .toString()
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);

        for (const line of lines) {
          if (line.startsWith('info')) {
            const tokens = line.split(' ');
            const scoreIndex = tokens.indexOf('cp');
            if (scoreIndex !== -1 && tokens[scoreIndex + 1]) {
              const value = parseInt(tokens[scoreIndex + 1], 10);
              if (!Number.isNaN(value)) {
                evalCp = value;
              }
            }
            const pvIndex = tokens.indexOf('pv');
            if (pvIndex !== -1 && tokens[pvIndex + 1]) {
              pv = tokens.slice(pvIndex + 1);
            }
          }
          if (line.startsWith('bestmove')) {
            const parts = line.split(' ');
            if (parts[1]) {
              bestMove = parts[1];
            }
            cleanup(null, {
              bestMove,
              evaluation: evalCp,
              depth,
              pv,
            });
          }
        }
      });

      engine.stderr.on('data', (data: Buffer) => {
        // eslint-disable-next-line no-console
        console.error('Local engine stderr:', data.toString());
      });

      engine.on('error', (err) => {
        cleanup(err as Error);
      });

      // Basic UCI initialization and search command.
      engine.stdin.write('uci\n');
      engine.stdin.write('isready\n');
      engine.stdin.write(`position fen ${fen}\n`);
      engine.stdin.write(`go movetime ${maxTimeMs}\n`);
    });
  }

  private simpleFallback(fen: string, depth: number): EngineAnalysis {
    const chess = new Chess(fen);
    const moves = chess.moves({ verbose: true });
    if (moves.length === 0) {
      return {
        bestMove: '',
        evaluation: null,
        depth,
        pv: [],
        source: 'fallback',
      };
    }

    const sideToMove = chess.turn(); // 'w' or 'b'
    let bestScore = -Infinity;
    let bestMoveUci = '';

    for (const m of moves) {
      chess.move(m);
      const score = evaluateMaterial(chess);
      chess.undo();

      const adjusted = sideToMove === 'w' ? score : -score;
      if (adjusted > bestScore) {
        bestScore = adjusted;
        bestMoveUci = `${m.from}${m.to}${m.promotion ?? ''}`;
      }
    }

    return {
      bestMove: bestMoveUci,
      evaluation: Math.round(bestScore),
      depth,
      pv: [bestMoveUci],
      source: 'fallback',
    };
  }
}

function evaluateMaterial(chess: Chess): number {
  const pieceValues: Record<string, number> = {
    p: 100,
    n: 320,
    b: 330,
    r: 500,
    q: 900,
    k: 0,
  };

  let score = 0;
  const board = chess.board();
  for (const row of board) {
    for (const piece of row) {
      if (!piece) continue;
      const value = pieceValues[piece.type] ?? 0;
      score += piece.color === 'w' ? value : -value;
    }
  }
  return score;
}



