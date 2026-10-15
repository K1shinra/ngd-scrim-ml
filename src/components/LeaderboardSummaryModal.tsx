import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Copy,
  Check,
  X,
  Sparkles,
  Flame,
  Coins,
  Shield,
  Swords,
  Target,
  Users,
  Calendar,
} from 'lucide-react';
import { MatchHistoryRecord, PlayerProfile } from '../data/ngdData';
import {
  aggregatePlayerLeaderboardStats,
  generateScrimResultsAndLeaderboardsText,
  parseFullLeaderboardText,
  PlayerLeaderboardStats,
} from '../utils/leaderboardExporter';

interface LeaderboardSummaryModalProps {
  matchHistory: MatchHistoryRecord[];
  players: PlayerProfile[];
  onClose: () => void;
  onCopiedToast?: (msg: string) => void;
  onImportLeaderboardStats?: (newStats: PlayerLeaderboardStats[]) => void;
}

export const LeaderboardSummaryModal: React.FC<LeaderboardSummaryModalProps> = ({
  matchHistory,
  players,
  onClose,
  onCopiedToast,
  onImportLeaderboardStats,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeView, setActiveView] = useState<'preview' | 'raw' | 'paste'>('preview');
  const [pasteLeaderboardInput, setPasteLeaderboardInput] = useState('');
  const [customStatsList, setCustomStatsList] = useState<PlayerLeaderboardStats[] | null>(null);

  const baseStatsList = useMemo(() => {
    return aggregatePlayerLeaderboardStats(matchHistory, players);
  }, [matchHistory, players]);

  const statsList = useMemo(() => {
    return customStatsList || baseStatsList;
  }, [customStatsList, baseStatsList]);

  const gcSummaryText = useMemo(() => {
    return generateScrimResultsAndLeaderboardsText(statsList);
  }, [statsList]);

  const handleCopy = () => {
    navigator.clipboard.writeText(gcSummaryText).then(() => {
      setCopied(true);
      if (onCopiedToast) {
        onCopiedToast('📋 Nakopya na ang Scrim Results & Leaderboards para sa Messenger GC!');
      }
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const topOverall = useMemo(
    () => [...statsList].sort((a, b) => b.overallRating - a.overallRating).slice(0, 10),
    [statsList]
  );
  const topKills = useMemo(
    () => [...statsList].sort((a, b) => b.kills - a.kills).slice(0, 5),
    [statsList]
  );
  const topGold = useMemo(
    () => [...statsList].sort((a, b) => b.gold - a.gold).slice(0, 5),
    [statsList]
  );
  const topAssists = useMemo(
    () => [...statsList].sort((a, b) => b.assists - a.assists).slice(0, 5),
    [statsList]
  );
  const topDamage = useMemo(
    () => [...statsList].sort((a, b) => b.heroDamage - a.heroDamage).slice(0, 5),
    [statsList]
  );
  const topKda = useMemo(
    () => [...statsList].filter((p) => p.games >= 2).sort((a, b) => b.kda - a.kda).slice(0, 5),
    [statsList]
  );
  const topTaken = useMemo(
    () => [...statsList].sort((a, b) => b.damageTaken - a.damageTaken).slice(0, 5),
    [statsList]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-gradient-to-r from-cyan-500/10 via-amber-500/10 to-transparent">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-display font-black text-slate-900 dark:text-white truncate">
                🏆 Scrim Results & Leaderboards
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-amber-500" />
                <span>Ready to Copy & Paste for Messenger GC</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white dark:bg-[#00f2fe] dark:hover:bg-cyan-300 dark:text-slate-950'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Na-copy na!' : 'Kopyahin para sa GC'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-100 dark:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab switcher: Formatted Card Preview vs Raw GC Text */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-2 bg-slate-50 dark:bg-[#0b0f19] border-b border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveView('preview')}
              className={`px-3 py-1 rounded-lg font-semibold cursor-pointer ${
                activeView === 'preview'
                  ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-[#00f2fe] shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Visual Cards
            </button>
            <button
              type="button"
              onClick={() => setActiveView('raw')}
              className={`px-3 py-1 rounded-lg font-semibold cursor-pointer ${
                activeView === 'raw'
                  ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-[#00f2fe] shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Raw Text for GC
            </button>
            <button
              type="button"
              onClick={() => setActiveView('paste')}
              className={`px-3 py-1 rounded-lg font-semibold cursor-pointer ${
                activeView === 'paste'
                  ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-yellow-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              📥 I-paste ang Leaderboard
            </button>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            {statsList.length} Players Ranked
          </span>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {activeView === 'paste' ? (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-yellow-300">
                <p className="font-bold">📋 I-paste dito ang GC Leaderboards Text</p>
                <p className="text-[11px] opacity-80 mt-0.5">
                  Awtomatikong babasahin ang Overall Rating, Top Kills, Top Gold, Top Assists, Top Hero Damage, KDA, at Damage Taken.
                </p>
              </div>

              <textarea
                value={pasteLeaderboardInput}
                onChange={(e) => setPasteLeaderboardInput(e.target.value)}
                placeholder="🏆 SCRIM RESULTS & LEADERBOARDS&#10;📅 As of October 12, 2026&#10;📊 Overall Rating Rankings&#10;🥇 1. Whis — 770.23&#10;..."
                rows={12}
                className="w-full p-3.5 rounded-xl font-mono text-xs leading-relaxed bg-slate-100 dark:bg-[#0b0f19] border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
              />

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      if (text) setPasteLeaderboardInput(text);
                    } catch {
                      // ignore
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  📋 I-paste mula sa Clipboard
                </button>

                <button
                  type="button"
                  disabled={!pasteLeaderboardInput.trim()}
                  onClick={() => {
                    const parsed = parseFullLeaderboardText(pasteLeaderboardInput);
                    if (parsed.length > 0) {
                      setCustomStatsList(parsed);
                      if (onImportLeaderboardStats) {
                        onImportLeaderboardStats(parsed);
                      }
                      setActiveView('preview');
                      if (onCopiedToast) {
                        onCopiedToast(`✅ Na-update ang ${parsed.length} players sa Leaderboard!`);
                      }
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs disabled:opacity-50 transition cursor-pointer shadow-md"
                >
                  ⚡ I-save at I-update ang Leaderboard
                </button>
              </div>
            </div>
          ) : activeView === 'raw' ? (
            <div className="relative">
              <textarea
                readOnly
                value={gcSummaryText}
                rows={18}
                className="w-full p-4 rounded-xl font-mono text-xs leading-relaxed bg-slate-100 dark:bg-[#0b0f19] border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none select-all"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-slate-900/80 dark:bg-slate-800/90 text-white text-xs font-bold flex items-center gap-1 shadow-md hover:opacity-90 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Overall Rating Rankings */}
              <div className="rounded-xl bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-2">
                  <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span>📊 Overall Rating Rankings (Top 10)</span>
                  </h3>
                  <span className="text-[11px] font-mono text-slate-500">Points / Rating</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {topOverall.map((p, idx) => (
                    <div
                      key={p.ign}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs ${
                        idx === 0
                          ? 'bg-amber-500/10 border-amber-500/30 font-bold'
                          : idx === 1
                            ? 'bg-slate-200/50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700 font-semibold'
                            : idx === 2
                              ? 'bg-amber-700/10 border-amber-700/30'
                              : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-sm">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
                        </span>
                        <span className="truncate text-slate-900 dark:text-white">{p.ign}</span>
                      </div>
                      <span className="font-mono font-bold text-cyan-600 dark:text-[#00f2fe]">
                        {p.overallRating.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance Categories Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Top Kills */}
                <div className="rounded-xl bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 p-3.5 space-y-2.5">
                  <h4 className="font-display font-bold text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5" />
                    <span>🔥 Top Kills</span>
                  </h4>
                  <div className="space-y-1.5">
                    {topKills.map((p, idx) => (
                      <div
                        key={p.ign}
                        className="flex items-center justify-between text-xs py-1 px-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80"
                      >
                        <span className="truncate text-slate-800 dark:text-slate-200">
                          {idx === 0 ? '🥇 ' : idx === 1 ? '🥈 ' : idx === 2 ? '🥉 ' : ''}
                          {p.ign}
                        </span>
                        <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                          {p.kills}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Gold */}
                <div className="rounded-xl bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 p-3.5 space-y-2.5">
                  <h4 className="font-display font-bold text-xs text-amber-600 dark:text-[#f1c40f] flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5" />
                    <span>💰 Top Gold</span>
                  </h4>
                  <div className="space-y-1.5">
                    {topGold.map((p, idx) => (
                      <div
                        key={p.ign}
                        className="flex items-center justify-between text-xs py-1 px-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80"
                      >
                        <span className="truncate text-slate-800 dark:text-slate-200">
                          {idx === 0 ? '🥇 ' : idx === 1 ? '🥈 ' : idx === 2 ? '🥉 ' : ''}
                          {p.ign}
                        </span>
                        <span className="font-mono font-bold text-amber-600 dark:text-[#f1c40f]">
                          {p.gold.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Assists */}
                <div className="rounded-xl bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 p-3.5 space-y-2.5">
                  <h4 className="font-display font-bold text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>🤝 Top Assists</span>
                  </h4>
                  <div className="space-y-1.5">
                    {topAssists.map((p, idx) => (
                      <div
                        key={p.ign}
                        className="flex items-center justify-between text-xs py-1 px-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80"
                      >
                        <span className="truncate text-slate-800 dark:text-slate-200">
                          {idx === 0 ? '🥇 ' : idx === 1 ? '🥈 ' : idx === 2 ? '🥉 ' : ''}
                          {p.ign}
                        </span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {p.assists}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Hero Damage */}
                <div className="rounded-xl bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 p-3.5 space-y-2.5">
                  <h4 className="font-display font-bold text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                    <Swords className="w-3.5 h-3.5" />
                    <span>⚔️ Top Hero Damage</span>
                  </h4>
                  <div className="space-y-1.5">
                    {topDamage.map((p, idx) => (
                      <div
                        key={p.ign}
                        className="flex items-center justify-between text-xs py-1 px-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80"
                      >
                        <span className="truncate text-slate-800 dark:text-slate-200">
                          {idx === 0 ? '🥇 ' : idx === 1 ? '🥈 ' : idx === 2 ? '🥉 ' : ''}
                          {p.ign}
                        </span>
                        <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                          {p.heroDamage.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top KDA */}
                <div className="rounded-xl bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 p-3.5 space-y-2.5">
                  <h4 className="font-display font-bold text-xs text-cyan-600 dark:text-[#00f2fe] flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" />
                    <span>🎯 Top KDA</span>
                  </h4>
                  <div className="space-y-1.5">
                    {topKda.map((p, idx) => (
                      <div
                        key={p.ign}
                        className="flex items-center justify-between text-xs py-1 px-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80"
                      >
                        <span className="truncate text-slate-800 dark:text-slate-200">
                          {idx === 0 ? '🥇 ' : idx === 1 ? '🥈 ' : idx === 2 ? '🥉 ' : ''}
                          {p.ign}
                        </span>
                        <span className="font-mono font-bold text-cyan-600 dark:text-[#00f2fe]">
                          {p.kda.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Damage Taken */}
                <div className="rounded-xl bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 p-3.5 space-y-2.5">
                  <h4 className="font-display font-bold text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    <span>🛡️ Top Damage Taken</span>
                  </h4>
                  <div className="space-y-1.5">
                    {topTaken.map((p, idx) => (
                      <div
                        key={p.ign}
                        className="flex items-center justify-between text-xs py-1 px-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80"
                      >
                        <span className="truncate text-slate-800 dark:text-slate-200">
                          {idx === 0 ? '🥇 ' : idx === 1 ? '🥈 ' : idx === 2 ? '🥉 ' : ''}
                          {p.ign}
                        </span>
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                          {p.damageTaken.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#0b0f19]">
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate hidden sm:block">
            I-paste ito sa Messenger GC pagkatapos ng bawat araw ng scrim!
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
            >
              Isara
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className={`min-h-[38px] px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white dark:bg-[#00f2fe] dark:hover:bg-cyan-300 dark:text-slate-950'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Na-kopyang Tagumpay!' : 'Kopyahin para sa Messenger GC'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
