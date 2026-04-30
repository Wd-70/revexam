import type { ChapterMetadata } from '@domain/scripture/Chapter';
import type { IScriptureRepository } from '@domain/scripture/IScriptureRepository';

export class ListChapters {
  constructor(private readonly scripture: IScriptureRepository) {}

  execute(): readonly ChapterMetadata[] {
    return this.scripture.listChapters();
  }
}
