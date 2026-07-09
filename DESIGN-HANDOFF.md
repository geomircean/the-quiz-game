# Design Handoff — Team Quiz Show UI Redesign

A brief for a full visual redesign of the interface. The app is **built and
live**; this is a *reskin*, not a rebuild. Logic, data, routing, and security
must stay intact — you're changing how it looks and feels, not how it works.

Read alongside: `quiz-show-plan.md` (the product), `ROADMAP.md` (architecture),
`TODO.md` (known UX debt — several items are design work).

---

## 1. What the app is

A **Jackbox-style team quiz show for people in the same room**. One person is the
**Quizmaster (QM)**; everyone else joins from their phone with a short room code
and plays in one of **two teams**. The QM builds quizzes ahead of time, then runs
a game live on a **shared/cast big screen** while players answer on their phones.

No timer (host-paced), no accounts for players (they're anonymous guests), free
static hosting, real-time sync via Firebase.

---

## 2. The three audiences and their devices — the central design fact

Everything hinges on **who is looking and on what screen**. Design each context
for its device; they are genuinely different problems:

| Mode | Who | Device | Design priorities |
|---|---|---|---|
| **Build** | QM | Laptop | Dense, efficient authoring. Desktop-first, but must not break on a phone. |
| **Host — Command Center** | QM | Laptop (private window) | Control-dense dashboard. The QM reads this while running the game. |
| **Host — Big Screen** | Everyone in the room | **TV / projector / cast** | **The hero surface.** Legible across a room, high contrast, TV-safe. |
| **Play** | Players | **Phones** | Mobile-first, thumb-friendly, glanceable. One clear action at a time. |
| **Join** | Players | Phones | First impression. Fast: code → name → team. |

> The QM runs **two windows side by side**: the private Command Center (drives the
> game) and the Big Screen (cast to the room). They show the *same* room, different
> views.

---

## 3. ⚠️ Hard constraints (not negotiable)

1. **The Big Screen (`/host/room`) is cast/screen-shared.** This is the #1 reason
   for the redesign. The current purple→indigo **gradient bands and washes out
   horribly when cast**. Rules for this surface: **no large gradients**, flat
   high-contrast fills, oversized type, generous spacing, colours that survive
   chroma-subsampled screen mirroring. Assume a mediocre TV seen from 3+ metres.
2. **The correct answer must NEVER appear on player phones or the Big Screen
   before the host reveals it.** This is enforced in data/security, not styling —
   but it shapes what those screens *can* show. Only the Command Center may show
   the answer early (it does today, marked "only you see this").
3. **Tech the design must express through:**
   - **Tailwind CSS v4** (CSS-first `@theme` in `src/app/globals.css`).
   - **shadcn-style components** (`src/components/base/*` — `forwardRef`, `cva`
     variants). Reskin via tokens + variants where possible.
   - `framer-motion` (available), `lucide-react` + `@heroicons/react` for icons.
   - **Static export** — no server; nothing exotic that needs SSR.
4. **Accessibility:** don't rely on colour alone (reveal states already pair
   green/red with ✓/✗ icons — keep that). Icon-only buttons need `aria-label`s.
   Maintain visible focus rings.
5. **Themeable both ways:** it's dark-only today; if you introduce light/dark,
   wire it through the token system, don't hardcode.

---

## 4. Current visual state (what you're replacing)

**The core problem: two competing palettes.** The design tokens in
`globals.css` are **teal/olive**, but every page hardcodes **purple**. Pick one
system and drive *everything* from tokens.

Current tokens (`src/app/globals.css`, hex, dark-only):
```
--background #19485f (teal)     --foreground #d9e0a4 (olive)
--card #133445                  --primary #7c3aed (violet)
--secondary #4338ca (indigo)    --accent #6d28d9 (violet)
--muted #1e3a4a                 --destructive #dc2626
--border/--input #2f5468        --ring #a855f7   --radius 0.5rem
```
…mapped to Tailwind utilities via `@theme inline` (`bg-primary`, `text-foreground`,
`border-border`, `rounded-lg`, etc.). **But** `<body>` and pages hardcode
`bg-gradient-to-b from-purple-950 to-indigo-950`, `bg-purple-800/40`,
`text-purple-100`, `border-purple-600`… so un-tokenized surfaces (e.g. the
question editor's amber borders) fall back to teal and look like a different app.

**Deliverable #1: a single coherent token palette** defined in `globals.css`,
with pages/components consuming tokens — no more hardcoded `purple-*`.

Button variants today (`src/components/base/button.tsx`): `default` (primary),
`destructive` (soft red chip), `outline`, `secondary`, `ghost`, `link`; sizes
`default/sm/lg/icon/flexH`. Cards, Input, Checkbox, RadioGroup, Label, and a
right-side **Sheet** (drawer) exist in the same style.

---

## 5. Screen-by-screen inventory

Every route, what it shows, and the states to design. (Routes are real; states
matter as much as the happy path.)

### Join & landing
- **`/` — Public join screen** (phone). Title, a room-code input, a **Join**
  button (disabled until a code is typed), and small **Host** (📺) + **Admin**
  (⚙) entry icons. First impression — make it inviting and dead-simple.

### Build (QM, laptop — all behind a Google sign-in gate)
- **`/admin` — QM hub.** Sign-in card (signed-out state) → then: Configure New
  Quiz, Generate Random Quiz, Add Question, View Questions, and an **Existing
  Quizzes** list (cards with Launch / Edit / Delete). Weak information hierarchy
  today — group into "Questions" vs "Quizzes".
- **`/admin/question` — Question editor.** Fields: question text, **tile name**
  (short board label), **tags** (chips), and 1–4 **answers** each with a
  star = "mark correct" control (currently an unlabeled star hiding a radio — needs
  a clear "correct" affordance). Create + edit modes; validation errors; save toast.
- **`/admin/questions-list` — Library.** Search box + clickable tag-chip filters +
  a grid of question cards (Edit / Delete). States: loading, empty, no-match,
  delete-guard error ("used by quiz X").
- **`/admin/new-quiz-configuration` — Quiz builder.** Name, **answer-mode** radio
  (first-tap vs majority), teams (default names), a list of **selected questions**
  (removable), plus two actions: **Add from library** (opens the right-side
  **Sheet/drawer** with search + tag chips + a "hide already added" toggle) and
  **Write a new question** (inline draft editor). Odd-tile-count fairness nudge.

### Host — Command Center (QM, laptop, private)
- **`/host/control`** — the QM's dashboard. Header (room code, "Open big screen",
  copy join link). Main column changes by phase: **lobby** (start button, gated on
  ≥1 player per team) → **board** (compact tile grid to pick) → **question**
  (answers with the **correct one privately marked**, live tap counts + who tapped,
  Reveal / Skip) → **reveal** (outcome + Next turn) → **ended**. Side column:
  **Scores** with ± adjust, **Players** (move team ⇄ / kick), **End game early**.
  This is dense and functional — think "control desk", not marketing page.

