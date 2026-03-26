import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Course } from './course.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@Injectable()
export class CoursesService {
  private readonly CACHE_KEY = 'courses:all';
  private readonly CACHE_TTL = 60;

  constructor(
    @InjectRepository(Course) private repo: Repository<Course>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async findAll() {
    const cached = await this.cacheManager.get<Course[]>(this.CACHE_KEY);
    if (cached) {
      return cached;
    }
    const courses = await this.repo.find({ where: { isPublished: true } });
    await this.cacheManager.set(this.CACHE_KEY, courses, this.CACHE_TTL);
    return courses;
  }

  async findOne(id: string): Promise<Course> {
    const course = await this.repo.findOne({ where: { id, isDeleted: false } });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  async create(data: Partial<Course>) {
    const course = await this.repo.save(this.repo.create(data));
    await this.invalidateCache();
    return course;
  }

  async update(id: string, data: Partial<Course>) {
    const course = await this.findOne(id);
    if (!course) throw new NotFoundException('Course not found');
    const updated = await this.repo.save({ ...course, ...data });
    await this.invalidateCache();
    return updated;
  }

  async delete(id: string) {
    const course = await this.findOne(id);
    if (!course) throw new NotFoundException('Course not found');
    const removed = await this.repo.remove(course);
    await this.invalidateCache();
    return removed;
  }

  private async invalidateCache() {
    await this.cacheManager.del(this.CACHE_KEY);
  }

  async update(id: string, data: Partial<Course>) {
    const course = await this.findOne(id);
    if (!course) throw new NotFoundException('Course not found');
    return this.repo.save({ ...course, ...data });
  }

  async delete(id: string) {
    const course = await this.findOne(id);
    if (!course) throw new NotFoundException('Course not found');
    return this.repo.remove(course);
  }
}
