import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser } from './src/db/users.ts';
import {
  getFullScrimState,
  saveFullScrimState,
} from './src/db/scrimRepository.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));

  app.get('/api/scrim/state', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (req.user) {
        await getOrCreateUser(
          req.user.uid,
          req.user.email || 'player@ngd.gg',
          req.user.name || null
        );
      }
      const state = await getFullScrimState();
      res.json(state);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch scrim state';
      console.error('Error in GET /api/scrim/state:', error);
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/scrim/state', requireAuth, async (req: AuthRequest, res) => {
    try {
      let userUid: string | undefined;
      if (req.user) {
        const dbUser = await getOrCreateUser(
          req.user.uid,
          req.user.email || 'player@ngd.gg',
          req.user.name || null
        );
        userUid = dbUser.uid;
      }

      const { players, slots, liveMatch, newHistoryRecord } = req.body;
      const result = await saveFullScrimState(
        { players, slots, liveMatch, newHistoryRecord },
        userUid
      );
      res.json(result);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to save scrim state';
      console.error('Error in POST /api/scrim/state:', error);
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
