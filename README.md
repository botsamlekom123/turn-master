# Turn Master — Multiplayer

Turn Master is a React, TypeScript, and Vite party-game SPA. Multiplayer room state and game results are stored in Supabase; the browser never writes scores or round state directly.

## Local setup

Requirements: Node.js 22.12 or newer and a Supabase project.

1. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` plus the project's public anon/publishable key. Never put a Supabase service-role key in Vite environment variables.
2. In Supabase Auth settings, enable **Anonymous Sign-Ins**.
3. Apply the SQL files in `supabase/migrations/` in filename order in the Supabase SQL Editor. To use the CLI instead, initialize/link a Supabase CLI project and push the migrations.
4. Install and start the app:

   ```sh
   npm install
   npm run dev
   ```

Room state updates are delivered over Supabase Realtime. The public lobby refreshes every five seconds. Returning players keep their anonymous auth session and last room in browser storage.

## Deploy to Cloudflare Pages

The app is a static Vite site; Supabase remains its hosted multiplayer backend.

1. Publish this project to a GitHub repository using GitHub Desktop or another Git client. Keep `.env.local` out of Git; it is ignored by `.gitignore`.
2. In Cloudflare, open **Workers & Pages → Create application → Pages → Connect to Git**, then select the repository.
3. Configure the build:
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Build output directory: `dist`
4. In the Pages project's **Settings → Environment variables**, add these variables for **Production** (and Preview if needed):
   - `VITE_SUPABASE_URL`: the Supabase project URL.
   - `VITE_SUPABASE_ANON_KEY`: the Supabase anon/publishable key.

   The anon/publishable key is intended for browser use. Never add a Supabase service-role key to a `VITE_` variable or the client app.
5. Save the settings and deploy. In Supabase Auth URL Configuration, set the deployed `*.pages.dev` URL as the Site URL and add it to the allowed Redirect URLs. Confirm Anonymous Sign-Ins are enabled and all SQL migrations in `supabase/migrations/` have been applied to the same Supabase project.
6. Open the Pages URL on phones and other devices. Changes pushed to the connected GitHub branch will trigger a new deployment.

`public/_redirects` sends app routes to `index.html`, so the single-page app also loads correctly when opened directly.

## Deploy to Vercel

Alternatively, import the GitHub repository into Vercel. Use `npm run build` as the build command and `dist` as the output directory, add the same two `VITE_SUPABASE_*` environment variables, deploy, and add the deployed URL to Supabase Auth's allowed Redirect URLs. `vercel.json` provides the single-page app route fallback for Vercel.

## Game rules

- Hosts create public or private rooms, choose a turn mode, and select one mini-game. Rooms support up to 16 players.
- **Bomb Roulette:** the server secretly picks a trigger turn. The active player has 30 seconds to act; timing out loses the round.
- **Reflex Test:** the server schedules a signal and records response receipt times. The latest valid response loses; if players do not respond before the deadline, the first non-responder by join order loses. Network latency affects this casual-game result.
- **Word Chain:** each player has 10 seconds to submit a non-repeated word from the imported KBBI 1.0.0 word list, starting with the previous word's last letter. Only lowercase ASCII entries of 2–20 letters are included; phrases, punctuation, and other characters are excluded. A wrong word or timeout loses.
- Loser scores are updated once by the database. In Elimination mode the loser is removed from subsequent turns, remains in the room as a spectator, and the next round starts automatically until one active player remains. In other modes the next turn order follows Loser First, Reverse Order, or Pure Random.
- After an Elimination match ends, the host can return the room to its lobby without clearing scores. The lobby shows the winner and final loser scores; starting another match preserves the tracker, while **Reset skor** clears it.

Game-changing actions are implemented as authenticated Postgres RPCs with membership/host checks. Direct client writes to room tables are revoked; RLS restricts Realtime room-event reads to current members. Private room codes are only returned through authenticated room RPCs and are not present in the public room listing.

The Word Chain dictionary data comes from the downloaded `kumpulan-kata-bahasa-indonesia-KBBI` repository's `list_1.0.0.txt` file and is filtered to match the game's input rules.

## Checks

```sh
npm test
npm run build
npm audit
```

The unit tests run without a Supabase project. Live multi-browser tests require the local Supabase environment above.
