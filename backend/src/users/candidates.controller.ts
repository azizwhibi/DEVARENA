import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RecruiterGuard } from '../auth/guards';
import { UsersService } from './users.service';
import { ListCandidatesQueryDto } from './dto/list-candidates.query';

@ApiTags('recruiter')
@ApiBearerAuth()
@UseGuards(RecruiterGuard)
@Controller('recruiter/candidates')
export class RecruiterCandidatesController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async list(@Query() query: ListCandidatesQueryDto) {
    return this.usersService.listCandidates(query);
  }
}
