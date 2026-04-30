# Revexam — 계시록 암송 웹앱 설계서

> DDD 기반 도메인 모델 · 세련된 메인 화면 · PWA 적용을 종합한 구현 계획

---

## 0. 개요

### 0.1 비전
요한계시록을 한 절 한 절 마음에 새기도록 돕는 학습 도구. 사용자가 외운 내용을 직접 타이핑하면 **자모(초/중/종성) 단위로 채점**하여, 작은 오타로 흐름이 끊기지 않고 부드럽게 진행할 수 있다.

### 0.2 핵심 가치
- **정밀한 채점**: 글자 단위가 아닌 자모 단위 LCS 정렬로 부분 정답을 인정한다.
- **흐름의 보존**: 실시간 색상 피드백을 주되 입력을 막지 않는다.
- **프라이버시**: 서버·DB 없이 LocalStorage만 사용. 본문 데이터도 정적 임베드.
- **앱 같은 경험**: PWA로 설치하면 오프라인에서도 100% 동작.

### 0.3 비기능 요구사항
| 항목 | 목표 |
|---|---|
| 오프라인 동작 | 모든 장의 연습·시험·이력 조회 가능 |
| 응답성 | 입력 채점 latency P95 < 50ms (한 장 기준) |
| 접근성 | WCAG AA 색대비, 키보드 완전 조작, prefers-reduced-motion 존중 |
| 반응형 | 모바일 360px ~ 데스크톱 4K |
| 호스팅 | 정적 호스팅(Vercel / Cloudflare Pages / GitHub Pages) 호환 |

---

## 1. 도메인 모델 (DDD)

### 1.1 유비쿼터스 언어
| 한국어 | 영문 | 정의 |
|---|---|---|
| 장 | Chapter | 계시록의 1~22장 단위 |
| 절 | Verse | 하나의 구절 |
| 자모 | Jamo | 한글 음절을 분해한 초/중/종성 단위 |
| 정확도 | Accuracy | 자모 시퀀스의 LCS 일치율 (0~100) |
| 연습 세션 | PracticeSession | 실시간 채점하며 한 장을 입력하는 한 회의 작업 |
| 시험 시도 | TestAttempt | 입력 후 한 번에 채점되는 한 회의 시험 |
| 채점 | Grading | 자모 시퀀스 LCS 정렬 후 글자별 상태와 정확도를 산출 |
| 진행 상태 | Progress | 사용자가 어느 장을 어디까지 입력했는지 |

### 1.2 바운디드 컨텍스트
1. **Scripture** — 성경 본문. 읽기 전용, 빌드 타임 임베드.
2. **Memorization** — 연습 세션 도메인. 진행 영속화, 실시간 채점 호출.
3. **Examination** — 시험 시도, 결과, 이력.
4. **Preferences** — UI/사용자 설정.

#### 컨텍스트 맵
```
        ┌──────────────┐
        │  Preferences │  (Conformist - UI 옵션 제공)
        └──────┬───────┘
               │
   ┌───────────┼─────────────┐
   ▼           ▼             ▼
┌──────────┐  ┌──────────────┐  ┌──────────────┐
│Scripture │─▶│ Memorization │  │ Examination  │
│(Supplier)│  └──────────────┘  └──────────────┘
└──────────┘          │                │
                      └───────┬────────┘
                              ▼
                     ┌─────────────────┐
                     │  Grading        │
                     │  (Shared Kernel)│
                     └─────────────────┘
```

- **Scripture → Memorization, Examination**: Customer/Supplier (본문 공급)
- **Grading**: 두 컨텍스트가 공유하는 커널 (동일 채점 로직)
- **Preferences**: 모든 UI에 환경값 제공 (Conformist 관계)

### 1.3 어그리게잇 / 엔티티 / 값 객체

#### Scripture (불변 정적 도메인)
- `Chapter` *(Aggregate Root)* — `chapterNumber: 1..22`, `verses: Verse[]`
- `Verse` *(Entity within Chapter)* — `verseNumber`, `text`
- `VerseReference` *(VO)* — `chapter`, `verse` (e.g., 3:7)

