import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({
    short: { ttl: 1000, limit: 1 },
    medium: { ttl: 60000, limit: 5 },
    long: { ttl: 600000, limit: 10 },
  })
  @Post('sign-in')
  signIn(@Body() dto: SignInDto) {
    return this.authService.signIn(dto);
  }
}
