import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { GoogleProfile } from './google.strategy';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(email: string, password: string) {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.usersService.create({ email, passwordHash });
    return this.signToken(user.id, user.email);
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.signToken(user.id, user.email, user.role);
  }

  async loginWithGoogle(profile: GoogleProfile) {
    let user = await this.usersService.findByEmail(profile.email);

    if (!user) {
      // First OAuth login — create account with random password hash, pre-verified
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const passwordHash = await bcrypt.hash(randomPassword, 10);

      user = await this.usersService.create({
        email: profile.email,
        passwordHash,
        googleId: profile.id,
        avatar: profile.picture,
        isVerified: true, // OAuth emails are pre-verified by Google
      });
    } else if (!user.googleId) {
      // Existing email account — link Google ID
      user = await this.usersService.update(user.id, {
        googleId: profile.id,
        avatar: user.avatar || profile.picture,
        isVerified: true,
      });
    }

    return this.signToken(user.id, user.email);
  }

  private signToken(userId: string, email: string, role = 'student') {
    return {
      access_token: this.jwtService.sign({ sub: userId, email, role }),
    };
  }
}
