import { IsString, IsOptional, IsUrl, MaxLength, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  username?: string;

  @IsOptional()
  @IsUrl()
  avatar?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;
}
