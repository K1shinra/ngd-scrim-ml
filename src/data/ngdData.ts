export type MlbbRole =
  | 'EXP Lane'
  | 'Gold Lane'
  | 'Mid Lane'
  | 'Jungle'
  | 'Roamer'
  | 'Flex Role';

export const MLBB_ROLES: MlbbRole[] = [
  'Jungle',
  'EXP Lane',
  'Mid Lane',
  'Gold Lane',
  'Roamer',
  'Flex Role',
];

export const CORE_FIVE_ROLES: MlbbRole[] = [
  'Jungle',
  'EXP Lane',
  'Mid Lane',
  'Gold Lane',
  'Roamer',
];

export interface RoleMeta {
  role: MlbbRole;
  shortLabel: string;
  gcLabel: string;
  laneTask: string;
  accentHex: string;
  textClass: string;
  borderClass: string;
  bgSubtleClass: string;
}

export const ROLE_META: Record<MlbbRole, RoleMeta> = {
  Jungle: {
    role: 'Jungle',
    shortLabel: 'JGL',
    gcLabel: 'Jungler',
    laneTask: 'Retribution Core / Objective Control',
    accentHex: '#00f2fe',
    textClass: 'text-cyan-700 dark:text-[#00f2fe]',
    borderClass: 'border-cyan-500/40 dark:border-[#00f2fe]/35',
    bgSubtleClass: 'bg-cyan-500/10 dark:bg-[#00f2fe]/10',
  },
  'EXP Lane': {
    role: 'EXP Lane',
    shortLabel: 'EXP',
    gcLabel: 'Exp',
    laneTask: 'Sustained Fighter / Frontline Dive',
    accentHex: '#f97316',
    textClass: 'text-orange-600 dark:text-orange-400',
    borderClass: 'border-orange-500/40 dark:border-orange-500/35',
    bgSubtleClass: 'bg-orange-500/10',
  },
  'Mid Lane': {
    role: 'Mid Lane',
    shortLabel: 'MID',
    gcLabel: 'Mid',
    laneTask: 'Burst Mage / High-Ground Control',
    accentHex: '#a855f7',
    textClass: 'text-purple-700 dark:text-purple-400',
    borderClass: 'border-purple-500/40 dark:border-purple-500/35',
    bgSubtleClass: 'bg-purple-500/10',
  },
  'Gold Lane': {
    role: 'Gold Lane',
    shortLabel: 'GOLD',
    gcLabel: 'Gold',
    laneTask: 'Marksman Carry / Late-Game DPS',
    accentHex: '#f1c40f',
    textClass: 'text-amber-700 dark:text-[#f1c40f]',
    borderClass: 'border-amber-500/40 dark:border-[#f1c40f]/35',
    bgSubtleClass: 'bg-amber-500/10 dark:bg-[#f1c40f]/10',
  },
  Roamer: {
    role: 'Roamer',
    shortLabel: 'ROAM',
    gcLabel: 'Roam',
    laneTask: 'Vision Setter / Engage & Peel',
    accentHex: '#10b981',
    textClass: 'text-emerald-700 dark:text-emerald-400',
    borderClass: 'border-emerald-500/40 dark:border-emerald-500/35',
    bgSubtleClass: 'bg-emerald-500/10',
  },
  'Flex Role': {
    role: 'Flex Role',
    shortLabel: 'MULTI',
    gcLabel: 'Multi',
    laneTask: 'All-Around Fill / Any Lane',
    accentHex: '#ec4899',
    textClass: 'text-pink-700 dark:text-pink-400',
    borderClass: 'border-pink-500/40 dark:border-pink-500/35',
    bgSubtleClass: 'bg-pink-500/10',
  },
};

export function formatRolePairText(
  primaryRole: MlbbRole,
  secondaryRole?: MlbbRole | null
): string {
  if (primaryRole === 'Flex Role') return 'Multi';
  const pLabel = ROLE_META[primaryRole].gcLabel;
  if (
    !secondaryRole ||
    secondaryRole === primaryRole ||
    secondaryRole === 'Flex Role'
  ) {
    return pLabel;
  }
  return `${pLabel}/${ROLE_META[secondaryRole].gcLabel}`;
}

