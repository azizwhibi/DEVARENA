import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from './skills-database.service';
import { AssignmentsService } from './assignments.service';
import { SetChallengeSkillsDto } from './dto/challenge-skills.dto';
@Injectable()
export class ChallengeSkillsService {
  private readonly logger = new Logger(ChallengeSkillsService.name);
  constructor(
    private readonly supabase: SupabaseService,
    private readonly assignments: AssignmentsService,
  ) {}
  private get db() {
    return this.supabase.client;
  }
  private fail(error: { message: string }): never {
    this.logger.error(error.message);
    throw new InternalServerErrorException("Skill links unavailable.");
  }
  private async ensureChallenge(id: string) {
    const { data, error } = await this.db
      .from('challenges')
      .select('id')
      .eq('id', id)
      .maybeSingle();
    if (error) this.fail(error);
    if (!data) throw new NotFoundException("Challenge not found.");
  }
  async get(challengeId: string) {
    await this.ensureChallenge(challengeId);

    const { data, error } = await this.db
      .from('challenge_skills')
      .select('weight, skill:skills(id,name,slug,is_active)')
      .eq('challenge_id', challengeId);
    if (error) this.fail(error);

    return {
      challengeId,
      skills: (data ?? []).map(
        (row: {
          skill:
            | { id: string; name: string; slug: string; is_active: boolean }
            | { id: string; name: string; slug: string; is_active: boolean }[]
            | null;
          weight: number;
        }) => {
          const skill = Array.isArray(row.skill) ? row.skill[0] : row.skill;
          return { ...skill, weight: Number(row.weight) };
        },
      ),
    };
  }

  async replace(
    challengeId: string,
    dto: SetChallengeSkillsDto,
    actorId: string,
  ) {
    await this.assignments.links(actorId, challengeId, dto.skills);
    return this.get(challengeId);
  }
}
