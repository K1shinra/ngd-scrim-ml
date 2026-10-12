import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

export interface ExtractedPlayerStat {
  ign: string;
  kda: string;
  rating: string;
  isMvp: boolean;
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
}

export interface ExtractedBattleResult {
  winner: 'Blue' | 'Red';
  blueKills: number;
  redKills: number;
  duration: string;
  mvpIgn: string;
  mvpKda: string;
  svpIgn: string;
  svpKda: string;
  feederIgn?: string;
  teamBlue: ExtractedPlayerStat[];
  teamRed: ExtractedPlayerStat[];
}

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    winner: {
      type: Type.STRING,
      description: "Winning team: 'Blue' (left side) or 'Red' (right side). Look at VICTORY/DEFEAT banner or winning gold MVP badge.",
    },
    blueKills: {
      type: Type.INTEGER,
      description: 'Total kills for Team Blue (left score, e.g. 22). If only Data tab is uploaded, extract or estimate 0.',
    },
    redKills: {
      type: Type.INTEGER,
      description: 'Total kills for Team Red (right score, e.g. 21). If only Data tab is uploaded, extract or estimate 0.',
    },
    duration: {
      type: Type.STRING,
      description: 'Match duration in MM:SS format (e.g. 17:44 or 15:03). Empty string if not visible.',
    },
    mvpIgn: {
      type: Type.STRING,
      description: 'IGN of the winning team MVP (or highest performance player).',
    },
    mvpKda: {
      type: Type.STRING,
      description: 'KDA or stats of winning MVP (e.g. 3/2/14 · 10.5 or 37% DMG).',
    },
    svpIgn: {
      type: Type.STRING,
      description: 'IGN of the losing team Defeat MVP / SVP.',
    },
    svpKda: {
      type: Type.STRING,
      description: 'KDA or stats of losing SVP.',
    },
    feederIgn: {
      type: Type.STRING,
      description: 'IGN of the match feeder / lowest performer / bronze medal player with most deaths or lowest rating.',
    },
    teamBlue: {
      type: Type.ARRAY,
      description: '5 players of Team Blue (left column, top to bottom)',
      items: {
        type: Type.OBJECT,
        properties: {
          ign: { type: Type.STRING },
          kda: { type: Type.STRING },
          rating: { type: Type.STRING },
          isMvp: { type: Type.BOOLEAN },
          heroDamage: { type: Type.INTEGER, description: 'Hero Damage dealt (e.g. 98450)' },
          heroDamagePct: { type: Type.INTEGER, description: 'Hero Damage percentage (e.g. 34 for 34%)' },
          damageTaken: { type: Type.INTEGER, description: 'Damage Taken (e.g. 82100)' },
          damageTakenPct: { type: Type.INTEGER, description: 'Damage Taken percentage (e.g. 31 for 31%)' },
          turretDamage: { type: Type.INTEGER, description: 'Turret/Push Damage (e.g. 5400)' },
          turretDamagePct: { type: Type.INTEGER, description: 'Turret Damage percentage (e.g. 42 for 42%)' },
          teamfightPct: { type: Type.INTEGER, description: 'Teamfight participation rate (e.g. 72 for 72%)' },
          gold: { type: Type.INTEGER, description: 'Total Gold / Net worth' },
          medal: { type: Type.STRING, description: 'MVP, SVP, Gold, Silver, or Bronze' },
          isFeeder: { type: Type.BOOLEAN, description: 'True for the player with lowest score or highest deaths' },
        },
        required: ['ign'],
      },
    },
    teamRed: {
      type: Type.ARRAY,
      description: '5 players of Team Red (right column, top to bottom)',
      items: {
        type: Type.OBJECT,
        properties: {
          ign: { type: Type.STRING },
          kda: { type: Type.STRING },
          rating: { type: Type.STRING },
          isMvp: { type: Type.BOOLEAN },
          heroDamage: { type: Type.INTEGER, description: 'Hero Damage dealt (e.g. 98450)' },
          heroDamagePct: { type: Type.INTEGER, description: 'Hero Damage percentage (e.g. 34 for 34%)' },
          damageTaken: { type: Type.INTEGER, description: 'Damage Taken (e.g. 82100)' },
          damageTakenPct: { type: Type.INTEGER, description: 'Damage Taken percentage (e.g. 31 for 31%)' },
          turretDamage: { type: Type.INTEGER, description: 'Turret/Push Damage (e.g. 5400)' },
          turretDamagePct: { type: Type.INTEGER, description: 'Turret Damage percentage (e.g. 42 for 42%)' },
          teamfightPct: { type: Type.INTEGER, description: 'Teamfight participation rate (e.g. 72 for 72%)' },
          gold: { type: Type.INTEGER, description: 'Total Gold / Net worth' },
          medal: { type: Type.STRING, description: 'MVP, SVP, Gold, Silver, or Bronze' },
          isFeeder: { type: Type.BOOLEAN, description: 'True for the player with lowest score or highest deaths' },
        },
        required: ['ign'],
      },
    },
  },
  required: [
    'winner',
    'teamBlue',
    'teamRed',
  ],
};

