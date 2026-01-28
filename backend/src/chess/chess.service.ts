import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import { Chess } from 'chess.js';
import { EngineService, EngineAnalysis } from './engine.service';
import { AiExplanationService } from './ai-explanation.service';
import { UsersService } from '../users/users.service';

export type Color = 'white' | 'black';

export interface ChessSession {
  id: string;
  userId: string;
  initialFen: string;
  currentFen: string;
  userColor: Color;
  createdAt: Date;
  moveHistory: string[]; // SAN or UCI moves
}

export type GameSource = 'lichess' | 'chess.com';

export interface TrainingGame {
  id: string;
  source: GameSource;
  url: string;
  white: string;
  black: string;
  result: string;
  endTime: string;
  fens: string[];
}

@Injectable()
export class ChessService {
  private readonly sessions = new Map<string, ChessSession>();

  constructor(
    private readonly engineService: EngineService,
    private readonly aiExplanationService: AiExplanationService,
    private readonly usersService: UsersService,
  ) {}

  createSession(userId: string, initialFen?: string, userColor: Color = 'white'): ChessSession {
    const chess = new Chess(initialFen);
    const session: ChessSession = {
      id: (this.sessions.size + 1).toString(),
      userId,
      initialFen: chess.fen(),
      currentFen: chess.fen(),
      userColor,
      createdAt: new Date(),
      moveHistory: [],
    };
    this.sessions.set(session.id, session);
    return session;
  }

  getSession(id: string): ChessSession {
    const s = this.sessions.get(id);
    if (!s) {
      throw new NotFoundException('Session not found');
    }
    return s;
  }

  resetSession(id: string): ChessSession {
    const session = this.getSession(id);
    const chess = new Chess(session.initialFen);
    session.currentFen = chess.fen();
    session.moveHistory = [];
    return session;
  }

  switchSide(id: string): ChessSession {
    const session = this.resetSession(id);
    session.userColor = session.userColor === 'white' ? 'black' : 'white';
    return session;
  }

  async userMove(
    id: string,
    moveUci: string,
  ): Promise<{
    session: ChessSession;
    engineMove?: string;
    analysis?: EngineAnalysis;
    explanation?: string;
  }> {
    const session = this.getSession(id);
    const chess = new Chess(session.currentFen);

    const from = moveUci.slice(0, 2);
    const to = moveUci.slice(2, 4);
    const promotion = moveUci.length === 5 ? moveUci[4] : undefined;

    let result;
    try {
      result = chess.move({ from, to, promotion });
    } catch (e: any) {
      // chess.js can throw "Invalid move" errors – convert to a clean 400.
      throw new BadRequestException(e?.message ?? `Illegal move: ${moveUci}`);
    }
    if (!result) {
      throw new BadRequestException(`Illegal move: ${moveUci}`);
    }
    session.moveHistory.push(moveUci);
    session.currentFen = chess.fen();

    // If it's now engine's turn, get engine move and explanation
    const turnColor: Color = chess.turn() === 'w' ? 'white' : 'black';
    let engineMove: string | undefined;
    let analysis: EngineAnalysis | undefined;
    let explanation: string | undefined;

    if (turnColor !== session.userColor && !chess.isGameOver()) {
      analysis = await this.engineService.analyzePosition(session.currentFen, {
        depth: 14,
      });
      if (analysis.bestMove) {
        const eFrom = analysis.bestMove.slice(0, 2);
        const eTo = analysis.bestMove.slice(2, 4);
        const ePromotion = analysis.bestMove.length === 5 ? analysis.bestMove[4] : undefined;
        const em = chess.move({ from: eFrom, to: eTo, promotion: ePromotion });
        if (em) {
          engineMove = analysis.bestMove;
          session.moveHistory.push(engineMove);
          session.currentFen = chess.fen();
          if (analysis) {
            explanation = await this.aiExplanationService.explainMove(
              session.initialFen,
              session.currentFen,
              analysis,
            );
          }
        }
      }
    }

    return { session, engineMove, analysis, explanation };
  }

