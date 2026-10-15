import {
  CORE_FIVE_ROLES,
  LiveMatchState,
  MatchHistoryRecord,
  MatchParticipant,
  MlbbRole,
  PlayerProfile,
  QueuedPlayer,
  ROLE_META,
  ScrimSlot,
  calcWinrate,
  formatRolePairText,
} from '../data/ngdData';

export interface BalanceResult {
  teamBlue: MatchParticipant[];
  teamRed: MatchParticipant[];
  blueAvgWr: number;
  redAvgWr: number;
  sourceSummary: string;
}

export function getPlayerWinrate(
  ign: string,
  players: PlayerProfile[],
  defaultWr = 65.0
): number {
  const found = players.find(
    (p) => p.ign.toLowerCase() === ign.trim().toLowerCase()
  );
  if (!found) return defaultWr;
  const total = found.wins + found.losses;
  if (total === 0) return defaultWr;
  return calcWinrate(found.wins, found.losses);
}

interface CandidateEntry {
  ign: string;
  role: MlbbRole;
  secondaryRole?: MlbbRole;
  roleLabel: string;
}

export function autoBalance5v5(
  poolSource: 'batch1' | 'batch2' | 'queue_and_slots',
  slots: (ScrimSlot | null)[],
  queue: QueuedPlayer[],
  players: PlayerProfile[],
  shuffleSeed = 0
): BalanceResult {
  const candidates: CandidateEntry[] = [];
  const seenIgns = new Set<string>();

  const pushUnique = (
    ign: string,
    role: MlbbRole,
    secondaryRole?: MlbbRole,
    roleLabel?: string
  ) => {
    const key = ign.trim().toLowerCase();
    if (!key || seenIgns.has(key)) return;
    seenIgns.add(key);
    candidates.push({
      ign: ign.trim(),
      role,
      secondaryRole,
      roleLabel: roleLabel || formatRolePairText(role, secondaryRole),
    });
  };

  if (poolSource === 'batch1') {
    for (let i = 0; i < 10; i++) {
      const s = slots[i];
      if (s) pushUnique(s.ign, s.role, s.secondaryRole, s.roleLabel);
    }
  } else if (poolSource === 'batch2') {
    for (let i = 10; i < 20; i++) {
      const s = slots[i];
      if (s) pushUnique(s.ign, s.role, s.secondaryRole, s.roleLabel);
    }
  }

  // Supplement from remaining slots and active queue if under 10
  for (const s of slots) {
    if (candidates.length >= 10) break;
    if (s) pushUnique(s.ign, s.role, s.secondaryRole, s.roleLabel);
  }
  for (const q of queue) {
    if (candidates.length >= 10) break;
    pushUnique(q.ign, q.role, q.secondaryRole, q.roleLabel);
  }
  for (const p of players) {
    if (candidates.length >= 10) break;
    pushUnique(p.ign, p.primaryRole, p.secondaryRole, p.roleLabel);
  }

  let top10 = candidates.slice(0, 10);

  // Rotate candidate order on shuffleSeed > 1 so dual-role players can be assigned to their secondary lanes on re-rolls
  if (shuffleSeed > 1) {
    const offset = (shuffleSeed * 3) % top10.length;
    top10 = [...top10.slice(offset), ...top10.slice(0, offset)];
  }

  const laneBuckets: Record<MlbbRole, CandidateEntry[]> = {
    Jungle: [],
    'EXP Lane': [],
    'Mid Lane': [],
    'Gold Lane': [],
    Roamer: [],
    'Flex Role': [],
  };

  const overflow: CandidateEntry[] = [];

  for (const c of top10) {
    // On odd shuffle seeds, if player has a valid secondary role, occasionally test their 2nd role first
    const preferSecondary =
      shuffleSeed > 1 &&
      shuffleSeed % 2 === 1 &&
      c.secondaryRole &&
      c.secondaryRole !== 'Flex Role' &&
      c.secondaryRole !== c.role &&
      laneBuckets[c.secondaryRole].length < 2;

    if (preferSecondary && c.secondaryRole) {
      laneBuckets[c.secondaryRole].push(c);
    } else if (c.role !== 'Flex Role' && laneBuckets[c.role].length < 2) {
      laneBuckets[c.role].push(c);
    } else {
      overflow.push(c);
    }
  }

  // Pass 2: assign overflow players using their secondaryRole
  const remainingOverflow: CandidateEntry[] = [];
  for (const c of overflow) {
    const profile = players.find(
      (p) => p.ign.toLowerCase() === c.ign.toLowerCase()
    );
    const secRole = c.secondaryRole || profile?.secondaryRole;
    if (
      secRole &&
      secRole !== 'Flex Role' &&
      laneBuckets[secRole].length < 2
    ) {
      laneBuckets[secRole].push(c);
    } else if (c.role !== 'Flex Role' && laneBuckets[c.role].length < 2) {
      laneBuckets[c.role].push(c);
    } else {
      remainingOverflow.push(c);
    }
  }

  // Pass 3: fill any remaining open lane slots (e.g., with Multi / Flex Role players)
  for (const c of remainingOverflow) {
    const openLane = CORE_FIVE_ROLES.find((r) => laneBuckets[r].length < 2);
    if (openLane) {
      laneBuckets[openLane].push(c);
    }
  }

  // Build 5 lane pairs in canonical order: Jungle, EXP Lane, Mid Lane, Gold Lane, Roamer
  const lanePairs = CORE_FIVE_ROLES.map((lane) => {
    const pair = laneBuckets[lane];
    return pair.map((item) => ({
      ign: item.ign,
      selectedRole: item.role,
      secondaryRole: item.secondaryRole,
      roleLabel: item.roleLabel,
      assignedLane: lane,
      winrateSnapshot: getPlayerWinrate(item.ign, players),
    }));
  });

  // Evaluate all 2^5 = 32 lane splits and rank them by Winrate fairness
  const scoredMasks: { mask: number; diff: number }[] = [];
  for (let mask = 0; mask < 32; mask++) {
    let blueSum = 0;
    let redSum = 0;
    for (let i = 0; i < 5; i++) {
      const pair = lanePairs[i];
      if (pair.length === 2) {
        const swap = ((mask >> i) & 1) === 1;
        blueSum += swap ? pair[1].winrateSnapshot : pair[0].winrateSnapshot;
        redSum += swap ? pair[0].winrateSnapshot : pair[1].winrateSnapshot;
      }
    }
    scoredMasks.push({ mask, diff: Math.abs(blueSum - redSum) });
  }

  scoredMasks.sort((a, b) => a.diff - b.diff);

  // Pick among the top most balanced splits using shuffleSeed so clicking "Shuffle" always gives a fresh balanced team
  const topCandidatesCount = Math.min(6, scoredMasks.length);
  const chosenIndex =
    shuffleSeed <= 1 ? 0 : (shuffleSeed - 1) % topCandidatesCount;
  const bestMask = scoredMasks[chosenIndex].mask;

  const teamBlue: MatchParticipant[] = [];
  const teamRed: MatchParticipant[] = [];

  for (let i = 0; i < 5; i++) {
    const pair = lanePairs[i];
    if (pair.length === 2) {
      const swap = ((bestMask >> i) & 1) === 1;
      teamBlue.push(swap ? pair[1] : pair[0]);
      teamRed.push(swap ? pair[0] : pair[1]);
    } else if (pair.length === 1) {
      teamBlue.push(pair[0]);
    }
  }

  const blueAvgWr =
    teamBlue.length > 0
      ? Number(
          (
            teamBlue.reduce((acc, p) => acc + p.winrateSnapshot, 0) /
            teamBlue.length
          ).toFixed(1)
        )
      : 0;

  const redAvgWr =
    teamRed.length > 0
      ? Number(
          (
            teamRed.reduce((acc, p) => acc + p.winrateSnapshot, 0) /
            teamRed.length
          ).toFixed(1)
        )
      : 0;

  const sourceLabel =
    poolSource === 'batch1'
      ? 'Lobby 1 (Slots 1–10)'
      : poolSource === 'batch2'
        ? 'Lobby 2 (Slots 11–20)'
        : 'All Ready Players';

  return {
    teamBlue,
    teamRed,
    blueAvgWr,
    redAvgWr,
    sourceSummary: `${sourceLabel} · Blue ${blueAvgWr}% WR vs Red ${redAvgWr}% WR`,
  };
}

