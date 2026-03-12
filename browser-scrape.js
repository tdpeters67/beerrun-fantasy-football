/**
 * NFL Fantasy Football Browser Scraper
 *
 * HOW TO USE:
 * 1. Go to fantasy.nfl.com and make sure you're logged in
 * 2. Navigate to your league: fantasy.nfl.com/league/12456354
 * 3. Open DevTools (Cmd+Option+I) → Console tab
 * 4. Copy-paste this entire script and press Enter
 * 5. Wait for it to finish — it will download a fantasy-data.json file
 */

(async function scrapeFantasyData() {
  const LEAGUE_ID = "12456354";
  const SEASONS = [2024, 2025]; // Add more years as needed
  const TOTAL_WEEKS = 17; // Regular season weeks

  const allSeasons = [];

  for (const season of SEASONS) {
    console.log(`\n========== Season ${season} ==========`);

    // Step 1: Fetch standings
    console.log("Fetching standings...");
    const standingsHtml = await fetchPage(
      `/league/${LEAGUE_ID}/history/${season}/standings`
    );

    const teams = parseStandings(standingsHtml);
    console.log(`Found ${teams.length} teams:`, teams.map(t => `${t.teamName} (${t.wins}-${t.losses})`));

    if (teams.length === 0) {
      console.warn("No teams found in standings HTML. Dumping a snippet for debugging:");
      console.log(standingsHtml.substring(0, 2000));
    }

    // Step 2: Fetch weekly matchups
    console.log(`\nFetching weekly matchups (weeks 1-${TOTAL_WEEKS})...`);
    const allMatchups = [];
    for (let week = 1; week <= TOTAL_WEEKS; week++) {
      try {
        const html = await fetchPage(
          `/league/${LEAGUE_ID}/history/${season}/schedule?scheduleDetail=${week}&scheduleType=week&standingsTab=schedule`
        );
        const matchups = parseMatchups(html, week);
        if (matchups.length > 0) {
          allMatchups.push(...matchups);
          console.log(`  Week ${week}: ${matchups.length} matchups`);
        } else {
          console.log(`  Week ${week}: no matchups found`);
        }
      } catch (e) {
        console.warn(`  Week ${week}: ${e.message}`);
      }
      await sleep(400);
    }

    console.log(`\nSeason ${season} total: ${allMatchups.length} matchups`);

    // Build team summaries combining standings + weekly data
    const teamSummaries = buildTeamSummaries(teams, allMatchups);

    allSeasons.push({ season, teams, teamSummaries, matchups: allMatchups });
  }

  // Build final output
  const output = {
    scrapedAt: new Date().toISOString(),
    league: { id: LEAGUE_ID, name: "BeerRun" },
    // Use most recent season as default view
    standings: allSeasons[allSeasons.length - 1]?.teamSummaries || [],
    teamSummaries: allSeasons[allSeasons.length - 1]?.teamSummaries || [],
    matchups: allSeasons.flatMap(s => s.matchups),
    seasons: allSeasons,
  };

  // Download
  const blob = new Blob([JSON.stringify(output, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "fantasy-data.json";
  a.click();

  console.log("\n✅ Done! fantasy-data.json downloaded.");
  console.log(`Seasons: ${allSeasons.map(s => s.season).join(", ")}`);
  console.log(`Total matchups: ${output.matchups.length}`);
  console.log(`Teams: ${output.teamSummaries.map(t => t.teamName).join(", ")}`);
  return output;

  // ============================================================
  // Helper functions
  // ============================================================

  async function fetchPage(path) {
    const res = await fetch(`https://fantasy.nfl.com${path}`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
    return res.text();
  }

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  function parseStandings(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const teams = [];

    // The NFL Fantasy standings table rows
    const rows = doc.querySelectorAll("table tbody tr");

    for (const row of rows) {
      const cells = [...row.querySelectorAll("td")];
      if (cells.length < 2) continue;

      // Find team name — look for any link with team in the href, or bold/anchor text
      const teamLink = row.querySelector('a[href*="/team/"]') ||
                        row.querySelector(".teamName a") ||
                        row.querySelector("a.teamName");
      if (!teamLink) continue;

      const teamName = teamLink.textContent.trim();
      const href = teamLink.getAttribute("href") || "";
      const teamIdMatch = href.match(/\/team\/(\d+)/);
      const teamId = teamIdMatch ? teamIdMatch[1] : String(teams.length + 1);

      // Owner — often in a .teamOwnerName or em tag near the team name
      const ownerEl = row.querySelector(".teamOwnerName") ||
                       row.querySelector("em") ||
                       row.querySelector(".owners");
      const owner = ownerEl ? ownerEl.textContent.trim().replace(/[()]/g, "") : "Unknown";

      // Extract all text from cells to find record and points
      const cellTexts = cells.map(c => c.textContent.trim());

      // Find W-L-T record
      let wins = 0, losses = 0, ties = 0;
      for (const text of cellTexts) {
        const m = text.match(/^(\d+)\s*-\s*(\d+)(?:\s*-\s*(\d+))?$/);
        if (m) {
          wins = parseInt(m[1]);
          losses = parseInt(m[2]);
          ties = m[3] ? parseInt(m[3]) : 0;
          break;
        }
      }

      // Find point values (numbers > 50, likely PF and PA)
      const pointValues = [];
      for (const text of cellTexts) {
        const cleaned = text.replace(/,/g, "");
        const num = parseFloat(cleaned);
        if (!isNaN(num) && num > 50 && !cleaned.match(/-/)) {
          pointValues.push(num);
        }
      }

      let pointsFor = 0, pointsAgainst = 0;
      if (pointValues.length >= 2) {
        pointsFor = pointValues[0];
        pointsAgainst = pointValues[1];
      } else if (pointValues.length === 1) {
        pointsFor = pointValues[0];
      }

      // Win percentage
      const wpctText = cellTexts.find(t => t.match(/^\.\d+$/) || t === "1.000" || t === ".000");
      const winPct = wpctText ? parseFloat(wpctText) : null;

      teams.push({
        teamId, teamName, owner,
        wins, losses, ties,
        pointsFor, pointsAgainst,
        winPct,
        rank: teams.length + 1,
      });
    }

    return teams;
  }

  function parseMatchups(html, week) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const matchups = [];

    // Strategy 1: Look for matchup containers
    const matchupEls = doc.querySelectorAll(".matchup");
    if (matchupEls.length > 0) {
      for (const el of matchupEls) {
        const teamEls = el.querySelectorAll(".teamWrap, .team");
        if (teamEls.length < 2) continue;

        const parsed = [...teamEls].map(parseTeamEl);
        if (parsed.length >= 2 && (parsed[0].name !== "Unknown" || parsed[1].name !== "Unknown")) {
          matchups.push(makeMatchup(parsed[0], parsed[1], week));
        }
      }
    }

    // Strategy 2: Look for schedule table with team pairs
    if (matchups.length === 0) {
      // Find all team links in the page
      const allTeamLinks = doc.querySelectorAll('a[href*="/team/"]');
      const teamEntries = [];

      for (const link of allTeamLinks) {
        const name = link.textContent.trim();
        if (!name || name.length < 2) continue;

        const href = link.getAttribute("href") || "";
        const idMatch = href.match(/\/team\/(\d+)/);
        const id = idMatch ? idMatch[1] : null;

        // Look for a score near this link — walk up to the row/container
        const container = link.closest("tr") || link.closest("li") || link.closest("div");
        if (!container) continue;

        // Find score: look for elements with score-like classes or just numbers
        const scoreEl = container.querySelector(".teamPts, .teamTotal, .teamScore, .score, .pts") ||
                         container.querySelector("td:last-child") ||
                         container.querySelector(".result");
        let score = 0;
        if (scoreEl) {
          const scoreText = scoreEl.textContent.trim().replace(/,/g, "");
          const num = parseFloat(scoreText);
          if (!isNaN(num) && num > 0 && num < 500) score = num;
        }

        // Also scan sibling elements for a number
        if (score === 0 && container.tagName === "TR") {
          const tds = container.querySelectorAll("td");
          for (const td of tds) {
            const num = parseFloat(td.textContent.trim().replace(/,/g, ""));
            if (!isNaN(num) && num > 20 && num < 300) {
              score = num;
              break;
            }
          }
        }

        teamEntries.push({ id, name, score });
      }

      // Pair them up (home/away alternating)
      for (let i = 0; i + 1 < teamEntries.length; i += 2) {
        matchups.push(makeMatchup(teamEntries[i], teamEntries[i + 1], week));
      }
    }

    return matchups;
  }

  function parseTeamEl(el) {
    const nameEl = el.querySelector(".teamName a, a.teamName, .teamName") ||
                    el.querySelector('a[href*="/team/"]');
    const name = nameEl?.textContent?.trim() || "Unknown";
    const href = nameEl?.getAttribute("href") || "";
    const idMatch = href.match(/\/team\/(\d+)/);
    const id = idMatch ? idMatch[1] : null;

    const scoreEl = el.querySelector(".teamTotal, .teamPts, .teamScore, .score, .pts");
    const score = parseFloat(scoreEl?.textContent?.trim()?.replace(/,/g, "") || "0") || 0;

    return { id, name, score };
  }

  function makeMatchup(team1, team2, week) {
    return {
      week,
      homeTeamId: team1.id,
      homeTeamName: team1.name,
      homeScore: team1.score,
      awayTeamId: team2.id,
      awayTeamName: team2.name,
      awayScore: team2.score,
      winner: team1.score > team2.score ? team1.id
            : team2.score > team1.score ? team2.id
            : null,
    };
  }

  function buildTeamSummaries(standingsTeams, matchups) {
    const summaries = {};

    for (const t of standingsTeams) {
      summaries[t.teamId] = {
        ...t,
        weeklyScores: [],
        highScore: 0,
        avgScore: 0,
      };
    }

    for (const m of matchups) {
      for (const side of ["home", "away"]) {
        const id = side === "home" ? m.homeTeamId : m.awayTeamId;
        const name = side === "home" ? m.homeTeamName : m.awayTeamName;
        const pts = side === "home" ? m.homeScore : m.awayScore;

        if (!id) continue;
        if (!summaries[id]) {
          summaries[id] = {
            teamId: id, teamName: name, owner: "Unknown",
            wins: 0, losses: 0, ties: 0,
            pointsFor: 0, pointsAgainst: 0,
            rank: 0, weeklyScores: [], highScore: 0, avgScore: 0,
          };
        }
        summaries[id].weeklyScores.push({ week: m.week, score: pts });
        if (pts > summaries[id].highScore) summaries[id].highScore = pts;
      }
    }

    for (const s of Object.values(summaries)) {
      const scores = s.weeklyScores.map(w => w.score);
      s.avgScore = scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
        : 0;
      s.weeklyScores.sort((a, b) => a.week - b.week);
    }

    return Object.values(summaries).sort(
      (a, b) => b.wins - a.wins || a.losses - b.losses || b.pointsFor - a.pointsFor
    );
  }
})();