export interface PlayerProfile {
  id: string;
  ign: string;
  squadTag: string;
  primaryRole: MlbbRole;
  secondaryRole: MlbbRole;
  roleLabel: string; // e.g. "Jungler/Roam", "Mid/Gold", "Multi"
  wins: number;
  losses: number;
  mvpCount: number;
  streak: number;
  roleCounts: Record<MlbbRole, number>;
  recentForm: ('W' | 'L')[];
  signatureHeroes: string[];
  mythicStars: number;
}

export interface QueuedPlayer {
  id: string;
  ign: string;
  role: MlbbRole;
  secondaryRole?: MlbbRole;
  roleLabel: string;
  joinedAt: string;
  isReady: boolean;
  note?: string;
}

export interface ScrimSlot {
  slotNumber: number; // 1 to 20
  ign: string;
  role: MlbbRole;
  secondaryRole?: MlbbRole;
  roleLabel: string; // e.g., "Jungler/Roam"
  isReady: boolean;
  assignedAt: string;
}

export interface MatchParticipant {
  ign: string;
  selectedRole: MlbbRole;
  secondaryRole?: MlbbRole;
  roleLabel: string;
  assignedLane: MlbbRole;
  winrateSnapshot: number;
  kda?: string;
  rating?: string;
  heroDamage?: number;
  heroDamagePct?: number;
  damageTaken?: number;
  damageTakenPct?: number;
  turretDamage?: number;
  turretDamagePct?: number;
  teamfightPct?: number;
  gold?: number;
  medal?: string; // 'MVP' | 'SVP' | 'Gold' | 'Silver' | 'Bronze'
  isFeeder?: boolean;
  isMvp?: boolean;
  won?: boolean;
}

export interface LiveMatchState {
  matchId: string;
  roomName: string;
  hostIgn: string;
  seriesFormat: 'BO1' | 'BO3' | 'BO5';
  startedAt: string;
  teamBlue: MatchParticipant[];
  teamRed: MatchParticipant[];
  mvpIgn: string;
  shuffleNote?: string;
  blueSeriesWins?: number;
  redSeriesWins?: number;
}

export interface MatchHistoryRecord {
  id: string;
  roomName: string;
  completedAt: string;
  winner: 'Blue' | 'Red';
  mvpIgn: string;
  svpIgn?: string;
  feederIgn?: string;
  feederIgns?: string[];
  killScore?: string;
  blueKills?: number;
  redKills?: number;
  seriesGameNumber?: number;
  seriesScore?: string;
  screenshotUrl?: string;
  dataScreenshotUrl?: string;
  teamBlue: MatchParticipant[];
  teamRed: MatchParticipant[];
  durationText: string;
  blueAvgWr?: number;
  redAvgWr?: number;
}