export function buildDirectLineup5v5(
  poolSource: 'batch1' | 'batch2',
  slots: (ScrimSlot | null)[],
  players: PlayerProfile[]
): BalanceResult {
  const startIdx = poolSource === 'batch1' ? 0 : 10;

  const assignTeamLanes = (rawSlots: (ScrimSlot | null)[], fallbackOffset: number): MatchParticipant[] => {
    const entries: CandidateEntry[] = [];
    for (let i = 0; i < 5; i++) {
      const s = rawSlots[i];
      if (s) {
        entries.push({
          ign: s.ign,
          role: s.role,
          secondaryRole: s.secondaryRole,
          roleLabel: s.roleLabel,
        });
      } else {
        const fb = players[(fallbackOffset + i) % Math.max(1, players.length)];
        if (fb) {
          entries.push({
            ign: fb.ign,
            role: fb.primaryRole,
            secondaryRole: fb.secondaryRole,
            roleLabel: fb.roleLabel,
          });
        } else {
          const defaultLane = CORE_FIVE_ROLES[i];
          entries.push({
            ign: `Player ${startIdx + fallbackOffset + i + 1}`,
            role: defaultLane,
            roleLabel: ROLE_META[defaultLane].gcLabel,
          });
        }
      }
    }

    const usedLanes = new Set<MlbbRole>();
    const result: MatchParticipant[] = [];

    for (const entry of entries) {
      let assigned: MlbbRole;
      if (entry.role !== 'Flex Role' && !usedLanes.has(entry.role)) {
        assigned = entry.role;
      } else if (
        entry.secondaryRole &&
        entry.secondaryRole !== 'Flex Role' &&
        !usedLanes.has(entry.secondaryRole)
      ) {
        assigned = entry.secondaryRole;
      } else {
        assigned =
          CORE_FIVE_ROLES.find((r) => !usedLanes.has(r)) ||
          (entry.role === 'Flex Role' ? 'Jungle' : entry.role);
      }
      usedLanes.add(assigned);
      result.push({
        ign: entry.ign,
        selectedRole: entry.role,
        secondaryRole: entry.secondaryRole,
        roleLabel: entry.roleLabel,
        assignedLane: assigned,
        winrateSnapshot: getPlayerWinrate(entry.ign, players),
      });
    }

    return result;
  };

  const teamBlue = assignTeamLanes(slots.slice(startIdx, startIdx + 5), 0);
  const teamRed = assignTeamLanes(slots.slice(startIdx + 5, startIdx + 10), 5);

  const blueAvgWr =
    teamBlue.length > 0
      ? Number(
          (
            teamBlue.reduce((acc, p) => acc + p.winrateSnapshot, 0) /
            teamBlue.length
          ).toFixed(1)
        )
      : 0;

  const redAvgWr =
    teamRed.length > 0
      ? Number(
          (
            teamRed.reduce((acc, p) => acc + p.winrateSnapshot, 0) /
            teamRed.length
          ).toFixed(1)
        )
      : 0;

  return {
    teamBlue,
    teamRed,
    blueAvgWr,
    redAvgWr,
    sourceSummary: `Slot Order (1–5 vs 6–10) · Blue ${blueAvgWr}% WR vs Red ${redAvgWr}% WR`,
  };
}

