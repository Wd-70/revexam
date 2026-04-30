import type { IScriptureRepository } from '@domain/scripture/IScriptureRepository';
import type { IPracticeRepository } from '@domain/memorization/IPracticeRepository';
import type { ITestRepository } from '@domain/examination/ITestRepository';
import { StaticScriptureRepository } from '@infrastructure/data/StaticScriptureRepository';
import { LocalStoragePracticeRepository } from '@infrastructure/persistence/LocalStoragePracticeRepository';
import { LocalStorageTestRepository } from '@infrastructure/persistence/LocalStorageTestRepository';
import { ListChapters } from '@application/scripture/ListChapters';
import { LoadPracticeSession } from '@application/memorization/LoadPracticeSession';
import { UpdatePracticeTyping } from '@application/memorization/UpdatePracticeTyping';
import { ClearPracticeSession } from '@application/memorization/ClearPracticeSession';
import { SubmitTestAttempt } from '@application/examination/SubmitTestAttempt';
import { GetTestAttempt } from '@application/examination/GetTestAttempt';
import { ListTestHistory } from '@application/examination/ListTestHistory';

export interface UseCases {
  readonly listChapters: ListChapters;
  readonly loadPracticeSession: LoadPracticeSession;
  readonly updatePracticeTyping: UpdatePracticeTyping;
  readonly clearPracticeSession: ClearPracticeSession;
  readonly submitTestAttempt: SubmitTestAttempt;
  readonly getTestAttempt: GetTestAttempt;
  readonly listTestHistory: ListTestHistory;
}

export interface Container {
  readonly useCases: UseCases;
}

let instance: Container | null = null;

export function getContainer(): Container {
  if (instance) return instance;

  const scripture: IScriptureRepository = new StaticScriptureRepository();
  const practice: IPracticeRepository = new LocalStoragePracticeRepository();
  const tests: ITestRepository = new LocalStorageTestRepository();

  instance = {
    useCases: {
      listChapters: new ListChapters(scripture),
      loadPracticeSession: new LoadPracticeSession(scripture, practice),
      updatePracticeTyping: new UpdatePracticeTyping(practice),
      clearPracticeSession: new ClearPracticeSession(practice),
      submitTestAttempt: new SubmitTestAttempt(scripture, tests),
      getTestAttempt: new GetTestAttempt(scripture, tests),
      listTestHistory: new ListTestHistory(tests),
    },
  };
  return instance;
}

export function useUseCases(): UseCases {
  return getContainer().useCases;
}
