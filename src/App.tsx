import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  ArrowUpRight,
  Check,
  ClipboardPaste,
  Copy,
  LogIn,
  LogOut,
  Monitor,
  Moon,
  RefreshCw,
  Search,
  Settings,
  Shuffle,
  Sun,
  Swords,
  Trophy,
  UserPlus,
  Users,
} from 'lucide-react';
import { useAuth } from './context/AuthContext';
import {
  INITIAL_LIVE_MATCH,
  INITIAL_MATCH_HISTORY,
  INITIAL_PLAYERS,
  INITIAL_QUEUE,
  INITIAL_SLOTS,
  LiveMatchState,
  MLBB_ROLES,
  MatchHistoryRecord,
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
  formatGcText,
  getPlayerWinrate,
  parseTraditionalGcText,
} from './utils/scrimEngine';

type ActiveTab = 'queue' | 'match' | 'leaderboard' | 'settings';
type LeaderboardSort = 'wins' | 'winrate' | 'matches';
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
};

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
    mainRoleLabel: 'Main Role (Primary)',
    secondRoleLabel: '2nd Role (Optional Sub-Role)',
    noneOneRole: 'None (1 Role Only)',
    joinSubmitBtn: 'Join Slot',
    allSlotsTab: 'All Slots (1–20)',
    first10Tab: 'First 10',
    next10Tab: 'Next 10',
    game1Badge: 'GAME 1 · PLAYING NOW',
    first10Title: 'First 10 Players (Slots 1–10)',
    game2Badge: 'GAME 2 · WAITING IN LINE',
    next10Title: 'Next 10 Players (Slots 11–20)',
    openSlotLabel: 'Open Slot',
    joinSlotBtn: '+ Join Slot',
    inlineIgnPlaceholder: 'Enter IGN...',
    inlineMainPrefix: 'Main:',
    inlineSecondNone: '2nd Role: None',
    inlineSecondPrefix: '2nd Role:',
    inlineSaveBtn: 'Save',
    removeSlotTitle: 'Remove player from slot',
    shuffleFirst10Btn: 'Shuffle 5v5 Teams (Slots 1–10)',
    copyShortBtn: 'Copy List',
    promoteNext10Btn: 'Move Next 10 ➔ First 10 (Next Game)',
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
    finishMatchTitle: 'Match Finished? Select the Winning Team:',
    finishMatchDesc:
      'Automatically updates Wins, Losses, and Winrate (%) on the Leaderboard.',
    blueWonBtn: 'Team Blue Won',
    redWonBtn: 'Team Red Won',
    leaderboardTitle: 'NGD Scrim Leaderboard',
    leaderboardDesc: 'Player standings based on Custom 5v5 Wins and Winrate (%).',
    searchIgnPlaceholder: 'Search player IGN...',
    sortWins: 'Wins',
    sortWr: 'Winrate %',
    sortGames: 'Matches',
    colPlayer: 'Player IGN',
    colRole: 'Role',
    colGames: 'Matches',
    colWL: 'Win - Loss',
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
    mainRoleLabel: 'Pangunahing Role (Main)',
    secondRoleLabel: 'Pangalawang Role (2nd Role)',
    noneOneRole: 'Wala (1 Role Lang)',
    joinSubmitBtn: 'Sumali sa Slot',
    allSlotsTab: 'Lahat ng Slot (1–20)',
    first10Tab: 'Unang 10',
    next10Tab: 'Susunod na 10',
    game1Badge: 'UNANG LARO · MAGLALARO NGAYON',
    first10Title: 'Unang 10 Manlalaro (Slots 1–10)',
    game2Badge: 'PANGALAWANG LARO · SUSUNOD NA MAGLALARO',
    next10Title: 'Susunod na 10 Manlalaro (Slots 11–20)',
    openSlotLabel: 'Bakanteng Slot',
    joinSlotBtn: '+ Sumali sa Slot',
    inlineIgnPlaceholder: 'Ilagay ang IGN...',
    inlineMainPrefix: 'Main:',
    inlineSecondNone: '2nd Role: Wala',
    inlineSecondPrefix: '2nd Role:',
    inlineSaveBtn: 'I-save',
    removeSlotTitle: 'Alisin ang manlalaro sa slot',
    shuffleFirst10Btn: 'I-shuffle ang 5v5 Kampihan (1–10)',
    copyShortBtn: 'Kopyahin',
    promoteNext10Btn: 'Ilipat ang Susunod na 10 ➔ Unang 10',
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
    finishMatchTitle: 'Tapos na ang Laro? Piliin kung Sino ang Nanalo:',
    finishMatchDesc:
      'Awtomatikong madadagdagan ang Panalo, Talo, at Winrate (%) ng 10 manlalaro sa Ranggo.',
    blueWonBtn: 'Nanalo ang Team Blue',
    redWonBtn: 'Nanalo ang Team Red',
    leaderboardTitle: 'NGD Scrim Ranggo at Estadistika',
    leaderboardDesc:
      'Listahan at ranggo ng mga manlalaro base sa Panalo at Winrate (%) sa Custom 5v5.',
    searchIgnPlaceholder: 'Hanapin ang IGN ng manlalaro...',
    sortWins: 'Panalo',
    sortWr: 'Winrate %',
    sortGames: 'Laro',
    colPlayer: 'Manlalaro (IGN)',
    colRole: 'Role',
    colGames: 'Laro',
    colWL: 'Panalo - Talo',
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
  },
};