export function autoBalanceCurrentParticipants(
  currentBlue: MatchParticipant[],
  currentRed: MatchParticipant[]
): {
  teamBlue: MatchParticipant[];
  teamRed: MatchParticipant[];
  blueAvgWr: number;
  redAvgWr: number;
  diffWr: number;
} {
  const all10 = [...currentBlue, ...currentRed];
  if (all10.length !== 10) {
    const bWr =
      currentBlue.length > 0
        ? currentBlue.reduce((a, b) => a + b.winrateSnapshot, 0) /
          currentBlue.length
        : 0;
    const rWr =
      currentRed.length > 0
        ? currentRed.reduce((a, b) => a + b.winrateSnapshot, 0) /
          currentRed.length
        : 0;
    return {
      teamBlue: currentBlue,
      teamRed: currentRed,
      blueAvgWr: Number(bWr.toFixed(1)),
      redAvgWr: Number(rWr.toFixed(1)),
      diffWr: Number(Math.abs(bWr - rWr).toFixed(1)),
    };
  }

  // Generate all 252 5-combinations of [0..9]
  const combinations: number[][] = [];
  function combine(start: number, chosen: number[]) {
    if (chosen.length === 5) {
      combinations.push([...chosen]);
      return;
    }
    for (let i = start; i < 10; i++) {
      chosen.push(i);
      combine(i + 1, chosen);
      chosen.pop();
    }
  }
  combine(0, []);

  const assign5ToLanes = (
    players5: MatchParticipant[]
  ): { assigned: MatchParticipant[]; penalty: number } => {
    const roles = CORE_FIVE_ROLES;
    const assigned: (MatchParticipant | null)[] = [null, null, null, null, null];
    const unassigned: MatchParticipant[] = [];
    let penalty = 0;

    for (const p of players5) {
      const prefIdx = roles.indexOf(p.selectedRole);
      const secIdx = p.secondaryRole ? roles.indexOf(p.secondaryRole) : -1;

      if (prefIdx !== -1 && assigned[prefIdx] === null) {
        assigned[prefIdx] = { ...p, assignedLane: roles[prefIdx] };
      } else if (secIdx !== -1 && assigned[secIdx] === null) {
        assigned[secIdx] = { ...p, assignedLane: roles[secIdx] };
        penalty += 2;
      } else {
        unassigned.push(p);
      }
    }

    for (let r = 0; r < 5; r++) {
      if (assigned[r] === null) {
        const next = unassigned.pop();
        if (next) {
          assigned[r] = { ...next, assignedLane: roles[r] };
          penalty += 8;
        }
      }
    }

    return {
      assigned: assigned.filter((p): p is MatchParticipant => p !== null),
      penalty,
    };
  };

  let bestBlue: MatchParticipant[] = currentBlue;
  let bestRed: MatchParticipant[] = currentRed;
  let bestTotalScore = Infinity;

  for (const combo of combinations) {
    const blueCand = combo.map((i) => all10[i]);
    const redCand = all10.filter((_, i) => !combo.includes(i));

    const blueWr = blueCand.reduce((a, b) => a + b.winrateSnapshot, 0) / 5;
    const redWr = redCand.reduce((a, b) => a + b.winrateSnapshot, 0) / 5;
    const diff = Math.abs(blueWr - redWr);

    const bAssign = assign5ToLanes(blueCand);
    const rAssign = assign5ToLanes(redCand);

    const score = diff * 2.5 + bAssign.penalty + rAssign.penalty;

    if (score < bestTotalScore) {
      bestTotalScore = score;
      bestBlue = bAssign.assigned;
      bestRed = rAssign.assigned;
    }
  }

  const blueAvgWr = Number(
    (bestBlue.reduce((a, b) => a + b.winrateSnapshot, 0) / 5).toFixed(1)
  );
  const redAvgWr = Number(
    (bestRed.reduce((a, b) => a + b.winrateSnapshot, 0) / 5).toFixed(1)
  );

  return {
    teamBlue: bestBlue,
    teamRed: bestRed,
    blueAvgWr,
    redAvgWr,
    diffWr: Number(Math.abs(blueAvgWr - redAvgWr).toFixed(1)),
  };
}

