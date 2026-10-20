import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTechnologyDto {
  @ApiProperty({ example: 'PostgreSQL' })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name: string;

  @ApiPropertyOptional({
    example: 'postgresql',
    description: "Nom d'icone (optionnel)",
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;
}

export class UpdateTechnologyDto extends PartialType(CreateTechnologyDto) {}
