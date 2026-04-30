export interface TestAttempt {
  readonly id: string;
  readonly chapter: number;
  readonly accuracy: number;
  readonly typed: string;
  readonly durationSec: number;
  readonly completedAt: string;
}
