import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { User } from './user.entity';
import { UsersRepository } from '../repositories/users-repository.interface';
import { USERS_REPOSITORY_TOKEN } from '../repositories/repositories.module';

@Injectable()
export class UsersService {
  constructor(@Inject(USERS_REPOSITORY_TOKEN) private repo: UsersRepository) {}

  findByEmail(email: string) {
    return this.repo.findOne({ where: { email } });
  }

  findByVerificationToken(hash: string) {
    return this.repo.findOne({ where: { verificationToken: hash } });
  }

  findById(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  create(data: Partial<User>) {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: Partial<User>) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return this.repo.save({ ...user, ...data });
  }

  async findAll(options: {
    page?: number;
    limit?: number;
    role?: string;
    isVerified?: boolean;
    search?: string;
  } = {}) {
    return this.repo.findAll(options);
  }

  async banUser(id: string, isBanned: boolean) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return this.repo.save({ ...user, isBanned });
  }

  async changeRole(id: string, role: string) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return this.repo.save({ ...user, role });
  }

  async softDelete(id: string) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return this.repo.save({ ...user, deletedAt: new Date() });
  }
}
