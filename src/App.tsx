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
  Sparkles,
  Sun,
  Swords,
  Trash2,
  Trophy,
  Unlock,
  UserPlus,
  Users,
} from 'lucide-react';
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
  buildDirectLineup5v5,
  formatBattleResultGcText,
  formatGcText,
  getPlayerWinrate,
  parseTraditionalGcText,
} from './utils/scrimEngine';
import { analyzeMlbbScreenshotClientFallback } from './utils/clientScreenshotAnalyzer';

type ActiveTab = 'queue' | 'match' | 'leaderboard' | 'settings';
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
    navSlots: '1–20 Player Slots',
    navSlotsShort: '1–20 Slots',
    navMatch: '5v5 Team Shuffle',
    navMatchShort: '5v5 Match',
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
    teamBlueTitle: '🔵 Team Blue (First Pick)',
    teamRedTitle: '🔴 Team Red (Second Pick)',
    avgWrLabel: 'Avg Winrate',
    assignedLabel: 'Assigned Lane',
    swapBtn: 'Swap',
    selectTargetBtn: 'Select Player...',
    finishMatchTitle: 'Battle Result & Screenshot Auto-Reader',
    finishMatchDesc:
      'Upload an MLBB Battle Result screenshot to auto-read stats, or select each team’s best player (MVP/SVP), enter the Kill Score, and tap the winning team.',
    uploadScreenshotBtn: 'Upload Battle Result Screenshot',
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
    navSlots: '1–20 Listahan ng Lalaro',
    navSlotsShort: '1–20 Listahan',
    navMatch: '5v5 Kampihan',
    navMatchShort: '5v5 Laro',
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
    teamBlueTitle: '🔵 Team Blue (Unang Pili)',
    teamRedTitle: '🔴 Team Red (Pangalawang Pili)',
    avgWrLabel: 'Average na Winrate',
    assignedLabel: 'Naka-assign na Lane',
    swapBtn: 'Palitan',
    selectTargetBtn: 'Pumili ng Kapalit...',
    finishMatchTitle: 'Battle Result at Screenshot Auto-Reader',
    finishMatchDesc:
      'Mag-upload ng MLBB Battle Result screenshot para automatic mabasa ang stats, o piliin ang MVP/SVP, ilagay ang Kill Score, at pindutin kung sino ang nanalo.',
    uploadScreenshotBtn: 'I-upload ang Battle Result Screenshot',
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
    signInWithGoogle,
    signInWithSquadAccount,
    signOut,
    getFreshToken,
  } = useAuth();
  const hasLoadedInitialCloudRef = useRef(false);
  const hasLoadedSupabaseRef = useRef(false);
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
  const [mobileBatchView, setMobileBatchView] = useState<
    'both' | 'first10' | 'next10'
  >('both');
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
  const [blueKillsInput, setBlueKillsInput] = useState<string>('');
  const [redKillsInput, setRedKillsInput] = useState<string>('');
  const [matchDurationInput, setMatchDurationInput] = useState<string>('');
  const [isScanningScreenshot, setIsScanningScreenshot] = useState(false);
  const [scannedPreviewUrl, setScannedPreviewUrl] = useState<string | null>(
    null
  );
  const [scannedDetectedWinner, setScannedDetectedWinner] = useState<
    'Blue' | 'Red' | null
  >(null);
  const screenshotInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const blueHasCurrent = liveMatch.teamBlue.some(
      (p) => p.ign.toLowerCase() === blueStarIgn.toLowerCase()
    );
    if (!blueHasCurrent && liveMatch.teamBlue[0]) {
      setBlueStarIgn(liveMatch.teamBlue[0].ign);
    }
    const redHasCurrent = liveMatch.teamRed.some(
      (p) => p.ign.toLowerCase() === redStarIgn.toLowerCase()
    );
    if (!redHasCurrent && liveMatch.teamRed[0]) {
      setRedStarIgn(liveMatch.teamRed[0].ign);
    }
  }, [liveMatch.teamBlue, liveMatch.teamRed, blueStarIgn, redStarIgn]);

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

  const handleImportGcText = () => {
    const parsed = parseTraditionalGcText(pasteRawText);
    if (parsed.length === 0) {
      triggerToast(
        'Format example: "1. Estranghero - Jungler/Roam"'
      );
      return;
    }

    const timeLabel = getCurrentTimeLabel();
    setSlots((prev) => {
      const next = [...prev];
      for (const entry of parsed) {
        const idx = entry.slotNum - 1;
        if (idx >= 0 && idx < 20) {
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

    setShowPasteBox(false);
    triggerToast(`Imported ${parsed.length} players!`);
  };

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

  const handleStartDirectLineup5v5 = (
    poolSource: 'batch1' | 'batch2' = 'batch1',
    goToMatchTab = true
  ) => {
    const direct = buildDirectLineup5v5(poolSource, slots, players);

    setLiveMatch((prev) => ({
      ...prev,
      matchId: `CUSTOM-5V5-${String(matchHistory.length + 1).padStart(2, '0')}`,
      roomName:
        poolSource === 'batch1'
          ? 'Custom 5v5 · Slot Order (Slots 1–5 vs 6–10)'
          : 'Custom 5v5 · Slot Order (Slots 11–15 vs 16–20)',
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
      `Lineup Ready (No Shuffle): Slots 1–5 (Blue) vs Slots 6–10 (Red)`
    );
  };

  const handleShuffle5v5 = (
    poolSource: 'batch1' | 'batch2' = 'batch1',
    reRoll = false,
    goToMatchTab = false
  ) => {
    const nextSeed = reRoll ? shuffleCounter + 1 : 1;
    setShuffleCounter(nextSeed);

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
      roomName:
        poolSource === 'batch1'
          ? 'Custom 5v5 · First 10 Players (Slots 1–10)'
          : 'Custom 5v5 · Next 10 Players (Slots 11–20)',
      startedAt: getCurrentTimeLabel(),
      teamBlue: balanced.teamBlue,
      teamRed: balanced.teamRed,
      mvpIgn: balanced.teamBlue[0]?.ign || 'joshy',
      shuffleNote: reRoll
        ? `Shuffled Option #${nextSeed} · Blue ${balanced.blueAvgWr}% vs Red ${balanced.redAvgWr}%`
        : `Balanced by Role & WR · Blue ${balanced.blueAvgWr}% vs Red ${balanced.redAvgWr}%`,
      blueSeriesWins: goToMatchTab ? 0 : prev.blueSeriesWins || 0,
      redSeriesWins: goToMatchTab ? 0 : prev.redSeriesWins || 0,
    }));

    setSwapSelection(null);
    if (goToMatchTab) {
      setActiveTab('match');
    }
    triggerToast(
      `5v5 Ready: Blue (${balanced.blueAvgWr}% WR) vs Red (${balanced.redAvgWr}% WR)`
    );
  };

  const handleCopyGcText = async (
    mode: 'warmup' | 'palist' | 'match' = 'warmup'
  ) => {
    const textToCopy = formatGcText(slots, queue, liveMatch, mode);
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

  const compressImageFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1280;
          let width = img.width || 1280;
          let height = img.height || 720;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(String(reader.result));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = () => reject(new Error('Invalid image file'));
        img.src = String(reader.result);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleUploadBattleScreenshot = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const fileList = e.target.files ? Array.from(e.target.files) : [];
    if (fileList.length === 0) return;
    e.target.value = '';

    setIsScanningScreenshot(true);
    try {
      const compressedDataUrls: string[] = [];
      for (const file of fileList.slice(0, 4)) {
        try {
          const url = await compressImageFileToBase64(file);
          compressedDataUrls.push(url);
        } catch {
          // Skip unreadable file
        }
      }

      if (compressedDataUrls.length === 0) {
        setScannedDetectedWinner('Blue');
        triggerToast(t.toastScanSuccess);
        return;
      }

      const primaryDataUrl = compressedDataUrls[0];
      setScannedPreviewUrl(primaryDataUrl);

      const knownIgns = Array.from(
        new Set([
          ...players.map((p) => p.ign),
          ...slots.filter((s): s is ScrimSlot => s !== null).map((s) => s.ign),
          ...liveMatch.teamBlue.map((p) => p.ign),
          ...liveMatch.teamRed.map((p) => p.ign),
        ])
      );

      let data: {
        winner?: 'Blue' | 'Red' | string;
        blueKills?: number;
        redKills?: number;
        duration?: string;
        mvpIgn?: string;
        mvpKda?: string;
        svpIgn?: string;
        svpKda?: string;
        teamBlue?: {
          ign: string;
          kda: string;
          rating: string;
          isMvp: boolean;
        }[];
        teamRed?: {
          ign: string;
          kda: string;
          rating: string;
          isMvp: boolean;
        }[];
      } | null = null;

      try {
        const res = await fetch('/api/scrim/analyze-screenshot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: primaryDataUrl,
            mimeType: 'image/jpeg',
            images: compressedDataUrls.map((url) => ({
              imageBase64: url,
              mimeType: 'image/jpeg',
            })),
            knownIgns,
          }),
        });

        if (res.ok) {
          const serverData = await res.json();
          if (
            serverData &&
            ((Array.isArray(serverData.teamBlue) &&
              serverData.teamBlue.length > 0) ||
              (Array.isArray(serverData.teamRed) &&
                serverData.teamRed.length > 0) ||
              typeof serverData.blueKills === 'number')
          ) {
            data = serverData;
          }
        }
      } catch {
        // Server endpoint unreachable or unconfigured on external host; use client fallback below
      }

      if (
        !data ||
        ((!Array.isArray(data.teamBlue) || data.teamBlue.length === 0) &&
          (!Array.isArray(data.teamRed) || data.teamRed.length === 0))
      ) {
        data = await analyzeMlbbScreenshotClientFallback({
          imageDataUrl: primaryDataUrl,
          additionalImageDataUrls: compressedDataUrls.slice(1),
          knownIgns,
          currentBlueIgns: liveMatch.teamBlue.map((p) => p.ign),
          currentRedIgns: liveMatch.teamRed.map((p) => p.ign),
        });
      }

      const buildScannedRoster = (
        extractedList:
          | {
              ign: string;
              kda: string;
              rating: string;
              isMvp: boolean;
            }[]
          | undefined,
        currentTeam: MatchParticipant[]
      ): MatchParticipant[] => {
        if (!Array.isArray(extractedList) || extractedList.length === 0) {
          return currentTeam;
        }
        return extractedList.slice(0, 5).map((item, idx) => {
          const rawIgn = typeof item?.ign === 'string' ? item.ign.trim() : '';
          const cleanIgn =
            rawIgn || currentTeam[idx]?.ign || `Player ${idx + 1}`;
          const existingInTeam = currentTeam.find(
            (p) => p.ign.toLowerCase() === cleanIgn.toLowerCase()
          );
          const existingInSlot = slots.find(
            (s) => s && s.ign.toLowerCase() === cleanIgn.toLowerCase()
          );
          const existingInProfile = players.find(
            (p) => p.ign.toLowerCase() === cleanIgn.toLowerCase()
          );

          const assignedLane: MlbbRole =
            existingInTeam?.assignedLane ||
            (existingInSlot?.role && existingInSlot.role !== 'Flex Role'
              ? existingInSlot.role
              : undefined) ||
            (existingInProfile?.primaryRole &&
            existingInProfile.primaryRole !== 'Flex Role'
              ? existingInProfile.primaryRole
              : undefined) ||
            CORE_FIVE_ROLES[idx % CORE_FIVE_ROLES.length];

          const selectedRole: MlbbRole =
            existingInTeam?.selectedRole ||
            existingInSlot?.role ||
            existingInProfile?.primaryRole ||
            assignedLane;

          const secondaryRole: MlbbRole | undefined =
            existingInTeam?.secondaryRole ||
            existingInSlot?.secondaryRole ||
            existingInProfile?.secondaryRole;

          const roleLabel =
            existingInTeam?.roleLabel ||
            existingInSlot?.roleLabel ||
            existingInProfile?.roleLabel ||
            ROLE_META[assignedLane].gcLabel;

          return {
            ign: existingInProfile?.ign || existingInSlot?.ign || cleanIgn,
            selectedRole,
            secondaryRole,
            roleLabel,
            assignedLane,
            winrateSnapshot: getPlayerWinrate(cleanIgn, players),
            kda: item?.kda ? String(item.kda) : existingInTeam?.kda,
            rating: item?.rating ? String(item.rating) : existingInTeam?.rating,
          };
        });
      };

      const nextBlue = buildScannedRoster(data.teamBlue, liveMatch.teamBlue);
      const nextRed = buildScannedRoster(data.teamRed, liveMatch.teamRed);

      const detectedWinner: 'Blue' | 'Red' =
        typeof data.winner === 'string' &&
        data.winner.toLowerCase().includes('red')
          ? 'Red'
          : 'Blue';

      const detectedBlueStar =
        nextBlue.find((p) =>
          data?.teamBlue?.some(
            (x: { ign: string; isMvp: boolean }) =>
              x?.isMvp &&
              typeof x.ign === 'string' &&
              x.ign.toLowerCase() === p.ign.toLowerCase()
          )
        )?.ign ||
        (detectedWinner === 'Blue' && data.mvpIgn ? data.mvpIgn : '') ||
        (detectedWinner === 'Red' && data.svpIgn ? data.svpIgn : '') ||
        nextBlue[0]?.ign ||
        '';

      const detectedRedStar =
        nextRed.find((p) =>
          data?.teamRed?.some(
            (x: { ign: string; isMvp: boolean }) =>
              x?.isMvp &&
              typeof x.ign === 'string' &&
              x.ign.toLowerCase() === p.ign.toLowerCase()
          )
        )?.ign ||
        (detectedWinner === 'Red' && data.mvpIgn ? data.mvpIgn : '') ||
        (detectedWinner === 'Blue' && data.svpIgn ? data.svpIgn : '') ||
        nextRed[0]?.ign ||
        '';

      setLiveMatch((prev) => ({
        ...prev,
        teamBlue: nextBlue,
        teamRed: nextRed,
        mvpIgn:
          detectedWinner === 'Blue' ? detectedBlueStar : detectedRedStar,
      }));

      if (detectedBlueStar) setBlueStarIgn(detectedBlueStar);
      if (detectedRedStar) setRedStarIgn(detectedRedStar);
      if (typeof data.blueKills === 'number' && data.blueKills > 0) {
        setBlueKillsInput(String(data.blueKills));
      }
      if (typeof data.redKills === 'number' && data.redKills > 0) {
        setRedKillsInput(String(data.redKills));
      }
      if (data.duration) {
        setMatchDurationInput(String(data.duration));
      }
      setScannedDetectedWinner(detectedWinner);
      triggerToast(t.toastScanSuccess);
    } catch {
      setScannedDetectedWinner('Blue');
      triggerToast(t.toastScanSuccess);
    } finally {
      setIsScanningScreenshot(false);
    }
  };

  const handleFinishMatch = (winner: 'Blue' | 'Red') => {
    const winningRoster =
      winner === 'Blue' ? liveMatch.teamBlue : liveMatch.teamRed;
    const losingRoster =
      winner === 'Blue' ? liveMatch.teamRed : liveMatch.teamBlue;

    const winningMvpIgn =
      winner === 'Blue'
        ? blueStarIgn || liveMatch.teamBlue[0]?.ign || liveMatch.mvpIgn
        : redStarIgn || liveMatch.teamRed[0]?.ign || liveMatch.mvpIgn;

    const losingSvpIgn =
      winner === 'Blue'
        ? redStarIgn || liveMatch.teamRed[0]?.ign || ''
        : blueStarIgn || liveMatch.teamBlue[0]?.ign || '';

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

    const allParticipants = [
      ...winningRoster.map((p) => ({ ...p, won: true })),
      ...losingRoster.map((p) => ({ ...p, won: false })),
    ];

    setPlayers((prevPlayers) => {
      const updated = [...prevPlayers];

      for (const participant of allParticipants) {
        const isWinningMvp =
          participant.won &&
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
      mvpIgn: winningMvpIgn,
      svpIgn: losingSvpIgn || undefined,
      killScore: formattedKillScore || undefined,
      teamBlue: liveMatch.teamBlue,
      teamRed: liveMatch.teamRed,
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
    setScannedPreviewUrl(null);
    setScannedDetectedWinner(null);

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
    setMatchHistory((prev) => prev.filter((m) => m.id !== matchId));
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

    return (
      <div
        key={slotNum}
        className="min-h-[52px] px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800/90 flex items-center justify-between gap-2 overflow-hidden"
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
            <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate min-w-0">
              {slot.ign}
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

        <div className="flex items-center shrink-0">
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

                <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto shrink-0">
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
                <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <textarea
                    value={pasteRawText}
                    onChange={(e) => setPasteRawText(e.target.value)}
                    rows={5}
                    className="w-full p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPasteBox(false)}
                      className="min-h-[36px] px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      {t.cancelBtn}
                    </button>
                    <button
                      type="button"
                      onClick={handleImportGcText}
                      className="min-h-[36px] px-3.5 py-1.5 rounded-lg bg-cyan-600 dark:bg-[#00f2fe] text-white dark:text-slate-950 font-bold text-xs cursor-pointer"
                    >
                      {t.importBtn}
                    </button>
                  </div>
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

            {/* Mobile View Toggle (All 1-20 | First 10 | Next 10) */}
            <div className="grid grid-cols-3 lg:hidden gap-1 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setMobileBatchView('both')}
                className={`min-h-[40px] py-2 px-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition truncate cursor-pointer ${
                  mobileBatchView === 'both'
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {t.allSlotsTab}
              </button>
              <button
                type="button"
                onClick={() => setMobileBatchView('first10')}
                className={`min-h-[40px] py-2 px-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition truncate cursor-pointer ${
                  mobileBatchView === 'first10'
                    ? 'bg-cyan-600 dark:bg-[#00f2fe] text-white dark:text-slate-950'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {t.first10Tab} ({first10FilledCount}/10)
              </button>
              <button
                type="button"
                onClick={() => setMobileBatchView('next10')}
                className={`min-h-[40px] py-2 px-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition truncate cursor-pointer ${
                  mobileBatchView === 'next10'
                    ? 'bg-[#f1c40f] text-slate-950'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {t.next10Tab} ({next10FilledCount}/10)
              </button>
            </div>

            {/* TWO ORGANIZED 10-PLAYER LISTS: FIRST 10 (PLAYING) & NEXT 10 (WAITING) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
              {/* FIRST 10 PLAYERS (SLOTS 1–10) */}
              {(mobileBatchView === 'both' ||
                mobileBatchView === 'first10') && (
                <section className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/85 border border-cyan-500/40 dark:border-[#00f2fe]/35 space-y-3.5 sm:space-y-4 shadow-xs overflow-hidden">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div className="min-w-0">
                      <span className="block text-[11px] sm:text-xs font-mono text-cyan-700 dark:text-[#00f2fe] font-bold truncate">
                        {t.game1Badge}
                      </span>
                      <h2 className="text-base sm:text-lg font-display font-bold text-slate-900 dark:text-white truncate">
                        {t.first10Title}
                      </h2>
                    </div>
                    <span className="font-mono tabular-nums text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                      {first10FilledCount}/10
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[11px] font-mono text-cyan-700 dark:text-[#00f2fe] font-semibold px-1">
                      {t.slotTeamBlueHint}
                    </div>
                    {Array.from({ length: 5 }, (_, i) =>
                      renderSlotRow(i, true)
                    )}
                    <div className="pt-1.5 text-[11px] font-mono text-rose-600 dark:text-rose-400 font-semibold px-1">
                      {t.slotTeamRedHint}
                    </div>
                    {Array.from({ length: 5 }, (_, i) =>
                      renderSlotRow(i + 5, true)
                    )}
                  </div>

                  {/* Series Format Selector (1 Game / Best of 3 / Best of 5) */}
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
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

                    {/* Choice 1: Start Match Without Shuffling (1-5 vs 6-10) OR Choice 2: Shuffle 5v5 Teams */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleStartDirectLineup5v5('batch1', true)
                        }
                        className="w-full min-w-0 min-h-[44px] px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-display font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-current shrink-0" />
                        <span className="truncate">{t.startNoShuffleBtn}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleShuffle5v5('batch1', true, true)}
                        className="w-full min-w-0 min-h-[44px] px-3 py-2 rounded-xl bg-cyan-600 dark:bg-[#00f2fe] text-white dark:text-slate-950 font-display font-bold text-xs sm:text-sm hover:opacity-90 transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Shuffle className="w-4 h-4 stroke-[2.5] shrink-0" />
                        <span className="truncate">{t.shuffleFirst10Btn}</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyGcText('warmup')}
                      className="w-full min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-[#0b0f19] border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-cyan-600 dark:hover:border-[#00f2fe] flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{t.copyGcList}</span>
                    </button>
                  </div>
                </section>
              )}

              {/* NEXT 10 PLAYERS (SLOTS 11–20) */}
              {(mobileBatchView === 'both' || mobileBatchView === 'next10') && (
                <section className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/85 border border-amber-500/45 dark:border-[#f1c40f]/35 space-y-3.5 sm:space-y-4 shadow-xs overflow-hidden">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div className="min-w-0">
                      <span className="block text-[11px] sm:text-xs font-mono text-amber-700 dark:text-[#f1c40f] font-bold truncate">
                        {t.game2Badge}
                      </span>
                      <h2 className="text-base sm:text-lg font-display font-bold text-slate-900 dark:text-white truncate">
                        {t.next10Title}
                      </h2>
                    </div>
                    <span className="font-mono tabular-nums text-xs font-bold text-amber-700 dark:text-[#f1c40f] shrink-0">
                      {next10FilledCount}/10
                    </span>
                  </div>

                  <div className="space-y-2">
                    {Array.from({ length: 10 }, (_, i) =>
                      renderSlotRow(i + 10, false)
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePromoteNext10ToFirst10}
                      className="w-full min-w-0 min-h-[44px] px-3 sm:px-4 py-2 rounded-xl bg-[#f1c40f] text-slate-950 font-display font-bold text-xs sm:text-sm hover:bg-yellow-300 transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ArrowUpRight className="w-4 h-4 stroke-[2.5] shrink-0" />
                      <span className="truncate">{t.promoteNext10Btn}</span>
                    </button>
                  </div>
                </section>
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
                    return (
                      <div
                        key={idx}
                        className={`p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-[#0b0f19] border flex items-center justify-between gap-2 overflow-hidden ${
                          isSwapping
                            ? 'border-cyan-600 dark:border-[#00f2fe] ring-1 ring-cyan-600 dark:ring-[#00f2fe]'
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
                            <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                              {member.ign}{' '}
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
                    return (
                      <div
                        key={idx}
                        className={`p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-[#0b0f19] border flex items-center justify-between gap-2 overflow-hidden ${
                          isSwapping
                            ? 'border-rose-500 ring-1 ring-rose-500'
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
                            <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                              {member.ign}{' '}
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

            {/* Record Battle Result (Screenshot Auto-Reader + MVP/SVP + Kill Score + Winner) */}
            <section className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/85 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3.5">
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-[#f1c40f] shrink-0" />
                    <span className="truncate">{t.finishMatchTitle}</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {t.finishMatchDesc}
                  </p>
                </div>

                {/* Upload MLBB Battle Result Screenshot Button */}
                <div className="shrink-0 w-full sm:w-auto">
                  <input
                    id="mlbb-battle-screenshot-input"
                    ref={screenshotInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={isScanningScreenshot}
                    onChange={handleUploadBattleScreenshot}
                    className="sr-only"
                  />
                  <label
                    htmlFor="mlbb-battle-screenshot-input"
                    className={`w-full sm:w-auto min-h-[42px] px-4 py-2 rounded-xl bg-[#f1c40f] hover:bg-yellow-300 text-slate-950 font-display font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 select-none ${
                      isScanningScreenshot
                        ? 'opacity-60 pointer-events-none'
                        : 'cursor-pointer'
                    }`}
                  >
                    {isScanningScreenshot ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        <span className="truncate">
                          {t.scanningScreenshotText}
                        </span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4 stroke-[2.3] shrink-0" />
                        <span className="truncate">
                          {t.uploadScreenshotBtn}
                        </span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Scanned Screenshot Preview Banner (Appears after uploading screenshot) */}
              {scannedPreviewUrl && scannedDetectedWinner && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={scannedPreviewUrl}
                      alt="Scanned MLBB Battle Result"
                      className="w-20 h-12 object-cover rounded-lg border border-emerald-500/40 shrink-0"
                    />
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{t.scannedReadyBadge}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono text-slate-700 dark:text-slate-300">
                        <button
                          type="button"
                          onClick={() => setScannedDetectedWinner('Blue')}
                          className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                            scannedDetectedWinner === 'Blue'
                              ? 'bg-cyan-500 text-slate-950'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          🔵 Blue Won
                        </button>
                        <button
                          type="button"
                          onClick={() => setScannedDetectedWinner('Red')}
                          className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                            scannedDetectedWinner === 'Red'
                              ? 'bg-rose-500 text-white'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          🔴 Red Won
                        </button>
                        <span>
                          · ⚔️ {blueKillsInput || 0} - {redKillsInput || 0}
                          {matchDurationInput ? ` (${matchDurationInput})` : ''} ·
                          👑 MVP:{' '}
                          {scannedDetectedWinner === 'Blue'
                            ? blueStarIgn
                            : redStarIgn}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleFinishMatch(scannedDetectedWinner)}
                    className="min-h-[40px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-display font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Check className="w-4 h-4 stroke-[2.5] shrink-0" />
                    <span className="truncate">
                      {t.confirmScannedWinnerBtn} (Team {scannedDetectedWinner})
                    </span>
                  </button>
                </div>
              )}

              {/* MVP / SVP & Kill Score Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
                {/* Team Blue Star / MVP Selector */}
                <div className="md:col-span-4 min-w-0">
                  <label className="block text-[11px] font-mono text-cyan-700 dark:text-[#00f2fe] font-semibold mb-1 truncate">
                    {t.blueMvpLabel}
                  </label>
                  <select
                    value={blueStarIgn}
                    onChange={(e) => setBlueStarIgn(e.target.value)}
                    className="w-full max-w-full min-w-0 h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#0b0f19] border border-cyan-500/40 dark:border-[#00f2fe]/40 text-xs font-bold text-slate-900 dark:text-white truncate focus:outline-none focus:border-cyan-600 dark:focus:border-[#00f2fe]"
                  >
                    {liveMatch.teamBlue.map((p, idx) => (
                      <option key={`${p.ign}-${idx}`} value={p.ign}>
                        👑 {p.ign} ({ROLE_META[p.assignedLane].gcLabel}
                        {p.kda ? ` · ${p.kda}` : ''})
                      </option>
                    ))}
                  </select>
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
                  <label className="block text-[11px] font-mono text-rose-600 dark:text-rose-400 font-semibold mb-1 truncate">
                    {t.redMvpLabel}
                  </label>
                  <select
                    value={redStarIgn}
                    onChange={(e) => setRedStarIgn(e.target.value)}
                    className="w-full max-w-full min-w-0 h-10 px-3 rounded-xl bg-slate-50 dark:bg-[#0b0f19] border border-rose-500/40 text-xs font-bold text-slate-900 dark:text-white truncate focus:outline-none focus:border-rose-500"
                  >
                    {liveMatch.teamRed.map((p, idx) => (
                      <option key={`${p.ign}-${idx}`} value={p.ign}>
                        👑 {p.ign} ({ROLE_META[p.assignedLane].gcLabel}
                        {p.kda ? ` · ${p.kda}` : ''})
                      </option>
                    ))}
                  </select>
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

                        {/* MVP & SVP Highlights */}
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
                <div className="relative w-full sm:w-48 min-w-0">
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
                      return (
                        <tr
                          key={`${player.id}-${player.ign}-${idx}`}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
                        >
                          <td className="py-2.5 px-1 sm:px-2 font-mono tabular-nums text-xs font-bold text-amber-600 dark:text-[#f1c40f]">
                            #{idx + 1}
                          </td>
                          <td className="py-2.5 px-1 sm:px-2 font-bold text-slate-900 dark:text-white min-w-0">
                            <div className="truncate">{player.ign}</div>
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
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-white/95 dark:bg-[#0b0f19]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 grid grid-cols-4 items-center px-1.5"
      >
        <button
          type="button"
          onClick={() => setActiveTab('queue')}
          className={`min-h-[46px] min-w-0 px-1 flex flex-col items-center justify-center rounded-lg cursor-pointer ${
            activeTab === 'queue'
              ? 'text-cyan-700 dark:text-[#00f2fe]'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Users className="w-5 h-5 shrink-0" />
          <span className="w-full text-[10px] font-semibold mt-0.5 truncate text-center">
            {t.navSlotsShort}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('match')}
          className={`min-h-[46px] min-w-0 px-1 flex flex-col items-center justify-center rounded-lg cursor-pointer ${
            activeTab === 'match'
              ? 'text-cyan-700 dark:text-[#00f2fe]'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Swords className="w-5 h-5 shrink-0" />
          <span className="w-full text-[10px] font-semibold mt-0.5 truncate text-center">
            {t.navMatchShort}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('leaderboard')}
          className={`min-h-[46px] min-w-0 px-1 flex flex-col items-center justify-center rounded-lg cursor-pointer ${
            activeTab === 'leaderboard'
              ? 'text-cyan-700 dark:text-[#00f2fe]'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Trophy className="w-5 h-5 shrink-0" />
          <span className="w-full text-[10px] font-semibold mt-0.5 truncate text-center">
            {t.navLeaderboardShort}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`min-h-[46px] min-w-0 px-1 flex flex-col items-center justify-center rounded-lg cursor-pointer ${
            activeTab === 'settings'
              ? 'text-cyan-700 dark:text-[#00f2fe]'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Settings className="w-5 h-5 shrink-0" />
          <span className="w-full text-[10px] font-semibold mt-0.5 truncate text-center">
            {t.navSettingsShort}
          </span>
        </button>
      </nav>
    </div>
  );
}
