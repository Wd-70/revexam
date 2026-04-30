import type { IPracticeRepository } from '@domain/memorization/IPracticeRepository';
import type { PracticeProgress } from '@domain/memorization/PracticeProgress';
import { loadStorage, saveStorage } from './localStorageDriver';

export class LocalStoragePracticeRepository implements IPracticeRepository {
  load(chapter: number): PracticeProgress | null {
    const state = loadStorage();
    return state.practiceProgress[chapter] ?? null;
  }

  save(chapter: number, typed: string): void {
    const state = loadStorage();
    state.practiceProgress[chapter] = {
      typed,
      updatedAt: new Date().toISOString(),
    };
    saveStorage(state);
  }

  clear(chapter: number): void {
    const state = loadStorage();
    delete state.practiceProgress[chapter];
    saveStorage(state);
  }
}
