# Beer Run Fantasy Football

Historical stats dashboard for the Beer Run fantasy football league. Scrapes data from the NFL Fantasy API and displays it in a Vercel-hosted Next.js app.

## Setup

```bash
npm install
```

## Scraping NFL Fantasy Data

The NFL Fantasy API uses Gigya cookie-based auth (not Bearer tokens).

1. Log into [fantasy.nfl.com](https://fantasy.nfl.com) in your browser
2. Open DevTools → Network tab → filter by `api.fantasy.nfl.com`
3. Click around in your league to trigger API calls
4. Click any API request → Headers → Request Headers → copy the full **Cookie** value
5. Run the scraper:

```bash
NFL_COOKIE="your-cookie-string-here" node scrape.mjs
```

Optional env vars:
- `LEAGUE_ID` — defaults to `12456354` (BeerRun)
- `SEASON` — year to scrape (default: `2024`)
- `TOTAL_WEEKS` — number of weeks (default: `17`)

This outputs `public/fantasy-data.json`.

**Note:** The Gigya login token lasts a while but will eventually expire. Grab a fresh cookie if you get 401 errors. The NFL API response shape can vary between seasons — if fields look wrong, log the raw response and adjust `normalizeMatchup()` in `scrape.mjs`.

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

```bash
npx vercel
```

Or connect the repo to Vercel for auto-deploys on push.

## Pages

- **/** — Standings table + weekly scoreboard
- **/team/[id]** — Team detail with score bar chart and head-to-head records
