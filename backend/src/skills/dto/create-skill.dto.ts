import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateSkillDto {
  @ApiProperty({ example: 'Jointures SQL' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @ApiPropertyOptional({ example: 'INNER, LEFT, agregations' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @ApiProperty({ description: 'Id de la categorie' })
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional({ description: 'Id de la technologie' })
  @IsOptional()
  @IsUUID()
  technologyId?: string;
}