  async getRecentGamesForUser(userId: string, limit: number): Promise<TrainingGame[]> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const safeLimit = Math.max(1, Math.min(50, Number.isFinite(limit) ? limit : 15));

    const tasks: Array<Promise<TrainingGame[]>> = [];

    if (user.lichessUsername) {
      tasks.push(this.fetchLichessGames(user.lichessUsername, safeLimit));
    }
    if (user.chessComUsername) {
      tasks.push(this.fetchChessComGames(user.chessComUsername, safeLimit));
    }

    if (tasks.length === 0) {
      return [];
    }

    const results = await Promise.all(
      tasks.map((p) =>
        p.catch(() => {
          // Swallow per-source errors so one service going down
          // doesn't break the whole feature.
          return [] as TrainingGame[];
        }),
      ),
    );

    const merged = results.flat();
    merged.sort(
      (a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime(),
    );

    return merged.slice(0, safeLimit);
  }

  private async fetchLichessGames(
    username: string,
    limit: number,
  ): Promise<TrainingGame[]> {
    const url = `https://lichess.org/api/games/user/${encodeURIComponent(
      username,
    )}?max=${limit}&moves=true&pgnInJson=true&clocks=false&evals=false&opening=true`;

    const res = await axios.get(url, {
      responseType: 'text',
      validateStatus: () => true,
    });

    if (res.status !== 200 || !res.data) {
      return [];
    }

    const text = String(res.data);
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const games: TrainingGame[] = [];

    for (const line of lines) {
      try {
        const obj = JSON.parse(line) as any;
        const id: string = obj.id ?? '';
        if (!id) continue;

        const pgn: string | undefined = obj.pgn;
        if (!pgn) continue;

        const players = obj.players ?? {};
        const whiteUser = players.white?.user ?? players.white;
        const blackUser = players.black?.user ?? players.black;

        const white =
          (typeof whiteUser?.name === 'string' && whiteUser.name) ||
          (typeof whiteUser?.username === 'string' && whiteUser.username) ||
          username;
        const black =
          (typeof blackUser?.name === 'string' && blackUser.name) ||
          (typeof blackUser?.username === 'string' && blackUser.username) ||
          'Opponent';

        const status: string | undefined = obj.status;
        const winner: string | undefined = obj.winner;
        let result = 'ongoing';
        if (status === 'draw') {
          result = '½-½';
        } else if (winner === 'white') {
          result = '1-0';
        } else if (winner === 'black') {
          result = '0-1';
        }

        const timeMs: number | undefined =
          typeof obj.lastMoveAt === 'number'
            ? obj.lastMoveAt
            : typeof obj.createdAt === 'number'
              ? obj.createdAt
              : undefined;
        const endTime = timeMs
          ? new Date(timeMs).toISOString()
          : new Date().toISOString();

        const fens = this.buildFenSequenceFromPgn(pgn);
        if (!fens.length) continue;

        const urlGame =
          typeof obj.id === 'string'
            ? `https://lichess.org/${obj.id}`
            : `https://lichess.org/@/${encodeURIComponent(username)}`;

        games.push({
          id: `lichess-${id}`,
          source: 'lichess',
          url: urlGame,
          white,
          black,
          result,
          endTime,
          fens,
        });
      } catch {
        // Ignore malformed lines
      }
    }

    return games;
  }

