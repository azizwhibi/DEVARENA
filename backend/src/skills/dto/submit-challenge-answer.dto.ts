import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class SubmitChallengeAnswerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  question!: string;

  @IsString()
  @Matches(/^opt-[1-4]$/)
  answerId!: string;
}

export class SoloPracticeDto {
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(1)
  accuracy?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  correctAnswers?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  totalQuestions?: number;
}
