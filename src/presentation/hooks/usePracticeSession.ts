import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUseCases } from '@infrastructure/di/container';
import type { GradeResult } from '@domain/grading/GradingService';

interface PracticeState {
  targetText: string;
  typed: string;
  result: GradeResult;
  isComposing: boolean;
}

const SAVE_DEBOUNCE_MS = 800;

export function usePracticeSession(chapter: number) {
  const { loadPracticeSession, updatePracticeTyping, clearPracticeSession } = useUseCases();

  const initial = useMemo(
    () => loadPracticeSession.execute(chapter),
    [chapter, loadPracticeSession]
  );

  const [state, setState] = useState<PracticeState>(() => ({
    targetText: initial.targetText,
    typed: initial.typed,
    result: initial.result,
    isComposing: false,
  }));

  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const scheduleSave = useCallback(
    (typed: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        updatePracticeTyping.persist(chapter, typed);
      }, SAVE_DEBOUNCE_MS);
    },
    [chapter, updatePracticeTyping]
  );

  const updateTyped = useCallback(
    (typed: string) => {
      const result = updatePracticeTyping.grade({
        chapter,
        targetText: initial.targetText,
        typed,
      });
      setState((prev) => ({ ...prev, typed, result }));
      scheduleSave(typed);
    },
    [chapter, initial.targetText, scheduleSave, updatePracticeTyping]
  );

  const setComposing = useCallback((v: boolean) => {
    setState((prev) => ({ ...prev, isComposing: v }));
  }, []);

  const clearProgress = useCallback(() => {
    clearPracticeSession.execute(chapter);
    setState((prev) => ({
      ...prev,
      typed: '',
      result: { targetChars: [], typedChars: [], accuracy: 0 },
    }));
  }, [chapter, clearPracticeSession]);

  return {
    targetText: state.targetText,
    typed: state.typed,
    result: state.result,
    isComposing: state.isComposing,
    verses: initial.chapter.verses,
    updateTyped,
    setComposing,
    clearProgress,
  };
}
