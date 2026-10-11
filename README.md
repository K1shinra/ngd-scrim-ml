# NGD Scrim Management System

5v5 Mobile Legends: Bang Bang (MLBB) In-House Scrim Manager (`1–20 Player Slots`, `5v5 Team Shuffle & Auto-Balancer`, `Leaderboard`, and `English / Tagalog + Light / Dark / System Settings`).

## 📦 Included Database Files
- `src/db/schema.ts` — Drizzle ORM PostgreSQL table definitions (`users`, `scrim_slots`, `players`, `scrim_matches`, `match_history`)
- `src/db/index.ts` — PostgreSQL connection pool
- `src/db/scrimRepository.ts` — Type-safe Drizzle queries for reading and saving 1–20 slots, 5v5 teams, and leaderboard stats
- `supabase_schema.sql` — Ready-to-run SQL script for Supabase SQL Editor

## 🚀 Local Development
```bash
npm install
npm run dev
```
