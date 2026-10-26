import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class RankingsQueryDto {
  @ApiPropertyOptional({
    enum: ['global', 'country', 'institution', 'technology'],
    default: 'global',
  })
  @IsOptional()
  @IsIn(['global', 'country', 'institution', 'technology'])
  scope?: 'global' | 'country' | 'institution' | 'technology' = 'global';

  @ApiPropertyOptional({
    maxLength: 120,
    description:
      'Scope value; country/institution default to the authenticated profile.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  value?: string;

  @ApiPropertyOptional({
    maxLength: 120,
    description: 'Search username or institution within the ranked scope.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