### Host — Big Screen (the room, cast) — **the hero**
- **`/host/room`** — **zero controls, ever.** Phases:
  - **Lobby:** quiz name, a **huge room code**, a **QR to join**, and the two
    team rosters filling up live (presence dots).
  - **Board:** whose turn it is + a grid of tiles (used ones dimmed/struck).
  - **Question:** big tile name, big question text, the answer options, a live tap
    count. On **reveal**: correct answer turns green, wrong pick red (with ✓/✗),
    outcome line. Scores always visible; room code in a corner.
  - **Ended:** winner (or tie) big, final scores.
  - Make this readable across a room and beautiful when cast. This is where the
    "party show" energy should live.

### Play (players, phones)
- **`/play?room=CODE`** — states in order: guest sign-in (brief), **join form**
  (name + Team 1/Team 2), **lobby** ("you're in, waiting…", your teammates),
  **between turns** ("your team picks" vs "other team is picking"), **active
  question** (tappable answer buttons — only enabled on your turn; first-tap
  lock hint or majority hint), **reveal** (green/red + outcome), **ended**
  (winner + a "you won/lost" line). Also: guest-signin-failed retry, wrong-code
  error. Thumb-first, big tap targets, one focus per screen.

---

## 6. Known UX debt to fix in the redesign (from TODO/audit)

- **Casting palette** (the trigger) and **palette unification** (§4).
- Non-turn tiles/answer buttons **look tappable** when they aren't — make
  disabled/not-your-turn states obvious (dim, no hover affordance).
- **Clearer turn messaging** — whose turn, what to do, on both host and player.
- **Reduce layout shift** — error messages currently shove content; reserve space.
- **Nicer correct-answer + score reveal** — this is a celebratory moment; make it feel like one.
- **Nicer name/team-choice** join screen.
- **Room code stays visible** on the big screen during play (for late joiners).
- **Question editor** isn't responsive (hardcoded wide padding); the "mark
  correct" star needs a real label.
- Player **room-code input**: mobile keyboard hints (auto-caps, autofocus).
- Accessibility: `aria-label`s on icon buttons, verify contrast on translucent cards.

---

## 7. Brand / tone

A **party game** — fun, warm, a little theatrical, but never at the cost of
legibility (especially cast on a TV). Think "game-show energy" more than
"enterprise dashboard". You have latitude on direction (colour, type, motion,
personality) as long as the constraints in §3 hold. Motion via framer-motion is
welcome for reveals/celebration but must stay smooth when cast.

---

## 8. What must NOT change (so the reskin drops in)

- **Data model & Firebase shapes** (Firestore questions/quizzes, RTDB rooms).
- **Security rules** and the **answer-never-on-phones** guarantee.
- **Routes & state flow** — `useAuth`, `useRoom`, `useAnswerKey`, `data/game.js`.
  The redesign is presentational; reskin components / rework layouts, keep the
  data wiring.
- Prefer **restyling the existing component API** (Button variants, Card, Input,
  Sheet, etc.) and the token layer over inventing new prop contracts — that keeps
  the swap low-risk. New components are fine where a screen genuinely needs them.

**Deliverables:** (1) unified token palette in `globals.css`; (2) restyled base
components; (3) per-screen layouts for all routes in §5 with their states; (4) a
casting-optimized treatment for `/host/room`.

---

## 9. How to run it and see every screen

```bash
npm install
npm run emulators   # terminal 1 — Firebase emulator suite (needs Java on PATH)
npm run dev         # terminal 2 — http://localhost:3000
```
- **Sign in as QM (dev):** open `/admin`, click "Sign in with Google" — the
  emulator shows a *fake* account picker (no real creds). In dev there's also a
  console hook: `window.__QUIZ_DEV__.signInFakeGoogle('sub','you@example.com')`.
- **See the whole game loop:** build a quiz → Launch (lands on `/host/control`) →
  "Open big screen" (`/host/room`) → join from a second browser window at
  `/play?room=CODE`. Emulator data is in-memory (resets on restart).
- Inspect data live at the emulator UI: `http://localhost:4001`.

Everything is dark-only today; screenshots of the current state can be taken from
any route with the app running.
