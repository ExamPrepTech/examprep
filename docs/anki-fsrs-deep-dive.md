# How Anki Uses FSRS (Rust) — Deep Dive

> A complete reference on how `ankitects/anki` integrates the `fsrs` Rust crate, every function called, every parameter used, and how it maps to `ts-fsrs` in your own app.

---

## 1. The Big Picture

Anki does NOT implement the FSRS algorithm itself. It delegates entirely to a dedicated Rust crate:

```
ankitects/anki  (the app)
    └── rslib/   (Rust backend, ~80% of Anki's logic)
            └── uses crate: fsrs   (from open-spaced-repetition/fsrs-rs)
```

The `fsrs` crate is published at [crates.io/crates/fsrs](https://crates.io/crates/fsrs) and its source is at [github.com/open-spaced-repetition/fsrs-rs](https://github.com/open-spaced-repetition/fsrs-rs).

Anki integrated FSRS natively starting with **version 23.10** (October 2023), merged via PR #2654 and PR #2633. Before that, users had to paste custom JavaScript scheduling code manually.

---

## 2. Anki's Folder Structure for FSRS

Inside `ankitects/anki`, all FSRS logic lives under:

```
rslib/
└── src/
    └── scheduler/
        └── fsrs/
            ├── mod.rs         ← module entry, re-exports
            ├── params.rs      ← compute_fsrs_weights() — optimizer
            ├── retention.rs   ← desired retention + simulate reviews
            └── weights.rs     ← build FSRSItems from revlog history
```

And FSRS is used across the rest of `rslib/src/` wherever cards are displayed or scheduled:

| File | FSRS Usage |
|------|------------|
| `browser_table.rs` | imports `fsrs::FSRS`, `fsrs::FSRS5_DEFAULT_DECAY` to display retrievability in the card browser |
| `storage/sqlite.rs` | imports `fsrs::FSRS`, `fsrs::FSRS5_DEFAULT_DECAY` for SQL-level retrievability queries |
| `scheduler/fsrs/params.rs` | calls `compute_parameters()` — the optimizer |
| `scheduler/fsrs/retention.rs` | calls `fsrs.next_states()` for simulation |
| `scheduler/fsrs/weights.rs` | builds `FSRSItem` from the user's revlog history |
| `revlog/mod.rs` | stores `ease_factor` — when FSRS is active, difficulty is normalized to 100–1100 range |

---

## 3. The `fsrs` Crate API — What Anki Actually Calls

### 3.1 Setup — Creating the Scheduler

```rust
use fsrs::FSRS;

// Default — uses the pre-trained FSRS-5 parameters
let fsrs = FSRS::default();

// With custom parameters (after optimization)
// Parameters is [f32; 19] — 19 weights trained from the user's review history
let fsrs = FSRS::new(Some(&parameters))?;
```

**How Anki uses it:**
In `browser_table.rs` and `sqlite.rs`, Anki creates `FSRS::default()` to compute retrievability values for display. In the scheduler itself, it uses the per-deck-preset parameters stored in the deck config.

---

### 3.2 Core Scheduling — `next_states()`

This is the main scheduling function. It returns what interval each rating button would give.

```rust
use fsrs::{FSRS, MemoryState};

let fsrs = FSRS::default();

let next_states = fsrs.next_states(
    previous_state,   // Option<MemoryState> — None for new cards
    desired_retention, // f32, e.g. 0.9 means 90% recall chance at due date
    elapsed_days,     // u32 — days since last review (0 for new cards)
)?;

// Returns NextStates { again, hard, good, easy }
// Each contains: { memory: MemoryState, interval: f32 }
let interval_days = next_states.good.interval.round().max(1.0) as u32;
let memory_state  = next_states.good.memory; // persist this in DB
```

**Parameters explained:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `previous_state` | `Option<MemoryState>` | `None` for a brand-new card. For reviewed cards, pass the saved `MemoryState` from the last review |
| `desired_retention` | `f32` | Target recall probability at the due date. Anki default: **0.9** (90%). Range: 0.70 – 0.97 |
| `elapsed_days` | `u32` | Days since the last review. For new cards: `0` |

**Return type `NextStates`:**

```rust
pub struct NextStates {
    pub again: ItemState,  // rating 1 — forgot
    pub hard:  ItemState,  // rating 2 — difficult
    pub good:  ItemState,  // rating 3 — correct
    pub easy:  ItemState,  // rating 4 — easy
}

pub struct ItemState {
    pub memory:   MemoryState,  // save this to DB
    pub interval: f32,          // days until next review
}
```

---

### 3.3 `MemoryState` — The Card State to Persist

This is what you store in your database per card. It replaces the SM-2 `interval + ease_factor` pair.

```rust
pub struct MemoryState {
    pub stability:  f32,  // S — how long the memory lasts
    pub difficulty: f32,  // D — how hard this card is (1.0 – 10.0)
}
```

| Field | What It Means | Typical Range |
|-------|--------------|---------------|
| `stability` | Days until 90% recall drops to ~50%. Higher = longer interval. | 0.4 – 100+ |
| `difficulty` | How hard this card is intrinsically. Starts ~5.0, adjusts per review. | 1.0 – 10.0 |

**How Anki stores it:**
In the SQLite database, these are stored in the `cards` table columns:
- `stability` → stored in `data` JSON blob as `"s"` 
- `difficulty` → stored in `data` JSON blob as `"d"`
- `desired_retention` → stored per deck preset in `dconf` table

---

### 3.4 Parameter Optimization — `compute_parameters()`

This is what Anki's "Optimize" button calls. It trains 19 FSRS weights from the user's review history.

```rust
use fsrs::{ComputeParametersInput, FSRSItem, FSRSReview, compute_parameters};

// Build FSRSItems from revlog history
// Each FSRSItem is a review sequence for one card
let items: Vec<FSRSItem> = build_from_revlog(revlog);

let result = compute_parameters(ComputeParametersInput {
    train_set:           items,    // review history from all cards
    progress:            None,     // optional progress callback
    ..Default::default()
})?;

// result.parameters is [f32; 19] — store this per deck preset
let parameters: Vec<f32> = result.parameters;
```

**`FSRSItem` structure — how review history is encoded:**

```rust
pub struct FSRSItem {
    pub reviews: Vec<FSRSReview>,
}

pub struct FSRSReview {
    pub rating:  u32,  // 1=Again, 2=Hard, 3=Good, 4=Easy
    pub delta_t: u32,  // days since previous review (0 for first review)
}
```

**How Anki builds FSRSItems from its revlog:**

From `rslib/src/scheduler/fsrs/weights.rs`:

> For revlog history `[review_1, review_2, review_3]`, Anki creates multiple FSRSItems with progressively longer sequences:
> - `FSRSItem { reviews: [review_1, review_2] }`
> - `FSRSItem { reviews: [review_1, review_2, review_3] }`
>
> A card with only one review is skipped entirely (`.skip(1)` in the source).

---

### 3.5 Retrievability — `memory_state_retrievability()`

Used for displaying "Retrievability: 87%" in the card browser.

```rust
use fsrs::{FSRS, MemoryState, FSRS5_DEFAULT_DECAY};

let fsrs = FSRS::default();

// How likely you are to recall this card RIGHT NOW
let retrievability = fsrs.memory_state_retrievability(
    MemoryState { stability: 14.5, difficulty: 4.2 },
    days_since_review, // u32
);
// Returns f32, e.g. 0.87 = 87% chance of recall
```

**How Anki uses it:**
Both `browser_table.rs` and `sqlite.rs` import `FSRS5_DEFAULT_DECAY` alongside `FSRS` to compute retrievability for display in the card browser column and SQL queries.

---

### 3.6 Historical Memory States — `historical_memory_states()`

Used to reconstruct a card's memory state from its full revlog (for cards that were reviewed before FSRS was enabled).

```rust
let states: Vec<MemoryState> = fsrs.historical_memory_states(
    &item,           // FSRSItem — the full review history
    starting_state,  // Option<MemoryState> — None to start from scratch
)?;
// Returns one MemoryState per review in the history
```

Anki calls this when the user clicks "Reschedule cards based on your review history" after enabling FSRS.

---

## 4. The 19 FSRS Parameters (Weights)

FSRS uses exactly **19 trainable parameters** (w0–w18). These are what Anki's optimizer produces and what you pass to `FSRS::new(Some(&params))`.

| Index | Name | Default Value | Role |
|-------|------|---------------|------|
| w0 | Initial stability (Again) | 0.40 | Stability after first Again answer |
| w1 | Initial stability (Hard) | 0.90 | Stability after first Hard answer |
| w2 | Initial stability (Good) | 2.30 | Stability after first Good answer |
| w3 | Initial stability (Easy) | 10.90 | Stability after first Easy answer |
| w4 | Initial difficulty | 7.24 | Starting difficulty for a new card |
| w5 | Difficulty change (Hard) | 0.50 | How much Hard increases difficulty |
| w6 | Difficulty change (Easy) | 1.40 | How much Easy decreases difficulty |
| w7 | Stability increase (correct) | 1.33 | Multiplier for stability on correct review |
| w8 | Stability decay modifier | 0.10 | How fast stability decays |
| w9 | SInc penalty (hard) | 1.05 | Stability increase penalty for Hard |
| w10 | SInc bonus (easy) | 1.90 | Stability increase bonus for Easy |
| w11 | SInc modifier (difficulty) | 2.18 | How difficulty affects stability increase |
| w12 | SInc modifier (stability) | 0.03 | How current stability affects increase |
| w13 | SInc modifier (retrievability)| 0.22 | How recall probability affects stability |
| w14 | Stability after failure (base) | 1.38 | Base recovery stability after failure |
| w15 | Stability after failure (D) | 0.68 | Difficulty effect on failure recovery |
| w16 | Stability after failure (S) | 0.11 | Stability effect on failure recovery |
| w17 | Stability after failure (R) | 1.00 | Retrievability at failure effect |
| w18 | Short-term schedule modifier | 0.16 | Controls same-day scheduling |

**Default parameter array in ts-fsrs** (same values):

```typescript
import { generatorParameters } from 'ts-fsrs';

const params = generatorParameters();
// params.w = [0.40, 0.90, 2.30, 10.90, 7.24, 0.50, 1.40, 1.33,
//             0.10, 1.05, 1.90, 2.18, 0.03, 0.22, 1.38, 0.68,
//             0.11, 1.00, 0.16]
```

---

## 5. Key Constants Anki Uses

```rust
// From browser_table.rs and sqlite.rs
use fsrs::FSRS5_DEFAULT_DECAY;
// Value: -0.5
// Used in the forgetting curve formula: R = (1 + FACTOR * t/S) ^ DECAY
// Where FACTOR = 19/81, t = elapsed_days, S = stability
```

The retrievability formula is:

```
R(t) = (1 + (19/81) * (t / S)) ^ (-0.5)

Where:
  t = days since last review
  S = stability
```

---

## 6. How Anki Stores Card State in SQLite

From `rslib/src/revlog/mod.rs`:

```sql
-- cards table
-- When FSRS is active, the 'data' column JSON contains:
{
  "s": 14.52,   -- stability (MemoryState.stability)
  "d": 4.18,    -- difficulty (MemoryState.difficulty)
  "dr": 0.9     -- desired_retention (per deck preset, not per card)
}

-- The 'factor' column (ease_factor) stores difficulty as:
-- 100 * difficulty   →  normalized to 100-1100 range
-- (so FSRS difficulty=0 can be distinguished from SM-2 ease factor)
```

From `revlog` table:

```
button_chosen  →  rating (1=Again, 2=Hard, 3=Good, 4=Easy)
ivl (interval) →  positive = days, negative = seconds (for same-day)
lastIvl        →  previous interval
ease_factor    →  FSRS: 100 * difficulty (100–1100 range)
```

---

## 7. Deck Config — Where Parameters Live

FSRS parameters are stored **per deck preset** (not per card, not per deck directly). From `rslib/src/deckconfig/`:

```protobuf
// proto definition (proto/anki/deckconfig.proto)
message DeckConfig {
  repeated float fsrs_weights = 1;      // the 19 w0–w18 values
  float desired_retention = 2;          // e.g. 0.90
  bool fsrs = 3;                        // toggle FSRS on/off
  int32 ignore_revlogs_before_ms = 4;   // for optimizer: cutoff date
}
```

In Rust (simplified):

```rust
// When scheduling a card, Anki looks up the card's deck preset:
let config = self.get_deck_config(deck_id)?;
let weights = &config.fsrs_weights;  // Vec<f32> of 19 values
let desired_retention = config.desired_retention;  // f32

// Then creates the scheduler with those weights:
let fsrs = if weights.is_empty() {
    FSRS::default()          // use global FSRS-5 defaults
} else {
    FSRS::new(Some(weights))? // use this deck's optimized weights
};
```

---

## 8. The Complete Scheduling Flow in Anki (Step by Step)

When a user presses Good on a card, Anki does this:

```
1. Look up card's deck → get deck preset → get fsrs_weights + desired_retention

2. Load card's current MemoryState from cards.data JSON:
   { stability: card.s, difficulty: card.d }

3. Compute elapsed_days:
   elapsed_days = (now - card.last_review_date).days

4. Call fsrs.next_states(
       Some(memory_state),
       desired_retention,
       elapsed_days
   )

5. User pressed Good → pick next_states.good:
   new_memory   = next_states.good.memory    (new stability + difficulty)
   interval     = next_states.good.interval  (days until next review)

6. Apply "fuzz" (±5–10% random jitter) to interval so cards
   don't all pile up on the same day

7. Update card in DB:
   cards.due          = today + interval
   cards.data.s       = new_memory.stability
   cards.data.d       = new_memory.difficulty
   cards.factor       = new_memory.difficulty * 100   (for revlog compat)

8. Write revlog entry:
   revlog.button_chosen = 3  (Good)
   revlog.ivl           = interval
   revlog.factor        = new_memory.difficulty * 100
```

---

## 9. Mapping: Anki Rust → ts-fsrs TypeScript

| Anki Rust (fsrs crate) | ts-fsrs TypeScript | Notes |
|---|---|---|
| `FSRS::default()` | `fsrs(generatorParameters())` | Both use same default w0–w18 |
| `FSRS::new(Some(&weights))` | `fsrs({ ...generatorParameters(), w: weights })` | Custom weights |
| `fsrs.next_states(state, retention, elapsed)` | `f.repeat(card, now)` | ts-fsrs uses date, Rust uses days directly |
| `MemoryState { stability, difficulty }` | `Card { stability, difficulty, ... }` | ts-fsrs Card has more fields |
| `next_states.good.interval` | `scheduling[Rating.Good].card.scheduled_days` | Both in days |
| `next_states.good.memory` | `scheduling[Rating.Good].card` | Save this back to DB |
| `compute_parameters(input)` | `@open-spaced-repetition/fsrs-optimizer` (separate pkg) | Training not in ts-fsrs core |
| `fsrs.memory_state_retrievability(state, days)` | Not directly exposed | ts-fsrs: compute manually |
| `FSRSReview { rating, delta_t }` | `{ rating: Rating, elapsed_days: number }` | Same concept |

---

## 10. ts-fsrs Equivalent of Anki's Full Flow

```typescript
import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  Card,
  RecordLog,
} from 'ts-fsrs';

// ── Step 1: Setup (equivalent to FSRS::new(Some(&weights))) ─────────
const params = generatorParameters({
  // optionally override defaults — equivalent to Anki's per-preset weights
  request_retention: 0.90,   // Anki's desired_retention
  // w: [0.40, 0.90, 2.30, ...] ← plug in optimized weights here
});
const f = fsrs(params);

// ── Step 2: New card (equivalent to MemoryState = None) ──────────────
let card: Card = createEmptyCard();

// ── Step 3: Schedule (equivalent to fsrs.next_states()) ─────────────
const now = new Date();
const scheduling: RecordLog = f.repeat(card, now);

// ── Step 4: User picks a rating ──────────────────────────────────────
const result = scheduling[Rating.Good];
const updatedCard = result.card;     // ← save to DB (has stability, difficulty)
const log         = result.log;      // ← save to reviewLog table

console.log('Next review in:', updatedCard.scheduled_days, 'days');
console.log('Due date:', updatedCard.due);
console.log('Stability:', updatedCard.stability);
console.log('Difficulty:', updatedCard.difficulty);

// ── Step 5: Subsequent reviews ───────────────────────────────────────
// On next review, load updatedCard from DB and call f.repeat() again
const nextScheduling = f.repeat(updatedCard, new Date());
```

---

## 11. Anki's Optimizer Flow (What "Optimize" Button Does)

```
User clicks "Optimize" in Deck Options
        ↓
Anki calls: Collection::compute_fsrs_weights(search_query)
        ↓
rslib/src/scheduler/fsrs/params.rs → compute_weights()
        ↓
Fetch all revlogs matching the search (e.g. deck:MyDeck)
        ↓
rslib/src/scheduler/fsrs/weights.rs → build FSRSItems from revlog
  - Group revlogs by card_id
  - For each card, sort by review date
  - Convert to Vec<FSRSReview> { rating, delta_t }
  - Build multiple FSRSItems with increasing history lengths
        ↓
Call fsrs crate: compute_parameters(ComputeParametersInput { train_set })
        ↓
Returns Vec<f32> of 19 weights
        ↓
Store weights in deck preset config (dconf table)
```

Anki requires **1000+ reviews** before showing the Optimize button (to ensure sufficient training data).

---

## 12. Quick Reference — FSRS Ratings

| Rating | Anki Button | ts-fsrs | rs-fsrs | Meaning |
|--------|-------------|---------|---------|---------|
| 1 | Again | `Rating.Again` | `Rating::Again` | Completely forgot |
| 2 | Hard | `Rating.Hard` | `Rating::Hard` | Remembered with difficulty |
| 3 | Good | `Rating.Good` | `Rating::Good` | Remembered correctly |
| 4 | Easy | `Rating.Easy` | `Rating::Easy` | Remembered too easily |

---

## 13. Useful Links

| Resource | URL |
|----------|-----|
| Anki GitHub | https://github.com/ankitects/anki |
| Anki FSRS scheduler folder | `ankitects/anki/rslib/src/scheduler/fsrs/` |
| fsrs-rs (Rust crate Anki uses) | https://github.com/open-spaced-repetition/fsrs-rs |
| rs-fsrs (simple Rust scheduler) | https://github.com/open-spaced-repetition/rs-fsrs |
| ts-fsrs (TypeScript, for your app) | https://github.com/open-spaced-repetition/ts-fsrs |
| FSRS algorithm wiki | https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm |
| FSRS integration PR in Anki | https://github.com/ankitects/anki/pull/2654 |
| fsrs crate on crates.io | https://crates.io/crates/fsrs |