export const INITIAL_PLAYERS: PlayerProfile[] = [
  {
    id: 'p-estranghero',
    ign: 'Estranghero',
    squadTag: 'NGD',
    primaryRole: 'Jungle',
    secondaryRole: 'Roamer',
    roleLabel: 'Jungler/Roam',
    wins: 46,
    losses: 18,
    mvpCount: 17,
    streak: 4,
    roleCounts: {
      Jungle: 42,
      Roamer: 16,
      'EXP Lane': 4,
      'Mid Lane': 1,
      'Gold Lane': 0,
      'Flex Role': 1,
    },
    recentForm: ['W', 'W', 'L', 'W', 'W'],
    signatureHeroes: ['Ling', 'Hayabusa', 'Khufra'],
    mythicStars: 138,
  },
  {
    id: 'p-akira',
    ign: 'Akira',
    squadTag: 'NGD',
    primaryRole: 'Mid Lane',
    secondaryRole: 'Gold Lane',
    roleLabel: 'Mid/Gold',
    wins: 41,
    losses: 19,
    mvpCount: 14,
    streak: 3,
    roleCounts: {
      'Mid Lane': 36,
      'Gold Lane': 19,
      'Flex Role': 3,
      Roamer: 2,
      Jungle: 0,
      'EXP Lane': 0,
    },
    recentForm: ['L', 'W', 'W', 'W', 'W'],
    signatureHeroes: ['Valentina', 'Claude', 'Kagura'],
    mythicStars: 126,
  },
  {
    id: 'p-takeshi',
    ign: 'Takeshi',
    squadTag: 'NGD',
    primaryRole: 'EXP Lane',
    secondaryRole: 'Gold Lane',
    roleLabel: 'Exp/Gold',
    wins: 39,
    losses: 20,
    mvpCount: 11,
    streak: 2,
    roleCounts: {
      'EXP Lane': 35,
      'Gold Lane': 18,
      Jungle: 3,
      'Flex Role': 3,
      'Mid Lane': 0,
      Roamer: 0,
    },
    recentForm: ['W', 'L', 'W', 'W', 'W'],
    signatureHeroes: ['Yu Zhong', 'Terizla', 'Karrie'],
    mythicStars: 118,
  },
  {
    id: 'p-sion',
    ign: 'Sion',
    squadTag: 'NGD',
    primaryRole: 'EXP Lane',
    secondaryRole: 'EXP Lane',
    roleLabel: 'Exp',
    wins: 37,
    losses: 19,
    mvpCount: 9,
    streak: 1,
    roleCounts: {
      'EXP Lane': 48,
      Roamer: 5,
      Jungle: 2,
      'Flex Role': 1,
      'Mid Lane': 0,
      'Gold Lane': 0,
    },
    recentForm: ['W', 'W', 'L', 'L', 'W'],
    signatureHeroes: ['Arlott', 'Lapu-Lapu', 'Paquito'],
    mythicStars: 114,
  },
  {
    id: 'p-miamor',
    ign: 'mi amor',
    squadTag: 'NGD',
    primaryRole: 'Flex Role',
    secondaryRole: 'Gold Lane',
    roleLabel: 'Multi',
    wins: 44,
    losses: 17,
    mvpCount: 15,
    streak: 5,
    roleCounts: {
      'Flex Role': 24,
      'Gold Lane': 14,
      'Mid Lane': 10,
      Jungle: 6,
      Roamer: 4,
      'EXP Lane': 3,
    },
    recentForm: ['W', 'W', 'W', 'W', 'W'],
    signatureHeroes: ['Beatrix', 'Faramis', 'Joy'],
    mythicStars: 141,
  },
  {
    id: 'p-kingaha',
    ign: 'king aha',
    squadTag: 'NGD',
    primaryRole: 'Roamer',
    secondaryRole: 'EXP Lane',
    roleLabel: 'Roam',
    wins: 36,
    losses: 18,
    mvpCount: 8,
    streak: 2,
    roleCounts: {
      Roamer: 45,
      'EXP Lane': 6,
      'Mid Lane': 2,
      'Flex Role': 1,
      Jungle: 0,
      'Gold Lane': 0,
    },
    recentForm: ['L', 'W', 'L', 'W', 'W'],
    signatureHeroes: ['Tigreal', 'Minotaur', 'Chou'],
    mythicStars: 110,
  },
  {
    id: 'p-aviona',
    ign: 'aviona',
    squadTag: 'NGD',
    primaryRole: 'Mid Lane',
    secondaryRole: 'Gold Lane',
    roleLabel: 'Mid/Gold',
    wins: 38,
    losses: 18,
    mvpCount: 12,
    streak: 3,
    roleCounts: {
      'Mid Lane': 31,
      'Gold Lane': 21,
      Roamer: 2,
      'Flex Role': 2,
      Jungle: 0,
      'EXP Lane': 0,
    },
    recentForm: ['W', 'L', 'W', 'W', 'W'],
    signatureHeroes: ['Lunox', 'Wanwan', 'Novaria'],
    mythicStars: 122,
  },
  {
    id: 'p-favian',
    ign: 'Favian',
    squadTag: 'NGD',
    primaryRole: 'Mid Lane',
    secondaryRole: 'EXP Lane',
    roleLabel: 'Mid',
    wins: 43,
    losses: 17,
    mvpCount: 16,
    streak: 4,
    roleCounts: {
      'Mid Lane': 42,
      'EXP Lane': 12,
      Jungle: 4,
      'Flex Role': 2,
      'Gold Lane': 0,
      Roamer: 0,
    },
    recentForm: ['W', 'W', 'W', 'L', 'W'],
    signatureHeroes: ['Yve', 'Pharsa', 'Xavier'],
    mythicStars: 132,
  },
  {
    id: 'p-joshy',
    ign: 'joshy',
    squadTag: 'NGD',
    primaryRole: 'Jungle',
    secondaryRole: 'Roamer',
    roleLabel: 'Jungler/Roam',
    wins: 49,
    losses: 15,
    mvpCount: 21,
    streak: 6,
    roleCounts: {
      Jungle: 45,
      Roamer: 14,
      'EXP Lane': 3,
      'Gold Lane': 1,
      'Mid Lane': 0,
      'Flex Role': 1,
    },
    recentForm: ['W', 'W', 'W', 'W', 'W'],
    signatureHeroes: ['Fanny', 'Nolan', 'Lancelot'],
    mythicStars: 148,
  },
  {
    id: 'p-whis',
    ign: 'whis',
    squadTag: 'NGD',
    primaryRole: 'Gold Lane',
    secondaryRole: 'Roamer',
    roleLabel: 'Gold/Roam',
    wins: 40,
    losses: 18,
    mvpCount: 13,
    streak: 2,
    roleCounts: {
      'Gold Lane': 36,
      Roamer: 17,
      'Mid Lane': 3,
      'Flex Role': 2,
      Jungle: 0,
      'EXP Lane': 0,
    },
    recentForm: ['L', 'W', 'W', 'L', 'W'],
    signatureHeroes: ['Harith', 'Moskov', 'Mathilda'],
    mythicStars: 125,
  },
  {
    id: 'p-setsuko',
    ign: 'Setsuko',
    squadTag: 'NGD',
    primaryRole: 'Gold Lane',
    secondaryRole: 'Mid Lane',
    roleLabel: 'Gold/Mid',
    wins: 35,
    losses: 17,
    mvpCount: 11,
    streak: 1,
    roleCounts: {
      'Gold Lane': 34,
      'Mid Lane': 12,
      'Flex Role': 6,
      Jungle: 0,
      'EXP Lane': 0,
      Roamer: 0,
    },
    recentForm: ['W', 'L', 'W', 'L', 'W'],
    signatureHeroes: ['Clint', 'Brody', 'Cecilion'],
    mythicStars: 116,
  },
  {
    id: 'p-sintopia',
    ign: 'Sintopia',
    squadTag: 'NGD',
    primaryRole: 'Roamer',
    secondaryRole: 'EXP Lane',
    roleLabel: 'Roam/Exp',
    wins: 34,
    losses: 16,
    mvpCount: 8,
    streak: 2,
    roleCounts: {
      Roamer: 35,
      'EXP Lane': 11,
      'Flex Role': 4,
      Jungle: 0,
      'Mid Lane': 0,
      'Gold Lane': 0,
    },
    recentForm: ['L', 'W', 'W', 'W', 'W'],
    signatureHeroes: ['Atlas', 'Edith', 'gatotkaca'],
    mythicStars: 112,
  },
];

