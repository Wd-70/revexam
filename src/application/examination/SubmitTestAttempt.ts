import type { IScriptureRepository } from '@domain/scripture/IScriptureRepository';
import type { ITestRepository } from '@domain/examination/ITestRepository';
import type { TestAttempt } from '@domain/examination/TestAttempt';
import { grade } from '@domain/grading/GradingService';

export interface SubmitTestAttemptInput {
  readonly chapter: number;
  readonly typed: string;
  readonly durationSec: number;
}

export class SubmitTestAttempt {
  constructor(
    private readonly scripture: IScriptureRepository,
    private readonly tests: ITestRepository
  ) {}

  execute(input: SubmitTestAttemptInput): TestAttempt {
    const chapter = this.scripture.getChapter(input.chapter);
    const targetText = chapter.verses.map((v) => v.text).join(' ');
    const result = grade(targetText, input.typed);

    const attempt: TestAttempt = {
      id: crypto.randomUUID(),
      chapter: input.chapter,
      accuracy: result.accuracy,
      typed: input.typed,
      durationSec: input.durationSec,
      completedAt: new Date().toISOString(),
    };
    this.tests.save(attempt);
    return attempt;
  }
}
