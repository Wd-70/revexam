import type { IPracticeRepository } from '@domain/memorization/IPracticeRepository';
import { grade, type GradeResult } from '@domain/grading/GradingService';

export interface UpdatePracticeTypingInput {
  readonly chapter: number;
  readonly targetText: string;
  readonly typed: string;
}

export class UpdatePracticeTyping {
  constructor(private readonly practice: IPracticeRepository) {}

  grade(input: UpdatePracticeTypingInput): GradeResult {
    return grade(input.targetText, input.typed);
  }

  persist(chapter: number, typed: string): void {
    this.practice.save(chapter, typed);
  }
}
