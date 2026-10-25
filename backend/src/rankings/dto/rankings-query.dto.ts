import { Type } from 'class-transformer';
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
  @IsOptional()
  @IsIn(['global', 'country', 'institution', 'technology'])
  scope?: 'global' | 'country' | 'institution' | 'technology' = 'global';

  @IsOptional()
  @IsString()
  @MaxLength(120)
  value?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
