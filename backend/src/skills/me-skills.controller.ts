import {
  Body,
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { UserGuard } from '../auth/guards';
import { SupabaseService } from './skills-database.service';
import {
  ATTEMPT_VALIDATED,
  AttemptValidatedEvent,
} from './events/attempt-validated.event';
import { SkillProgressService } from './skill-progress.service';
import {
  RankRewardListener,
  type RankReward,
} from '../rankings/rank-reward.listener';
import {
  SubmitChallengeAnswerDto,
  SoloPracticeDto,
} from './dto/submit-challenge-answer.dto';
import { getChallengeQuestionBank, gradeChallengeAnswer, getChallengeAnswerExplanation } from './scoring/challenge-grading';

type AuthedRequest = Request & { user?: { id: string } };

@ApiTags('me / skills')
@ApiBearerAuth()
@UseGuards(UserGuard)
@Controller('me/skills')
export class MeSkillsController {
  constructor(
    private readonly progress: SkillProgressService,
    private readonly supabase: SupabaseService,
    private readonly events: EventEmitter2,
    private readonly rankRewards: RankRewardListener,
  ) {}

  @Get()
  list(@Req() req: AuthedRequest) {
    return this.progress.getUserProgressWithDelta(req.user!.id);
  }

  @Get(':skillId/history')
  history(
    @Req() req: AuthedRequest,
    @Param('skillId', new ParseUUIDPipe()) skillId: string,
  ) {
    return this.progress.getUserHistory(req.user!.id, skillId);
  }

  @Get('challenges/:challengeId/question-bank')
  async questionBank(
    @Param('challengeId', new ParseUUIDPipe()) challengeId: string,
  ) {
    const { title, skills, category } = await this.loadChallenge(challengeId);
    return getChallengeQuestionBank(title, skills, category);
  }

  private async loadChallenge(challengeId: string) {
    const { data: challenge, error: challengeError } =
      await this.supabase.client
        .from('challenges')
        .select(
          'id, title, category, is_published, challenge_skills(skills(id, name, slug))',
        )
        .eq('id', challengeId)
        .maybeSingle();
    if (challengeError)
      throw new ServiceUnavailableException(
        'Challenge is temporarily unavailable.',
      );
    if (!challenge?.is_published)
      throw new NotFoundException('Challenge not found.');
    const linkedSkills = challenge.challenge_skills as unknown as
      | { skills: { id: string; name: string; slug: string } | null }[]
      | undefined;
    const skills = (linkedSkills ?? []).flatMap((link) =>
      link.skills ? [link.skills.name, link.skills.slug] : [],
    );
    return {
      title: challenge.title as string,
      skills,
      category: challenge.category as string | undefined,
    };
  }

  @Post('challenges/:challengeId/attempt')
  @HttpCode(200)
  async recordMyAttempt(
    @Req() req: AuthedRequest,
    @Param('challengeId', new ParseUUIDPipe()) challengeId: string,
    @Body() body: SubmitChallengeAnswerDto,
  ) {
    const userId = req.user!.id;
    if (!body?.question || !body?.answerId)
      throw new BadRequestException('Submit a challenge answer.');
    const { title, skills, category } = await this.loadChallenge(challengeId);
    const isValidated = gradeChallengeAnswer(
      title,
      body.question,
      body.answerId,
      skills,
      category,
    );
    const accuracy = isValidated ? 1 : 0;
    const { data: attempt, error } = await this.supabase.client
      .from('attempts')
      .insert({
        user_id: userId,
        challenge_id: challengeId,
        accuracy,
        is_validated: isValidated,
        metadata: { source: 'competitive_challenge', server_validated: true },
      })
      .select('id')
      .single();
    if (error || !attempt)
      throw new ServiceUnavailableException('Attempt could not be saved.');

    let masteryPoints = 0;
    let rankReward: RankReward | null = null;
    if (isValidated) {
      const { data: mastery, error: masteryError } =
        await this.supabase.client.rpc('grant_attempt_mastery', {
          p_attempt_id: attempt.id,
        });
      if (masteryError || !mastery)
        throw new ServiceUnavailableException(
          'Challenge rewards are temporarily unavailable.',
        );
      masteryPoints = Number(mastery.mastery_points ?? 0);
      try {
        await this.events.emitAsync(
          ATTEMPT_VALIDATED,
          new AttemptValidatedEvent(userId, challengeId, true),
        );
      } catch {
        throw new ServiceUnavailableException(
          'Skill progress is temporarily unavailable.',
        );
      }
      rankReward = await this.rankRewards.checkAndGrant(userId);
    }

    return {
      success: true,
      challengeId,
      userId,
      isSuccess: isValidated,
      accuracy,
      masteryPoints,
      rankReward,
      explanation: getChallengeAnswerExplanation(title, body.question, body.answerId, skills, category),
    };
  }

  @Post('duel/attempt')
  @HttpCode(200)
  async recordDuelAttempt(
    @Req() req: AuthedRequest,
    @Body() body: SoloPracticeDto,
  ) {
    const userId = req.user!.id;
    let accuracy = 0;
    if (body?.accuracy != null) {
      accuracy = Math.max(0, Math.min(1, Number(body.accuracy)));
    } else if (body?.correctAnswers != null && body?.totalQuestions) {
      accuracy = Math.max(
        0,
        Math.min(1, Number(body.correctAnswers) / Number(body.totalQuestions)),
      );
    }
    const isValidated = accuracy >= 0.5;

    // Solo answers are resolved in the browser and cannot earn competitive rewards.
    return {
      success: true,
      userId,
      isSuccess: isValidated,
      accuracy,
      competitive: false,
      masteryPoints: 0,
    };
  }
}
