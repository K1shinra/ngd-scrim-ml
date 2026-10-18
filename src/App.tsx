import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  ArrowUpRight,
  Camera,
  Check,
  ClipboardPaste,
  Copy,
  Crown,
  History,
  ListOrdered,
  Loader2,
  LogIn,
  LogOut,
  Lock,
  Monitor,
  Moon,
  Play,
  RefreshCw,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Shuffle,
  Skull,
  Sparkles,
  Sun,
  Swords,
  Trash2,
  Trophy,
  Unlock,
  UserPlus,
  Users,
  BarChart3,
  UserCheck,
  User,
  Zap,
  Share2,
  Scale,
  Edit3,
  Plus,
  Minus,
  Layers,
} from 'lucide-react';
import { GameStatsTab } from './components/GameStatsTab';
import { useAuth } from './context/AuthContext';
import { activeFirebaseProjectId } from './lib/firebase';
import {
  clearAllPlayersFromSupabase,
  clearMatchHistoryFromSupabase,
  deleteMatchHistoryFromSupabase,
  deletePlayerFromSupabase,
  fetchFromSupabase,
  insertMatchHistoryToSupabase,
  supabaseClient,
  syncToSupabase,
} from './lib/supabase';
import {
  CORE_FIVE_ROLES,
  INITIAL_LIVE_MATCH,
  INITIAL_MATCH_HISTORY,
  INITIAL_PLAYERS,
  INITIAL_QUEUE,
  INITIAL_SLOTS,
  MAX_SETS,
  MAX_SLOTS,
  SLOTS_PER_SET,
  LiveMatchState,
  MLBB_ROLES,
  MatchHistoryRecord,
  MatchParticipant,
  MlbbRole,
  PlayerProfile,
  QueuedPlayer,
  ROLE_META,
  ScrimSlot,
  calcWinrate,
  formatRolePairText,
} from './data/ngdData';
import { NgdBrandEmblem, RoleBadge, RoleIcon } from './components/NgdIcons';
import {
  autoBalance5v5,
  autoBalanceCurrentParticipants,
  buildDirectLineup5v5,
  calculateMlbbRating,
  cleanPlayerIgn,
  detectSeriesFormatFromText,
  formatBattleResultGcText,
  formatGcText,
  getPlayerWinrate,
  parseTraditionalGcText,
} from './utils/scrimEngine';
import { MatchPosterModal, PosterTemplate } from './components/MatchPosterModal';
import { LeaderboardSummaryModal } from './components/LeaderboardSummaryModal';
import { ManualStatsEditor } from './components/ManualStatsEditor';
import { EditMatchStatsModal } from './components/EditMatchStatsModal';

type ActiveTab = 'queue' | 'match' | 'stats' | 'leaderboard' | 'settings';
type LeaderboardSort = 'wins' | 'mvp' | 'winrate' | 'matches';
type ThemeMode = 'light' | 'dark' | 'system';
type Language = 'en' | 'tl';

const STORAGE_KEYS = {
  players: 'ngd_scrim_players_v4',
  slots: 'ngd_scrim_slots_v4',
  queue: 'ngd_scrim_queue_v4',
  liveMatch: 'ngd_scrim_livematch_v4',
  history: 'ngd_scrim_history_v4',
  theme: 'ngd_scrim_theme_v1',
  lang: 'ngd_scrim_lang_v1',
  adminUnlocked: 'ngd_scrim_admin_v1',
  setCount: 'ngd_scrim_set_count_v1',
};

const ADMIN_EMAILS = ['esparagojm@gmail.com'];
const VALID_ADMIN_PINS = [
  (
    (import.meta.env as Record<string, string | undefined>).VITE_ADMIN_PIN || ''
  ).trim(),
  '2408',
  'ngd2019',
].filter(Boolean);

function isValidAdminPin(pin: string): boolean {
  return VALID_ADMIN_PINS.includes(pin.trim().toLowerCase());
}

const TRANSLATIONS = {
  en: {
    brandTitle: 'NGD Scrim System',
    navSlots: 'Player Slots (Games 1–5)',
    navSlotsShort: 'Player Slots',
    navMatch: '5v5 Team Shuffle',
    navMatchShort: '5v5 Match',
    navStats: '📊 Game Stats & Posters',
    navStatsShort: 'Stats & Posters',
    navLeaderboard: 'Leaderboard',
    navLeaderboardShort: 'Rankings',
    navSettings: 'Settings',
    navSettingsShort: 'Settings',
    copyGcList: 'Copy Player List',
    copied: 'Copied!',
    joinTitle: 'Sign Up for Custom 5v5',
    joinSubtitle:
      'Enter your MLBB IGN and select your Role (e.g., Jungler, Mid/Gold, Multi) to join an open slot.',
    pasteGcBtn: 'Paste List',
    resetBtn: 'Reset List',
    cancelBtn: 'Cancel',
    importBtn: 'Import Players',
    playerIgnLabel: 'Player IGN',
    playerIgnPlaceholder: 'Enter MLBB IGN (e.g., Estranghero, joshy)...',
    mainRoleLabel: 'Main Role',
    secondRoleLabel: '2nd Role (Optional)',
    noneOneRole: 'None (1 Role)',
    joinSubmitBtn: 'Join Slot',
    allSlotsTab: 'All (1–20)',
    first10Tab: 'First 10',
    next10Tab: 'Next 10',
    game1Badge: 'GAME 1 · PLAYING NOW',
    first10Title: 'First 10 Players (1–10)',
    game2Badge: 'GAME 2 · WAITING IN LINE',
    next10Title: 'Next 10 Players (11–20)',
    openSlotLabel: 'Open Slot',
    joinSlotBtn: '+ Join',
    inlineIgnPlaceholder: 'Enter IGN...',
    inlineMainPrefix: 'Main:',
    inlineSecondNone: '2nd Role: None',
    inlineSecondPrefix: '2nd Role:',
    inlineSaveBtn: 'Save',
    removeSlotTitle: 'Remove player from slot',
    startNoShuffleBtn: 'Start Match (No Shuffle: 1–5 vs 6–10)',
    keepOrderBtn: 'No Shuffle (1–5 vs 6–10)',
    shuffleFirst10Btn: 'Shuffle 5v5 Teams (Slots 1–10)',
    copyShortBtn: 'Copy List',
    promoteNext10Btn: 'Move Next 10 ➔ First 10 (Next Game)',
    seriesFormatLabel: 'Match Format:',
    formatBo1: '1 Game',
    formatBo3: 'Best of 3',
    formatBo5: 'Best of 5',
    seriesScoreLabel: 'Series Score',
    resetSeriesBtn: 'Reset Score',
    slotTeamBlueHint: 'Slots 1–5 · Team Blue (if No Shuffle)',
    slotTeamRedHint: 'Slots 6–10 · Team Red (if No Shuffle)',
    custom5v5Badge: 'CUSTOM 5V5 DRAFT ROOM',
    custom5v5Title: 'Team Blue vs Team Red',
    custom5v5Desc:
      'If one team is too stacked, click Shuffle Teams Again or use Swap to trade players.',
    autoBalanceBtn: 'Auto-Balance (Fair WR)',
    shuffleAgainBtn: 'Shuffle Teams Again',
    copy5v5Btn: 'Copy 5v5 Matchup',
    exportLineupPosterBtn: 'Export Lineup Poster',
    viewModeRoster: 'Team Rosters',
    viewModeMatchup: 'Lane Matchups (Vs Mode)',
    fairnessBalanced: 'Fair & Balanced Matchup',
    fairnessImbalanced: 'Imbalanced Matchup',
    autoBalanceCurrentBtn: 'Auto-Balance Lineup (Equal WR)',
    swapLaneBtn: 'Swap Opponents',
    youBadge: 'YOU',
    yourRoleInMatch: 'You are playing in this match',
    claimIgnTitle: 'Claim / Link MLBB IGN',
    claimIgnDesc: 'Link your Google/Squad account to your MLBB player profile to unlock 1-click queueing and personal highlights.',
    quickJoinAsMyIgn: 'Quick Join as',
    linkMyIgnBtn: 'Link My IGN',
    teamBlueTitle: '🔵 Team Blue (First Pick)',
    teamRedTitle: '🔴 Team Red (Second Pick)',
    avgWrLabel: 'Avg Winrate',
    assignedLabel: 'Assigned Lane',
    swapBtn: 'Swap',
    selectTargetBtn: 'Select Player...',
    finishMatchTitle: 'Battle Result & Screenshot Auto-Reader',
    finishMatchDesc:
      'Best: Upload the main Scoreboard / KDA (Equipment) tab screenshot so KDA & MVP ratings are visible — or select both KDA + Data screenshots together.',
    uploadScreenshotBtn: 'Upload Battle Result (KDA / Data)',
    scanningScreenshotText: 'Scanning MLBB Battle Result...',
    scannedReadyBadge: 'Screenshot Scanned — Stats & Rosters Auto-Filled!',
    confirmScannedWinnerBtn: 'Confirm & Save Scanned Result',
    blueMvpLabel: '🔵 Team Blue Best Player (MVP if Blue Wins)',
    redMvpLabel: '🔴 Team Red Best Player (MVP if Red Wins)',
    blueKillsLabel: 'Blue Kills',
    redKillsLabel: 'Red Kills',
    matchDurationLabel: 'Duration (Optional)',
    matchDurationPlaceholder: 'e.g. 17:44',
    blueWonBtn: 'Team Blue Won',
    redWonBtn: 'Team Red Won',
    matchHistoryTitle: 'Recent Battle Results (Match History)',
    matchHistoryDesc:
      'Completed 5v5 games with Winner, Kill Score, Match MVP, KDA, and one-click Copy for Messenger GC.',
    copyResultBtn: 'Copy Battle Result',
    clearHistoryBtn: 'Clear History',
    emptyHistoryText:
      'No battle results recorded yet. Upload a screenshot or finish a 5v5 game above to log match results.',
    toastResultCopied: 'Battle Result copied! Ready to paste in Messenger GC.',
    toastHistoryDeleted: 'Deleted match result from history.',
    toastHistoryCleared: 'Cleared all match history records.',
    toastScanSuccess:
      'Battle Result scanned! Check auto-filled stats & click Confirm Winner.',
    toastScanError: 'Could not read screenshot. Please check the image or enter stats manually.',
    leaderboardTitle: 'NGD Scrim Leaderboard',
    leaderboardDesc:
      'Player standings based on Custom 5v5 Wins, MVPs, and Winrate (%).',
    searchIgnPlaceholder: 'Search player IGN...',
    sortWins: 'Wins',
    sortMvp: 'MVP',
    sortWr: 'Winrate %',
    sortGames: 'Matches',
    colPlayer: 'Player IGN',
    colRole: 'Role',
    colGames: 'Matches',
    colWL: 'Win - Loss',
    colMvp: 'MVP',
    colWinrate: 'Winrate',
    settingsTitle: 'System Settings',
    settingsDesc:
      'Customize the appearance theme (Light, Dark, or System) and interface language.',
    appearanceTitle: 'Appearance / Theme',
    appearanceDesc: 'Choose how NGD Scrim System looks on your device.',
    themeLight: 'Light',
    themeLightDesc: 'Clean, high-contrast daylight view',
    themeDark: 'Dark',
    themeDarkDesc: 'Signature NGD dark esports slate',
    themeSystem: 'System',
    themeSystemDesc: 'Automatically match your device settings',
    languageTitle: 'Language',
    languageDesc: 'Select your preferred language for all menus and buttons.',
    langEnglish: 'English',
    langEnglishDesc: 'Use English across all tabs, buttons, and labels',
    langTagalog: 'Tagalog',
    langTagalogDesc: 'Use Tagalog across all tabs, buttons, and labels',
    toastEnterIgn: 'Please enter an MLBB IGN first.',
    toastSlotsFull: 'Slots 1–20 are all full! Remove an entry first.',
    toastNext10Empty: 'No players listed in Next 10 Players (Slots 11–20).',
    toastPromoted:
      'Moved Next 10 Players (11–20) up to First 10 Playing Now (1–10)!',
    toastCopied: 'Copied to clipboard! Ready to paste in Messenger GC.',
    toastSwapped: 'Swapped the two selected players.',
    toastReset: 'Reset to default Scrim Warmup list.',
    accountTitle: 'Player Account (Google Sign-In)',
    accountDesc:
      'Sign in with Google to sync slots, 5v5 teams, and leaderboard across devices.',
    signInGoogleBtn: 'Sign in with Google',
    signOutBtn: 'Sign Out',
    signedInAs: 'Signed in as',
    adminTitle: 'Developer / Admin Controls',
    adminDesc:
      'Only the developer/admin can delete players or clear the Leaderboard. Unlock with your Admin PIN or Developer Google account.',
    adminUnlockedBadge: 'Developer Mode Active — You can delete players on the Leaderboard',
    adminPinPlaceholder: 'Enter Developer / Admin PIN...',
    adminUnlockBtn: 'Unlock Admin',
    adminLockBtn: 'Lock Admin Mode',
    adminWrongPin: 'Invalid Admin PIN.',
    adminUnlockedToast: 'Developer Mode unlocked! Delete controls enabled on Leaderboard.',
    adminLockedToast: 'Developer Mode locked.',
    colAction: 'Action',
    deletePlayerTitle: 'Delete player from Leaderboard',
    clearLeaderboardBtn: 'Clear All Players',
    confirmClearLeaderboardBtn: 'Confirm Delete All?',
    restoreDefaultsBtn: 'Restore Sample Players',
    emptyLeaderboard: 'No players on the Leaderboard yet. Finish a 5v5 match or add players to populate standings.',
    toastPlayerDeleted: 'Removed player from Leaderboard.',
    toastLeaderboardCleared: 'Cleared all players from Leaderboard.',
  },
  tl: {
    brandTitle: 'NGD Scrim System',
    navSlots: 'Mga Slots ng Lalaro (Games 1–5)',
    navSlotsShort: 'Player Slots',
    navMatch: '5v5 Kampihan',
    navMatchShort: '5v5 Laro',
    navStats: '📊 Game Stats at Posters',
    navStatsShort: 'Stats & Posters',
    navLeaderboard: 'Ranggo at Stats',
    navLeaderboardShort: 'Ranggo',
    navSettings: 'Settings',
    navSettingsShort: 'Settings',
    copyGcList: 'Kopyahin ang Listahan',
    copied: 'Nakopya na!',
    joinTitle: 'Sumali sa Custom 5v5 Scrim',
    joinSubtitle:
      'Ilagay ang iyong MLBB IGN at piliin ang Role mo (hal. Jungler, Mid/Gold, Multi) para makasali sa bakanteng slot.',
    pasteGcBtn: 'I-paste ang Listahan',
    resetBtn: 'I-reset ang Listahan',
    cancelBtn: 'Kanselahin',
    importBtn: 'I-import ang Listahan',
    playerIgnLabel: 'Pangalan sa MLBB (IGN)',
    playerIgnPlaceholder: 'I-type ang MLBB IGN (hal. Estranghero, joshy)...',
    mainRoleLabel: 'Main Role (Pangunahin)',
    secondRoleLabel: '2nd Role (Opsyonal)',
    noneOneRole: 'Wala (1 Role)',
    joinSubmitBtn: 'Sumali sa Slot',
    allSlotsTab: 'Lahat (1–20)',
    first10Tab: 'Unang 10',
    next10Tab: 'Sunod 10',
    game1Badge: 'UNANG LARO · MAGLALARO NGAYON',
    first10Title: 'Unang 10 Manlalaro (1–10)',
    game2Badge: 'IKALAWANG LARO · SUSUNOD NA Lalaro',
    next10Title: 'Susunod na 10 Manlalaro (11–20)',
    openSlotLabel: 'Bakante',
    joinSlotBtn: '+ Sumali',
    inlineIgnPlaceholder: 'Ilagay ang IGN...',
    inlineMainPrefix: 'Main:',
    inlineSecondNone: '2nd Role: Wala',
    inlineSecondPrefix: '2nd Role:',
    inlineSaveBtn: 'I-save',
    removeSlotTitle: 'Alisin ang manlalaro sa slot',
    startNoShuffleBtn: 'Simulan (Walang Shuffle: 1–5 vs 6–10)',
    keepOrderBtn: 'Walang Shuffle (1–5 vs 6–10)',
    shuffleFirst10Btn: 'I-shuffle ang 5v5 Kampihan (1–10)',
    copyShortBtn: 'Kopyahin',
    promoteNext10Btn: 'Ilipat ang Susunod na 10 ➔ Unang 10',
    seriesFormatLabel: 'Format ng Laro:',
    formatBo1: '1 Game',
    formatBo3: 'Best of 3',
    formatBo5: 'Best of 5',
    seriesScoreLabel: 'Series Score',
    resetSeriesBtn: 'I-reset ang Score',
    slotTeamBlueHint: 'Slots 1–5 · Team Blue (kapag Walang Shuffle)',
    slotTeamRedHint: 'Slots 6–10 · Team Red (kapag Walang Shuffle)',
    custom5v5Badge: 'CUSTOM 5V5 KUWARTO NG LARO',
    custom5v5Title: 'Team Blue laban sa Team Red',
    custom5v5Desc:
      'Kung masyadong malakas ang isang koponan, pindutin ang I-shuffle Ulit o gamitin ang Palitan (Swap).',
    autoBalanceBtn: 'Pantayin ang Lakas (WR)',
    shuffleAgainBtn: 'I-shuffle Ulit ang Kampihan',
    copy5v5Btn: 'Kopyahin ang 5v5',
    exportLineupPosterBtn: 'I-export ang Lineup Poster',
    viewModeRoster: 'Koponan (Blue vs Red)',
    viewModeMatchup: 'Harapan sa Lane (Vs Mode)',
    fairnessBalanced: 'Patas at Balanseng Laban',
    fairnessImbalanced: 'Medyo Dehado ang Isang Team',
    autoBalanceCurrentBtn: 'Pantayin ang Lakas (Equal WR)',
    swapLaneBtn: 'Palitan sa Lane',
    youBadge: 'IKAW',
    yourRoleInMatch: 'Kasama ka sa laban na ito',
    claimIgnTitle: 'I-link ang Aking MLBB IGN',
    claimIgnDesc: 'Ikonekta ang iyong Google/Squad account sa iyong player profile para sa 1-click palista at personal stats.',
    quickJoinAsMyIgn: 'Mabilis na Palista bilang',
    linkMyIgnBtn: 'I-link ang IGN Ko',
    teamBlueTitle: '🔵 Team Blue (Unang Pili)',
    teamRedTitle: '🔴 Team Red (Pangalawang Pili)',
    avgWrLabel: 'Average na Winrate',
    assignedLabel: 'Naka-assign na Lane',
    swapBtn: 'Palitan',
    selectTargetBtn: 'Pumili ng Kapalit...',
    finishMatchTitle: 'Battle Result at Screenshot Auto-Reader',
    finishMatchDesc:
      'Pinakamaganda: I-upload yung unang tab (KDA / Equipment screen — hindi yung Data) para kita ang KDA at MVP Rating, o kaya i-select pareho (KDA + Data).',
    uploadScreenshotBtn: 'I-upload ang Battle Result (KDA / Data)',
    scanningScreenshotText: 'Binabasa ang MLBB Battle Result...',
    scannedReadyBadge: 'Nabasa na ang Screenshot — Auto-Filled na ang Stats at Players!',
    confirmScannedWinnerBtn: 'I-save ang Resulta Mula sa Screenshot',
    blueMvpLabel: '🔵 Team Blue Best Player (MVP kapag Blue Nanalo)',
    redMvpLabel: '🔴 Team Red Best Player (MVP kapag Red Nanalo)',
    blueKillsLabel: 'Blue Kills',
    redKillsLabel: 'Red Kills',
    matchDurationLabel: 'Oras ng Laro (Opsyonal)',
    matchDurationPlaceholder: 'hal. 17:44',
    blueWonBtn: 'Nanalo ang Team Blue',
    redWonBtn: 'Nanalo ang Team Red',
    matchHistoryTitle: 'Mga Natapos na Laro (Battle Results History)',
    matchHistoryDesc:
      'Listahan ng mga natapos na 5v5 games kasama ang Winner, Kill Score, MVP, KDA, at Copy Result para sa GC.',
    copyResultBtn: 'Kopyahin ang Resulta',
    clearHistoryBtn: 'Burahin ang History',
    emptyHistoryText:
      'Wala pang naitalang Battle Result. Mag-upload ng screenshot o pumili ng nanalo sa itaas pagkatapos ng laro.',
    toastResultCopied:
      'Nakopya na ang Battle Result! Pwede nang i-paste sa Messenger GC.',
    toastHistoryDeleted: 'Nabura na ang match result.',
    toastHistoryCleared: 'Nabura na lahat ng match history.',
    toastScanSuccess:
      'Nabasa na ang Battle Result screenshot! Pindutin ang Save Result para ma-update ang Leaderboard.',
    toastScanError: 'Hindi nabasa ang screenshot. Pakisubukan ulit o ilagay nang manual.',
    leaderboardTitle: 'NGD Scrim Ranggo at Estadistika',
    leaderboardDesc:
      'Listahan at ranggo ng mga manlalaro base sa Panalo, MVP, at Winrate (%) sa Custom 5v5.',
    searchIgnPlaceholder: 'Hanapin ang IGN ng manlalaro...',
    sortWins: 'Panalo',
    sortMvp: 'MVP',
    sortWr: 'Winrate %',
    sortGames: 'Laro',
    colPlayer: 'Manlalaro (IGN)',
    colRole: 'Role',
    colGames: 'Laro',
    colWL: 'Panalo - Talo',
    colMvp: 'MVP',
    colWinrate: 'Winrate',
    settingsTitle: 'Settings ng System',
    settingsDesc:
      'Baguhin ang kulay ng tema (Light, Dark, o System) at ang wika ng buong system (English o Tagalog).',
    appearanceTitle: 'Tema at Kulay (Appearance)',
    appearanceDesc: 'Piliin kung paano ipapakita ang kulay ng NGD Scrim System.',
    themeLight: 'Maliwanag (Light)',
    themeLightDesc: 'Malinis at maliwanag na background',
    themeDark: 'Madilim (Dark)',
    themeDarkDesc: 'Dark esports gaming theme ng NGD',
    themeSystem: 'Device (System)',
    themeSystemDesc: 'Sumusunod sa setting ng iyong phone o PC',
    languageTitle: 'Wika (Language)',
    languageDesc: 'Piliin ang wika para sa lahat ng buttons at salita sa system.',
    langEnglish: 'English',
    langEnglishDesc: 'Gamitin ang wikang Ingles sa buong system',
    langTagalog: 'Tagalog',
    langTagalogDesc: 'Gamitin ang wikang Tagalog sa buong system',
    toastEnterIgn: 'Mag-input muna ng iyong MLBB IGN.',
    toastSlotsFull: 'Puno na ang Slots 1–20! Mag-alis muna ng bakante.',
    toastNext10Empty: 'Walang nakalista sa Susunod na 10 Manlalaro (Slots 11–20).',
    toastPromoted:
      'Inilipat na ang Susunod na 10 Manlalaro (11–20) papuntang Unang 10 (1–10)!',
    toastCopied: 'Nakopya na! Pwede nang i-paste sa Messenger GC.',
    toastSwapped: 'Naipagpalit na ang dalawang manlalaro.',
    toastReset: 'Na-reset na sa default na listahan.',
    accountTitle: 'Account ng Manlalaro (Google Sign-In)',
    accountDesc:
      'Mag-sign in gamit ang Google para ma-sync ang listahan ng lalaro at ranggo sa lahat ng device.',
    signInGoogleBtn: 'Mag-Sign In gamit ang Google',
    signOutBtn: 'Mag-Sign Out',
    signedInAs: 'Naka-sign in bilang',
    adminTitle: 'Developer / Admin Controls',
    adminDesc:
      'Ikaw lang bilang developer/admin ang pwedeng magbura ng players sa Leaderboard. Buksan gamit ang Admin PIN o Developer Google account.',
    adminUnlockedBadge: 'Developer Mode Active — Pwede ka nang magbura sa Leaderboard',
    adminPinPlaceholder: 'Ilagay ang Developer / Admin PIN...',
    adminUnlockBtn: 'Buksan ang Admin',
    adminLockBtn: 'I-lock ang Admin Mode',
    adminWrongPin: 'Mali ang Admin PIN.',
    adminUnlockedToast: 'Bukas na ang Developer Mode! Pwede ka nang magbura sa Leaderboard.',
    adminLockedToast: 'Naka-lock na ulit ang Developer Mode.',
    colAction: 'Aksyon',
    deletePlayerTitle: 'Burahin ang manlalaro sa Leaderboard',
    clearLeaderboardBtn: 'Burahin Lahat ng Players',
    confirmClearLeaderboardBtn: 'Sigurado? Burahin Lahat',
    restoreDefaultsBtn: 'Ibalik ang Sample Players',
    emptyLeaderboard: 'Wala pang manlalaro sa Leaderboard. Magtapos ng 5v5 match para magka-record.',
    toastPlayerDeleted: 'Nabura na ang manlalaro sa Leaderboard.',
    toastLeaderboardCleared: 'Nabura na lahat ng manlalaro sa Leaderboard.',
  },
};

