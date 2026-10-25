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

export type RankingScope = 'global' | 'school' | 'country';

export function escapeSearchTerm(input: string): string {
  return input.replace(/[%_,()]/g, '');
}

export class GetRankingsQueryDto {
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
  limit?: number = 20;

  @IsOptional()
  @IsString()
  @IsIn(['global', 'school', 'country'])
  scope?: RankingScope = 'global';

  @IsOptional()
  @IsString()
  @MaxLength(120)
  value?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  search?: string;
}
