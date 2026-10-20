import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateInvitationDto {
  @IsUUID('4', { message: 'candidateId must be a valid UUID' })
  @IsNotEmpty({ message: 'candidateId is required' })
  candidateId!: string;

  @IsOptional()
  @IsString({ message: 'message must be a string' })
  @MaxLength(1000, { message: 'message cannot exceed 1000 characters' })
  message?: string;
}
