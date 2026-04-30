import { Link } from 'react-router-dom';
import { useChapterMetadata } from '../hooks/useChapterMetadata';
import { ChapterGrid } from '../components/home/ChapterGrid';
import { HeroStats } from '../components/home/HeroStats';
import styles from './Home.module.css';

export function Home() {
  const chapters = useChapterMetadata();

  return (
    <div className={styles.home}>
      <section className={styles.hero}>
        <div className={styles.heroBackdrop} aria-hidden="true" />
        <div className={styles.heroInner}>
          <p className={styles.heroEyebrow}>요한계시록 · 22장</p>
          <h1 className={styles.heroTitle}>마음에 새기는 한 절</h1>
          <p className={styles.heroSub}>
            자모 단위로 정확하게. 작은 차이도 흐름을 끊지 않게.
          </p>
          <div className={styles.heroCta}>
            <Link to="/practice/1" className={styles.ctaPrimary}>
              1장부터 시작
            </Link>
            <Link to="/history" className={styles.ctaSecondary}>
              이력 보기
            </Link>
          </div>
          <HeroStats chapters={chapters} />
        </div>
      </section>

      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>장 선택</h2>
          <span className={styles.sectionHint}>22장 전체</span>
        </header>
        <ChapterGrid chapters={chapters} />
      </section>
    </div>
  );
}
