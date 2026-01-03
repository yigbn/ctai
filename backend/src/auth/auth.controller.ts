import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

class AuthDto {
  email!: string;
  password!: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  async register(@Body() body: AuthDto) {
    const { email, password } = body;
    const { user, token } = await this.authService.register(email, password);
    return {
      user: this.usersService.sanitizeUser(user),
      token,
    };
  }

  @Post('login')
  async login(@Body() body: AuthDto) {
    const { email, password } = body;
    const { user, token } = await this.authService.login(email, password);
    return {
      user: this.usersService.sanitizeUser(user),
      token,
    };
  }
}


