# TODO

Working backlog for the-quiz-game — a living list, not prioritized yet.
File pointers are best-guess starting points, not gospel.

## UX

- [ ] **Non-turn tiles look clickable.** The team whose turn it *isn't* shouldn't
      see tappable-looking tiles; the on-turn team's tiles should read as clearly
      clickable. (`src/app/host/room/page.js`)
- [ ] **Clearer turn messaging.** More suggestive "it's your turn / their turn"
      cues while a team is up (host + player views).
- [ ] **Delete (trashcan) icon has no contrast.** Hard to see — fix the colour.
      (`src/app/admin/questions-list/page.js`, `src/app/admin/page.js`)
- [ ] **Answers have the wrong background.** Fix the answer background colour.
      (`src/components/answer-item.js`)
- [ ] **Body has the wrong colour.** Fix the page `body` background / text colour.
      (`src/app/globals.css`)
- [ ] **Reduce layout shift.** Showing an error message shoves the layout around —
      reserve space / avoid the jump.
- [ ] **Nicer correct-answer + score UI.** Polish how correct answers and scores
      are presented.
- [ ] **Nicer name + team-choice screen.** Improve the player join form.
      (`src/app/play/page.js`)
- [ ] **Better question picker for large libraries.** Current checkbox picker is
      fine for a few questions, not great at scale — TBI (pairs with "Question
      search + tags"). (`src/app/admin/new-quiz-configuration/page.js`)

## Functional

- [ ] **App Check + reCAPTCHA** on Firestore + RTDB — reCAPTCHA is the attestation
      provider behind App Check.
- [ ] **Room TTL** — auto-expire / clean up stale rooms (needs a scheduled Cloud
      Function).
- [ ] **Restrict who can be a QM (few known QMs):** add an `allowedQms/{email}`
      collection writable only by a super-admin uid; make `firestore.rules`
      `isQuizmaster()` (and the client check in `src/context/auth-context.js`)
      require the email is on it instead of just "is a Google account"; onboard by
      adding an email; later upgrade to Cloud-Function invite links if needed.
- [ ] **Budget & usage alerts + quota caps** (Firebase console).
- [ ] **CSP + security headers** (via `firebase.json` headers).
- [ ] **Make the CI rules-gate mandatory** — GitHub branch protection so the rules
      suite blocks merge.
- [ ] **Bulk-upload questions** for the QM — mechanism + UX TBD.
- [ ] **Question search + tags.**
- [ ] **Mix-and-match quiz building.** Creating a quiz currently only uses saved
      questions; allow authoring brand-new questions inline in the same flow.
      (`src/app/admin/new-quiz-configuration/page.js`)
- [ ] **QM command center.** Move the reveal / control buttons OFF the shared big
      screen onto a separate host-only control surface; leave room for more host
      tools later. (details TBD)
- [ ] **Generate random quiz** — finish the disabled button (pull N random library
      questions, optionally by tag). (`src/app/admin/page.js`)
- [ ] **QM manages players** — move a player between teams, kick + let them rejoin,
      a "my team" screen, and a "leave team" button.
- [ ] **QR-code join** — instead of typing the room code.
- [ ] **Play again** — same room, same players (note: others can still join too).
- [ ] **Tie-breaker mechanism** — optional; the QM can enable it for a game.
- [ ] **Image support** for questions.
- [ ] **Custom team names + colours.**
- [ ] **Per-question timer** — QM-settable and toggleable.

---

_Other ideas from earlier brainstorming, not added above (say the word to fold any
in): steal / rebound mode, per-tile point values, post-game recap, spectator mode,
QM game history._
