import type { IPracticeRepository } from '@domain/memorization/IPracticeRepository';

export class ClearPracticeSession {
  constructor(private readonly practice: IPracticeRepository) {}

  execute(chapter: number): void {
    this.practice.clear(chapter);
  }
}
