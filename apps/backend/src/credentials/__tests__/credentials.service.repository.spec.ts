import { Test, TestingModule } from '@nestjs/testing';
import { CredentialsService } from '../credentials.service';
import { CredentialsRepository } from '../../repositories/credentials-repository.interface';
import { CREDENTIALS_REPOSITORY_TOKEN } from '../../repositories/repositories.module';
import { StellarService } from '../../stellar/stellar.service';
import { Credential } from '../credential.entity';

describe('CredentialsService', () => {
  let service: CredentialsService;
  let mockRepository: jest.Mocked<CredentialsRepository>;
  let mockStellarService: jest.Mocked<StellarService>;

  beforeEach(async () => {
    mockRepository = {
      findById: jest.fn(),
      findByUser: jest.fn(),
      findByUserAndCourse: jest.fn(),
      findByTxHash: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    mockStellarService = {
      issueCredential: jest.fn(),
      verifyCredential: jest.fn(),
      mintReward: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialsService,
        {
          provide: CREDENTIALS_REPOSITORY_TOKEN,
          useValue: mockRepository,
        },
        {
          provide: StellarService,
          useValue: mockStellarService,
        },
      ],
    }).compile();

    service = module.get<CredentialsService>(CredentialsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('issue', () => {
    it('should return existing credential if already exists', async () => {
      const existingCredential = {
        id: '1',
        userId: 'user1',
        courseId: 'course1',
        txHash: 'existing-tx',
      } as Credential;

      mockRepository.findByUserAndCourse.mockResolvedValue(existingCredential);

      const result = await service.issue('user1', 'course1', 'stellar-key');
      expect(result).toBe(existingCredential);
      expect(mockRepository.findByUserAndCourse).toHaveBeenCalledWith('user1', 'course1');
      expect(mockStellarService.issueCredential).not.toHaveBeenCalled();
    });

    it('should issue new credential if none exists', async () => {
      const newCredential = {
        id: '1',
        userId: 'user1',
        courseId: 'course1',
        txHash: 'new-tx-hash',
        stellarPublicKey: 'stellar-key',
      } as Credential;

      mockRepository.findByUserAndCourse.mockResolvedValue(null);
      mockStellarService.issueCredential.mockResolvedValue('new-tx-hash');
      mockStellarService.mintReward.mockResolvedValue(undefined);
      mockRepository.save.mockResolvedValue(newCredential);

      const result = await service.issue('user1', 'course1', 'stellar-key');

      expect(result).toBe(newCredential);
      expect(mockStellarService.issueCredential).toHaveBeenCalledWith('stellar-key', 'course1');
      expect(mockStellarService.mintReward).toHaveBeenCalledWith('stellar-key', 100);
      expect(mockRepository.save).toHaveBeenCalledWith({
        userId: 'user1',
        courseId: 'course1',
        txHash: 'new-tx-hash',
        stellarPublicKey: 'stellar-key',
      });
    });

    it('should handle mint reward failure gracefully', async () => {
      const newCredential = {
        id: '1',
        userId: 'user1',
        courseId: 'course1',
        txHash: 'new-tx-hash',
        stellarPublicKey: 'stellar-key',
      } as Credential;

      mockRepository.findByUserAndCourse.mockResolvedValue(null);
      mockStellarService.issueCredential.mockResolvedValue('new-tx-hash');
      mockStellarService.mintReward.mockRejectedValue(new Error('Mint failed'));
      mockRepository.save.mockResolvedValue(newCredential);

      const result = await service.issue('user1', 'course1', 'stellar-key');

      expect(result).toBe(newCredential);
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('findByUser', () => {
    it('should return credentials for a user', async () => {
      const credentials = [
        { id: '1', userId: 'user1', courseId: 'course1' },
        { id: '2', userId: 'user1', courseId: 'course2' },
      ] as Credential[];

      mockRepository.findByUser.mockResolvedValue(credentials);

      const result = await service.findByUser('user1');
      expect(result).toBe(credentials);
      expect(mockRepository.findByUser).toHaveBeenCalledWith('user1');
    });
  });

  describe('verify', () => {
    it('should verify a credential', async () => {
      const credential = { id: '1', txHash: 'tx-hash' } as Credential;
      const onChainData = { valid: true, timestamp: new Date() };

      mockRepository.findByTxHash.mockResolvedValue(credential);
      mockStellarService.verifyCredential.mockResolvedValue(onChainData);

      const result = await service.verify('tx-hash');

      expect(result).toEqual({ credential, ...onChainData });
      expect(mockRepository.findByTxHash).toHaveBeenCalledWith('tx-hash');
      expect(mockStellarService.verifyCredential).toHaveBeenCalledWith('tx-hash');
    });
  });
});