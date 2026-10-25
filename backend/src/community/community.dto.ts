import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  Matches,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreatePostDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(200)
  title!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(50000)
  content!: string;

  @IsUUID()
  @IsNotEmpty()
  categoryId!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  @ArrayMaxSize(10)
  topics?: string[];

  @IsOptional()
  @IsUUID()
  linkedChallengeId?: string;

  @IsOptional()
  @IsUUID()
  linkedResourceId?: string;
}

export class UpdatePostDto {
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title?: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(50000)
  content?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  @ArrayMaxSize(10)
  topics?: string[];

  @IsOptional()
  @IsUUID()
  linkedChallengeId?: string;

  @IsOptional()
  @IsUUID()
  linkedResourceId?: string;
}

export class CreateCommentDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(10000)
  content!: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}

export class UpdateCommentDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(10000)
  content!: string;
}

export class VotePostDto {
  @IsInt()
  @IsIn([-1, 0, 1])
  vote!: number;
}

export class ReportDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(1000)
  reason!: string;

  @IsOptional()
  @IsUUID()
  postId?: string;

  @IsOptional()
  @IsUUID()
  commentId?: string;
}

export class CommunityQueryDto {
  @IsOptional()
  @IsUUID()
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  topic?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsIn(['newest', 'votes', 'comments', 'popular'])
  sort?: 'newest' | 'votes' | 'comments' | 'popular' = 'newest';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 15;

  @IsOptional()
  @IsUUID()
  authorId?: string;
}

export class CreateCategoryDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(60)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(60)
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  slug!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsInt()
  displayOrder?: number;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsInt()
  displayOrder?: number;
}

export class ModeratePostDto {
  @IsOptional()
  @IsIn(['published', 'hidden', 'archived'])
  status?: 'published' | 'hidden' | 'archived';

  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

export class ReviewReportDto {
  @IsIn(['reviewed', 'dismissed'])
  status!: 'reviewed' | 'dismissed';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reviewNotes?: string;
}

export class ModerateCommentDto {
  @IsIn(['published', 'hidden']) status!: 'published' | 'hidden';
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(500) reason!: string;
}