  private async fetchChessComGames(
    username: string,
    limit: number,
  ): Promise<TrainingGame[]> {
    const archivesUrl = `https://api.chess.com/pub/player/${encodeURIComponent(
      username,
    )}/games/archives`;

    const archivesRes = await axios.get(archivesUrl, {
      validateStatus: () => true,
    });
    if (archivesRes.status !== 200 || !archivesRes.data?.archives) {
      return [];
    }

    const archives: string[] = archivesRes.data.archives as string[];
    if (!archives.length) {
      return [];
    }

    const latestArchiveUrl = archives[archives.length - 1];
    const gamesRes = await axios.get(latestArchiveUrl, {
      validateStatus: () => true,
    });
    if (gamesRes.status !== 200 || !gamesRes.data?.games) {
      return [];
    }

    const rawGames: any[] = gamesRes.data.games as any[];
    if (!rawGames.length) {
      return [];
    }

    const games: TrainingGame[] = [];

    for (const g of rawGames) {
      try {
        const pgn: string | undefined = g.pgn;
        if (!pgn) continue;

        const urlGame: string =
          typeof g.url === 'string'
            ? g.url
            : `https://www.chess.com/member/${encodeURIComponent(username)}`;

        const white = g.white?.username ?? 'White';
        const black = g.black?.username ?? 'Black';
        const whiteResult: string | undefined = g.white?.result;
        const blackResult: string | undefined = g.black?.result;

        let result = 'ongoing';
        if (whiteResult === 'win' || blackResult === 'resigned' || blackResult === 'timeout') {
          result = '1-0';
        } else if (
          blackResult === 'win' ||
          whiteResult === 'resigned' ||
          whiteResult === 'timeout'
        ) {
          result = '0-1';
        } else if (whiteResult === 'agreed' || whiteResult === 'stalemate' || whiteResult === 'repetition') {
          result = '½-½';
        }

        const endSeconds: number | undefined =
          typeof g.end_time === 'number' ? g.end_time : undefined;
        const endTime = endSeconds
          ? new Date(endSeconds * 1000).toISOString()
          : new Date().toISOString();

        const fens = this.buildFenSequenceFromPgn(pgn);
        if (!fens.length) continue;

        const id: string =
          typeof g.uuid === 'string'
            ? g.uuid
            : urlGame;

        games.push({
          id: `chesscom-${id}`,
          source: 'chess.com',
          url: urlGame,
          white,
          black,
          result,
          endTime,
          fens,
        });
      } catch {
        // Ignore malformed games
      }
    }

    games.sort(
      (a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime(),
    );

    return games.slice(0, limit);
  }

  private buildFenSequenceFromUciMoves(
    movesStr: string,
    initialFen?: string,
  ): string[] {
    const chess = new Chess(initialFen);
    const fens: string[] = [chess.fen()];

    const tokens = movesStr
      .split(' ')
      .map((t) => t.trim())
      .filter(Boolean);

    for (const token of tokens) {
      const from = token.slice(0, 2);
      const to = token.slice(2, 4);
      const promotion = token.length === 5 ? token[4] : undefined;
      try {
        const move = chess.move({ from, to, promotion });
        if (!move) {
          break;
        }
        fens.push(chess.fen());
      } catch {
        break;
      }
    }

    return fens;
  }

  private buildFenSequenceFromPgn(pgn: string): string[] {
    try {
      const chess = new Chess();
      // chess.js v1 `loadPgn` returns void and will throw on invalid PGN,
      // so we don't need to check a return value.
      chess.loadPgn(pgn);

      const history = chess.history({ verbose: true });

      // Respect a FEN header if present (used for non-standard starting
      // positions), otherwise start from the normal initial position.
      let initialFen: string | undefined;
      try {
        const headers = (chess as any).getHeaders?.() as
          | Record<string, string>
          | undefined;
        if (headers && typeof headers.FEN === 'string' && headers.FEN) {
          initialFen = headers.FEN;
        }
      } catch {
        // If getHeaders isn't available for any reason, just fall back
        // to the default initial position.
      }

      const replay = initialFen ? new Chess(initialFen) : new Chess();
      const fens: string[] = [replay.fen()];
      for (const move of history) {
        replay.move(move);
        fens.push(replay.fen());
      }
      return fens;
    } catch {
      return [];
    }
  }
}


