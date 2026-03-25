import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from './course.entity';
import { CourseModule } from './course-module.entity';
import { Lesson } from './lesson.entity';
import { CoursesService } from './courses.service';
import { ModulesService } from './modules.service';
import { LessonsService } from './lessons.service';
import { CoursesController } from './courses.controller';
import { ModulesController } from './modules.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Course, CourseModule, Lesson])],
  providers: [CoursesService, ModulesService, LessonsService],
  controllers: [CoursesController, ModulesController],
  exports: [CoursesService],
})
export class CoursesModule {}