export const MAX_SETS = 5;
export const SLOTS_PER_SET = 10;
export const MAX_SLOTS = MAX_SETS * SLOTS_PER_SET; // 50

// Pre-populated with the exact 10 "Scrim warmup" entries from the user's GC + 2 in Batch 2!
// Up to 5 Sets of 10 players each (Slots 1–50)
export const INITIAL_SLOTS: (ScrimSlot | null)[] = Array.from(
  { length: MAX_SLOTS },
  (_, idx) => {
    const num = idx + 1;
    const warmupPreset: Record<
      number,
      {
        ign: string;
        role: MlbbRole;
        secondaryRole?: MlbbRole;
        roleLabel: string;
        assignedAt: string;
      }
    > = {
      1: {
        ign: 'Estranghero',
        role: 'Jungle',
        secondaryRole: 'Roamer',
        roleLabel: 'Jungler/Roam',
        assignedAt: '20:01',
      },
      2: {
        ign: 'Akira',
        role: 'Mid Lane',
        secondaryRole: 'Gold Lane',
        roleLabel: 'Mid/Gold',
        assignedAt: '20:02',
      },
      3: {
        ign: 'Takeshi',
        role: 'EXP Lane',
        secondaryRole: 'Gold Lane',
        roleLabel: 'Exp/Gold',
        assignedAt: '20:03',
      },
      4: {
        ign: 'Sion',
        role: 'EXP Lane',
        secondaryRole: 'EXP Lane',
        roleLabel: 'Exp',
        assignedAt: '20:04',
      },
      5: {
        ign: 'mi amor',
        role: 'Flex Role',
        secondaryRole: 'Gold Lane',
        roleLabel: 'Multi',
        assignedAt: '20:05',
      },
      6: {
        ign: 'king aha',
        role: 'Roamer',
        secondaryRole: 'EXP Lane',
        roleLabel: 'Roam',
        assignedAt: '20:06',
      },
      7: {
        ign: 'aviona',
        role: 'Mid Lane',
        secondaryRole: 'Gold Lane',
        roleLabel: 'Mid/Gold',
        assignedAt: '20:07',
      },
      8: {
        ign: 'Favian',
        role: 'Mid Lane',
        secondaryRole: 'EXP Lane',
        roleLabel: 'Mid',
        assignedAt: '20:08',
      },
      9: {
        ign: 'joshy',
        role: 'Jungle',
        secondaryRole: 'Roamer',
        roleLabel: 'Jungler/Roam',
        assignedAt: '20:09',
      },
      10: {
        ign: 'whis',
        role: 'Gold Lane',
        secondaryRole: 'Roamer',
        roleLabel: 'Gold/Roam',
        assignedAt: '20:10',
      },
      11: {
        ign: 'Setsuko',
        role: 'Gold Lane',
        secondaryRole: 'Mid Lane',
        roleLabel: 'Gold/Mid',
        assignedAt: '20:14',
      },
      12: {
        ign: 'Sintopia',
        role: 'Roamer',
        secondaryRole: 'EXP Lane',
        roleLabel: 'Roam/Exp',
        assignedAt: '20:15',
      },
    };

    const item = warmupPreset[num];
    if (item) {
      return {
        slotNumber: num,
        ign: item.ign,
        role: item.role,
        secondaryRole: item.secondaryRole,
        roleLabel: item.roleLabel,
        isReady: true,
        assignedAt: item.assignedAt,
      };
    }
    return null;
  }
);