function dedupePlayers(list: PlayerProfile[]): PlayerProfile[] {
  const seenIgns = new Set<string>();
  const seenIds = new Set<string>();
  const result: PlayerProfile[] = [];
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    if (!p || !p.ign) continue;
    const normIgn = p.ign.trim().toLowerCase();
    if (seenIgns.has(normIgn)) continue;
    seenIgns.add(normIgn);
    let safeId = p.id || `ngd-p-${i + 1}`;
    if (seenIds.has(safeId)) {
      safeId = `${safeId}-${i + 1}`;
    }
    seenIds.add(safeId);
    result.push({ ...p, id: safeId });
  }
  return result;
}

function dedupeMatchHistory(
  records: MatchHistoryRecord[]
): MatchHistoryRecord[] {
  const seenSignatures = new Set<string>();
  const seenIds = new Set<string>();
  const result: MatchHistoryRecord[] = [];
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    if (!r) continue;
    const sig = `${r.id}|${r.completedAt}|${r.winner}|${r.mvpIgn}`;
    if (seenSignatures.has(sig)) continue;
    seenSignatures.add(sig);
    let safeId = r.id || `NGD-M${String(i + 1).padStart(2, '0')}`;
    if (seenIds.has(safeId)) {
      safeId = `${safeId}-${i + 1}`;
    }
    seenIds.add(safeId);
    result.push({ ...r, id: safeId });
  }
  return result;
}

