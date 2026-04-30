import type { Verse } from './Verse';

export interface Chapter {
  readonly chapterNumber: number;
  readonly verses: readonly Verse[];
}

export interface ChapterMetadata {
  readonly chapterNumber: number;
  readonly verseCount: number;
  readonly totalChars: number;
}
