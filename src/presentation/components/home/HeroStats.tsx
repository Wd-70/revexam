import type { ChapterMetadata } from '@domain/scripture/Chapter';
import styles from './HeroStats.module.css';

interface Props {
  readonly chapters: readonly ChapterMetadata[];
}

export function HeroStats({ chapters }: Props) {
  const verseTotal = chapters.reduce((s, c) => s + c.verseCount, 0);
  const charTotal = chapters.reduce((s, c) => s + c.totalChars, 0);

  return (
    <dl className={styles.stats}>
      <div className={styles.stat}>
        <dt>장</dt>
        <dd>{chapters.length}</dd>
      </div>
      <div className={styles.stat}>
        <dt>절</dt>
        <dd>{verseTotal}</dd>
      </div>
      <div className={styles.stat}>
        <dt>글자</dt>
        <dd>{charTotal.toLocaleString('ko-KR')}</dd>
      </div>
    </dl>
  );
}
