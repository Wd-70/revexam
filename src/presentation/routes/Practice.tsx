import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { usePracticeSession } from '../hooks/usePracticeSession';
import { TypingCanvas } from '../components/typing/TypingCanvas';
import { ScoreBadge } from '../components/typing/ScoreBadge';
import { ReferenceDrawer } from '../components/typing/ReferenceDrawer';
import styles from './Practice.module.css';

export function Practice() {
  const { chapter: chapterStr } = useParams();
  const chapter = Number(chapterStr) || 1;
  const {
    typed,
    result,
    verses,
    updateTyped,
    setComposing,
    clearProgress,
  } = usePracticeSession(chapter);

  const [showRef, setShowRef] = useState(false);
  const toggleRef = useCallback(() => setShowRef((v) => !v), []);

  const handleCompositionStart = useCallback(() => setComposing(true), [setComposing]);
  const handleCompositionEnd = useCallback(() => setComposing(false), [setComposing]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link to="/" className={styles.back}>&larr; 홈</Link>
          <h1 className={styles.title}>연습 · 계 {chapter}장</h1>
        </div>
        <div className={styles.headerRight}>
          <ScoreBadge accuracy={result.accuracy} />
        </div>
      </header>

      <div className={styles.toolbar}>
        <ReferenceDrawer verses={verses} open={showRef} onToggle={toggleRef} />
        <button className={styles.clearBtn} onClick={clearProgress}>
          초기화
        </button>
      </div>

      <TypingCanvas
        typed={typed}
        result={result}
        onInput={updateTyped}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
      />
    </div>
  );
}
