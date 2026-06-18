# FSRS Integration Plan — Anki-Style SRS + Exams

> Comprehensive implementation plan for adding Anki-style spaced repetition (FSRS) into arena-pro and seamlessly integrating it with the existing Test (exam) module. Built on top of `ts-fsrs`.

---

## Table of Contents

1. [Overview & Goals](#1-overview--goals)
2. [Conceptual Mapping (Anki ↔ arena-pro)](#2-conceptual-mapping-anki--arena-pro)
3. [Data Model](#3-data-model)
4. [Card Lifecycle](#4-card-lifecycle)
5. [Daily Queue Rules](#5-daily-queue-rules)
6. [New-Card Throttling (300/day Problem)](#6-new-card-throttling-300day-problem)
7. [Test Module Integration](#7-test-module-integration)
8. [Exam Question Selection Strategies](#8-exam-question-selection-strategies)
9. [Rating Mapping (Exam Result → FSRS Rating)](#9-rating-mapping-exam-result--fsrs-rating)
10. [Card Update Flow (Post-Submit)](#10-card-update-flow-post-submit)
11. [Conflict & Edge Cases](#11-conflict--edge-cases)
12. [API Surface](#12-api-surface)
13. [Client / Dashboard / Study UI](#13-client--dashboard--study-ui)
14. [File Layout & Implementation Phases](#14-file-layout--implementation-phases)
15. [Backfill & Migration](#15-backfill--migration)
16. [Parameter Optimization](#16-parameter-optimization)
17. [Testing Strategy](#17-testing-strategy)
18. [Risks & Mitigations](#18-risks--mitigations)
19. [Rollout Order](#19-rollout-order)
20. [Open Questions](#20-open-questions)

---

## 1. Overview & Goals

### Goal
Add a spaced-repetition layer on top of arena-pro's existing content (`Space → Subject → Topic → ContentBlock`) so users can:

- Review questions on Anki-style schedules (4-button rating).
- Take exams whose composition is informed by per-card memory state.
- Have exam submissions feed back into the SRS schedule when desired.
- Manage daily intake (new cards), retention, fuzz, etc., per Space.

### Algorithm
Use `ts-fsrs` (TypeScript port of `fsrs-rs`, the Rust crate Anki uses internally). Same 19 parameters, same forgetting curve.

### Non-goals (for v1)
- Mobile sync protocol.
- Multi-device offline sync.
- Audio/image card types beyond what `ContentBlock` already supports.
- Custom note types.

---

## 2. Conceptual Mapping (Anki ↔ arena-pro)

| Anki concept                | arena-pro                                            |
| --------------------------- | ---------------------------------------------------- |
| Deck (root)                 | `Space`                                              |
| Subdeck                     | `Subject`                                            |
| Sub-subdeck                 | `Topic`                                              |
| Note / Card                 | `ContentBlock` (with per-user `ReviewCard` for SRS)  |
| Deck Options (preset)       | `DeckPreset` (new model, per user per Space)         |
| Card state                  | `ReviewCard` (new model)                             |
| Revlog                      | `ReviewLog` (new model)                              |
| Filtered Deck / Cram        | `Test` with `mode='cram'`                            |
| Custom Study                | `Test` with mode-specific `selectionStrategy`        |
| Anki "Optimize" button      | Scheduled job using `fsrs-optimizer`                 |

---

## 3. Data Model

### 3.1 `DeckPreset` (new)

Per-user per-Space scheduling configuration.

```ts
interface IDeckPreset {
  userId: ObjectId;
  spaceId: ObjectId;
  newPerDay: number;          // default 20
  reviewsPerDay: number;      // default 200
  desiredRetention: number;   // default 0.9
  learningSteps: number[];    // minutes, default [1, 10]
  relearningSteps: number[];  // minutes, default [10]
  fsrsWeights?: number[];     // 19 floats, undefined → use defaults
  enableFuzz: boolean;        // default true
  maxInterval: number;        // days, default 36500
}
```

Indexes: `{ userId, spaceId }` unique.

### 3.2 `ReviewCard` (new)

One per `(userId, blockId)` pair. Minted lazily on first encounter.

```ts
interface IReviewCard {
  userId: ObjectId;
  blockId: ObjectId;

  // Denormalized scope (for fast filters)
  spaceId: ObjectId;
  subjectId: ObjectId;
  topicId: ObjectId;

  // FSRS state (from ts-fsrs Card)
  due: Date;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: 0 | 1 | 2 | 3;       // New / Learning / Review / Relearning
  last_review?: Date;

  // Anki-style extras
  introducedAt?: Date;        // first time card entered queue (used for daily new cap)
  suspended: boolean;         // default false
  buriedUntil?: Date;
}
```

Indexes:
- `{ userId, blockId }` unique
- `{ userId, spaceId, due }`
- `{ userId, spaceId, state }`
- `{ userId, suspended }`

### 3.3 `ReviewLog` (new)

Append-only history. One row per answer.

```ts
interface IReviewLog {
  cardId: ObjectId;
  userId: ObjectId;
  rating: 1 | 2 | 3 | 4;
  state: 0 | 1 | 2 | 3;
  due: Date;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  last_elapsed_days: number;
  scheduled_days: number;
  review: Date;

  source: 'review' | 'test' | 'cram' | 'backfill';
  testId?: ObjectId;
}
```

Indexes: `{ userId, cardId, review }`, `{ userId, source }`.

### 3.4 Extensions to existing `Test` model

Add to `ITestConfig`:

```ts
mode?: 'exam' | 'practice' | 'review' | 'cram';   // default 'exam'
selectionStrategy?: 'random' | 'weakness' | 'mastery' | 'balanced'
                  | 'difficulty' | 'spaced' | 'coverage';
feedsFSRS?: boolean;        // default depends on mode (see §7)
examDate?: Date;            // for selectionStrategy='spaced'
targetRetention?: number;   // for 'spaced', default 0.85
```

Optionally, on each `test.questions[i]`, persist the resulting rating + before/after stability for the post-exam report:

```ts
fsrsImpact?: {
  rating: number;
  oldStability: number;
  newStability: number;
  oldDue: Date;
  newDue: Date;
};
```

---

## 4. Card Lifecycle

States from `ts-fsrs`:

```
New (0) → Learning (1) → Review (2) ↔ Relearning (3)
                                     ↑
                                  (lapse)
```

**Transitions:**

| From       | Rating | To                  |
| ---------- | ------ | ------------------- |
| New        | any    | Learning            |
| Learning   | Again  | Learning (restep)   |
| Learning   | Good/Easy | Review           |
| Review     | Again  | Relearning          |
| Review     | Hard/Good/Easy | Review     |
| Relearning | Good   | Review              |
| Relearning | Again  | Relearning (restep) |

Stored per user per block in `ReviewCard.state`.

---

## 5. Daily Queue Rules

`getDailyQueue(userId, spaceId)` returns three buckets in fixed order:

1. **Learning / Relearning** — `state ∈ {1, 3}` AND `due ≤ now`. Always first. Uncapped.
2. **Reviews due today** — `state = 2` AND `due ≤ endOfToday`. Capped at `preset.reviewsPerDay − reviewsDoneToday`.
3. **New cards** — `state = 0`. Capped at `preset.newPerDay − introducedToday`. Lazy-minted from un-carded `ContentBlock`s in scope.

**Rules:**

- Card due today → in queue.
- Card due in 5 days → NOT in queue (only `cram` mode pulls it).
- Card reviewed today, next due later → excluded from same-day refetch.
- Overdue card → still in queue, FSRS uses real `elapsed_days` from last review.
- Suspended or buried-until-future card → excluded.
- Card in any IN_PROGRESS Test → excluded from Review Session queue (avoid double-answer).

---

## 6. New-Card Throttling (300/day Problem)

### Scenario
Author imports 300 ContentBlocks into a Space in one day.

### What happens
- **No ReviewCards minted yet.** ContentBlocks are a latent pool.
- When user opens the Space, `getDailyQueue` mints up to `preset.newPerDay` (default 20) per day.
- 300 blocks → ~15 days to fully introduce at default cap.

### Mitigations against pile-up
1. **Per-user `newPerDay` cap** (in `DeckPreset`).
2. **Fuzz** (±5–10% interval jitter, enabled by default) — spreads due dates.
3. **Load balancer** (optional addon): on scheduling, scan ±N-day window around ideal due date and pick the day with the smallest existing review count for this user+space.
4. **UI warning** if user raises `newPerDay` above e.g. 50: "Daily review load may grow large".
5. **Cram mode** for exam prep — pulls many cards without touching schedule (when `feedsFSRS=false`).

### What we DON'T do
- Don't bulk-create ReviewCards on import. Lazy is mandatory.
- Don't let any code path bypass `newPerDay` cap for normal study (only `cram` ignores it).

---

## 7. Test Module Integration

### 7.1 Modes

| Mode       | Purpose                          | feedsFSRS default | Selection                                |
| ---------- | -------------------------------- | ----------------- | ---------------------------------------- |
| `exam`     | Graded exam simulation           | **false**         | Random or by topic (current behavior)    |
| `practice` | Practice run, feeds schedule     | true              | Random or strategy-driven                |
| `review`   | SRS review session as a Test     | true              | Pulled from `getDailyQueue`              |
| `cram`     | Pre-exam blitz                   | false (opt-in)    | Strategy-driven, ignores daily caps      |

User toggles `feedsFSRS` at creation to override defaults.

### 7.2 Selection Strategy (per mode)

`exam`/`practice`/`cram` can pick from any strategy in §8. `review` uses the daily queue.

### 7.3 Submission Hook

Inside `TestService.submitTest`, after grading each question, **if `test.config.feedsFSRS === true`**:

```ts
const rating = examToRating({ isCorrect, isAttempted, timeSpent, expectedTime, hintsUsed, changesCount });
await applyReview(userId, q.blockId, rating, { source: 'test', testId: test._id });
```

Otherwise: grading happens, score stored, no ReviewCard mutation. Optionally write a `ReviewLog` row with `source: 'test'` and no card change for analytics (or use a separate `ExamAttempt` collection).

### 7.4 Question Snapshotting

Existing behavior already snapshots `blockSnapshot` per question — keep this. Even if the underlying ContentBlock is edited later, the Test's grading remains stable.

---

## 8. Exam Question Selection Strategies

Each strategy returns a list of `blockId`s for the Test.

### 8.1 `random` (current)
Random sample from scope (Space/Subject/Topic). No FSRS signal used.

### 8.2 `weakness`
Lowest current retrievability first. Drills weak spots.

```
score = retrievability(card, now)
sort ascending, take top N
```

### 8.3 `mastery`
Cards with `state = Review` and high stability (≥ 7 days). Tests what user is expected to know.

### 8.4 `balanced`
Bucketed mix:
- 30% weak (R < 0.7)
- 50% medium (0.7 ≤ R < 0.9)
- 20% strong (R ≥ 0.9)

Realistic exam feel.

### 8.5 `difficulty`
`difficulty ≥ 6.5` AND `lapses ≥ 2`. Hard-mode practice.

### 8.6 `spaced` (exam-date aware)
User supplies `examDate`. For each card, predict R on exam day:

```
tOnExam = (examDate - last_review) / 1 day
R(t)    = (1 + (19/81) * tOnExam / stability) ^ -0.5
```

Include cards with predicted `R < targetRetention` (default 0.85). At-risk before exam.

### 8.7 `coverage`
Group by `topicId`. Allocate slots proportionally, weighted inversely by mean retrievability per topic. Weakest topics get more questions.

### 8.8 Composite Priority (general-purpose smart exam)

```
priority = wForget * (1 - R)
        + wOverdue * min(overdueDays / 30, 1)
        + wDifficult * (difficulty / 10)
        + wLapses   * min(lapses / 5, 1)
```

Default weights: `wForget=1.0, wOverdue=0.3, wDifficult=0.2, wLapses=0.1`. Sort descending, take top N. Tune empirically.

### 8.9 Implementation note

Prefer single Mongo aggregation pipeline that computes `retrievability` and `priority` server-side. Avoid loading millions of cards into Node memory.

```js
$pow: [{ $add: [1, { $multiply: [19/81, { $divide: ['$tDays', '$stability'] }] }] }, -0.5]
```

---

## 9. Rating Mapping (Exam Result → FSRS Rating)

`examToRating(q, block, expectedTime) → Rating`:

```
unattempted                → Again
incorrect                  → Again
correct, very fast (<0.4x) → Easy
correct, slow (>1.8x)      → Hard
correct, normal speed      → Good
```

Modifiers (downgrade by one step):
- Hints used (`hintsUsed > 0`).
- Many answer changes (`changesCount > 2`).
- Partial credit on multi-select (e.g. 3/4 correct options) → `Hard` instead of `Again`.

`expectedTime` per `ContentBlockType`:
- `SINGLE_SELECT_MCQ`: 60s
- `MULTI_SELECT_MCQ`: 90s
- `FILL_IN_THE_BLANK`: 45s
- `NOTE`: n/a (skip)

Tunable; expose as `DeckPreset` field if needed later.

---

## 10. Card Update Flow (Post-Submit)

```
submitTest(testId, userId, answers, warnings, timeSpent)
  └─ for each q in test.questions:
       ├─ grade → isCorrect, marksObtained
       ├─ if test.config.feedsFSRS:
       │    ├─ rating = examToRating(q, block, expectedTime)
       │    ├─ card   = ReviewCard.findOne({ userId, blockId }) ?? mintCard()
       │    ├─ preset = DeckPreset.findOne({ userId, spaceId: card.spaceId })
       │    ├─ scheduler = fsrs(preset → params)
       │    ├─ { card: next, log } = scheduler.next(card, now, rating)
       │    ├─ save updated card
       │    ├─ ReviewLog.create({ source: 'test', testId, ...log })
       │    └─ q.fsrsImpact = { rating, oldS, newS, oldDue, newDue }   // for report
       └─ accumulate score
  └─ test.score, test.status = COMPLETED, test.endTime = now
  └─ return test (with fsrsImpact attached per question)
```

Post-exam report on the client shows:
> Card X: was due today → next in 22 days
> Card Y: lapsed → relearning, due in 10 minutes

### 10.1 The FSRS Math: How "Next Review in 4 Days" is Computed

The core of FSRS is the **forgetting curve** — a mathematical model of how memory decays over time:

```
R(t) = (1 + 19/81 × t/S)^(−0.5)

Where:
  R(t)  = probability of recall at time t
  t     = days since last review
  S     = stability (days)
  19/81 ≈ 0.2346  (decay factor constant)
  −0.5  = decay exponent (FSRS5_DEFAULT_DECAY)
```

A worked example: if a card has `stability = 14.5` days and was last reviewed 7 days ago:
```
R(7) = (1 + 0.2346 × 7/14.5)^(−0.5)
     = (1 + 0.1133)^(−0.5)
     = 1.1133^(−0.5)
     ≈ 0.95  → 95% chance of recall today
```

#### What happens when you press a rating button

On each review, `ts-fsrs` recomputes two core values using the **19 FSRS parameters** (w0–w18):

| Output | Symbol | What it means | Example after "Good" |
|--------|--------|---------------|---------------------|
| **New stability** | S_new | Days until recall probability drops to ~90% base | 5.2 days |
| **New difficulty** | D_new | How intrinsically hard this card is (1–10) | 4.5 |
| **Scheduled days** | scheduled_days | Interval until next review | ~5 days |

The new stability is a function of:
```
S_new = f(rating, S_old, D_old, R(t), w0..w18)
```

For a **correct** rating (Good/Easy), stability increases (memory strengthened). For an **incorrect** rating (Again), stability drops sharply.

The scheduled days until next review are then:
```
scheduled_days = S_new × adjust_for_desired_retention
```

Where `desired_retention` (default 0.90) controls how aggressive the schedule is:
- Higher retention (e.g. 0.95) → shorter intervals → more reviews
- Lower retention (e.g. 0.80) → longer intervals → fewer reviews, more forgetting

#### Concrete example: "Next review in 4 days"

```
Initial state (new card):
  Stability: 2.3     (default w2 for first Good)
  Difficulty: 5.0
  Last review: none

User presses Good on a new card:
  → ts-fsrs computes:
      S_new = w2 = 2.3 (first review uses initial weights)
      D_new = w4 = 7.24
      scheduled_days ≈ S_new ≈ 2

Second review (7 days later):
  Load:  S = 2.3,  D = 7.24
  t = 7 days,  R(7) ≈ 0.47 (below desired retention)
  User presses Good again:
  → ts-fsrs computes (simplified):
      S_new = S × w7 × ... = 2.3 × 1.33 × ... ≈ 3.8
      D_new = D - w6 = 7.24 - 1.40 ≈ 5.84
      scheduled_days ≈ 3.8 → "next review in ~4 days"
```

The exact 19 weights and the full formula are documented in `docs/anki-fsrs-deep-dive.md` §4.

---

## 11. Conflict & Edge Cases

| Case | Handling |
| ---- | -------- |
| Same block in active Test and Review Session | Queue excludes blockIds in IN_PROGRESS Tests for this user. |
| Block edited by author after card exists | Card kept (memory is of concept). Optional: bump difficulty if "major edit" flag set. |
| Block deleted | Nightly cron suspends ReviewCards whose `blockId` no longer exists. |
| User submits same Test twice | Second submit rejected (existing logic: `status === COMPLETED` check). |
| Same block answered twice same day (different Tests) | FSRS handles via real `elapsed_days = 0`; short-term step kicks in. |
| Card overdue (due 3 days ago) | Still in queue; scheduler uses real elapsed gap. |
| User clicks Suspend/Bury | `suspended=true` or `buriedUntil=date`. Excluded from queue. |
| User resets Space | Endpoint deletes ReviewCards + ReviewLogs for `(userId, spaceId)`. |
| Exam mode (`feedsFSRS=false`) | No card mutation; optional analytics log only. |
| User switches Space mid-session | Queue is per-Space, no cross-pollution. |
| Card never reviewed but block selected for exam | Mint on the fly inside `applyReview` (handles `null → first review`). |

---

## 12. API Surface

### Review / SRS

```
GET  /api/review/dashboard
GET  /api/review/space/:spaceId/queue
GET  /api/review/cards/:id/preview          # 4-button interval preview
POST /api/review/cards/:id/answer           # body: { rating: 1..4 }
POST /api/review/cards/:id/suspend
POST /api/review/cards/:id/unsuspend
POST /api/review/cards/:id/bury             # body: { until: Date }
POST /api/review/cards/:id/reset            # full reset for this user+block
GET  /api/review/preset/:spaceId
PUT  /api/review/preset/:spaceId            # update newPerDay, retention, etc.
POST /api/review/space/:spaceId/reset       # nuke all SRS state in this Space
```

### Test (extend existing)

```
POST /api/tests                             # body now includes mode, selectionStrategy, feedsFSRS, examDate
GET  /api/tests/:id
POST /api/tests/:id/submit                  # response now includes fsrsImpact per question (if feedsFSRS)
POST /api/tests/:id/progress                # unchanged
```

### Stats / Analytics

```
GET  /api/review/space/:spaceId/forecast    # due cards per day for next 30 days
GET  /api/review/space/:spaceId/heatmap     # answers/day for last 90 days
GET  /api/review/cards/:id/history          # ReviewLog timeline
```

All routes behind auth middleware.

---

## 13. Client / Dashboard / Study UI

> **Full component specifications, props, hooks, state management, routing, and state machines are documented in [`docs/fsrs-fe-components.md`](./fsrs-fe-components.md).**
> This section is a summary; refer to the FE doc for implementation detail.

### 13.1 Dashboard
Per-Space rows:

```
DSA              [12 new] [3 learning] [45 due]   → [Study] [Exam]
Operating Sys    [0  new] [0 learning] [8  due]   → [Study] [Exam]
Networks         [20 new] [0 learning] [0  due]   → [Study] [Exam]
```

### 13.2 Study Page (Anki-style)
- Show question.
- "Show Answer" button → reveals answer + 4 rating buttons with interval labels.
- Buttons (from `preview`): `Again (1m) | Hard (8m) | Good (3d) | Easy (8d)`.
- Press → POST `/cards/:id/answer` → fetch next from queue.
- Header: counts (New / Learning / Review remaining today).

### 13.3 Test Creation Page
- Mode selector: `Exam | Practice | Review | Cram`.
- Strategy selector (when applicable): `Random | Weakness | Balanced | Spaced | Mastery | Hard | Coverage`.
- `feedsFSRS` toggle with default per mode.
- Optional `examDate` picker for `spaced`.
- Scope: Space/Subject/Topic multi-select.
- Question count, duration, marking scheme (existing).

### 13.4 Card Info Modal
- Stability, difficulty, due, last review.
- Mini-timeline of `ReviewLog` entries (rating + date).
- Action buttons: Suspend, Reset, Bury.

### 13.5 Settings (per Space)
- Edit DeckPreset: newPerDay, reviewsPerDay, desiredRetention, fuzz toggle.
- "Optimize parameters" button (greyed out until ≥1000 logs).

---

## 14. File Layout & Implementation Phases

### Phase 1 — Models
```
server/src/models/
  DeckPreset.ts         (new)
  ReviewCard.ts         (new)
  ReviewLog.ts          (new)
  Test.ts               (extend ITestConfig)
```

### Phase 2 — Services
```
server/src/services/
  fsrs.service.ts             (mintCard, applyReview, previewIntervals, getScheduler)
  queue.service.ts            (getDailyQueue, getDashboard, excludeActiveTestBlocks)
  exam-selection.service.ts   (selectWeakness, selectBalanced, selectSpaced, ...)
  test.service.ts             (extend createTest + submitTest)
```

### Phase 3 — Utils
```
server/src/utils/
  fsrs.mapping.ts       (examToRating, retrievability, expectedTimeFor)
  fsrs.adapter.ts       (toFsrsCard, fromFsrsCard)
```

### Phase 4 — Routes
```
server/src/routes/
  review.routes.ts      (new)
  test.routes.ts        (extend)
```

Mount in `server/src/index.ts`:
```ts
app.use('/api/review', authMiddleware, reviewRoutes);
```

### Phase 5 — Client

> **Full component specs, hooks, store, and state machine diagrams in [`docs/fsrs-fe-components.md`](./fsrs-fe-components.md#11-file-layout).**
> Summary of file layout:

```
client/src/
├── pages/
│   ├── ReviewDashboard.tsx       # /review — per-Space SRS status rows
│   ├── StudyPage.tsx             # /review/:spaceId/study — Anki 4-button flow
│   └── SpaceSettings.tsx         # /spaces/:id/settings — DeckPreset editor
├── components/review/
│   ├── QuestionDisplay.tsx       # wraps existing blocks with isStudy prop
│   ├── ShowAnswerButton.tsx      # reveals answer + rating buttons
│   ├── RatingButtons.tsx         # 4-button row: Again | Hard | Good | Easy
│   ├── CorrectAnswer.tsx         # shows the correct answer after reveal
│   ├── CardProgressHeader.tsx    # "5 new · 3 learning · 12 review remaining"
│   ├── CardInfoModal.tsx         # stability/difficulty + ReviewLog timeline
│   └── EmptyQueue.tsx            # "All caught up!" screen
├── hooks/
│   ├── useReview.ts              # useReviewDashboard, useReviewQueue, useSubmitRating
│   ├── useReviewCard.ts          # useCardPreview, useCardHistory, useSuspend, useBury
│   └── useDeckPreset.ts          # useDeckPreset, useUpdateDeckPreset
└── store/
    └── reviewStore.ts            # Zustand store for ephemeral session state
```

Existing components reused with minor additions:
- `McqBlock.tsx` / `FillInTheBlankBlock.tsx` / `NoteBlock.tsx` — add `isStudy` prop
- `App.tsx` — add 3 new routes
- No changes to `api.ts`, `Button.tsx`, `Modal.tsx`, `Card.tsx`

### Phase 6 — Scripts
```
server/scripts/
  backfill-fsrs.ts            (replay history)
  cleanup-orphan-cards.ts     (nightly cron)
  optimize-weights.ts         (weekly cron, ≥1000 logs)
```

---

## 15. Backfill & Migration

For users with existing completed Tests pre-FSRS:

1. Iterate completed Tests in chronological order.
2. For each question:
   - Derive Rating using `examToRating` from stored `isCorrect`/`timeSpent`.
   - Call `applyReview(userId, blockId, rating, { source: 'backfill', now: test.endTime })`.
3. Idempotent: skip if `ReviewLog` exists with matching `(cardId, review)` timestamp.
4. Result: ReviewCards reflect history as if FSRS had always been on.

Run as a one-off `tsx scripts/backfill-fsrs.ts`. Safe to re-run.

---

## 16. Parameter Optimization

- Default `ts-fsrs` ships with pre-trained FSRS-5 weights (w0–w18). Use these initially.
- Once a user has ≥1000 ReviewLogs in a Space, run `compute_parameters` (via `@open-spaced-repetition/fsrs-optimizer` or shell out to the Rust crate).
- Store result in `DeckPreset.fsrsWeights`.
- Show in settings: "Last optimized: 2 days ago, used 3,427 reviews".
- Frequency: weekly cron + manual trigger.

---

## 17. Testing Strategy

### Unit
- `examToRating` truth table (correct × attempted × timeSpent × hints × changes).
- `retrievability(card, now)` math.
- `expectedTimeFor(kind)` per ContentBlockType.
- `toFsrsCard / fromFsrsCard` round-trip.

### Service (with `mongodb-memory-server` + vitest)
- `applyReview` mints on first call.
- `applyReview` advances state across multiple calls.
- `applyReview` increments lapses on Again from Review state.
- `applyReview` writes one ReviewLog per call.
- `getDailyQueue` respects `newPerDay` cap (seed 300 blocks, expect 20).
- `getDailyQueue` excludes suspended cards.
- `getDailyQueue` excludes cards reviewed today.
- `getDailyQueue` excludes cards in IN_PROGRESS Tests.
- Selection strategies return correct counts and ordering.

### Integration (supertest)
- POST /tests with mode='exam', feedsFSRS=false → submit → 0 ReviewCards.
- POST /tests with mode='practice' → submit → ReviewCards advance, ReviewLogs written.
- POST /tests with mode='review' → questions match daily queue.
- POST /cards/:id/answer → card updates, returns next card.
- POST /preset update propagates to next scheduler call.
- Backfill script replay → final state matches incremental.

### Manual / Smoke
1. Seed 300 ContentBlocks in one Space.
2. Open Space → dashboard shows 300 new.
3. Study session → 20 cards shown (cap respected).
4. Answer all 20 with mixed ratings; verify intervals.
5. Day +1 (mock clock): dashboard shows ~20 due + 20 new available.
6. Create exam Test → score works, ReviewCards untouched.
7. Create practice Test → ReviewCards advance, ReviewLogs written.
8. Lapse a card → reappears within session ~10 min later.
9. Resume next day with overdue cards → scheduler uses real `elapsed_days`.

---

## 18. Risks & Mitigations

| Risk | Mitigation |
| ---- | ---------- |
| Pile-up at common intervals | Fuzz + load balancer; warn on high `newPerDay`. |
| Exam pressure pollutes schedule | `feedsFSRS=false` default for `exam` mode. |
| Orphaned cards on block delete | Nightly cleanup job. |
| Double-answer same day across Test + Review | Exclude active-test blockIds from queue. |
| Bad weights pre-optimization | Default to FSRS-5 weights until ≥1000 logs. |
| Mongo performance at scale | Indexed `(userId, spaceId, due)`; aggregation pipelines; bounded result sets. |
| User confusion about modes | Inline help text in TestCreate UI explaining feedsFSRS, strategies. |
| Backfill incorrect | Idempotent; dry-run flag; review on small user sample first. |

---

## 19. Rollout Order

1. **Phase 1–4 (server)** behind feature flag `FSRS_ENABLED`.
2. Default `feedsFSRS=false` for all Tests → zero behavior change for existing exam flow.
3. **Phase 5 (client)** Review Session UI + Dashboard.
4. Flip default `feedsFSRS=true` for `practice` mode tests.
5. **Phase 6 (backfill)** Run replay script on opt-in basis (button in settings).
6. Add `cram` and `spaced` exam modes.
7. **Phase 7 (optimizer)** Once data accumulates, enable periodic weight optimization.
8. Remove feature flag.

---

## 20. Open Questions

1. Should `exam` mode write `ReviewLog` entries (with no card mutation) for analytics, or use a separate `ExamAttempt` collection?
2. Should `cram` mode have a "reschedule on exit" option (Anki's filtered deck behavior)?
3. Should `examToRating` modifiers (hints, changes) be tracked client-side and sent in submit payload?
4. Should `expectedTime` per ContentBlockType be configurable per DeckPreset?
5. Should we support sharing DeckPresets across users (e.g. instructor's recommended settings)?
6. Should we expose Anki-style "Card browser" for power users (filter, bulk suspend, etc.)?
7. Optimizer: shell out to Rust crate, or use TS port `@open-spaced-repetition/fsrs-optimizer`?

---

## Appendix A — Reference: FSRS Math

Forgetting curve:
```
R(t) = (1 + (19/81) * (t / S)) ^ (-0.5)

t = days since last review
S = stability
```

19 parameters (w0–w18): see `docs/anki-fsrs-deep-dive.md` §4.

## Appendix B — Related Files

- `docs/anki-fsrs-deep-dive.md` — How Anki uses fsrs-rs internally.
- `server/src/models/Test.ts` — Existing Test schema.
- `server/src/services/test.service.ts` — Existing submit/grading logic.
- `server/src/models/ContentBlock.ts` — Question content model.

## Appendix C — Libraries

- `ts-fsrs` (https://github.com/open-spaced-repetition/ts-fsrs) — scheduler.
- `@open-spaced-repetition/fsrs-optimizer` — weight training.
- `mongodb-memory-server` — testing.
- `vitest` + `supertest` — test runner.

## Appendix D — Related Documents

- `docs/fsrs-fe-components.md` — Full frontend component specs (props, hooks, store, routing, state machines).
- `docs/anki-fsrs-deep-dive.md` — How Anki's Rust crate integrates FSRS internally.
