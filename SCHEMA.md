# TVYC Darts Night schema — `tvyc-darts-night/v1`

League nights only. Scores stay local until End Night → Verify → Submit.

## Paths
- `results/2026-27/nights/{YYYY-MM-DD}_{focusSlug}_vs_{oppSlug}_b{board}.json`
- `results/2026-27/weeks/w{NN}.json` — weekly digest (standings snapshot + Great Shots); used when seeding from organizer emails without inventing per-match scores
- `results/2026-27/index.json` — list of night/week file paths + meta
- `stats/2026-27/season.json` — rollup (W-L, great shots); may include `seed` meta when backfilled from emails
- `standings.html` — public standings + week digest

## Night file
```json
{
  "schema": "tvyc-darts-night/v1",
  "seasonId": "2026-27",
  "date": "2026-10-07",
  "dateLabel": "6-Oct",
  "board": "A",
  "focusTeam": { "number": 4, "name": "Dartaholics" },
  "opponentTeam": { "number": 1, "name": "Cold Darted" },
  "leftTeamNumber": 4,
  "rightTeamNumber": 1,
  "present": { "left": ["…"], "right": ["…"] },
  "games": [
    {
      "round": 1,
      "label": "Doubles Cricket",
      "type": "Cricket",
      "left": ["…"],
      "right": ["…"],
      "winnerSide": 0,
      "wins": { "left": 1, "right": 0 },
      "highlights": []
    }
  ],
  "totalWins": { "left": 5, "right": 3 },
  "greatShots": [
    { "kind": "ton|marks|bulls|highOut|firstOut", "player": "…", "value": 100, "round": 3, "side": 0, "detail": "" }
  ],
  "submittedAt": "2026-10-07T23:15:00-04:00",
  "appVersion": "1.2.0"
}
```

`wins` per game may be `0`, `0.5`, or `1` (half-wins allowed in season totals).
Great Shots: Cricket 5+ counts / 3+ bulls; 01 tons 100+, high out 50+, first out.

## Week digest (email seed) — `tvyc-darts-week-digest/v1`
Cumulative season W-L after that week + Great Shots list from Kevin&Ray email.
`results` stays empty when per-match scores are unknown (do not invent them).
