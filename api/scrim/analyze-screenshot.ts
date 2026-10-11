import { analyzeMlbbScreenshot } from '../../src/server/screenshotAnalyzer.ts';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const body =
      typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { imageBase64, mimeType, knownIgns } = body;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      res.status(400).json({ error: 'Missing screenshot imageBase64 data.' });
      return;
    }

    const result = await analyzeMlbbScreenshot({
      imageBase64,
      mimeType: mimeType || 'image/jpeg',
      knownIgns: Array.isArray(knownIgns) ? knownIgns : [],
    });

    res.status(200).json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to analyze MLBB screenshot';
    console.error('Vercel API /api/scrim/analyze-screenshot error:', error);
    res.status(500).json({ error: message });
  }
}