export function cleanPlayerIgn(rawName: string): string {
  if (!rawName) return '';
  let cleaned = rawName
    .replace(/[♂♀]/g, ' ')
    .replace(/[【】\[\]()]/g, ' ')
    // Strip common MLBB tournament/squad acronym prefixes if strictly matching known squad tags
    .replace(
      /^(?:DND|POSE|EXE|NGD|HATE|RSG|ECHO|BREN|TLPH|APBR|TNC|BLCK|OMG|NXPE|PRX|RRQ|EVOS|ONIC)\b[\s._-]*/i,
      ''
    )
    .trim();

  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned || rawName.trim();
}

export function detectSeriesFormatFromText(rawText: string): 'BO1' | 'BO3' | 'BO5' | null {
  if (/\bBO5\b/i.test(rawText)) return 'BO5';
  if (/\bBO3\b/i.test(rawText)) return 'BO3';
  if (/\bBO1\b/i.test(rawText)) return 'BO1';
  return null;
}

export function parseTraditionalGcText(
  rawText: string,
  knownPlayers?: PlayerProfile[]
): { slotNum: number; ign: string; role: MlbbRole; secondaryRole?: MlbbRole; roleLabel: string }[] {
  const results: {
    slotNum: number;
    ign: string;
    role: MlbbRole;
    secondaryRole?: MlbbRole;
    roleLabel: string;
  }[] = [];

  const detectRoleToken = (token: string): MlbbRole | null => {
    const t = token.toLowerCase().trim();
    if (t.includes('jung') || t.includes('jgl') || t.includes('core'))
      return 'Jungle';
    if (t.includes('exp')) return 'EXP Lane';
    if (t.includes('mid') || t.includes('mage')) return 'Mid Lane';
    if (t.includes('gold') || t.includes('mm')) return 'Gold Lane';
    if (t.includes('roam') || t.includes('tank') || t.includes('supp'))
      return 'Roamer';
    if (t.includes('multi') || t.includes('flex') || t.includes('all'))
      return 'Flex Role';
    return null;
  };

  const lines = rawText.split(/\r?\n/);
  const numberedEntries: { slotNum: number; raw: string }[] = [];
  const unnumberedCandidates: string[] = [];
  let isUnderListHeader = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check if entering a list section e.g. "LIST:", "DROP IGN ONLY"
    if (/^LIST\s*:/i.test(trimmed)) {
      isUnderListHeader = true;
      continue;
    }

    // Matches any numbered list pattern, e.g.:
    // "1. xTriggered"
    // "4.hapon"
    // "7.S"
    // "1) Tadashi"
    // "1. Estranghero - Jungler/Roam"
    // "1. Setsuko. (Gold/Mid)"
    // "1 - Akira"
    const match = trimmed.match(
      /^[\s(]*(\d{1,2})[\s.)\-]*(?:[.\-–—:])?\s*([^\n\r]+)$/
    );

    if (match) {
      const slotNum = parseInt(match[1], 10);
      if (slotNum >= 1 && slotNum <= 20) {
        numberedEntries.push({ slotNum, raw: match[2].trim() });
        continue;
      }
    }

    // If not numbered, but under a "LIST:" header and not another header
    if (
      isUnderListHeader &&
      !/^(?:NGD|BO\d|DROP|OCTOBER|NOVEMBER|DECEMBER|JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER)\b/i.test(
        trimmed
      )
    ) {
      unnumberedCandidates.push(trimmed);
    }
  }

  // If we found numbered entries, use them
  if (numberedEntries.length > 0) {
    for (const item of numberedEntries) {
      const rest = item.raw;
      let rawIgn = rest;
      let rolePart = '';

      const splitDash = rest.split(/\s*[-–—:]\s*(.+)/);
      if (splitDash.length >= 2) {
        rawIgn = splitDash[0];
        rolePart = splitDash[1];
      } else {
        const parenMatch = rest.match(/^(.+?)\s*\(([^)]+)\)$/);
        if (parenMatch) {
          rawIgn = parenMatch[1];
          rolePart = parenMatch[2];
        }
      }

      const cleanIgn = cleanPlayerIgn(rawIgn);
      if (!cleanIgn) continue;

      let primary: MlbbRole = 'Flex Role';
      let secondary: MlbbRole | undefined = undefined;

      if (rolePart) {
        const parts = rolePart.replace(/[✅⏳]/g, '').split(/[\/,&]+/);
        primary = detectRoleToken(parts[0] || '') || 'Flex Role';
        secondary = parts[1]
          ? detectRoleToken(parts[1]) || undefined
          : undefined;
      } else if (knownPlayers && knownPlayers.length > 0) {
        const found = knownPlayers.find(
          (p) =>
            p.ign.toLowerCase() === cleanIgn.toLowerCase() ||
            cleanIgn.toLowerCase().includes(p.ign.toLowerCase()) ||
            p.ign.toLowerCase().includes(cleanIgn.toLowerCase())
        );
        if (found) {
          primary = found.primaryRole;
          secondary =
            found.secondaryRole !== found.primaryRole
              ? found.secondaryRole
              : undefined;
        }
      }

      results.push({
        slotNum: item.slotNum,
        ign: cleanIgn,
        role: primary,
        secondaryRole: secondary,
        roleLabel: formatRolePairText(primary, secondary),
      });
    }
  } else if (unnumberedCandidates.length > 0) {
    // Fill slots 1, 2, 3... from sequential non-numbered candidates
    let slotIdx = 1;
    for (const cand of unnumberedCandidates.slice(0, 20)) {
      const cleanIgn = cleanPlayerIgn(cand);
      if (!cleanIgn) continue;

      let primary: MlbbRole = 'Flex Role';
      let secondary: MlbbRole | undefined = undefined;

      if (knownPlayers && knownPlayers.length > 0) {
        const found = knownPlayers.find(
          (p) =>
            p.ign.toLowerCase() === cleanIgn.toLowerCase() ||
            cleanIgn.toLowerCase().includes(p.ign.toLowerCase()) ||
            p.ign.toLowerCase().includes(cleanIgn.toLowerCase())
        );
        if (found) {
          primary = found.primaryRole;
          secondary =
            found.secondaryRole !== found.primaryRole
              ? found.secondaryRole
              : undefined;
        }
      }

      results.push({
        slotNum: slotIdx,
        ign: cleanIgn,
        role: primary,
        secondaryRole: secondary,
        roleLabel: formatRolePairText(primary, secondary),
      });
      slotIdx++;
    }
  }

  return results;
}

