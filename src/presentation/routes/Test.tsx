import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useUseCases } from '@infrastructure/di/container';
import styles from './Test.module.css';

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function Test() {
  const { chapter: chapterStr } = useParams();
  const chapter = Number(chapterStr) || 1;
  const navigate = useNavigate();
  const { submitTestAttempt } = useUseCases();

  const [typed, setTyped] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const startTime = useRef(Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!typed.trim()) return;
    const durationSec = Math.floor((Date.now() - startTime.current) / 1000);
    const attempt = submitTestAttempt.execute({ chapter, typed, durationSec });
    navigate(`/test/${chapter}/result/${attempt.id}`);
  }, [typed, chapter, submitTestAttempt, navigate]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link to="/" className={styles.back}>&larr; 홈</Link>
          <h1 className={styles.title}>시험 · 계 {chapter}장</h1>
        </div>
        <div className={styles.timer}>{formatTime(elapsed)}</div>
      </header>

      <textarea
        className={styles.textarea}
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        placeholder="외운 내용을 입력하세요…"
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        aria-label="시험 입력"
        autoFocus
      />

      <div className={styles.footer}>
        <span className={styles.charCount}>{typed.length}자</span>
        <button
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={!typed.trim()}
        >
          제출
        </button>
      </div>
    </div>
  );
}
