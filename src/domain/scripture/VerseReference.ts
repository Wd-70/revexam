export interface VerseReference {
  readonly chapter: number;
  readonly verse: number;
}

export function formatVerseReference(ref: VerseReference): string {
  return `${ref.chapter}:${ref.verse}`;
}