export function formatGcText(
  slots: (ScrimSlot | null)[],
  queue: QueuedPlayer[],
  liveMatch: LiveMatchState,
  mode: 'warmup' | 'palist' | 'match' | 'full' = 'warmup'
): string {
  const lines: string[] = [];

  if (mode === 'warmup') {
    lines.push('Scrim warmup');
    lines.push('');
    for (let i = 0; i < 10; i++) {
      const s = slots[i];
      if (s) {
        lines.push(`${i + 1}. ${s.ign} - ${s.roleLabel}`);
      } else {
        lines.push(`${i + 1}. `);
      }
    }
    const batch2Filled = slots.slice(10, 20).some(Boolean);
    if (batch2Filled) {
      lines.push('');
      lines.push('Batch 2 (Next Game):');
      for (let i = 10; i < 20; i++) {
        const s = slots[i];
        if (s) {
          lines.push(`${i + 1}. ${s.ign} - ${s.roleLabel}`);
        } else {
          lines.push(`${i + 1}. `);
        }
      }
    }
    return lines.join('\n');
  }

  const filledCount = slots.filter(Boolean).length;
  lines.push('⚔️ NGD SCRIM WARMUP & 5v5 SYSTEM ⚔️');
  lines.push('🏆 NextGen Dominator (Since 2019)');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━');

  if (mode === 'palist' || mode === 'full') {
    lines.push(`📋 OFFICIAL 1–20 PLAYER LIST (${filledCount}/20 READY)`);
    lines.push('');
    lines.push('🔥 [LOBBY 1 · 5v5 FRIENDLY GAME (SLOTS 1–10)]');
    for (let i = 0; i < 10; i++) {
      const slot = slots[i];
      if (slot) {
        lines.push(
          `${i + 1}. ${slot.ign} - ${slot.roleLabel} ${slot.isReady ? '✅' : '⏳'}`
        );
      } else {
        lines.push(`${i + 1}. [OPEN SLOT — Tap to Join]`);
      }
    }

    lines.push('');
    lines.push('⚡ [LOBBY 2 · NEXT BATCH (SLOTS 11–20)]');
    for (let i = 10; i < 20; i++) {
      const slot = slots[i];
      if (slot) {
        lines.push(
          `${i + 1}. ${slot.ign} - ${slot.roleLabel} ${slot.isReady ? '✅' : '⏳'}`
        );
      } else {
        lines.push(`${i + 1}. [OPEN SLOT — Tap to Join]`);
      }
    }

    if (queue.length > 0) {
      lines.push('');
      lines.push(`⏳ STANDBY QUEUE (${queue.length}):`);
      queue.forEach((q, idx) => {
        lines.push(`• Q${idx + 1}: ${q.ign} - ${q.roleLabel}`);
      });
    }
  }

  if (mode === 'match' || mode === 'full') {
    if (mode === 'full') {
      lines.push('━━━━━━━━━━━━━━━━━━━━━━');
    }
    lines.push(`🎮 5v5 MATCHUP: ${liveMatch.roomName}`);
    const formatText =
      liveMatch.seriesFormat === 'BO1'
        ? '1 Game (BO1)'
        : liveMatch.seriesFormat === 'BO3'
          ? 'Best of 3 (BO3)'
          : 'Best of 5 (BO5)';
    const bWins = liveMatch.blueSeriesWins || 0;
    const rWins = liveMatch.redSeriesWins || 0;
    lines.push(
      `🏆 Format: ${formatText} | Series Score: Blue ${bWins} - ${rWins} Red`
    );
    lines.push('');
    lines.push('🔵 TEAM BLUE (FIRST PICK):');
    liveMatch.teamBlue.forEach((p) => {
      lines.push(
        `• [${ROLE_META[p.assignedLane].gcLabel}] ${p.ign} (${p.roleLabel})`
      );
    });
    lines.push('');
    lines.push('🔴 TEAM RED (SECOND PICK):');
    liveMatch.teamRed.forEach((p) => {
      lines.push(
        `• [${ROLE_META[p.assignedLane].gcLabel}] ${p.ign} (${p.roleLabel})`
      );
    });
  }

  return lines.join('\n');
}

