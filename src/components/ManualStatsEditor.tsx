import React, { useState } from 'react';
import {
  Trophy,
  Swords,
  Coins,
  Shield,
  Crosshair,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  Check,
  RotateCcw,
} from 'lucide-react';
import { MatchParticipant, ROLE_META } from '../data/ngdData';

interface ManualStatsEditorProps {
  teamBlue: MatchParticipant[];
  teamRed: MatchParticipant[];
  onUpdateBluePlayer: (index: number, updated: Partial<MatchParticipant>) => void;
  onUpdateRedPlayer: (index: number, updated: Partial<MatchParticipant>) => void;
  language?: 'en' | 'tl';
}

export function parseKdaValues(kdaStr?: string): {
  kills: number;
  deaths: number;
  assists: number;
} {
  if (!kdaStr) return { kills: 0, deaths: 0, assists: 0 };
  const parts = kdaStr.split(/[\/\-:\s]+/).map((p) => parseInt(p.trim(), 10));
  return {
    kills: !isNaN(parts[0]) && parts[0] >= 0 ? parts[0] : 0,
    deaths: !isNaN(parts[1]) && parts[1] >= 0 ? parts[1] : 0,
    assists: !isNaN(parts[2]) && parts[2] >= 0 ? parts[2] : 0,
  };
}

export function formatKdaValues(kills: number, deaths: number, assists: number): string {
  return `${kills}/${deaths}/${assists}`;
}

export function calculateKdaRatio(kills: number, deaths: number, assists: number): string {
  if (deaths === 0) {
    return kills + assists > 0 ? 'Perfect' : '0.00';
  }
  return ((kills + assists) / deaths).toFixed(2);
}

