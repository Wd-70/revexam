import type { Chapter, ChapterMetadata } from '@domain/scripture/Chapter';
import type { IScriptureRepository } from '@domain/scripture/IScriptureRepository';
import { revelation } from './revelation';

export class StaticScriptureRepository implements IScriptureRepository {
  private readonly chapters: ReadonlyMap<number, Chapter>;
  private readonly metadata: readonly ChapterMetadata[];

  constructor(chapters: readonly Chapter[] = revelation) {
    this.chapters = new Map(chapters.map((c) => [c.chapterNumber, c]));
    this.metadata = chapters.map((c) => ({
      chapterNumber: c.chapterNumber,
      verseCount: c.verses.length,
      totalChars: c.verses.reduce((sum, v) => sum + [...v.text].length, 0),
    }));
  }

  getChapter(chapterNumber: number): Chapter {
    const chapter = this.chapters.get(chapterNumber);
    if (!chapter) {
      throw new Error(`Chapter ${chapterNumber} not found in scripture data`);
    }
    return chapter;
  }

  listChapters(): readonly ChapterMetadata[] {
    return this.metadata;
  }
}
