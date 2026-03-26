import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('courses')
@Controller('courses')
export class CoursesController {
  constructor(private coursesService: CoursesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all published courses' })
  @ApiResponse({ status: 200, description: 'Returns all published courses', schema: { example: { data: [], statusCode: 200, timestamp: '2024-01-01T00:00:00.000Z' } } })
  findAll() {
    return this.coursesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a course by ID' })
  @ApiResponse({ status: 200, description: 'Returns a single course', schema: { example: { data: {}, statusCode: 200, timestamp: '2024-01-01T00:00:00.000Z' } } })
  @ApiResponse({ status: 404, description: 'Course not found' })
  findOne(@Param('id') id: string) {
    return this.coursesService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Create a new course' })
  @ApiResponse({ status: 201, description: 'Course created successfully', schema: { example: { data: {}, statusCode: 201, timestamp: '2024-01-01T00:00:00.000Z' } } })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  create(@Body() data: any) {
    return this.coursesService.create(data);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Update a course' })
  @ApiResponse({ status: 200, description: 'Course updated successfully', schema: { example: { data: {}, statusCode: 200, timestamp: '2024-01-01T00:00:00.000Z' } } })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  update(@Param('id') id: string, @Body() data: any) {
    return this.coursesService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'instructor')
  @ApiOperation({ summary: 'Delete a course' })
  @ApiResponse({ status: 200, description: 'Course deleted successfully', schema: { example: { data: {}, statusCode: 200, timestamp: '2024-01-01T00:00:00.000Z' } } })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  delete(@Param('id') id: string) {
    return this.coursesService.delete(id);
  }
}
