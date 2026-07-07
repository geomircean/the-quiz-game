# TODO

Working backlog for the-quiz-game — a living list, not prioritized yet.
File pointers are best-guess starting points, not gospel.

## UX

- [ ] **Non-turn tiles look clickable.** The team whose turn it *isn't* shouldn't
      see tappable-looking tiles; the on-turn team's tiles should read as clearly
      clickable. (`src/app/host/room/page.js`)
- [ ] **Clearer turn messaging.** More suggestive "it's your turn / their turn"
      cues while a team is up (host + player views).
- [x] **Delete (trashcan) icon has no contrast.** Hard to see — fix the colour.
      *(Done: real Delete buttons use the destructive variant — solid red, light
      text; the per-answer trash icon brightened to red-400 with a red hover.)*
      (`src/app/admin/questions-list/page.js`, `src/app/admin/page.js`)
- [ ] **Answers have the wrong background.** Fix the answer background colour.
      (`src/components/answer-item.js`)
- [x] **Body has the wrong colour.** Fix the page `body` background / text colour.
      *(Done: the purple gradient now lives once on `<body>`; the stale unlayered
      teal `body { background }` rule that silently won over Tailwind's utility
      layer is removed.)* (`src/app/globals.css`, `src/app/layout.js`)
- [ ] **Reduce layout shift.** Showing an error message shoves the layout around —
      reserve space / avoid the jump.
- [ ] **Nicer correct-answer + score UI.** Polish how correct answers and scores
      are presented.
- [ ] **Nicer name + team-choice screen.** Improve the player join form.
      (`src/app/play/page.js`)
- [x] **Better question picker for large libraries.** Current checkbox picker is
      fine for a few questions, not great at scale — TBI (pairs with "Question
      search + tags"). *(Done: library moved into a searchable side drawer with a
      hide-already-added filter; main view lists the quiz's questions with remove
      buttons.)* (`src/app/admin/new-quiz-configuration/page.js`)

## UX — audit findings (2026-07-06)

Second pass from a full read of every screen. Items already covered above
(large-library question picker, correct-answer + score UI polish, QR join,
player team management, non-turn tiles on the host board, body colour) are
folded into the lists above and not repeated here.

### Player

- [ ] **Room code disappears once the game starts.** It only renders in the host
      lobby, so late-joiners / reconnecting players have no way to see it. Keep the
      code visible (small header) during play. (`src/app/host/room/page.js`)
- [ ] **Player answer buttons look tappable off-turn.** Player-side counterpart of
      the non-turn tiles item above: `AnswerItem` only disables on reveal, so a
      watching-team tap silently no-ops with no feedback. Dim/disable when it isn't
      your turn. (`src/app/play/page.js`, `src/components/answer-item.js`)
- [ ] **Mobile keyboard hints on the room-code input.** Players are on phones — add
      `autoCapitalize="characters"`, `autoComplete`/`autoCorrect` off, `inputMode`,
      and autofocus. (`src/app/page.js`)
- [ ] **Lobby only shows your own team.** Also show the other team's count / total
      players / the room code so a player can confirm they're in the right room.
      (`src/app/play/page.js`)
- [ ] **Player "ended" screen is a dead end.** No "back to join / leave" once the
      game finishes. (`src/app/play/page.js`)

### Host

- [ ] **No "end game early" / exit for the host.** Closing the tab is the only way
      out, which orphans the room (pairs with Room TTL). (`src/app/host/room/page.js`)
- [ ] **Host "ended" screen has no next step.** Add "Host another quiz" → `/host`.
      (`src/app/host/room/page.js`)
- [ ] **Host can't see disconnects during play.** Presence dots only render in the
      lobby roster, not once the game is running. (`src/app/host/room/page.js`)
- [ ] **`/host` has no sign-out / home nav.** It sits outside the admin layout, so
      unlike `/admin` there is no way to sign out or go back. (`src/app/host/page.js`)

### Build (admin)

- [ ] **Question delete has no confirmation.** Quizzes get a `window.confirm`;
      deleting a question is immediate and irreversible. Add a confirm.
      (`src/app/admin/questions-list/page.js`)
- [ ] **Correct-answer control is an unlabeled star.** A star icon hiding a radio,
      with the only hint in a `title` tooltip — add a visible "Correct" label and an
      accessible name. (`src/components/question-configuration.js`)
- [ ] **No minimum-answers guard.** The trash button can delete answers down to 0/1;
      enforce at least 2 options. (`src/components/question-configuration.js`)