#### Memorization
- `PracticeSession` *(Aggregate Root)*
  - 식별: `chapterNumber` 1개 = 세션 1개 (장 단위 단일 세션 정책)
  - 상태: `typedText: string`, `lastUpdatedAt: ISODate`
  - 행위: `updateTyping(typed)`, `clear()`
  - 불변식: `typedText.length ≤ targetText.length × 1.5` (안전 상한)

#### Examination
- `TestAttempt` *(Aggregate Root)*
  - 상태머신: `Draft` → `InProgress` → `Submitted (immutable)`
  - 필드: `id`, `chapter`, `typedText`, `startedAt`, `completedAt?`, `gradeResult?`
  - 행위: `submit(now)` → 채점 후 Submitted로 전이, 이후 변경 불가
- `TestHistory` — Submitted된 TestAttempt들의 컬렉션 (조회 가능)

#### Grading (Shared Kernel — 순수 함수)
- `Jamo` *(VO)* — 자모 한 개 (`'ㄱ'`, `'ㅏ'`, ...) 또는 비한글 토큰
- `JamoSequence` *(VO)* — `Jamo[]`
- `GradedChar` *(VO)* — `{ ch, status: 'correct'|'partial'|'wrong'|'pending', matchedJamo, totalJamo }`
- `Accuracy` *(VO)* — `0..100` (정수)
- `GradeResult` *(VO)* — `{ chars: GradedChar[], accuracy: Accuracy }`

#### Preferences
- `UserPreferences` *(AR)* — `theme: 'light'|'dark'|'auto'`, `showReference`, `showVerseNumbers`, `fontSize: 'sm'|'md'|'lg'`, `reducedMotion`

### 1.4 도메인 서비스 (순수, 부수효과 없음)
- `HangulDecomposer.decompose(s: string): JamoSequence`
- `LcsAligner.align(a: JamoSequence, b: JamoSequence): AlignmentMatrix`
- `GradingService.grade(target: string, typed: string): GradeResult`

### 1.5 리포지토리 (인터페이스)
도메인은 인터페이스만 알고, 구현은 Infrastructure에 둔다.

```ts
interface IPracticeRepository {
  load(chapter: number): PracticeSession | null;
  save(session: PracticeSession): void;
  clear(chapter: number): void;
}
interface ITestHistoryRepository {
  append(attempt: TestAttempt): void;
  list(chapter?: number): TestAttempt[];
  get(id: string): TestAttempt | null;
}
interface IPreferencesRepository {
  load(): UserPreferences;
  save(prefs: UserPreferences): void;
}
interface IScriptureRepository {
  getChapter(n: number): Chapter;
  listChapters(): ChapterMetadata[];
}
```

### 1.6 애플리케이션 서비스 (유스케이스)
| 유스케이스 | 입력 | 출력 |
|---|---|---|
| `StartPracticeSession` | `chapter` | `{ session, target }` |
| `UpdatePracticeTyping` | `chapter, typed` | `{ result: GradeResult }` |
| `ClearPracticeSession` | `chapter` | `void` |
| `StartTestAttempt` | `chapter` | `{ attemptId, target, startedAt }` |
| `SubmitTestAttempt` | `attemptId, typed` | `{ attempt: Submitted, result: GradeResult }` |
| `ListTestHistory` | `chapter?` | `TestAttempt[]` |
| `GetTestResult` | `attemptId` | `TestAttempt(Submitted)` |
| `LoadPreferences` / `UpdatePreferences` | — / `patch` | `UserPreferences` |

각 유스케이스는 리포지토리 인터페이스에만 의존한다 (DI 가능).

---

## 2. 레이어드 아키텍처

```
┌────────────────────────────────────────────────────────┐
│  Presentation       (React Routes, Components, Hooks)  │
├────────────────────────────────────────────────────────┤
│  Application        (Use Cases — orchestration)        │
├────────────────────────────────────────────────────────┤
│  Domain             (Entities, VOs, Domain Services)   │
├────────────────────────────────────────────────────────┤
│  Infrastructure     (LocalStorage Repos, PWA, Data)    │
└────────────────────────────────────────────────────────┘
```

