const STORAGE_KEY = 'revexam:v1';

export interface StorageV1 {
  version: 1;
  practiceProgress: Record<number, { typed: string; updatedAt: string }>;
  testHistory: Array<{
    id: string;
    chapter: number;
    accuracy: number;
    typed: string;
    durationSec: number;
    completedAt: string;
  }>;
  settings: {
    showReference: boolean;
    showVerseNumbers: boolean;
    fontSize: 'sm' | 'md' | 'lg';
  };
}

function defaultState(): StorageV1 {
  return {
    version: 1,
    practiceProgress: {},
    testHistory: [],
    settings: {
      showReference: false,
      showVerseNumbers: true,
      fontSize: 'md',
    },
  };
}

export function loadStorage(): StorageV1 {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as StorageV1;
    if (parsed.version !== 1) return defaultState();
    return parsed;
  } catch {
    return defaultState();
  }
}

export function saveStorage(state: StorageV1): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // quota exceeded — silently ignore
  }
}
