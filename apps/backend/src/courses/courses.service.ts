import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Course } from './course.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CourseQueryDto } from './dto/course-query.dto';
import { CoursesRepository } from '../repositories/courses-repository.interface';
import { COURSES_REPOSITORY_TOKEN } from '../repositories/repositories.module';

@Injectable()
export class CoursesService {
  private readonly CACHE_KEY = 'courses:all';
  private readonly CACHE_TTL = 60;

  constructor(
    @Inject(COURSES_REPOSITORY_TOKEN) private repo: CoursesRepository,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async findAll(query: CourseQueryDto = {}) {
    return this.repo.findAll(query);
  }

  async findOne(id: string): Promise<Course> {
    const course = await this.repo.findById(id);
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  async create(data: Partial<Course>) {
    const course = await this.repo.save(data);
    await this.invalidateCache();
    return course;
  }

  async update(id: string, data: Partial<Course>) {
    const course = await this.findOne(id);
    const updated = await this.repo.save({ ...course, ...data });
    await this.invalidateCache();
    return updated;
  }

  async delete(id: string) {
    const course = await this.findOne(id);
    const removed = await this.repo.remove(course);
    await this.invalidateCache();
    return removed;
  }

  private async invalidateCache() {
    await this.cacheManager.del(this.CACHE_KEY);
  }
}
