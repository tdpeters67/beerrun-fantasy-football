# Goodell What About the Good Things? — Fantasy Football

Commissioner site for the ESPN fantasy league **"Goodell What About the Good Things?"** (leagueId `607424913`, 2026 season). Standings, weekly recaps, league records, and the draft board — all built from ESPN's fantasy API.

## Setup

This is a private ESPN league, so the data scripts need two auth cookies from a logged-in browser session. Put them in `.env.espn` (gitignored):

```
ESPN_S2=<espn_s2 cookie value>
SWID={<SWID cookie value, keep the braces>}
LEAGUE_ID=607424913
SEASON=2026
```

Grab them from Chrome: DevTools (Cmd+Opt+I) → **Application → Storage → Cookies → https://fantasy.espn.com** → copy `espn_s2` and `SWID`. They expire every few weeks — re-grab when a script starts returning `HTTP 401`.

## Weekly workflow

Run these the Tuesday after each week's Monday Night Football:

```bash
npm run recap    # prints a text recap of the latest completed week (also saves public/espn-week-<n>.json)
npm run data     # rebuilds public/fantasy-data.json that the website reads
npm run dev      # preview the site at http://localhost:3000
```

To publish a new recap on the site, write it to `recaps/week-<n>.md`, then run `npm run data` — the builder folds authored recaps into the site data.

## Scripts

- **`build-site-data.mjs`** (`npm run data`) — pulls teams, owners, standings, matchups, the draft, and per-week player boxscores; computes records; embeds `recaps/*.md`; writes `public/fantasy-data.json`.
- **`espn-scrape.mjs`** (`npm run recap`) — quick text recap for the latest completed week. `--week N` for a specific week, `--json` for raw data.

## Site

Next.js (App Router). Pages: Standings (`/`), Recaps (`/recaps`), Records (`/records`), Draft (`/draft`), Team detail (`/team/[id]`). All read `public/fantasy-data.json` client-side.
