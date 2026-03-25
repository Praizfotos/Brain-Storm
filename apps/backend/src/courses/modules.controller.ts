import {
  Body, Controller, Delete, Get, Param,
  Patch, Post, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ModulesService } from './modules.service';
import { LessonsService } from './lessons.service';
import { CreateModuleDto } from './dto/create-module.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';

@ApiTags('modules')
@Controller()
export class ModulesController {
  constructor(
    private modulesService: ModulesService,
    private lessonsService: LessonsService,
  ) {}

  // ── Modules ──────────────────────────────────────────────────────────────

  @Get('courses/:courseId/modules')
  getModules(@Param('courseId') courseId: string) {
    return this.modulesService.findByCourse(courseId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @Post('courses/:courseId/modules')
  createModule(
    @Param('courseId') courseId: string,
    @Body() dto: CreateModuleDto,
  ) {
    return this.modulesService.create(courseId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @Patch('modules/:id')
  updateModule(@Param('id') id: string, @Body() dto: Partial<CreateModuleDto>) {
    return this.modulesService.update(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @Delete('modules/:id')
  deleteModule(@Param('id') id: string) {
    return this.modulesService.remove(id);
  }

  // ── Lessons ───────────────────────────────────────────────────────────────

  @Get('modules/:moduleId/lessons')
  getLessons(@Param('moduleId') moduleId: string) {
    return this.lessonsService.findByModule(moduleId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @Post('modules/:moduleId/lessons')
  createLesson(
    @Param('moduleId') moduleId: string,
    @Body() dto: CreateLessonDto,
  ) {
    return this.lessonsService.create(moduleId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @Patch('lessons/:id')
  updateLesson(@Param('id') id: string, @Body() dto: Partial<CreateLessonDto>) {
    return this.lessonsService.update(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('instructor', 'admin')
  @Delete('lessons/:id')
  deleteLesson(@Param('id') id: string) {
    return this.lessonsService.remove(id);
  }
}