- 의존 방향은 **단방향** (위→아래만). Domain은 어떤 레이어에도 의존하지 않는다.
- Presentation은 React 훅을 통해 Application의 유스케이스를 호출한다.
- Infrastructure는 도메인 인터페이스를 *구현*한다 (의존성 역전).

---

## 3. 폴더 구조

```
revexam/
├── public/
│   ├── icons/                          # PWA 아이콘 (192, 512, maskable)
│   └── ...
├── 개역한글.txt
├── scripts/
│   └── extract-revelation.mjs          # 빌드타임 데이터 추출
├── docs/
│   └── PLAN.md                         # 본 문서
└── src/
    ├── main.tsx
    ├── App.tsx                         # 라우터 + 전역 Provider
    │
    ├── domain/                         # ─── Domain Layer ─────────────
    │   ├── scripture/
    │   │   ├── Chapter.ts
    │   │   ├── Verse.ts
    │   │   └── VerseReference.ts
    │   ├── memorization/
    │   │   └── PracticeSession.ts
    │   ├── examination/
    │   │   ├── TestAttempt.ts
    │   │   └── TestHistory.ts
    │   ├── grading/                    # Shared Kernel
    │   │   ├── Jamo.ts
    │   │   ├── HangulDecomposer.ts
    │   │   ├── LcsAligner.ts
    │   │   └── GradingService.ts
    │   └── preferences/
    │       └── UserPreferences.ts
    │
    ├── application/                    # ─── Application Layer ────────
    │   ├── practice/
    │   │   ├── StartPracticeSession.ts
    │   │   ├── UpdatePracticeTyping.ts
    │   │   └── ClearPracticeSession.ts
    │   ├── examination/
    │   │   ├── StartTestAttempt.ts
    │   │   ├── SubmitTestAttempt.ts
    │   │   ├── ListTestHistory.ts
    │   │   └── GetTestResult.ts
    │   └── preferences/
    │       ├── LoadPreferences.ts
    │       └── UpdatePreferences.ts
    │
    ├── infrastructure/                 # ─── Infrastructure Layer ─────
    │   ├── persistence/
    │   │   ├── localStorageDriver.ts   # 단일 키 + 버저닝
    │   │   ├── LocalStoragePracticeRepository.ts
    │   │   ├── LocalStorageTestHistoryRepository.ts
    │   │   └── LocalStoragePreferencesRepository.ts
    │   ├── data/
    │   │   ├── revelation.ts           # 빌드 산출물
    │   │   └── StaticScriptureRepository.ts
    │   ├── pwa/
    │   │   ├── registerSW.ts
    │   │   └── installPrompt.ts
    │   └── di/
    │       └── container.ts            # 리포지토리 인스턴스 모음
    │
    ├── presentation/                   # ─── Presentation Layer ───────
    │   ├── routes/
    │   │   ├── Home.tsx
    │   │   ├── Practice.tsx
    │   │   ├── Test.tsx
    │   │   ├── TestResult.tsx
    │   │   └── History.tsx
    │   ├── components/
    │   │   ├── layout/  TopBar, Footer
    │   │   ├── home/    Hero, ChapterGrid, ChapterCard, RecentActivity
    │   │   ├── typing/  TypingCanvas, ScoreBadge, ReferenceDrawer
    │   │   └── pwa/     InstallPrompt, UpdateToast
    │   ├── hooks/
    │   │   ├── usePracticeSession.ts
    │   │   ├── useTestAttempt.ts
    │   │   ├── usePreferences.ts
    │   │   ├── useChapterMetadata.ts
    │   │   └── usePwaInstall.ts
    │   └── styles/
    │       ├── tokens.css              # 디자인 토큰 (CSS 변수)
    │       ├── globals.css
    │       └── *.module.css
    │
    └── shared/
        ├── types.ts
        └── result.ts                   # Result<T, E> 타입 (실패 명시)
```

---

## 4. 메인 페이지 디자인

### 4.1 비주얼 컨셉
**"고요한 사색의 공간"** — 신성하지만 무겁지 않게, 모던하지만 차분하게.

### 4.2 디자인 토큰

