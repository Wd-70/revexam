import { Link } from 'react-router-dom';
import { useUseCases } from '@infrastructure/di/container';
import styles from './History.module.css';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}초`;
  return `${m}분 ${s}초`;
}

function accClass(accuracy: number): string {
  if (accuracy >= 80) return styles.accHigh!;
  if (accuracy >= 50) return styles.accMid!;
  return styles.accLow!;
}

export function History() {
  const { listTestHistory } = useUseCases();
  const records = listTestHistory.all();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/" className={styles.back}>&larr; 홈</Link>
        <h1 className={styles.title}>시험 이력</h1>
      </header>

      {records.length === 0 ? (
        <div className={styles.empty}>
          <svg
            className={styles.emptyIcon}
            viewBox="0 0 64 64"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M14 12 L14 52 L50 52 L50 20 L42 12 Z" />
            <path d="M42 12 L42 20 L50 20" />
            <path d="M22 30 L42 30 M22 38 L42 38 M22 46 L34 46" />
          </svg>
          <p className={styles.emptyTitle}>아직 시험 기록이 없습니다</p>
          <Link to="/" className={styles.emptyLink}>홈에서 시험을 시작해보세요</Link>
        </div>
      ) : (
        <div className={styles.list}>
          {records.map((r) => (
            <Link
              key={r.id}
              to={`/test/${r.chapter}/result/${r.id}`}
              className={styles.card}
            >
              <span className={styles.chapterBadge}>{r.chapter}</span>
              <div className={styles.cardBody}>
                <div className={styles.cardTop}>계시록 {r.chapter}장</div>
                <div className={styles.cardBottom}>
                  {formatDate(r.completedAt)} · {formatDuration(r.durationSec)}
                </div>
              </div>
              <span className={`${styles.accuracy} ${accClass(r.accuracy)}`}>
                {r.accuracy}%
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
