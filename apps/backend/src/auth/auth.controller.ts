import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './google-auth.guard';
import { GoogleProfile } from './google.strategy';
import { IsEmail, IsString, MinLength } from 'class-validator';

class AuthDto {
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
}

class ResendVerificationDto {
  @IsEmail() email: string;
}

class ForgotPasswordDto {
  @IsEmail() email: string;
}

class ResetPasswordDto {
  @IsString() token: string;
  @IsString() @MinLength(8) newPassword: string;
}

class RefreshDto {
  @IsString() refresh_token: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully', schema: { example: { data: { access_token: 'jwt_token' }, statusCode: 201, timestamp: '2024-01-01T00:00:00.000Z' } } })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  register(@Body() dto: AuthDto) {
    return this.authService.register(dto.email, dto.password);
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful', schema: { example: { data: { access_token: 'jwt_token' }, statusCode: 200, timestamp: '2024-01-01T00:00:00.000Z' } } })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() dto: AuthDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refresh_token);
  }

  @Post('logout')
  logout(@Body() dto: RefreshDto) {
    return this.authService.logout(dto.refresh_token);
  }

  @Get('verify')
  verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('resend-verification')
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto.email);
  }

  @Throttle({ default: { limit: 3, ttl: 3600000 } })
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }
}
