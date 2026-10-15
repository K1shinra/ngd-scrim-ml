import { MatchHistoryRecord, PlayerProfile } from '../data/ngdData';
import { cleanPlayerIgn } from './scrimEngine';

export interface PlayerLeaderboardStats {
  ign: string;
  overallRating: number;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  gold: number;
  heroDamage: number;
  damageTaken: number;
  games: number;
  wins: number;
  mvps: number;
}

// Sample baseline seed stats matching the user's community scrim records
export const DEFAULT_LEADERBOARD_BASELINE: PlayerLeaderboardStats[] = [
  {
    ign: 'Whis',
    overallRating: 770.23,
    kills: 100,
    deaths: 28,
    assists: 117,
    kda: 7.75,
    gold: 206225,
    heroDamage: 1050969,
    damageTaken: 1159797,
    games: 15,
    wins: 11,
    mvps: 6,
  },
  {
    ign: 'Setsuko.',
    overallRating: 673.57,
    kills: 96,
    deaths: 31,
    assists: 131,
    kda: 7.32,
    gold: 189523,
    heroDamage: 852794,
    damageTaken: 1270960,
    games: 15,
    wins: 10,
    mvps: 5,
  },
  {
    ign: 'Mi amor.',
    overallRating: 634.39,
    kills: 84,
    deaths: 26,
    assists: 110,
    kda: 7.46,
    gold: 164135,
    heroDamage: 938621,
    damageTaken: 1102339,
    games: 14,
    wins: 9,
    mvps: 4,
  },
  {
    ign: 'xTriggered',
    overallRating: 613.5,
    kills: 79,
    deaths: 47,
    assists: 116,
    kda: 3.36,
    gold: 146203,
    heroDamage: 698240,
    damageTaken: 1215011,
    games: 14,
    wins: 8,
    mvps: 3,
  },
  {
    ign: 'syven kai',
    overallRating: 549.66,
    kills: 93,
    deaths: 34,
    assists: 98,
    kda: 5.62,
    gold: 153000,
    heroDamage: 834485,
    damageTaken: 945200,
    games: 13,
    wins: 8,
    mvps: 3,
  },
  {
    ign: 'db sion',
    overallRating: 499.87,
    kills: 62,
    deaths: 39,
    assists: 88,
    kda: 3.85,
    gold: 138400,
    heroDamage: 764599,
    damageTaken: 1180126,
    games: 13,
    wins: 7,
    mvps: 2,
  },
  {
    ign: 'yang',
    overallRating: 428.27,
    kills: 58,
    deaths: 35,
    assists: 106,
    kda: 4.69,
    gold: 129800,
    heroDamage: 642300,
    damageTaken: 876200,
    games: 12,
    wins: 6,
    mvps: 2,
  },
  {
    ign: 'Joshy',
    overallRating: 377.9,
    kills: 52,
    deaths: 24,
    assists: 74,
    kda: 3.58,
    gold: 118500,
    heroDamage: 542100,
    damageTaken: 730400,
    games: 10,
    wins: 6,
    mvps: 3,
  },
  {
    ign: 'FAVIANNN',
    overallRating: 349.18,
    kills: 44,
    deaths: 29,
    assists: 82,
    kda: 4.34,
    gold: 109200,
    heroDamage: 498300,
    damageTaken: 689400,
    games: 9,
    wins: 5,
    mvps: 1,
  },
  {
    ign: 'ALING MIRASOL',
    overallRating: 243.95,
    kills: 31,
    deaths: 27,
    assists: 59,
    kda: 3.33,
    gold: 89400,
    heroDamage: 387600,
    damageTaken: 512300,
    games: 7,
    wins: 4,
    mvps: 1,
  },
  {
    ign: 'S',
    overallRating: 320.15,
    kills: 45,
    deaths: 17,
    assists: 58,
    kda: 4.27,
    gold: 98400,
    heroDamage: 452100,
    damageTaken: 589200,
    games: 8,
    wins: 5,
    mvps: 2,
  },
  {
    ign: 'Lux.',
    overallRating: 315.4,
    kills: 48,
    deaths: 20,
    assists: 55,
    kda: 3.87,
    gold: 105200,
    heroDamage: 512400,
    damageTaken: 498100,
    games: 7,
    wins: 5,
    mvps: 3,
  },
  {
    ign: 'Lygophile',
    overallRating: 295.6,
    kills: 38,
    deaths: 18,
    assists: 54,
    kda: 3.8,
    gold: 94300,
    heroDamage: 421000,
    damageTaken: 467200,
    games: 7,
    wins: 4,
    mvps: 1,
  },
];

