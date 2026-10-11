import { asc, desc, notInArray } from 'drizzle-orm';
import { db } from './index.ts';
import {
  matchHistory,
  players,
  scrimMatches,
  scrimSlots,
} from './schema.ts';
import {
  INITIAL_LIVE_MATCH,
  INITIAL_MATCH_HISTORY,
  INITIAL_PLAYERS,
  INITIAL_SLOTS,
  LiveMatchState,
  MatchHistoryRecord,
  MlbbRole,
  PlayerProfile,
  ScrimSlot,
} from '../data/ngdData.ts';

let hasCheckedInitialSeed = false;

export async function ensureInitialSeedData() {
  if (hasCheckedInitialSeed) return;
  hasCheckedInitialSeed = true;
  try {
    const existingPlayers = await db.select().from(players).limit(1);
    if (existingPlayers.length > 0) {
      return;
    }

    for (const p of INITIAL_PLAYERS) {
      await db
        .insert(players)
        .values({
          ign: p.ign,
          squadTag: p.squadTag,
          primaryRole: p.primaryRole,
          secondaryRole: p.secondaryRole,
          roleLabel: p.roleLabel,
          wins: p.wins,
          losses: p.losses,
          mvpCount: p.mvpCount,
          streak: p.streak,
          roleCountsJson: JSON.stringify(p.roleCounts),
        })
        .onConflictDoNothing();
    }

    for (const s of INITIAL_SLOTS) {
      if (s) {
        await db
          .insert(scrimSlots)
          .values({
            slotNumber: s.slotNumber,
            ign: s.ign,
            role: s.role,
            secondaryRole: s.secondaryRole || null,
            roleLabel: s.roleLabel,
            isReady: s.isReady,
            assignedAt: s.assignedAt,
            userUid: null,
          })
          .onConflictDoNothing();
      }
    }

    await db
      .insert(scrimMatches)
      .values({
        id: 'active',
        matchId: INITIAL_LIVE_MATCH.matchId,
        roomName: INITIAL_LIVE_MATCH.roomName,
        startedAt: INITIAL_LIVE_MATCH.startedAt,
        teamBlueJson: JSON.stringify(INITIAL_LIVE_MATCH.teamBlue),
        teamRedJson: JSON.stringify(INITIAL_LIVE_MATCH.teamRed),
        mvpIgn: INITIAL_LIVE_MATCH.mvpIgn,
        shuffleNote: INITIAL_LIVE_MATCH.shuffleNote || null,
      })
      .onConflictDoNothing();

    const existingHistory = await db.select().from(matchHistory).limit(1);
    if (existingHistory.length === 0) {
      for (const h of INITIAL_MATCH_HISTORY) {
        await db.insert(matchHistory).values({
          matchCode: h.id,
          roomName: h.roomName,
          completedAt: h.completedAt,
          winner: h.winner,
          mvpIgn: h.mvpIgn,
          teamBlueJson: JSON.stringify(h.teamBlue),
          teamRedJson: JSON.stringify(h.teamRed),
        });
      }
    }
  } catch (error) {
    console.error('Database seed failed:', error);
    throw new Error('Failed to initialize scrim database.', { cause: error });
  }
}

export async function getFullScrimState() {
  try {
    await ensureInitialSeedData();

    const dbPlayers = await db.select().from(players).orderBy(asc(players.id));
    const dbSlots = await db
      .select()
      .from(scrimSlots)
      .orderBy(asc(scrimSlots.slotNumber));
    const dbMatches = await db.select().from(scrimMatches);
    const dbHistory = await db
      .select()
      .from(matchHistory)
      .orderBy(desc(matchHistory.id))
      .limit(25);

    const mappedPlayers: PlayerProfile[] = dbPlayers.map((row) => {
      let parsedCounts: Record<MlbbRole, number> = {
        Jungle: 0,
        'EXP Lane': 0,
        'Mid Lane': 0,
        'Gold Lane': 0,
        Roamer: 0,
        'Flex Role': 0,
      };
      try {
        parsedCounts = JSON.parse(row.roleCountsJson);
      } catch {
        // Ignore parse error
      }
      return {
        id: String(row.id),
        ign: row.ign,
        squadTag: row.squadTag,
        primaryRole: row.primaryRole as MlbbRole,
        secondaryRole: row.secondaryRole as MlbbRole,
        roleLabel: row.roleLabel,
        wins: row.wins,
        losses: row.losses,
        mvpCount: row.mvpCount,
        streak: row.streak,
        roleCounts: parsedCounts,
        recentForm: [],
        signatureHeroes: [],
        mythicStars: 50,
      };
    });

    const mappedSlots: (ScrimSlot | null)[] = Array.from(
      { length: 20 },
      (_, idx) => {
        const found = dbSlots.find((s) => s.slotNumber === idx + 1);
        if (!found) return null;
        return {
          slotNumber: found.slotNumber,
          ign: found.ign,
          role: found.role as MlbbRole,
          secondaryRole: (found.secondaryRole as MlbbRole) || undefined,
          roleLabel: found.roleLabel,
          isReady: found.isReady,
          assignedAt: found.assignedAt,
        };
      }
    );

    const activeRow = dbMatches.find((m) => m.id === 'active');
    const mappedLiveMatch: LiveMatchState = activeRow
      ? {
          matchId: activeRow.matchId,
          roomName: activeRow.roomName,
          hostIgn: INITIAL_LIVE_MATCH.hostIgn,
          seriesFormat: INITIAL_LIVE_MATCH.seriesFormat,
          startedAt: activeRow.startedAt,
          teamBlue: JSON.parse(activeRow.teamBlueJson),
          teamRed: JSON.parse(activeRow.teamRedJson),
          mvpIgn: activeRow.mvpIgn,
          shuffleNote: activeRow.shuffleNote || undefined,
        }
      : INITIAL_LIVE_MATCH;

    const mappedHistory: MatchHistoryRecord[] = dbHistory.map((h) => ({
      id: h.matchCode,
      roomName: h.roomName,
      completedAt: h.completedAt,
      winner: (h.winner === 'Red' ? 'Red' : 'Blue') as 'Blue' | 'Red',
      mvpIgn: h.mvpIgn,
      teamBlue: JSON.parse(h.teamBlueJson),
      teamRed: JSON.parse(h.teamRedJson),
      durationText: 'Finished',
    }));

    return {
      players: mappedPlayers,
      slots: mappedSlots,
      liveMatch: mappedLiveMatch,
      matchHistory: mappedHistory,
    };
  } catch (error) {
    console.error('Database query failed in getFullScrimState:', error);
    throw new Error('Failed to load scrim state from database.', {
      cause: error,
    });
  }
}

