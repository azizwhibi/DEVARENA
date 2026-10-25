import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';
export const RESOURCE_TYPES = [
  'article',
  'tutorial',
  'video',
  'documentation',
  'course',
] as const;
export const DIFFICULTIES = [
  'unknown',
  'beginner',
  'intermediate',
  'advanced',
] as const;
export class KnowledgeQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) pageSize = 12;
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional() @IsIn(RESOURCE_TYPES) type?: string;
  @IsOptional() @IsIn(DIFFICULTIES) difficulty?: string;
  @IsOptional() @IsUUID() technology?: string;
  @IsOptional() @IsUUID() skill?: string;
  @IsOptional() @IsIn(['newest', 'title', 'oldest']) sort = 'newest';
}
export class AdminKnowledgeQuery extends KnowledgeQuery {
  @IsOptional() @IsIn(['draft', 'published', 'archived']) status?: string;
}
export class ResourceDto {
  @IsString() @MinLength(2) @MaxLength(200) title: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsIn(RESOURCE_TYPES) resource_type?: string;
  @IsOptional() @IsString() @MaxLength(100000) content?: string;
  @IsOptional()
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
    disallow_auth: true,
  })
  @MaxLength(2000)
  external_url?: string | null;
  @IsOptional() @IsIn(DIFFICULTIES) difficulty?: string;
  @IsOptional() @IsUUID() technology_id?: string | null;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  estimated_minutes?: number | null;
  @IsOptional() @IsString() @MaxLength(80) source?: string;
  @IsOptional() @IsString() @MaxLength(200) external_source_id?: string | null;
  @IsOptional() @IsString() @MaxLength(1000) attribution?: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  skill_ids?: string[];
}
export class UpdateResourceDto extends PartialType(ResourceDto) {}
export class ProgressDto {
  @Type(() => Number) @IsInt() @Min(0) @Max(100) percentage: number;
}
export class FeedbackDto {
  @IsUUID() resource_id: string;
  @IsOptional() @IsUUID() recommendation_id?: string;
  @IsIn(['useful', 'not_relevant', 'too_easy', 'too_difficult'])
  feedback: string;
}
export class EventDto {
  @IsUUID() resource_id: string;
  @IsOptional() @IsUUID() recommendation_id?: string;
  @IsIn(['click']) event_type: string;
}
export class ImportDto {
  @IsString() @MinLength(1) @MaxLength(80000) csv: string;
  @IsString() @MinLength(1) @MaxLength(1000) attribution: string;
}
export class ExplainLessonDto {
  @IsIn(['explain']) action: 'explain';
}
