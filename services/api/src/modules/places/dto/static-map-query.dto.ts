import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class StaticMapQueryDto {
  @ApiPropertyOptional({
    description: 'Pipe separated route coordinates formatted as lng,lat|lng,lat',
  })
  @IsOptional()
  @IsString()
  route?: string;

  @ApiPropertyOptional({
    description: 'Single focus coordinate formatted as lng,lat',
  })
  @IsOptional()
  @IsString()
  focus?: string;

  @ApiPropertyOptional({ default: 720, minimum: 160, maximum: 1024 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(160)
  @Max(1024)
  width?: number = 720;

  @ApiPropertyOptional({ default: 420, minimum: 160, maximum: 1024 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(160)
  @Max(1024)
  height?: number = 420;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
  })
  @IsBoolean()
  traffic?: boolean;
}
