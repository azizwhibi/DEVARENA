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
  @ApiProperty({ description: "Skill ID" })
  @IsUUID()
  skillId: string;

  @ApiPropertyOptional({
    description: "Skill weight from 1 to 3 (default: 1)",
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
      "Complete challenge skill list (replaces existing links)",
  })
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ChallengeSkillItemDto)
  skills: ChallengeSkillItemDto[];
}
