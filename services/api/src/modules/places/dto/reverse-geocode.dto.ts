import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class ReverseGeocodeDto {
  @ApiPropertyOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  latitude: number;

  @ApiPropertyOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({ default: 500, minimum: 0, maximum: 3000 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  @Max(3000)
  radius?: number = 500;
}
