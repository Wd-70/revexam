import type { ITestRepository } from '@domain/examination/ITestRepository';
import type { TestAttempt } from '@domain/examination/TestAttempt';
import { loadStorage, saveStorage } from './localStorageDriver';

export class LocalStorageTestRepository implements ITestRepository {
  save(attempt: TestAttempt): void {
    const state = loadStorage();
    state.testHistory.push({
      id: attempt.id,
      chapter: attempt.chapter,
      accuracy: attempt.accuracy,
      typed: attempt.typed,
      durationSec: attempt.durationSec,
      completedAt: attempt.completedAt,
    });
    saveStorage(state);
  }

  findById(id: string): TestAttempt | null {
    const state = loadStorage();
    return state.testHistory.find((r) => r.id === id) ?? null;
  }

  listByChapter(chapter: number): readonly TestAttempt[] {
    const state = loadStorage();
    return state.testHistory
      .filter((r) => r.chapter === chapter)
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  }

  listAll(): readonly TestAttempt[] {
    const state = loadStorage();
    return [...state.testHistory].sort(
      (a, b) => b.completedAt.localeCompare(a.completedAt)
    );
  }

  remove(id: string): void {
    const state = loadStorage();
    state.testHistory = state.testHistory.filter((r) => r.id !== id);
    saveStorage(state);
  }
}
