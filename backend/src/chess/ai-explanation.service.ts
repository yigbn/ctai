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
    const scoreText =
      analysis.evaluation !== null
        ? `evaluation about ${analysis.evaluation} centipawns for the side to move`
        : 'no concrete evaluation available';
    const bestMoveText = analysis.bestMove || 'no clear best move';

    return (
      `Engine recommends ${bestMoveText} with ${scoreText}. ` +
      'Explain this like a human coach: focus on tactical ideas, piece activity, and long-term plans.'
    );
  }
}


