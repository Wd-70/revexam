import { Link } from 'react-router-dom';
import styles from './TopBar.module.css';

export function TopBar() {
  return (
    <header className={styles.topBar}>
      <Link to="/" className={styles.brand}>
        <span className={styles.brandMark}>R</span>
        <span className={styles.brandWord}>Revexam</span>
      </Link>
      <nav className={styles.nav}>
        <Link to="/history" className={styles.navLink}>
          시험 이력
        </Link>
      </nav>
    </header>
  );
}
