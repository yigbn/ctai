import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ChessService, Color } from './chess.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

class CreateSessionDto {
  initialFen?: string;
  userColor?: Color;
}

class MoveDto {
  moveUci!: string; // e.g. e2e4, e7e8q
}

@Controller('chess')
@UseGuards(JwtAuthGuard)
export class ChessController {
  constructor(private readonly chessService: ChessService) {}

  @Post('session')
  createSession(@Req() req: any, @Body() body: CreateSessionDto) {
    const userId = req.user.sub as string;
    const session = this.chessService.createSession(
      userId,
      body.initialFen,
      body.userColor ?? 'white',
    );
    return session;
  }

  @Get('session/:id')
  getSession(@Param('id') id: string) {
    return this.chessService.getSession(id);
  }

  @Post('session/:id/reset')
  resetSession(@Param('id') id: string) {
    return this.chessService.resetSession(id);
  }

  @Post('session/:id/switch-side')
  switchSide(@Param('id') id: string) {
    return this.chessService.switchSide(id);
  }

  @Post('session/:id/move')
  async move(@Param('id') id: string, @Body() body: MoveDto) {
    const result = await this.chessService.userMove(id, body.moveUci);
    return result;
  }

  @Get('my-games')
  async getMyGames(@Req() req: any, @Query('limit') limit?: string) {
    const userId = req.user.sub as string;
    const parsedLimit = limit ? Number.parseInt(limit, 10) : 15;
    return this.chessService.getRecentGamesForUser(userId, parsedLimit);
  }
}


