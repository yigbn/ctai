import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

class AuthDto {
  email!: string;
  password!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: AuthDto) {
    const { email, password } = body;
    const { user, token } = await this.authService.register(email, password);
    return {
      user: { id: user.id, email: user.email },
      token,
    };
  }

  @Post('login')
  async login(@Body() body: AuthDto) {
    const { email, password } = body;
    const { user, token } = await this.authService.login(email, password);
    return {
      user: { id: user.id, email: user.email },
      token,
    };
  }
}


