import type { Chapter } from '@domain/scripture/Chapter';
import type { IScriptureRepository } from '@domain/scripture/IScriptureRepository';
import type { IPracticeRepository } from '@domain/memorization/IPracticeRepository';
import { grade, type GradeResult } from '@domain/grading/GradingService';

export interface PracticeSessionSnapshot {
  readonly chapter: Chapter;
  readonly targetText: string;
  readonly typed: string;
  readonly result: GradeResult;
}

const EMPTY_RESULT: GradeResult = { targetChars: [], typedChars: [], accuracy: 0 };

export class LoadPracticeSession {
  constructor(
    private readonly scripture: IScriptureRepository,
    private readonly practice: IPracticeRepository
  ) {}

  execute(chapterNumber: number): PracticeSessionSnapshot {
    const chapter = this.scripture.getChapter(chapterNumber);
    const targetText = chapter.verses.map((v) => v.text).join(' ');
    const saved = this.practice.load(chapterNumber);
    const typed = saved?.typed ?? '';
    const result = typed ? grade(targetText, typed) : EMPTY_RESULT;
    return { chapter, targetText, typed, result };
  }
}
