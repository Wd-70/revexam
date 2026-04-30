import type { TestAttempt } from './TestAttempt';

export interface ITestRepository {
  save(attempt: TestAttempt): void;
  findById(id: string): TestAttempt | null;
  listByChapter(chapter: number): readonly TestAttempt[];
  listAll(): readonly TestAttempt[];
  remove(id: string): void;
}
