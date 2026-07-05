# the-quiz-game — Firebase Migration Roadmap

> From a stubbed Next.js/MongoDB WIP to a Firebase-backed, real-time, phones-join-rooms team quiz show — shipped as a static export with no server.

---

## 1. Overview

**Where we are.** `the-quiz-game` is an early-WIP quiz app on Next.js 16 / React 19 / Tailwind v4.3 / shadcn. Only *read-all-questions* is wired against MongoDB via a Next API route; the write routes (`save-question`, `save-quiz`, `quiz`) are stubs. There is no auth, no multiplayer, and the question schema drifts three ways: gameplay reads `questionText`, the store/DB use `description` + `category`, and mock data uses `questionName` + `questionId`. The gameplay page routes by array index and hardcodes scoring to Team A. In short: a solid UI shell on top of a data layer that barely exists.

**Where we're going.** A quiz show for a room of friends: the Quizmaster (QM) builds a private question library and quizzes on a laptop, starts a game that mints a short room code, and players join from their phones by typing the code — no signup. Two teams take turns picking tiles and tapping answers; the QM controls the pace, reveals answers, and scores. The correct answer *never* reaches a phone. No timer, no server.

**Shape of the target.** Ship the existing frontend as a fully static export (`output: 'export'`) and talk to Firebase directly from the browser. Deliberate two-database split: **Firestore** holds durable, private data (library + quizzes) where queries, offline cache, and owner-scoped rules matter; **Realtime Database (RTDB)** holds the live room (turn, taps, reveals, scores, presence) where high-frequency small writes, lowest latency, and native `onDisconnect` presence matter. **Firebase Auth** gives the QM a Google identity and each phone an anonymous one, so security rules can tell everyone apart. All authorization lives in security rules — with no server, the rules *are* the backend.

---

## 2. Target architecture

- **Firestore — durable, private data.** `questions` + `quizzes`, owner-scoped by QM uid. Chosen for compound queries (the "which quizzes use this question?" delete-guard), offline cache, and expressive owner-only rules.
- **Realtime Database (RTDB) — live room state.** `rooms/{code}`: turn, taps, reveals, scores, presence. Chosen for lowest per-write latency on many tiny mutations, JSON-diff streaming, native `onDisconnect()` presence (drives reconnect), and per-field rule validation. Both databases stay inside the free Spark tier at party scale.
- **Firebase Auth.** Google sign-in (popup) for the QM — gates every library/quiz write. Anonymous sign-in for players — a durable per-phone uid used as the tap author and rule subject. `browserLocalPersistence` (LOCAL) so a refresh keeps the same uid → reconnect.
- **Next.js static export.** `output: 'export'` emits `out/` with no server. `images.unoptimized: true` (no optimizer in export). `trailingSlash: true` for friendly static-host URLs. No API routes, no `headers/redirects/rewrites`, no dynamic filesystem segments.
- **Client-side room routing.** Room codes are runtime data and can't be enumerated at build, so the dynamic `/question/[id]` route is dropped. Rooms are routed via query string (`/play?room=AB3K`) resolved at runtime by a Firebase listener. Static routes: `/` (join), `/host`, `/host/room`, `/play`, `/admin/*` (build).
- **Hosting.** **Firebase Hosting** (recommended — one vendor with Auth/Firestore/RTDB, `firebase deploy` ships `out/`, free CDN + HTTPS). **Netlify** is a viable alt (build `next build`, publish `out`, add `_redirects` for SPA fallback). GitHub Pages is third choice; Vercel is deliberately avoided (tempts SSR back in).

> **Config is not a secret.** The `NEXT_PUBLIC_FIREBASE_*` values are inlined into the static bundle by design. Firebase web config only *identifies* the project — security is the rules, not config secrecy. Do not "fix" this by moving keys server-side; there is no server.

---

## 3. Data model

### Firestore — durable library + quizzes (owner-only)

