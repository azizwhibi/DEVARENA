import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UsersService, TechnologyItem } from './users.service';

@ApiTags('technologies')
@Controller('technologies')
export class TechnologiesController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async list(): Promise<TechnologyItem[]> {
    return this.usersService.listTechnologies();
  }
}
