import { useCallback, useRef } from 'react';
import type { GradeResult, GradedStatus } from '@domain/grading/GradingService';
import styles from './TypingCanvas.module.css';

interface Props {
  typed: string;
  result: GradeResult;
  onInput: (value: string) => void;
  onCompositionStart: () => void;
  onCompositionEnd: () => void;
  placeholder?: string;
}

const STATUS_CLASS: Record<GradedStatus, string> = {
  correct: styles.correct!,
  partial: styles.partial!,
  wrong: styles.wrong!,
  pending: styles.pending!,
};

export function TypingCanvas({
  typed,
  result,
  onInput,
  onCompositionStart,
  onCompositionEnd,
  placeholder = '외운 내용을 입력하세요…',
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInput = useCallback(
    (e: React.FormEvent<HTMLTextAreaElement>) => {
      onInput(e.currentTarget.value);
    },
    [onInput]
  );

  const handleFocusOverlay = () => {
    textareaRef.current?.focus();
  };

  const hasTyped = result.typedChars.length > 0;

  return (
    <div className={styles.wrapper}>
      {/* Colored rendering of what the user typed */}
      <div
        className={styles.overlay}
        onClick={handleFocusOverlay}
        aria-hidden="true"
      >
        {hasTyped ? (
          result.typedChars.map((c, i) => {
            const isLast = i === result.typedChars.length - 1;
            const showSkip = c.skippedBefore > 0 && !isLast;
            return showSkip ? (
              <span key={i} className={styles.charWithSkip}>
                <span className={styles.skip} title={`${c.skippedBefore}글자 건너뜀`}>
                  {c.skippedBefore}
                </span>
                <span className={STATUS_CLASS[c.status]}>{c.ch}</span>
              </span>
            ) : (
              <span key={i} className={STATUS_CLASS[c.status]}>{c.ch}</span>
            );
          })
        ) : (
          <span className={styles.placeholder}>{placeholder}</span>
        )}
      </div>

      {/* Invisible textarea to capture input */}
      <textarea
        ref={textareaRef}
        className={styles.input}
        value={typed}
        onInput={handleInput}
        onCompositionStart={onCompositionStart}
        onCompositionEnd={(e) => {
          onCompositionEnd();
          onInput(e.currentTarget.value);
        }}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        aria-label="암송 입력"
        placeholder=""
      />
    </div>
  );
}