export function formatBattleResultGcText(record: MatchHistoryRecord): string {
  const lines: string[] = [];
  const winEmoji = record.winner === 'Blue' ? '🔵' : '🔴';
  const winTeamName =
    record.winner === 'Blue' ? 'TEAM BLUE VICTORY' : 'TEAM RED VICTORY';

  lines.push(`🏆 NGD SCRIM BATTLE RESULT (${record.id}) 🏆`);
  lines.push(`${winEmoji} ${winTeamName} · ${record.completedAt}`);
  if (record.killScore) {
    lines.push(`⚔️ Kill Score: ${record.killScore}`);
  }
  lines.push(
    `👑 Match MVP: ${record.mvpIgn}${
      record.svpIgn ? ` | 🛡️ Defeat MVP: ${record.svpIgn}` : ''
    }`
  );
  lines.push('━━━━━━━━━━━━━━━━━━━━━━');
  lines.push(
    `🔵 TEAM BLUE ${record.winner === 'Blue' ? '(WINNER 🏆)' : ''}:`
  );
  record.teamBlue.forEach((p) => {
    const isMvp = p.ign.toLowerCase() === record.mvpIgn.toLowerCase();
    const isSvp =
      record.svpIgn && p.ign.toLowerCase() === record.svpIgn.toLowerCase();
    const tag = isMvp ? ' 👑MVP' : isSvp ? ' 🛡️SVP' : '';
    const statPart = p.kda
      ? ` — ${p.kda}${p.rating ? ` (${p.rating})` : ''}`
      : '';
    lines.push(
      `• [${ROLE_META[p.assignedLane].gcLabel}] ${p.ign}${statPart}${tag}`
    );
  });
  lines.push('');
  lines.push(
    `🔴 TEAM RED ${record.winner === 'Red' ? '(WINNER 🏆)' : ''}:`
  );
  record.teamRed.forEach((p) => {
    const isMvp = p.ign.toLowerCase() === record.mvpIgn.toLowerCase();
    const isSvp =
      record.svpIgn && p.ign.toLowerCase() === record.svpIgn.toLowerCase();
    const tag = isMvp ? ' 👑MVP' : isSvp ? ' 🛡️SVP' : '';
    const statPart = p.kda
      ? ` — ${p.kda}${p.rating ? ` (${p.rating})` : ''}`
      : '';
    lines.push(
      `• [${ROLE_META[p.assignedLane].gcLabel}] ${p.ign}${statPart}${tag}`
    );
  });

  return lines.join('\n');
}
