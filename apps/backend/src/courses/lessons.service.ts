import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson } from './lesson.entity';

@Injectable()
export class LessonsService {
  constructor(@InjectRepository(Lesson) private repo: Repository<Lesson>) {}

  findByModule(moduleId: string) {
    return this.repo.find({ where: { moduleId }, order: { order: 'ASC' } });
  }

  findOne(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  create(moduleId: string, data: Partial<Lesson>) {
    return this.repo.save(this.repo.create({ ...data, moduleId }));
  }

  async update(id: string, data: Partial<Lesson>) {
    const lesson = await this.findOne(id);
    if (!lesson) throw new NotFoundException('Lesson not found');
    return this.repo.save({ ...lesson, ...data });
  }

  async remove(id: string) {
    const lesson = await this.findOne(id);
    if (!lesson) throw new NotFoundException('Lesson not found');
    return this.repo.remove(lesson);
  }
}
