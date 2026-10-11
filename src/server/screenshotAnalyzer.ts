import { GoogleGenAI, Type } from '@google/genai';

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

export async function analyzeMlbbScreenshot(params: {
  imageBase64: string;
  mimeType: string;
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

  const cleanBase64 = params.imageBase64.replace(
    /^data:image\/[a-zA-Z0-9+.-]+;base64,/,
    ''
  );

  const knownRosterHint =
    params.knownIgns && params.knownIgns.length > 0
      ? `\nKnown NGD Squad & Scrim player IGNs (if a player name in the screenshot closely matches one of these, use the exact spelling from this list): ${params.knownIgns.join(', ')}`
      : '';

  const promptText = `Analyze this Mobile Legends: Bang Bang (MLBB) post-match Battle Result screenshot.
Extract:
1. The left column is Team Blue (5 players) and the right column is Team Red (5 players).
2. Determine which team won ('Blue' or 'Red'). Note: In MLBB battle results, the top banner says VICTORY or DEFEAT for the viewer's side, or look at which side has the gold winning MVP badge vs the purple Defeat MVP badge. The side with the gold crown MVP badge (and higher medal grades overall / winning crystal) is the winner.
3. Extract the total kills for Team Blue (left big score number) and Team Red (right big score number), and the match duration (e.g. "17:44" next to Duration).
4. Extract all 5 players on Team Blue (left side) and all 5 players on Team Red (right side), including each player's IGN, KDA (e.g. "11/4/7" if visible, or damage/stat summary if it is the Data tab), rating grade (e.g. "10.5"), and whether they are the MVP/SVP.
5. Identify mvpIgn (the best player / gold MVP on the winning team) and svpIgn (the best player / purple Defeat MVP on the losing team).${knownRosterHint}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: params.mimeType || 'image/jpeg',
            data: cleanBase64,
          },
        },
        {
          text: promptText,
        },
      ],
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
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
      },
    },
  });

  const rawText = response.text;
  if (!rawText) {
    throw new Error('Empty response from Gemini Vision.');
  }

  const parsed = JSON.parse(rawText.trim()) as ExtractedBattleResult;
  return {
    ...parsed,
    winner: parsed.winner === 'Red' ? 'Red' : 'Blue',
  };
}
