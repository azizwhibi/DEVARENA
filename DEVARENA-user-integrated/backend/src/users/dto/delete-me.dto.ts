import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteMeDto {
  @IsNotEmpty({ message: 'confirmUsername is required' })
  @IsString({ message: 'confirmUsername must be a string' })
  confirmUsername!: string;
}
