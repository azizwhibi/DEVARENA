# Developer practice: Problems to Profile and Dashboard

The developer workflow now works without an administrator recording each result:

1. Sign in as a developer and open **Problems** (`/arena`).
2. Open a problem, choose an answer and click **Check answer**.
3. A correct answer displays **Practice completed** after the backend saves it.
4. Choose **View profile** or open **Dashboard**. The **Practice progress** section shows distinct completed problems, the skills linked to them, and recent completions.
5. The catalogue marks the problem **Practice completed**. Repeating it does not inflate the completed-problem or linked-skill counts. Another linked problem increases the relevant counts.

Existing catalogue skill/technology IDs and problem-to-skill links are reused. An untagged problem still appears as completed; it cannot award a skill until authors link one. No new database migration or environment variable is needed for this practice flow.

## Persistence and validation

The backend owns the existing 13 question banks, returns public options without answer keys, checks the selected answer, and saves it to the existing `attempts` table. The signed session is bound to the authenticated user, problem, question, unique attempt ID and expiry. The first answer wins; replaying the same session cannot overwrite an incorrect answer or insert another attempt.

Practice rows always have `is_validated = false` and metadata `{source: 'quiz_practice', practice_correct: boolean, question_key, option_id}`. They never update `user_skill_progress`, assessment history, Marketplace credits or Knowledge completion. Progress reads are scoped to the signed-in account and aggregate distinct problem IDs, including after reload or another browser session.

The current flow is a practice quiz, **not a code-execution judge**. Practice skills are shown separately from verified proficiency. Existing trusted validated results continue to use the verified-skills workflow. Completing browser practice does not create judge-accepted evidence.

## Endpoints

- `POST /me/practice/:problemId/start`: published problem required; returns a signed session and public question.
- `POST /me/practice/:problemId/answer`: accepts only `{session, optionId}`. Identity comes from the existing authentication guard. Returns the checked answer, explanation and persistence status.
- `GET /me/practice/summary`: completed problem IDs, distinct counts per linked skill/technology, and five recent problems.

All endpoints use the existing authentication and API conventions. Direct client success flags, target user IDs and verified-score fields are rejected. Correct, incorrect and retryable save-error states are distinct in the modal.

## Checks

Backend tests cover grading, public answer-key omission, persistence, first-answer/replay behavior, expiry, tampering, cross-user/problem tokens, failed/unpublished cases, duplicate counts, account isolation, authentication and DTO validation. The isolated automatic-skills SQL test also verifies a correct practice row cannot become verified skill evidence.

Run `npm test -- --runInBand` and `npm run build` in `backend/`, frontend lint/build in `nextjs/`, and `node db/tests/automatic-skills.cjs` from the repository root. No migration is applied by this feature.
