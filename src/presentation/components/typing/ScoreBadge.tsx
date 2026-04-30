import styles from './ScoreBadge.module.css';

interface Props {
  accuracy: number;
}

export function ScoreBadge({ accuracy }: Props) {
  return (
    <div className={styles.badge}>
      <span className={styles.value}>{accuracy}</span>
      <span className={styles.unit}>%</span>
    </div>
  );
}
