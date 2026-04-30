import { Link } from 'react-router-dom';
import type { ChapterMetadata } from '@domain/scripture/Chapter';
import styles from './ChapterCard.module.css';

interface Props {
  readonly meta: ChapterMetadata;
}

export function ChapterCard({ meta }: Props) {
  return (
    <article className={styles.card}>
      <div className={styles.bar} aria-hidden="true" />
      <header className={styles.head}>
        <span className={styles.num}>{meta.chapterNumber}</span>
        <span className={styles.label}>계 {meta.chapterNumber}장</span>
      </header>
      <dl className={styles.meta}>
        <div>
          <dt>절</dt>
          <dd>{meta.verseCount}</dd>
        </div>
        <div>
          <dt>글자</dt>
          <dd>{meta.totalChars.toLocaleString('ko-KR')}</dd>
        </div>
      </dl>
      <div className={styles.actions}>
        <Link to={`/practice/${meta.chapterNumber}`} className={styles.actionPrimary}>
          연습
        </Link>
        <Link to={`/test/${meta.chapterNumber}`} className={styles.actionSecondary}>
          시험
        </Link>
      </div>
    </article>
  );
}
