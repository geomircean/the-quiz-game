# Team Quiz Show

A quiz show for people in the same room, Jackbox-style. One person is the
**Quizmaster (QM)**: they build quizzes from a personal question library and
run them live on a shared screen. Everyone else joins from their phone with a
short room code, picks one of two teams, and answers by tapping.

The product plan lives in [quiz-show-plan.md](quiz-show-plan.md); the build
phases and architecture in [ROADMAP.md](ROADMAP.md).

## Architecture

- **Fully static site** (Next.js `output: 'export'`) — no server to run.
  The browser talks to Firebase directly.
- **Firestore** holds durable, owner-private data: the question library and
  quizzes (which *point to* questions, so a library edit ripples everywhere).
- **Realtime Database** holds live rooms: roster, presence, turns, taps,
  reveals, scores. The board is copied in **without** `isCorrect`; the answer
  key lives in a host-only `roomKeys/{code}` node — **the correct answer
  never reaches a phone before the host reveals it.**
- **Firebase Auth**: Google sign-in for the QM, invisible anonymous
  identities for players.
- **Security rules are the backend.** Deny-by-default; every contract is
  emulator-tested by `npm run verify:rules` (Firestore + RTDB suites), which
  CI runs on every push.

## Development

Requirements: Node 20.9+, a JVM (for the Firestore/RTDB emulators —
`brew install openjdk` on macOS).

```bash
npm install
npm run emulators   # Firebase emulator suite (demo project — no real account needed)
npm run dev         # Next.js dev server on :3000, pointed at the emulators
```

A fresh clone works out of the box: the committed `.env` carries demo
values and `.env.development` turns the emulator wiring on **for
`next dev` only** — production builds stay clean (enforced by the
`postbuild` bundle guard). Real Firebase config goes in `.env.local`
(gitignored, overrides `.env`).

Useful scripts:

| Script | What it does |
|---|---|
| `npm run build` | Static export to `out/` + asserts no emulator hooks leaked into the bundle |
| `npm run lint` | ESLint (flat config) |
| `npm run verify:rules` | Runs both security-rules suites against the emulators |

## Deploying (when you're ready)

1. Create a Firebase project in the [console](https://console.firebase.google.com);
   enable **Google** and **Anonymous** sign-in, create a **Firestore** database
   and a **Realtime Database**. Enable **App Check** for both.
2. Put the web-app config values in `.env.local` (see `.env.example` — these
   are public identifiers, not secrets; the rules are the security boundary).
3. Add the project as a `prod` alias in `.firebaserc` (keep `default` on the
   demo id for emulator safety).
4. `next build && firebase deploy --project prod --only hosting,firestore,database`
   — this ships `out/`, both rules files, and the Firestore indexes.
