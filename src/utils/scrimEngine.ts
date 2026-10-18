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
  poolSource: 'batch1' | 'batch2' | 'queue_and_slots' | number,
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

  if (typeof poolSource === 'number') {
    const start = Math.max(0, (poolSource - 1) * 10);
    for (let i = start; i < start + 10; i++) {
      const s = slots[i];
      if (s) pushUnique(s.ign, s.role, s.secondaryRole, s.roleLabel);
    }
  } else if (poolSource === 'batch1') {
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
    typeof poolSource === 'number'
      ? `Game ${poolSource} (Slots ${(poolSource - 1) * 10 + 1}–${poolSource * 10})`
      : poolSource === 'batch1'
        ? 'Game 1 (Slots 1–10)'
        : poolSource === 'batch2'
          ? 'Game 2 (Slots 11–20)'
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
  poolSource: 'batch1' | 'batch2' | number,
  slots: (ScrimSlot | null)[],
  players: PlayerProfile[]
): BalanceResult {
  const startIdx =
    typeof poolSource === 'number'
      ? Math.max(0, (poolSource - 1) * 10)
      : poolSource === 'batch1'
        ? 0
        : 10;

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

  const startSlot = startIdx + 1;
  const midSlot = startIdx + 5;
  const endSlot = startIdx + 10;

  return {
    teamBlue,
    teamRed,
    blueAvgWr,
    redAvgWr,
    sourceSummary: `Slot Order (${startSlot}–${midSlot} vs ${midSlot + 1}–${endSlot}) · Blue ${blueAvgWr}% WR vs Red ${redAvgWr}% WR`,
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
        if (slotNum >= 1 && slotNum <= 50) {
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
      if (splitDash.length >= 2 && detectRoleToken(splitDash[1])) {
        rawIgn = splitDash[0];
        rolePart = splitDash[1];
      } else {
        const parenMatch = rest.match(/^(.+?)\s*\(([^)]+)\)$/);
        if (parenMatch && detectRoleToken(parenMatch[2])) {
          rawIgn = parenMatch[1];
          rolePart = parenMatch[2];
        } else {
          rawIgn = rest;
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
    for (const cand of unnumberedCandidates.slice(0, 50)) {
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
  mode: 'warmup' | 'palist' | 'match' | 'full' = 'warmup',
  activeSetCount: number = 2
): string {
  const lines: string[] = [];
  const safeSetCount = Math.max(1, Math.min(5, activeSetCount));

  if (mode === 'warmup') {
    lines.push('Scrim warmup');
    for (let s = 0; s < safeSetCount; s++) {
      lines.push('');
      if (s === 0) {
        lines.push('Game 1 (Slots 1–10):');
      } else {
        lines.push(`Batch ${s + 1} / Game ${s + 1} (Slots ${s * 10 + 1}–${s * 10 + 10}):`);
      }
      for (let i = s * 10; i < s * 10 + 10; i++) {
        const item = slots[i];
        if (item) {
          lines.push(`${i + 1}. ${item.ign} - ${item.roleLabel}`);
        } else {
          lines.push(`${i + 1}. `);
        }
      }
    }
    return lines.join('\n');
  }

  const totalSlots = safeSetCount * 10;
  const filledCount = slots.slice(0, totalSlots).filter(Boolean).length;
  lines.push('⚔️ NGD SCRIM WARMUP & 5v5 SYSTEM ⚔️');
  lines.push('🏆 NextGen Dominator (Since 2019)');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━');

  if (mode === 'palist' || mode === 'full') {
    lines.push(`📋 OFFICIAL 1–${totalSlots} PLAYER LIST (${filledCount}/${totalSlots} READY)`);
    for (let s = 0; s < safeSetCount; s++) {
      lines.push('');
      const badge =
        s === 0
          ? '🔥 [GAME 1 · PLAYING NOW]'
          : s === 1
            ? '⚡ [GAME 2 · WAITING IN LINE]'
            : `⚡ [GAME ${s + 1} · BATCH ${s + 1}]`;
      lines.push(`${badge} (SLOTS ${s * 10 + 1}–${s * 10 + 10})`);
      for (let i = s * 10; i < s * 10 + 10; i++) {
        const slot = slots[i];
        if (slot) {
          lines.push(
            `${i + 1}. ${slot.ign} - ${slot.roleLabel} ${slot.isReady ? '✅' : '⏳'}`
          );
        } else {
          lines.push(`${i + 1}. [OPEN SLOT — Tap to Join]`);
        }
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

/**
 * MLBB In-Game Scoring & Medal Classification
 * Calculates Rating (3.0 - 15.0) and Medal (MVP / SVP / Gold / Silver / Bronze)
 * In MLBB, multiple players (1 to 5) can get Bronze / Tanso if their rating < 5.5 or deaths >= 6 with low KDA!
 */
export type MlbbMedalGrade =
  | 'Mythic MVP'
  | 'Mythic SVP'
  | 'Gold MVP'
  | 'Gold SVP'
  | 'Mythic Gold'
  | 'Gold'
  | 'Silver'
  | 'Bronze';

/**
 * Resolves the exact 6-Tier Medal based on MLBB's latest Match Grading System:
 * 1. Mythic MVP (Purple MVP) -> MVP / SVP with Score >= 11.0
 * 2. Gold MVP (Gold MVP) -> MVP / SVP with Score < 11.0 (e.g. 6.9 - 10.9)
 * 3. Mythic Gold (Purple Gold / Non-MVP) -> Non-MVP player with Score >= 11.0
 * 4. Gold -> Non-MVP player with Score between 6.8 and 10.9
 * 5. Silver -> Score between 4.0 and 6.7
 * 6. Bronze -> Score below 4.0 (3.0 - 3.9)
 */
export function resolveMlbbMedal(
  rating: number | string | undefined,
  isMvp: boolean,
  isSvp: boolean,
  currentMedal?: string
): MlbbMedalGrade {
  const scoreNum = typeof rating === 'number' ? rating : parseFloat(rating || '0');
  const hasScore = !isNaN(scoreNum) && scoreNum > 0;

  // MVP (Winning team MVP)
  if (isMvp || currentMedal === 'Mythic MVP' || currentMedal === 'Gold MVP' || currentMedal === 'MVP') {
    if (hasScore) {
      return scoreNum >= 11.0 ? 'Mythic MVP' : 'Gold MVP';
    }
    return currentMedal === 'Mythic MVP' ? 'Mythic MVP' : 'Gold MVP';
  }

  // SVP (Defeat MVP / Losing team MVP)
  if (isSvp || currentMedal === 'Mythic SVP' || currentMedal === 'Gold SVP' || currentMedal === 'SVP') {
    if (hasScore) {
      return scoreNum >= 11.0 ? 'Mythic SVP' : 'Gold SVP';
    }
    return currentMedal === 'Mythic SVP' ? 'Mythic SVP' : 'Gold SVP';
  }

  // Non-MVP with Score >= 11.0 is Mythic Gold (Purple Gold)
  if (currentMedal === 'Mythic Gold') {
    return 'Mythic Gold';
  }

  if (hasScore) {
    if (scoreNum >= 11.0) return 'Mythic Gold';
    if (scoreNum >= 6.8) return 'Gold';
    if (scoreNum >= 4.0) return 'Silver';
    return 'Bronze';
  }

  // Fallbacks based on string
  if (currentMedal === 'Bronze') return 'Bronze';
  if (currentMedal === 'Silver') return 'Silver';
  if (currentMedal === 'Gold') return 'Gold';
  return 'Silver';
}

/**
 * Returns metadata and styles for the 6-tier medal hierarchy
 */
export function getMedalMeta(medalStr: string | undefined, language: 'en' | 'tl' = 'en') {
  const clean = (medalStr || '').toLowerCase();

  if (clean.includes('mythic mvp') || (clean.includes('mvp') && !clean.includes('gold'))) {
    return {
      tier: 1,
      type: 'Mythic MVP' as const,
      label: 'Mythic MVP',
      shortLabel: 'M-MVP',
      colorHex: '#c084fc',
      borderHex: '#a855f7',
      bgGradient: 'from-purple-900/60 via-fuchsia-900/50 to-indigo-900/60',
      badgeClass:
        'bg-gradient-to-r from-purple-600/30 via-fuchsia-600/30 to-indigo-600/30 text-purple-200 border-purple-400/60 shadow-[0_0_12px_rgba(192,132,252,0.35)]',
      iconEmoji: '👑',
      scoreRange: 'Score ≥ 11.0',
      desc: language === 'tl' ? 'Mythic MVP (Score ≥ 11.0)' : 'Mythic MVP (Score ≥ 11.0)',
    };
  }

  if (clean.includes('gold mvp')) {
    return {
      tier: 2,
      type: 'Gold MVP' as const,
      label: 'Gold MVP',
      shortLabel: 'G-MVP',
      colorHex: '#f1c40f',
      borderHex: '#f59e0b',
      bgGradient: 'from-amber-900/50 via-yellow-900/40 to-amber-950/60',
      badgeClass:
        'bg-gradient-to-r from-amber-500/25 via-yellow-400/25 to-amber-600/25 text-amber-300 border-amber-400/60 shadow-[0_0_10px_rgba(245,158,11,0.3)]',
      iconEmoji: '👑',
      scoreRange: 'Score < 11.0',
      desc: language === 'tl' ? 'Gold MVP (Score < 11.0)' : 'Gold MVP (Score < 11.0)',
    };
  }

  if (clean.includes('mythic svp') || (clean.includes('svp') && clean.includes('mythic'))) {
    return {
      tier: 1,
      type: 'Mythic SVP' as const,
      label: 'Mythic SVP',
      shortLabel: 'M-SVP',
      colorHex: '#c084fc',
      borderHex: '#a855f7',
      bgGradient: 'from-purple-900/60 via-indigo-900/50 to-purple-950/60',
      badgeClass:
        'bg-gradient-to-r from-purple-600/30 via-indigo-600/30 to-purple-800/30 text-purple-200 border-purple-400/60 shadow-[0_0_12px_rgba(192,132,252,0.35)]',
      iconEmoji: '🛡️',
      scoreRange: 'Score ≥ 11.0',
      desc: language === 'tl' ? 'Defeat MVP (Score ≥ 11.0)' : 'Defeat MVP (Score ≥ 11.0)',
    };
  }

  if (clean.includes('gold svp') || clean.includes('svp')) {
    return {
      tier: 2,
      type: 'Gold SVP' as const,
      label: 'Gold SVP',
      shortLabel: 'G-SVP',
      colorHex: '#fbbf24',
      borderHex: '#d97706',
      bgGradient: 'from-amber-900/40 via-purple-950/40 to-amber-950/50',
      badgeClass:
        'bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-amber-600/20 text-amber-200 border-amber-400/50',
      iconEmoji: '🛡️',
      scoreRange: 'Score < 11.0',
      desc: language === 'tl' ? 'Defeat MVP (Score < 11.0)' : 'Defeat MVP (Score < 11.0)',
    };
  }

  if (clean.includes('mythic gold') || clean.includes('purple gold')) {
    return {
      tier: 3,
      type: 'Mythic Gold' as const,
      label: 'Mythic Gold',
      shortLabel: 'M-Gold',
      colorHex: '#e879f9',
      borderHex: '#d946ef',
      bgGradient: 'from-purple-900/50 via-fuchsia-950/40 to-amber-950/40',
      badgeClass:
        'bg-gradient-to-r from-purple-700/30 via-fuchsia-600/25 to-amber-500/25 text-fuchsia-200 border-fuchsia-400/60 shadow-[0_0_10px_rgba(232,121,249,0.3)]',
      iconEmoji: '⭐',
      scoreRange: 'Score ≥ 11.0',
      desc: language === 'tl' ? 'Purple Gold (Score ≥ 11.0)' : 'Mythic Gold (Score ≥ 11.0)',
    };
  }

  if (clean.includes('gold')) {
    return {
      tier: 4,
      type: 'Gold' as const,
      label: 'Gold',
      shortLabel: 'Gold',
      colorHex: '#eab308',
      borderHex: '#facc15',
      bgGradient: 'from-yellow-950/40 to-amber-950/40',
      badgeClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
      iconEmoji: '🥇',
      scoreRange: 'Score 6.8 – 10.9',
      desc: language === 'tl' ? 'Gold Medal (6.8 – 10.9)' : 'Gold Medal (6.8 – 10.9)',
    };
  }

  if (clean.includes('silver')) {
    return {
      tier: 5,
      type: 'Silver' as const,
      label: 'Silver',
      shortLabel: 'Silver',
      colorHex: '#94a3b8',
      borderHex: '#cbd5e1',
      bgGradient: 'from-slate-900/40 to-slate-800/40',
      badgeClass: 'bg-slate-400/20 text-slate-300 border-slate-400/40',
      iconEmoji: '🥈',
      scoreRange: 'Score 4.0 – 6.7',
      desc: language === 'tl' ? 'Silver Medal (4.0 – 6.7)' : 'Silver Medal (4.0 – 6.7)',
    };
  }

  // Bronze / Tanso (< 4.0)
  return {
    tier: 6,
    type: 'Bronze' as const,
    label: language === 'tl' ? 'Bronze (Tanso)' : 'Bronze',
    shortLabel: 'Bronze',
    colorHex: '#d97706',
    borderHex: '#b45309',
    bgGradient: 'from-amber-950/50 to-orange-950/50',
    badgeClass: 'bg-amber-900/30 text-amber-500 border-amber-700/50',
    iconEmoji: '🥉',
    scoreRange: 'Score < 4.0 (3.0 – 3.9)',
    desc: language === 'tl' ? 'Tanso Medal (< 4.0)' : 'Bronze Medal (< 4.0)',
  };
}

/**
 * MLBB In-Game Scoring & 6-Tier Medal Classification
 * Calculates Rating (3.0 - 15.0) and assigns the exact 6-tier medal hierarchy:
 * 1. Mythic MVP (Score >= 11.0)
 * 2. Gold MVP (Score < 11.0)
 * 3. Mythic Gold (Non-MVP, Score >= 11.0)
 * 4. Gold (Score 6.8 - 10.9)
 * 5. Silver (Score 4.0 - 6.7)
 * 6. Bronze (Score < 4.0)
 */
export function calculateMlbbRating(
  kda: string | undefined,
  won: boolean,
  isMvp = false,
  isSvp = false,
  manualRating?: string | number
): {
  rating: string;
  medal: MlbbMedalGrade;
  isFeeder: boolean;
} {
  // If manual rating passed in
  if (manualRating !== undefined && manualRating !== null && manualRating !== '') {
    const parsed = typeof manualRating === 'number' ? manualRating : parseFloat(manualRating);
    if (!isNaN(parsed) && parsed > 0) {
      const clamped = Math.min(15.0, Math.max(3.0, parsed));
      const rStr = clamped.toFixed(1);
      const score = parseFloat(rStr);
      const medal = resolveMlbbMedal(score, isMvp, isSvp);
      const isFeeder = medal === 'Bronze' || score < 4.0;
      return { rating: rStr, medal, isFeeder };
    }
  }

  if (isMvp) {
    let r = 11.5;
    if (kda) {
      const parts = kda.split(/[\/\-:\s]+/).map((p) => parseInt(p.trim(), 10));
      const k = parts[0] || 0;
      const d = parts[1] || 0;
      const a = parts[2] || 0;
      const ratio = (k + a) / Math.max(1, d);
      r = Math.min(15.0, Math.max(9.5, 9.8 + ratio * 0.45));
    }
    const rStr = r.toFixed(1);
    const score = parseFloat(rStr);
    const medal: MlbbMedalGrade = score >= 11.0 ? 'Mythic MVP' : 'Gold MVP';
    return { rating: rStr, medal, isFeeder: false };
  }

  if (isSvp) {
    let r = 9.8;
    if (kda) {
      const parts = kda.split(/[\/\-:\s]+/).map((p) => parseInt(p.trim(), 10));
      const k = parts[0] || 0;
      const d = parts[1] || 0;
      const a = parts[2] || 0;
      const ratio = (k + a) / Math.max(1, d);
      r = Math.min(13.5, Math.max(7.5, 8.2 + ratio * 0.4));
    }
    const rStr = r.toFixed(1);
    const score = parseFloat(rStr);
    const medal: MlbbMedalGrade = score >= 11.0 ? 'Mythic SVP' : 'Gold SVP';
    return { rating: rStr, medal, isFeeder: false };
  }

  if (!kda) {
    return won
      ? { rating: '7.5', medal: 'Gold', isFeeder: false }
      : { rating: '4.8', medal: 'Silver', isFeeder: false };
  }

  const parts = kda.split(/[\/\-:\s]+/).map((p) => parseInt(p.trim(), 10));
  const k = !isNaN(parts[0]) && parts[0] >= 0 ? parts[0] : 0;
  const d = !isNaN(parts[1]) && parts[1] >= 0 ? parts[1] : 0;
  const a = !isNaN(parts[2]) && parts[2] >= 0 ? parts[2] : 0;
  const ratio = (k + a) / Math.max(1, d);

  let rawScore: number;
  if (won) {
    rawScore = 6.0 + ratio * 0.75 - Math.max(0, d - 3) * 0.25;
  } else {
    rawScore = 4.2 + ratio * 0.65 - Math.max(0, d - 2) * 0.3;
  }

  const clamped = Math.min(13.5, Math.max(3.0, rawScore));
  const ratingStr = clamped.toFixed(1);
  const scoreNum = parseFloat(ratingStr);

  let medal: MlbbMedalGrade;
  let isFeeder = false;

  if (scoreNum >= 11.0) {
    medal = 'Mythic Gold';
  } else if (scoreNum >= 6.8) {
    medal = 'Gold';
  } else if (scoreNum >= 4.0) {
    medal = 'Silver';
  } else {
    medal = 'Bronze';
    isFeeder = true;
  }

  return { rating: ratingStr, medal, isFeeder };
}

