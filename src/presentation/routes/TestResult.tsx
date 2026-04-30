import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useUseCases } from '@infrastructure/di/container';
import type { GradedStatus } from '@domain/grading/GradingService';
import { useCountUp } from '@presentation/hooks/useCountUp';
import styles from './TestResult.module.css';

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}초`;
  return `${m}분 ${s}초`;
}

function scoreClass(accuracy: number): string {
  if (accuracy >= 80) return styles.scoreHigh!;
  if (accuracy >= 50) return styles.scoreMid!;
  return styles.scoreLow!;
}

const STATUS_CLASS: Record<GradedStatus, string> = {
  correct: styles.correct!,
  partial: styles.partial!,
  wrong: styles.wrong!,
  pending: styles.pending!,
};

type ViewTab = 'typed' | 'target';

export function TestResult() {
  const { chapter: chapterStr, resultId } = useParams();
  const chapter = Number(chapterStr) || 1;
  const { getTestAttempt } = useUseCases();
  const [activeTab, setActiveTab] = useState<ViewTab>('target');

  const detail = useMemo(
    () => getTestAttempt.execute(resultId ?? ''),
    [resultId, getTestAttempt]
  );

  const animatedAccuracy = useCountUp(detail?.attempt.accuracy ?? 0);

  if (!detail) {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          <p>결과를 찾을 수 없습니다.</p>
          <Link to="/" className={styles.homeBtn}>홈으로</Link>
        </div>
      </div>
    );
  }

  const { attempt, result } = detail;
  const completedDate = new Date(attempt.completedAt);
  const dateStr = completedDate.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link to="/" className={styles.back}>&larr; 홈</Link>
          <h1 className={styles.title}>시험 결과 · 계 {chapter}장</h1>
        </div>
      </header>

      <div className={styles.summary}>
        <div className={`${styles.scoreCircle} ${scoreClass(attempt.accuracy)}`}>
          <span className={styles.scoreValue}>{animatedAccuracy}</span>
          <span className={styles.scoreUnit}>%</span>
        </div>
        <div className={styles.meta}>
          <div className={styles.metaItem}>
            소요시간<span className={styles.metaValue}>{formatDuration(attempt.durationSec)}</span>
          </div>
          <div className={styles.metaItem}>
            입력 글자<span className={styles.metaValue}>{attempt.typed.length}자</span>
          </div>
          <div className={styles.metaItem}>
            일시<span className={styles.metaValue}>{dateStr}</span>
          </div>
        </div>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'target' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('target')}
        >
          정답 기준
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'typed' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('typed')}
        >
          입력 기준
        </button>
      </div>

      <div className={styles.resultText}>
        {activeTab === 'target'
          ? result.targetChars.map((c, i) => (
              <span key={i} className={STATUS_CLASS[c.status]}>{c.ch}</span>
            ))
          : result.typedChars.map((c, i) => (
              <span key={i}>
                {c.skippedBefore > 0 && (
                  <span className={styles.skipBadge} title={`${c.skippedBefore}글자 건너뜀`}>
                    {c.skippedBefore}
                  </span>
                )}
                <span className={STATUS_CLASS[c.status]}>{c.ch}</span>
              </span>
            ))}
      </div>

      <div className={styles.actions}>
        <Link to={`/test/${chapter}`} className={styles.retryBtn}>다시 시험</Link>
        <Link to="/" className={styles.homeBtn}>홈으로</Link>
      </div>
    </div>
  );
}
