import type { IScriptureRepository } from '@domain/scripture/IScriptureRepository';
import type { ITestRepository } from '@domain/examination/ITestRepository';
import type { TestAttempt } from '@domain/examination/TestAttempt';
import { grade, type GradeResult } from '@domain/grading/GradingService';

export interface TestAttemptDetail {
  readonly attempt: TestAttempt;
  readonly targetText: string;
  readonly result: GradeResult;
}

export class GetTestAttempt {
  constructor(
    private readonly scripture: IScriptureRepository,
    private readonly tests: ITestRepository
  ) {}

  execute(id: string): TestAttemptDetail | null {
    const attempt = this.tests.findById(id);
    if (!attempt) return null;
    const chapter = this.scripture.getChapter(attempt.chapter);
    const targetText = chapter.verses.map((v) => v.text).join(' ');
    const result = grade(targetText, attempt.typed);
    return { attempt, targetText, result };
  }
}
