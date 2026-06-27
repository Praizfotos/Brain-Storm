import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from '../users.service';
import { UsersRepository } from '../../repositories/users-repository.interface';
import { USERS_REPOSITORY_TOKEN } from '../../repositories/repositories.module';
import { User } from '../user.entity';

describe('UsersService', () => {
  let service: UsersService;
  let mockRepository: jest.Mocked<UsersRepository>;

  beforeEach(async () => {
    mockRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByVerificationToken: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: USERS_REPOSITORY_TOKEN,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return a user when found', async () => {
      const user = { id: '1', email: 'test@example.com' } as User;
      mockRepository.findById.mockResolvedValue(user);

      const result = await service.findById('1');
      expect(result).toBe(user);
      expect(mockRepository.findById).toHaveBeenCalledWith('1');
    });

    it('should return null when user not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await service.findById('1');
      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return a user when found by email', async () => {
      const user = { id: '1', email: 'test@example.com' } as User;
      mockRepository.findByEmail.mockResolvedValue(user);

      const result = await service.findByEmail('test@example.com');
      expect(result).toBe(user);
      expect(mockRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('create', () => {
    it('should create and return a user', async () => {
      const userData = { email: 'test@example.com', password: 'password' };
      const createdUser = { id: '1', ...userData } as User;
      mockRepository.save.mockResolvedValue(createdUser);

      const result = await service.create(userData);
      expect(result).toBe(createdUser);
      expect(mockRepository.save).toHaveBeenCalledWith(userData);
    });
  });

  describe('update', () => {
    it('should update and return a user', async () => {
      const user = { id: '1', email: 'test@example.com' } as User;
      const updateData = { email: 'updated@example.com' };
      const updatedUser = { ...user, ...updateData } as User;

      mockRepository.findById.mockResolvedValue(user);
      mockRepository.save.mockResolvedValue(updatedUser);

      const result = await service.update('1', updateData);
      expect(result).toBe(updatedUser);
      expect(mockRepository.save).toHaveBeenCalledWith({ ...user, ...updateData });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.update('1', { email: 'updated@example.com' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const paginatedResult = {
        data: [{ id: '1', email: 'test@example.com' }] as User[],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };
      mockRepository.findAll.mockResolvedValue(paginatedResult);

      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result).toBe(paginatedResult);
      expect(mockRepository.findAll).toHaveBeenCalledWith({ page: 1, limit: 10 });
    });
  });

  describe('banUser', () => {
    it('should ban a user', async () => {
      const user = { id: '1', email: 'test@example.com', isBanned: false } as User;
      const bannedUser = { ...user, isBanned: true } as User;

      mockRepository.findById.mockResolvedValue(user);
      mockRepository.save.mockResolvedValue(bannedUser);

      const result = await service.banUser('1', true);
      expect(result).toBe(bannedUser);
      expect(mockRepository.save).toHaveBeenCalledWith({ ...user, isBanned: true });
    });
  });
});