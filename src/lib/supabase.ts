import { createClient } from '@supabase/supabase-js';
import {
  INITIAL_LIVE_MATCH,
  LiveMatchState,
  MatchHistoryRecord,
  MlbbRole,
  PlayerProfile,
  ScrimSlot,
} from '../data/ngdData';

const env = import.meta.env as Record<string, string | undefined>;

const supabaseUrl =
  env.VITE_SUPABASE_URL || 'https://yvrpfbzzfhplglvqvfsg.supabase.co';

const supabaseAnonKey =
  env.VITE_SUPABASE_ANON_KEY ||
  env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.VITE_SUPABASE_KEY ||
  '';

export const supabaseClient =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export async function fetchFromSupabase() {
  if (!supabaseClient) return null;

  const [playersRes, slotsRes, matchRes, historyRes] = await Promise.all([
    supabaseClient.from('players').select('*').order('id', { ascending: true }),
    supabaseClient
      .from('scrim_slots')
      .select('*')
      .order('slot_number', { ascending: true }),
    supabaseClient
      .from('scrim_matches')
      .select('*')
      .eq('id', 'active')
      .maybeSingle(),
    supabaseClient
      .from('match_history')
      .select('*')
      .order('id', { ascending: false })
      .limit(25),
  ]);

  if (playersRes.error || slotsRes.error) return null;

  const mappedPlayers: PlayerProfile[] = (playersRes.data || []).map((row) => {
    let parsedCounts: Record<MlbbRole, number> = {
      Jungle: 0,
      'EXP Lane': 0,
      'Mid Lane': 0,
      'Gold Lane': 0,
      Roamer: 0,
      'Flex Role': 0,
    };
    try {
      parsedCounts = JSON.parse(row.role_counts_json || '{}');
    } catch {
      // Ignore JSON error
    }
    return {
      id: String(row.id),
      ign: row.ign,
      squadTag: row.squad_tag || 'NGD',
      primaryRole: row.primary_role as MlbbRole,
      secondaryRole: row.secondary_role as MlbbRole,
      roleLabel: row.role_label,
      wins: row.wins || 0,
      losses: row.losses || 0,
      mvpCount: row.mvp_count || 0,
      streak: row.streak || 0,
      roleCounts: parsedCounts,
      recentForm: [],
      signatureHeroes: [],
      mythicStars: 50,
    };
  });

  const dbSlots = slotsRes.data || [];
  const mappedSlots: (ScrimSlot | null)[] = Array.from(
    { length: 20 },
    (_, idx) => {
      const found = dbSlots.find((s) => s.slot_number === idx + 1);
      if (!found) return null;
      return {
        slotNumber: found.slot_number,
        ign: found.ign,
        role: found.role as MlbbRole,
        secondaryRole: (found.secondary_role as MlbbRole) || undefined,
        roleLabel: found.role_label,
        isReady: found.is_ready,
        assignedAt: found.assigned_at,
      };
    }
  );

  const activeRow = matchRes.data;
  const mappedLiveMatch: LiveMatchState | null = activeRow
    ? {
        matchId: activeRow.match_id,
        roomName: activeRow.room_name,
        hostIgn: INITIAL_LIVE_MATCH.hostIgn,
        seriesFormat: INITIAL_LIVE_MATCH.seriesFormat,
        startedAt: activeRow.started_at,
        teamBlue: JSON.parse(activeRow.team_blue_json || '[]'),
        teamRed: JSON.parse(activeRow.team_red_json || '[]'),
        mvpIgn: activeRow.mvp_ign,
        shuffleNote: activeRow.shuffle_note || undefined,
      }
    : null;

  const mappedHistory: MatchHistoryRecord[] = (historyRes.data || []).map(
    (h) => ({
      id: h.match_code,
      roomName: h.room_name,
      completedAt: h.completed_at,
      winner: (h.winner === 'Red' ? 'Red' : 'Blue') as 'Blue' | 'Red',
      mvpIgn: h.mvp_ign,
      teamBlue: JSON.parse(h.team_blue_json || '[]'),
      teamRed: JSON.parse(h.team_red_json || '[]'),
      durationText: 'Finished',
    })
  );

  return {
    players: mappedPlayers,
    slots: mappedSlots,
    liveMatch: mappedLiveMatch,
    matchHistory: mappedHistory,
    hasPlayers: mappedPlayers.length > 0,
    hasSlots: dbSlots.length > 0,
    hasHistory: mappedHistory.length > 0,
  };
}

export async function deletePlayerFromSupabase(ign: string) {
  if (!supabaseClient) return;
  await supabaseClient.from('players').delete().eq('ign', ign);
}

export async function clearAllPlayersFromSupabase() {
  if (!supabaseClient) return;
  await supabaseClient.from('players').delete().gte('id', 0);
}

export async function syncToSupabase(payload: {
  players: PlayerProfile[];
  slots: (ScrimSlot | null)[];
  liveMatch: LiveMatchState;
  newHistoryRecord?: MatchHistoryRecord | null;
}) {
  if (!supabaseClient) return;

  // 1. Upsert players
  const playerRows = payload.players.map((p) => ({
    ign: p.ign,
    squad_tag: p.squadTag || 'NGD',
    primary_role: p.primaryRole,
    secondary_role: p.secondaryRole,
    role_label: p.roleLabel,
    wins: p.wins,
    losses: p.losses,
    mvp_count: p.mvpCount || 0,
    streak: p.streak || 0,
    role_counts_json: JSON.stringify(p.roleCounts || {}),
  }));

  if (playerRows.length > 0) {
    await supabaseClient.from('players').upsert(playerRows, {
      onConflict: 'ign',
    });
  }

  // 2. Replace 1–20 slots
  await supabaseClient.from('scrim_slots').delete().gte('slot_number', 1);
  const slotRows = payload.slots
    .map((slot, idx) =>
      slot
        ? {
            slot_number: idx + 1,
            ign: slot.ign,
            role: slot.role,
            secondary_role: slot.secondaryRole || null,
            role_label: slot.roleLabel,
            is_ready: slot.isReady,
            assigned_at: slot.assignedAt,
          }
        : null
    )
    .filter((row) => row !== null);

  if (slotRows.length > 0) {
    await supabaseClient.from('scrim_slots').insert(slotRows);
  }

  // 3. Upsert active match
  await supabaseClient.from('scrim_matches').upsert(
    {
      id: 'active',
      match_id: payload.liveMatch.matchId,
      room_name: payload.liveMatch.roomName,
      started_at: payload.liveMatch.startedAt,
      team_blue_json: JSON.stringify(payload.liveMatch.teamBlue),
      team_red_json: JSON.stringify(payload.liveMatch.teamRed),
      mvp_ign: payload.liveMatch.mvpIgn,
      shuffle_note: payload.liveMatch.shuffleNote || null,
    },
    { onConflict: 'id' }
  );

  // 4. Optional match history record
  if (payload.newHistoryRecord) {
    await supabaseClient.from('match_history').insert({
      match_code: payload.newHistoryRecord.id,
      room_name: payload.newHistoryRecord.roomName,
      completed_at: payload.newHistoryRecord.completedAt,
      winner: payload.newHistoryRecord.winner,
      mvp_ign: payload.newHistoryRecord.mvpIgn,
      team_blue_json: JSON.stringify(payload.newHistoryRecord.teamBlue),
      team_red_json: JSON.stringify(payload.newHistoryRecord.teamRed),
    });
  }
}
