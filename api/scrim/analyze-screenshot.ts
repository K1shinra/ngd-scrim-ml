import { analyzeMlbbScreenshot } from '../../src/server/screenshotAnalyzer';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
  maxDuration: 60,
};

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const body =
      typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { imageBase64, mimeType, images, knownIgns } = body;

    const hasSingle = typeof imageBase64 === 'string' && imageBase64.length > 0;
    const hasMulti = Array.isArray(images) && images.length > 0;
    if (!hasSingle && !hasMulti) {
      res.status(400).json({ error: 'Missing screenshot image data.' });
      return;
    }

    const result = await analyzeMlbbScreenshot({
      imageBase64: hasSingle ? imageBase64 : undefined,
      mimeType: mimeType || 'image/jpeg',
      images: hasMulti ? images : undefined,
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
