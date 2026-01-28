import { Module } from '@nestjs/common';
import { ChessController } from './chess.controller';
import { ChessService } from './chess.service';
import { EngineService } from './engine.service';
import { AiExplanationService } from './ai-explanation.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [ChessController],
  providers: [ChessService, EngineService, AiExplanationService],
})
export class ChessModule {}


