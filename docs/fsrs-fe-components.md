# FSRS Frontend Components — Anki-Style Review UI

> Detailed specification for the frontend review components that implement Anki-style spaced repetition in arena-pro. Built on top of the existing React + TypeScript + Tailwind stack.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Component Tree](#2-component-tree)
3. [Routing](#3-routing)
4. [Pages](#4-pages)
5. [Shared Components](#5-shared-components)
6. [Hooks](#6-hooks)
7. [Zustand Store](#7-zustand-store)
8. [React Query Integration](#8-react-query-integration)
9. [Study Session State Machine](#9-study-session-state-machine)
10. [API Surface](#10-api-surface)
11. [File Layout](#11-file-layout)

---

## 1. Overview

This document describes every frontend component needed for the FSRS review system. The design follows these principles:

- **React Query** for server state (dashboard counts, queue, cards, presets)
- **Zustand** for ephemeral session state (current card, queue position, session progress)
- **framer-motion** (already in stack) for card flips, transitions between questions
- **Keyboard shortcuts** (1-4 for ratings, Space for show answer)
- **Existing `<Button />`, `<Modal />`, `<Card />`** components reused throughout
- **Existing `<McqBlock />`, `<FillInTheBlankBlock />`, `<NoteBlock />`** reused in study mode (with a `review` prop)

---

## 2. Component Tree

```
<App>
├── <Navbar />                    — unchanged, will link to /review route
├── <Routes>
│   ├── /review/dashboard         → <ReviewDashboard />
│   ├── /review/:spaceId/study    → <StudyPage />
│   ├── /spaces/:id/settings      → <SpaceSettings />
│   └── (existing routes)
│
<ReviewDashboard>
│   └── <SpaceReviewRow /> × N
│         ├── counts badge (new / learning / due)
│         └── [Study] [Exam] buttons
│
<StudyPage>
│   ├── <CardProgressHeader />
│   ├── [question visible]
│   │   ├── <QuestionDisplay />     — delegates to McqBlock/FillInTheBlank/NoteBlock
│   │   └── <QuestionImage />       — reused
│   ├── [answer revealed]
│   │   ├── <CorrectAnswer />
│   │   └── <RatingButtons />
│   ├── <EmptyQueue />              — shown when queue exhausted
│   └── <CardInfoModal />           — opened via info button
│
<SpaceSettings>
│   └── <DeckPresetForm />
│         ├── newPerDay (number input)
│         ├── reviewsPerDay (number input)
│         ├── desiredRetention (slider 0.70–0.97)
│         ├── enableFuzz (toggle)
│         └── "Optimize Parameters" button
```

---

## 3. Routing

Add the following routes to `client/src/App.tsx`:

| Route | Component | Auth | Description |
|---|---|---|---|
| `/review` | `ReviewDashboard` | RequireAuth | Per-Space review overview |
| `/review/:spaceId/study` | `StudyPage` | RequireAuth | Anki-style study session |
| `/spaces/:id/settings` | `SpaceSettings` | RequireAuth | DeckPreset editor |

Import additions in `App.tsx`:

```tsx
import ReviewDashboard from '@/pages/ReviewDashboard';
import StudyPage from '@/pages/StudyPage';
import SpaceSettings from '@/pages/SpaceSettings';

// Route additions:
<Route path="/review" element={<RequireAuth><ReviewDashboard /></RequireAuth>} />
<Route path="/review/:spaceId/study" element={<RequireAuth><StudyPage /></RequireAuth>} />
<Route path="/spaces/:id/settings" element={<RequireAuth><SpaceSettings /></RequireAuth>} />
```

The Navbar should get a `/review` link (visible only when spacing review is available).

---

## 4. Pages

### 4.1 `ReviewDashboard` (`/review`)

**Purpose:** Show per-Space review counts and entry points.

**Data:** `useReviewDashboard()` hook → `GET /api/review/dashboard`

```tsx
interface SpaceReviewRowProps {
  spaceId: string;
  spaceName: string;
  newCount: number;
  learningCount: number;
  dueCount: number;
  reviewedToday: number;
}
```

**Layout:**
```
┌──────────────────────────────────────────────────────┐
│  Review Dashboard                                    │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │  DSA                            [12 new]     │    │
│  │  ─────────────────────────────  [3  learn]    │    │
│  │  Last reviewed: 2h ago         [45 due]      │    │
│  │                                 [Study] [Exam]│    │
│  └──────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────┐    │
│  │  Operating Systems                [0 new]     │    │
│  │  ─────────────────────────────    [0 learn]   │    │
│  │  Last reviewed: yesterday         [8 due]     │    │
│  │                                 [Study] [Exam]│    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │  All caught up! 🎉                            │    │
│  └──────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

**State:** React Query — automatic refetch every 30s (polling for live counts).

```tsx
export default function ReviewDashboard() {
  const { data, isLoading } = useReviewDashboard();

  if (isLoading) return <SpacesSkeleton />;
  if (!data?.length) return <EmptyState message="No spaces with review data yet." />;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Review Dashboard</h1>
      <div className="space-y-4">
        {data.map(space => <SpaceReviewRow key={space.spaceId} {...space} />)}
      </div>
    </div>
  );
}
```

---

### 4.2 `StudyPage` (`/review/:spaceId/study`)

**Purpose:** The core Anki-style review session. Shows one card at a time, transitions through question → answer → rating → next.

**Data:**
- `useReviewQueue(spaceId)` → `GET /api/review/space/:spaceId/queue` (returns first batch of cards + counts)
- `useSubmitRating()` → `POST /api/review/cards/:id/answer`
- `useCardPreview(cardId)` → `GET /api/review/cards/:id/preview` (4-button interval preview)

**State machine (see §9):**

```
LOADING → QUEUE_EMPTY
        → SHOWING_QUESTION → SHOWING_ANSWER → RATING → (next card or QUEUE_EMPTY)
```

**Component:**

```tsx
export default function StudyPage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const { queue, fetchNext, ... } = useReviewStore();
  const submitRating = useSubmitRating();

  // State
  const [phase, setPhase] = useState<'question' | 'answer' | 'rating'>('question');
  const [currentCard, setCurrentCard] = useState<ReviewCard | null>(null);
  const [preview, setPreview] = useState<RatingPreview | null>(null);

  // Fetch preview when answer is revealed
  const handleShowAnswer = async () => {
    setPhase('answer');
    const previewData = await fetchPreview(currentCard!.cardId);
    setPreview(previewData);
  };

  const handleRating = async (rating: 1 | 2 | 3 | 4) => {
    await submitRating.mutateAsync({ cardId: currentCard!.cardId, rating });
    // Fetch next card from queue
    const next = queue.shift() ?? await fetchNext();
    if (next) {
      setCurrentCard(next);
      setPhase('question');
      setPreview(null);
    } else {
      setPhase('done');
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (phase === 'question' && e.key === ' ') {
        e.preventDefault();
        handleShowAnswer();
      }
      if (phase === 'answer' && ['1','2','3','4'].includes(e.key)) {
        handleRating(Number(e.key) as 1|2|3|4);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, currentCard]);

  if (phase === 'done') return <EmptyQueue />;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <CardProgressHeader
        newCount={queue.newCount}
        learningCount={queue.learningCount}
        reviewCount={queue.reviewCount}
      />
      <div className="mt-8 min-h-[400px] flex flex-col items-center justify-center">
        {phase === 'question' && (
          <>
            <QuestionDisplay block={currentCard.blockSnapshot} />
            <ShowAnswerButton onClick={handleShowAnswer} />
          </>
        )}
        {phase === 'answer' && preview && (
          <>
            <QuestionDisplay block={currentCard.blockSnapshot} showAnswer />
            <CorrectAnswer block={currentCard.blockSnapshot} />
            <RatingButtons preview={preview} onRating={handleRating} />
          </>
        )}
      </div>
    </div>
  );
}
```

---

### 4.3 `SpaceSettings` (`/spaces/:id/settings`)

**Purpose:** Edit FSRS DeckPreset for a Space — controls review scheduling parameters.

**Data:** `useDeckPreset(spaceId)` → `GET /api/review/preset/:spaceId`; mutation via `PUT /api/review/preset/:spaceId`

**Form fields (using `react-hook-form` + `zod`, already in stack):**

```tsx
const settingsSchema = z.object({
  newPerDay: z.number().min(0).max(200),
  reviewsPerDay: z.number().min(0).max(9999),
  desiredRetention: z.number().min(0.70).max(0.97),
  enableFuzz: z.boolean(),
  maxInterval: z.number().min(1).max(36500),
});

type SettingsForm = z.infer<typeof settingsSchema>;

export default function SpaceSettings() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const { data: preset, isLoading } = useDeckPreset(spaceId!);
  const updatePreset = useUpdateDeckPreset();

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    values: preset, // re-populate when loaded
  });

  const onSubmit = (data: SettingsForm) => {
    updatePreset.mutate({ spaceId: spaceId!, ...data });
  };

  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Review Settings</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormField label="New cards per day" error={errors.newPerDay}>
          <Input type="number" {...register('newPerDay', { valueAsNumber: true })} />
        </FormField>
        <FormField label="Reviews per day" error={errors.reviewsPerDay}>
          <Input type="number" {...register('reviewsPerDay', { valueAsNumber: true })} />
        </FormField>
        <FormField label="Desired retention" error={errors.desiredRetention}>
          <Slider
            min={0.70} max={0.97} step={0.01}
            {...register('desiredRetention', { valueAsNumber: true })}
          />
          <span className="text-sm text-muted-foreground mt-1 block">
            {preset?.desiredRetention ?? 0.90}% — higher = more reviews
          </span>
        </FormField>
        <Toggle label="Enable fuzz (spread due dates)" {...register('enableFuzz')} />
        <Button type="submit" disabled={!isDirty || updatePreset.isPending}>
          {updatePreset.isPending ? 'Saving...' : 'Save'}
        </Button>
      </form>

      <hr className="my-8" />

      <div>
        <h2 className="text-lg font-semibold mb-2">Parameter Optimization</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Requires at least 1,000 reviews in this space.
        </p>
        <Button
          variant="outline"
          disabled={!preset?.canOptimize}
        >
          Optimize Parameters
        </Button>
        {preset?.lastOptimized && (
          <p className="text-xs text-muted-foreground mt-2">
            Last optimized: {formatDate(preset.lastOptimized)}
          </p>
        )}
      </div>
    </div>
  );
}
```

---

## 5. Shared Components

### 5.1 `QuestionDisplay`

**Prop: review mode** — reused from existing `<McqBlock>`, `<FillInTheBlankBlock>`, `<NoteBlock>`.

```tsx
interface QuestionDisplayProps {
  block: ContentBlock;
  showAnswer?: boolean;   // when true, highlights correct answers
  isStudy?: boolean;      // review mode: hide submit/reset buttons, disable interaction after reveal
}
```

**Behavior:**
- In study mode (`isStudy={true}`):
  - Show question only (no Submit/Reset buttons)
  - For MCQ: options are visible but NOT clickable (user is recalling, not selecting)
  - For FITB: blanks are visible but NOT editable
  - When `showAnswer={true}`: highlight correct options/fill blanks with correct answers
- Delegates to existing McqBlock/FillInTheBlankBlock/NoteBlock with new `isStudy` prop
- The existing `<McqBlock />` already has a partial `compareMode` prop; adding `isStudy` extends this pattern

### 5.2 `ShowAnswerButton`

```tsx
interface ShowAnswerButtonProps {
  onClick: () => void;
  disabled?: boolean;
}
```

**Implementation:**
```tsx
export function ShowAnswerButton({ onClick, disabled }: ShowAnswerButtonProps) {
  return (
    <Button
      size="lg"
      className="mt-8 w-48"
      onClick={onClick}
      disabled={disabled}
    >
      Show Answer
    </Button>
  );
}
```

- Keyboard shortcut: `Space`
- Animated entrance with framer-motion (`fade-in` + `slide-up`)

### 5.3 `RatingButtons`

```tsx
interface RatingPreview {
  again: { interval: string; label: string };  // e.g. "1m" / "1 minute"
  hard: { interval: string; label: string };
  good: { interval: string; label: string };
  easy: { interval: string; label: string };
}

interface RatingButtonsProps {
  preview: RatingPreview;
  onRating: (rating: 1 | 2 | 3 | 4) => void;
  disabled?: boolean;
}
```

**Implementation:**
```tsx
const RATING_CONFIG = {
  1: { label: 'Again', color: 'bg-red-500 hover:bg-red-600', key: '1' },
  2: { label: 'Hard',  color: 'bg-orange-500 hover:bg-orange-600', key: '2' },
  3: { label: 'Good',  color: 'bg-green-500 hover:bg-green-600', key: '3' },
  4: { label: 'Easy',  color: 'bg-blue-500 hover:bg-blue-600', key: '4' },
} as const;

export function RatingButtons({ preview, onRating, disabled }: RatingButtonsProps) {
  return (
    <div className="flex gap-3 mt-8">
      {([1, 2, 3, 4] as const).map(rating => (
        <button
          key={rating}
          onClick={() => onRating(rating)}
          disabled={disabled}
          className={cn(
            "flex flex-col items-center px-6 py-3 rounded-lg text-white font-semibold transition-all",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            RATING_CONFIG[rating].color
          )}
        >
          <span>{RATING_CONFIG[rating].label}</span>
          <span className="text-xs opacity-80 mt-1">
            {preview?.[RATING_CONFIG[rating].label.toLowerCase() as keyof RatingPreview]?.interval ?? '—'}
          </span>
        </button>
      ))}
    </div>
  );
}
```

**Layout (desktop):**
```
  [Again]   [Hard]   [Good]   [Easy]
   (1m)     (8m)     (3d)     (8d)
```

**Keyboard:** keys `1` `2` `3` `4` directly trigger the rating.

### 5.4 `CorrectAnswer`

Shows the correct answer(s) after the user has attempted recall:

```tsx
interface CorrectAnswerProps {
  block: ContentBlock;
}

export function CorrectAnswer({ block }: CorrectAnswerProps) {
  if (block.kind === 'single_select_mcq' || block.kind === 'multi_select_mcq') {
    const correctOptions = block.options.filter(o => o.isCorrect);
    return (
      <div className="mt-4 p-4 bg-success/10 border border-success/30 rounded-md">
        <p className="text-sm font-medium text-success">Correct answer:</p>
        <ul className="mt-1 space-y-1">
          {correctOptions.map(o => (
            <li key={o.id} className="text-foreground"><LatexText text={o.text} /></li>
          ))}
        </ul>
      </div>
    );
  }

  if (block.kind === 'fill_in_the_blank') {
    return (
      <div className="mt-4 p-4 bg-success/10 border border-success/30 rounded-md">
        <p className="text-sm font-medium text-success">Correct answer:</p>
        <p className="mt-1 text-foreground">{block.blankAnswers.join(', ')}</p>
      </div>
    );
  }

  if (block.kind === 'note') {
    return (
      <div className="mt-4 p-4 bg-muted rounded-md">
        <p className="text-sm font-medium">Note content:</p>
        <p className="mt-1 text-foreground whitespace-pre-wrap">{block.content}</p>
      </div>
    );
  }

  return null;
}
```

### 5.5 `CardProgressHeader`

```tsx
interface CardProgressHeaderProps {
  newCount: number;
  learningCount: number;
  reviewCount: number;
  total?: number;
}
```

Render:
```
  [ 12 new ] [ 3 learning ] [ 45 review ]     ████████░░ 78% complete
```

### 5.6 `EmptyQueue`

Shown when the daily queue is exhausted:

```tsx
export function EmptyQueue() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <CheckCircle2 className="w-16 h-16 text-success mb-4" />
      <h2 className="text-2xl font-bold mb-2">All caught up!</h2>
      <p className="text-muted-foreground mb-6">
        You've reviewed everything due today. Come back tomorrow.
      </p>
      <Button onClick={() => navigate('/review')}>Back to Dashboard</Button>
    </div>
  );
}
```

### 5.7 `CardInfoModal`

Opened via an info `(i)` button next to the rating buttons. Shows:
- Stability (S) and difficulty (D) values
- Current due date vs next due date
- Number of reviews / lapses
- Mini-timeline of recent ReviewLog entries (rating + date)

Uses the existing `<Modal>` component.

```tsx
interface CardInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardId: string;
}

// Data: GET /api/review/cards/:id/history
```

---

## 6. Hooks

### 6.1 `useReviewDashboard`

```tsx
function useReviewDashboard(): {
  data: SpaceReviewRow[] | undefined;
  isLoading: boolean;
  error: Error | null;
}
```

**Implementation:**
```tsx
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface SpaceReviewRow {
  spaceId: string;
  spaceName: string;
  newCount: number;
  learningCount: number;
  dueCount: number;
  reviewedToday: number;
}

export function useReviewDashboard() {
  return useQuery<SpaceReviewRow[]>({
    queryKey: ['review', 'dashboard'],
    queryFn: () => api.get('/review/dashboard').then(r => r.data),
    refetchInterval: 30_000, // poll every 30s
  });
}
```

### 6.2 `useReviewQueue`

```tsx
function useReviewQueue(spaceId: string): {
  fetchNext: () => Promise<ReviewCard | null>;
  prefetch: () => Promise<void>;
}
```

Fetches the first batch of cards from `GET /api/review/space/:spaceId/queue`. Stores in Zustand. Fetches next batch when nearly exhausted.

### 6.3 `useSubmitRating`

```tsx
function useSubmitRating(): {
  mutateAsync: (params: { cardId: string; rating: 1|2|3|4 }) => Promise<ReviewCard>;
  isPending: boolean;
}
```

- Calls `POST /api/review/cards/:id/answer`
- On success: invalidates the dashboard and queue queries
- Shows toast on error

### 6.4 `useCardPreview`

```tsx
function useCardPreview(cardId: string): {
  data: RatingPreview | undefined;
  refetch: () => void;
}
```

- Fetches `GET /api/review/cards/:id/preview`
- Returns the 4-button interval preview (cached until answer is revealed)

### 6.5 `useDeckPreset` / `useUpdateDeckPreset`

```tsx
function useDeckPreset(spaceId: string): {
  data: DeckPreset | undefined;
  isLoading: boolean;
}

function useUpdateDeckPreset(): {
  mutateAsync: (data: Partial<DeckPreset>) => Promise<void>;
  isPending: boolean;
}
```

---

## 7. Zustand Store

The study session needs ephemeral state that doesn't persist across page navigations (not cached by React Query):

```tsx
// client/src/store/reviewStore.ts

interface ReviewCard {
  cardId: string;
  blockSnapshot: ContentBlock;
}

interface ReviewStore {
  // Queue state
  queue: ReviewCard[];
  hasMore: boolean;
  isLoading: boolean;

  // Session counts
  newCount: number;
  learningCount: number;
  reviewCount: number;
  reviewedInSession: number;

  // Actions
  setQueue: (cards: ReviewCard[], counts: Counts) => void;
  appendToQueue: (cards: ReviewCard[]) => void;
  shiftQueue: () => ReviewCard | undefined;
  incrementReviewed: () => void;
  reset: () => void;
}

export const useReviewStore = create<ReviewStore>((set, get) => ({
  queue: [],
  hasMore: true,
  isLoading: false,
  newCount: 0,
  learningCount: 0,
  reviewCount: 0,
  reviewedInSession: 0,

  setQueue: (cards, counts) => set({
    queue: cards,
    hasMore: cards.length > 0,
    ...counts,
  }),

  appendToQueue: (cards) => set(state => ({
    queue: [...state.queue, ...cards],
  })),

  shiftQueue: () => {
    const [first, ...rest] = get().queue;
    set({ queue: rest });
    return first;
  },

  incrementReviewed: () => set(state => ({
    reviewedInSession: state.reviewedInSession + 1,
  })),

  reset: () => set({
    queue: [],
    hasMore: true,
    isLoading: false,
    newCount: 0,
    learningCount: 0,
    reviewCount: 0,
    reviewedInSession: 0,
  }),
}));
```

---

## 8. React Query Integration

### Query Key Convention

```
['review', 'dashboard']                                    → GET /review/dashboard
['review', 'queue', spaceId]                               → GET /review/space/:spaceId/queue
['review', 'card', cardId, 'preview']                      → GET /review/cards/:id/preview
['review', 'card', cardId, 'history']                      → GET /review/cards/:id/history
['review', 'preset', spaceId]                              → GET /review/preset/:spaceId
['review', 'forecast', spaceId]                             → GET /review/space/:spaceId/forecast
['review', 'heatmap', spaceId]                              → GET /review/space/:spaceId/heatmap
```

### Invalidation Flows

| Action | Invalidate |
|---|---|
| Submit rating (`POST /cards/:id/answer`) | `['review', 'queue', spaceId]`, `['review', 'dashboard']`, `['review', 'card', cardId, 'preview']` |
| Update preset (`PUT /review/preset/:spaceId`) | `['review', 'preset', spaceId]` |
| Suspend/bury card | `['review', 'queue', spaceId]`, `['review', 'dashboard']` |
| Reset space | `['review', 'dashboard']` |

---

## 9. Study Session State Machine

```
                    ┌──────────┐
                    │  LOADING │
                    └────┬─────┘
                         │ queue fetched
                         ▼
                   ┌───────────┐
            ┌──────│ QUEUE_LOAD │◄──────────────────────┐
            │      │  (hasMore)│                        │
            │      └─────┬─────┘                        │
            │            │ shift first                   │
            │            ▼                               │
            │      ┌───────────────┐                     │
            │      │ SHOWING_QUES  │                     │
            │      │   TION        │                     │
            │      └───────┬───────┘                     │
            │              │ Space / "Show Answer"        │
            │              ▼                             │
            │      ┌───────────────┐                     │
            │      │ SHOWING_ANS   │                     │
            │      │   WER         │                     │
            │      └───────┬───────┘                     │
            │              │ key 1/2/3/4                  │
            │              ▼                             │
            │      ┌───────────────┐                     │
            │      │   RATING      │                     │
            │      │  (in flight)  │                     │
            │      └───────┬───────┘                     │
            │              │ API responds                 │
            │              ▼                             │
            │     ┌────────────────┐                     │
            │     │ queue has next │   queue exhausted    │
            │     │     card?      ├── but hasMore=true   │
            │     └───┬────────┬───┘                     │
            │         │ yes    │ no (fetch more)          │
            │         ▼        │                          │
            │     SHOWING_QUES │  ┌───────────────┐       │
            │      (loop)      └─►│ FETCHING_MORE │───────┘
            │                     └───────┬───────┘
            │                     failed  │ success
            │                     ▼        ▼
            │               ┌────────┐ ┌──────────┐
            │               │ ERROR  │ │ QUEUE_LOAD│
            │               │ (toast)│ │ (loop)    │
            │               └────────┘ └──────────┘
            │
            │                              ┌────────────┐
            │                              │  DONE      │
            │                              │  (all done)│
            └─────────────────────────────►│  EmptyQueue│
                                           └────────────┘
```

The `hasMore` flag from the queue API indicates whether more cards exist (but weren't fetched yet due to pagination). When the local queue runs out and `hasMore === true`, fetch the next batch via `fetchNext()`.

---

## 10. API Surface

For reference, the endpoints the frontend consumes:

| Method | Endpoint | Hook | Purpose |
|--------|----------|------|---------|
| GET | `/api/review/dashboard` | `useReviewDashboard` | Per-Space review counts |
| GET | `/api/review/space/:spaceId/queue` | `useReviewQueue` | Daily queue with first batch of cards |
| GET | `/api/review/cards/:id/preview` | `useCardPreview` | 4-button interval preview for display |
| POST | `/api/review/cards/:id/answer` | `useSubmitRating` | Submit rating, returns updated card state |
| POST | `/api/review/cards/:id/suspend` | `useReviewCard` | Suspend card (hide from queue) |
| POST | `/api/review/cards/:id/unsuspend` | `useReviewCard` | Un-suspend card |
| POST | `/api/review/cards/:id/bury` | `useReviewCard` | Bury until date |
| POST | `/api/review/cards/:id/reset` | `useReviewCard` | Reset card to New state |
| GET | `/api/review/cards/:id/history` | `useReviewCard` | ReviewLog timeline for a card |
| GET | `/api/review/preset/:spaceId` | `useDeckPreset` | Get current DeckPreset |
| PUT | `/api/review/preset/:spaceId` | `useUpdateDeckPreset` | Update DeckPreset |
| GET | `/api/review/space/:spaceId/forecast` | — | Due cards per day for next 30 days |
| GET | `/api/review/space/:spaceId/heatmap` | — | Answers per day for last 90 days |
| POST | `/api/review/space/:spaceId/reset` | — | Nuke all SRS state in this Space |

All routes require auth (JWT in `Authorization` header, handled by existing Axios interceptor).

---

## 11. File Layout

```
client/src/
├── pages/
│   ├── ReviewDashboard.tsx       # /review — per-Space SRS status rows
│   ├── StudyPage.tsx             # /review/:spaceId/study — Anki 4-button flow
│   └── SpaceSettings.tsx         # /spaces/:id/settings — DeckPreset editor
│
├── components/review/
│   ├── QuestionDisplay.tsx       # wraps McqBlock/FillInTheBlankBlock/NoteBlock with isStudy prop
│   ├── ShowAnswerButton.tsx      # reveals answer + rating buttons
│   ├── RatingButtons.tsx         # 4-button row: Again | Hard | Good | Easy
│   ├── CorrectAnswer.tsx         # shows the correct answer(s) after reveal
│   ├── CardProgressHeader.tsx    # "5 new · 3 learning · 12 review remaining"
│   ├── CardInfoModal.tsx         # stability/difficulty + ReviewLog timeline
│   └── EmptyQueue.tsx            # "All caught up!" screen
│
├── hooks/
│   ├── useReview.ts              # useReviewDashboard, useReviewQueue, useSubmitRating
│   ├── useReviewCard.ts          # useCardPreview, useCardHistory, useSuspend, useBury
│   └── useDeckPreset.ts          # useDeckPreset, useUpdateDeckPreset
│
└── store/
    └── reviewStore.ts            # Zustand store for ephemeral session state
```

No changes needed to existing:
- `client/src/lib/api.ts` — already handles JWT + error redirects
- `client/src/components/common/Button.tsx`, `Modal.tsx`, `Card.tsx` — reused
- `client/src/components/content-blocks/McqBlock.tsx` etc — minor `isStudy` prop addition
- `client/src/App.tsx` — add 3 new routes
