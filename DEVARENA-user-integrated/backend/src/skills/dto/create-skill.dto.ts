import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateSkillDto {
  @ApiProperty({ example: "SQL joins" })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  name: string;

  @ApiPropertyOptional({ example: "INNER, LEFT, aggregations" })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @ApiProperty({ description: "Category ID" })
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional({ description: "Technology ID" })
  @IsOptional()
  @IsUUID()
  technologyId?: string;
}