export const INITIAL_QUEUE: QueuedPlayer[] = [
  {
    id: 'q-1',
    ign: 'Kairi',
    role: 'Jungle',
    secondaryRole: 'Gold Lane',
    roleLabel: 'Jungler/Gold',
    joinedAt: '20:18',
    isReady: true,
    note: 'Waiting for Batch 2',
  },
  {
    id: 'q-2',
    ign: 'Kelra',
    role: 'Gold Lane',
    secondaryRole: 'Mid Lane',
    roleLabel: 'Gold/Mid',
    joinedAt: '20:19',
    isReady: true,
    note: 'Ready to sub',
  },
];

// Pre-balanced 5v5 Matchup using the exact 10 Scrim Warmup players!
export const INITIAL_LIVE_MATCH: LiveMatchState = {
  matchId: 'NGD-WARMUP-01',
  roomName: 'Scrim Warmup · Friendly 5v5 Custom Draft',
  hostIgn: 'joshy',
  seriesFormat: 'BO3',
  startedAt: '20:25',
  mvpIgn: 'joshy',
  shuffleNote:
    'Balanced 5v5 from Slots 1–10 · Multi-role resolved (Blue 69.8% WR vs Red 69.5% WR)',
  teamBlue: [
    {
      ign: 'Estranghero',
      selectedRole: 'Jungle',
      secondaryRole: 'Roamer',
      roleLabel: 'Jungler/Roam',
      assignedLane: 'Jungle',
      winrateSnapshot: 71.9,
    },
    {
      ign: 'Takeshi',
      selectedRole: 'EXP Lane',
      secondaryRole: 'Gold Lane',
      roleLabel: 'Exp/Gold',
      assignedLane: 'EXP Lane',
      winrateSnapshot: 66.1,
    },
    {
      ign: 'Favian',
      selectedRole: 'Mid Lane',
      secondaryRole: 'EXP Lane',
      roleLabel: 'Mid',
      assignedLane: 'Mid Lane',
      winrateSnapshot: 71.7,
    },
    {
      ign: 'Akira',
      selectedRole: 'Mid Lane',
      secondaryRole: 'Gold Lane',
      roleLabel: 'Mid/Gold',
      assignedLane: 'Gold Lane',
      winrateSnapshot: 68.3,
    },
    {
      ign: 'king aha',
      selectedRole: 'Roamer',
      secondaryRole: 'EXP Lane',
      roleLabel: 'Roam',
      assignedLane: 'Roamer',
      winrateSnapshot: 66.7,
    },
  ],
  teamRed: [
    {
      ign: 'joshy',
      selectedRole: 'Jungle',
      secondaryRole: 'Roamer',
      roleLabel: 'Jungler/Roam',
      assignedLane: 'Jungle',
      winrateSnapshot: 76.6,
    },
    {
      ign: 'Sion',
      selectedRole: 'EXP Lane',
      secondaryRole: 'EXP Lane',
      roleLabel: 'Exp',
      assignedLane: 'EXP Lane',
      winrateSnapshot: 66.1,
    },
    {
      ign: 'aviona',
      selectedRole: 'Mid Lane',
      secondaryRole: 'Gold Lane',
      roleLabel: 'Mid/Gold',
      assignedLane: 'Mid Lane',
      winrateSnapshot: 67.9,
    },
    {
      ign: 'mi amor',
      selectedRole: 'Flex Role',
      secondaryRole: 'Gold Lane',
      roleLabel: 'Multi',
      assignedLane: 'Gold Lane',
      winrateSnapshot: 72.1,
    },
    {
      ign: 'whis',
      selectedRole: 'Gold Lane',
      secondaryRole: 'Roamer',
      roleLabel: 'Gold/Roam',
      assignedLane: 'Roamer',
      winrateSnapshot: 69.0,
    },
  ],
};