/**
 * Computes aggregated tournament/scrim performance stats combining
 * the baseline records with any matches played and saved in matchHistory.
 */
export function aggregatePlayerLeaderboardStats(
  matchHistory: MatchHistoryRecord[],
  players: PlayerProfile[] = []
): PlayerLeaderboardStats[] {
  const map = new Map<string, PlayerLeaderboardStats>();

  // Start with baseline records
  for (const b of DEFAULT_LEADERBOARD_BASELINE) {
    const key = cleanPlayerIgn(b.ign).toLowerCase();
    map.set(key, { ...b, ign: cleanPlayerIgn(b.ign) });
  }

  // Ensure all known roster players exist
  for (const p of players) {
    const clean = cleanPlayerIgn(p.ign);
    const key = clean.toLowerCase();
    if (!map.has(key)) {
      map.set(key, {
        ign: clean,
        overallRating: Number((p.wins * 15.5 + p.mvpCount * 12.0).toFixed(2)),
        kills: p.wins * 6,
        deaths: p.losses * 4,
        assists: p.wins * 8,
        kda: Number(((p.wins * 6 + p.wins * 8) / Math.max(1, p.losses * 4)).toFixed(2)),
        gold: (p.wins + p.losses) * 11000,
        heroDamage: (p.wins + p.losses) * 65000,
        damageTaken: (p.wins + p.losses) * 72000,
        games: p.wins + p.losses,
        wins: p.wins,
        mvps: p.mvpCount,
      });
    }
  }

  // Incorporate completed matches from history
  for (const match of matchHistory) {
    const allParticipants = [...match.teamBlue, ...match.teamRed];
    for (const part of allParticipants) {
      const clean = cleanPlayerIgn(part.ign);
      if (!clean) continue;
      const key = clean.toLowerCase();

      let stat = map.get(key);
      if (!stat) {
        stat = {
          ign: clean,
          overallRating: 0,
          kills: 0,
          deaths: 0,
          assists: 0,
          kda: 0,
          gold: 0,
          heroDamage: 0,
          damageTaken: 0,
          games: 0,
          wins: 0,
          mvps: 0,
        };
        map.set(key, stat);
      }

      stat.games += 1;
      const isWinner =
        (match.winner === 'Blue' && match.teamBlue.some((p) => cleanPlayerIgn(p.ign).toLowerCase() === key)) ||
        (match.winner === 'Red' && match.teamRed.some((p) => cleanPlayerIgn(p.ign).toLowerCase() === key));
      if (isWinner) stat.wins += 1;
      if (match.mvpIgn && cleanPlayerIgn(match.mvpIgn).toLowerCase() === key) {
        stat.mvps += 1;
      }

      // Parse KDA
      if (part.kda) {
        const kdaMatch = part.kda.match(/(\d+)\s*[/–-]\s*(\d+)\s*[/–-]\s*(\d+)/);
        if (kdaMatch) {
          const k = parseInt(kdaMatch[1], 10) || 0;
          const d = parseInt(kdaMatch[2], 10) || 0;
          const a = parseInt(kdaMatch[3], 10) || 0;
          stat.kills += k;
          stat.deaths += d;
          stat.assists += a;
        }
      }

      if (typeof part.gold === 'number' && part.gold > 0) {
        stat.gold += part.gold;
      }
      if (typeof part.heroDamage === 'number' && part.heroDamage > 0) {
        stat.heroDamage += part.heroDamage;
      }
      if (typeof part.damageTaken === 'number' && part.damageTaken > 0) {
        stat.damageTaken += part.damageTaken;
      }

      const ratingVal = parseFloat(part.rating || '0') || 7.0;
      stat.overallRating = Number((stat.overallRating + ratingVal * 2.5).toFixed(2));
    }
  }

  // Recalculate KDAs
  for (const s of map.values()) {
    s.kda = Number(
      ((s.kills + s.assists) / Math.max(1, s.deaths)).toFixed(2)
    );
  }

  return Array.from(map.values());
}

