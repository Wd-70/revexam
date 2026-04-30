import type { Chapter, ChapterMetadata } from './Chapter';

export interface IScriptureRepository {
  getChapter(chapterNumber: number): Chapter;
  listChapters(): readonly ChapterMetadata[];
}