export const INITIAL_MATCH_HISTORY: MatchHistoryRecord[] = [
  {
    id: 'NGD-WARMUP-01',
    roomName: 'Scrim Warmup · Game 1',
    completedAt: 'Tonight · 20:00',
    winner: 'Blue',
    mvpIgn: 'joshy',
    svpIgn: 'aviona',
    feederIgn: 'mi amor',
    killScore: 'Blue 24 - 18 Red',
    blueKills: 24,
    redKills: 18,
    seriesGameNumber: 1,
    seriesScore: '1 - 0 (BO3)',
    durationText: '17m 24s',
    teamBlue: [
      {
        ign: 'joshy',
        selectedRole: 'Jungle',
        roleLabel: 'Jungler/Roam',
        assignedLane: 'Jungle',
        winrateSnapshot: 76.2,
        kda: '9/1/8',
        rating: '11.8',
        medal: 'MVP',
        heroDamage: 112450,
        heroDamagePct: 34,
        damageTaken: 45200,
        damageTakenPct: 18,
        turretDamage: 6800,
        turretDamagePct: 42,
        teamfightPct: 71,
        gold: 13200,
      },
      {
        ign: 'Takeshi',
        selectedRole: 'EXP Lane',
        roleLabel: 'Exp/Gold',
        assignedLane: 'EXP Lane',
        winrateSnapshot: 65.5,
        kda: '4/2/9',
        rating: '9.4',
        medal: 'Gold',
        heroDamage: 68300,
        heroDamagePct: 21,
        damageTaken: 89600,
        damageTakenPct: 35,
        turretDamage: 4200,
        turretDamagePct: 26,
        teamfightPct: 62,
        gold: 11800,
      },
      {
        ign: 'Akira',
        selectedRole: 'Mid Lane',
        roleLabel: 'Mid/Gold',
        assignedLane: 'Mid Lane',
        winrateSnapshot: 67.8,
        kda: '6/3/11',
        rating: '10.2',
        medal: 'Gold',
        heroDamage: 94800,
        heroDamagePct: 29,
        damageTaken: 36400,
        damageTakenPct: 14,
        turretDamage: 2100,
        turretDamagePct: 13,
        teamfightPct: 74,
        gold: 12100,
      },
      {
        ign: 'whis',
        selectedRole: 'Gold Lane',
        roleLabel: 'Gold/Roam',
        assignedLane: 'Gold Lane',
        winrateSnapshot: 68.4,
        kda: '4/4/6',
        rating: '7.8',
        medal: 'Silver',
        heroDamage: 42100,
        heroDamagePct: 13,
        damageTaken: 31200,
        damageTakenPct: 12,
        turretDamage: 2800,
        turretDamagePct: 17,
        teamfightPct: 45,
        gold: 10900,
      },
      {
        ign: 'king aha',
        selectedRole: 'Roamer',
        roleLabel: 'Roam',
        assignedLane: 'Roamer',
        winrateSnapshot: 66.0,
        kda: '1/8/16',
        rating: '8.1',
        medal: 'Silver',
        heroDamage: 11200,
        heroDamagePct: 3,
        damageTaken: 54100,
        damageTakenPct: 21,
        turretDamage: 300,
        turretDamagePct: 2,
        teamfightPct: 78,
        gold: 8400,
      },
    ],
    teamRed: [
      {
        ign: 'aviona',
        selectedRole: 'Mid Lane',
        roleLabel: 'Mid/Gold',
        assignedLane: 'Mid Lane',
        winrateSnapshot: 68.5,
        kda: '7/3/6',
        rating: '10.6',
        medal: 'SVP',
        heroDamage: 104200,
        heroDamagePct: 38,
        damageTaken: 38900,
        damageTakenPct: 15,
        turretDamage: 1400,
        turretDamagePct: 15,
        teamfightPct: 76,
        gold: 12400,
      },
      {
        ign: 'Estranghero',
        selectedRole: 'Jungle',
        roleLabel: 'Jungler/Roam',
        assignedLane: 'Jungle',
        winrateSnapshot: 72.5,
        kda: '5/4/5',
        rating: '8.4',
        medal: 'Gold',
        heroDamage: 72100,
        heroDamagePct: 26,
        damageTaken: 49200,
        damageTakenPct: 19,
        turretDamage: 3800,
        turretDamagePct: 40,
        teamfightPct: 56,
        gold: 11600,
      },
      {
        ign: 'Sion',
        selectedRole: 'EXP Lane',
        roleLabel: 'Exp',
        assignedLane: 'EXP Lane',
        winrateSnapshot: 66.7,
        kda: '3/4/4',
        rating: '6.9',
        medal: 'Silver',
        heroDamage: 45600,
        heroDamagePct: 17,
        damageTaken: 92300,
        damageTakenPct: 36,
        turretDamage: 3100,
        turretDamagePct: 33,
        teamfightPct: 44,
        gold: 10200,
      },
      {
        ign: 'Favian',
        selectedRole: 'Mid Lane',
        roleLabel: 'Mid',
        assignedLane: 'Gold Lane',
        winrateSnapshot: 72.4,
        kda: '2/5/5',
        rating: '5.8',
        medal: 'Silver',
        heroDamage: 38400,
        heroDamagePct: 14,
        damageTaken: 32100,
        damageTakenPct: 12,
        turretDamage: 900,
        turretDamagePct: 10,
        teamfightPct: 41,
        gold: 9800,
      },
      {
        ign: 'mi amor',
        selectedRole: 'Flex Role',
        roleLabel: 'Multi',
        assignedLane: 'Roamer',
        winrateSnapshot: 72.9,
        kda: '1/8/8',
        rating: '4.6',
        medal: 'Bronze',
        isFeeder: true,
        heroDamage: 14200,
        heroDamagePct: 5,
        damageTaken: 46200,
        damageTakenPct: 18,
        turretDamage: 200,
        turretDamagePct: 2,
        teamfightPct: 52,
        gold: 7900,
      },
    ],
  },
];

export function calcWinrate(wins: number, losses: number): number {
  const total = wins + losses;
  if (total === 0) return 0;
  return Number(((wins / total) * 100).toFixed(1));
}

export function getMostPlayedRole(
  roleCounts: Record<MlbbRole, number>,
  fallback: MlbbRole
): MlbbRole {
  let bestRole: MlbbRole = fallback;
  let maxCount = -1;
  for (const role of MLBB_ROLES) {
    const count = roleCounts[role] ?? 0;
    if (count > maxCount) {
      maxCount = count;
      bestRole = role;
    }
  }
  return maxCount > 0 ? bestRole : fallback;
}
