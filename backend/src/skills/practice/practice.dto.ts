import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class PracticeAnswerDto {
  @IsString()
  @MinLength(20)
  @MaxLength(2048)
  session!: string;

  @IsString()
  @IsIn(['opt-1', 'opt-2', 'opt-3', 'opt-4'])
  optionId!: string;
}