```
questions/{questionId}
  ownerId:         string          // = QM Google uid, drives rules
  tileName:        string          // catchy board label (was mock questionName / store category)
  questionText:    string          // CANONICAL body — reconciles questionText vs description
  possibleAnswers: [ { answerMessage: string, isCorrect: boolean } ]   // sub-model kept as-is
  createdAt, updatedAt: timestamp

quizzes/{quizId}
  ownerId:      string
  name:         string
  answerMode:   'firstTap' | 'majority'
  teams:        { A: { name: 'Team 1' }, B: { name: 'Team 2' } }
  questionIds:  [ questionId ]      // POINTERS, not copies → library edits ripple into quizzes
  createdAt, updatedAt: timestamp
```

**Delete-guard.** Before deleting `questions/{id}`, query `quizzes where questionIds array-contains id`; if any match, block the delete and list which quizzes use it. (`array-contains` is a reason the library lives in Firestore, not RTDB.)

**Schema reconciliation.** Canonical fields are **`questionText`** (body — gameplay already reads it) and **`tileName`** (board label). Drop the `description`/`category`/`questionName`/`questionId` aliases everywhere. The `{ answerMessage, isCorrect }` answer sub-model is already consistent and survives unchanged.

### RTDB — live room (correct answer split OUT)

```
rooms/{roomCode}
  hostId:      uid                 // QM uid; ONLY writer of machine fields
  status:      'lobby' | 'playing' | 'ended'
  quizId:      string
  answerMode:  'firstTap' | 'majority'
  currentTurn: 'A' | 'B'
  activeTileId: string | null       // open tile; null between turns
  revealed:    boolean              // host-only flag; players never see the correct index early
  usedTiles:   { <tileId>: true }
  scores:      { A: number, B: number }

  players/{uid}: { name, team: 'A'|'B', connected }        // connected via onDisconnect()
  board/{tileId}: { tileName, questionText,
                    possibleAnswers: [ { answerMessage } ] }  // NO isCorrect sent to phones
  taps/{tileId}/{uid}: answerIndex                           // player writes only under own uid
```

### How the correct answer stays off phones (load-bearing)

Rules operate at document/node granularity — they cannot hide a *field* inside a readable node. So the split is **structural**, enforced by code, not by rules alone:

1. When the host starts a game, it copies each tile into `rooms/{code}/board/{tileId}` as `{ tileName, questionText, possibleAnswers: [{ answerMessage }] }` — **`isCorrect` is stripped**.
2. The correct answer is held on the **host screen only** (read from Firestore), never written into the room's player-readable board.
3. At reveal, the host compares the resolved team choice against its held answer, scores, and writes only the *outcome* (revealed flag, updated scores) back to the room.

A P5 emulator/rules test explicitly asserts that no player-reachable payload ever contains `isCorrect` before reveal.

---

## 4. Keep / Refactor / Drop

| Verdict | Files | Why |
|---|---|---|
| **KEEP** | `src/components/base/*` (button, card, input, label, checkbox, radio-group, index), `src/components/index.js`, `src/stores/index.js`, `src/utils.ts`, `src/app/globals.css`, `tsconfig.json` / `jsconfig.json` / `eslint.config.mjs` / `postcss.config.mjs` | Solid shadcn UI + tokens + path aliases. Untouched. |
| **KEEP + PORT** | `src/app/validations.js` | Field rules become both client-side UX *and* the mirror for Firestore security rules. Zod is already a dep — a shared schema is feasible. |
| **REFACTOR** | `src/stores/active-quiz-store.js` → thin projection of live room state (drop `getAllQuestions`, `scoreTeamA/B` truth, `selectedAnswerIndex` as source-of-truth). `src/stores/quiz-configuration-store.js` → shrinks to the single-question editor's form state; quiz assembly moves to page-local state + `src/data/quizzes.js`. `src/app/page.js` → public join screen; `goToQuestion` stops pushing `/question/<index>`. `src/app/question/[id]/page.js` → split into host board view + player answer view driven by room state. `src/components/question-configuration.js`, `answer-item.js`, `landing-page-questions.js`. `src/app/admin/*` pages. `next.config.mjs`, `package.json`. | Rewire off the deleted data layer; fix the five predated bugs at the source. |
| **DROP** | `src/app/api/**` (all-questions, save-question, quiz, admin/save-quiz), `src/app/server/index.js` (empty), `lib/mongodb.ts`, `src/lib/connect-to-db.js`, `src/services/manage-questions-api.js`, `src/services/manage-quiz-api.js`, `src/hooks/useGetAllQuestions.js`, `src/hooks/useSaveQuestion.js`, `src/api-routes.js`, `src/stores/mock-data.js`, `src/app/question/[id]/page.js` (as a dynamic route) | Server + MongoDB + REST plumbing is obsolete — the browser talks to Firebase directly. The dynamic route is incompatible with `output:'export'`. |

