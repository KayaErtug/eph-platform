import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // Giriş yapmış herkes erişebilir
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentUser() user: any) {
    return user;
  }

  // Sadece ADMIN erişebilir
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin-only')
  adminOnly() {
    return { message: 'Sadece admin görebilir.' };
  }

  // Sadece EMLAKCI ve ADMIN erişebilir
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMLAKCI, Role.ADMIN)
  @Get('emlakci-only')
  emlakciOnly(@CurrentUser() user: any) {
    return { message: `Hoş geldin emlakçı: ${user.email}` };
  }
}