```css
:root {
  /* Color (Light) */
  --bg:        #FAFAF7;   /* warm paper */
  --surface:   #FFFFFF;
  --surface-2: #F2EFE7;
  --text:      #1A1D24;
  --text-mute: #5C6068;
  --primary:   #B58A3C;   /* warm gold (조금 더 차분) */
  --accent:    #5B7B9A;   /* slate blue */
  --success:   #4A8C5A;
  --warn:      #C28A2C;
  --danger:    #B0463A;
  --border:    #E2DED3;

  /* Color (Dark — auto via media query / data-theme) */
  /* …동일 키, 다크값 */

  /* Typography */
  --font-serif: 'Noto Serif KR', 'Nanum Myeongjo', serif;
  --font-sans:  'Pretendard Variable', 'Pretendard', system-ui, sans-serif;
  --font-mono:  'JetBrains Mono', 'D2Coding', monospace;

  /* Scale (modular) */
  --fs-1: 0.875rem; --fs-2: 1rem; --fs-3: 1.25rem;
  --fs-4: 1.5rem;   --fs-5: 2rem; --fs-6: 2.75rem; --fs-7: 4rem;

  /* Space (4px 그리드) */
  --sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px;
  --sp-6: 24px; --sp-8: 32px; --sp-12: 48px; --sp-16: 64px;

  /* Radius / Shadow / Motion */
  --radius-sm: 8px; --radius-md: 12px; --radius-lg: 20px;
  --shadow-1: 0 1px 2px rgba(0,0,0,.04), 0 4px 16px rgba(0,0,0,.06);
  --shadow-glow: 0 0 0 1px rgba(181,138,60,.3), 0 8px 24px rgba(181,138,60,.15);
  --ease: cubic-bezier(.2,.8,.2,1);
  --dur-fast: 150ms; --dur-base: 250ms; --dur-slow: 400ms;
}
```

### 4.3 메인 화면 구성 (위→아래)

#### 4.3.1 Top Bar (sticky, blur backdrop)
- 좌: 워드마크 "Revexam" (세리프, 작게)
- 우: 다크모드 토글 · 시험 이력 · 설정 · **앱 설치** (PWA prompt 가능 시 노출)

#### 4.3.2 Hero
- 풀와이드 영역, 높이 ~70vh
- 배경: 세로 그라디언트 + 미세한 노이즈 텍스처 + 우측에 흐릿한 황금색 라이트 블롭(blur 120px)
- 좌측 텍스트 블록
  - 라벨: "요한계시록 · 22장" (small caps 느낌의 sans, 텍스트 mute)
  - 헤드라인 (세리프, fs-7): **"마음에 새기는 한 절"**
  - 서브 (sans, fs-3, mute): "자모 단위로 정확하게. 작은 차이도 흐름을 끊지 않게."
  - CTA 그룹:
    - Primary: **"이어서 연습"** (최근 진행 있을 때) → 직전 장으로 이동
    - Secondary: "1장부터 시작"
- 우측 시각 요소
  - **전체 진척 링** (외운 자모 / 전체 자모 비율, 황금색 호) + 중앙 큰 % 숫자
  - 아래 작은 통계 3칸: 외운 장 수 · 평균 정확도 · 연속 학습일

#### 4.3.3 ChapterGrid
- 섹션 헤더: "장 선택" (좌) · 정렬·필터 토글(우, "최근 / 정확도 낮은 순 / 미시작" 등)
- 그리드: 데스크톱 6열 / 태블릿 4열 / 모바일 2열, 22장 카드
- 카드(ChapterCard) 구조:
  - 좌측 띠: 진척에 비례하는 황금 띠 (0~100% 두께)
  - 상단: 큰 세리프 숫자 "3" + 그 아래 "계 3장"
  - 중간: 절 수 미니라벨 (예: "22절"), 마지막 연습 시각
  - 하단: 진행도 게이지 + 마지막 시험 정확도 (있을 때만)
  - hover: 살짝 떠오르며 두 액션 버튼이 페이드인 — **[연습]** **[시험]**

#### 4.3.4 Recent Activity
- 가로 스크롤 가능한 카드 (최근 시험 5개)
- 카드: 장 번호, 정확도(원형 게이지), 소요시간, 날짜 — 클릭 시 결과 페이지

#### 4.3.5 Footer
- 데이터 출처(개역한글) · 버전 · 오픈소스 링크 · 빌드 해시(작게)

