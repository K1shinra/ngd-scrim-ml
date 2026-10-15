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
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    '';

  if (!apiKey) {
    throw new Error(
      'Missing GEMINI_API_KEY on server. Make sure GEMINI_API_KEY is configured in your Vercel Environment Variables.'
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
- The SCOREBOARD/EQUIPMENT screen (shows both teams with Hero Avatars, IGNs, KDAs, Gold, Items, Medal badges, team kills at top, match duration, and Victory/Defeat banner).
- The DATA screen (columns: Hero Damage %, Damage Taken %, Turret Damage %, Teamfight Rate %, Gold).
- Or both uploaded together.

Layout Instructions:
1. Team Blue is on the LEFT column (5 players, ordered top-to-bottom).
   - Each row has: [Hero Avatar + Flag] -> [Player IGN] -> [KDA e.g. 1 4 15] -> [Gold] -> [Medal Emblem & Rating e.g. 7.8].
   - Extract the exact in-game name (strip gender icons ♂/♀, country flags 🇵🇭🇺🇸, and level circles).
2. Team Red is on the RIGHT column (5 players, ordered top-to-bottom).
   - Each row has: [Medal Emblem & Rating] -> [Gold] -> [KDA] -> [Equipment Items] -> [Player IGN] -> [Hero Avatar + Flag].
   - Extract the exact in-game name displayed near the Hero Avatar on the right side.
3. Winner & Match Outcome:
   - Winner must be 'Blue' or 'Red'.
   - Look at the banner in the top center:
     * If banner says "DEFEAT" (and the left team's top player has Defeat MVP / SVP, while right team has the colorful winning MVP crown e.g. rating 11.9): winner is 'Red'.
     * If banner says "VICTORY": winner is 'Blue'.
     * Compare team kill scores at the top (e.g., 25 on left vs 26 on right): higher kills usually belongs to the winning team.
4. Score & Duration:
   - Blue kills (big number on the top left, e.g. 25).
   - Red kills (big number on the top right, e.g. 26).
   - Duration (MM:SS, e.g. "15:15" at the top right near the date).
5. For each player on Team Blue and Team Red (in exact top-to-bottom order):
   - ign: Player's exact in-game name.
   - kda: "K/D/A" string (e.g. "1/4/15", "12/1/9", "13/5/6").
   - rating: Medal rating number (e.g. "10.0", "11.9", "7.8").
   - medal: "MVP", "SVP", "Gold", "Silver", or "Bronze" based on the medal emblem.
   - gold: Total gold (e.g. 9145, 12717).
   - isMvp: true for the winning team's MVP and true for the losing team's SVP/Defeat MVP.
   - isFeeder: true for the player with lowest score / bronze medal / most deaths.
6. Identify mvpIgn (winning team's MVP, e.g. Lux.), svpIgn (losing team's Defeat MVP, e.g. DND Setsuko.), and feederIgn (lowest bronze player).${knownRosterHint}`;

  const contents = {
    parts: [
      ...imageParts,
      {
        text: promptText,
      },
    ],
  };

  // Valid Google Gen AI multimodal models in priority order
  const candidateModels: string[] = [
    'gemini-flash-latest',
    'gemini-3.8-flash',
    'gemini-3.1-flash-lite',
  ];

  let rawText: string | undefined;
  let lastError: unknown = null;

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
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
      // Try once more with standard JSON mode if responseSchema had an issue
      try {
        const fallbackRes = await ai.models.generateContent({
          model,
          contents: {
            parts: [
              ...imageParts,
              {
                text: `${promptText}\n\nIMPORTANT: Return ONLY a valid JSON object matching this structure: { "winner": "Blue"|"Red", "blueKills": number, "redKills": number, "duration": string, "mvpIgn": string, "mvpKda": string, "svpIgn": string, "svpKda": string, "feederIgn": string, "teamBlue": [{ "ign": string, "kda": string, "rating": string, "isMvp": boolean, "heroDamage": number, "heroDamagePct": number, "damageTaken": number, "damageTakenPct": number, "turretDamage": number, "turretDamagePct": number, "teamfightPct": number, "gold": number, "medal": string, "isFeeder": boolean }], "teamRed": [{ "ign": string, "kda": string, "rating": string, "isMvp": boolean, "heroDamage": number, "heroDamagePct": number, "damageTaken": number, "damageTakenPct": number, "turretDamage": number, "turretDamagePct": number, "teamfightPct": number, "gold": number, "medal": string, "isFeeder": boolean }] }`,
              },
            ],
          },
          config: {
            responseMimeType: 'application/json',
          },
        });
        if (fallbackRes.text && fallbackRes.text.trim()) {
          rawText = fallbackRes.text;
          break;
        }
      } catch (innerErr) {
        lastError = innerErr;
      }
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
