import { IsString, IsInt, IsOptional, Min } from 'class-validator';

export class CreateModuleDto {
  @IsString() title: string;
  @IsOptional() @IsInt() @Min(0) order?: number;
}