**New files (all client-side under `src/`, deploy config at root):** `src/lib/firebase.js` (SDK init), `src/context/auth-context.js` (Google QM + anon player), `src/data/{questions,quizzes,rooms}.js` (Firestore/RTDB CRUD), `src/hooks/{useQuestions,useQuizzes,useRoom,usePlayer}.js` (live subscriptions), plus `lib/game.js` (host transitions). Root: `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `database.rules.json`, `.firebaserc`, `.env.example`, `.env.local`.

### Five predated bugs — fix at the source, don't replicate

| # | Bug | Location | Fix |
|---|---|---|---|
| 01 | Blank question body — gameplay reads `questionText`, store/DB write `description` | `src/app/question/[id]/page.js:48,66` vs `quiz-configuration-store.js:9,60` | Standardize on `questionText`; migrate store/validations field names. |
| 02 | Team B can never score — scoring hardcoded to `'scoreTeamA'` | `src/app/question/[id]/page.js:87` | Score against `room.currentTurn` via a host-only write, keyed by team. |
| 03 | No-correct-answer error never renders — consumer reads misspelled key | `src/components/question-configuration.js:101` reads `hasNoCorectAnswers`; `validations.js:41` correctly returns `hasNoCorrectAnswers` | Fix the consumer typo `hasNoCorectAnswers → hasNoCorrectAnswers`. |
| 04 | Quiz-name validation no-ops — `saveQuiz` never passes the name | `quiz-configuration-store.js:71` calls `validateNewQuiz({ fullQuiz })` (no `quizName`), so `!quizName` at `validations.js:5` is always truthy | Pass `quizName` into `validateNewQuiz`. |
| 05 | Index routing breaks with real data + static export; `activeQuestionIndex || questionId` treats index `0` as falsy | `src/app/page.js:27`, `src/app/question/[id]/page.js:48` | Route by Firestore doc id / drive from room state via query param, not array index. |

> Also rename the barrel export at `src/components/index.js:2` (`Question` → `AnswerItem`) — it re-exports `answer-item.js` under a misleading name.

---

## 5. The roadmap

Phases follow the plan's order. Each ships something usable and fails closed on security.

### P0 — Foundations
**Goal:** Static-export build that boots against Firebase with the MongoDB layer gone.
- Set `next.config.mjs`: `output:'export'`, `trailingSlash:true`, `images.unoptimized:true` (replace the empty config).
- `npm rm mongodb && npm i firebase` (add `firebase-tools` as a devDependency for emulator + deploy).
- Create `src/lib/firebase.js` exporting `auth`, `db` (Firestore), `rtdb` (RTDB) from `NEXT_PUBLIC_*` env, with a `getApps()/getApp()` guard and a startup assertion that throws if any required key (incl. `NEXT_PUBLIC_FIREBASE_DATABASE_URL`) is undefined.
- Create `.env.example` (committed, 7 keys) and `.env.local` (git-ignored).
- **Tear down** the server/data layer (see DROP list). Then `grep -rn "@/services\|@/hooks\|@/api-routes\|mongodb\|mock-data"` and rewire every dangling import in the stores/pages before building.
- Delete the dynamic `/question/[id]` route; introduce static `/host`, `/host/room`, `/play`; update `src/app/page.js:24-27` `goToQuestion` to stop `router.push('/question/<index>')`.
- Reconcile schema to `questionText` + `tileName` across `validations.js` and `quiz-configuration-store.js`.
- Add `firebase.json` (`public:"out"`, SPA rewrite `** → /index.html`, firestore + database rules), `.firebaserc`, and deny-by-default `firestore.rules` / `database.rules.json` skeletons. Choose **Firebase Hosting**; record `next build && firebase deploy`.

**Ships:** nothing user-facing yet — a clean `next build` produces `out/` with no server dependency and no API-route warnings.
**Done when:** `next build` emits `out/`; no import of `mongodb`, `@/services`, `@/hooks`, `@/api-routes`, or `mock-data` remains; `src/lib/firebase.js` initializes all three (`auth`/`db`/`rtdb`); deny-by-default rule files are committed and deployed.

### P1 — Auth + Library
**Goal:** QM signs in with Google and manages a private question library in Firestore.
- `src/context/auth-context.js`: `signInWithPopup(GoogleAuthProvider)` for QM, `signInAnonymously` for players, `setPersistence(LOCAL)`; expose `user`/`role`. Wrap `src/app/layout.js`. Guard `src/app/admin/layout.js` (client redirect — no server).
- `src/data/questions.js` + `useQuestions()`: `onSnapshot(query(collection(db,'questions'), where('ownerId','==',uid)))`; `addQuestion/editQuestion/deleteQuestion` stamp `ownerId = user.uid`.
- Rewire `src/app/admin/question/page.js` (Firestore writes; implement the empty `getQuestion(id)` for edit hydration), `src/app/admin/questions-list/page.js` (real list), `src/components/landing-page-questions.js` (subscribe, route by doc id).
- Fix bug 03 (`question-configuration.js:101`) and bug 01 field names.
- **Ship library rules now, not in P5:** owner-only `match /questions/{id}` + top-level default-deny. A static client talks to Firestore directly — an unguarded collection is world-open the moment it exists.

**Ships:** the QM logs in with Google and creates/edits/lists their own questions; another account sees none of them.
**Done when:** QM CRUD round-trips through Firestore; library reads/writes are denied to any non-owner (emulator-checked); the no-correct-answer error renders; `questionText`/`tileName` are the only field names in play.

### P2 — Quiz Builder
**Goal:** QM assembles quizzes that point to library questions.
- Quiz persistence lives in `src/data/quizzes.js` (`addQuiz`/`editQuiz` write `quizzes/{id}` with `ownerId`, `name`, `answerMode`, `teams`, `questionIds` — pointers, not copies), called from the builder page; the store shrank to the single-question editor (no immer). *(Amended during build: the builder became a library picker with page-local state.)*
- Fix bug 04 — the builder validates via `validateQuizConfig({ quizName, questionIds })`, mirroring the rules bounds.
- Extend `src/app/admin/new-quiz-configuration/page.js`: team setup + answer-mode picker (reuse `radio-group`/`checkbox`) + a question picker referencing library ids. Wire the "Existing Quizzes" TODO in `src/app/admin/page.js` to `useQuizzes()`.
- Implement the **delete-guard**: block deleting a question referenced by any quiz (`array-contains`), surface which quizzes use it.
- Ship quiz rules alongside (owner-only, same shape as questions).

**Ships:** the QM builds a named quiz, picks questions from the library, sets answer mode + teams, and saves it; editing a library question ripples into every quiz that references it.
**Done when:** quizzes persist with `questionIds` pointers; the quiz-name validation actually blocks empty names; a question referenced by a quiz cannot be deleted and the UI names the offending quizzes.

### P3 — Host + Rooms + Players
**Goal:** Host starts a room; phones join by code and pick a team.
- `src/data/rooms.js` `createRoom(quizId)`: generate a 4-char ambiguity-free code (`23456789ABCDEFGHJKLMNPQRSTUVWXYZ`), copy the board into RTDB **without `isCorrect`**, set `status:'lobby'`, `scores:{A:0,B:0}`. (If you prefer a Firestore `codes/{CODE}` claim doc for atomic uniqueness, use a `runTransaction` with ~6 retries; RTDB codes can also be claimed transactionally.)
- Player join (`/play?room=CODE`): `signInAnonymously` lazily → uid; resolve code → room; show name + Team A/B picker; write `players/{uid} = { name, team, connected }`.
- Presence/reconnect: `onDisconnect()` clears `connected`; on `/play` mount, if `players/{uid}` already exists, skip the join UI and slide back into the team's current view.
- Refactor `active-quiz-store.js` into a projection: hold `role`/`roomCode`/`roomSnapshot`/`myPlayer` + derived selectors (`currentTile`, `isMyTurn`, `scores`, `status`); add `useRoom()` = `onValue(rooms/{code})`. Remove local score/selected-answer mutation logic. *(Amended during build: the store was deleted, not refactored — `useRoom()` IS the room projection; P4 derived selectors live in `useRoom`/`lib/game.js`, not a zustand store.)*
- Land room + player + presence rules with this feature.

**Ships:** the QM starts a game and sees a room code + a live roster; players on phones type the code, enter a name, pick a team, and appear in the lobby; a refresh re-materializes the same player.
**Done when:** two phones join one room over HTTPS and appear on the host roster; a locked/refreshed phone rejoins its team without re-entering anything; a non-member cannot read the room; the room board contains no `isCorrect`.

### P4 — Live Loop
**Goal:** Play a full game — pick, tap, reveal, score, pass turn, end.
- `lib/game.js` host-authoritative transitions, each an RTDB write gated by rules: `startGame`, `pickTile(tileId)` (sets `activeTileId`, opens answering), `reveal`, `nextTurn`.
- Players write `taps/{activeTileId}/{uid} = answerIndex` only while it's their team's turn and before reveal; re-tap overwrites (keyed by uid).
- Host resolves both modes over the turn-team's taps: **firstTap** = earliest tap; **majority** = argmax of choice counts, tie across choices ⇒ null ⇒ wrong. Compare to the host-held correct answer; score `+1`/`+0` (no steal).
- `nextTurn` marks the tile used, flips `currentTurn`, clears `activeTileId`. When every tile is used → `status:'ended'`, `winner = A|B|'tie'`.
- Rebuild `src/app/question/[id]/page.js` logic as the room-driven surfaces: host board/question view + player answer view (green/red rendered only from revealed fields). Fixes bugs 01, 02, 05 in passing.

**Ships:** an end-to-end game — teams alternate picking tiles and tapping, the QM reveals and scores, turns pass, and the game ends with a winner or a tie. The correct answer only appears on phones at reveal.
**Done when:** both teams can score (bug 02 gone); firstTap and majority both resolve correctly (majority-tie = wrong); the game reaches an `ended` state with the right winner/tie; no phone can read the correct index before the host reveals it.

### P5 — Security Hardening
**Goal:** Deny-by-default rules, penetration-tested, CI-gating.
- **Firestore:** owner-only `questions`/`quizzes`; top-level default-deny catch-all present and last.
- **RTDB:** host-only `currentTurn`/`scores`/`revealed`/`activeTileId`/`usedTiles`; a player may write `taps/{tile}/{uid}` only under their own uid, in their room, on their team's turn, before reveal; room readable only by members; board nodes never contain `isCorrect`.
- Add the emulator test suite and wire it into CI so a rules regression *or* a data-model regression (someone re-inlines `isCorrect`) fails the build.

**Ships:** a version safe to deploy publicly — every "must-deny" path is proven denied.
**Done when:** the emulator suite passes (see §6) and runs in CI; an adversarial pass from an anonymous session confirms a player cannot read the library, read another room, read the answer key, forge a score/turn/reveal, or forge another player's tap.

### Cross-cutting — deploy + docs
- Update `src/app/layout.js` metadata title; fix barrels (`components/index.js`, `stores/index.js`) after renames.
- README: env setup, the "config is public, rules are the boundary" note, and the deploy flow (`next build → firebase deploy`, or Netlify `_redirects`).
- Verify a clean `out/` deploys to Firebase Hosting and runs against a real project: Google + anon auth over HTTPS, client room routing resolves via the Firebase listener.

---

## 6. Security rules

**Model — deny-by-default, rules ARE the backend.**
- `questions/{id}` & `quizzes/{id}`: read/write only if `request.auth != null && request.auth.uid == resource.data.ownerId` (create: `request.resource.data.ownerId == request.auth.uid`). Providers checked via `request.auth.token.firebase.sign_in_provider` — `google.com` for library/quiz/room-create, `anonymous` for player writes.
- `rooms/{code}` (RTDB): sealed — read only for members (`players/{uid}` exists) or the host. Host-only writes to `currentTurn`/`scores`/`revealed`/`activeTileId`/`usedTiles` (`auth.uid === hostId`). Player tap: `auth.uid === $uid && status==='playing' && player's team === currentTurn && !revealed`.
- The correct answer is kept off phones **structurally** (never written to the player-readable board), because rules can't hide a field inside a readable node.

