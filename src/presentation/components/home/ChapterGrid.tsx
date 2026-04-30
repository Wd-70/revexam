import type { CSSProperties } from 'react';
import type { ChapterMetadata } from '@domain/scripture/Chapter';
import { ChapterCard } from './ChapterCard';
import styles from './ChapterGrid.module.css';

interface Props {
  readonly chapters: readonly ChapterMetadata[];
}

export function ChapterGrid({ chapters }: Props) {
  return (
    <ul className={styles.grid}>
      {chapters.map((meta, i) => (
        <li
          key={meta.chapterNumber}
          className={styles.cell}
          style={{ '--i': i } as CSSProperties}
        >
          <ChapterCard meta={meta} />
        </li>
      ))}
    </ul>
  );
}
