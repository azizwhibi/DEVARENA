import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class RecordAssessmentDto {
  @IsBoolean()
  isSuccess!: boolean;

  @IsOptional()
  @IsUUID()
  skillId?: string;
}
