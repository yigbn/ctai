import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface JwtPayload {
  sub: string;
  email: string;
}

interface AuthedRequest extends Request {
  user: JwtPayload;
}

class LastPracticePositionDto {
  fen!: string;
  savedAt!: string;
}

class UpdateSettingsDto {
  displayName?: string;
  chessComUsername?: string;
  lichessUsername?: string;
  lastPracticePositions?: LastPracticePositionDto[];
}

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@Req() req: AuthedRequest) {
    const user = await this.usersService.findById(req.user.sub);
    if (!user) {
      throw new Error('User not found');
    }
    return this.usersService.sanitizeUser(user);
  }

  @Patch('me')
  async updateMe(@Req() req: AuthedRequest, @Body() body: UpdateSettingsDto) {
    const user = await this.usersService.updateSettings(req.user.sub, body);
    return this.usersService.sanitizeUser(user);
  }
}



