import { Injectable } from '@nestjs/common';
import { EngineAnalysis } from './engine.service';

@Injectable()
export class AiExplanationService {
  /**
   * Stub for calling an external LLM API to explain the engine's suggestion.
   * Replace the body with a real call (e.g., OpenAI, OpenRouter, etc.).
   */
  async explainMove(
    initialFen: string,
    currentFen: string,
    analysis: EngineAnalysis,
  ): Promise<string> {
    // TODO: Implement real call to your preferred AI provider using AI_API_KEY.
    const cp = analysis.evaluation;
    const scoreText =
      cp !== null
        ? `Stockfish-style evaluation ≈ ${cp} centipawns (positive for the side to move).`
        : 'no numeric evaluation was returned.';
    const bestMoveText = analysis.bestMove || 'no clear best move';

    return [
      `Suggested move: ${bestMoveText}.`,
      scoreText,
      'This comes from a strong cloud engine (similar to Stockfish).',
      'As you review it, think about: which pieces become more active, what threats are created or neutralized, and whether there were candidate moves you preferred instead.',
    ].join(' ');
  }
}


