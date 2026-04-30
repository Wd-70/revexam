import type { PracticeProgress } from './PracticeProgress';

export interface IPracticeRepository {
  load(chapter: number): PracticeProgress | null;
  save(chapter: number, typed: string): void;
  clear(chapter: number): void;
}
