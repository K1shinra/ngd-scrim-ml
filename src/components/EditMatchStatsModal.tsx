import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Trophy,
  Award,
  Skull,
  Swords,
  Coins,
  Shield,
  Clock,
  Sparkles,
  ChevronDown,
  RotateCcw,
  Edit3,
} from 'lucide-react';
import { MatchHistoryRecord, MatchParticipant, ROLE_META } from '../data/ngdData';
import {
  parseKdaValues,
  formatKdaValues,
  calculateKdaRatio,
} from './ManualStatsEditor';

interface EditMatchStatsModalProps {
  match: MatchHistoryRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: MatchHistoryRecord) => void;
}

export const EditMatchStatsModal: React.FC<EditMatchStatsModalProps> = ({
  match,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen || !match) return null;

  const [winner, setWinner] = useState<'Blue' | 'Red'>(match.winner);
  const [roomName, setRoomName] = useState(match.roomName || 'Custom 5v5');
  const [durationText, setDurationText] = useState(match.durationText || '15:00');
  const [blueKills, setBlueKills] = useState<number | ''>(
    match.blueKills !== undefined ? match.blueKills : ''
  );
  const [redKills, setRedKills] = useState<number | ''>(
    match.redKills !== undefined ? match.redKills : ''
  );
  const [mvpIgn, setMvpIgn] = useState(match.mvpIgn || '');
  const [svpIgn, setSvpIgn] = useState(match.svpIgn || '');
  const [feederIgn, setFeederIgn] = useState(match.feederIgn || '');

  const [teamBlue, setTeamBlue] = useState<MatchParticipant[]>(() =>
    JSON.parse(JSON.stringify(match.teamBlue || []))
  );
  const [teamRed, setTeamRed] = useState<MatchParticipant[]>(() =>
    JSON.parse(JSON.stringify(match.teamRed || []))
  );

  // Sync state if match prop changes
  useEffect(() => {
    if (match) {
      setWinner(match.winner);
      setRoomName(match.roomName || 'Custom 5v5');
      setDurationText(match.durationText || '15:00');
      setBlueKills(match.blueKills !== undefined ? match.blueKills : '');
      setRedKills(match.redKills !== undefined ? match.redKills : '');
      setMvpIgn(match.mvpIgn || '');
      setSvpIgn(match.svpIgn || '');
      setFeederIgn(match.feederIgn || '');
      setTeamBlue(JSON.parse(JSON.stringify(match.teamBlue || [])));
      setTeamRed(JSON.parse(JSON.stringify(match.teamRed || [])));
    }
  }, [match]);

  const allPlayers = [...teamBlue, ...teamRed];

  const updateBluePlayer = (index: number, patch: Partial<MatchParticipant>) => {
    setTeamBlue((prev) => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], ...patch };
      }
      return copy;
    });
  };

  const updateRedPlayer = (index: number, patch: Partial<MatchParticipant>) => {
    setTeamRed((prev) => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], ...patch };
      }
      return copy;
    });
  };

  const handleSetPlayerKda = (
    team: 'Blue' | 'Red',
    index: number,
    part: 'k' | 'd' | 'a',
    val: number
  ) => {
    const list = team === 'Blue' ? teamBlue : teamRed;
    const cur = parseKdaValues(list[index]?.kda);
    const updated = {
      kills: part === 'k' ? Math.max(0, val) : cur.kills,
      deaths: part === 'd' ? Math.max(0, val) : cur.deaths,
      assists: part === 'a' ? Math.max(0, val) : cur.assists,
    };
    const formatted = formatKdaValues(updated.kills, updated.deaths, updated.assists);
    if (team === 'Blue') {
      updateBluePlayer(index, { kda: formatted });
    } else {
      updateRedPlayer(index, { kda: formatted });
    }
  };

  const handleStepKda = (
    team: 'Blue' | 'Red',
    index: number,
    part: 'k' | 'd' | 'a',
    delta: number
  ) => {
    const list = team === 'Blue' ? teamBlue : teamRed;
    const cur = parseKdaValues(list[index]?.kda);
    const currentVal = part === 'k' ? cur.kills : part === 'd' ? cur.deaths : cur.assists;
    handleSetPlayerKda(team, index, part, currentVal + delta);
  };

  const handleSave = () => {
    let formattedScore = match.killScore;
    if (blueKills !== '' || redKills !== '') {
      formattedScore = `Blue ${blueKills || 0} - ${redKills || 0} Red${
        durationText ? ` (${durationText})` : ''
      }`;
    }

    const updated: MatchHistoryRecord = {
      ...match,
      roomName,
      winner,
      durationText,
      blueKills: blueKills !== '' ? Number(blueKills) : undefined,
      redKills: redKills !== '' ? Number(redKills) : undefined,
      killScore: formattedScore,
      mvpIgn: mvpIgn.trim() || match.mvpIgn,
      svpIgn: svpIgn.trim() || undefined,
      feederIgn: feederIgn.trim() || undefined,
      teamBlue,
      teamRed,
    };

    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl my-auto rounded-2xl bg-white dark:bg-[#0b0f19] border border-cyan-500/40 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-cyan-600 dark:bg-[#00f2fe] text-white dark:text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-sm">
              <Edit3 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-display font-bold text-slate-900 dark:text-white truncate">
                  Edit Match Stats & Battle Result
                </h2>
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-700 dark:text-[#00f2fe] text-[10px] font-mono font-bold shrink-0">
                  ADMIN ONLY
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {match.id} · {match.completedAt} · Input or correct missing player stats (KDA, Damage, Gold)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Section 1: Match Overall Overview */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-cyan-600 dark:text-[#00f2fe]" />
              <span>Match Details & Outcome</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Winner Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Match Winner
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-200 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setWinner('Blue')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                      winner === 'Blue'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span>🔵 Blue Win</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWinner('Red')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                      winner === 'Red'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span>🔴 Red Win</span>
                  </button>
                </div>
              </div>

              {/* Blue & Red Kills */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Kill Score (Blue vs Red)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="0"
                    value={blueKills}
                    onChange={(e) =>
                      setBlueKills(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                    }
                    placeholder="Blue Kills"
                    className="w-full h-9 px-2.5 rounded-lg bg-white dark:bg-[#0b0f19] border border-blue-500/40 text-xs font-mono font-bold text-blue-600 dark:text-blue-400 text-center focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="number"
                    min="0"
                    value={redKills}
                    onChange={(e) =>
                      setRedKills(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                    }
                    placeholder="Red Kills"
                    className="w-full h-9 px-2.5 rounded-lg bg-white dark:bg-[#0b0f19] border border-rose-500/40 text-xs font-mono font-bold text-rose-600 dark:text-rose-400 text-center focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Match Duration */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Duration (e.g. 16:42)
                </label>
                <div className="relative">
                  <Clock className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={durationText}
                    onChange={(e) => setDurationText(e.target.value)}
                    placeholder="15:00"
                    className="w-full h-9 pl-8 pr-3 rounded-lg bg-white dark:bg-[#0b0f19] border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* MVP, SVP, Feeder */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-semibold text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-yellow-500" />
                  <span>Match MVP</span>
                </label>
                <select
                  value={mvpIgn}
                  onChange={(e) => setMvpIgn(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg bg-white dark:bg-[#0b0f19] border border-amber-500/40 text-xs font-semibold text-amber-800 dark:text-amber-300 focus:outline-none focus:border-amber-400"
                >
                  <option value="">-- Pumili ng MVP --</option>
                  {allPlayers.map((p, idx) => (
                    <option key={`${p.ign}-${idx}`} value={p.ign}>
                      {p.ign} ({p.selectedRole})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-purple-700 dark:text-purple-400 mb-1 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-purple-500" />
                  <span>Defeat SVP</span>
                </label>
                <select
                  value={svpIgn}
                  onChange={(e) => setSvpIgn(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg bg-white dark:bg-[#0b0f19] border border-purple-500/40 text-xs font-semibold text-purple-800 dark:text-purple-300 focus:outline-none focus:border-purple-400"
                >
                  <option value="">-- Pumili ng SVP (Opsyonal) --</option>
                  {allPlayers.map((p, idx) => (
                    <option key={`${p.ign}-${idx}`} value={p.ign}>
                      {p.ign} ({p.selectedRole})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <Skull className="w-3.5 h-3.5 text-amber-500" />
                  <span>Tanso / Feeder (Opsyonal)</span>
                </label>
                <select
                  value={feederIgn}
                  onChange={(e) => setFeederIgn(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg bg-white dark:bg-[#0b0f19] border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="">-- None --</option>
                  {allPlayers.map((p, idx) => (
                    <option key={`${p.ign}-${idx}`} value={p.ign}>
                      {p.ign}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Player Stats Inputs (KDA Pickers + Typed Damage & Gold) */}
          <div className="space-y-4">
            {/* Team Blue */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-cyan-700 dark:text-[#00f2fe] px-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  <span>TEAM BLUE PLAYERS (5)</span>
                </span>
                <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                  Piliin ang KDA numbers · I-type ang Hero Damage at Gold
                </span>
              </div>

              <div className="space-y-2">
                {teamBlue.map((p, i) => {
                  const kda = parseKdaValues(p.kda);
                  const ratio = calculateKdaRatio(kda.kills, kda.deaths, kda.assists);
                  return (
                    <div
                      key={`blue-${p.ign}-${i}`}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-blue-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                    >
                      {/* Player Info */}
                      <div className="w-full md:w-44 shrink-0">
                        <div className="font-display font-bold text-slate-900 dark:text-white truncate">
                          {p.ign}
                        </div>
                        <div className="text-[11px] text-cyan-700 dark:text-[#00f2fe] font-mono">
                          {p.selectedRole || p.assignedLane || 'Flex'}
                        </div>
                      </div>

                      {/* Fast KDA Pickers (K / D / A) */}
                      <div className="flex items-center gap-2">
                        {/* Kills */}
                        <div className="flex items-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-1">
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 px-1">
                            K:
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStepKda('Blue', i, 'k', -1)}
                            className="w-5 h-6 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-emerald-500 hover:text-white cursor-pointer"
                          >
                            -
                          </button>
                          <select
                            value={kda.kills}
                            onChange={(e) =>
                              handleSetPlayerKda('Blue', i, 'k', parseInt(e.target.value, 10))
                            }
                            className="w-11 h-6 bg-transparent text-center font-mono font-bold text-emerald-700 dark:text-emerald-300 text-xs focus:outline-none cursor-pointer"
                          >
                            {Array.from({ length: 35 }, (_, n) => (
                              <option key={n} value={n} className="bg-slate-900 text-white">
                                {n}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleStepKda('Blue', i, 'k', 1)}
                            className="w-5 h-6 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-emerald-500 hover:text-white cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        {/* Deaths */}
                        <div className="flex items-center rounded-lg bg-rose-500/10 border border-rose-500/30 p-1">
                          <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 px-1">
                            D:
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStepKda('Blue', i, 'd', -1)}
                            className="w-5 h-6 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-rose-500 hover:text-white cursor-pointer"
                          >
                            -
                          </button>
                          <select
                            value={kda.deaths}
                            onChange={(e) =>
                              handleSetPlayerKda('Blue', i, 'd', parseInt(e.target.value, 10))
                            }
                            className="w-11 h-6 bg-transparent text-center font-mono font-bold text-rose-700 dark:text-rose-300 text-xs focus:outline-none cursor-pointer"
                          >
                            {Array.from({ length: 25 }, (_, n) => (
                              <option key={n} value={n} className="bg-slate-900 text-white">
                                {n}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleStepKda('Blue', i, 'd', 1)}
                            className="w-5 h-6 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-rose-500 hover:text-white cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        {/* Assists */}
                        <div className="flex items-center rounded-lg bg-cyan-500/10 border border-cyan-500/30 p-1">
                          <span className="text-[10px] font-bold text-cyan-700 dark:text-cyan-400 px-1">
                            A:
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStepKda('Blue', i, 'a', -1)}
                            className="w-5 h-6 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-cyan-500 hover:text-white cursor-pointer"
                          >
                            -
                          </button>
                          <select
                            value={kda.assists}
                            onChange={(e) =>
                              handleSetPlayerKda('Blue', i, 'a', parseInt(e.target.value, 10))
                            }
                            className="w-11 h-6 bg-transparent text-center font-mono font-bold text-cyan-700 dark:text-cyan-300 text-xs focus:outline-none cursor-pointer"
                          >
                            {Array.from({ length: 35 }, (_, n) => (
                              <option key={n} value={n} className="bg-slate-900 text-white">
                                {n}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleStepKda('Blue', i, 'a', 1)}
                            className="w-5 h-6 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-cyan-500 hover:text-white cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        <span className="text-[10px] font-mono font-bold text-slate-500 hidden sm:inline">
                          ({ratio})
                        </span>
                      </div>

                      {/* Hero Damage & Gold (Direct typing input) */}
                      <div className="flex items-center gap-2">
                        <div className="w-28 relative">
                          <input
                            type="number"
                            min="0"
                            value={p.heroDamage || ''}
                            onChange={(e) =>
                              updateBluePlayer(i, {
                                heroDamage:
                                  e.target.value === '' ? undefined : parseInt(e.target.value, 10),
                              })
                            }
                            placeholder="Hero Dmg"
                            className="w-full h-8 px-2 rounded-lg bg-white dark:bg-[#0b0f19] border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-500"
                          />
                        </div>

                        <div className="w-24 relative">
                          <input
                            type="number"
                            min="0"
                            value={p.gold || ''}
                            onChange={(e) =>
                              updateBluePlayer(i, {
                                gold:
                                  e.target.value === '' ? undefined : parseInt(e.target.value, 10),
                              })
                            }
                            placeholder="Gold"
                            className="w-full h-8 px-2 rounded-lg bg-white dark:bg-[#0b0f19] border border-slate-300 dark:border-slate-700 text-xs font-mono text-amber-600 dark:text-[#f1c40f] placeholder:text-slate-400 focus:outline-none focus:border-amber-400"
                          />
                        </div>

                        <div className="w-24 relative hidden sm:block">
                          <input
                            type="number"
                            min="0"
                            value={p.damageTaken || ''}
                            onChange={(e) =>
                              updateBluePlayer(i, {
                                damageTaken:
                                  e.target.value === '' ? undefined : parseInt(e.target.value, 10),
                              })
                            }
                            placeholder="Dmg Taken"
                            className="w-full h-8 px-2 rounded-lg bg-white dark:bg-[#0b0f19] border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-600 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:border-slate-500"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Team Red */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs font-bold text-rose-600 dark:text-rose-400 px-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  <span>TEAM RED PLAYERS (5)</span>
                </span>
                <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                  Piliin ang KDA numbers · I-type ang Hero Damage at Gold
                </span>
              </div>

              <div className="space-y-2">
                {teamRed.map((p, i) => {
                  const kda = parseKdaValues(p.kda);
                  const ratio = calculateKdaRatio(kda.kills, kda.deaths, kda.assists);
                  return (
                    <div
                      key={`red-${p.ign}-${i}`}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-rose-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                    >
                      {/* Player Info */}
                      <div className="w-full md:w-44 shrink-0">
                        <div className="font-display font-bold text-slate-900 dark:text-white truncate">
                          {p.ign}
                        </div>
                        <div className="text-[11px] text-rose-600 dark:text-rose-400 font-mono">
                          {p.selectedRole || p.assignedLane || 'Flex'}
                        </div>
                      </div>

                      {/* Fast KDA Pickers (K / D / A) */}
                      <div className="flex items-center gap-2">
                        {/* Kills */}
                        <div className="flex items-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-1">
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 px-1">
                            K:
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStepKda('Red', i, 'k', -1)}
                            className="w-5 h-6 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-emerald-500 hover:text-white cursor-pointer"
                          >
                            -
                          </button>
                          <select
                            value={kda.kills}
                            onChange={(e) =>
                              handleSetPlayerKda('Red', i, 'k', parseInt(e.target.value, 10))
                            }
                            className="w-11 h-6 bg-transparent text-center font-mono font-bold text-emerald-700 dark:text-emerald-300 text-xs focus:outline-none cursor-pointer"
                          >
                            {Array.from({ length: 35 }, (_, n) => (
                              <option key={n} value={n} className="bg-slate-900 text-white">
                                {n}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleStepKda('Red', i, 'k', 1)}
                            className="w-5 h-6 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-emerald-500 hover:text-white cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        {/* Deaths */}
                        <div className="flex items-center rounded-lg bg-rose-500/10 border border-rose-500/30 p-1">
                          <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 px-1">
                            D:
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStepKda('Red', i, 'd', -1)}
                            className="w-5 h-6 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-rose-500 hover:text-white cursor-pointer"
                          >
                            -
                          </button>
                          <select
                            value={kda.deaths}
                            onChange={(e) =>
                              handleSetPlayerKda('Red', i, 'd', parseInt(e.target.value, 10))
                            }
                            className="w-11 h-6 bg-transparent text-center font-mono font-bold text-rose-700 dark:text-rose-300 text-xs focus:outline-none cursor-pointer"
                          >
                            {Array.from({ length: 25 }, (_, n) => (
                              <option key={n} value={n} className="bg-slate-900 text-white">
                                {n}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleStepKda('Red', i, 'd', 1)}
                            className="w-5 h-6 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-rose-500 hover:text-white cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        {/* Assists */}
                        <div className="flex items-center rounded-lg bg-cyan-500/10 border border-cyan-500/30 p-1">
                          <span className="text-[10px] font-bold text-cyan-700 dark:text-cyan-400 px-1">
                            A:
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStepKda('Red', i, 'a', -1)}
                            className="w-5 h-6 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-cyan-500 hover:text-white cursor-pointer"
                          >
                            -
                          </button>
                          <select
                            value={kda.assists}
                            onChange={(e) =>
                              handleSetPlayerKda('Red', i, 'a', parseInt(e.target.value, 10))
                            }
                            className="w-11 h-6 bg-transparent text-center font-mono font-bold text-cyan-700 dark:text-cyan-300 text-xs focus:outline-none cursor-pointer"
                          >
                            {Array.from({ length: 35 }, (_, n) => (
                              <option key={n} value={n} className="bg-slate-900 text-white">
                                {n}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleStepKda('Red', i, 'a', 1)}
                            className="w-5 h-6 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-cyan-500 hover:text-white cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        <span className="text-[10px] font-mono font-bold text-slate-500 hidden sm:inline">
                          ({ratio})
                        </span>
                      </div>

                      {/* Hero Damage & Gold (Direct typing input) */}
                      <div className="flex items-center gap-2">
                        <div className="w-28 relative">
                          <input
                            type="number"
                            min="0"
                            value={p.heroDamage || ''}
                            onChange={(e) =>
                              updateRedPlayer(i, {
                                heroDamage:
                                  e.target.value === '' ? undefined : parseInt(e.target.value, 10),
                              })
                            }
                            placeholder="Hero Dmg"
                            className="w-full h-8 px-2 rounded-lg bg-white dark:bg-[#0b0f19] border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-rose-500"
                          />
                        </div>

                        <div className="w-24 relative">
                          <input
                            type="number"
                            min="0"
                            value={p.gold || ''}
                            onChange={(e) =>
                              updateRedPlayer(i, {
                                gold:
                                  e.target.value === '' ? undefined : parseInt(e.target.value, 10),
                              })
                            }
                            placeholder="Gold"
                            className="w-full h-8 px-2 rounded-lg bg-white dark:bg-[#0b0f19] border border-slate-300 dark:border-slate-700 text-xs font-mono text-amber-600 dark:text-[#f1c40f] placeholder:text-slate-400 focus:outline-none focus:border-amber-400"
                          />
                        </div>

                        <div className="w-24 relative hidden sm:block">
                          <input
                            type="number"
                            min="0"
                            value={p.damageTaken || ''}
                            onChange={(e) =>
                              updateRedPlayer(i, {
                                damageTaken:
                                  e.target.value === '' ? undefined : parseInt(e.target.value, 10),
                              })
                            }
                            placeholder="Dmg Taken"
                            className="w-full h-8 px-2 rounded-lg bg-white dark:bg-[#0b0f19] border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-600 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:border-slate-500"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Ang pag-save ay agad na mag-a-update sa Recent Battle Results at Leaderboard.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[38px] px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="min-h-[38px] px-5 py-2 rounded-xl bg-cyan-600 dark:bg-[#00f2fe] text-white dark:text-slate-950 font-display font-bold text-xs sm:text-sm hover:opacity-95 transition flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Save & Update Stats</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
