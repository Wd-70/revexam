import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <span>본문: 개역한글</span>
      <span className={styles.dot}>·</span>
      <span>v0.1.0</span>
    </footer>
  );
}
