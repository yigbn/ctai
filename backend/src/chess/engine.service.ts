import { Injectable } from '@nestjs/common';
import { spawn } from 'child_process';

export interface EngineAnalysis {
  bestMove: string;
  evaluation: number | null; // centipawns, positive for white
  depth: number;
  pv?: string[];
}

interface AnalyzeOptions {
  depth?: number;
}

@Injectable()
export class EngineService {
  /**
   * Analyze a position using a UCI engine such as Stockfish.
   * This is a basic implementation that can be wired to a local Stockfish binary via STOCKFISH_PATH.
   */
  async analyzePosition(fen: string, options: AnalyzeOptions = {}): Promise<EngineAnalysis> {
    const enginePath = process.env.STOCKFISH_PATH;

    // Fallback stub if no engine is configured.
    if (!enginePath) {
      return {
        bestMove: '',
        evaluation: null,
        depth: options.depth ?? 8,
        pv: [],
      };
    }

    const depth = options.depth ?? 14;

    return new Promise<EngineAnalysis>((resolve, reject) => {
      const engine = spawn(enginePath, [], { stdio: ['pipe', 'pipe', 'pipe'] });

      let bestMove = '';
      let evalCp: number | null = null;
      let pv: string[] = [];

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
          }
        }
      });

      engine.stderr.on('data', (data: Buffer) => {
        // eslint-disable-next-line no-console
        console.error('Engine stderr:', data.toString());
      });

      engine.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          reject(new Error(`Engine exited with code ${code}`));
        } else {
          resolve({
            bestMove,
            evaluation: evalCp,
            depth,
            pv,
          });
        }
      });

      engine.stdin.write('uci\n');
      engine.stdin.write('isready\n');
      engine.stdin.write(`position fen ${fen}\n`);
      engine.stdin.write(`go depth ${depth}\n`);
    });
  }
}


