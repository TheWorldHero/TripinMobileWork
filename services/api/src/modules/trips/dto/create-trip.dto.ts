import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TripKind, Visibility } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTripDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string;

  @ApiPropertyOptional({ enum: TripKind, default: TripKind.MIXED })
  @IsOptional()
  @IsEnum(TripKind)
  kind?: TripKind = TripKind.MIXED;

  @ApiPropertyOptional({ enum: Visibility, default: Visibility.PRIVATE })
  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility = Visibility.PRIVATE;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cityName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  provinceName?: string;

  @ApiPropertyOptional({ default: 'CN' })
  @IsOptional()
  @IsString()
  countryCode?: string = 'CN';

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverMediaId?: string;
}

