import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

export interface ExtractedPlayerStat {
  ign: string;
  kda: string;
  rating: string;
  isMvp: boolean;
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
  teamBlue: ExtractedPlayerStat[];
  teamRed: ExtractedPlayerStat[];
}

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    winner: {
      type: Type.STRING,
      description: "Winning team: 'Blue' (left side) or 'Red' (right side).",
    },
    blueKills: {
      type: Type.INTEGER,
      description: 'Total kills for Team Blue (left score).',
    },
    redKills: {
      type: Type.INTEGER,
      description: 'Total kills for Team Red (right score).',
    },
    duration: {
      type: Type.STRING,
      description: 'Match duration in MM:SS format (e.g. 17:44).',
    },
    mvpIgn: {
      type: Type.STRING,
      description: 'IGN of the winning team MVP.',
    },
    mvpKda: {
      type: Type.STRING,
      description: 'KDA and rating of the winning MVP (e.g. 3/2/14 · 10.5).',
    },
    svpIgn: {
      type: Type.STRING,
      description: 'IGN of the losing team Defeat MVP (SVP).',
    },
    svpKda: {
      type: Type.STRING,
      description: 'KDA and rating of the losing team SVP (e.g. 4/3/13 · 9.9).',
    },
    teamBlue: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          ign: { type: Type.STRING },
          kda: { type: Type.STRING },
          rating: { type: Type.STRING },
          isMvp: { type: Type.BOOLEAN },
        },
        required: ['ign', 'kda', 'rating', 'isMvp'],
      },
    },
    teamRed: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          ign: { type: Type.STRING },
          kda: { type: Type.STRING },
          rating: { type: Type.STRING },
          isMvp: { type: Type.BOOLEAN },
        },
        required: ['ign', 'kda', 'rating', 'isMvp'],
      },
    },
  },
  required: [
    'winner',
    'blueKills',
    'redKills',
    'duration',
    'mvpIgn',
    'mvpKda',
    'svpIgn',
    'svpKda',
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

  const promptText = `Analyze the provided Mobile Legends: Bang Bang (MLBB) post-match Battle Result screenshot(s) (which may include the Equipment/KDA scoreboard tab, the Data/Damage tab, or both).
Extract:
1. The left column is Team Blue (5 players, top to bottom) and the right column is Team Red (5 players, top to bottom).
2. Determine which team won ('Blue' or 'Red'). Note: In MLBB battle results, the top banner says VICTORY or DEFEAT for the left side, or look at which side has the bright gold winning MVP crown badge vs the Losing MVP badge. If the top banner says VICTORY, Team Blue (left side) won. If DEFEAT, Team Red (right side) won.
3. Extract the total kills for Team Blue (left big score number next to VICTORY/DEFEAT, e.g. 22) and Team Red (right big score number, e.g. 21), and the match duration in MM:SS format (e.g. "15:03" next to Duration at the top right, even if partially covered by a tooltip).
4. Extract all 5 players on Team Blue (left side) and all 5 players on Team Red (right side) in exact top-to-bottom row order:
   - ign: Player's exact in-game name (remove gender icons like ♂ or ♀, e.g. "EXE yang", "POSE db sion", "syven kai", "HATE Mi amor.", "DND Akira.", "xTriggered", "TAKESHI.", "Setsuko.", "Whis", "S").
   - kda: If KDA numbers (Kills Deaths Assists) are visible, format as "K/D/A" (e.g. "12/2/2", "1/4/11", "9/4/8"). If only the Data/Damage tab is provided without KDA numbers, format kda as Hero Damage % and Teamfight % (e.g. "37% DMG · 64% TF").
   - rating: Medal rating number if visible (e.g. "10.7", "7.4", "9.4"), or empty string if on Data tab only.
   - isMvp: true ONLY for the 1 best player (MVP) on Team Blue and the 1 best player (MVP/SVP) on Team Red.
5. Identify mvpIgn (the winning team's MVP) and svpIgn (the losing team's best player / SVP).${knownRosterHint}`;

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
      return {
        ign:
          typeof obj.ign === 'string' && obj.ign.trim()
            ? obj.ign.trim()
            : `Player ${idx + 1}`,
        kda: typeof obj.kda === 'string' ? obj.kda.trim() : '',
        rating: typeof obj.rating === 'string' ? obj.rating.trim() : '',
        isMvp: Boolean(obj.isMvp),
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
    teamBlue: sanitizeTeam(parsed.teamBlue),
    teamRed: sanitizeTeam(parsed.teamRed),
  };
}