- [ ] **Weak IA on the admin landing.** Scattered loose buttons — group into
      "Questions" and "Quizzes" sections and tighten copy ("Add Question To Your
      Database" → "Add Question"). (`src/app/admin/page.js`)
- [ ] **Show quiz usage on library cards.** `quizzesUsingQuestion` already exists;
      surfacing "used in N quizzes" preempts the delete-guard error.
      (`src/app/admin/questions-list/page.js`)

### Visual / design system

- [ ] **Two competing palettes.** `globals.css` defines teal/olive tokens but pages
      hardcode purple; un-overridden surfaces (the question editor's amber borders)
      fall back to teal and read as a different app. Consolidate to one token-driven
      palette (pairs with "Body has the wrong colour"). *(Started: the teal body
      paint is gone and the backdrop is global; per-page duplicate gradients and
      the teal/olive tokens themselves still to consolidate.)*
      (`src/app/globals.css` + pages)
- [x] **Global button border fights the components.** `button { border: 2px solid
      var(--foreground) }` forces a border on every button (why the landing icons
      need `border-0`). Remove it; let the Button variants own their borders.
      *(Done: rule removed, `border-0` hacks dropped, the outline variant re-themed
      purple, and the question editor's olive/cyan one-off buttons normalized.)*
      (`src/app/globals.css`)
- [ ] **Question editor isn't responsive.** Hardcoded `px-24` and horizontal answer
      rows overflow on phone widths. (`src/app/admin/question/page.js`,
      `src/components/question-configuration.js`)
- [ ] **Unify loading copy.** `question-configuration.js` hardcodes "Loading..."
      vs the shared `<Loading/>` "Loading…". (`src/components/question-configuration.js`)

### Accessibility

- [ ] **Icon-only back buttons lack `aria-label`.** The landing icons do this right;
      the admin back-arrows don't. (`src/app/admin/questions-list/page.js`,
      `src/app/admin/question/page.js`, `src/app/admin/new-quiz-configuration/page.js`)
- [ ] **Verify reveal contrast.** Colour is backed by ✓/✗ icons (good); double-check
      `text-purple-100` on the translucent cards. (`src/components/answer-item.js`)

### Polish

- [ ] **Tab title is wrong.** Metadata says "Raul's Random Quiz Questions" — should
      be "Team Quiz Show". (`src/app/layout.js`)
- [ ] **No save confirmation.** Saving a question/quiz just navigates away with no
      "Saved" feedback; add a toast. (`src/app/admin/question/page.js`,
      `src/app/admin/new-quiz-configuration/page.js`)

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
- [x] **Mix-and-match quiz building.** Creating a quiz currently only uses saved
      questions; allow authoring brand-new questions inline in the same flow.
      *(Amended: inline questions are held as local drafts — editable/removable —
      and only written to the library when the quiz itself is saved, so an
      abandoned builder leaves no strays.)*
      (`src/app/admin/new-quiz-configuration/page.js`)
- [x] **QM command center.** Move the reveal / control buttons OFF the shared big
      screen onto a separate host-only control surface; leave room for more host
      tools later. *(Done: /host/control drives the game — flow controls, private
      answer preview, tap status with names, score ±, skip question, end early,
      player move/kick — while /host/room is a pure display with zero controls;
      Launch lands on the control with an "Open big screen" button.)*
      (`src/app/host/control/page.js`, `src/app/host/room/page.js`)
- [ ] **Generate random quiz** — finish the disabled button (pull N random library
      questions, optionally by tag). (`src/app/admin/page.js`)
- [ ] **QM manages players** — move a player between teams, kick + let them rejoin,
      a "my team" screen, and a "leave team" button (incl. letting a player switch
      team themselves while still in the lobby). *(Partially done via the command
      center: host can move/kick any player, mid-game joins stay blocked by design —
      kicked players rejoin only before a game starts. Remaining: player-side "my
      team"/"leave team" UI and lobby self-switching.)*
- [x] **QR-code join** — instead of typing the room code. Also a copy / shareable
      `/play?room=CODE` join link.
- [ ] **Play again** — same room, same players (note: others can still join too).
- [ ] **Tie-breaker mechanism** — optional; the QM can enable it for a game.
- [ ] **Image support** for questions.
- [ ] **Custom team names + colours.**
- [ ] **Per-question timer** — QM-settable and toggleable.

---

_Other ideas from earlier brainstorming, not added above (say the word to fold any
in): steal / rebound mode, per-tile point values, post-game recap, spectator mode,
QM game history._
