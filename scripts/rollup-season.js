/**
 * TVYC Darts — season rollup
 * Aggregates results/2026-27/nights/*.json → stats/2026-27/season.json shape.
 * Usable in Node (fs) or browser (pass night objects).
 * Half-wins (0.5) supported in season W-L.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TVYCRollup = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function teamKey(n) { return 't' + Number(n); }

  function ensureTeam(map, number, name) {
    const k = teamKey(number);
    if (!map[k]) {
      map[k] = {
        number: Number(number),
        name: name || ('Team ' + number),
        wins: 0,
        losses: 0,
        nights: 0,
        gameWins: 0,
        gameLosses: 0
      };
    } else if (name && (!map[k].name || map[k].name.indexOf('Team ') === 0)) {
      map[k].name = name;
    }
    return map[k];
  }

  function nightMatchWins(night) {
    const tw = night.totalWins || { left: 0, right: 0 };
    return {
      left: Number(tw.left) || 0,
      right: Number(tw.right) || 0
    };
  }

  /** Match W-L: team with more totalWins gets 1 match win; tie → 0.5 each. */
  function applyMatchResult(teams, night) {
    const L = ensureTeam(teams, night.leftTeamNumber, night.focusTeam && night.leftTeamNumber === night.focusTeam.number ? night.focusTeam.name : (night.leftTeamName || ''));
    const R = ensureTeam(teams, night.rightTeamNumber, night.opponentTeam && night.rightTeamNumber === night.opponentTeam.number ? night.opponentTeam.name : (night.rightTeamName || ''));
    if (night.focusTeam) {
      ensureTeam(teams, night.focusTeam.number, night.focusTeam.name);
    }
    if (night.opponentTeam) {
      ensureTeam(teams, night.opponentTeam.number, night.opponentTeam.name);
    }
    const left = ensureTeam(teams, night.leftTeamNumber,
      (night.leftTeamNumber === (night.focusTeam && night.focusTeam.number) ? (night.focusTeam && night.focusTeam.name) : null) ||
      (night.leftTeamNumber === (night.opponentTeam && night.opponentTeam.number) ? (night.opponentTeam && night.opponentTeam.name) : null) ||
      L.name);
    const right = ensureTeam(teams, night.rightTeamNumber,
      (night.rightTeamNumber === (night.focusTeam && night.focusTeam.number) ? (night.focusTeam && night.focusTeam.name) : null) ||
      (night.rightTeamNumber === (night.opponentTeam && night.opponentTeam.number) ? (night.opponentTeam && night.opponentTeam.name) : null) ||
      R.name);

    const mw = nightMatchWins(night);
    left.gameWins += mw.left;
    left.gameLosses += mw.right;
    right.gameWins += mw.right;
    right.gameLosses += mw.left;
    left.nights += 1;
    right.nights += 1;

    if (mw.left > mw.right) { left.wins += 1; right.losses += 1; }
    else if (mw.right > mw.left) { right.wins += 1; left.losses += 1; }
    else { left.wins += 0.5; left.losses += 0.5; right.wins += 0.5; right.losses += 0.5; }
  }

  function weekKey(date) { return date || 'unknown'; }

  function rollupNights(nights, opts) {
    opts = opts || {};
    const teams = {};
    const weeksMap = {};
    const allShots = [];

    (nights || []).forEach(function (night) {
      if (!night || night.schema !== 'tvyc-darts-night/v1') return;
      applyMatchResult(teams, night);
      const wk = weekKey(night.date);
      if (!weeksMap[wk]) {
        weeksMap[wk] = {
          date: night.date,
          dateLabel: night.dateLabel || night.date,
          results: [],
          greatShots: []
        };
      }
      const mw = nightMatchWins(night);
      function nameFor(num) {
        if (night.focusTeam && Number(night.focusTeam.number) === Number(num)) return night.focusTeam.name;
        if (night.opponentTeam && Number(night.opponentTeam.number) === Number(num)) return night.opponentTeam.name;
        return '#' + num;
      }
      weeksMap[wk].results.push({
        board: night.board || '',
        leftTeamNumber: night.leftTeamNumber,
        rightTeamNumber: night.rightTeamNumber,
        leftName: nameFor(night.leftTeamNumber),
        rightName: nameFor(night.rightTeamNumber),
        wins: mw,
        path: night._path || null
      });
      (night.greatShots || []).forEach(function (gs) {
        const row = Object.assign({}, gs, { date: night.date, board: night.board || '' });
        weeksMap[wk].greatShots.push(row);
        allShots.push(row);
      });
    });

    const teamList = Object.keys(teams).map(function (k) { return teams[k]; });
    teamList.sort(function (a, b) {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (a.losses !== b.losses) return a.losses - b.losses;
      return a.number - b.number;
    });

    const weeks = Object.keys(weeksMap).sort().reverse().map(function (k) { return weeksMap[k]; });

    return {
      schema: 'tvyc-darts-season/v1',
      seasonId: opts.seasonId || '2026-27',
      label: opts.label || "Tellico Village Dart League '26-27'",
      teams: teamList,
      weeks: weeks,
      greatShots: allShots,
      updatedAt: new Date().toISOString()
    };
  }

  function formatDigest(season, weekDate) {
    const weeks = season.weeks || [];
    const week = weeks.find(function (w) { return w.date === weekDate; }) || weeks[0];
    if (!week) return 'No week results yet.';
    const lines = [];
    lines.push('TVYC Darts — Week of ' + (week.dateLabel || week.date));
    lines.push('');
    lines.push('RESULTS');
    (week.results || []).forEach(function (r) {
      lines.push(
        'Bd ' + (r.board || '?') + ': ' +
        r.leftName + ' ' + r.wins.left + ' – ' + r.wins.right + ' ' + r.rightName
      );
    });
    lines.push('');
    lines.push('STANDINGS (season)');
    (season.teams || []).forEach(function (t, i) {
      const w = t.wins % 1 === 0 ? String(t.wins) : t.wins.toFixed(1);
      const l = t.losses % 1 === 0 ? String(t.losses) : t.losses.toFixed(1);
      lines.push((i + 1) + '. ' + t.name + '  ' + w + '-' + l);
    });
    lines.push('');
    lines.push('GREAT SHOTS');
    const shots = week.greatShots || [];
    if (!shots.length) lines.push('(none recorded)');
    else {
      shots.forEach(function (s) {
        let bit = s.player || '?';
        if (s.kind === 'ton') bit += ' — ' + s.value;
        else if (s.kind === 'marks') bit += ' — ' + s.value + ' count' + (s.detail ? ' (' + s.detail + ')' : '');
        else if (s.kind === 'bulls') bit += ' — ' + s.value + ' bulls';
        else if (s.kind === 'highOut') bit += ' — out ' + s.value;
        else if (s.kind === 'firstOut') bit += ' — first out ' + s.value;
        else bit += ' — ' + (s.kind || '') + ' ' + (s.value || '');
        if (s.board) bit += ' [Bd ' + s.board + ']';
        lines.push(bit);
      });
    }
    lines.push('');
    lines.push('— TVYC Darts');
    return lines.join('\n');
  }

  return { rollupNights: rollupNights, formatDigest: formatDigest };
});
