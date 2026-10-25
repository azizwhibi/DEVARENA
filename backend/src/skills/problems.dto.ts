import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ChallengeSkillItemDto } from './dto/challenge-skills.dto';

export class ProblemWrite {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title: string;
  @IsString() @MaxLength(50000) description: string;
  @IsIn(['beginner', 'intermediate', 'advanced', 'expert']) difficulty: string;
  @IsOptional() @IsString() @MaxLength(80) category?: string;
  @IsOptional() @IsInt() @Min(30) @Max(86400) duration_seconds?: number;
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true })
  topicIds?: string[];
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ChallengeSkillItemDto)
  skills?: ChallengeSkillItemDto[];
}

export class ProblemQuery {
  @IsOptional() @IsString() @MaxLength(80) q = '';
  @IsOptional()
  @IsIn(['', 'beginner', 'intermediate', 'advanced', 'expert'])
  difficulty = '';
  @IsOptional() @IsUUID() topic?: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(100000) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20;
}
export class TopicWrite {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;
  @IsString() @MaxLength(100) @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/) slug: string;
  @IsBoolean() is_active: boolean;
}
export class TopicLinks {
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true })
  topicIds: string[];
}
