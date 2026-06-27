import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UsersService } from './users.service';
import { UsersController, AdminUsersController } from './users.controller';
import { StellarModule } from '../stellar/stellar.module';
import { RepositoriesModule } from '../repositories/repositories.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), StellarModule, RepositoriesModule],
  controllers: [UsersController, AdminUsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