### 4.4 인터랙션 디테일
- **카드 hover**: `translateY(-2px)` + `box-shadow: var(--shadow-glow)` (200ms `--ease`)
- **CTA 버튼**: 미세한 광택 sweep (linear-gradient + transform) — 1.2s 주기, hover 시 정지
- **페이지 전환**: 100ms fade-out → 200ms fade+8px slide-up
- **숫자 카운트업**: 진척 링/통계는 마운트 시 0→타깃까지 600ms ease-out
- **포커스 링**: `outline: 2px solid var(--primary); outline-offset: 3px`
- **모션 줄이기**: `@media (prefers-reduced-motion: reduce)` 시 모든 애니메이션 무력화

### 4.5 추가 의존성 (Presentation 한정)
- `framer-motion` — 마운트/전환 애니메이션 (선택; CSS만으로도 충분 시 미사용)
- `lucide-react` — 아이콘
- 폰트: Pretendard / Noto Serif KR (self-host 권장 → 오프라인 PWA 친화)

---

## 5. PWA 적용

### 5.1 목표
- 설치 시 앱처럼 standalone 실행
- **완전 오프라인 동작** (본문은 번들에 포함 → 네트워크 불필요)
- 자동 업데이트 + 사용자 알림

### 5.2 구현: `vite-plugin-pwa` (Workbox 기반)

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*'],
      manifest: {
        name: '계시록 암송 · Revexam',
        short_name: 'Revexam',
        description: '요한계시록을 자모 단위로 외우고 시험 보는 학습 도구',
        lang: 'ko',
        theme_color: '#B58A3C',
        background_color: '#FAFAF7',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon-monochrome.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'monochrome' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /\.(?:woff2?|ttf|otf)$/,
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxAgeSeconds: 60*60*24*60 } },
          },
        ],
      },
    }),
  ],
});
```

### 5.3 캐시 전략
| 자원 | 전략 | 비고 |
|---|---|---|
| App Shell (HTML/JS/CSS) | precache + autoUpdate | 새 버전 자동 다운로드 |
| 본문 데이터 | 번들 포함 (precache 자동) | 오프라인 100% |
| 자체 호스팅 폰트 | precache | self-host 권장 |
| 아이콘/이미지 | precache | |
| LocalStorage | (해당 없음) | 브라우저가 영속화 |

### 5.4 설치 UX
- `beforeinstallprompt`를 가로채 `usePwaInstall` 훅에 보관
- TopBar의 "앱 설치" 버튼 또는 메인 푸터 위 일회성 카드로 노출
- 노출 조건: 첫 방문 ×, 2회 이상 방문 + 1장 이상 진행 ○ (LocalStorage로 판정)
- iOS Safari는 `beforeinstallprompt` 미지원 → "공유 → 홈 화면에 추가" 안내 전용 카드 별도 노출

### 5.5 업데이트 처리
- `registerSW({ onNeedRefresh })` 콜백에서 `UpdateToast` 표시
- 토스트의 "새로고침" 버튼이 SW에 `SKIP_WAITING` → 새 버전 즉시 활성화

### 5.6 오프라인 검증 시나리오
1. 첫 방문 후 모든 자원이 캐시되는지 (DevTools Application 탭)
2. 비행기 모드에서 새로고침 → 정상 부팅
3. 비행기 모드에서 모든 장 연습/시험 동작
4. Lighthouse PWA 카테고리 90+
5. iOS Safari, Android Chrome에서 "홈 화면에 추가" 후 standalone 실행

---

## 6. 데이터 흐름 예시 (연습 모드)

```
[User 타이핑]
   ↓ onInput (composition 가드 통과 후)
[Practice.tsx]
   ↓ useDebouncedCallback(120ms)
[usePracticeSession.update(typed)]
   ↓
[UpdatePracticeTypingUseCase.execute]
   ├─→ ScriptureRepository.getChapter(n)        // 정답 본문
   ├─→ GradingService.grade(target, typed)      // 도메인 서비스
   └─→ PracticeRepository.save(session)         // LocalStorage
   ↓ returns GradeResult
[Practice.tsx setState]
   ↓
