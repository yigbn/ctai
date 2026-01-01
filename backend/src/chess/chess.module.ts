import { Module } from '@nestjs/common';
import { ChessController } from './chess.controller';
import { ChessService } from './chess.service';
import { EngineService } from './engine.service';
import { AiExplanationService } from './ai-explanation.service';

@Module({
  controllers: [ChessController],
  providers: [ChessService, EngineService, AiExplanationService],
})
export class ChessModule {}


