import { useMemo } from 'react';
import type { ChapterMetadata } from '@domain/scripture/Chapter';
import { useUseCases } from '@infrastructure/di/container';

export function useChapterMetadata(): readonly ChapterMetadata[] {
  const useCases = useUseCases();
  return useMemo(() => useCases.listChapters.execute(), [useCases]);
}