[TypingCanvas + ScoreBadge 리렌더]
```

- Domain 서비스는 순수 함수 → 테스트가 쉽다.
- UI는 유스케이스에만 의존, Repository나 LocalStorage를 직접 모르게 둔다.

---

## 7. 구현 단계

| # | 단계 | 산출물 |
|---|---|---|
| 1 | 셋업 | Vite + React + TS + React Router + vite-plugin-pwa, ESLint/Prettier 최소 |
| 2 | 디자인 토큰·글로벌 스타일·폰트 self-host | `tokens.css`, `globals.css` |
| 3 | 데이터 추출 (Scripture) | `scripts/extract-revelation.mjs`, `infrastructure/data/revelation.ts` |
| 4 | Domain 레이어: Hangul, Grading | `domain/grading/*` + Vitest |
| 5 | Domain: Practice/Examination 모델 | 엔티티 + 단위 테스트 |
| 6 | Infrastructure: LocalStorage 리포지토리 + DI 컨테이너 | `infrastructure/persistence/*`, `di/container.ts` |
| 7 | Application: 유스케이스 | `application/**` |
| 8 | Presentation: TopBar + Hero + ChapterGrid + Footer (메인 페이지) | `presentation/**` |
| 9 | Practice / Test / TestResult / History 라우트 | |
| 10 | PWA: manifest, 아이콘, 설치 프롬프트, 업데이트 토스트 | `infrastructure/pwa/*` |
| 11 | 접근성·반응형·Lighthouse 점검 | |
| 12 | 무료 호스팅 배포 | Vercel / Cloudflare Pages / GitHub Pages 중 택1 |

---

## 8. 검증 방법

### 8.1 단위 테스트 (Vitest)
- `HangulDecomposer`: '가', '깎', '닭', '뷁', '한글', 'Hello!', '  ', emoji 등
- `LcsAligner`: 빈 입력, 동일, 일부 누락, 일부 추가, 순서 변경
- `GradingService`: target 100% 일치 → accuracy 100; 종성만 다름 → partial; 한 글자 누락 → LCS가 다음 글자 매칭 유지

### 8.2 수동 시나리오
1. 1장 연습 → 첫 절 정확 입력 → 모두 초록, 100%
2. 종성 누락(예: '있고' → '이고') → 해당 글자만 노랑, 정확도 자연스럽게 감소
3. 중간 한 글자 누락 → 이후도 빨강이 아니라 정상 매칭 유지
4. 새로고침 → 입력이 복원
5. 시험 모드: 입력 중에는 색상 미표시 → 제출 후 결과 페이지에 색상 + 정확도
6. IME 한글 조합 중 화면 깜빡임/오채점 없음
7. 메인: hover 인터랙션, 진척 링 카운트업, 다크모드 토글

### 8.3 PWA·성능
- Lighthouse: Performance 90+ / Accessibility 95+ / Best Practices 100 / PWA 90+
- 비행기 모드 풀 시나리오 통과
- iOS / Android 홈 화면 추가 후 standalone 실행 확인

---

## 9. 향후 확장 (이번 범위 아님)
- 통계 대시보드 (장별 정확도 추이)
- 음성 낭독 / 카드형 한 절 빠른 외우기
- 다른 책(시편 등) 멀티 도메인 확장 → `Scripture` 컨텍스트 일반화
- 키보드 단축키 (다음 절 점프, 토글)
- Web Share API로 결과 공유

---

## 10. 결정 로그
| 결정 | 선택 | 이유 |
|---|---|---|
| 프레임워크 | Vite + React + TS | 사용자 선택, 정적 빌드와 PWA 친화 |
| 상태 관리 | useState/useReducer + 직접 LocalStorage | 도메인이 작아 전역 상태 불필요 |
| 채점 알고리즘 | 자모 LCS | 부분 정답 인정, 한 글자 누락 후에도 정렬 유지 |
| 폰트 | self-host (Pretendard/Noto Serif KR) | 오프라인 PWA에서 안정적 |
| 데이터 형식 | 정적 TS 모듈 | 빌드 산출물에 포함, 오프라인 즉시 사용 |
| 호스팅 | 미정 (정적 정합 — 추후 결정) | Vercel / CF Pages / GH Pages 모두 가능 |