export default function App() {
  const {
    user,
    signingIn,
    authError,
    authErrorCode,
    linkedIgn,
    linkMyIgn,
    unlinkMyIgn,
    signInWithGoogle,
    signInWithSquadAccount,
    signOut,
    getFreshToken,
  } = useAuth();
  const hasLoadedInitialCloudRef = useRef(false);
  const hasLoadedSupabaseRef = useRef(false);
  const [matchViewMode, setMatchViewMode] = useState<'roster' | 'matchup'>('roster');
  const [lineupPosterModalOpen, setLineupPosterModalOpen] = useState(false);
  const [claimIgnModalOpen, setClaimIgnModalOpen] = useState(false);
  const [claimIgnInput, setClaimIgnInput] = useState('');
  const [players, setPlayers] = useState<PlayerProfile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.players);
      return saved ? dedupePlayers(JSON.parse(saved)) : INITIAL_PLAYERS;
    } catch {
      return INITIAL_PLAYERS;
    }
  });

  const [slots, setSlots] = useState<(ScrimSlot | null)[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.slots);
      return saved ? JSON.parse(saved) : INITIAL_SLOTS;
    } catch {
      return INITIAL_SLOTS;
    }
  });

  const [queue] = useState<QueuedPlayer[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.queue);
      return saved ? JSON.parse(saved) : INITIAL_QUEUE;
    } catch {
      return INITIAL_QUEUE;
    }
  });

  const [liveMatch, setLiveMatch] = useState<LiveMatchState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.liveMatch);
      return saved ? JSON.parse(saved) : INITIAL_LIVE_MATCH;
    } catch {
      return INITIAL_LIVE_MATCH;
    }
  });

  const [matchHistory, setMatchHistory] = useState<MatchHistoryRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.history);
      return saved
        ? dedupeMatchHistory(JSON.parse(saved))
        : INITIAL_MATCH_HISTORY;
    } catch {
      return INITIAL_MATCH_HISTORY;
    }
  });

  // Appearance (Light / Dark / System) & Language (English / Tagalog)
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.theme);
      return saved === 'light' || saved === 'dark' || saved === 'system'
        ? saved
        : 'dark';
    } catch {
      return 'dark';
    }
  });

  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.lang);
      return saved === 'en' || saved === 'tl' ? saved : 'tl';
    } catch {
      return 'tl';
    }
  });

  const [adminPinUnlocked, setAdminPinUnlocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.adminUnlocked) === 'true';
    } catch {
      return false;
    }
  });
  const [adminPinInput, setAdminPinInput] = useState('');
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [squadSignInName, setSquadSignInName] = useState('');
  const [squadSignInEmail, setSquadSignInEmail] = useState('');
  const [squadSignInPin, setSquadSignInPin] = useState('');

  const isAdmin = useMemo(() => {
    const emailMatch =
      user?.email &&
      ADMIN_EMAILS.includes(user.email.trim().toLowerCase());
    return Boolean(emailMatch || adminPinUnlocked);
  }, [user, adminPinUnlocked]);

  const t = TRANSLATIONS[language];

  // Apply Light / Dark / System class on <html>
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const isDark =
        themeMode === 'dark' ||
        (themeMode === 'system' && mediaQuery.matches);
      root.classList.toggle('dark', isDark);
    };

    applyTheme();
    mediaQuery.addEventListener('change', applyTheme);
    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, [themeMode]);

  // Fetch initial state from Supabase when VITE_SUPABASE_ANON_KEY is configured
  useEffect(() => {
    if (!supabaseClient) return;
    let cancelled = false;

    (async () => {
      try {
        const remote = await fetchFromSupabase();
        if (!remote || cancelled) return;

        if (remote.hasPlayers || remote.liveMatch) {
          setPlayers(dedupePlayers(remote.players));
        }
        if (remote.hasSlots || remote.hasPlayers || remote.liveMatch) {
          setSlots(remote.slots);
        }
        if (remote.liveMatch) {
          setLiveMatch(remote.liveMatch);
        }
        if (remote.hasHistory) {
          setMatchHistory(dedupeMatchHistory(remote.matchHistory));
        }
        if (!remote.hasPlayers && !remote.hasSlots && !remote.liveMatch) {
          await syncToSupabase({
            players: INITIAL_PLAYERS,
            slots: INITIAL_SLOTS,
            liveMatch: INITIAL_LIVE_MATCH,
          });
        }
        hasLoadedSupabaseRef.current = true;
      } catch {
        hasLoadedSupabaseRef.current = true;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Sync changes to Supabase when VITE_SUPABASE_ANON_KEY is configured
  useEffect(() => {
    if (!supabaseClient || !hasLoadedSupabaseRef.current) return;

    const timer = setTimeout(() => {
      syncToSupabase({ players, slots, liveMatch }).catch(() => {});
    }, 400);

    return () => clearTimeout(timer);
  }, [players, slots, liveMatch]);

  // Fetch initial state from PostgreSQL when authenticated
  useEffect(() => {
    if (!user) {
      hasLoadedInitialCloudRef.current = false;
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const token = await getFreshToken();
        if (!token || cancelled) return;
        const res = await fetch('/api/scrim/state', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (Array.isArray(data.players)) {
          setPlayers(dedupePlayers(data.players));
        }
        if (Array.isArray(data.slots) && data.slots.length === 20) {
          setSlots(data.slots);
        }
        if (data.liveMatch) {
          setLiveMatch(data.liveMatch);
        }
        if (Array.isArray(data.matchHistory)) {
          setMatchHistory(dedupeMatchHistory(data.matchHistory));
        }
        hasLoadedInitialCloudRef.current = true;
      } catch {
        // Fallback to local state silently
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, getFreshToken]);

  // Persist changes to PostgreSQL when authenticated
  useEffect(() => {
    if (!user || !hasLoadedInitialCloudRef.current) return;

    const timer = setTimeout(async () => {
      try {
        const token = await getFreshToken();
        if (!token) return;
        await fetch('/api/scrim/state', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            players,
            slots,
            liveMatch,
          }),
        });
      } catch {
        // Ignore transient sync error
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [players, slots, liveMatch, user, getFreshToken]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.players, JSON.stringify(players));
      localStorage.setItem(STORAGE_KEYS.slots, JSON.stringify(slots));
      localStorage.setItem(STORAGE_KEYS.queue, JSON.stringify(queue));
      localStorage.setItem(STORAGE_KEYS.liveMatch, JSON.stringify(liveMatch));
      localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(matchHistory));
      localStorage.setItem(STORAGE_KEYS.theme, themeMode);
      localStorage.setItem(STORAGE_KEYS.lang, language);
    } catch {
      // Ignore storage errors
    }
  }, [players, slots, queue, liveMatch, matchHistory, themeMode, language]);

  // Navigation & UI State
  const [activeTab, setActiveTab] = useState<ActiveTab>('queue');
  const [activeSetCount, setActiveSetCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.setCount);
      return saved ? Math.max(1, Math.min(5, parseInt(saved, 10))) : 1;
    } catch {
      return 1;
    }
  });
  const [activeSetTab, setActiveSetTab] = useState<'all' | number>('all');
  const [editingMatchRecord, setEditingMatchRecord] = useState<MatchHistoryRecord | null>(null);
  const [showAdminPinModal, setShowAdminPinModal] = useState(false);
  const [adminModalPinInput, setAdminModalPinInput] = useState('');
  const [adminModalError, setAdminModalError] = useState(false);
  const [pendingEditMatch, setPendingEditMatch] = useState<MatchHistoryRecord | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.setCount, String(activeSetCount));
    } catch {
      // Ignore storage errors
    }
  }, [activeSetCount]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Simple Palist Form State
  const [palistIgn, setPalistIgn] = useState('');
  const [palistRole, setPalistRole] = useState<MlbbRole>('Jungle');
  const [palistSecondRole, setPalistSecondRole] = useState<MlbbRole | 'NONE'>(
    'NONE'
  );

  // Inline Slot Edit State
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [inlineSlotIgn, setInlineSlotIgn] = useState('');
  const [inlineSlotRole, setInlineSlotRole] = useState<MlbbRole>('Jungle');
  const [inlineSlotSecRole, setInlineSlotSecRole] = useState<
    MlbbRole | 'NONE'
  >('NONE');

  // Paste GC List Drawer State
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [pasteRawText, setPasteRawText] = useState(
    `Scrim warmup\n\n1. Estranghero - Jungler/Roam\n2. Akira - Mid/Gold\n3. Takeshi - Exp/gold\n4. Sion - Exp\n5. mi amor - Multi\n6. king aha - Roam\n7. aviona - Mid/Gold\n8. Favian - Mid\n9. joshy - Jungler/Roam\n10. whis - gold/roam`
  );

  // 5v5 Shuffle & Match State
  const [shuffleCounter, setShuffleCounter] = useState(1);
  const [swapSelection, setSwapSelection] = useState<{
    team: 'Blue' | 'Red';
    index: number;
  } | null>(null);
  const [blueStarIgn, setBlueStarIgn] = useState<string>('');
  const [redStarIgn, setRedStarIgn] = useState<string>('');
  const [customBlueMvp, setCustomBlueMvp] = useState(false);
  const [customRedMvp, setCustomRedMvp] = useState(false);
  const [blueKillsInput, setBlueKillsInput] = useState<string>('');
  const [redKillsInput, setRedKillsInput] = useState<string>('');
  const [matchDurationInput, setMatchDurationInput] = useState<string>('');
  const [showLeaderboardSummaryModal, setShowLeaderboardSummaryModal] = useState(false);
  const [showManualStatsEditor, setShowManualStatsEditor] = useState(false);

  useEffect(() => {
    if (!blueStarIgn && liveMatch.teamBlue[0]) {
      setBlueStarIgn(liveMatch.teamBlue[0].ign);
    }
    if (!redStarIgn && liveMatch.teamRed[0]) {
      setRedStarIgn(liveMatch.teamRed[0].ign);
    }
  }, [liveMatch.teamBlue, liveMatch.teamRed]);

  // Leaderboard State
  const [leaderboardSort, setLeaderboardSort] =
    useState<LeaderboardSort>('wins');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedFlag, setCopiedFlag] = useState(false);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 2800);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const getCurrentTimeLabel = () => {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  };

  const ensurePlayerInRoster = (
    ign: string,
    primaryRole: MlbbRole,
    secondaryRole?: MlbbRole
  ) => {
    const trimmed = ign.trim();
    if (!trimmed) return;
    const exists = players.some(
      (p) => p.ign.toLowerCase() === trimmed.toLowerCase()
    );
    if (!exists) {
      const sec = secondaryRole || primaryRole;
      const newProfile: PlayerProfile = {
        id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        ign: trimmed,
        squadTag: 'NGD',
        primaryRole,
        secondaryRole: sec,
        roleLabel: formatRolePairText(primaryRole, secondaryRole),
        wins: 0,
        losses: 0,
        mvpCount: 0,
        streak: 0,
        roleCounts: {
          Jungle: primaryRole === 'Jungle' ? 1 : 0,
          'EXP Lane': primaryRole === 'EXP Lane' ? 1 : 0,
          'Mid Lane': primaryRole === 'Mid Lane' ? 1 : 0,
          'Gold Lane': primaryRole === 'Gold Lane' ? 1 : 0,
          Roamer: primaryRole === 'Roamer' ? 1 : 0,
          'Flex Role': primaryRole === 'Flex Role' ? 1 : 0,
        },
        recentForm: [],
        signatureHeroes: [],
        mythicStars: 50,
      };
      setPlayers((prev) => [...prev, newProfile]);
    }
  };

  // --- PALIST / JOIN SLOT HANDLERS ---

  const handleJoinPalist = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedIgn = palistIgn.trim();
    if (!trimmedIgn) {
      triggerToast(t.toastEnterIgn);
      return;
    }

    const secRole =
      palistSecondRole === 'NONE' || palistRole === 'Flex Role'
        ? undefined
        : palistSecondRole;
    const roleLabel = formatRolePairText(palistRole, secRole);

    ensurePlayerInRoster(trimmedIgn, palistRole, secRole);

    const openIdx = slots.findIndex((s) => s === null);
    if (openIdx !== -1) {
      const slotNum = openIdx + 1;
      const neededSets = Math.min(5, Math.ceil(slotNum / 10));
      if (neededSets > activeSetCount) {
        setActiveSetCount(neededSets);
      }
      setSlots((prev) => {
        const next = [...prev];
        next[openIdx] = {
          slotNumber: slotNum,
          ign: trimmedIgn,
          role: palistRole,
          secondaryRole: secRole,
          roleLabel,
          isReady: true,
          assignedAt: getCurrentTimeLabel(),
        };
        return next;
      });
      setPalistIgn('');
      triggerToast(`#${slotNum}. ${trimmedIgn} - ${roleLabel}`);
      return;
    }

    triggerToast(t.toastSlotsFull);
  };

  const handleJoinSpecificSlot = (slotIdx: number) => {
    const trimmedIgn = palistIgn.trim();
    if (trimmedIgn) {
      const secRole =
        palistSecondRole === 'NONE' || palistRole === 'Flex Role'
          ? undefined
          : palistSecondRole;
      const roleLabel = formatRolePairText(palistRole, secRole);
      ensurePlayerInRoster(trimmedIgn, palistRole, secRole);

      const neededSets = Math.min(5, Math.ceil((slotIdx + 1) / 10));
      if (neededSets > activeSetCount) {
        setActiveSetCount(neededSets);
      }

      setSlots((prev) => {
        const next = [...prev];
        next[slotIdx] = {
          slotNumber: slotIdx + 1,
          ign: trimmedIgn,
          role: palistRole,
          secondaryRole: secRole,
          roleLabel,
          isReady: true,
          assignedAt: getCurrentTimeLabel(),
        };
        return next;
      });
      setPalistIgn('');
      triggerToast(`Slot #${slotIdx + 1}: ${trimmedIgn} - ${roleLabel}`);
    } else {
      setEditingSlotIndex(slotIdx);
      setInlineSlotIgn('');
      setInlineSlotRole(palistRole);
      setInlineSlotSecRole(palistSecondRole);
    }
  };

  const handleSaveInlineSlot = (slotIdx: number) => {
    const trimmed = inlineSlotIgn.trim();
    if (!trimmed) {
      setEditingSlotIndex(null);
      return;
    }
    const sec =
      inlineSlotSecRole === 'NONE' || inlineSlotRole === 'Flex Role'
        ? undefined
        : inlineSlotSecRole;
    const roleLabel = formatRolePairText(inlineSlotRole, sec);
    ensurePlayerInRoster(trimmed, inlineSlotRole, sec);

    setSlots((prev) => {
      const next = [...prev];
      next[slotIdx] = {
        slotNumber: slotIdx + 1,
        ign: trimmed,
        role: inlineSlotRole,
        secondaryRole: sec,
        roleLabel,
        isReady: true,
        assignedAt: getCurrentTimeLabel(),
      };
      return next;
    });
    setEditingSlotIndex(null);
    setInlineSlotIgn('');
    triggerToast(`Slot #${slotIdx + 1}: ${trimmed} - ${roleLabel}`);
  };

  const handleRemoveSlot = (slotIdx: number) => {
    const current = slots[slotIdx];
    if (!current) return;
    setSlots((prev) => {
      const next = [...prev];
      next[slotIdx] = null;
      return next;
    });
    triggerToast(`Removed ${current.ign} (#${slotIdx + 1}).`);
  };

  const handlePromoteNext10ToFirst10 = () => {
    const next10Players = slots.slice(10, 20).filter((s) => s !== null);
    if (next10Players.length === 0) {
      triggerToast(t.toastNext10Empty);
      return;
    }

    setSlots((prev) => {
      const updated: (ScrimSlot | null)[] = Array.from(
        { length: 20 },
        () => null
      );
      let writeIdx = 0;
      for (let i = 10; i < 20; i++) {
        const p = prev[i];
        if (p) {
          updated[writeIdx] = {
            ...p,
            slotNumber: writeIdx + 1,
          };
          writeIdx++;
        }
      }
      return updated;
    });

    triggerToast(t.toastPromoted);
  };

  const handleAutoFillSlotsFromText = (rawText: string, notify = true) => {
    if (!rawText || !rawText.trim()) return false;
    const parsed = parseTraditionalGcText(rawText, players);
    if (parsed.length === 0) {
      if (notify) {
        triggerToast(
          language === 'tl'
            ? 'Format: "1. xTriggered" o "NGD SCRIM 5v5 LIST: 1. xTriggered..."'
            : 'Format: "1. xTriggered" or "LIST: 1. xTriggered..."'
        );
      }
      return false;
    }

    // Auto-detect series format if present e.g. "BO3 DRAFT", "BO5", "BO1"
    const detectedSeries = detectSeriesFormatFromText(rawText);
    if (detectedSeries) {
      setLiveMatch((prev) => ({
        ...prev,
        seriesFormat: detectedSeries,
      }));
    }

    // Auto-detect room name e.g. NGD SCRIM 5v5
    if (rawText.toUpperCase().includes('NGD SCRIM 5V5')) {
      setLiveMatch((prev) => ({
        ...prev,
        roomName: 'NGD SCRIM 5v5',
      }));
    }

    const maxSlotNum = Math.max(...parsed.map((p) => p.slotNum), 0);
    const neededSets = Math.min(5, Math.max(activeSetCount, Math.ceil(maxSlotNum / 10)));
    if (neededSets > activeSetCount) {
      setActiveSetCount(neededSets);
    }

    const timeLabel = getCurrentTimeLabel();
    setSlots((prev) => {
      const next = [...prev];
      for (const entry of parsed) {
        const idx = entry.slotNum - 1;
        if (idx >= 0 && idx < MAX_SLOTS) {
          next[idx] = {
            slotNumber: entry.slotNum,
            ign: entry.ign,
            role: entry.role,
            secondaryRole: entry.secondaryRole,
            roleLabel: entry.roleLabel,
            isReady: true,
            assignedAt: timeLabel,
          };
        }
      }
      return next;
    });

    for (const entry of parsed) {
      ensurePlayerInRoster(entry.ign, entry.role, entry.secondaryRole);
    }

    setShowPasteBox(false);
    if (notify) {
      triggerToast(
        language === 'tl'
          ? `⚡ Na-auto fill agad ang ${parsed.length} players sa mga slots! (Slots 1–${parsed.length})`
          : `⚡ Auto-filled ${parsed.length} players into slots! (Slots 1–${parsed.length})`
      );
    }
    return true;
  };

  const handleImportGcText = () => {
    handleAutoFillSlotsFromText(pasteRawText, true);
  };

  const handleClipboardQuickPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setPasteRawText(text);
        const ok = handleAutoFillSlotsFromText(text, true);
        if (!ok) {
          setShowPasteBox(true);
        }
      } else {
        setShowPasteBox(true);
      }
    } catch {
      setShowPasteBox(true);
      triggerToast(
        language === 'tl'
          ? 'Paki-paste ang listahan sa text box gamit ang Ctrl+V'
          : 'Please paste the list into the text box using Ctrl+V'
      );
    }
  };

  // Global paste handler: When the user presses Ctrl+V anywhere on the page,
  // automatically detect the 5v5 scrim list and immediately fill the slots!
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const activeEl = document.activeElement;
      const tagName = (activeEl?.tagName || '').toLowerCase();
      if (
        tagName === 'input' ||
        tagName === 'textarea' ||
        (activeEl as HTMLElement)?.isContentEditable
      ) {
        return;
      }
      const text = e.clipboardData?.getData('text');
      if (text && text.trim()) {
        const handled = handleAutoFillSlotsFromText(text, true);
        if (handled) {
          e.preventDefault();
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [players, language]);

  // --- SHUFFLE, DIRECT LINEUP (NO SHUFFLE) & SERIES FORMAT ---

  const handleSetSeriesFormat = (format: 'BO1' | 'BO3' | 'BO5') => {
    setLiveMatch((prev) => ({
      ...prev,
      seriesFormat: format,
      blueSeriesWins: 0,
      redSeriesWins: 0,
    }));
  };

  const handleResetSeriesScore = () => {
    setLiveMatch((prev) => ({
      ...prev,
      blueSeriesWins: 0,
      redSeriesWins: 0,
    }));
  };

  const getSetFilledCount = (setIdx: number) => {
    return slots.slice(setIdx * 10, setIdx * 10 + 10).filter((s) => s !== null).length;
  };

  const handlePromoteSetToGame1 = (fromSetIdx: number) => {
    const fromStart = fromSetIdx * 10;
    setSlots((prev) => {
      const updated = [...prev];
      for (let i = 0; i < 10; i++) {
        const source = updated[fromStart + i];
        if (source) {
          updated[i] = {
            ...source,
            slotNumber: i + 1,
          };
        } else {
          updated[i] = null;
        }
        updated[fromStart + i] = null;
      }
      return updated;
    });
    triggerToast(
      language === 'tl'
        ? `⚡ Na-promote ang Game ${fromSetIdx + 1} sa Game 1 (Playing Now)!`
        : `⚡ Promoted Game ${fromSetIdx + 1} to Game 1 (Playing Now)!`
    );
  };

  const handleClearSingleSet = (setIdx: number) => {
    const start = setIdx * 10;
    setSlots((prev) => {
      const updated = [...prev];
      for (let i = start; i < start + 10; i++) {
        updated[i] = null;
      }
      return updated;
    });
    triggerToast(`Na-clear ang Game ${setIdx + 1} (Slots ${start + 1}–${start + 10}).`);
  };

  const handleCopySingleGameSet = async (setIdx: number) => {
    const setNum = setIdx + 1;
    const start = setIdx * 10;
    const lines = [`NGD SCRIM 5v5 — GAME ${setNum} (Slots ${start + 1}–${start + 10})`, ''];
    for (let i = start; i < start + 10; i++) {
      const slot = slots[i];
      if (slot) {
        lines.push(`${i + 1}. ${slot.ign} - ${slot.roleLabel}`);
      } else {
        lines.push(`${i + 1}. [OPEN SLOT]`);
      }
    }
    const text = lines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      triggerToast(
        language === 'tl'
          ? `Nakopya ang Game ${setNum} para sa GC!`
          : `Copied Game ${setNum} for GC!`
      );
    } catch {
      // fallback
    }
  };

  const handleStartDirectLineup5v5 = (
    poolSource: 'batch1' | 'batch2' | number = 1,
    goToMatchTab = true
  ) => {
    const setNumber = typeof poolSource === 'number' ? poolSource : poolSource === 'batch1' ? 1 : 2;
    const direct = buildDirectLineup5v5(poolSource, slots, players);
    const startSlot = (setNumber - 1) * 10 + 1;
    const endSlot = (setNumber - 1) * 10 + 10;
    const midSlot = (setNumber - 1) * 10 + 5;

    setLiveMatch((prev) => ({
      ...prev,
      matchId: `CUSTOM-5V5-${String(matchHistory.length + 1).padStart(2, '0')}`,
      roomName: `Custom 5v5 · Game ${setNumber} (${startSlot}–${midSlot} vs ${midSlot + 1}–${endSlot})`,
      startedAt: getCurrentTimeLabel(),
      teamBlue: direct.teamBlue,
      teamRed: direct.teamRed,
      mvpIgn: direct.teamBlue[0]?.ign || 'joshy',
      shuffleNote: direct.sourceSummary,
      blueSeriesWins: 0,
      redSeriesWins: 0,
    }));

    setSwapSelection(null);
    if (goToMatchTab) {
      setActiveTab('match');
    }
    triggerToast(
      `Lineup Ready: Game ${setNumber} Slots ${startSlot}–${midSlot} (Blue) vs ${midSlot + 1}–${endSlot} (Red)`
    );
  };

  const handleShuffle5v5 = (
    poolSource: 'batch1' | 'batch2' | number = 1,
    reRoll = false,
    goToMatchTab = false
  ) => {
    const nextSeed = reRoll ? shuffleCounter + 1 : 1;
    setShuffleCounter(nextSeed);

    const setNumber = typeof poolSource === 'number' ? poolSource : poolSource === 'batch1' ? 1 : 2;
    const balanced = autoBalance5v5(
      poolSource,
      slots,
      queue,
      players,
      nextSeed
    );

    setLiveMatch((prev) => ({
      ...prev,
      matchId: `CUSTOM-5V5-${String(matchHistory.length + 1).padStart(2, '0')}`,
      roomName: `Custom 5v5 · Game ${setNumber} (Slots ${(setNumber - 1) * 10 + 1}–${setNumber * 10})`,
      startedAt: getCurrentTimeLabel(),
      teamBlue: balanced.teamBlue,
      teamRed: balanced.teamRed,
      mvpIgn: balanced.teamBlue[0]?.ign || 'joshy',
      shuffleNote: reRoll
        ? `Shuffled Game ${setNumber} Option #${nextSeed} · Blue ${balanced.blueAvgWr}% vs Red ${balanced.redAvgWr}%`
        : `Game ${setNumber} Balanced by Role & WR · Blue ${balanced.blueAvgWr}% vs Red ${balanced.redAvgWr}%`,
      blueSeriesWins: goToMatchTab ? 0 : prev.blueSeriesWins || 0,
      redSeriesWins: goToMatchTab ? 0 : prev.redSeriesWins || 0,
    }));

    setSwapSelection(null);
    if (goToMatchTab) {
      setActiveTab('match');
    }
    triggerToast(
      `Game ${setNumber} 5v5 Ready: Blue (${balanced.blueAvgWr}% WR) vs Red (${balanced.redAvgWr}% WR)`
    );
  };

  const handleCopyGcText = async (
    mode: 'warmup' | 'palist' | 'match' = 'warmup'
  ) => {
    const textToCopy = formatGcText(slots, queue, liveMatch, mode, activeSetCount);
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedFlag(true);
      setTimeout(() => setCopiedFlag(false), 2000);
      triggerToast(t.toastCopied);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = textToCopy;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedFlag(true);
      setTimeout(() => setCopiedFlag(false), 2000);
      triggerToast(t.toastCopied);
    }
  };

  const handleOpenEditMatchStats = (record: MatchHistoryRecord) => {
    if (isAdmin) {
      setEditingMatchRecord(record);
    } else {
      setPendingEditMatch(record);
      setAdminModalPinInput('');
      setAdminModalError(false);
      setShowAdminPinModal(true);
    }
  };

  const handleVerifyAdminPinForEdit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isValidAdminPin(adminModalPinInput)) {
      setAdminPinUnlocked(true);
      try {
        localStorage.setItem(STORAGE_KEYS.adminUnlocked, 'true');
      } catch {
        // ignore storage error
      }
      setShowAdminPinModal(false);
      setAdminModalError(false);
      triggerToast(
        language === 'tl'
          ? '🔓 Naka-unlock na ang Developer Mode! Binuksan ang Match Stats Editor.'
          : '🔓 Admin Mode unlocked! Opened Match Stats Editor.'
      );
      if (pendingEditMatch) {
        setEditingMatchRecord(pendingEditMatch);
        setPendingEditMatch(null);
      }
    } else {
      setAdminModalError(true);
      triggerToast(t.adminWrongPin);
    }
  };

  const handleSaveEditedMatchRecord = (updated: MatchHistoryRecord) => {
    if (!isAdmin) return;
    const oldRecord = matchHistory.find((m) => m.id === updated.id);

    // If winner or MVP changed, automatically sync squad leaderboard stats
    if (oldRecord) {
      const winnerChanged = oldRecord.winner !== updated.winner;
      const mvpChanged =
        (oldRecord.mvpIgn || '').toLowerCase() !== (updated.mvpIgn || '').toLowerCase();

      if (winnerChanged || mvpChanged) {
        setPlayers((prevPlayers) => {
          let updatedPlayers = [...prevPlayers];

          if (winnerChanged) {
            const oldWinningRoster =
              oldRecord.winner === 'Blue' ? oldRecord.teamBlue : oldRecord.teamRed;
            const newWinningRoster =
              updated.winner === 'Blue' ? updated.teamBlue : updated.teamRed;

            // Revert 1 win from old winners
            for (const p of oldWinningRoster) {
              const idx = updatedPlayers.findIndex(
                (pl) => pl.ign.toLowerCase() === p.ign.toLowerCase()
              );
              if (idx !== -1) {
                updatedPlayers[idx] = {
                  ...updatedPlayers[idx],
                  wins: Math.max(0, updatedPlayers[idx].wins - 1),
                  losses: updatedPlayers[idx].losses + 1,
                };
              }
            }
            // Add 1 win to new winners
            for (const p of newWinningRoster) {
              const idx = updatedPlayers.findIndex(
                (pl) => pl.ign.toLowerCase() === p.ign.toLowerCase()
              );
              if (idx !== -1) {
                updatedPlayers[idx] = {
                  ...updatedPlayers[idx],
                  wins: updatedPlayers[idx].wins + 1,
                  losses: Math.max(0, updatedPlayers[idx].losses - 1),
                };
              }
            }
          }

          if (mvpChanged) {
            if (oldRecord.mvpIgn) {
              const oldMvpIdx = updatedPlayers.findIndex(
                (pl) => pl.ign.toLowerCase() === oldRecord.mvpIgn.toLowerCase()
              );
              if (oldMvpIdx !== -1) {
                updatedPlayers[oldMvpIdx] = {
                  ...updatedPlayers[oldMvpIdx],
                  mvpCount: Math.max(0, (updatedPlayers[oldMvpIdx].mvpCount || 0) - 1),
                };
              }
            }
            if (updated.mvpIgn) {
              const newMvpIdx = updatedPlayers.findIndex(
                (pl) => pl.ign.toLowerCase() === updated.mvpIgn.toLowerCase()
              );
              if (newMvpIdx !== -1) {
                updatedPlayers[newMvpIdx] = {
                  ...updatedPlayers[newMvpIdx],
                  mvpCount: (updatedPlayers[newMvpIdx].mvpCount || 0) + 1,
                };
              }
            }
          }

          try {
            localStorage.setItem(STORAGE_KEYS.players, JSON.stringify(updatedPlayers));
          } catch {
            // ignore
          }
          return updatedPlayers;
        });
      }
    }

    setMatchHistory((prev) => {
      const next = prev.map((m) => (m.id === updated.id ? updated : m));
      try {
        localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
    insertMatchHistoryToSupabase(updated).catch(() => {});
    triggerToast(
      language === 'tl'
        ? `✅ Matagumpay na na-update ang mga stats ng ${updated.id}!`
        : `✅ Successfully updated stats for ${updated.id}!`
    );
    setEditingMatchRecord(null);
  };

  // --- SWAP & FINISH MATCH ---

  const handleSwapParticipant = (team: 'Blue' | 'Red', index: number) => {
    if (!swapSelection) {
      setSwapSelection({ team, index });
      return;
    }

    if (swapSelection.team === team && swapSelection.index === index) {
      setSwapSelection(null);
      return;
    }

    setLiveMatch((prev) => {
      const nextBlue = [...prev.teamBlue];
      const nextRed = [...prev.teamRed];

      const pA =
        swapSelection.team === 'Blue'
          ? { ...nextBlue[swapSelection.index] }
          : { ...nextRed[swapSelection.index] };
      const pB =
        team === 'Blue' ? { ...nextBlue[index] } : { ...nextRed[index] };

      const laneA = pA.assignedLane;
      const laneB = pB.assignedLane;

      const updatedA = { ...pB, assignedLane: laneA };
      const updatedB = { ...pA, assignedLane: laneB };

      if (swapSelection.team === 'Blue') {
        nextBlue[swapSelection.index] = updatedA;
      } else {
        nextRed[swapSelection.index] = updatedA;
      }

      if (team === 'Blue') {
        nextBlue[index] = updatedB;
      } else {
        nextRed[index] = updatedB;
      }

      return {
        ...prev,
        teamBlue: nextBlue,
        teamRed: nextRed,
      };
    });

    setSwapSelection(null);
    triggerToast(t.toastSwapped);
  };

  const handleAutoBalanceCurrentMatch = () => {
    const result = autoBalanceCurrentParticipants(
      liveMatch.teamBlue,
      liveMatch.teamRed
    );
    setLiveMatch((prev) => ({
      ...prev,
      teamBlue: result.teamBlue,
      teamRed: result.teamRed,
      shuffleNote: `Auto-Balanced · Blue ${result.blueAvgWr}% vs Red ${result.redAvgWr}% (Δ ${result.diffWr}%)`,
    }));
    setSwapSelection(null);
    triggerToast(
      language === 'tl'
        ? `Pantay na ang laban! Blue: ${result.blueAvgWr}% vs Red: ${result.redAvgWr}% (Agwat: ${result.diffWr}% na lang)`
        : `Balanced! Blue: ${result.blueAvgWr}% vs Red: ${result.redAvgWr}% (Diff: ${result.diffWr}%)`
    );
  };

  const handleSwapLaneOpponents = (laneIndex: number) => {
    setLiveMatch((prev) => {
      const nextBlue = [...prev.teamBlue];
      const nextRed = [...prev.teamRed];
      if (nextBlue[laneIndex] && nextRed[laneIndex]) {
        const pBlue = { ...nextBlue[laneIndex] };
        const pRed = { ...nextRed[laneIndex] };
        const blueLane = pBlue.assignedLane;
        const redLane = pRed.assignedLane;
        nextBlue[laneIndex] = { ...pRed, assignedLane: blueLane };
        nextRed[laneIndex] = { ...pBlue, assignedLane: redLane };
      }
      return {
        ...prev,
        teamBlue: nextBlue,
        teamRed: nextRed,
      };
    });
    triggerToast(
      language === 'tl'
        ? `Ipinagpalit ang magkatapat sa lane!`
        : `Swapped lane opponents!`
    );
  };

  const handleQuickJoinMyIgn = () => {
    if (!linkedIgn) {
      setClaimIgnModalOpen(true);
      return;
    }
    const clean = linkedIgn.trim();
    const existingIdx = slots.findIndex(
      (s) => s && s.ign.toLowerCase() === clean.toLowerCase()
    );
    if (existingIdx !== -1) {
      triggerToast(
        language === 'tl'
          ? `Nakalista ka na sa Slot #${existingIdx + 1} (${slots[existingIdx]?.roleLabel})!`
          : `You are already queued in Slot #${existingIdx + 1}!`
      );
      return;
    }
    const profile = players.find(
      (p) => p.ign.toLowerCase() === clean.toLowerCase()
    );
    const prefRole = profile?.primaryRole || 'Flex Role';
    const secRole = profile?.secondaryRole;
    const roleLabel =
      profile?.roleLabel || formatRolePairText(prefRole, secRole);

    const openIdx = slots.findIndex((s) => s === null);
    if (openIdx === -1) {
      triggerToast(t.toastSlotsFull);
      return;
    }

    const neededSets = Math.min(5, Math.ceil((openIdx + 1) / 10));
    if (neededSets > activeSetCount) {
      setActiveSetCount(neededSets);
    }

    setSlots((prev) => {
      const next = [...prev];
      next[openIdx] = {
        slotNumber: openIdx + 1,
        ign: clean,
        role: prefRole,
        secondaryRole: secRole,
        roleLabel,
        isReady: true,
        assignedAt: getCurrentTimeLabel(),
      };
      return next;
    });

    triggerToast(
      language === 'tl'
        ? `Nakalista ka na sa Slot #${openIdx + 1} bilang ${clean} (${roleLabel})!`
        : `Queued in Slot #${openIdx + 1} as ${clean} (${roleLabel})!`
    );
  };

  const handleRemoveMyIgnFromQueue = () => {
    if (!linkedIgn) return;
    const clean = linkedIgn.trim();
    const slotIdx = slots.findIndex(
      (s) => s && s.ign.toLowerCase() === clean.toLowerCase()
    );
    if (slotIdx === -1) return;
    setSlots((prev) => {
      const next = [...prev];
      next[slotIdx] = null;
      return next;
    });
    triggerToast(
      language === 'tl'
        ? `Inalis ka sa Slot #${slotIdx + 1}.`
        : `Removed ${clean} from Slot #${slotIdx + 1}.`
    );
  };


  const handleFinishMatch = (winner: 'Blue' | 'Red') => {
    const winningRoster =
      winner === 'Blue' ? liveMatch.teamBlue : liveMatch.teamRed;
    const losingRoster =
      winner === 'Blue' ? liveMatch.teamRed : liveMatch.teamBlue;

    const winningMvpRaw =
      winner === 'Blue'
        ? (blueStarIgn || liveMatch.teamBlue[0]?.ign || liveMatch.mvpIgn)
        : (redStarIgn || liveMatch.teamRed[0]?.ign || liveMatch.mvpIgn);
    const winningMvpIgn = winningMvpRaw === 'None' ? '' : winningMvpRaw;

    const losingSvpRaw =
      winner === 'Blue'
        ? (redStarIgn || liveMatch.teamRed[0]?.ign || '')
        : (blueStarIgn || liveMatch.teamBlue[0]?.ign || '');
    const losingSvpIgn = losingSvpRaw === 'None' ? '' : losingSvpRaw;

    const bKills = blueKillsInput.trim();
    const rKills = redKillsInput.trim();
    const dur = matchDurationInput.trim();
    let formattedKillScore = '';
    if (bKills !== '' || rKills !== '') {
      formattedKillScore = `Blue ${bKills || '0'} - ${rKills || '0'} Red${
        dur ? ` (${dur})` : ''
      }`;
    } else if (dur) {
      formattedKillScore = dur;
    }

    // Auto-calculate true MLBB rating and medals for all 10 players
    const finalBlue = liveMatch.teamBlue.map((p) => {
      const won = winner === 'Blue';
      const isMvp = won && Boolean(winningMvpIgn) && p.ign.toLowerCase() === winningMvpIgn.toLowerCase();
      const isSvp = !won && Boolean(losingSvpIgn) && p.ign.toLowerCase() === losingSvpIgn.toLowerCase();
      const calc = calculateMlbbRating(p.kda, won, isMvp, isSvp);
      const medal = isMvp ? 'MVP' : isSvp ? 'SVP' : (p.medal || calc.medal);
      const rating = p.rating || calc.rating;
      const isFeeder = medal === 'Bronze' || p.isFeeder || calc.isFeeder;
      return {
        ...p,
        won,
        isMvp,
        medal,
        rating,
        isFeeder,
      };
    });

    const finalRed = liveMatch.teamRed.map((p) => {
      const won = winner === 'Red';
      const isMvp = won && Boolean(winningMvpIgn) && p.ign.toLowerCase() === winningMvpIgn.toLowerCase();
      const isSvp = !won && Boolean(losingSvpIgn) && p.ign.toLowerCase() === losingSvpIgn.toLowerCase();
      const calc = calculateMlbbRating(p.kda, won, isMvp, isSvp);
      const medal = isMvp ? 'MVP' : isSvp ? 'SVP' : (p.medal || calc.medal);
      const rating = p.rating || calc.rating;
      const isFeeder = medal === 'Bronze' || p.isFeeder || calc.isFeeder;
      return {
        ...p,
        won,
        isMvp,
        medal,
        rating,
        isFeeder,
      };
    });

    const bronzePlayers = [...finalBlue, ...finalRed].filter((p) => p.medal === 'Bronze' || p.isFeeder);
    const bronzeIgns = bronzePlayers.map((p) => p.ign);

    const allParticipants = [
      ...finalBlue.map((p) => ({ ...p, won: winner === 'Blue' })),
      ...finalRed.map((p) => ({ ...p, won: winner === 'Red' })),
    ];

    setPlayers((prevPlayers) => {
      const updated = [...prevPlayers];

      for (const participant of allParticipants) {
        const isWinningMvp =
          participant.won &&
          Boolean(winningMvpIgn) &&
          participant.ign.toLowerCase() === winningMvpIgn.toLowerCase();

        const idx = updated.findIndex(
          (pl) => pl.ign.toLowerCase() === participant.ign.toLowerCase()
        );

        if (idx !== -1) {
          const existing = updated[idx];
          updated[idx] = {
            ...existing,
            wins: existing.wins + (participant.won ? 1 : 0),
            losses: existing.losses + (participant.won ? 0 : 1),
            mvpCount: (existing.mvpCount || 0) + (isWinningMvp ? 1 : 0),
            roleCounts: {
              ...existing.roleCounts,
              [participant.assignedLane]:
                (existing.roleCounts[participant.assignedLane] ?? 0) + 1,
            },
          };
        } else {
          updated.push({
            id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            ign: participant.ign,
            squadTag: 'NGD',
            primaryRole: participant.selectedRole,
            secondaryRole: participant.secondaryRole || participant.assignedLane,
            roleLabel: participant.roleLabel,
            wins: participant.won ? 1 : 0,
            losses: participant.won ? 0 : 1,
            mvpCount: isWinningMvp ? 1 : 0,
            streak: participant.won ? 1 : -1,
            roleCounts: {
              Jungle: participant.assignedLane === 'Jungle' ? 1 : 0,
              'EXP Lane': participant.assignedLane === 'EXP Lane' ? 1 : 0,
              'Mid Lane': participant.assignedLane === 'Mid Lane' ? 1 : 0,
              'Gold Lane': participant.assignedLane === 'Gold Lane' ? 1 : 0,
              Roamer: participant.assignedLane === 'Roamer' ? 1 : 0,
              'Flex Role': participant.assignedLane === 'Flex Role' ? 1 : 0,
            },
            recentForm: [participant.won ? 'W' : 'L'],
            signatureHeroes: [],
            mythicStars: 50,
          });
        }
      }
      return updated;
    });

    const existingIds = new Set(matchHistory.map((m) => m.id));
    let nextNum = matchHistory.length + 1;
    let nextMatchId = `NGD-M${String(nextNum).padStart(2, '0')}`;
    while (existingIds.has(nextMatchId)) {
      nextNum += 1;
      nextMatchId = `NGD-M${String(nextNum).padStart(2, '0')}`;
    }

    const newRecord: MatchHistoryRecord = {
      id: nextMatchId,
      roomName: liveMatch.roomName,
      completedAt: getCurrentTimeLabel(),
      winner,
      mvpIgn: winningMvpIgn || (winner === 'Blue' ? liveMatch.teamBlue[0]?.ign : liveMatch.teamRed[0]?.ign) || 'N/A',
      svpIgn: losingSvpIgn || undefined,
      feederIgn: bronzeIgns[0] || undefined,
      feederIgns: bronzeIgns.length > 0 ? bronzeIgns : undefined,
      killScore: formattedKillScore || undefined,
      blueKills: bKills ? parseInt(bKills, 10) : undefined,
      redKills: rKills ? parseInt(rKills, 10) : undefined,
      seriesGameNumber: (liveMatch.blueSeriesWins || 0) + (liveMatch.redSeriesWins || 0) + 1,
      seriesScore: `${liveMatch.blueSeriesWins || 0} - ${liveMatch.redSeriesWins || 0}`,
      screenshotUrl: undefined,
      teamBlue: finalBlue,
      teamRed: finalRed,
      durationText: dur || 'Finished',
    };

    insertMatchHistoryToSupabase(newRecord).catch(() => {});

    const targetWins =
      liveMatch.seriesFormat === 'BO5'
        ? 3
        : liveMatch.seriesFormat === 'BO3'
          ? 2
          : 1;

    const prevBlue = liveMatch.blueSeriesWins || 0;
    const prevRed = liveMatch.redSeriesWins || 0;
    const seriesAlreadyOver = prevBlue >= targetWins || prevRed >= targetWins;

    const nextBlueWins = seriesAlreadyOver
      ? winner === 'Blue'
        ? 1
        : 0
      : prevBlue + (winner === 'Blue' ? 1 : 0);
    const nextRedWins = seriesAlreadyOver
      ? winner === 'Red'
        ? 1
        : 0
      : prevRed + (winner === 'Red' ? 1 : 0);

    setLiveMatch((prev) => ({
      ...prev,
      mvpIgn: winningMvpIgn,
      blueSeriesWins: nextBlueWins,
      redSeriesWins: nextRedWins,
    }));

    setMatchHistory((prev) => [newRecord, ...prev]);
    setBlueKillsInput('');
    setRedKillsInput('');
    setMatchDurationInput('');

    if (targetWins === 1) {
      triggerToast(
        `Team ${winner} Won! 👑 MVP: ${winningMvpIgn} (+1 Win & +1 MVP)`
      );
    } else if (nextBlueWins >= targetWins || nextRedWins >= targetWins) {
      triggerToast(
        `🏆 Team ${winner} Won ${liveMatch.seriesFormat} (${nextBlueWins}–${nextRedWins})! 👑 MVP: ${winningMvpIgn}`
      );
    } else {
      triggerToast(
        `Team ${winner} Won Game ${nextBlueWins + nextRedWins} (${nextBlueWins}–${nextRedWins})! 👑 MVP: ${winningMvpIgn}`
      );
    }
  };

  const handleCopyBattleResult = async (record: MatchHistoryRecord) => {
    const text = formatBattleResultGcText(record);
    try {
      await navigator.clipboard.writeText(text);
      triggerToast(t.toastResultCopied);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      triggerToast(t.toastResultCopied);
    }
  };

  const handleDeleteMatchHistoryItem = async (matchId: string) => {
    if (!isAdmin) return;
    const matchToDelete = matchHistory.find((m) => m.id === matchId);
    if (matchToDelete) {
      setPlayers((prevPlayers) => {
        let updatedPlayers = [...prevPlayers];
        const winners =
          matchToDelete.winner === 'Blue' ? matchToDelete.teamBlue : matchToDelete.teamRed;
        const losers =
          matchToDelete.winner === 'Blue' ? matchToDelete.teamRed : matchToDelete.teamBlue;

        for (const p of winners) {
          const idx = updatedPlayers.findIndex(
            (pl) => pl.ign.toLowerCase() === p.ign.toLowerCase()
          );
          if (idx !== -1) {
            updatedPlayers[idx] = {
              ...updatedPlayers[idx],
              wins: Math.max(0, updatedPlayers[idx].wins - 1),
            };
          }
        }
        for (const p of losers) {
          const idx = updatedPlayers.findIndex(
            (pl) => pl.ign.toLowerCase() === p.ign.toLowerCase()
          );
          if (idx !== -1) {
            updatedPlayers[idx] = {
              ...updatedPlayers[idx],
              losses: Math.max(0, updatedPlayers[idx].losses - 1),
            };
          }
        }
        if (matchToDelete.mvpIgn) {
          const mvpIdx = updatedPlayers.findIndex(
            (pl) => pl.ign.toLowerCase() === matchToDelete.mvpIgn.toLowerCase()
          );
          if (mvpIdx !== -1) {
            updatedPlayers[mvpIdx] = {
              ...updatedPlayers[mvpIdx],
              mvpCount: Math.max(0, (updatedPlayers[mvpIdx].mvpCount || 0) - 1),
            };
          }
        }
        try {
          localStorage.setItem(STORAGE_KEYS.players, JSON.stringify(updatedPlayers));
        } catch {
          // ignore
        }
        return updatedPlayers;
      });
    }

    setMatchHistory((prev) => {
      const next = prev.filter((m) => m.id !== matchId);
      try {
        localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
    await deleteMatchHistoryFromSupabase(matchId).catch(() => {});
    triggerToast(t.toastHistoryDeleted);
  };

  const handleClearMatchHistory = async () => {
    if (!isAdmin) return;
    setMatchHistory([]);
    await clearMatchHistoryFromSupabase().catch(() => {});
    triggerToast(t.toastHistoryCleared);
  };

  // --- ADMIN / DEVELOPER LEADERBOARD DELETION HANDLERS ---

  const handleUnlockAdminPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValidAdminPin(adminPinInput)) {
      setAdminPinUnlocked(true);
      try {
        localStorage.setItem(STORAGE_KEYS.adminUnlocked, 'true');
      } catch {
        // Ignore storage error
      }
      setAdminPinInput('');
      triggerToast(t.adminUnlockedToast);
    } else {
      triggerToast(t.adminWrongPin);
    }
  };

  const handleLockAdmin = () => {
    setAdminPinUnlocked(false);
    setConfirmClearAll(false);
    try {
      localStorage.removeItem(STORAGE_KEYS.adminUnlocked);
    } catch {
      // Ignore storage error
    }
    triggerToast(t.adminLockedToast);
  };

  const handleDeleteLeaderboardPlayer = async (ignToDelete: string) => {
    if (!isAdmin) return;
    setPlayers((prev) =>
      prev.filter((p) => p.ign.toLowerCase() !== ignToDelete.toLowerCase())
    );
    await deletePlayerFromSupabase(ignToDelete).catch(() => {});
    triggerToast(`${t.toastPlayerDeleted} (${ignToDelete})`);
  };

  const handleClearAllLeaderboardPlayers = async () => {
    if (!isAdmin) return;
    if (!confirmClearAll) {
      setConfirmClearAll(true);
      return;
    }
    setPlayers([]);
    setConfirmClearAll(false);
    await clearAllPlayersFromSupabase().catch(() => {});
    triggerToast(t.toastLeaderboardCleared);
  };

  const handleRestoreSamplePlayers = async () => {
    if (!isAdmin) return;
    setPlayers(INITIAL_PLAYERS);
    setConfirmClearAll(false);
    triggerToast(t.toastReset);
  };

  // --- COMPUTED VALUES ---

  const first10FilledCount = useMemo(
    () => slots.slice(0, 10).filter((s) => s !== null).length,
    [slots]
  );

  const next10FilledCount = useMemo(
    () => slots.slice(10, 20).filter((s) => s !== null).length,
    [slots]
  );

  const blueTeamAvgWr = useMemo(() => {
    if (liveMatch.teamBlue.length === 0) return 0;
    const sum = liveMatch.teamBlue.reduce(
      (acc, p) => acc + getPlayerWinrate(p.ign, players, p.winrateSnapshot),
      0
    );
    return Number((sum / liveMatch.teamBlue.length).toFixed(1));
  }, [liveMatch.teamBlue, players]);

  const redTeamAvgWr = useMemo(() => {
    if (liveMatch.teamRed.length === 0) return 0;
    const sum = liveMatch.teamRed.reduce(
      (acc, p) => acc + getPlayerWinrate(p.ign, players, p.winrateSnapshot),
      0
    );
    return Number((sum / liveMatch.teamRed.length).toFixed(1));
  }, [liveMatch.teamRed, players]);

  const sortedLeaderboard = useMemo(() => {
    return [...players]
      .filter((p) => {
        if (!searchQuery.trim()) return true;
        return (
          p.ign.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
          p.roleLabel.toLowerCase().includes(searchQuery.trim().toLowerCase())
        );
      })
      .sort((a, b) => {
        const wrA = calcWinrate(a.wins, a.losses);
        const wrB = calcWinrate(b.wins, b.losses);
        const totalA = a.wins + a.losses;
        const totalB = b.wins + b.losses;

        if (leaderboardSort === 'wins') return b.wins - a.wins || wrB - wrA;
        if (leaderboardSort === 'mvp')
          return (b.mvpCount || 0) - (a.mvpCount || 0) || b.wins - a.wins;
        if (leaderboardSort === 'winrate') return wrB - wrA || b.wins - a.wins;
        return totalB - totalA || b.wins - a.wins;
      });
  }, [players, searchQuery, leaderboardSort]);

  // --- CLEAN SLOT ROW RENDERER ---
  const renderSlotRow = (slotIdx: number, isFirst10: boolean) => {
    const slot = slots[slotIdx];
    const slotNum = slotIdx + 1;
    const isEditing = editingSlotIndex === slotIdx;

    if (!slot) {
      return (
        <div
          key={slotNum}
          className="min-h-[48px] px-3 py-2 rounded-xl bg-slate-100/80 dark:bg-[#080c14] border border-dashed border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 flex items-center justify-between gap-2 transition overflow-hidden"
        >
          {isEditing ? (
            <div className="w-full min-w-0 space-y-2 py-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono tabular-nums text-xs font-bold text-slate-500 w-5 shrink-0">
                  {slotNum}.
                </span>
                <input
                  type="text"
                  value={inlineSlotIgn}
                  onChange={(e) => setInlineSlotIgn(e.target.value)}
                  placeholder={t.inlineIgnPlaceholder}
                  autoFocus
                  className="flex-1 min-w-0 h-9 px-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-600 dark:focus:border-[#00f2fe]"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 min-w-0">
                <select
                  value={inlineSlotRole}
                  onChange={(e) =>
                    setInlineSlotRole(e.target.value as MlbbRole)
                  }
                  className="w-full max-w-full min-w-0 h-9 px-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white truncate"
                >
                  {MLBB_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {t.inlineMainPrefix} {ROLE_META[r].gcLabel}
                    </option>
                  ))}
                </select>
                <select
                  value={inlineSlotSecRole}
                  onChange={(e) =>
                    setInlineSlotSecRole(e.target.value as MlbbRole | 'NONE')
                  }
                  disabled={inlineSlotRole === 'Flex Role'}
                  className="w-full max-w-full min-w-0 h-9 px-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 disabled:opacity-40 truncate"
                >
                  <option value="NONE">{t.inlineSecondNone}</option>
                  {MLBB_ROLES.filter((r) => r !== 'Flex Role').map((r) => (
                    <option key={r} value={r}>
                      {t.inlineSecondPrefix} {ROLE_META[r].gcLabel}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditingSlotIndex(null)}
                  className="min-h-[36px] px-3 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs cursor-pointer"
                >
                  {t.cancelBtn}
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveInlineSlot(slotIdx)}
                  className="min-h-[36px] px-3.5 rounded-lg bg-cyan-600 dark:bg-[#00f2fe] text-white dark:text-slate-950 font-bold text-xs cursor-pointer"
                >
                  {t.inlineSaveBtn}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono tabular-nums text-xs font-bold text-slate-500 w-5 shrink-0">
                  {slotNum}.
                </span>
                <span className="text-xs text-slate-500 truncate">
                  {t.openSlotLabel}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleJoinSpecificSlot(slotIdx)}
                className={`min-h-[36px] px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer ${
                  isFirst10
                    ? 'bg-cyan-500/15 text-cyan-700 dark:text-[#00f2fe] hover:bg-cyan-600 hover:text-white dark:hover:bg-[#00f2fe] dark:hover:text-slate-950'
                    : 'bg-amber-500/15 text-amber-700 dark:text-[#f1c40f] hover:bg-amber-500 hover:text-slate-950 dark:hover:bg-[#f1c40f]'
                }`}
              >
                {t.joinSlotBtn} #{slotNum}
              </button>
            </>
          )}
        </div>
      );
    }

    const isMySlot =
      Boolean(linkedIgn) &&
      slot.ign.toLowerCase() === linkedIgn!.toLowerCase();

    return (
      <div
        key={slotNum}
        className={`min-h-[52px] px-3 py-2 rounded-xl border flex items-center justify-between gap-2 overflow-hidden transition ${
          isMySlot
            ? 'bg-cyan-500/10 dark:bg-cyan-950/30 border-cyan-500 ring-2 ring-cyan-500/50 shadow-xs'
            : 'bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800/90'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span
            className={`font-mono tabular-nums text-xs font-bold w-5 shrink-0 ${
              isFirst10
                ? 'text-cyan-700 dark:text-[#00f2fe]'
                : 'text-amber-700 dark:text-[#f1c40f]'
            }`}
          >
            {slotNum}.
          </span>
          <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-2">
            <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate min-w-0 flex items-center gap-1.5">
              <span className="truncate">{slot.ign}</span>
              {isMySlot && (
                <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-700 dark:text-[#00f2fe] text-[9px] font-mono font-bold shrink-0">
                  ★ {t.youBadge}
                </span>
              )}
            </span>
            <RoleBadge role={slot.role} customLabel={slot.roleLabel} />
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleRemoveSlot(slotIdx)}
          title={t.removeSlotTitle}
          className="h-8 w-8 rounded-lg bg-slate-200/70 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 flex items-center justify-center text-sm transition cursor-pointer shrink-0"
        >
          ×
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-100 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 flex flex-col pb-24 md:pb-12 transition-colors">
      {/* TOP BAR CONTRACT: 3 Zones */}
      <header className="md:sticky md:top-0 z-30 w-full bg-white/95 dark:bg-[#0b0f19]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 lg:px-10 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-8 transition-colors">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('queue');
          }}
          className="flex items-center gap-2 sm:gap-3 font-display text-sm sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 min-w-0"
        >
          <NgdBrandEmblem size="sm" />
          <span className="truncate">{t.brandTitle}</span>
        </a>

        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('queue')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
              activeTab === 'queue'
                ? 'border-cyan-600 dark:border-[#00f2fe] text-cyan-700 dark:text-[#00f2fe] font-semibold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t.navSlots}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('match')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
              activeTab === 'match'
                ? 'border-cyan-600 dark:border-[#00f2fe] text-cyan-700 dark:text-[#00f2fe] font-semibold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t.navMatch}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('stats')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
              activeTab === 'stats'
                ? 'border-cyan-600 dark:border-[#00f2fe] text-cyan-700 dark:text-[#00f2fe] font-semibold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t.navStats}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('leaderboard')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
              activeTab === 'leaderboard'
                ? 'border-cyan-600 dark:border-[#00f2fe] text-cyan-700 dark:text-[#00f2fe] font-semibold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t.navLeaderboard}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
              activeTab === 'settings'
                ? 'border-cyan-600 dark:border-[#00f2fe] text-cyan-700 dark:text-[#00f2fe] font-semibold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t.navSettings}
          </button>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <button
              type="button"
              onClick={() => setClaimIgnModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#0b0f19] border border-slate-300 dark:border-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 hover:border-cyan-500 cursor-pointer transition"
              title="Click to claim or change your MLBB IGN"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="font-bold truncate max-w-[100px] sm:max-w-[130px]">
                {linkedIgn || user.displayName || user.email?.split('@')[0]}
              </span>
              {linkedIgn ? (
                <span className="text-[10px] font-mono text-cyan-600 dark:text-[#00f2fe] font-bold">
                  ★
                </span>
              ) : (
                <span className="text-[10px] text-amber-500 font-bold">
                  (Link IGN)
                </span>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-[#0b0f19] border border-slate-300 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-cyan-600 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleCopyGcText('warmup')}
            className="min-h-[38px] sm:min-h-[40px] px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-[#f1c40f] text-slate-950 font-semibold text-xs hover:bg-yellow-300 transition whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            {copiedFlag ? (
              <Check className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
            ) : (
              <Copy className="w-3.5 h-3.5 shrink-0" />
            )}
            <span className="sm:hidden">
              {copiedFlag ? t.copied : t.copyShortBtn}
            </span>
            <span className="hidden sm:inline">
              {copiedFlag ? t.copied : t.copyGcList}
            </span>
          </button>
        </div>
      </header>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 md:bottom-6 left-3 right-3 sm:left-auto sm:right-6 md:right-8 z-50 sm:max-w-md px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-cyan-500/50 dark:border-[#00f2fe]/50 text-xs font-medium text-slate-900 dark:text-slate-100 shadow-2xl flex items-center gap-2.5"
        >
          <Check className="w-4 h-4 text-cyan-600 dark:text-[#00f2fe] shrink-0" />
          <span className="min-w-0 break-words">{toastMessage}</span>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-5 space-y-5 sm:space-y-6 overflow-x-hidden">
        {/* =====================================================================
            TAB 1: 1–20 PALIST & CUSTOM 5V5 SLOTS
           ===================================================================== */}
        {activeTab === 'queue' && (
          <div className="space-y-5 sm:space-y-6">
            {/* SIMPLE PALIST FORM AT THE TOP */}
            <section className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/85 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-display font-bold text-slate-900 dark:text-white">
                    {t.joinTitle}
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {t.joinSubtitle}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
                  <button
                    type="button"
                    onClick={handleClipboardQuickPaste}
                    className="min-h-[38px] px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white dark:bg-[#00f2fe] dark:hover:bg-cyan-300 dark:text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5 shrink-0" />
                    <span>⚡ Quick Paste (Auto-Fill)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPasteBox((v) => !v)}
                    className="min-h-[38px] px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-xs text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 min-w-0 cursor-pointer"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5 text-cyan-600 dark:text-[#00f2fe] shrink-0" />
                    <span className="truncate">{t.pasteGcBtn}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSlots(INITIAL_SLOTS);
                      triggerToast(t.toastReset);
                    }}
                    className="min-h-[38px] px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center gap-1.5 min-w-0 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3 shrink-0" />
                    <span className="truncate">{t.resetBtn}</span>
                  </button>
                </div>
              </div>

              {showPasteBox && (
                <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-[#0b0f19] border border-cyan-500/30 space-y-3 shadow-inner">
                  <div className="flex items-center justify-between text-xs text-cyan-700 dark:text-[#00f2fe] font-bold">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Auto-Detect Scrim 5v5 List (1-10)</span>
                    </span>
                    <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                      I-paste dito — automatic mapupunta sa mga slot agad!
                    </span>
                  </div>

                  <textarea
                    value={pasteRawText}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPasteRawText(val);
                      handleAutoFillSlotsFromText(val, false);
                    }}
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData('text');
                      if (pasted) {
                        setPasteRawText(pasted);
                        handleAutoFillSlotsFromText(pasted, true);
                      }
                    }}
                    placeholder={`NGD SCRIM 5v5\nBO3 DRAFT\nLIST:\n1. xTriggered\n2. sintopia\n3. Tadashi\n4.hapon\n5. Db sion\n6. Setsuko.\n7.S\n8. Lucks\n9.HALIMAW\n10. Akira.`}
                    rows={6}
                    className="w-full p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={handleClipboardQuickPaste}
                      className="min-h-[36px] px-3 py-1.5 rounded-lg bg-cyan-500/15 text-cyan-700 dark:text-[#00f2fe] font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <ClipboardPaste className="w-3.5 h-3.5 shrink-0" />
                      <span>I-paste mula sa Clipboard</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowPasteBox(false)}
                        className="min-h-[36px] px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                      >
                        {t.cancelBtn}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAutoFillSlotsFromText(pasteRawText, true)}
                        className="min-h-[36px] px-4 py-1.5 rounded-lg bg-cyan-600 dark:bg-[#00f2fe] text-white dark:text-slate-950 font-bold text-xs cursor-pointer shadow-xs"
                      >
                        ⚡ I-fill sa mga Slots (1–10)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Member Quick Queue Bar (If Signed In) */}
              {user ? (
                <div className="p-3 rounded-xl bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-indigo-500/10 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-cyan-600 dark:bg-[#00f2fe] text-white dark:text-slate-950 flex items-center justify-center font-bold text-xs shrink-0">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white truncate">
                        <span>
                          {linkedIgn
                            ? (language === 'tl' ? `Naka-link: ${linkedIgn}` : `Linked: ${linkedIgn}`)
                            : user.displayName || user.email}
                        </span>
                        {linkedIgn && (
                          <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-700 dark:text-[#00f2fe] text-[9px] font-mono">
                            VERIFIED SQUAD MEMBER
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {linkedIgn
                          ? slots.some(
                              (s) =>
                                s &&
                                s.ign.toLowerCase() ===
                                  linkedIgn.toLowerCase()
                            )
                            ? (language === 'tl'
                                ? `Nasa listahan ka na sa Slot #${
                                    slots.findIndex(
                                      (s) =>
                                        s &&
                                        s.ign.toLowerCase() ===
                                          linkedIgn.toLowerCase()
                                    ) + 1
                                  }!`
                                : `You are already listed in Slot #${
                                    slots.findIndex(
                                      (s) =>
                                        s &&
                                        s.ign.toLowerCase() ===
                                          linkedIgn.toLowerCase()
                                    ) + 1
                                  }!`)
                            : (language === 'tl'
                                ? '1-click para pumasok sa palista gamit ang iyong IGN at saved roles.'
                                : '1-click to join open slots with your IGN and saved roles.')
                          : (language === 'tl'
                              ? 'I-claim o i-link ang iyong MLBB IGN para mag-1-click palista at ma-highlight sa leaderboard!'
                              : 'Claim or link your MLBB IGN for 1-click queueing and leaderboard highlights!')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {linkedIgn ? (
                      slots.some(
                        (s) =>
                          s &&
                          s.ign.toLowerCase() === linkedIgn.toLowerCase()
                      ) ? (
                        <button
                          type="button"
                          onClick={handleRemoveMyIgnFromQueue}
                          className="min-h-[36px] px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500 text-rose-600 dark:text-rose-400 hover:text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>{language === 'tl' ? 'Alisin Ako sa Slot' : 'Remove Me from Slot'}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleQuickJoinMyIgn}
                          className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-cyan-600 dark:bg-[#00f2fe] text-white dark:text-slate-950 text-xs font-bold hover:opacity-90 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Zap className="w-3.5 h-3.5 fill-current shrink-0" />
                          <span>{language === 'tl' ? `1-Click Palista (${linkedIgn})` : `1-Click Join (${linkedIgn})`}</span>
                        </button>
                      )
                    ) : (
                      <button
                        type="button"
                        onClick={() => setClaimIgnModalOpen(true)}
                        className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-[#f1c40f] text-slate-950 text-xs font-bold hover:bg-yellow-300 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5 shrink-0" />
                        <span>{language === 'tl' ? 'I-link ang Aking IGN' : 'Link My IGN'}</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <User className="w-4 h-4 text-cyan-600 dark:text-[#00f2fe]" />
                    <span>
                      {language === 'tl'
                        ? 'Mag-sign in para mai-link ang iyong MLBB IGN at magkaroon ng 1-click palista!'
                        : 'Sign in to link your MLBB IGN and unlock 1-click instant queueing!'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('settings')}
                    className="px-3 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold hover:text-cyan-600 cursor-pointer shrink-0"
                  >
                    Sign In
                  </button>
                </div>
              )}

              <form
                onSubmit={handleJoinPalist}
                className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end min-w-0"
              >
                <div className="sm:col-span-4 min-w-0">
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1 truncate">
                    {t.playerIgnLabel}
                  </label>
                  <input
                    type="text"
                    value={palistIgn}
                    onChange={(e) => setPalistIgn(e.target.value)}
                    placeholder={t.playerIgnPlaceholder}
                    className="w-full min-w-0 h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-[#0b0f19] border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-600 dark:focus:border-[#00f2fe]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:col-span-5 min-w-0">
                  <div className="min-w-0">
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1 truncate">
                      {t.mainRoleLabel}
                    </label>
                    <select
                      aria-label="Main Role"
                      value={palistRole}
                      onChange={(e) =>
                        setPalistRole(e.target.value as MlbbRole)
                      }
                      className="w-full max-w-full min-w-0 h-11 px-3 rounded-xl bg-slate-50 dark:bg-[#0b0f19] border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white truncate focus:outline-none focus:border-cyan-600 dark:focus:border-[#00f2fe]"
                    >
                      {MLBB_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_META[r].gcLabel}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="min-w-0">
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1 truncate">
                      {t.secondRoleLabel}
                    </label>
                    <select
                      aria-label="Sub Role"
                      value={palistSecondRole}
                      onChange={(e) =>
                        setPalistSecondRole(
                          e.target.value as MlbbRole | 'NONE'
                        )
                      }
                      disabled={palistRole === 'Flex Role'}
                      className="w-full max-w-full min-w-0 h-11 px-3 rounded-xl bg-slate-50 dark:bg-[#0b0f19] border border-slate-300 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 disabled:opacity-40 truncate focus:outline-none focus:border-cyan-600 dark:focus:border-[#00f2fe]"
                    >
                      <option value="NONE">{t.noneOneRole}</option>
                      {MLBB_ROLES.filter((r) => r !== 'Flex Role').map((r) => (
                        <option key={r} value={r}>
                          {ROLE_META[r].gcLabel}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="sm:col-span-3 min-w-0">
                  <button
                    type="submit"
                    className="w-full h-11 px-4 rounded-xl bg-[#f1c40f] text-slate-950 font-display font-bold text-sm hover:bg-yellow-300 transition flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4 stroke-[2.3] shrink-0" />
                    <span className="truncate">{t.joinSubmitBtn}</span>
                  </button>
                </div>
              </form>
            </section>

            {/* =====================================================================
                DYNAMIC GAME / SET SELECTOR (DEFAULT: GAME 1 / 1-10, CHOICES UP TO GAME 5 / 50 SLOTS)
               ===================================================================== */}
            <section className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/85 border border-slate-200 dark:border-slate-800 space-y-3.5 shadow-xs overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
                    <h2 className="text-base sm:text-lg font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-cyan-600 dark:text-[#00f2fe]" />
                      <span>
                        {language === 'tl'
                          ? 'Mga Sets / Games na Lalaruin'
                          : 'Active Sets / Games to Play'}
                      </span>
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {language === 'tl'
                      ? 'Default ay Game 1 (1–10 slots). Piliin kung ilang sets ang lalaro (hanggang Game 5 / 50 slots kapag marami ang participants).'
                      : 'Default is Game 1 (1–10 slots). Choose how many sets to play (up to Game 5 / 50 slots for large groups).'}
                  </p>
                </div>

                {/* Total Filled Stats */}
                <div className="flex items-center gap-2 text-xs font-mono shrink-0">
                  <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                    Total Active Slots:{' '}
                    <span className="text-cyan-700 dark:text-[#00f2fe]">
                      {slots.slice(0, activeSetCount * 10).filter(Boolean).length}
                    </span>
                    /{activeSetCount * 10}
                  </span>
                </div>
              </div>

              {/* Set Choices (1 Game, 2 Games, 3 Games, 4 Games, 5 Games) */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                  {language === 'tl' ? 'Pumili ng Set:' : 'Select Sets:'}
                </span>

                <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 w-full sm:w-auto">
                  {[
                    { count: 1, label: 'Game 1 (10 Slots)', short: '1 Game (10)' },
                    { count: 2, label: 'Game 2 (20 Slots)', short: '2 Games (20)' },
                    { count: 3, label: 'Game 3 (30 Slots)', short: '3 Games (30)' },
                    { count: 4, label: 'Game 4 (40 Slots)', short: '4 Games (40)' },
                    { count: 5, label: 'Game 5 (50 Slots)', short: '5 Games (50)' },
                  ].map((opt) => {
                    const isActive = activeSetCount === opt.count;
                    return (
                      <button
                        key={opt.count}
                        type="button"
                        onClick={() => {
                          setActiveSetCount(opt.count);
                          if (activeSetTab !== 'all' && Number(activeSetTab) > opt.count) {
                            setActiveSetTab('all');
                          }
                          triggerToast(
                            language === 'tl'
                              ? `Itinakda sa ${opt.count} Set (${opt.count * 10} slots).`
                              : `Set to ${opt.count} Game Sets (${opt.count * 10} slots).`
                          );
                        }}
                        className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          isActive
                            ? 'bg-cyan-600 dark:bg-[#00f2fe] text-white dark:text-slate-950 shadow-sm ring-2 ring-cyan-500/30'
                            : 'bg-slate-100 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-cyan-500/50'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {opt.count === 1 && (
                          <span className="px-1.5 py-0.2 rounded bg-black/15 text-[10px] uppercase font-mono">
                            Default
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Quick Add / Remove buttons */}
                <div className="flex items-center gap-1.5 ml-auto shrink-0">
                  {activeSetCount > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.max(1, activeSetCount - 1);
                        setActiveSetCount(next);
                        if (activeSetTab !== 'all' && Number(activeSetTab) > next) {
                          setActiveSetTab('all');
                        }
                      }}
                      className="min-h-[36px] px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 cursor-pointer"
                      title={language === 'tl' ? "Bawasan ng 1 Game" : "Remove 1 Game"}
                    >
                      <Minus className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">
                        {language === 'tl' ? 'Bawasan' : 'Remove Game'}
                      </span>
                    </button>
                  )}
                  {activeSetCount < 5 && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.min(5, activeSetCount + 1);
                        setActiveSetCount(next);
                        triggerToast(
                          language === 'tl'
                            ? `Idinagdag ang Game ${next} (Slots ${(next - 1) * 10 + 1}–${next * 10})!`
                            : `Added Game ${next} (Slots ${(next - 1) * 10 + 1}–${next * 10})!`
                        );
                      }}
                      className="min-h-[36px] px-3 py-1 rounded-xl bg-[#f1c40f] hover:bg-yellow-300 text-slate-950 text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                      title={language === 'tl' ? "Magdagdag ng karagdagang 10 slots" : "Add 10 more slots"}
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{language === 'tl' ? `Dagdag Game ${activeSetCount + 1}` : `Add Game ${activeSetCount + 1}`}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Game View Tabs when multiple games active */}
              {activeSetCount > 1 && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1">
                    {language === 'tl' ? 'Tingnan:' : 'View:'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveSetTab('all')}
                    className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      activeSetTab === 'all'
                        ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {language === 'tl'
                      ? `Lahat ng Laro (${activeSetCount} Games)`
                      : `All Games (${activeSetCount})`}
                  </button>

                  {Array.from({ length: activeSetCount }, (_, i) => {
                    const setNum = i + 1;
                    const isTabActive = activeSetTab === setNum;
                    const filled = getSetFilledCount(i);
                    return (
                      <button
                        key={setNum}
                        type="button"
                        onClick={() => setActiveSetTab(setNum)}
                        className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          isTabActive
                            ? setNum === 1
                              ? 'bg-cyan-600 dark:bg-[#00f2fe] text-white dark:text-slate-950'
                              : 'bg-amber-500 dark:bg-[#f1c40f] text-slate-950'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <span>Game {setNum}</span>
                        <span className="text-[10px] font-mono opacity-80">
                          ({filled}/10)
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* DYNAMIC RENDERING OF GAME SETS (1 to 5 Games) */}
            <div
              className={`grid grid-cols-1 ${
                (activeSetTab === 'all' ? activeSetCount : 1) > 1
                  ? 'lg:grid-cols-2'
                  : 'max-w-3xl mx-auto'
              } gap-4 sm:gap-6 items-start`}
            >
              {(activeSetTab === 'all'
                ? Array.from({ length: activeSetCount }, (_, i) => i)
                : [Number(activeSetTab) - 1].filter((idx) => idx >= 0 && idx < activeSetCount)
              ).map((setIdx) => {
                const setNum = setIdx + 1;
                const startSlot = setIdx * 10 + 1;
                const midSlot = setIdx * 10 + 5;
                const endSlot = setIdx * 10 + 10;
                const filledCount = getSetFilledCount(setIdx);
                const isGame1 = setIdx === 0;

                // Color accents per game
                const borderClass = isGame1
                  ? 'border-cyan-500/40 dark:border-[#00f2fe]/35'
                  : setNum === 2
                    ? 'border-amber-500/45 dark:border-[#f1c40f]/35'
                    : setNum === 3
                      ? 'border-emerald-500/45 dark:border-emerald-400/35'
                      : setNum === 4
                        ? 'border-purple-500/45 dark:border-purple-400/35'
                        : 'border-rose-500/45 dark:border-rose-400/35';

                const badgeBg = isGame1
                  ? 'bg-cyan-500/15 text-cyan-700 dark:text-[#00f2fe]'
                  : setNum === 2
                    ? 'bg-amber-500/15 text-amber-700 dark:text-[#f1c40f]'
                    : setNum === 3
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                      : setNum === 4
                        ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300'
                        : 'bg-rose-500/15 text-rose-700 dark:text-rose-400';

                return (
                  <section
                    key={`game-set-${setNum}`}
                    className={`p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/85 border ${borderClass} space-y-3.5 sm:space-y-4 shadow-xs overflow-hidden`}
                  >
                    {/* Game Header */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                      <div className="min-w-0">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase truncate ${badgeBg}`}
                        >
                          {isGame1
                            ? '🔥 GAME 1 · PLAYING NOW'
                            : `⚡ GAME ${setNum} · WAITING IN LINE`}
                        </span>
                        <h2 className="text-base sm:text-lg font-display font-bold text-slate-900 dark:text-white truncate mt-0.5">
                          Game {setNum} (Slots {startSlot}–{endSlot})
                        </h2>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono tabular-nums text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {filledCount}/10
                        </span>
                        <p className="text-[10px] text-slate-500">Ready</p>
                      </div>
                    </div>

                    {/* 10 Player Slots (5 Blue, 5 Red) */}
                    <div className="space-y-2">
                      <div className="text-[11px] font-mono text-cyan-700 dark:text-[#00f2fe] font-semibold px-1 flex items-center justify-between">
                        <span>🔵 Team Blue (Slots {startSlot}–{midSlot})</span>
                        <span className="text-[10px] text-slate-400">1–5</span>
                      </div>
                      {Array.from({ length: 5 }, (_, i) =>
                        renderSlotRow(setIdx * 10 + i, isGame1)
                      )}

                      <div className="pt-2 text-[11px] font-mono text-rose-600 dark:text-rose-400 font-semibold px-1 flex items-center justify-between">
                        <span>🔴 Team Red (Slots {midSlot + 1}–{endSlot})</span>
                        <span className="text-[10px] text-slate-400">6–10</span>
                      </div>
                      {Array.from({ length: 5 }, (_, i) =>
                        renderSlotRow(setIdx * 10 + i + 5, isGame1)
                      )}
                    </div>

                    {/* Action Buttons for this Game Set */}
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                      {/* Game 1 Specific: Series Format Selector */}
                      {isGame1 && (
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            {t.seriesFormatLabel}
                          </span>
                          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 w-full sm:w-auto">
                            {(
                              [
                                { id: 'BO1', label: t.formatBo1 },
                                { id: 'BO3', label: t.formatBo3 },
                                { id: 'BO5', label: t.formatBo5 },
                              ] as const
                            ).map((fmt) => (
                              <button
                                key={fmt.id}
                                type="button"
                                onClick={() => handleSetSeriesFormat(fmt.id)}
                                className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-bold transition truncate cursor-pointer ${
                                  liveMatch.seriesFormat === fmt.id
                                    ? 'bg-[#f1c40f] text-slate-950'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                              >
                                {fmt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Lineup Buttons */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleStartDirectLineup5v5(setNum, true)}
                          className="w-full min-w-0 min-h-[42px] px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-display font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Play className="w-4 h-4 fill-current shrink-0" />
                          <span className="truncate">
                            {isGame1 ? t.startNoShuffleBtn : `Laruin Game ${setNum} (No Shuffle)`}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleShuffle5v5(setNum, true, true)}
                          className="w-full min-w-0 min-h-[42px] px-3 py-2 rounded-xl bg-cyan-600 dark:bg-[#00f2fe] text-white dark:text-slate-950 font-display font-bold text-xs sm:text-sm hover:opacity-90 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Shuffle className="w-4 h-4 stroke-[2.5] shrink-0" />
                          <span className="truncate">
                            {isGame1 ? t.shuffleFirst10Btn : `I-shuffle Game ${setNum}`}
                          </span>
                        </button>
                      </div>

                      {/* Copy GC text & Set management */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopySingleGameSet(setIdx)}
                          className="w-full min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#0b0f19] border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-cyan-600 dark:hover:border-[#00f2fe] flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">
                            {language === 'tl' ? `Kopyahin Game ${setNum}` : `Copy Game ${setNum}`}
                          </span>
                        </button>

                        {!isGame1 ? (
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => handlePromoteSetToGame1(setIdx)}
                              className="min-h-[38px] px-2 py-1.5 rounded-xl bg-[#f1c40f] text-slate-950 font-display font-bold text-xs hover:bg-yellow-300 transition flex items-center justify-center gap-1 cursor-pointer truncate"
                              title={language === 'tl' ? "I-promote itong Game bilang Game 1" : "Promote this Game to Game 1"}
                            >
                              <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">Promote</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleClearSingleSet(setIdx)}
                              className="min-h-[38px] px-2 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500 text-rose-600 dark:text-rose-400 hover:text-white text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer truncate"
                              title={language === 'tl' ? "Burahin ang mga player sa game na ito" : "Clear players in this game"}
                            >
                              <Trash2 className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">Clear</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleCopyGcText('warmup')}
                            className="w-full min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#0b0f19] border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-cyan-600 dark:hover:border-[#00f2fe] flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-[#00f2fe] shrink-0" />
                            <span className="truncate">
                              {language === 'tl' ? 'Kopyahin Lahat ng Sets' : 'Copy All Sets'}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  </section>
                );
              })}

              {/* Add Next Game Card Prompt */}
              {activeSetCount < 5 && activeSetTab === 'all' && (
                <div
                  onClick={() => {
                    const next = activeSetCount + 1;
                    setActiveSetCount(next);
                    triggerToast(
                      language === 'tl'
                        ? `Idinagdag ang Game ${next} (Slots ${(next - 1) * 10 + 1}–${next * 10})!`
                        : `Added Game ${next} (Slots ${(next - 1) * 10 + 1}–${next * 10})!`
                    );
                  }}
                  className="p-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-cyan-500 dark:hover:border-[#00f2fe] bg-slate-50/50 dark:bg-slate-900/30 flex flex-col items-center justify-center text-center gap-3 transition cursor-pointer min-h-[300px]"
                >
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-700 dark:text-[#00f2fe] flex items-center justify-center font-bold">
                    <Plus className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-display font-bold text-slate-900 dark:text-white">
                      {language === 'tl' ? `Magdagdag ng Game ${activeSetCount + 1}` : `Add Game ${activeSetCount + 1}`}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                      {language === 'tl'
                        ? `May karagdagang participants na sasali? I-click para magbukas ng Slots ${activeSetCount * 10 + 1}–${(activeSetCount + 1) * 10}.`
                        : `More participants joining? Click to open Slots ${activeSetCount * 10 + 1}–${(activeSetCount + 1) * 10}.`}
                    </p>
                  </div>
                  <span className="px-4 py-2 rounded-xl bg-cyan-600 dark:bg-[#00f2fe] text-white dark:text-slate-950 font-bold text-xs shadow-xs">
                    {language === 'tl' ? `+ Buksan ang Game ${activeSetCount + 1}` : `+ Open Game ${activeSetCount + 1}`}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 2: CUSTOM 5v5 SHUFFLE & MATCH ROOM
           ===================================================================== */}
        {activeTab === 'match' && (
          <div className="space-y-5 sm:space-y-6">
            <section className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/85 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="min-w-0">
                  <span className="text-xs font-mono text-cyan-700 dark:text-[#00f2fe] font-semibold">
                    {t.custom5v5Badge}
                  </span>
                  <h2 className="text-lg sm:text-xl font-display font-bold text-slate-900 dark:text-white">
                    {t.custom5v5Title}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {t.custom5v5Desc}
                  </p>
                </div>

                {/* Lineup Options: No Shuffle (1-5 vs 6-10) | Auto-Balance | Shuffle Again | Copy */}
                <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2 w-full md:w-auto min-w-0">
                  <button
                    type="button"
                    onClick={() => handleStartDirectLineup5v5('batch1', false)}
                    className="min-h-[42px] px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-display font-bold text-xs flex items-center justify-center gap-1.5 min-w-0 cursor-pointer"
                  >
                    <ListOrdered className="w-4 h-4 shrink-0" />
                    <span className="truncate">{t.keepOrderBtn}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShuffle5v5('batch1', false, false)}
                    className="min-h-[42px] px-3.5 py-2 rounded-xl bg-cyan-600 dark:bg-[#00f2fe] text-white dark:text-slate-950 font-display font-bold text-xs flex items-center justify-center gap-1.5 min-w-0 cursor-pointer"
                  >
                    <Shuffle className="w-4 h-4 stroke-[2.5] shrink-0" />
                    <span className="truncate">{t.autoBalanceBtn}</span>
                  </button>
                  <div className="grid grid-cols-2 sm:flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleShuffle5v5('batch1', true, false)}
                      className="min-h-[42px] px-2.5 sm:px-3.5 py-2 rounded-xl bg-[#f1c40f] text-slate-950 font-display font-bold text-xs flex items-center justify-center gap-1.5 min-w-0 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                      <span className="truncate">{t.shuffleAgainBtn}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyGcText('match')}
                      className="min-h-[42px] px-2.5 sm:px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-[#0b0f19] border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 min-w-0 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{t.copy5v5Btn}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLineupPosterModalOpen(true)}
                      className="min-h-[42px] px-2.5 sm:px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-display font-bold text-xs flex items-center justify-center gap-1.5 min-w-0 cursor-pointer shadow-xs"
                    >
                      <Share2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{t.exportLineupPosterBtn}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Series Format (1 Game / Best of 3 / Best of 5) & Series Scoreboard */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {t.seriesFormatLabel}
                  </span>
                  <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 w-full sm:w-auto">
                    {(
                      [
                        { id: 'BO1', label: t.formatBo1 },
                        { id: 'BO3', label: t.formatBo3 },
                        { id: 'BO5', label: t.formatBo5 },
                      ] as const
                    ).map((fmt) => (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => handleSetSeriesFormat(fmt.id)}
                        className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold transition truncate cursor-pointer ${
                          liveMatch.seriesFormat === fmt.id
                            ? 'bg-[#f1c40f] text-slate-950'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {fmt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2.5 font-mono tabular-nums text-xs sm:text-sm font-bold">
                    <span className="text-slate-500 dark:text-slate-400 font-sans font-medium text-xs">
                      {t.seriesScoreLabel}:
                    </span>
                    <span className="text-cyan-700 dark:text-[#00f2fe]">
                      Blue {liveMatch.blueSeriesWins || 0}
                    </span>
                    <span className="text-slate-400">-</span>
                    <span className="text-rose-600 dark:text-rose-400">
                      {liveMatch.redSeriesWins || 0} Red
                    </span>
                  </div>
                  {((liveMatch.blueSeriesWins || 0) > 0 ||
                    (liveMatch.redSeriesWins || 0) > 0) && (
                    <button
                      type="button"
                      onClick={handleResetSeriesScore}
                      className="px-2 py-1 rounded-md bg-slate-200 dark:bg-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    >
                      {t.resetSeriesBtn}
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* MATCH FAIRNESS METER & WIN PREDICTION GAUGE */}
            {(() => {
              const winrateGap = Math.abs(blueTeamAvgWr - redTeamAvgWr);
              const isImbalanced = winrateGap > 8;
              const totalWr = Math.max(1, blueTeamAvgWr + redTeamAvgWr);
              const blueChance = Math.round((blueTeamAvgWr / totalWr) * 100);
              const redChance = 100 - blueChance;

              const userInBlue =
                linkedIgn &&
                liveMatch.teamBlue.some(
                  (p) => p.ign.toLowerCase() === linkedIgn.toLowerCase()
                );
              const userInRed =
                linkedIgn &&
                liveMatch.teamRed.some(
                  (p) => p.ign.toLowerCase() === linkedIgn.toLowerCase()
                );
              const userMember = userInBlue
                ? liveMatch.teamBlue.find(
                    (p) => p.ign.toLowerCase() === linkedIgn!.toLowerCase()
                  )
                : userInRed
                  ? liveMatch.teamRed.find(
                      (p) => p.ign.toLowerCase() === linkedIgn!.toLowerCase()
                    )
                  : null;

              return (
                <div className="space-y-3">
                  {/* Signed-in User Match Status Banner */}
                  {userMember && (
                    <div className="p-3 rounded-xl bg-gradient-to-r from-cyan-500/15 via-blue-500/15 to-purple-500/15 border border-cyan-500/35 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-cyan-500 text-slate-950 flex items-center justify-center font-bold text-xs">
                          ★
                        </div>
                        <div className="text-xs">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {t.yourRoleInMatch}:
                          </span>{' '}
                          <span
                            className={
                              userInBlue
                                ? 'text-cyan-600 dark:text-[#00f2fe] font-bold'
                                : 'text-rose-500 font-bold'
                            }
                          >
                            {userInBlue ? 'Team Blue' : 'Team Red'} (
                            {ROLE_META[userMember.assignedLane].gcLabel})
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-700 dark:text-[#00f2fe] text-[10px] font-mono font-bold">
                        {t.youBadge} ({userMember.ign})
                      </span>
                    </div>
                  )}

                  {/* Fairness & Auto-Balance Bar */}
                  <div
                    className={`p-3.5 sm:p-4 rounded-2xl border transition ${
                      isImbalanced
                        ? 'bg-amber-500/10 border-amber-500/35'
                        : 'bg-emerald-500/10 border-emerald-500/35'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Scale
                            className={`w-4 h-4 ${
                              isImbalanced
                                ? 'text-amber-500'
                                : 'text-emerald-500'
                            }`}
                          />
                          <span className="font-display font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                            {isImbalanced
                              ? t.fairnessImbalanced
                              : t.fairnessBalanced}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                              isImbalanced
                                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                                : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                            }`}
                          >
                            Δ {winrateGap.toFixed(1)}% WR
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">
                          {isImbalanced
                            ? language === 'tl'
                              ? `May ${winrateGap.toFixed(1)}% agwat sa average winrate. Pindutin ang Auto-Balance para pumantay ang lakas ng parehong koponan!`
                              : `Disparity of ${winrateGap.toFixed(1)}% WR detected. Tap Auto-Balance to equalize team power while keeping valid lane roles!`
                            : language === 'tl'
                              ? `Patas at balanseng 5v5 match para sa competitive squad scrim.`
                              : `Well-balanced 5v5 lineup for fair and competitive squad scrim.`}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleAutoBalanceCurrentMatch}
                        className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-cyan-600 dark:bg-[#00f2fe] hover:opacity-90 text-white dark:text-slate-950 font-display font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        <span>{t.autoBalanceCurrentBtn}</span>
                      </button>
                    </div>

                    {/* Esports Win Probability Bar */}
                    <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/60 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-mono font-bold">
                        <span className="text-cyan-700 dark:text-[#00f2fe]">
                          🔵 Blue {blueChance}% (Avg WR: {blueTeamAvgWr.toFixed(1)}%)
                        </span>
                        <span className="text-xs text-slate-400">
                          ⚔️ Win Prediction
                        </span>
                        <span className="text-rose-600 dark:text-rose-400">
                          🔴 Red {redChance}% (Avg WR: {redTeamAvgWr.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex">
                        <div
                          className="bg-cyan-500 transition-all duration-300"
                          style={{ width: `${blueChance}%` }}
                        />
                        <div
                          className="bg-rose-500 transition-all duration-300"
                          style={{ width: `${redChance}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* View Mode Switcher: Rosters vs Head-to-Head Lane Matchups */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setMatchViewMode('roster')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          matchViewMode === 'roster'
                            ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>{t.viewModeRoster}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setMatchViewMode('matchup')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          matchViewMode === 'matchup'
                            ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <Swords className="w-3.5 h-3.5" />
                        <span>{t.viewModeMatchup}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* LANE MATCHUP VS VIEW OR ROSTER VIEW */}
            {matchViewMode === 'matchup' ? (
              <section className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/85 border border-slate-200 dark:border-slate-800 space-y-3.5 shadow-xs overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Swords className="w-4 h-4 text-[#f1c40f]" />
                    <h3 className="text-base sm:text-lg font-display font-bold text-slate-900 dark:text-white">
                      {language === 'tl'
                        ? 'Harapan sa Bawat Lane (Lane by Lane Matchup)'
                        : 'Head-to-Head Lane Matchups'}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-500">
                    5 MLBB Positions
                  </span>
                </div>

                <div className="space-y-2.5">
                  {CORE_FIVE_ROLES.map((lane, laneIdx) => {
                    const bluePlayer = liveMatch.teamBlue[laneIdx];
                    const redPlayer = liveMatch.teamRed[laneIdx];
                    if (!bluePlayer || !redPlayer) return null;

                    const wrDiff = Number(
                      (bluePlayer.winrateSnapshot - redPlayer.winrateSnapshot).toFixed(1)
                    );
                    const isBlueFavored = wrDiff > 3;
                    const isRedFavored = wrDiff < -3;

                    const isUserBlue =
                      linkedIgn &&
                      bluePlayer.ign.toLowerCase() === linkedIgn.toLowerCase();
                    const isUserRed =
                      linkedIgn &&
                      redPlayer.ign.toLowerCase() === linkedIgn.toLowerCase();

                    return (
                      <div
                        key={lane}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3"
                      >
                        {/* Blue Side */}
                        <div
                          className={`flex items-center gap-2.5 flex-1 min-w-0 p-2 rounded-lg ${
                            isUserBlue
                              ? 'bg-cyan-500/10 ring-1 ring-cyan-500'
                              : ''
                          }`}
                        >
                          <div
                            className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${ROLE_META[bluePlayer.assignedLane].bgSubtleClass} ${ROLE_META[bluePlayer.assignedLane].borderClass} ${ROLE_META[bluePlayer.assignedLane].textClass}`}
                          >
                            <RoleIcon
                              role={bluePlayer.assignedLane}
                              className="w-4 h-4"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-cyan-700 dark:text-[#00f2fe] truncate">
                              <span className="truncate">{bluePlayer.ign}</span>
                              {isUserBlue && (
                                <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-700 dark:text-[#00f2fe] text-[9px] font-mono font-bold">
                                  ★ {t.youBadge}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                              WR:{' '}
                              <span className="font-bold text-slate-700 dark:text-slate-200">
                                {bluePlayer.winrateSnapshot}%
                              </span>
                              {bluePlayer.kda && ` · ${bluePlayer.kda}`}
                            </div>
                          </div>
                        </div>

                        {/* Center VS & Swap Opponents */}
                        <div className="flex md:flex-col items-center justify-center gap-2 px-3 py-1 shrink-0 border-y md:border-y-0 md:border-x border-slate-200 dark:border-slate-800">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-display font-bold text-slate-700 dark:text-slate-300">
                              {ROLE_META[lane].gcLabel}
                            </span>
                            <span
                              className={`text-[10px] font-mono font-bold ${
                                isBlueFavored
                                  ? 'text-cyan-600 dark:text-[#00f2fe]'
                                  : isRedFavored
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : 'text-slate-400'
                              }`}
                            >
                              {isBlueFavored
                                ? `Blue +${wrDiff}%`
                                : isRedFavored
                                  ? `Red +${Math.abs(wrDiff)}%`
                                  : 'Even'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSwapLaneOpponents(laneIdx)}
                            className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                            title="Swap lane opponents"
                          >
                            <ArrowLeftRight className="w-3 h-3" />
                            <span>{t.swapLaneBtn}</span>
                          </button>
                        </div>

                        {/* Red Side */}
                        <div
                          className={`flex items-center gap-2.5 flex-1 min-w-0 p-2 rounded-lg justify-end md:text-right ${
                            isUserRed ? 'bg-rose-500/10 ring-1 ring-rose-500' : ''
                          }`}
                        >
                          <div className="min-w-0 flex-1 md:order-1 order-2">
                            <div className="flex items-center md:justify-end gap-1.5 font-bold text-xs sm:text-sm text-rose-600 dark:text-rose-400 truncate">
                              {isUserRed && (
                                <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[9px] font-mono font-bold">
                                  ★ {t.youBadge}
                                </span>
                              )}
                              <span className="truncate">{redPlayer.ign}</span>
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                              {redPlayer.kda && `${redPlayer.kda} · `}
                              WR:{' '}
                              <span className="font-bold text-slate-700 dark:text-slate-200">
                                {redPlayer.winrateSnapshot}%
                              </span>
                            </div>
                          </div>
                          <div
                            className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 md:order-2 order-1 ${ROLE_META[redPlayer.assignedLane].bgSubtleClass} ${ROLE_META[redPlayer.assignedLane].borderClass} ${ROLE_META[redPlayer.assignedLane].textClass}`}
                          >
                            <RoleIcon
                              role={redPlayer.assignedLane}
                              className="w-4 h-4"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* TEAM BLUE */}
                <section className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/85 border border-cyan-500/40 dark:border-[#00f2fe]/35 space-y-3.5 shadow-xs overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-3">
                    <h3 className="text-base sm:text-lg font-display font-bold text-cyan-700 dark:text-[#00f2fe] truncate">
                      {t.teamBlueTitle}
                    </h3>
                    <span className="font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400 shrink-0">
                      {t.avgWrLabel}: {blueTeamAvgWr.toFixed(1)}%
                    </span>
                  </div>

                  <div className="space-y-2">
                    {liveMatch.teamBlue.map((member, idx) => {
                      const isSwapping =
                        swapSelection?.team === 'Blue' &&
                        swapSelection?.index === idx;
                      const isUser =
                        linkedIgn &&
                        member.ign.toLowerCase() === linkedIgn.toLowerCase();

                      return (
                        <div
                          key={idx}
                          className={`p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-[#0b0f19] border flex items-center justify-between gap-2 overflow-hidden transition ${
                            isSwapping
                              ? 'border-cyan-600 dark:border-[#00f2fe] ring-1 ring-cyan-600 dark:ring-[#00f2fe]'
                              : isUser
                                ? 'border-cyan-500 ring-2 ring-cyan-500/50 bg-cyan-500/5'
                                : 'border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div
                              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg border flex items-center justify-center shrink-0 ${ROLE_META[member.assignedLane].bgSubtleClass} ${ROLE_META[member.assignedLane].borderClass} ${ROLE_META[member.assignedLane].textClass}`}
                            >
                              <RoleIcon
                                role={member.assignedLane}
                                className="w-4 h-4"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                <span className="truncate">{member.ign}</span>
                                {isUser && (
                                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-700 dark:text-[#00f2fe] text-[9px] font-mono font-bold">
                                    ★ {t.youBadge}
                                  </span>
                                )}
                                <span className="text-[11px] font-mono font-normal text-slate-500 dark:text-slate-400">
                                  ({member.roleLabel})
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                <span
                                  className={`text-[11px] sm:text-xs font-mono truncate ${ROLE_META[member.assignedLane].textClass}`}
                                >
                                  {t.assignedLabel}:{' '}
                                  {ROLE_META[member.assignedLane].gcLabel}
                                </span>
                                {member.kda && (
                                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 text-[10px] font-mono font-bold text-cyan-700 dark:text-[#00f2fe]">
                                    {member.kda}
                                    {member.rating ? ` · ${member.rating}` : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSwapParticipant('Blue', idx)}
                            className={`min-h-[36px] px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 shrink-0 max-w-[125px] sm:max-w-none cursor-pointer ${
                              isSwapping
                                ? 'bg-cyan-600 dark:bg-[#00f2fe] text-white dark:text-slate-950 font-bold'
                                : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <ArrowLeftRight className="w-3 h-3 shrink-0" />
                            <span className="truncate">
                              {isSwapping ? t.selectTargetBtn : t.swapBtn}
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* TEAM RED */}
                <section className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/85 border border-rose-500/40 dark:border-rose-500/35 space-y-3.5 shadow-xs overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-3">
                    <h3 className="text-base sm:text-lg font-display font-bold text-rose-600 dark:text-rose-400 truncate">
                      {t.teamRedTitle}
                    </h3>
                    <span className="font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400 shrink-0">
                      {t.avgWrLabel}: {redTeamAvgWr.toFixed(1)}%
                    </span>
                  </div>

                  <div className="space-y-2">
                    {liveMatch.teamRed.map((member, idx) => {
                      const isSwapping =
                        swapSelection?.team === 'Red' &&
                        swapSelection?.index === idx;
                      const isUser =
                        linkedIgn &&
                        member.ign.toLowerCase() === linkedIgn.toLowerCase();

                      return (
                        <div
                          key={idx}
                          className={`p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-[#0b0f19] border flex items-center justify-between gap-2 overflow-hidden transition ${
                            isSwapping
                              ? 'border-rose-500 ring-1 ring-rose-500'
                              : isUser
                                ? 'border-rose-500 ring-2 ring-rose-500/50 bg-rose-500/5'
                                : 'border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div
                              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg border flex items-center justify-center shrink-0 ${ROLE_META[member.assignedLane].bgSubtleClass} ${ROLE_META[member.assignedLane].borderClass} ${ROLE_META[member.assignedLane].textClass}`}
                            >
                              <RoleIcon
                                role={member.assignedLane}
                                className="w-4 h-4"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                <span className="truncate">{member.ign}</span>
                                {isUser && (
                                  <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[9px] font-mono font-bold">
                                    ★ {t.youBadge}
                                  </span>
                                )}
                                <span className="text-[11px] font-mono font-normal text-slate-500 dark:text-slate-400">
                                  ({member.roleLabel})
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                <span
                                  className={`text-[11px] sm:text-xs font-mono truncate ${ROLE_META[member.assignedLane].textClass}`}
                                >
                                  {t.assignedLabel}:{' '}
                                  {ROLE_META[member.assignedLane].gcLabel}
                                </span>
                                {member.kda && (
                                  <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400">
                                    {member.kda}
                                    {member.rating ? ` · ${member.rating}` : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSwapParticipant('Red', idx)}
                            className={`min-h-[36px] px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 shrink-0 max-w-[125px] sm:max-w-none cursor-pointer ${
                              isSwapping
                                ? 'bg-rose-500 text-white font-bold'
                                : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <ArrowLeftRight className="w-3 h-3 shrink-0" />
                            <span className="truncate">
                              {isSwapping ? t.selectTargetBtn : t.swapBtn}
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}

            {/* Record Battle Result (Manual Scoring: MVP/SVP + Kill Score + Winner) */}
            <section className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/85 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3.5">
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-[#f1c40f] shrink-0" />
                    <span className="truncate">
                      {language === 'tl' ? '🏆 I-record ang Resulta ng Laban (Manual Scoring)' : '🏆 Record Battle Result (Manual Scoring)'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {language === 'tl'
                      ? 'Piliin ang nanalo (Team Blue o Red), i-set ang MVP/SVP, at i-record ang score at tagal ng laro.'
                      : 'Select winner (Team Blue or Red), set MVP/SVP, and record match score & duration.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowManualStatsEditor((v) => !v)}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-xs text-slate-700 dark:text-slate-300 font-semibold flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  <span>
                    {showManualStatsEditor
                      ? (language === 'tl' ? '▲ Itago ang Player Stats' : '▲ Hide Player Stats')
                      : (language === 'tl' ? '✏️ Detalyadong Player Stats (KDA / Damage)' : '✏️ Detailed Player Stats (KDA / Damage)')}
                  </span>
                </button>
              </div>

              {/* Detailed Player Stats Editor (Fast KDA Pickers + Typed Hero Damage & Gold) */}
              {showManualStatsEditor && (
                <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800">
                  <ManualStatsEditor
                    language={language}
                    teamBlue={liveMatch.teamBlue}
                    teamRed={liveMatch.teamRed}
                    onUpdateBluePlayer={(idx, updated) => {
                      setLiveMatch((prev) => {
                        const tb = [...prev.teamBlue];
                        tb[idx] = { ...tb[idx], ...updated };
                        return { ...prev, teamBlue: tb };
                      });
                    }}
                    onUpdateRedPlayer={(idx, updated) => {
                      setLiveMatch((prev) => {
                        const tr = [...prev.teamRed];
                        tr[idx] = { ...tr[idx], ...updated };
                        return { ...prev, teamRed: tr };
                      });
                    }}
                  />
                </div>
              )}

              {/* MVP / SVP & Kill Score Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
                {/* Team Blue Star / MVP Selector */}
                <div className="md:col-span-4 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-mono text-cyan-700 dark:text-[#00f2fe] font-semibold truncate">
                      {t.blueMvpLabel}
                    </label>
                    <button
                      type="button"
                      onClick={() => setCustomBlueMvp((v) => !v)}
                      className="text-[10px] text-cyan-600 dark:text-[#00f2fe] hover:underline cursor-pointer font-medium"
                    >
                      {customBlueMvp ? (language === 'tl' ? 'Pumili sa Roster' : 'Pick from Roster') : '✏️ Custom IGN'}
                    </button>
                  </div>
                  {customBlueMvp ? (
                    <input
                      type="text"
                      value={blueStarIgn}
                      onChange={(e) => setBlueStarIgn(e.target.value)}
                      placeholder={language === 'tl' ? "I-type ang MVP IGN o 'None'..." : "Type MVP IGN or 'None'..."}
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#0b0f19] border border-cyan-500/40 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-cyan-600"
                    />
                  ) : (
                    <select
                      value={blueStarIgn}
                      onChange={(e) => {
                        if (e.target.value === '__CUSTOM__') {
                          setCustomBlueMvp(true);
                        } else {
                          setBlueStarIgn(e.target.value);
                        }
                      }}
                      className="w-full max-w-full min-w-0 h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#0b0f19] border border-cyan-500/40 dark:border-[#00f2fe]/40 text-xs font-bold text-slate-900 dark:text-white truncate focus:outline-none focus:border-cyan-600 dark:focus:border-[#00f2fe]"
                    >
                      {liveMatch.teamBlue.map((p, idx) => (
                        <option key={`${p.ign}-${idx}`} value={p.ign}>
                          👑 {p.ign} ({ROLE_META[p.assignedLane].gcLabel}
                          {p.kda ? ` · ${p.kda}` : ''})
                        </option>
                      ))}
                      <option value="__CUSTOM__">
                        {language === 'tl' ? '✏️ I-type ang Custom / Ibang IGN...' : '✏️ Custom / Type Other IGN...'}
                      </option>
                      <option value="None">{language === 'tl' ? 'Walang MVP (None)' : 'No MVP (None)'}</option>
                    </select>
                  )}
                </div>

                {/* Kill Score & Duration (Optional) */}
                <div className="md:col-span-4 grid grid-cols-3 gap-2 min-w-0">
                  <div className="min-w-0">
                    <label className="block text-[11px] font-mono text-cyan-700 dark:text-[#00f2fe] mb-1 truncate">
                      {t.blueKillsLabel}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="999"
                      value={blueKillsInput}
                      onChange={(e) => setBlueKillsInput(e.target.value)}
                      placeholder="22"
                      className="w-full min-w-0 h-10 px-2.5 rounded-xl bg-slate-50 dark:bg-[#0b0f19] border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-center text-slate-900 dark:text-white focus:outline-none focus:border-cyan-600 dark:focus:border-[#00f2fe]"
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="block text-[11px] font-mono text-rose-600 dark:text-rose-400 mb-1 truncate">
                      {t.redKillsLabel}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="999"
                      value={redKillsInput}
                      onChange={(e) => setRedKillsInput(e.target.value)}
                      placeholder="21"
                      className="w-full min-w-0 h-10 px-2.5 rounded-xl bg-slate-50 dark:bg-[#0b0f19] border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-center text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="block text-[11px] font-mono text-slate-500 dark:text-slate-400 mb-1 truncate">
                      {t.matchDurationLabel}
                    </label>
                    <input
                      type="text"
                      value={matchDurationInput}
                      onChange={(e) => setMatchDurationInput(e.target.value)}
                      placeholder={t.matchDurationPlaceholder}
                      className="w-full min-w-0 h-10 px-2 rounded-xl bg-slate-50 dark:bg-[#0b0f19] border border-slate-300 dark:border-slate-700 text-xs font-mono text-center text-slate-900 dark:text-white focus:outline-none focus:border-cyan-600 dark:focus:border-[#00f2fe]"
                    />
                  </div>
                </div>

                {/* Team Red Star / MVP Selector */}
                <div className="md:col-span-4 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-mono text-rose-600 dark:text-rose-400 font-semibold truncate">
                      {t.redMvpLabel}
                    </label>
                    <button
                      type="button"
                      onClick={() => setCustomRedMvp((v) => !v)}
                      className="text-[10px] text-rose-600 dark:text-rose-400 hover:underline cursor-pointer font-medium"
                    >
                      {customRedMvp ? (language === 'tl' ? 'Pumili sa Roster' : 'Pick from Roster') : '✏️ Custom IGN'}
                    </button>
                  </div>
                  {customRedMvp ? (
                    <input
                      type="text"
                      value={redStarIgn}
                      onChange={(e) => setRedStarIgn(e.target.value)}
                      placeholder={language === 'tl' ? "I-type ang MVP IGN o 'None'..." : "Type MVP IGN or 'None'..."}
                      className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#0b0f19] border border-rose-500/40 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                    />
                  ) : (
                    <select
                      value={redStarIgn}
                      onChange={(e) => {
                        if (e.target.value === '__CUSTOM__') {
                          setCustomRedMvp(true);
                        } else {
                          setRedStarIgn(e.target.value);
                        }
                      }}
                      className="w-full max-w-full min-w-0 h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#0b0f19] border border-rose-500/40 text-xs font-bold text-slate-900 dark:text-white truncate focus:outline-none focus:border-rose-500"
                    >
                      {liveMatch.teamRed.map((p, idx) => (
                        <option key={`${p.ign}-${idx}`} value={p.ign}>
                          👑 {p.ign} ({ROLE_META[p.assignedLane].gcLabel}
                          {p.kda ? ` · ${p.kda}` : ''})
                        </option>
                      ))}
                      <option value="__CUSTOM__">
                        {language === 'tl' ? '✏️ I-type ang Custom / Ibang IGN...' : '✏️ Custom / Type Other IGN...'}
                      </option>
                      <option value="None">{language === 'tl' ? 'Walang MVP (None)' : 'No MVP (None)'}</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Winner Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleFinishMatch('Blue')}
                  className="min-h-[46px] px-4 sm:px-5 py-2.5 rounded-xl bg-cyan-600 dark:bg-[#00f2fe] text-white dark:text-slate-950 font-display font-bold text-xs sm:text-sm hover:opacity-95 transition flex items-center justify-center gap-2 truncate cursor-pointer"
                >
                  <Trophy className="w-4 h-4 shrink-0" />
                  <span className="truncate">
                    {t.blueWonBtn} (👑 MVP: {blueStarIgn || liveMatch.teamBlue[0]?.ign})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFinishMatch('Red')}
                  className="min-h-[46px] px-4 sm:px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-display font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 truncate cursor-pointer"
                >
                  <Trophy className="w-4 h-4 shrink-0" />
                  <span className="truncate">
                    {t.redWonBtn} (👑 MVP: {redStarIgn || liveMatch.teamRed[0]?.ign})
                  </span>
                </button>
              </div>
            </section>

            {/* Recent Battle Results (Match History Log) */}
            <section className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/85 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <History className="w-4 h-4 text-cyan-600 dark:text-[#00f2fe] shrink-0" />
                    <span className="truncate">{t.matchHistoryTitle}</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t.matchHistoryDesc}
                  </p>
                </div>

                {isAdmin && matchHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearMatchHistory}
                    className="self-start sm:self-auto min-h-[36px] px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white text-xs font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{t.clearHistoryBtn}</span>
                  </button>
                )}
              </div>

              {matchHistory.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                  {t.emptyHistoryText}
                </div>
              ) : (
                <div className="space-y-3">
                  {matchHistory.slice(0, 10).map((record, idx) => {
                    const isBlueWin = record.winner === 'Blue';
                    return (
                      <div
                        key={`${record.id}-${record.completedAt}-${idx}`}
                        className="p-3 sm:p-4 rounded-xl bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 space-y-2.5 overflow-hidden"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2 min-w-0">
                            <span
                              className={`px-2.5 py-0.5 rounded-md text-[11px] font-display font-bold uppercase ${
                                isBlueWin
                                  ? 'bg-cyan-500/15 text-cyan-700 dark:text-[#00f2fe] border border-cyan-500/30'
                                  : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              {isBlueWin ? '🔵 Team Blue Victory' : '🔴 Team Red Victory'}
                            </span>
                            {record.killScore && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200">
                                ⚔️ {record.killScore}
                              </span>
                            )}
                            <span className="text-[11px] font-mono text-slate-500">
                              {record.id} · {record.completedAt}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Input / Edit Match Stats Button (Admin feature) */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditMatchStats(record)}
                              className="min-h-[34px] px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-[#00f2fe] border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                              title={
                                isAdmin
                                  ? 'Mag-input o mag-edit ng stats (KDA, Hero Damage, Gold)'
                                  : 'Admin Only: Mag-input o mag-edit ng match stats'
                              }
                            >
                              <Edit3 className="w-3.5 h-3.5 shrink-0" />
                              <span>Input / Edit Stats</span>
                              {!isAdmin && (
                                <Lock className="w-3 h-3 text-slate-400 shrink-0 ml-0.5" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleCopyBattleResult(record)}
                              className="min-h-[34px] px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-cyan-600 dark:hover:border-[#00f2fe] text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{t.copyResultBtn}</span>
                            </button>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteMatchHistoryItem(record.id)
                                }
                                className="h-8 w-8 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-600 dark:text-rose-400 hover:text-white inline-flex items-center justify-center transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* MVP, SVP & Tanso Highlights */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 dark:bg-[#f1c40f]/15 border border-amber-500/35 text-amber-800 dark:text-[#f1c40f] font-bold">
                            <Crown className="w-3.5 h-3.5 shrink-0" />
                            <span>Match MVP: {record.mvpIgn}</span>
                          </span>
                          {record.svpIgn && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/35 text-purple-700 dark:text-purple-300 font-semibold">
                              <Shield className="w-3.5 h-3.5 shrink-0" />
                              <span>Defeat MVP (SVP): {record.svpIgn}</span>
                            </span>
                          )}
                          {(() => {
                            const tansos =
                              record.feederIgns && record.feederIgns.length > 0
                                ? record.feederIgns
                                : record.feederIgn
                                  ? [record.feederIgn]
                                  : [];
                            if (tansos.length === 0) return null;
                            return (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-900/20 border border-amber-700/40 text-amber-600 dark:text-amber-400 font-semibold">
                                <Skull className="w-3.5 h-3.5 shrink-0" />
                                <span>
                                  {language === 'tl' ? `Tanso (${tansos.length})` : `Bronze (${tansos.length})`}: {tansos.join(', ')}
                                </span>
                              </span>
                            );
                          })()}
                        </div>

                        {/* Compact Team Rosters */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px] font-mono">
                          <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 truncate">
                            <span className="font-bold text-cyan-700 dark:text-[#00f2fe]">
                              Blue:{' '}
                            </span>
                            <span className="text-slate-700 dark:text-slate-300">
                              {record.teamBlue
                                .map((p) =>
                                  p.kda ? `${p.ign} (${p.kda})` : p.ign
                                )
                                .join(', ')}
                            </span>
                          </div>
                          <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 truncate">
                            <span className="font-bold text-rose-600 dark:text-rose-400">
                              Red:{' '}
                            </span>
                            <span className="text-slate-700 dark:text-slate-300">
                              {record.teamRed
                                .map((p) =>
                                  p.kda ? `${p.ign} (${p.kda})` : p.ign
                                )
                                .join(', ')}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* =====================================================================
            TAB: GAME STATS & LOGS (ADVANCE OCR STATS & POSTER GENERATOR)
           ===================================================================== */}
        {activeTab === 'stats' && (
          <GameStatsTab
            language={language}
            matchHistory={matchHistory}
            onEditMatchStats={handleOpenEditMatchStats}
            isAdmin={isAdmin}
          />
        )}

        {/* =====================================================================
            TAB 3: LEADERBOARD STANDINGS
           ===================================================================== */}
        {activeTab === 'leaderboard' && (
          <section className="p-3.5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900/85 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="min-w-0">
                <h2 className="text-lg font-display font-bold text-slate-900 dark:text-white">
                  {t.leaderboardTitle}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t.leaderboardDesc}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto min-w-0">
                <button
                  type="button"
                  onClick={() => setShowLeaderboardSummaryModal(true)}
                  className="min-h-[36px] px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-yellow-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer shrink-0"
                >
                  <Trophy className="w-3.5 h-3.5 shrink-0" />
                  <span>🏆 GC Leaderboards Summary / Sync</span>
                </button>

                <div className="relative w-full sm:w-44 min-w-0">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.searchIgnPlaceholder}
                    className="w-full h-10 sm:h-9 pl-8 pr-3 rounded-lg bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-600 dark:focus:border-[#00f2fe]"
                  />
                </div>

                <div className="grid grid-cols-4 sm:flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 rounded-lg min-w-0">
                  {(
                    [
                      { id: 'wins', label: t.sortWins },
                      { id: 'mvp', label: t.sortMvp },
                      { id: 'winrate', label: t.sortWr },
                      { id: 'matches', label: t.sortGames },
                    ] as const
                  ).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setLeaderboardSort(s.id)}
                      className={`min-h-[34px] sm:min-h-0 px-2 sm:px-2.5 py-1.5 sm:py-1 rounded text-xs font-medium text-center truncate cursor-pointer ${
                        leaderboardSort === s.id
                          ? 'bg-cyan-600 dark:bg-[#00f2fe] text-white dark:text-slate-950 font-bold'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Developer / Admin Leaderboard Toolbar (Hidden from regular users) */}
            {isAdmin && (
              <div className="p-3 rounded-xl bg-amber-500/10 dark:bg-[#f1c40f]/10 border border-amber-500/30 dark:border-[#f1c40f]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 text-xs font-medium text-amber-800 dark:text-[#f1c40f] min-w-0">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span className="truncate">{t.adminUnlockedBadge}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {players.length === 0 ? (
                    <button
                      type="button"
                      onClick={handleRestoreSamplePlayers}
                      className="min-h-[36px] px-3 py-1.5 rounded-lg bg-cyan-600 dark:bg-[#00f2fe] text-white dark:text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                      <span>{t.restoreDefaultsBtn}</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleClearAllLeaderboardPlayers}
                        className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                          confirmClearAll
                            ? 'bg-rose-600 text-white'
                            : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {confirmClearAll
                            ? t.confirmClearLeaderboardBtn
                            : t.clearLeaderboardBtn}
                        </span>
                      </button>
                      {confirmClearAll && (
                        <button
                          type="button"
                          onClick={() => setConfirmClearAll(false)}
                          className="min-h-[36px] px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                        >
                          {t.cancelBtn}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Signed-in User Standings Spotlight */}
            {linkedIgn && (() => {
              const myRankIdx = sortedLeaderboard.findIndex(
                (p) => p.ign.toLowerCase() === linkedIgn.toLowerCase()
              );
              if (myRankIdx === -1) return null;
              const myProfile = sortedLeaderboard[myRankIdx];
              return (
                <div className="p-3 sm:p-3.5 rounded-xl bg-gradient-to-r from-cyan-500/15 via-blue-500/10 to-amber-500/15 border border-cyan-500/40 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-cyan-600 dark:bg-[#00f2fe] text-white dark:text-slate-950 flex items-center justify-center font-bold text-xs shrink-0">
                      #{myRankIdx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                        <span>
                          {language === 'tl'
                            ? 'Iyong Standing sa NGD'
                            : 'Your NGD Leaderboard Standing'}
                          :
                        </span>
                        <span className="text-cyan-700 dark:text-[#00f2fe]">
                          {myProfile.ign}
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-700 dark:text-[#00f2fe] text-[9px] font-mono">
                          ★ {t.youBadge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Rank #{myRankIdx + 1} of {sortedLeaderboard.length} clan players
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 text-xs font-mono font-bold">
                    <span className="px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                      {myProfile.wins}W - {myProfile.losses}L
                    </span>
                    <span className="px-2 py-1 rounded-md bg-amber-500/15 text-amber-700 dark:text-[#f1c40f]">
                      👑 {myProfile.mvpCount} MVPs
                    </span>
                    <span className="px-2 py-1 rounded-md bg-cyan-500/15 text-cyan-700 dark:text-[#00f2fe]">
                      {calcWinrate(myProfile.wins, myProfile.losses)}% WR
                    </span>
                  </div>
                </div>
              );
            })()}

            <div className="w-full overflow-x-auto">
              <table className="w-full table-fixed sm:table-auto text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] sm:text-xs font-mono text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-1.5 sm:px-2 w-8">#</th>
                    <th className="py-2.5 px-1.5 sm:px-2">{t.colPlayer}</th>
                    <th className="hidden sm:table-cell py-2.5 px-2.5">
                      {t.colRole}
                    </th>
                    <th className="hidden sm:table-cell py-2.5 px-2.5 text-right">
                      {t.colGames}
                    </th>
                    <th className="py-2.5 px-1 sm:px-2 text-right whitespace-nowrap w-18 sm:w-auto">
                      {t.colWL}
                    </th>
                    <th className="py-2.5 px-1 sm:px-2 text-right whitespace-nowrap w-12 sm:w-auto">
                      {t.colMvp}
                    </th>
                    <th className="py-2.5 px-1 sm:px-2 text-right whitespace-nowrap w-14 sm:w-auto">
                      {t.colWinrate}
                    </th>
                    {isAdmin && (
                      <th className="py-2.5 px-1 sm:px-2 text-right w-9 sm:w-14">
                        {t.colAction}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70 text-xs sm:text-sm">
                  {sortedLeaderboard.length === 0 ? (
                    <tr>
                      <td
                        colSpan={isAdmin ? 8 : 7}
                        className="py-8 px-4 text-center text-xs text-slate-500 dark:text-slate-400"
                      >
                        {t.emptyLeaderboard}
                      </td>
                    </tr>
                  ) : (
                    sortedLeaderboard.map((player, idx) => {
                      const total = player.wins + player.losses;
                      const wr = calcWinrate(player.wins, player.losses);
                      const isMyRow =
                        Boolean(linkedIgn) &&
                        player.ign.toLowerCase() === linkedIgn!.toLowerCase();

                      return (
                        <tr
                          key={`${player.id}-${player.ign}-${idx}`}
                          className={`transition ${
                            isMyRow
                              ? 'bg-cyan-500/10 dark:bg-cyan-950/30 hover:bg-cyan-500/15 ring-1 ring-cyan-500'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                          }`}
                        >
                          <td className="py-2.5 px-1 sm:px-2 font-mono tabular-nums text-xs font-bold text-amber-600 dark:text-[#f1c40f]">
                            #{idx + 1}
                          </td>
                          <td className="py-2.5 px-1 sm:px-2 font-bold text-slate-900 dark:text-white min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="truncate">{player.ign}</span>
                              {isMyRow && (
                                <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-700 dark:text-[#00f2fe] text-[9px] font-mono font-bold shrink-0">
                                  ★ {t.youBadge}
                                </span>
                              )}
                            </div>
                            <div className="sm:hidden mt-0.5 min-w-0">
                              <RoleBadge
                                role={player.primaryRole}
                                customLabel={player.roleLabel}
                              />
                            </div>
                          </td>
                          <td className="hidden sm:table-cell py-2.5 px-2.5">
                            <RoleBadge
                              role={player.primaryRole}
                              customLabel={player.roleLabel}
                            />
                          </td>
                          <td className="hidden sm:table-cell py-2.5 px-2.5 text-right font-mono tabular-nums text-xs text-slate-600 dark:text-slate-300">
                            {total}
                          </td>
                          <td className="py-2.5 px-1 sm:px-2 text-right font-mono tabular-nums text-xs whitespace-nowrap">
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {player.wins}W
                            </span>{' '}
                            -{' '}
                            <span className="text-rose-600 dark:text-rose-400">
                              {player.losses}L
                            </span>
                          </td>
                          <td className="py-2.5 px-1 sm:px-2 text-right font-mono tabular-nums font-bold text-xs text-amber-600 dark:text-[#f1c40f] whitespace-nowrap">
                            👑 {player.mvpCount || 0}
                          </td>
                          <td className="py-2.5 px-1 sm:px-2 text-right font-mono tabular-nums font-bold text-xs text-cyan-700 dark:text-[#00f2fe] whitespace-nowrap">
                            {wr.toFixed(1)}%
                          </td>
                          {isAdmin && (
                            <td className="py-2.5 px-1 sm:px-2 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteLeaderboardPlayer(player.ign)
                                }
                                title={t.deletePlayerTitle}
                                className="h-8 w-8 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-600 dark:text-rose-400 hover:text-white inline-flex items-center justify-center transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* =====================================================================
            TAB 4: SETTINGS (APPEARANCE LIGHT/DARK/SYSTEM & LANGUAGE EN/TL)
           ===================================================================== */}
        {activeTab === 'settings' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <section className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900/85 border border-slate-200 dark:border-slate-800 space-y-6 shadow-xs">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
                <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white">
                  {t.settingsTitle}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {t.settingsDesc}
                </p>
              </div>

              {/* Appearance Selector: Light / Dark / System */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                    {t.appearanceTitle}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t.appearanceDesc}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(
                    [
                      {
                        id: 'light',
                        label: t.themeLight,
                        desc: t.themeLightDesc,
                        icon: Sun,
                      },
                      {
                        id: 'dark',
                        label: t.themeDark,
                        desc: t.themeDarkDesc,
                        icon: Moon,
                      },
                      {
                        id: 'system',
                        label: t.themeSystem,
                        desc: t.themeSystemDesc,
                        icon: Monitor,
                      },
                    ] as const
                  ).map((item) => {
                    const IconComponent = item.icon;
                    const active = themeMode === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setThemeMode(item.id)}
                        className={`p-4 rounded-xl border text-left transition flex flex-col justify-between gap-3 cursor-pointer ${
                          active
                            ? 'bg-cyan-500/10 dark:bg-[#00f2fe]/10 border-cyan-600 dark:border-[#00f2fe] ring-1 ring-cyan-600 dark:ring-[#00f2fe]'
                            : 'bg-slate-50 dark:bg-[#0b0f19] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <IconComponent
                            className={`w-5 h-5 ${
                              active
                                ? 'text-cyan-700 dark:text-[#00f2fe]'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          />
                          {active && (
                            <Check className="w-4 h-4 text-cyan-700 dark:text-[#00f2fe]" />
                          )}
                        </div>
                        <div>
                          <div className="font-display font-bold text-sm text-slate-900 dark:text-white">
                            {item.label}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {item.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Language Selector: English / Tagalog */}
              <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                    {t.languageTitle}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t.languageDesc}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(
                    [
                      {
                        id: 'en',
                        label: t.langEnglish,
                        desc: t.langEnglishDesc,
                        code: 'EN',
                      },
                      {
                        id: 'tl',
                        label: t.langTagalog,
                        desc: t.langTagalogDesc,
                        code: 'TL',
                      },
                    ] as const
                  ).map((item) => {
                    const active = language === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setLanguage(item.id)}
                        className={`p-4 rounded-xl border text-left transition flex items-start justify-between gap-3 cursor-pointer ${
                          active
                            ? 'bg-amber-500/10 dark:bg-[#f1c40f]/10 border-amber-500 dark:border-[#f1c40f] ring-1 ring-amber-500 dark:ring-[#f1c40f]'
                            : 'bg-slate-50 dark:bg-[#0b0f19] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                              active
                                ? 'bg-[#f1c40f] text-slate-950'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {item.code}
                          </div>
                          <div>
                            <div className="font-display font-bold text-sm text-slate-900 dark:text-white">
                              {item.label}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {item.desc}
                            </div>
                          </div>
                        </div>

                        {active && (
                          <Check className="w-4 h-4 text-amber-600 dark:text-[#f1c40f] shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Developer / Admin Access Lock */}
              <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-500 dark:text-[#f1c40f] shrink-0" />
                    <span>{t.adminTitle}</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {t.adminDesc}
                  </p>
                </div>

                {isAdmin ? (
                  <div className="p-4 rounded-xl bg-amber-500/10 dark:bg-[#f1c40f]/10 border border-amber-500/35 dark:border-[#f1c40f]/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 text-xs font-semibold text-amber-800 dark:text-[#f1c40f]">
                      <Unlock className="w-4 h-4 shrink-0" />
                      <span>{t.adminUnlockedBadge}</span>
                    </div>
                    {adminPinUnlocked && (
                      <button
                        type="button"
                        onClick={handleLockAdmin}
                        className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-rose-500 hover:text-white transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5 shrink-0" />
                        <span>{t.adminLockBtn}</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <form
                    onSubmit={handleUnlockAdminPin}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
                  >
                    <input
                      type="password"
                      value={adminPinInput}
                      onChange={(e) => setAdminPinInput(e.target.value)}
                      placeholder={t.adminPinPlaceholder}
                      className="flex-1 min-w-0 h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-[#0b0f19] border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 dark:focus:border-[#f1c40f]"
                    />
                    <button
                      type="submit"
                      className="min-h-[40px] px-4 py-2 rounded-xl bg-[#f1c40f] text-slate-950 font-display font-bold text-xs hover:bg-yellow-300 transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <Unlock className="w-3.5 h-3.5 shrink-0" />
                      <span>{t.adminUnlockBtn}</span>
                    </button>
                  </form>
                )}
              </div>

              {/* Google Account Sign-In */}
              <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                    {t.accountTitle}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t.accountDesc}
                  </p>
                </div>

                {user ? (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {t.signedInAs}
                      </div>
                      <div className="font-display font-bold text-sm text-slate-900 dark:text-white">
                        {user.displayName || user.email}
                      </div>
                      {user.email && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {user.email}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        void signOut();
                      }}
                      className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-rose-500 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{t.signOutBtn}</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2.5">
                      <button
                        type="button"
                        disabled={signingIn}
                        onClick={async () => {
                          const res = await signInWithGoogle();
                          if (res.ok) {
                            triggerToast(
                              language === 'tl'
                                ? 'Matagumpay na naka-sign in sa Google!'
                                : 'Successfully signed in with Google!'
                            );
                          } else if (res.error) {
                            triggerToast(res.error);
                          }
                        }}
                        className="min-h-[42px] px-4 py-2 rounded-xl bg-cyan-600 dark:bg-[#00f2fe] text-white dark:text-slate-950 font-display font-bold text-xs sm:text-sm hover:opacity-90 disabled:opacity-60 transition flex items-center gap-2 cursor-pointer"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>
                          {signingIn
                            ? language === 'tl'
                              ? 'Nagbubukas ng Google Sign-In...'
                              : 'Opening Google Sign-In...'
                            : t.signInGoogleBtn}
                        </span>
                      </button>
                      {authError && (
                        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-medium text-amber-800 dark:text-amber-300 space-y-2.5">
                          <div>{authError}</div>
                          {(authErrorCode === 'auth/unauthorized-domain' ||
                            authError.toLowerCase().includes('whitelist')) && (
                            <div className="p-3 rounded-lg bg-white/80 dark:bg-[#0b0f19]/90 border border-amber-500/30 space-y-2 text-[11px] text-slate-700 dark:text-slate-300">
                              <div className="font-display font-bold text-slate-900 dark:text-white">
                                {language === 'tl'
                                  ? 'Paano i-whitelist ang domain na ito sa Firebase:'
                                  : 'How to whitelist this domain in Firebase:'}
                              </div>
                              <ol className="list-decimal list-inside space-y-1">
                                <li>
                                  {language === 'tl'
                                    ? 'Kopyahin ang iyong domain sa ibaba (walang https:// o /).'
                                    : 'Copy your domain below (without https:// or /).'}
                                </li>
                                <li>
                                  {language === 'tl'
                                    ? 'Buksan ang Firebase Console → Authentication → Settings → Authorized domains.'
                                    : 'Open Firebase Console → Authentication → Settings → Authorized domains.'}
                                </li>
                                <li>
                                  {language === 'tl'
                                    ? 'I-click ang "Add domain", i-paste ang domain, at pindutin ang "Add".'
                                    : 'Click "Add domain", paste the domain, and click "Add".'}
                                </li>
                              </ol>
                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const host =
                                      typeof window !== 'undefined'
                                        ? window.location.hostname
                                        : '';
                                    if (host && navigator.clipboard) {
                                      void navigator.clipboard.writeText(host);
                                      triggerToast(
                                        language === 'tl'
                                          ? `Nakopya ang domain: ${host}`
                                          : `Copied domain: ${host}`
                                      );
                                    }
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 font-mono font-bold text-amber-900 dark:text-[#f1c40f] hover:bg-amber-500/30 transition flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>
                                    {typeof window !== 'undefined'
                                      ? window.location.hostname
                                      : 'Copy Domain'}
                                  </span>
                                </button>
                                <a
                                  href={`https://console.firebase.google.com/project/${activeFirebaseProjectId}/authentication/settings`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1.5 rounded-lg bg-cyan-600 dark:bg-[#00f2fe] text-white dark:text-slate-950 font-display font-bold hover:opacity-90 transition inline-flex items-center gap-1.5"
                                >
                                  <span>
                                    {language === 'tl'
                                      ? 'Buksan ang Firebase Authorized Domains ↗'
                                      : 'Open Firebase Authorized Domains ↗'}
                                  </span>
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Direct Squad Account Sign-In (Works on all deployed domains / Vercel / Mobile browsers) */}
                    <form
                      noValidate
                      onSubmit={(e) => {
                        e.preventDefault();
                        const cleanEmail = squadSignInEmail.trim().toLowerCase();
                        const cleanName = squadSignInName.trim();
                        if (!cleanEmail || !cleanEmail.includes('@')) {
                          triggerToast(
                            language === 'tl'
                              ? 'Maglagay ng valid na Email address.'
                              : 'Please enter a valid Email address.'
                          );
                          return;
                        }
                        const isEnteringAdminEmail =
                          ADMIN_EMAILS.includes(cleanEmail);
                        if (
                          isEnteringAdminEmail &&
                          !adminPinUnlocked &&
                          !isValidAdminPin(squadSignInPin)
                        ) {
                          triggerToast(
                            language === 'tl'
                              ? 'Kailangan ang tamang Admin PIN (2408 o ngd2019) para sa Admin Email.'
                              : 'Valid Admin PIN (2408 or ngd2019) is required for Admin Email sign-in.'
                          );
                          return;
                        }
                        if (
                          isEnteringAdminEmail &&
                          (adminPinUnlocked || isValidAdminPin(squadSignInPin))
                        ) {
                          setAdminPinUnlocked(true);
                          try {
                            localStorage.setItem(
                              STORAGE_KEYS.adminUnlocked,
                              'true'
                            );
                          } catch {
                            // Ignore storage error
                          }
                        }
                        signInWithSquadAccount({
                          displayName: cleanName || cleanEmail.split('@')[0],
                          email: cleanEmail,
                        });
                        setSquadSignInName('');
                        setSquadSignInEmail('');
                        setSquadSignInPin('');
                        triggerToast(
                          language === 'tl'
                            ? 'Naka-sign in na ang iyong Squad Account!'
                            : 'Squad Account signed in successfully!'
                        );
                      }}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {language === 'tl'
                            ? 'Direct Squad Account Sign-In (Para sa Deployed Link / Mobile Browser)'
                            : 'Direct Squad Account Sign-In (For Deployed Link / Mobile Browser)'}
                        </div>
                        {adminPinUnlocked && (
                          <button
                            type="button"
                            onClick={() => {
                              signInWithSquadAccount({
                                displayName: 'Developer Admin',
                                email: ADMIN_EMAILS[0],
                              });
                              triggerToast(
                                language === 'tl'
                                  ? 'Naka-sign in na bilang Developer Admin!'
                                  : 'Signed in as Developer Admin!'
                              );
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/35 text-[11px] font-bold text-amber-700 dark:text-[#f1c40f] hover:bg-amber-500/25 transition cursor-pointer"
                          >
                            ⚡ Quick Admin Sign-In ({ADMIN_EMAILS[0]})
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={squadSignInName}
                          onChange={(e) => setSquadSignInName(e.target.value)}
                          placeholder={
                            language === 'tl'
                              ? 'IGN o Pangalan (hal. Estranghero)'
                              : 'IGN or Name (e.g. Estranghero)'
                          }
                          className="min-h-[40px] px-3 py-2 rounded-lg bg-white dark:bg-[#111827] border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                        />
                        <input
                          type="email"
                          value={squadSignInEmail}
                          onChange={(e) => setSquadSignInEmail(e.target.value)}
                          placeholder="Email (e.g. player@gmail.com)"
                          className="min-h-[40px] px-3 py-2 rounded-lg bg-white dark:bg-[#111827] border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      {ADMIN_EMAILS.includes(
                        squadSignInEmail.trim().toLowerCase()
                      ) &&
                        !adminPinUnlocked && (
                          <input
                            type="password"
                            value={squadSignInPin}
                            onChange={(e) => setSquadSignInPin(e.target.value)}
                            placeholder={
                              language === 'tl'
                                ? 'Ilagay ang Admin PIN (2408 o ngd2019) para sa Admin Email'
                                : 'Enter Admin PIN (2408 or ngd2019) to verify Admin Email'
                            }
                            className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-white dark:bg-[#111827] border border-amber-500/50 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-400"
                          />
                        )}
                      <button
                        type="submit"
                        className="min-h-[38px] px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-800 text-white font-display font-bold text-xs hover:bg-slate-800 dark:hover:bg-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>
                          {language === 'tl'
                            ? 'Mag-Sign In gamit ang Email / IGN'
                            : 'Sign In with Email / IGN'}
                        </span>
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-white/95 dark:bg-[#0b0f19]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 grid grid-cols-5 items-center px-1"
      >
        <button
          type="button"
          onClick={() => setActiveTab('queue')}
          className={`min-h-[46px] min-w-0 px-0.5 flex flex-col items-center justify-center rounded-lg cursor-pointer ${
            activeTab === 'queue'
              ? 'text-cyan-700 dark:text-[#00f2fe]'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Users className="w-4 h-4 shrink-0" />
          <span className="w-full text-[9px] font-semibold mt-0.5 truncate text-center">
            {t.navSlotsShort}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('match')}
          className={`min-h-[46px] min-w-0 px-0.5 flex flex-col items-center justify-center rounded-lg cursor-pointer ${
            activeTab === 'match'
              ? 'text-cyan-700 dark:text-[#00f2fe]'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Swords className="w-4 h-4 shrink-0" />
          <span className="w-full text-[9px] font-semibold mt-0.5 truncate text-center">
            {t.navMatchShort}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('stats')}
          className={`min-h-[46px] min-w-0 px-0.5 flex flex-col items-center justify-center rounded-lg cursor-pointer ${
            activeTab === 'stats'
              ? 'text-cyan-700 dark:text-[#00f2fe]'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <BarChart3 className="w-4 h-4 shrink-0" />
          <span className="w-full text-[9px] font-semibold mt-0.5 truncate text-center">
            {t.navStatsShort}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('leaderboard')}
          className={`min-h-[46px] min-w-0 px-0.5 flex flex-col items-center justify-center rounded-lg cursor-pointer ${
            activeTab === 'leaderboard'
              ? 'text-cyan-700 dark:text-[#00f2fe]'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Trophy className="w-4 h-4 shrink-0" />
          <span className="w-full text-[9px] font-semibold mt-0.5 truncate text-center">
            {t.navLeaderboardShort}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`min-h-[46px] min-w-0 px-0.5 flex flex-col items-center justify-center rounded-lg cursor-pointer ${
            activeTab === 'settings'
              ? 'text-cyan-700 dark:text-[#00f2fe]'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Settings className="w-4 h-4 shrink-0" />
          <span className="w-full text-[9px] font-semibold mt-0.5 truncate text-center">
            {t.navSettingsShort}
          </span>
        </button>
      </nav>

      {/* Pre-Match Lineup Poster Modal */}
      {lineupPosterModalOpen && (
        <MatchPosterModal
          language={language}
          match={{
            id: liveMatch.matchId || 'CUSTOM-5V5-LINEUP',
            roomName: liveMatch.roomName || 'Custom 5v5 Scrim',
            completedAt: liveMatch.startedAt || 'Now',
            winner: 'Blue',
            teamBlue: liveMatch.teamBlue,
            teamRed: liveMatch.teamRed,
            mvpIgn: liveMatch.mvpIgn || liveMatch.teamBlue[0]?.ign || 'Player',
            durationText: liveMatch.seriesFormat || 'BO1',
            blueAvgWr: blueTeamAvgWr,
            redAvgWr: redTeamAvgWr,
          }}
          onClose={() => setLineupPosterModalOpen(false)}
        />
      )}

      {/* Scrim Results & Messenger GC Leaderboards Modal */}
      {showLeaderboardSummaryModal && (
        <LeaderboardSummaryModal
          language={language}
          matchHistory={matchHistory}
          players={players}
          onClose={() => setShowLeaderboardSummaryModal(false)}
          onCopiedToast={(msg) => triggerToast(msg)}
          onImportLeaderboardStats={(importedStats) => {
            setPlayers((prev) => {
              const next = [...prev];
              for (const s of importedStats) {
                const idx = next.findIndex(
                  (p) => p.ign.toLowerCase() === s.ign.toLowerCase()
                );
                if (idx !== -1) {
                  next[idx] = {
                    ...next[idx],
                    mythicStars: Math.max(50, Math.round(s.overallRating / 10)),
                    wins: Math.max(next[idx].wins, s.wins),
                    mvpCount: Math.max(next[idx].mvpCount || 0, s.mvps),
                  };
                } else {
                  next.push({
                    id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    ign: s.ign,
                    squadTag: 'NGD',
                    primaryRole: 'Flex Role',
                    secondaryRole: 'Flex Role',
                    roleLabel: 'Multi',
                    wins: s.wins || 5,
                    losses: Math.max(1, (s.games || 8) - (s.wins || 5)),
                    mvpCount: s.mvps || 1,
                    streak: 1,
                    roleCounts: {
                      Jungle: 1,
                      'EXP Lane': 1,
                      'Mid Lane': 1,
                      'Gold Lane': 1,
                      Roamer: 1,
                      'Flex Role': 1,
                    },
                    recentForm: ['W'],
                    signatureHeroes: [],
                    mythicStars: Math.max(50, Math.round(s.overallRating / 10)),
                  });
                }
              }
              return next;
            });
          }}
        />
      )}

      {/* Claim / Link MLBB IGN Modal */}
      {claimIgnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-600 dark:text-[#00f2fe] flex items-center justify-center font-bold">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-display font-bold text-slate-900 dark:text-white">
                    {t.claimIgnTitle}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {user?.email || 'Naka-login'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setClaimIgnModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg p-1 cursor-pointer"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              {t.claimIgnDesc}
            </p>

            {/* Quick Pick from Existing Squad Roster */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                {language === 'tl' ? 'Pumili sa Squad Roster o Mag-type:' : 'Pick from Squad Roster or Type Below:'}
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1.5 rounded-xl bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800">
                {players.slice(0, 20).map((p) => (
                  <button
                    key={p.ign}
                    type="button"
                    onClick={() => setClaimIgnInput(p.ign)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      claimIgnInput.toLowerCase() === p.ign.toLowerCase()
                        ? 'bg-cyan-600 dark:bg-[#00f2fe] text-white dark:text-slate-950 font-bold'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-cyan-500'
                    }`}
                  >
                    {p.ign} ({ROLE_META[p.primaryRole]?.shortLabel || 'FLEX'})
                  </button>
                ))}
              </div>
            </div>

            {/* Input custom IGN */}
            <div className="space-y-1">
              <label className="block text-xs font-mono text-slate-600 dark:text-slate-400">
                O i-type ang MLBB IGN mo:
              </label>
              <input
                type="text"
                value={claimIgnInput}
                onChange={(e) => setClaimIgnInput(e.target.value)}
                placeholder="hal. joshy, Setsuko, LUX..."
                className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#0b0f19] border border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              {linkedIgn ? (
                <button
                  type="button"
                  onClick={() => {
                    unlinkMyIgn();
                    setClaimIgnInput('');
                    setClaimIgnModalOpen(false);
                    triggerToast('Na-unlink na ang IGN.');
                  }}
                  className="px-3 py-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white text-xs font-bold transition cursor-pointer"
                >
                  I-unlink
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setClaimIgnModalOpen(false)}
                  className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  {t.cancelBtn}
                </button>
                <button
                  type="button"
                  disabled={!claimIgnInput.trim()}
                  onClick={() => {
                    const clean = claimIgnInput.trim();
                    if (!clean) return;
                    linkMyIgn(clean);
                    setClaimIgnModalOpen(false);
                    triggerToast(
                      language === 'tl'
                        ? `Nai-link na ang ${clean} sa iyong account!`
                        : `Successfully linked ${clean} to your account!`
                    );
                  }}
                  className="px-4 py-2 rounded-xl bg-cyan-600 dark:bg-[#00f2fe] text-white dark:text-slate-950 text-xs font-bold hover:opacity-90 transition disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {language === 'tl' ? 'I-save ang IGN' : 'Save IGN'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin PIN Prompt Modal for Match Stats Editing */}
      {showAdminPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#111827] border border-amber-500/40 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-500">
                <Shield className="w-5 h-5 shrink-0" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Admin Access Required
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAdminPinModal(false);
                  setPendingEditMatch(null);
                  setAdminModalPinInput('');
                  setAdminModalError(false);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg p-1 cursor-pointer"
              >
                ×
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {language === 'tl'
                ? 'Ang pag-edit o pag-input ng stats sa Recent Battles ay para lamang sa Admin / Host. Ipasok ang Admin PIN para magpatuloy.'
                : 'Editing or entering stats in Recent Battles is restricted to Admin / Host. Enter Admin PIN to proceed.'}
            </p>
            <form onSubmit={handleVerifyAdminPinForEdit} className="space-y-3">
              <input
                type="password"
                value={adminModalPinInput}
                onChange={(e) => {
                  setAdminModalPinInput(e.target.value);
                  setAdminModalError(false);
                }}
                placeholder="Enter Admin PIN..."
                autoFocus
                className={`w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#0b0f19] border ${
                  adminModalError
                    ? 'border-rose-500 focus:border-rose-500'
                    : 'border-slate-300 dark:border-slate-700 focus:border-amber-500'
                } text-sm font-bold text-slate-900 dark:text-white focus:outline-none`}
              />
              {adminModalError && (
                <p className="text-xs text-rose-500 font-medium">
                  {t.adminWrongPin}
                </p>
              )}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminPinModal(false);
                    setPendingEditMatch(null);
                    setAdminModalPinInput('');
                    setAdminModalError(false);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  {t.cancelBtn}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition cursor-pointer"
                >
                  {language === 'tl' ? 'I-verify at Mag-edit' : 'Verify & Edit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Match Stats Modal */}
      {editingMatchRecord && (
        <EditMatchStatsModal
          language={language}
          match={editingMatchRecord}
          isOpen={Boolean(editingMatchRecord)}
          onClose={() => setEditingMatchRecord(null)}
          onSave={handleSaveEditedMatchRecord}
        />
      )}
    </div>
  );
}