**When rules land.** Ship in tranches *with* the features they guard, not all in P5 — an unguarded collection is world-open the instant it exists on a serverless client. Library rules land in **P1**, quiz rules in **P2**, room/player/tap rules in **P3–P4**. **P5** hardens and pen-tests the whole set.

**Test checklist (emulator, CI-gating):**

_Must-DENY (player/outsider):_ read another QM's library or quizzes · read a room they never joined · read the answer key / private answers · write score / turn / reveal · tap off-turn, wrong-team, wrong-tile, or after reveal · create another player's membership · create a room as host on an anonymous session · a QM creating a room owned by someone else · list/browse rooms.

_Must-ALLOW (so rules aren't over-tight):_ QM read/write own library + quizzes · QM host control writes (score, turn, reveal) · member reads the room board (no `isCorrect` present) · player taps own team, own turn, live tile · a fresh anon uid creates its own membership · a returning phone updates its own presence/heartbeat without changing uid/team.

_Data-shape assertion (the other half of "answer off phones"):_ assert the room board nodes contain **no** `isCorrect` — guards against a regression that re-inlines the key.

---

## 7. Cross-cutting concerns

- **Reconnection.** Anonymous uid persists in IndexedDB (`browserLocalPersistence`), so a refresh reuses the same uid; combined with RTDB `onDisconnect()`, a locked/refreshed phone re-materializes and slides back into its team and the room's current state — never kicked. Presence is advisory (a greyed roster dot); it never gates gameplay.
- **Even-board fairness.** In the builder, nudge (non-blocking) toward an even tile count so each team picks equally; an odd board just gives the first team one extra pick.
- **Tie handling.** A final-score tie is simply a tie — `winner: 'tie'` shown on the ended screen. No tiebreaker.
- **Majority-tie = wrong.** In majority mode, if the top choice count is shared by more than one answer, the team's resolved choice is `null`, scored wrong — a pure host-side computation, keeping the correct index off phones.
- **First-tap fairness.** Order taps by a server-assigned timestamp (not client clocks); the host breaks exact ties deterministically (e.g. lowest uid). Near-simultaneous taps in a room of friends are cosmetic, not an exploit — rules already forbid tapping outside your team/turn.
- **Snapshot vs ripple.** "Edits ripple everywhere" applies to *saved quizzes* (which store `questionIds` pointers), **not** to an in-flight game — the room copies the board at start so the board can't mutate mid-game. Both behaviors are intended.

---

## 8. Key risks & decisions

- **Decision — two databases, split by access pattern.** Firestore for durable/queryable library+quizzes; RTDB for the hot live room. Both stay free at party scale.
- **Decision — drop the dynamic `/question/[id]` route.** Room codes are runtime data, impossible to enumerate at build; route rooms via query string resolved by a Firebase listener.
- **Decision — Google (QM) + anonymous (players) auth; uid is the only trusted identity.** Never trust a client-supplied id/team — cross-check `request.auth.uid`.
- **Decision — Firebase Hosting.** One vendor with the backend; `firebase deploy` ships `out/`. Netlify is the viable alternate.
- **Risk — correct answer leaks** if the full question doc (with `isCorrect`) is copied into the room. → Strip `isCorrect` when building the board; keep the answer on the host screen; assert it in tests.
- **Risk — open default rules ship to prod** (Firebase test-mode is world-open). → Commit deny-by-default in P0; never deploy test-mode rules.
- **Risk — missing `NEXT_PUBLIC_FIREBASE_DATABASE_URL`** silently breaks RTDB, or CI omits `NEXT_PUBLIC_*` so values aren't inlined. → Include it in `.env.example` + `firebase.js`; add a startup guard that throws; set all `NEXT_PUBLIC_*` in the host build env.
- **Risk — lingering imports** of deleted services/hooks/api-routes break the build after teardown. → Grep for `@/services`, `@/hooks`, `@/api-routes`, `mongodb`, `mock-data` and rewire before `next build`.
- **Risk — carrying the five predated bugs into Firebase** bakes them into the schema. → Fix all five at the source during the phases that touch them (§4).

---

## 9. First concrete steps (P0 setup)

1. **Config:** edit `next.config.mjs` — add `output:'export'`, `trailingSlash:true`, `images.unoptimized:true` (replaces the empty object).
2. **Deps:** `npm rm mongodb && npm i firebase && npm i -D firebase-tools`.
3. **Firebase project:** create it in the console; enable **Google** + **Anonymous** auth providers; create a **Firestore** database and a **Realtime Database**; copy the web config.
4. **Env:** create `.env.example` (committed) and `.env.local` (ignored) with the 7 `NEXT_PUBLIC_FIREBASE_*` keys, including `NEXT_PUBLIC_FIREBASE_DATABASE_URL`.
5. **Init module:** create `src/lib/firebase.js` exporting `auth`, `db`, `rtdb` with the `getApps()/getApp()` guard and the required-keys startup assertion.
6. **Teardown:** delete the DROP set — `src/app/api/**`, `src/app/server/index.js`, `lib/mongodb.ts`, `src/lib/connect-to-db.js`, `src/services/*`, `src/hooks/*`, `src/api-routes.js`, `src/stores/mock-data.js`, and the `src/app/question/[id]/` dynamic route.
7. **Grep + rewire:** `grep -rn "@/services\|@/hooks\|@/api-routes\|mongodb\|mock-data" src` and fix every hit (notably `active-quiz-store.js:2` and `quiz-configuration-store.js:4`).
8. **Routing:** add static `/host`, `/host/room`, `/play`; change `src/app/page.js:24-27` `goToQuestion` to stop pushing `/question/<index>`.
9. **Schema:** rename `description`→`questionText` and `category`→`tileName` in `quiz-configuration-store.js` and `validations.js`.
10. **Rules + deploy config:** add `firebase.json`, `.firebaserc`, deny-by-default `firestore.rules` and `database.rules.json`. Then verify: `next build` emits `out/` with no server warnings, and `firebase deploy` serves it.
