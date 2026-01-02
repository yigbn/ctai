import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Chess } from 'chess.js';
import { EngineService, EngineAnalysis } from './engine.service';
import { AiExplanationService } from './ai-explanation.service';

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

@Injectable()
export class ChessService {
  private readonly sessions = new Map<string, ChessSession>();

  constructor(
    private readonly engineService: EngineService,
    private readonly aiExplanationService: AiExplanationService,
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
}


