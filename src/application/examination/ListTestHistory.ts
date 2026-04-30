import type { ITestRepository } from '@domain/examination/ITestRepository';
import type { TestAttempt } from '@domain/examination/TestAttempt';

export class ListTestHistory {
  constructor(private readonly tests: ITestRepository) {}

  all(): readonly TestAttempt[] {
    return this.tests.listAll();
  }

  byChapter(chapter: number): readonly TestAttempt[] {
    return this.tests.listByChapter(chapter);
  }
}
