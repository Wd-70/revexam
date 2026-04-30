import type { Verse } from '@domain/scripture/Verse';
import styles from './ReferenceDrawer.module.css';

interface Props {
  verses: readonly Verse[];
  open: boolean;
  onToggle: () => void;
}

export function ReferenceDrawer({ verses, open, onToggle }: Props) {
  return (
    <>
      <button
        className={styles.toggle}
        onClick={onToggle}
        aria-expanded={open}
        title={open ? '원문 숨기기' : '원문 보기'}
      >
        {open ? '원문 숨기기' : '원문 보기'}
      </button>
      {open && (
        <aside className={styles.drawer}>
          {verses.map((v) => (
            <p key={v.verseNumber} className={styles.verse}>
              <sup className={styles.num}>{v.verseNumber}</sup>
              {v.text}
            </p>
          ))}
        </aside>
      )}
    </>
  );
}