export const ManualStatsEditor: React.FC<ManualStatsEditorProps> = ({
  teamBlue,
  teamRed,
  onUpdateBluePlayer,
  onUpdateRedPlayer,
  language = 'en',
}) => {
  // Modal state for quick touch-friendly tap picker
  const [activePickerPlayer, setActivePickerPlayer] = useState<{
    team: 'Blue' | 'Red';
    index: number;
  } | null>(null);

  const getActivePlayer = () => {
    if (!activePickerPlayer) return null;
    const roster = activePickerPlayer.team === 'Blue' ? teamBlue : teamRed;
    return roster[activePickerPlayer.index] || null;
  };

  const activePlayer = getActivePlayer();
  const activeKda = activePlayer ? parseKdaValues(activePlayer.kda) : { kills: 0, deaths: 0, assists: 0 };

  const handleSetKdaComponent = (
    team: 'Blue' | 'Red',
    index: number,
    component: 'k' | 'd' | 'a',
    value: number
  ) => {
    const roster = team === 'Blue' ? teamBlue : teamRed;
    const player = roster[index];
    if (!player) return;
    const current = parseKdaValues(player.kda);
    const updated = {
      kills: component === 'k' ? Math.max(0, value) : current.kills,
      deaths: component === 'd' ? Math.max(0, value) : current.deaths,
      assists: component === 'a' ? Math.max(0, value) : current.assists,
    };
    const formatted = formatKdaValues(updated.kills, updated.deaths, updated.assists);
    if (team === 'Blue') {
      onUpdateBluePlayer(index, { kda: formatted });
    } else {
      onUpdateRedPlayer(index, { kda: formatted });
    }
  };

  const handleStepKda = (
    team: 'Blue' | 'Red',
    index: number,
    component: 'k' | 'd' | 'a',
    delta: number
  ) => {
    const roster = team === 'Blue' ? teamBlue : teamRed;
    const player = roster[index];
    if (!player) return;
    const current = parseKdaValues(player.kda);
    const curVal = component === 'k' ? current.kills : component === 'd' ? current.deaths : current.assists;
    handleSetKdaComponent(team, index, component, curVal + delta);
  };

  const goToNextPlayer = () => {
    if (!activePickerPlayer) return;
    if (activePickerPlayer.team === 'Blue') {
      if (activePickerPlayer.index < teamBlue.length - 1) {
        setActivePickerPlayer({ team: 'Blue', index: activePickerPlayer.index + 1 });
      } else if (teamRed.length > 0) {
        setActivePickerPlayer({ team: 'Red', index: 0 });
      }
    } else {
      if (activePickerPlayer.index < teamRed.length - 1) {
        setActivePickerPlayer({ team: 'Red', index: activePickerPlayer.index + 1 });
      }
    }
  };

  const goToPrevPlayer = () => {
    if (!activePickerPlayer) return;
    if (activePickerPlayer.team === 'Red') {
      if (activePickerPlayer.index > 0) {
        setActivePickerPlayer({ team: 'Red', index: activePickerPlayer.index - 1 });
      } else if (teamBlue.length > 0) {
        setActivePickerPlayer({ team: 'Blue', index: teamBlue.length - 1 });
      }
    } else {
      if (activePickerPlayer.index > 0) {
        setActivePickerPlayer({ team: 'Blue', index: activePickerPlayer.index - 1 });
      }
    }
  };

  const renderPlayerRow = (p: MatchParticipant, idx: number, team: 'Blue' | 'Red') => {
    const kda = parseKdaValues(p.kda);
    const kdaRatio = calculateKdaRatio(kda.kills, kda.deaths, kda.assists);
    const roleMeta = ROLE_META[p.assignedLane] || ROLE_META['Flex Role'];

    return (
      <div
        key={`${team}-${idx}-${p.ign}`}
        className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5 transition hover:border-slate-300 dark:hover:border-slate-700"
      >
        {/* Top: IGN, Role Badge, and KDA Summary */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                team === 'Blue'
                  ? 'bg-cyan-500/15 text-cyan-700 dark:text-[#00f2fe] border border-cyan-500/30'
                  : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'
              }`}
            >
              {roleMeta.shortLabel}
            </span>
            <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
              {p.ign}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActivePickerPlayer({ team, index: idx })}
              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500/10 to-cyan-500/10 hover:from-amber-500/20 hover:to-cyan-500/20 border border-amber-500/30 text-[11px] font-bold text-amber-700 dark:text-yellow-300 flex items-center gap-1 cursor-pointer transition shadow-2xs"
            >
              <Crosshair className="w-3 h-3" />
              <span>Tap Picker</span>
            </button>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
              {p.kda ? `${p.kda} (${kdaRatio})` : '0/0/0 (0.00)'}
            </span>
          </div>
        </div>

        {/* KDA Selectors (No typing required: Native Select & Stepper +/-) */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            KDA:
          </span>

          {/* Kills Selector */}
          <div className="flex items-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-0.5">
            <button
              type="button"
              onClick={() => handleStepKda(team, idx, 'k', -1)}
              className="w-5 h-6 rounded flex items-center justify-center text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 cursor-pointer"
              title="Minus 1 Kill"
            >
              -
            </button>
            <div className="flex items-center gap-1 px-1">
              <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400">K</span>
              <select
                value={kda.kills}
                onChange={(e) =>
                  handleSetKdaComponent(team, idx, 'k', parseInt(e.target.value, 10))
                }
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold text-xs rounded px-1.5 py-0.5 border border-emerald-500/30 focus:outline-none cursor-pointer"
              >
                {Array.from({ length: 31 }, (_, i) => (
                  <option key={`k-${i}`} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => handleStepKda(team, idx, 'k', 1)}
              className="w-5 h-6 rounded flex items-center justify-center text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 cursor-pointer"
              title="Add 1 Kill"
            >
              +
            </button>
          </div>

          {/* Deaths Selector */}
          <div className="flex items-center rounded-lg bg-rose-500/10 border border-rose-500/30 p-0.5">
            <button
              type="button"
              onClick={() => handleStepKda(team, idx, 'd', -1)}
              className="w-5 h-6 rounded flex items-center justify-center text-xs font-bold text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 cursor-pointer"
              title="Minus 1 Death"
            >
              -
            </button>
            <div className="flex items-center gap-1 px-1">
              <span className="text-[10px] font-black text-rose-700 dark:text-rose-400">D</span>
              <select
                value={kda.deaths}
                onChange={(e) =>
                  handleSetKdaComponent(team, idx, 'd', parseInt(e.target.value, 10))
                }
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold text-xs rounded px-1.5 py-0.5 border border-rose-500/30 focus:outline-none cursor-pointer"
              >
                {Array.from({ length: 26 }, (_, i) => (
                  <option key={`d-${i}`} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => handleStepKda(team, idx, 'd', 1)}
              className="w-5 h-6 rounded flex items-center justify-center text-xs font-bold text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 cursor-pointer"
              title="Add 1 Death"
            >
              +
            </button>
          </div>

          {/* Assists Selector */}
          <div className="flex items-center rounded-lg bg-amber-500/10 border border-amber-500/30 p-0.5">
            <button
              type="button"
              onClick={() => handleStepKda(team, idx, 'a', -1)}
              className="w-5 h-6 rounded flex items-center justify-center text-xs font-bold text-amber-700 dark:text-yellow-400 hover:bg-amber-500/20 cursor-pointer"
              title="Minus 1 Assist"
            >
              -
            </button>
            <div className="flex items-center gap-1 px-1">
              <span className="text-[10px] font-black text-amber-700 dark:text-yellow-400">A</span>
              <select
                value={kda.assists}
                onChange={(e) =>
                  handleSetKdaComponent(team, idx, 'a', parseInt(e.target.value, 10))
                }
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold text-xs rounded px-1.5 py-0.5 border border-amber-500/30 focus:outline-none cursor-pointer"
              >
                {Array.from({ length: 36 }, (_, i) => (
                  <option key={`a-${i}`} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => handleStepKda(team, idx, 'a', 1)}
              className="w-5 h-6 rounded flex items-center justify-center text-xs font-bold text-amber-700 dark:text-yellow-400 hover:bg-amber-500/20 cursor-pointer"
              title="Add 1 Assist"
            >
              +
            </button>
          </div>
        </div>

        {/* Hero Damage, Gold & Damage Taken Inputs (Direct typing as requested) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5 flex items-center gap-1">
              <Swords className="w-3 h-3 text-red-500" />
              <span>Hero Damage (Type)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 852794"
              value={p.heroDamage ? p.heroDamage.toLocaleString() : ''}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, '');
                const num = raw ? parseInt(raw, 10) : 0;
                if (team === 'Blue') {
                  onUpdateBluePlayer(idx, { heroDamage: num });
                } else {
                  onUpdateRedPlayer(idx, { heroDamage: num });
                }
              }}
              className="w-full h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5 flex items-center gap-1">
              <Coins className="w-3 h-3 text-amber-500" />
              <span>Gold (Type)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 189523"
              value={p.gold ? p.gold.toLocaleString() : ''}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, '');
                const num = raw ? parseInt(raw, 10) : 0;
                if (team === 'Blue') {
                  onUpdateBluePlayer(idx, { gold: num });
                } else {
                  onUpdateRedPlayer(idx, { gold: num });
                }
              }}
              className="w-full h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5 flex items-center gap-1">
              <Shield className="w-3 h-3 text-blue-500" />
              <span>{language === 'tl' ? 'Dmg Taken (Opsyonal)' : 'Dmg Taken (Optional)'}</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 1270960"
              value={p.damageTaken ? p.damageTaken.toLocaleString() : ''}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, '');
                const num = raw ? parseInt(raw, 10) : 0;
                if (team === 'Blue') {
                  onUpdateBluePlayer(idx, { damageTaken: num });
                } else {
                  onUpdateRedPlayer(idx, { damageTaken: num });
                }
              }}
              className="w-full h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-900 dark:text-cyan-200">
        <div>
          <p className="font-bold flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-cyan-600 dark:text-[#00f2fe]" />
            <span>{language === 'tl' ? 'Mabilisang Player Stats Input' : 'Fast Player Stats Input'}</span>
          </p>
          <p className="text-[11px] opacity-85 mt-0.5">
            <strong>KDA:</strong>{' '}
            {language === 'tl'
              ? 'Piliin lang ang numero gamit ang dropdown o stepper (walang typing!).'
              : 'Select numbers using tap picker or stepper (no typing!).'}
            <br />
            <strong>Hero Damage, Gold & Damage Taken:</strong>{' '}
            {language === 'tl'
              ? 'I-type ang halaga gamit ang keyboard.'
              : 'Type values directly with the keyboard.'}
          </p>
        </div>
        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
          {teamBlue.length + teamRed.length} Total Players
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Team Blue */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-cyan-600 dark:text-[#00f2fe] flex items-center gap-1.5">
              <span>🔵 Team Blue Players</span>
              <span className="text-[11px] font-mono font-normal opacity-75">
                ({teamBlue.length})
              </span>
            </span>
          </div>
          <div className="space-y-2">
            {teamBlue.map((p, idx) => renderPlayerRow(p, idx, 'Blue'))}
          </div>
        </div>

        {/* Team Red */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <span>🔴 Team Red Players</span>
              <span className="text-[11px] font-mono font-normal opacity-75">
                ({teamRed.length})
              </span>
            </span>
          </div>
          <div className="space-y-2">
            {teamRed.map((p, idx) => renderPlayerRow(p, idx, 'Red'))}
          </div>
        </div>
      </div>

      {/* Touch-Friendly Number Grid Tap Picker Modal */}
      {activePickerPlayer && activePlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-4 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`w-3 h-3 rounded-full shrink-0 ${
                    activePickerPlayer.team === 'Blue' ? 'bg-cyan-500' : 'bg-rose-500'
                  }`}
                />
                <div>
                  <h3 className="font-display font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                    {activePlayer.ign} (Team {activePickerPlayer.team})
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {language === 'tl'
                      ? 'I-tap ang mga numero para sa KDA — Walang typing!'
                      : 'Tap numbers for KDA — No typing needed!'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActivePickerPlayer(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-100 dark:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current KDA Display */}
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">
                Kasalukuyang KDA
              </span>
              <div className="text-2xl font-mono font-black text-slate-900 dark:text-white">
                <span className="text-emerald-500">{activeKda.kills}</span>
                <span className="text-slate-400 mx-1.5">/</span>
                <span className="text-rose-500">{activeKda.deaths}</span>
                <span className="text-slate-400 mx-1.5">/</span>
                <span className="text-amber-500">{activeKda.assists}</span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 mt-1 inline-block">
                Ratio: {calculateKdaRatio(activeKda.kills, activeKda.deaths, activeKda.assists)} KDA
              </span>
            </div>

            {/* Kills Selector Grid */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400">
                <span>🔥 Kills (K): {activeKda.kills}</span>
                <span className="text-[11px] font-normal text-slate-400">{language === 'tl' ? 'Pumili ng numero:' : 'Select number:'}</span>
              </div>
              <div className="grid grid-cols-7 sm:grid-cols-11 gap-1">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 25].map(
                  (num) => (
                    <button
                      key={`pick-k-${num}`}
                      type="button"
                      onClick={() =>
                        handleSetKdaComponent(
                          activePickerPlayer.team,
                          activePickerPlayer.index,
                          'k',
                          num
                        )
                      }
                      className={`h-8 rounded-lg font-mono text-xs font-bold transition cursor-pointer ${
                        activeKda.kills === num
                          ? 'bg-emerald-600 text-white shadow-xs scale-105'
                          : 'bg-slate-100 hover:bg-emerald-500/20 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {num}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Deaths Selector Grid */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-rose-700 dark:text-rose-400">
                <span>💀 Deaths (D): {activeKda.deaths}</span>
                <span className="text-[11px] font-normal text-slate-400">{language === 'tl' ? 'Pumili ng numero:' : 'Select number:'}</span>
              </div>
              <div className="grid grid-cols-7 sm:grid-cols-10 gap-1">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20].map((num) => (
                  <button
                    key={`pick-d-${num}`}
                    type="button"
                    onClick={() =>
                      handleSetKdaComponent(
                        activePickerPlayer.team,
                        activePickerPlayer.index,
                        'd',
                        num
                      )
                    }
                    className={`h-8 rounded-lg font-mono text-xs font-bold transition cursor-pointer ${
                      activeKda.deaths === num
                        ? 'bg-rose-600 text-white shadow-xs scale-105'
                        : 'bg-slate-100 hover:bg-rose-500/20 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Assists Selector Grid */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-amber-700 dark:text-yellow-400">
                <span>🤝 Assists (A): {activeKda.assists}</span>
                <span className="text-[11px] font-normal text-slate-400">{language === 'tl' ? 'Pumili ng numero:' : 'Select number:'}</span>
              </div>
              <div className="grid grid-cols-7 sm:grid-cols-11 gap-1">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 25].map(
                  (num) => (
                    <button
                      key={`pick-a-${num}`}
                      type="button"
                      onClick={() =>
                        handleSetKdaComponent(
                          activePickerPlayer.team,
                          activePickerPlayer.index,
                          'a',
                          num
                        )
                      }
                      className={`h-8 rounded-lg font-mono text-xs font-bold transition cursor-pointer ${
                        activeKda.assists === num
                          ? 'bg-amber-500 text-slate-950 shadow-xs scale-105'
                          : 'bg-slate-100 hover:bg-amber-500/20 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {num}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Navigation buttons: Prev Player / Next Player */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={goToPrevPlayer}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Nakaunang Player</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePickerPlayer(null)}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{language === 'tl' ? 'Tapos Na' : 'Done'}</span>
              </button>

              <button
                type="button"
                onClick={goToNextPlayer}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <span>{language === 'tl' ? 'Susunod na Player' : 'Next Player'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
