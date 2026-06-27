import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CoursesService } from '../courses.service';
import { CoursesRepository } from '../../repositories/courses-repository.interface';
import { COURSES_REPOSITORY_TOKEN } from '../../repositories/repositories.module';
import { Course } from '../course.entity';
import { CourseQueryDto } from '../dto/course-query.dto';

describe('CoursesService', () => {
  let service: CoursesService;
  let mockRepository: jest.Mocked<CoursesRepository>;
  let mockCacheManager: jest.Mocked<any>;

  beforeEach(async () => {
    mockRepository = {
      findById: jest.fn(),
      findByIdWithDeleted: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    mockCacheManager = {
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        {
          provide: COURSES_REPOSITORY_TOKEN,
          useValue: mockRepository,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated courses', async () => {
      const query: CourseQueryDto = { page: 1, limit: 20 };
      const result = {
        data: [{ id: '1', title: 'Test Course' }] as Course[],
        total: 1,
        page: 1,
        limit: 20,
      };
      mockRepository.findAll.mockResolvedValue(result);

      const courses = await service.findAll(query);
      expect(courses).toBe(result);
      expect(mockRepository.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findOne', () => {
    it('should return a course when found', async () => {
      const course = { id: '1', title: 'Test Course' } as Course;
      mockRepository.findById.mockResolvedValue(course);

      const result = await service.findOne('1');
      expect(result).toBe(course);
      expect(mockRepository.findById).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException when course not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a course and invalidate cache', async () => {
      const courseData = { title: 'New Course', description: 'Test description' };
      const createdCourse = { id: '1', ...courseData } as Course;

      mockRepository.save.mockResolvedValue(createdCourse);
      mockCacheManager.del.mockResolvedValue(undefined);

      const result = await service.create(courseData);
      expect(result).toBe(createdCourse);
      expect(mockRepository.save).toHaveBeenCalledWith(courseData);
      expect(mockCacheManager.del).toHaveBeenCalledWith('courses:all');
    });
  });

  describe('update', () => {
    it('should update a course and invalidate cache', async () => {
      const course = { id: '1', title: 'Old Title' } as Course;
      const updateData = { title: 'New Title' };
      const updatedCourse = { ...course, ...updateData } as Course;

      mockRepository.findById.mockResolvedValue(course);
      mockRepository.save.mockResolvedValue(updatedCourse);
      mockCacheManager.del.mockResolvedValue(undefined);

      const result = await service.update('1', updateData);
      expect(result).toBe(updatedCourse);
      expect(mockRepository.save).toHaveBeenCalledWith({ ...course, ...updateData });
      expect(mockCacheManager.del).toHaveBeenCalledWith('courses:all');
    });
  });

  describe('delete', () => {
    it('should delete a course and invalidate cache', async () => {
      const course = { id: '1', title: 'Test Course' } as Course;

      mockRepository.findById.mockResolvedValue(course);
      mockRepository.remove.mockResolvedValue(course);
      mockCacheManager.del.mockResolvedValue(undefined);

      const result = await service.delete('1');
      expect(result).toBe(course);
      expect(mockRepository.remove).toHaveBeenCalledWith(course);
      expect(mockCacheManager.del).toHaveBeenCalledWith('courses:all');
    });
  });
});