export async function analyzeMlbbScreenshot(params: {
  imageBase64?: string;
  mimeType?: string;
  images?: { imageBase64: string; mimeType?: string }[];
  knownIgns?: string[];
}): Promise<ExtractedBattleResult> {
  const apiKey =
    process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';

  if (!apiKey) {
    throw new Error(
      'Missing GEMINI_API_KEY on server. Add GEMINI_API_KEY in Environment Variables.'
    );
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const rawImageInputs: { imageBase64: string; mimeType?: string }[] =
    Array.isArray(params.images) && params.images.length > 0
      ? params.images
      : params.imageBase64
        ? [{ imageBase64: params.imageBase64, mimeType: params.mimeType }]
        : [];

  if (rawImageInputs.length === 0) {
    throw new Error('No screenshot image data provided.');
  }

  const imageParts = rawImageInputs.slice(0, 4).map((img) => ({
    inlineData: {
      mimeType: img.mimeType || 'image/jpeg',
      data: img.imageBase64.replace(
        /^data:image\/[a-zA-Z0-9+.-]+;base64,/,
        ''
      ),
    },
  }));

  const knownRosterHint =
    params.knownIgns && params.knownIgns.length > 0
      ? `\nKnown NGD Squad & Scrim player IGNs (ONLY use one of these if a player name in the screenshot actually matches it; otherwise keep the exact IGN shown in the screenshot, stripping gender symbols like ♂/♀): ${params.knownIgns.join(', ')}`
      : '';

  const promptText = `Analyze the provided Mobile Legends: Bang Bang (MLBB) post-match Battle Result screenshot(s).
The screenshots can be:
- The DATA screen (columns: Hero Avatar/IGN, Hero Damage + %, Damage Taken + %, Turret Damage/Push + %, Teamfight Rate %, Gold/Net Worth).
- The SCOREBOARD/EQUIPMENT screen (columns: Hero Avatar/IGN, KDA e.g. 12/2/8, Medal Rating e.g. 10.5, Gold, Items).
- Or both uploaded together.

Instructions:
1. Team Blue is on the left side (5 players, ordered top-to-bottom).
2. Team Red is on the right side (5 players, ordered top-to-bottom).
3. Winner: Look at the top banner (VICTORY on left = Blue won; VICTORY on right / DEFEAT on left = Red won) or the gold winning MVP crown badge vs losing Defeat MVP (SVP) badge. Winner must be 'Blue' or 'Red'.
4. Score & Duration:
   - Blue kills & Red kills (big team score numbers at the top). If only the Data screen is uploaded without kills, estimate or default to 0.
   - Duration (MM:SS, e.g. "17:44" or "15:03" usually at the top right).
5. For each player on Team Blue and Team Red (in exact top-to-bottom order):
   - ign: Player's exact in-game name (strip gender icons ♂/♀ and decorative bracket artifacts).
   - kda: "K/D/A" string (e.g. "12/2/2", "1/7/4"). If on Data screen without KDA, format as "34% DMG · 65% TF".
   - rating: Medal rating number (e.g. "10.8", "7.4", "3.2").
   - medal: "MVP", "SVP", "Gold", "Silver", or "Bronze" based on the medal emblem.
   - heroDamage: Raw hero damage dealt number if visible (e.g. 104231).
   - heroDamagePct: Percentage of team damage (e.g. 37 for 37%).
   - damageTaken: Raw damage taken number if visible (e.g. 89450).
   - damageTakenPct: Percentage of team damage taken (e.g. 31 for 31%).
   - turretDamage: Raw turret push damage number if visible (e.g. 5600).
   - turretDamagePct: Percentage of turret damage (e.g. 45 for 45%).
   - teamfightPct: Teamfight participation rate (e.g. 74 for 74%).
   - gold: Total gold if visible.
   - isMvp: true ONLY for the 1 best player on Team Blue and the 1 best player on Team Red.
   - isFeeder: true for the player with lowest score, bronze medal, or most deaths.
6. Identify mvpIgn (winning team's MVP), svpIgn (losing team's Defeat MVP), and feederIgn (player with bronze medal / lowest score / feeder in the match).${knownRosterHint}`;

  const contents = {
    parts: [
      ...imageParts,
      {
        text: promptText,
      },
    ],
  };

  // Try available fast multimodal models in priority order so temporary 503 demand spikes on any single model never break scanning
  const candidateModels: { model: string; useLowThinking?: boolean }[] = [
    { model: 'gemini-3-flash-preview', useLowThinking: true },
    { model: 'gemini-flash-lite-latest' },
    { model: 'gemini-3.1-flash-lite-preview' },
    { model: 'gemini-3.8-flash', useLowThinking: true },
    { model: 'gemini-flash-latest' },
  ];

  let rawText: string | undefined;
  let lastError: unknown = null;

  for (const candidate of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model: candidate.model,
        contents,
        config: {
          ...(candidate.useLowThinking
            ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
            : {}),
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      });
      if (response.text && response.text.trim()) {
        rawText = response.text;
        break;
      }
    } catch (err) {
      lastError = err;
    }
  }

  if (!rawText) {
    throw lastError instanceof Error
      ? lastError
      : new Error('Empty response from Gemini Vision.');
  }

  const cleanedJson = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const parsed = JSON.parse(cleanedJson) as Partial<ExtractedBattleResult>;

  const sanitizeTeam = (list: unknown): ExtractedPlayerStat[] => {
    if (!Array.isArray(list)) return [];
    return list.map((item, idx) => {
      const obj = (item || {}) as Record<string, unknown>;
      const parseNum = (val: unknown): number | undefined => {
        if (typeof val === 'number' && !Number.isNaN(val)) return Math.round(val);
        if (typeof val === 'string') {
          const clean = val.replace(/[^0-9.-]/g, '');
          const n = Number(clean);
          if (!Number.isNaN(n)) return Math.round(n);
        }
        return undefined;
      };

      return {
        ign:
          typeof obj.ign === 'string' && obj.ign.trim()
            ? obj.ign.trim()
            : `Player ${idx + 1}`,
        kda: typeof obj.kda === 'string' ? obj.kda.trim() : '',
        rating: typeof obj.rating === 'string' ? obj.rating.trim() : '',
        isMvp: Boolean(obj.isMvp),
        heroDamage: parseNum(obj.heroDamage),
        heroDamagePct: parseNum(obj.heroDamagePct),
        damageTaken: parseNum(obj.damageTaken),
        damageTakenPct: parseNum(obj.damageTakenPct),
        turretDamage: parseNum(obj.turretDamage),
        turretDamagePct: parseNum(obj.turretDamagePct),
        teamfightPct: parseNum(obj.teamfightPct),
        gold: parseNum(obj.gold),
        medal: typeof obj.medal === 'string' ? obj.medal.trim() : undefined,
        isFeeder: Boolean(obj.isFeeder),
      };
    });
  };

  return {
    winner:
      typeof parsed.winner === 'string' &&
      parsed.winner.toLowerCase().includes('red')
        ? 'Red'
        : 'Blue',
    blueKills:
      typeof parsed.blueKills === 'number' && !Number.isNaN(parsed.blueKills)
        ? parsed.blueKills
        : Number(parsed.blueKills) || 0,
    redKills:
      typeof parsed.redKills === 'number' && !Number.isNaN(parsed.redKills)
        ? parsed.redKills
        : Number(parsed.redKills) || 0,
    duration: typeof parsed.duration === 'string' ? parsed.duration.trim() : '',
    mvpIgn: typeof parsed.mvpIgn === 'string' ? parsed.mvpIgn.trim() : '',
    mvpKda: typeof parsed.mvpKda === 'string' ? parsed.mvpKda.trim() : '',
    svpIgn: typeof parsed.svpIgn === 'string' ? parsed.svpIgn.trim() : '',
    svpKda: typeof parsed.svpKda === 'string' ? parsed.svpKda.trim() : '',
    feederIgn: typeof parsed.feederIgn === 'string' ? parsed.feederIgn.trim() : undefined,
    teamBlue: sanitizeTeam(parsed.teamBlue),
    teamRed: sanitizeTeam(parsed.teamRed),
  };
}
