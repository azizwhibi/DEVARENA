import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class ChallengeSkillItemDto {
  @ApiProperty({ description: 'Id de la competence' })
  @IsUUID()
  skillId: string;

  @ApiPropertyOptional({
    description: 'Poids du lien, de 1 a 3 (1 par defaut)',
    minimum: 1,
    maximum: 3,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  weight?: number;
}

export class SetChallengeSkillsDto {
  @ApiProperty({
    type: [ChallengeSkillItemDto],
    description:
      'Liste complete des competences du defi (remplace la precedente)',
  })
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ChallengeSkillItemDto)
  skills: ChallengeSkillItemDto[];
}