export async function saveFullScrimState(
  payload: {
    players: PlayerProfile[];
    slots: (ScrimSlot | null)[];
    liveMatch: LiveMatchState;
    newHistoryRecord?: MatchHistoryRecord | null;
  },
  userUid?: string
) {
  try {
    // 1. Sync deleted players & upsert remaining players
    if (payload.players.length === 0) {
      await db.delete(players);
    } else {
      const activeIgns = payload.players.map((p) => p.ign);
      await db.delete(players).where(notInArray(players.ign, activeIgns));
    }

    for (const p of payload.players) {
      await db
        .insert(players)
        .values({
          ign: p.ign,
          squadTag: p.squadTag || 'NGD',
          primaryRole: p.primaryRole,
          secondaryRole: p.secondaryRole,
          roleLabel: p.roleLabel,
          wins: p.wins,
          losses: p.losses,
          mvpCount: p.mvpCount || 0,
          streak: p.streak || 0,
          roleCountsJson: JSON.stringify(p.roleCounts || {}),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: players.ign,
          set: {
            primaryRole: p.primaryRole,
            secondaryRole: p.secondaryRole,
            roleLabel: p.roleLabel,
            wins: p.wins,
            losses: p.losses,
            mvpCount: p.mvpCount || 0,
            streak: p.streak || 0,
            roleCountsJson: JSON.stringify(p.roleCounts || {}),
            updatedAt: new Date(),
          },
        });
    }

    // 2. Replace 1–20 slots
    await db.delete(scrimSlots);
    for (let i = 0; i < 20; i++) {
      const slot = payload.slots[i];
      if (slot) {
        await db.insert(scrimSlots).values({
          slotNumber: i + 1,
          ign: slot.ign,
          role: slot.role,
          secondaryRole: slot.secondaryRole || null,
          roleLabel: slot.roleLabel,
          isReady: slot.isReady,
          assignedAt: slot.assignedAt,
          userUid: userUid || null,
          updatedAt: new Date(),
        });
      }
    }

    // 3. Upsert active 5v5 match state
    await db
      .insert(scrimMatches)
      .values({
        id: 'active',
        matchId: payload.liveMatch.matchId,
        roomName: payload.liveMatch.roomName,
        startedAt: payload.liveMatch.startedAt,
        teamBlueJson: JSON.stringify(payload.liveMatch.teamBlue),
        teamRedJson: JSON.stringify(payload.liveMatch.teamRed),
        mvpIgn: payload.liveMatch.mvpIgn,
        shuffleNote: payload.liveMatch.shuffleNote || null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: scrimMatches.id,
        set: {
          matchId: payload.liveMatch.matchId,
          roomName: payload.liveMatch.roomName,
          startedAt: payload.liveMatch.startedAt,
          teamBlueJson: JSON.stringify(payload.liveMatch.teamBlue),
          teamRedJson: JSON.stringify(payload.liveMatch.teamRed),
          mvpIgn: payload.liveMatch.mvpIgn,
          shuffleNote: payload.liveMatch.shuffleNote || null,
          updatedAt: new Date(),
        },
      });

    // 4. Optional new match history record
    if (payload.newHistoryRecord) {
      await db.insert(matchHistory).values({
        matchCode: payload.newHistoryRecord.id,
        roomName: payload.newHistoryRecord.roomName,
        completedAt: payload.newHistoryRecord.completedAt,
        winner: payload.newHistoryRecord.winner,
        mvpIgn: payload.newHistoryRecord.mvpIgn,
        teamBlueJson: JSON.stringify(payload.newHistoryRecord.teamBlue),
        teamRedJson: JSON.stringify(payload.newHistoryRecord.teamRed),
      });
    }

    return { ok: true };
  } catch (error) {
    console.error('Database save failed in saveFullScrimState:', error);
    throw new Error('Failed to save scrim state to database.', {
      cause: error,
    });
  }
}