/**
 * Generates the exact Messenger GC text requested by the user
 */
export function generateScrimResultsAndLeaderboardsText(
  statsList: PlayerLeaderboardStats[],
  dateStr?: string
): string {
  const currentDate =
    dateStr ||
    new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

  // 1. Overall Rating Rankings (Top 10)
  const sortedOverall = [...statsList]
    .sort((a, b) => b.overallRating - a.overallRating)
    .slice(0, 10);

  // 2. Top Kills (Top 5)
  const sortedKills = [...statsList]
    .sort((a, b) => b.kills - a.kills)
    .slice(0, 5);

  // 3. Top Gold (Top 5)
  const sortedGold = [...statsList]
    .sort((a, b) => b.gold - a.gold)
    .slice(0, 5);

  // 4. Top Assists (Top 5)
  const sortedAssists = [...statsList]
    .sort((a, b) => b.assists - a.assists)
    .slice(0, 5);

  // 5. Top Hero Damage (Top 5)
  const sortedDamage = [...statsList]
    .sort((a, b) => b.heroDamage - a.heroDamage)
    .slice(0, 5);

  // 6. Top KDA (Top 5)
  const sortedKda = [...statsList]
    .filter((p) => p.games >= 2)
    .sort((a, b) => b.kda - a.kda)
    .slice(0, 5);

  // 7. Top Damage Taken (Top 5)
  const sortedTaken = [...statsList]
    .sort((a, b) => b.damageTaken - a.damageTaken)
    .slice(0, 5);

  // Highlights
  const overallLeader = sortedOverall[0]?.ign || 'N/A';
  const killLeader = sortedKills[0]?.ign || 'N/A';
  const goldLeader = sortedGold[0]?.ign || 'N/A';
  const assistLeader = sortedAssists[0]?.ign || 'N/A';
  const damageLeader = sortedDamage[0]?.ign || 'N/A';
  const kdaLeader = sortedKda[0]?.ign || 'N/A';
  const takenLeader = sortedTaken[0]?.ign || 'N/A';

  const formatRank = (idx: number, ign: string, val: string | number) => {
    const formattedVal =
      typeof val === 'number' ? Number(val).toLocaleString('en-US') : val;
    if (idx === 0) return `🥇 1. ${ign} — ${formattedVal}`;
    if (idx === 1) return `🥈 2. ${ign} — ${formattedVal}`;
    if (idx === 2) return `🥉 3. ${ign} — ${formattedVal}`;
    return `${ign} — ${formattedVal}`;
  };

  const lines: string[] = [
    '🏆 SCRIM RESULTS & LEADERBOARDS',
    `📅 As of ${currentDate}`,
    '📊 Overall Rating Rankings',
    '',
    ...sortedOverall.map((p, idx) =>
      formatRank(idx, p.ign, p.overallRating.toFixed(2))
    ),
    '',
    '⚔️ PERFORMANCE LEADERBOARDS',
    '🔥 Top Kills',
    ...sortedKills.map((p, idx) => formatRank(idx, p.ign, p.kills)),
    '',
    '💰 Top Gold',
    ...sortedGold.map((p, idx) => formatRank(idx, p.ign, p.gold)),
    '',
    '🤝 Top Assists',
    ...sortedAssists.map((p, idx) => formatRank(idx, p.ign, p.assists)),
    '',
    '⚔️ Top Hero Damage',
    ...sortedDamage.map((p, idx) => formatRank(idx, p.ign, p.heroDamage)),
    '',
    '🎯 Top KDA',
    ...sortedKda.map((p, idx) => formatRank(idx, p.ign, p.kda.toFixed(2))),
    '',
    '🛡️ Top Damage Taken',
    ...sortedTaken.map((p, idx) => formatRank(idx, p.ign, p.damageTaken)),
    '',
    '🏆 DAILY HIGHLIGHTS',
    `👑 Overall Rating Leader: ${overallLeader}`,
    `🔥 Kill Leader: ${killLeader}`,
    `💰 Gold Leader: ${goldLeader}`,
    `🤝 Assist Leader: ${assistLeader}`,
    `⚔️ Hero Damage Leader: ${damageLeader}`,
    `🎯 KDA Leader: ${kdaLeader}`,
    `🛡️ Damage Taken Leader: ${takenLeader}`,
    '',
    "📈 GGs, everyone! Congratulations to today's leaderboard leaders. Keep grinding, keep improving, and see you in the next scrim! 🔥",
  ];

  return lines.join('\n');
}

