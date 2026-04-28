import { ApiPropertyOptional } from '@nestjs/swagger';
import { TripKind } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class GetFeedQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cityName?: string;

  @ApiPropertyOptional({ enum: TripKind })
  @IsOptional()
  @IsEnum(TripKind)
  kind?: TripKind;
}

