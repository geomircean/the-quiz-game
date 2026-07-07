# Team Quiz Show — Project Plan

## What we're building
A quiz show for people in the same room, in the style of Jackbox party games. One person is the Quizmaster (QM). Everyone else joins from their phone by typing a short room code, and plays in one of two teams.

The QM builds quizzes ahead of time from a personal library of questions, then runs a quiz live. The QM shares their screen (or uses a big screen) so everyone can see the game board. Phones are used only to join, pick a team, and answer.

## Guiding principles
1. Keep it simple.
2. Use plain words.
3. No complicated deployment. It should be free to host.
4. When something is unclear, ask — don't assume.

## The three parts of the app
It's a single website with three "modes":
- **Build** (QM only): create and save questions and quizzes.
- **Host** (QM only): run a live quiz — show the board, share the code, reveal questions and answers, keep score.
- **Play** (players): join with a code and a name, pick a team, answer.

## How a game plays out
1. The QM opens Host mode and starts a saved quiz. They get a short room code.
2. Players open the site on their phones, type the code, enter a name, and choose one of the two teams.
3. When everyone's in, the QM starts the game. The big screen shows a board of tiles. Each tile is one question, labeled with a short, catchy name. The board is never shown on phones.
4. Teams take turns. On a team's turn, they talk it over out loud and say which tile they want. The QM clicks that tile.
5. The question and its answer choices appear on the big screen and on everyone's phone. Only the picking team's phones can actually tap an answer; the other team just watches.
6. The picking team settles on an answer (see "How a team answers" below).
7. The QM reveals the result. The correct answer turns green; a wrong pick turns red. A correct answer earns the team 1 point; a wrong one earns 0. There is no stealing.
8. That tile is now used up and can't be picked again by anyone. The turn passes to the other team.
9. When every tile has been used, the game ends. The team with more points wins. If both teams end with the same score, it's shown as a tie for now. *(Marked to possibly revisit — we could add a tiebreaker later.)*

There is no timer. The QM controls the pace and decides when to reveal and when to move on.

## How a team answers
Each quiz has a setting the QM chooses when building it:
- **First tap locks it:** the first player on the team to tap an answer locks in that choice for the whole team.
- **Majority wins:** every player on the team taps, and the answer with the most taps becomes the team's answer. If the taps tie, it counts as wrong for now. *(Marked to possibly revisit.)*

## Questions and quizzes (the data)
Questions are saved on their own so they can be reused. A quiz is just a chosen set of questions plus some settings.

**A Question has:**
- A tile name — the short, catchy phrase shown on the board.
- The question text.
- A list of answer choices. The number can vary from question to question.
- A mark showing which one choice is correct.
- (Later, if wanted: tags to organize the library.)

**A Quiz has:**
- A name.
- The two teams' setup.
- The answer mode (first tap, or majority).
- The set of questions that fill the board.

A quiz points to questions from the library, so the same question can sit in many quizzes. Because a quiz points to a question rather than copying it, **editing a library question updates it everywhere it's used** — including in quizzes you've already built. That's intended: fix a typo once and it's fixed everywhere.

*Delete rule:* a library question **cannot be deleted while any quiz still uses it.** To remove it, you first take it out of every quiz that uses it, then delete it. The app should show you which quizzes use a question so it's clear what to unlink first. This keeps a board from ever ending up with a missing tile.

## Teams
- Two teams to start with.
- Players pick their own team when they join.
- No limit on team size, and no forced balancing.
- Team names: for the MVP, use default names (for example, "Team 1" and "Team 2"). Custom names are a maybe for later, if it turns out people want them.

## The technical shape
- One website, with no server for you to run or maintain.
- **Firebase** stores everything (your library, your quizzes, and each live game) and keeps every phone in sync in real time. The browser talks to Firebase directly, so there's nothing to deploy but the website's own files.
- Host the website for free on Netlify, GitHub Pages, or Firebase Hosting. Putting it there is basically uploading files.
- The QM signs in with **Google sign-in** (one tap, no passwords to manage). Players don't sign in — their phone quietly gets a temporary guest identity so the rules can still tell everyone apart.

## Security (locked down, not the loose defaults)
Firebase's out-of-the-box rules are wide open, so we replace them with strict, deny-by-default rules:
- **Private library and quizzes:** only your account can read or write your questions and quizzes. Players never see them.
- **Guest identities for players:** every phone gets an invisible temporary ID, so no one can pretend to be another player.
- **Controlled writing during a game:** only the host can change scores, whose turn it is, and when a question is revealed. A player can only submit their own team's answer, in their own room, on their team's turn. Room members can read the shared game state and nothing else.
- **The correct answer never reaches phones:** players' phones only receive the question and the choices — never which one is right. The host screen knows the answer and checks it at reveal time. There's nothing hidden in the page for a player to dig out.
- **Rooms are sealed:** you can only read a room you've actually joined.
- (If you ever want a neutral server to check answers instead of the host screen, we can add that later. It isn't needed for a room of friends.)

## Settled, with a few notes
The small decisions are now made and folded into the plan above:
- **Library edits ripple everywhere.** Quizzes point to questions, so an edit updates every quiz that uses it.
- **Default team names for the MVP.** Custom names are a later maybe.
- **A majority-vote tie counts as wrong** — marked to possibly revisit.
- **A final-score tie is just a tie** — marked to possibly revisit.

**To keep in mind while building (behavior, not decisions):**
- **Reconnecting:** if a phone locks or refreshes mid-game, the player should slide back into their team and the current state, not get kicked out.
- **Fair board size:** because teams alternate picks, an even number of tiles keeps it fair — each team picks the same number. An odd board gives one team a last extra pick.
- **Deleting a used question:** not allowed. A question can only be deleted once no quiz uses it. Show which quizzes use it so the QM knows what to unlink first.

## A rough order to build in (when you're ready)
1. Google sign-in and the private question library (create, edit, list questions).
2. Quiz builder (pick questions into a board, set teams and answer mode, save).
3. Host mode with a live room and code; players joining and picking teams.
4. The live loop: pick tile, reveal question, collect the team's answer, reveal result, score, pass the turn, end the game.
5. Tighten the security rules and test that a player can't reach anything they shouldn't.
