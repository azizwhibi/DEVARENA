import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ListCandidatesQueryDto {
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

  @IsOptional()
  @IsString()
  @MaxLength(64)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  technology?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}$/, {
    message: 'country must be a 2-letter uppercase ISO code',
  })
  country?: string;
}
