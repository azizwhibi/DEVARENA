export const ATTEMPT_VALIDATED = 'attempt.validated';

export class AttemptValidatedEvent {
  constructor(
    public readonly userId: string,
    public readonly challengeId: string,
  ) {}
}
