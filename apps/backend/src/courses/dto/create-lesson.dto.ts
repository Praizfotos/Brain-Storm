import { IsString, IsInt, IsOptional, IsUrl, Min } from 'class-validator';

export class CreateLessonDto {
  @IsString() title: string;
  @IsString() content: string;
  @IsOptional() @IsUrl() videoUrl?: string;
  @IsOptional() @IsInt() @Min(0) order?: number;
  @IsOptional() @IsInt() @Min(0) durationMinutes?: number;
}