export default function App() {
  const { user, signInWithGoogle, signOut, getFreshToken } = useAuth();
  const hasLoadedInitialCloudRef = useRef(false);
  const [players, setPlayers] = useState<PlayerProfile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.players);
      return saved ? JSON.parse(saved) : INITIAL_PLAYERS;
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
      return saved ? JSON.parse(saved) : INITIAL_MATCH_HISTORY;
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
        if (Array.isArray(data.players) && data.players.length > 0) {
          setPlayers(data.players);
        }
        if (Array.isArray(data.slots) && data.slots.length === 20) {
          setSlots(data.slots);
        }
        if (data.liveMatch) {
          setLiveMatch(data.liveMatch);
        }
        if (Array.isArray(data.matchHistory)) {
          setMatchHistory(data.matchHistory);
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

  // --- SHUFFLE & AUTO-BALANCE 5v5 ---

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

  const handleFinishMatch = (winner: 'Blue' | 'Red') => {
    const winningRoster =
      winner === 'Blue' ? liveMatch.teamBlue : liveMatch.teamRed;
    const losingRoster =
      winner === 'Blue' ? liveMatch.teamRed : liveMatch.teamBlue;

    const allParticipants = [
      ...winningRoster.map((p) => ({ ...p, won: true })),
      ...losingRoster.map((p) => ({ ...p, won: false })),
    ];

    setPlayers((prevPlayers) => {
      const updated = [...prevPlayers];

      for (const participant of allParticipants) {
        const idx = updated.findIndex(
          (pl) => pl.ign.toLowerCase() === participant.ign.toLowerCase()
        );

        if (idx !== -1) {
          const existing = updated[idx];
          updated[idx] = {
            ...existing,
            wins: existing.wins + (participant.won ? 1 : 0),
            losses: existing.losses + (participant.won ? 0 : 1),
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
            mvpCount: 0,
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

    const newRecord: MatchHistoryRecord = {
      id: liveMatch.matchId,
      roomName: liveMatch.roomName,
      completedAt: getCurrentTimeLabel(),
      winner,
      mvpIgn: liveMatch.mvpIgn,
      teamBlue: liveMatch.teamBlue,
      teamRed: liveMatch.teamRed,
      durationText: 'Finished',
    };

    setMatchHistory((prev) => [newRecord, ...prev]);
    triggerToast(`Team ${winner} Won! Leaderboard updated.`);
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
          className="min-h-[48px] px-3.5 py-2 rounded-xl bg-slate-100/80 dark:bg-[#080c14] border border-dashed border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 flex items-center justify-between gap-2 transition"
        >
          {isEditing ? (
            <div className="flex flex-wrap items-center gap-1.5 w-full">
              <span className="font-mono tabular-nums text-xs font-bold text-slate-500 w-6">
                {slotNum}.
              </span>
              <input
                type="text"
                value={inlineSlotIgn}
                onChange={(e) => setInlineSlotIgn(e.target.value)}
                placeholder={t.inlineIgnPlaceholder}
                autoFocus
                className="flex-1 min-w-[100px] h-9 px-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-600 dark:focus:border-[#00f2fe]"
              />
              <select
                value={inlineSlotRole}
                onChange={(e) => setInlineSlotRole(e.target.value as MlbbRole)}
                className="h-9 px-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
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
                className="h-9 px-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 disabled:opacity-40"
              >
                <option value="NONE">{t.inlineSecondNone}</option>
                {MLBB_ROLES.filter((r) => r !== 'Flex Role').map((r) => (
                  <option key={r} value={r}>
                    {t.inlineSecondPrefix} {ROLE_META[r].gcLabel}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleSaveInlineSlot(slotIdx)}
                className="h-9 px-3 rounded-lg bg-cyan-600 dark:bg-[#00f2fe] text-white dark:text-slate-950 font-bold text-xs cursor-pointer"
              >
                {t.inlineSaveBtn}
              </button>
              <button
                type="button"
                onClick={() => setEditingSlotIndex(null)}
                className="h-9 px-2.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs cursor-pointer"
              >
                ×
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2.5">
                <span className="font-mono tabular-nums text-xs font-bold text-slate-500 w-6">
                  {slotNum}.
                </span>
                <span className="text-xs text-slate-500">
                  {t.openSlotLabel}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleJoinSpecificSlot(slotIdx)}
                className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
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
        className="min-h-[48px] px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800/90 flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`font-mono tabular-nums text-xs font-bold w-6 shrink-0 ${
              isFirst10
                ? 'text-cyan-700 dark:text-[#00f2fe]'
                : 'text-amber-700 dark:text-[#f1c40f]'
            }`}
          >
            {slotNum}.
          </span>
          <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
            {slot.ign}
          </span>
          <span className="text-slate-400 dark:text-slate-600">-</span>
          <RoleBadge role={slot.role} customLabel={slot.roleLabel} />
        </div>

        <button
          type="button"
          onClick={() => handleRemoveSlot(slotIdx)}
          title={t.removeSlotTitle}
          className="h-7 w-7 rounded-lg bg-slate-200/70 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 flex items-center justify-center text-xs transition cursor-pointer shrink-0"
        >
          ×
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 flex flex-col pb-24 md:pb-12 transition-colors">
      {/* TOP BAR CONTRACT: 3 Zones */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#0b0f19]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between gap-8 transition-colors">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('queue');
          }}
          className="flex items-center gap-3 font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
        >
          <NgdBrandEmblem size="sm" />
          <span>{t.brandTitle}</span>
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

        <div className="flex items-center gap-2 shrink-0">
          {/* Quick EN / TL Language Switcher */}
          <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2 py-1 rounded-md text-xs font-mono font-bold transition cursor-pointer ${
                language === 'en'
                  ? 'bg-cyan-600 dark:bg-[#00f2fe] text-white dark:text-slate-950'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage('tl')}
              className={`px-2 py-1 rounded-md text-xs font-mono font-bold transition cursor-pointer ${
                language === 'tl'
                  ? 'bg-cyan-600 dark:bg-[#00f2fe] text-white dark:text-slate-950'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              TL
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleCopyGcText('warmup')}
            className="min-h-[40px] px-4 py-2 rounded-lg bg-[#f1c40f] text-slate-950 font-semibold text-xs hover:bg-yellow-300 transition whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer"
          >
            {copiedFlag ? (
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copiedFlag ? t.copied : t.copyGcList}</span>
          </button>
        </div>
      </header>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 md:bottom-6 right-4 md:right-8 z-50 max-w-md px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-cyan-500/50 dark:border-[#00f2fe]/50 text-xs font-medium text-slate-900 dark:text-slate-100 shadow-2xl flex items-center gap-2.5"
        >
          <Check className="w-4 h-4 text-cyan-600 dark:text-[#00f2fe] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-5 space-y-6">
        {/* =====================================================================
            TAB 1: 1–20 PALIST & CUSTOM 5V5 SLOTS
           ===================================================================== */}
        {activeTab === 'queue' && (
          <div className="space-y-6">
            {/* SIMPLE PALIST FORM AT THE TOP */}
            <section className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/85 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h1 className="text-lg font-display font-bold text-slate-900 dark:text-white">
                    {t.joinTitle}
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t.joinSubtitle}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPasteBox((v) => !v)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5 text-cyan-600 dark:text-[#00f2fe]" />
                    <span>{t.pasteGcBtn}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSlots(INITIAL_SLOTS);
                      triggerToast(t.toastReset);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{t.resetBtn}</span>
                  </button>
                </div>
              </div>

              {showPasteBox && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 space-y-2.5">
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
                      className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      {t.cancelBtn}
                    </button>
                    <button
                      type="button"
                      onClick={handleImportGcText}
                      className="px-3.5 py-1.5 rounded-lg bg-cyan-600 dark:bg-[#00f2fe] text-white dark:text-slate-950 font-bold text-xs cursor-pointer"
                    >
                      {t.importBtn}
                    </button>
                  </div>
                </div>
              )}

              <form
                onSubmit={handleJoinPalist}
                className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
              >
                <div className="sm:col-span-4">
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                    {t.playerIgnLabel}
                  </label>
                  <input
                    type="text"
                    value={palistIgn}
                    onChange={(e) => setPalistIgn(e.target.value)}
                    placeholder={t.playerIgnPlaceholder}
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-[#0b0f19] border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-600 dark:focus:border-[#00f2fe]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:col-span-5">
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                      {t.mainRoleLabel}
                    </label>
                    <select
                      aria-label="Main Role"
                      value={palistRole}
                      onChange={(e) =>
                        setPalistRole(e.target.value as MlbbRole)
                      }
                      className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-[#0b0f19] border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-600 dark:focus:border-[#00f2fe]"
                    >
                      {MLBB_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_META[r].gcLabel}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
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
                      className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-[#0b0f19] border border-slate-300 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 disabled:opacity-40 focus:outline-none focus:border-cyan-600 dark:focus:border-[#00f2fe]"
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

                <div className="sm:col-span-3">
                  <button
                    type="submit"
                    className="w-full h-11 px-4 rounded-xl bg-[#f1c40f] text-slate-950 font-display font-bold text-sm hover:bg-yellow-300 transition flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4 stroke-[2.3] shrink-0" />
                    <span>{t.joinSubmitBtn}</span>
                  </button>
                </div>
              </form>
            </section>

            {/* Mobile View Toggle (All 1-20 | First 10 | Next 10) */}
            <div className="flex lg:hidden items-center gap-1.5 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setMobileBatchView('both')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
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
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
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
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                  mobileBatchView === 'next10'
                    ? 'bg-[#f1c40f] text-slate-950'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {t.next10Tab} ({next10FilledCount}/10)
              </button>
            </div>

            {/* TWO ORGANIZED 10-PLAYER LISTS: FIRST 10 (PLAYING) & NEXT 10 (WAITING) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* FIRST 10 PLAYERS (SLOTS 1–10) */}
              {(mobileBatchView === 'both' ||
                mobileBatchView === 'first10') && (
                <section className="p-5 rounded-2xl bg-white dark:bg-slate-900/85 border border-cyan-500/40 dark:border-[#00f2fe]/35 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div>
                      <span className="text-xs font-mono text-cyan-700 dark:text-[#00f2fe] font-bold">
                        {t.game1Badge}
                      </span>
                      <h2 className="text-lg font-display font-bold text-slate-900 dark:text-white">
                        {t.first10Title}
                      </h2>
                    </div>
                    <span className="font-mono tabular-nums text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {first10FilledCount}/10
                    </span>
                  </div>

                  <div className="space-y-2">
                    {Array.from({ length: 10 }, (_, i) =>
                      renderSlotRow(i, true)
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleShuffle5v5('batch1', true, true)}
                      className="flex-1 min-h-[44px] px-4 py-2 rounded-xl bg-cyan-600 dark:bg-[#00f2fe] text-white dark:text-slate-950 font-display font-bold text-xs sm:text-sm hover:opacity-90 transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Shuffle className="w-4 h-4 stroke-[2.5]" />
                      <span>{t.shuffleFirst10Btn}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyGcText('warmup')}
                      className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-[#0b0f19] border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-cyan-600 dark:hover:border-[#00f2fe] flex items-center gap-1.5 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{t.copyShortBtn}</span>
                    </button>
                  </div>
                </section>
              )}

              {/* NEXT 10 PLAYERS (SLOTS 11–20) */}
              {(mobileBatchView === 'both' || mobileBatchView === 'next10') && (
                <section className="p-5 rounded-2xl bg-white dark:bg-slate-900/85 border border-amber-500/45 dark:border-[#f1c40f]/35 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div>
                      <span className="text-xs font-mono text-amber-700 dark:text-[#f1c40f] font-bold">
                        {t.game2Badge}
                      </span>
                      <h2 className="text-lg font-display font-bold text-slate-900 dark:text-white">
                        {t.next10Title}
                      </h2>
                    </div>
                    <span className="font-mono tabular-nums text-xs font-bold text-amber-700 dark:text-[#f1c40f]">
                      {next10FilledCount}/10
                    </span>
                  </div>

                  <div className="space-y-2">
                    {Array.from({ length: 10 }, (_, i) =>
                      renderSlotRow(i + 10, false)
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePromoteNext10ToFirst10}
                      className="flex-1 min-h-[44px] px-4 py-2 rounded-xl bg-[#f1c40f] text-slate-950 font-display font-bold text-xs sm:text-sm hover:bg-yellow-300 transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                      <span>{t.promoteNext10Btn}</span>
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
          <div className="space-y-6">
            <section className="p-5 rounded-2xl bg-white dark:bg-slate-900/85 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
              <div>
                <span className="text-xs font-mono text-cyan-700 dark:text-[#00f2fe] font-semibold">
                  {t.custom5v5Badge}
                </span>
                <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white">
                  {t.custom5v5Title}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {t.custom5v5Desc}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleShuffle5v5('batch1', false, false)}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-cyan-600 dark:bg-[#00f2fe] text-white dark:text-slate-950 font-display font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Shuffle className="w-4 h-4 stroke-[2.5]" />
                  <span>{t.autoBalanceBtn}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleShuffle5v5('batch1', true, false)}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-[#f1c40f] text-slate-950 font-display font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 stroke-[2.5]" />
                  <span>{t.shuffleAgainBtn}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyGcText('match')}
                  className="min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-[#0b0f19] border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{t.copy5v5Btn}</span>
                </button>
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* TEAM BLUE */}
              <section className="p-5 rounded-2xl bg-white dark:bg-slate-900/85 border border-cyan-500/40 dark:border-[#00f2fe]/35 space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <h3 className="text-lg font-display font-bold text-cyan-700 dark:text-[#00f2fe]">
                    {t.teamBlueTitle}
                  </h3>
                  <span className="font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400">
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
                        className={`p-3 rounded-xl bg-slate-50 dark:bg-[#0b0f19] border flex items-center justify-between gap-3 ${
                          isSwapping
                            ? 'border-cyan-600 dark:border-[#00f2fe] ring-1 ring-cyan-600 dark:ring-[#00f2fe]'
                            : 'border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${ROLE_META[member.assignedLane].bgSubtleClass} ${ROLE_META[member.assignedLane].borderClass} ${ROLE_META[member.assignedLane].textClass}`}
                          >
                            <RoleIcon
                              role={member.assignedLane}
                              className="w-4 h-4"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                              {member.ign}{' '}
                              <span className="text-xs font-mono font-normal text-slate-500 dark:text-slate-400">
                                ({member.roleLabel})
                              </span>
                            </div>
                            <div
                              className={`text-xs font-mono ${ROLE_META[member.assignedLane].textClass}`}
                            >
                              {t.assignedLabel}:{' '}
                              {ROLE_META[member.assignedLane].gcLabel}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSwapParticipant('Blue', idx)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer ${
                            isSwapping
                              ? 'bg-cyan-600 dark:bg-[#00f2fe] text-white dark:text-slate-950 font-bold'
                              : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <ArrowLeftRight className="w-3 h-3" />
                          <span>
                            {isSwapping ? t.selectTargetBtn : t.swapBtn}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* TEAM RED */}
              <section className="p-5 rounded-2xl bg-white dark:bg-slate-900/85 border border-rose-500/40 dark:border-rose-500/35 space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <h3 className="text-lg font-display font-bold text-rose-600 dark:text-rose-400">
                    {t.teamRedTitle}
                  </h3>
                  <span className="font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400">
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
                        className={`p-3 rounded-xl bg-slate-50 dark:bg-[#0b0f19] border flex items-center justify-between gap-3 ${
                          isSwapping
                            ? 'border-rose-500 ring-1 ring-rose-500'
                            : 'border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${ROLE_META[member.assignedLane].bgSubtleClass} ${ROLE_META[member.assignedLane].borderClass} ${ROLE_META[member.assignedLane].textClass}`}
                          >
                            <RoleIcon
                              role={member.assignedLane}
                              className="w-4 h-4"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                              {member.ign}{' '}
                              <span className="text-xs font-mono font-normal text-slate-500 dark:text-slate-400">
                                ({member.roleLabel})
                              </span>
                            </div>
                            <div
                              className={`text-xs font-mono ${ROLE_META[member.assignedLane].textClass}`}
                            >
                              {t.assignedLabel}:{' '}
                              {ROLE_META[member.assignedLane].gcLabel}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSwapParticipant('Red', idx)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer ${
                            isSwapping
                              ? 'bg-rose-500 text-white font-bold'
                              : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <ArrowLeftRight className="w-3 h-3" />
                          <span>
                            {isSwapping ? t.selectTargetBtn : t.swapBtn}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* Record Winner */}
            <section className="p-5 rounded-2xl bg-white dark:bg-slate-900/85 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
              <div>
                <h3 className="text-base font-display font-bold text-slate-900 dark:text-white">
                  {t.finishMatchTitle}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t.finishMatchDesc}
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleFinishMatch('Blue')}
                  className="flex-1 sm:flex-initial min-h-[44px] px-5 py-2 rounded-xl bg-cyan-600 dark:bg-[#00f2fe] text-white dark:text-slate-950 font-display font-bold text-xs sm:text-sm cursor-pointer"
                >
                  {t.blueWonBtn}
                </button>
                <button
                  type="button"
                  onClick={() => handleFinishMatch('Red')}
                  className="flex-1 sm:flex-initial min-h-[44px] px-5 py-2 rounded-xl bg-rose-500 text-white font-display font-bold text-xs sm:text-sm cursor-pointer"
                >
                  {t.redWonBtn}
                </button>
              </div>
            </section>
          </div>
        )}

        {/* =====================================================================
            TAB 3: LEADERBOARD STANDINGS
           ===================================================================== */}
        {activeTab === 'leaderboard' && (
          <section className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900/85 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-display font-bold text-slate-900 dark:text-white">
                  {t.leaderboardTitle}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t.leaderboardDesc}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.searchIgnPlaceholder}
                    className="h-9 pl-8 pr-3 rounded-lg bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-600 dark:focus:border-[#00f2fe]"
                  />
                </div>

                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 rounded-lg">
                  {(
                    [
                      { id: 'wins', label: t.sortWins },
                      { id: 'winrate', label: t.sortWr },
                      { id: 'matches', label: t.sortGames },
                    ] as const
                  ).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setLeaderboardSort(s.id)}
                      className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${
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

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-2.5">#</th>
                    <th className="py-3 px-2.5">{t.colPlayer}</th>
                    <th className="py-3 px-2.5">{t.colRole}</th>
                    <th className="py-3 px-2.5 text-right">{t.colGames}</th>
                    <th className="py-3 px-2.5 text-right">{t.colWL}</th>
                    <th className="py-3 px-2.5 text-right">{t.colWinrate}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70 text-sm">
                  {sortedLeaderboard.map((player, idx) => {
                    const total = player.wins + player.losses;
                    const wr = calcWinrate(player.wins, player.losses);
                    return (
                      <tr
                        key={player.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
                      >
                        <td className="py-3 px-2.5 font-mono tabular-nums text-xs font-bold text-amber-600 dark:text-[#f1c40f]">
                          #{idx + 1}
                        </td>
                        <td className="py-3 px-2.5 font-bold text-slate-900 dark:text-white">
                          {player.ign}
                        </td>
                        <td className="py-3 px-2.5">
                          <RoleBadge
                            role={player.primaryRole}
                            customLabel={player.roleLabel}
                          />
                        </td>
                        <td className="py-3 px-2.5 text-right font-mono tabular-nums text-xs text-slate-600 dark:text-slate-300">
                          {total}
                        </td>
                        <td className="py-3 px-2.5 text-right font-mono tabular-nums text-xs">
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {player.wins}W
                          </span>{' '}
                          -{' '}
                          <span className="text-rose-600 dark:text-rose-400">
                            {player.losses}L
                          </span>
                        </td>
                        <td className="py-3 px-2.5 text-right font-mono tabular-nums font-bold text-xs text-cyan-700 dark:text-[#00f2fe]">
                          {wr.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
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
                    </div>
                    <button
                      type="button"
                      onClick={() => signOut()}
                      className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-rose-500 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{t.signOutBtn}</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => signInWithGoogle()}
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-cyan-600 dark:bg-[#00f2fe] text-white dark:text-slate-950 font-display font-bold text-xs sm:text-sm hover:opacity-90 transition flex items-center gap-2 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{t.signInGoogleBtn}</span>
                  </button>
                )}
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-white/95 dark:bg-[#0b0f19]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 grid grid-cols-4 items-center px-2"
      >
        <button
          type="button"
          onClick={() => setActiveTab('queue')}
          className={`min-h-[46px] flex flex-col items-center justify-center rounded-lg cursor-pointer ${
            activeTab === 'queue'
              ? 'text-cyan-700 dark:text-[#00f2fe]'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-0.5">
            {t.navSlotsShort}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('match')}
          className={`min-h-[46px] flex flex-col items-center justify-center rounded-lg cursor-pointer ${
            activeTab === 'match'
              ? 'text-cyan-700 dark:text-[#00f2fe]'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Swords className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-0.5">
            {t.navMatchShort}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('leaderboard')}
          className={`min-h-[46px] flex flex-col items-center justify-center rounded-lg cursor-pointer ${
            activeTab === 'leaderboard'
              ? 'text-cyan-700 dark:text-[#00f2fe]'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Trophy className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-0.5">
            {t.navLeaderboardShort}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`min-h-[46px] flex flex-col items-center justify-center rounded-lg cursor-pointer ${
            activeTab === 'settings'
              ? 'text-cyan-700 dark:text-[#00f2fe]'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-0.5">
            {t.navSettingsShort}
          </span>
        </button>
      </nav>
    </div>
  );
}
