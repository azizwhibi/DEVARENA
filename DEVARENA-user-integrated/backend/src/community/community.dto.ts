import {
  ArrayMaxSize,
  IsArray,
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
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(200)
  title!: string;

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
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title?: string;

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
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['newest', 'votes', 'comments', 'popular'])
  sort?: 'newest' | 'votes' | 'comments' | 'popular' = 'newest';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
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
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(60)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(60)
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
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
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
  isLocked?: boolean;

  @IsOptional()
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