/**
 * Parses pasted Messenger GC Leaderboard text into structured PlayerLeaderboardStats.
 */
export function parseFullLeaderboardText(
  text: string,
  baselineStats: PlayerLeaderboardStats[] = DEFAULT_LEADERBOARD_BASELINE
): PlayerLeaderboardStats[] {
  const map = new Map<string, PlayerLeaderboardStats>();

  // Start with existing baseline
  for (const b of baselineStats) {
    const key = cleanPlayerIgn(b.ign).toLowerCase();
    map.set(key, { ...b, ign: cleanPlayerIgn(b.ign) });
  }

  let currentSection:
    | 'overall'
    | 'kills'
    | 'gold'
    | 'assists'
    | 'heroDamage'
    | 'kda'
    | 'damageTaken'
    | '' = '';

  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.includes('Overall Rating Rankings')) {
      currentSection = 'overall';
      continue;
    }
    if (trimmed.includes('Top Kills')) {
      currentSection = 'kills';
      continue;
    }
    if (trimmed.includes('Top Gold')) {
      currentSection = 'gold';
      continue;
    }
    if (trimmed.includes('Top Assists')) {
      currentSection = 'assists';
      continue;
    }
    if (trimmed.includes('Top Hero Damage')) {
      currentSection = 'heroDamage';
      continue;
    }
    if (trimmed.includes('Top KDA')) {
      currentSection = 'kda';
      continue;
    }
    if (trimmed.includes('Top Damage Taken')) {
      currentSection = 'damageTaken';
      continue;
    }
    if (
      trimmed.includes('DAILY HIGHLIGHTS') ||
      trimmed.includes('PERFORMANCE LEADERBOARDS') ||
      trimmed.startsWith('📈')
    ) {
      currentSection = '';
      continue;
    }

    const m = trimmed.match(
      /^[🥇🥈🥉\d\s.)\-]*([^\n\r—–-]+)[\s—–-]+([\d,.]+)/
    );
    if (m && currentSection) {
      const ign = cleanPlayerIgn(m[1].trim());
      const numVal = parseFloat(m[2].replace(/,/g, ''));
      if (!ign || isNaN(numVal)) continue;

      const key = ign.toLowerCase();
      let record = map.get(key);
      if (!record) {
        record = {
          ign,
          overallRating: 0,
          kills: 0,
          deaths: 20,
          assists: 0,
          kda: 0,
          gold: 0,
          heroDamage: 0,
          damageTaken: 0,
          games: 10,
          wins: 6,
          mvps: 2,
        };
        map.set(key, record);
      }

      if (currentSection === 'overall') record.overallRating = numVal;
      else if (currentSection === 'kills') record.kills = numVal;
      else if (currentSection === 'gold') record.gold = numVal;
      else if (currentSection === 'assists') record.assists = numVal;
      else if (currentSection === 'heroDamage') record.heroDamage = numVal;
      else if (currentSection === 'kda') record.kda = numVal;
      else if (currentSection === 'damageTaken') record.damageTaken = numVal;
    }
  }

  return Array.from(map.values());
}

