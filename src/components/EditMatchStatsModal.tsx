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
import { calculateMlbbRating, resolveMlbbMedal, getMedalMeta } from '../utils/scrimEngine';

interface EditMatchStatsModalProps {
  match: MatchHistoryRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: MatchHistoryRecord) => void;
  language?: 'en' | 'tl';
}

export const EditMatchStatsModal: React.FC<EditMatchStatsModalProps> = ({
  match,
  isOpen,
  onClose,
  onSave,
  language = 'en',
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

  const handleAutoCalculateAllRatings = () => {
    setTeamBlue((prev) =>
      prev.map((p) => {
        const isWinner = winner === 'Blue';
        const isMvp = isWinner && p.ign.toLowerCase() === mvpIgn.trim().toLowerCase();
        const isSvp = !isWinner && p.ign.toLowerCase() === (svpIgn?.trim() || '').toLowerCase();
        const res = calculateMlbbRating(p.kda, isWinner, isMvp, isSvp);
        return {
          ...p,
          won: isWinner,
          isMvp,
          rating: res.rating,
          medal: res.medal,
          isFeeder: res.isFeeder,
        };
      })
    );
    setTeamRed((prev) =>
      prev.map((p) => {
        const isWinner = winner === 'Red';
        const isMvp = isWinner && p.ign.toLowerCase() === mvpIgn.trim().toLowerCase();
        const isSvp = !isWinner && p.ign.toLowerCase() === (svpIgn?.trim() || '').toLowerCase();
        const res = calculateMlbbRating(p.kda, isWinner, isMvp, isSvp);
        return {
          ...p,
          won: isWinner,
          isMvp,
          rating: res.rating,
          medal: res.medal,
          isFeeder: res.isFeeder,
        };
      })
    );
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

    // Synchronize won flag and 6-tier MLBB medals across both teams
    const updatedBlue = teamBlue.map((p) => {
      const isWinner = winner === 'Blue';
      const isMvp = isWinner && p.ign.toLowerCase() === mvpIgn.trim().toLowerCase();
      const isSvp = !isWinner && p.ign.toLowerCase() === (svpIgn?.trim() || '').toLowerCase();
      const grading = calculateMlbbRating(p.kda, isWinner, isMvp, isSvp, p.rating);
      const rating = p.rating || grading.rating;
      const medal = resolveMlbbMedal(rating, isMvp, isSvp, p.medal || grading.medal);
      const isFeeder = medal === 'Bronze' || p.isFeeder || grading.isFeeder;
      return {
        ...p,
        won: isWinner,
        isMvp,
        rating,
        medal,
        isFeeder,
      };
    });

    const updatedRed = teamRed.map((p) => {
      const isWinner = winner === 'Red';
      const isMvp = isWinner && p.ign.toLowerCase() === mvpIgn.trim().toLowerCase();
      const isSvp = !isWinner && p.ign.toLowerCase() === (svpIgn?.trim() || '').toLowerCase();
      const grading = calculateMlbbRating(p.kda, isWinner, isMvp, isSvp, p.rating);
      const rating = p.rating || grading.rating;
      const medal = resolveMlbbMedal(rating, isMvp, isSvp, p.medal || grading.medal);
      const isFeeder = medal === 'Bronze' || p.isFeeder || grading.isFeeder;
      return {
        ...p,
        won: isWinner,
        isMvp,
        rating,
        medal,
        isFeeder,
      };
    });

    const bronzePlayers = [...updatedBlue, ...updatedRed].filter(
      (p) => p.medal === 'Bronze' || p.isFeeder
    );
    const bronzeIgns = bronzePlayers.map((p) => p.ign);

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
      feederIgn: feederIgn.trim() || bronzeIgns[0] || undefined,
      feederIgns: bronzeIgns.length > 0 ? bronzeIgns : undefined,
      teamBlue: updatedBlue,
      teamRed: updatedRed,
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
                  <option value="">
                    {language === 'tl' ? '-- Pumili ng MVP --' : '-- Select Match MVP --'}
                  </option>
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
                  <option value="">
                    {language === 'tl' ? '-- Pumili ng SVP (Opsyonal) --' : '-- Select Defeat SVP (Optional) --'}
                  </option>
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
                  <span>{language === 'tl' ? 'Tanso / Feeder (Opsyonal)' : 'Bronze / Feeder (Optional)'}</span>
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

          {/* Section 2: Player Stats Inputs (KDA Pickers + Typed Damage & Gold + ML Medals) */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-700 dark:text-slate-300">
                <span className="font-bold text-cyan-600 dark:text-[#00f2fe]">
                  {language === 'tl' ? 'MLBB Grading & Tanso System:' : 'MLBB Grading & Bronze System:'}
                </span>{' '}
                {language === 'tl'
                  ? 'Bawat player ay may sariling Medal (MVP, SVP, Gold, Silver, Bronze/Tanso). Pwedeng 1 hanggang 5 ang tanso kapag mababa ang laro!'
                  : 'Each player has their own Medal (MVP, SVP, Gold, Silver, Bronze). Multiple players can receive Bronze if match rating is low!'}
              </div>
              <button
                type="button"
                onClick={handleAutoCalculateAllRatings}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 dark:bg-[#00f2fe] text-white dark:text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 hover:opacity-90 transition shrink-0 cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{language === 'tl' ? 'Auto-Grade Lahat (ML Medals)' : 'Auto-Grade All (ML Medals)'}</span>
              </button>
            </div>

            {/* Team Blue */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-cyan-700 dark:text-[#00f2fe] px-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  <span>TEAM BLUE PLAYERS (5)</span>
                </span>
                <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                  {language === 'tl'
                    ? 'Piliin ang KDA numbers · ML Medal & Score · I-type ang Hero Damage at Gold'
                    : 'Select KDA numbers · ML Medal & Rating · Enter Hero Damage & Gold'}
                </span>
              </div>

              <div className="space-y-2">
                {teamBlue.map((p, i) => {
                  const kda = parseKdaValues(p.kda);
                  const ratio = calculateKdaRatio(kda.kills, kda.deaths, kda.assists);
                  return (
                    <div
                      key={`blue-${p.ign}-${i}`}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-blue-500/30 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs"
                    >
                      {/* Player Info */}
                      <div className="w-full lg:w-40 shrink-0">
                        <div className="font-display font-bold text-slate-900 dark:text-white truncate">
                          {p.ign}
                        </div>
                        <div className="text-[11px] text-cyan-700 dark:text-[#00f2fe] font-mono">
                          {p.selectedRole || p.assignedLane || 'Flex'}
                        </div>
                      </div>

                      {/* Fast KDA Pickers (K / D / A) */}
                      <div className="flex items-center gap-1.5 flex-wrap">
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

                      {/* MLBB Medal & Rating Input */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <select
                          value={p.medal || resolveMlbbMedal(p.rating, p.isMvp, false)}
                          onChange={(e) => {
                            const m = e.target.value;
                            const isF = m === 'Bronze';
                            // If selecting Mythic tiers and rating < 11.0, suggest 11.5
                            let newRating = p.rating;
                            const num = parseFloat(p.rating || '0');
                            if ((m === 'Mythic MVP' || m === 'Mythic SVP' || m === 'Mythic Gold') && (isNaN(num) || num < 11.0)) {
                              newRating = '11.5';
                            } else if ((m === 'Gold MVP' || m === 'Gold SVP') && (num >= 11.0 || isNaN(num))) {
                              newRating = '10.2';
                            } else if (m === 'Bronze' && (num >= 4.0 || isNaN(num))) {
                              newRating = '3.5';
                            }
                            updateBluePlayer(i, {
                              medal: m,
                              rating: newRating,
                              isFeeder: isF,
                            });
                          }}
                          className={`h-8 px-2 rounded-lg font-bold text-[11px] border focus:outline-none cursor-pointer ${
                            (p.medal || '').includes('Mythic')
                              ? 'bg-purple-900/40 text-purple-200 border-purple-500/60 shadow-[0_0_8px_rgba(192,132,252,0.3)]'
                              : (p.medal || '').includes('MVP') || (p.medal || '') === 'Gold'
                                ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/50'
                                : (p.medal || '') === 'Bronze' || p.isFeeder
                                  ? 'bg-amber-900/30 text-amber-600 dark:text-amber-500 border-amber-700/60'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          <option value="Mythic MVP">👑 Mythic MVP (Purple, ≥ 11.0)</option>
                          <option value="Gold MVP">👑 Gold MVP (Gold, &lt; 11.0)</option>
                          <option value="Mythic SVP">🛡️ Mythic SVP (Purple, ≥ 11.0)</option>
                          <option value="Gold SVP">🛡️ Gold SVP (Gold, &lt; 11.0)</option>
                          <option value="Mythic Gold">⭐ Mythic Gold (Purple, ≥ 11.0)</option>
                          <option value="Gold">🥇 Gold (6.8 – 10.9)</option>
                          <option value="Silver">🥈 Silver (4.0 – 6.7)</option>
                          <option value="Bronze">{language === 'tl' ? '🥉 Bronze / Tanso (< 4.0)' : '🥉 Bronze (< 4.0)'}</option>
                        </select>

                        <input
                          type="text"
                          value={p.rating || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const num = parseFloat(val);
                            const autoMedal = !isNaN(num) && num > 0
                              ? resolveMlbbMedal(num, p.isMvp, false, p.medal)
                              : p.medal;
                            updateBluePlayer(i, {
                              rating: val,
                              medal: autoMedal,
                              isFeeder: autoMedal === 'Bronze' || (num > 0 && num < 4.0),
                            });
                          }}
                          placeholder="Score"
                          title="MLBB Score / Rating (e.g. 11.5, 9.8, 5.4, 3.2)"
                          className="w-14 h-8 px-1 text-center font-mono font-bold text-xs rounded-lg bg-white dark:bg-[#0b0f19] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      {/* Hero Damage & Gold (Direct typing input) */}
                      <div className="flex items-center gap-2">
                        <div className="w-24 relative">
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

                        <div className="w-20 relative">
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

                        <div className="w-20 relative hidden sm:block">
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
                  {language === 'tl'
                    ? 'Piliin ang KDA numbers · ML Medal & Score · I-type ang Hero Damage at Gold'
                    : 'Select KDA numbers · ML Medal & Rating · Enter Hero Damage & Gold'}
                </span>
              </div>

              <div className="space-y-2">
                {teamRed.map((p, i) => {
                  const kda = parseKdaValues(p.kda);
                  const ratio = calculateKdaRatio(kda.kills, kda.deaths, kda.assists);
                  return (
                    <div
                      key={`red-${p.ign}-${i}`}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-rose-500/30 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs"
                    >
                      {/* Player Info */}
                      <div className="w-full lg:w-40 shrink-0">
                        <div className="font-display font-bold text-slate-900 dark:text-white truncate">
                          {p.ign}
                        </div>
                        <div className="text-[11px] text-rose-600 dark:text-rose-400 font-mono">
                          {p.selectedRole || p.assignedLane || 'Flex'}
                        </div>
                      </div>

                      {/* Fast KDA Pickers (K / D / A) */}
                      <div className="flex items-center gap-1.5 flex-wrap">
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

                      {/* MLBB Medal & Rating Input */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <select
                          value={p.medal || (p.isMvp ? 'MVP' : 'Silver')}
                          onChange={(e) => {
                            const m = e.target.value;
                            updateRedPlayer(i, {
                              medal: m,
                              isFeeder: m === 'Bronze',
                            });
                          }}
                          className={`h-8 px-2 rounded-lg font-bold text-[11px] border focus:outline-none cursor-pointer ${
                            p.medal === 'MVP'
                              ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/40'
                              : p.medal === 'SVP'
                                ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/40'
                                : p.medal === 'Gold'
                                  ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/40'
                                  : p.medal === 'Bronze' || p.isFeeder
                                    ? 'bg-amber-900/25 text-amber-600 dark:text-amber-500 border-amber-700/50'
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          <option value="MVP">👑 MVP</option>
                          <option value="SVP">🥈 SVP</option>
                          <option value="Gold">🥇 Gold</option>
                          <option value="Silver">🥈 Silver</option>
                          <option value="Bronze">{language === 'tl' ? '🥉 Bronze (Tanso)' : '🥉 Bronze'}</option>
                        </select>

                        <input
                          type="text"
                          value={p.rating || ''}
                          onChange={(e) => updateRedPlayer(i, { rating: e.target.value })}
                          placeholder="Score"
                          title="MLBB Score / Rating (e.g. 10.5, 7.8, 3.4)"
                          className="w-14 h-8 px-1 text-center font-mono font-bold text-xs rounded-lg bg-white dark:bg-[#0b0f19] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                        />
                      </div>

                      {/* Hero Damage & Gold (Direct typing input) */}
                      <div className="flex items-center gap-2">
                        <div className="w-24 relative">
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

                        <div className="w-20 relative">
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

                        <div className="w-20 relative hidden sm:block">
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
            {language === 'tl'
              ? 'Ang pag-save ay agad na mag-a-update sa Recent Battle Results at Leaderboard.'
              : 'Saving will immediately update Recent Battle Results and Leaderboard.'}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[38px] px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              {language === 'tl' ? 'Kanselahin' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="min-h-[38px] px-5 py-2 rounded-xl bg-cyan-600 dark:bg-[#00f2fe] text-white dark:text-slate-950 font-display font-bold text-xs sm:text-sm hover:opacity-95 transition flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{language === 'tl' ? 'I-save at I-update ang Stats' : 'Save & Update Stats'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
