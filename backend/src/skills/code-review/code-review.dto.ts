import { IsIn, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export const CODE_LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'java',
  'cpp',
  'sql',
] as const;
export type CodeLanguage = (typeof CODE_LANGUAGES)[number];

export class CodeReviewDto {
  @IsUUID('4')
  submissionId!: string;

  @IsIn(CODE_LANGUAGES)
  language!: CodeLanguage;

  @IsString()
  @MinLength(10)
  @MaxLength(20000)
  code!: string;
}
