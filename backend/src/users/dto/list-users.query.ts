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

export function escapeSearchTerm(q: string): string {
  // PostgREST delimiters are () and ,; SQL ILIKE wildcards are % and _; backslash is escape.
  return q.replace(/[%_,()\\]/g, (c) => `\\${c}`);
}

export class ListUsersQueryDto {
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
  @IsIn(['admin', 'developer', 'recruiter'])
  role?: 'admin' | 'developer' | 'recruiter';

  @IsOptional()
  @IsIn(['active', 'suspended'])
  status?: 'active' | 'suspended';

  @IsOptional()
  @IsString()
  @MaxLength(64)
  q?: string;
}
