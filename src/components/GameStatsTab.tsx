import React, { useState } from 'react';
import {
  Trophy,
  Flame,
  Shield,
  Swords,
  Skull,
  Eye,
  Download,
  Share2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Sparkles,
  Award,
  Layers,
  Search,
  Filter,
  ExternalLink,
  X,
  Upload,
  Lock,
  Edit3,
} from 'lucide-react';
import {
  MatchHistoryRecord,
  MatchParticipant,
  ROLE_META,
} from '../data/ngdData';
import { MatchPosterModal, PosterTemplate } from './MatchPosterModal';

interface GameStatsTabProps {
  matchHistory: MatchHistoryRecord[];
  onUploadScreenshotForMatch?: (matchId: string, file: File) => void;
  onEditMatchStats?: (match: MatchHistoryRecord) => void;
  isAdmin?: boolean;
}

export const GameStatsTab: React.FC<GameStatsTabProps> = ({
  matchHistory,
  onUploadScreenshotForMatch,
  onEditMatchStats,
  isAdmin = false,
}) => {
  const [selectedMatchForPoster, setSelectedMatchForPoster] =
    useState<MatchHistoryRecord | null>(null);
  const [initialPosterTemplate, setInitialPosterTemplate] =
    useState<PosterTemplate>('recap');
  const [previewScreenshotUrl, setPreviewScreenshotUrl] = useState<string | null>(
    null
  );
  const [previewScreenshotTitle, setPreviewScreenshotTitle] = useState<string>('');
  const [expandedMatchIds, setExpandedMatchIds] = useState<Record<string, boolean>>({
    [matchHistory[0]?.id || '']: true, // expand first match by default
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterWinner, setFilterWinner] = useState<'All' | 'Blue' | 'Red'>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedMatchIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openPosterModal = (match: MatchHistoryRecord, template: PosterTemplate) => {
    setSelectedMatchForPoster(match);
    setInitialPosterTemplate(template);
  };

  const openScreenshotModal = (match: MatchHistoryRecord) => {
    const url = match.dataScreenshotUrl || match.screenshotUrl;
    if (url) {
      setPreviewScreenshotUrl(url);
      setPreviewScreenshotTitle(`${match.roomName} Screenshot`);
    } else {
      // If no screenshot url is stored yet, show prompt or sample notice
      setPreviewScreenshotUrl(
        'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80'
      );
      setPreviewScreenshotTitle(`${match.roomName} (Reference Screenshot)`);
    }
  };

  const copyGcSummary = (match: MatchHistoryRecord) => {
    const text = `🏆 NGD MLBB SCRIM RESULT 🏆
━━━━━━━━━━━━━━━━━━━━
📌 ${match.roomName} (${match.durationText || '15m'})
👑 Winner: TEAM ${match.winner.toUpperCase()} (${match.killScore || 'Game Ended'})
⭐ MVP: ${match.mvpIgn.toUpperCase()}
🥈 SVP: ${match.svpIgn || 'N/A'}
${match.feederIgn ? `🥉 Certified Feeder: ${match.feederIgn.toUpperCase()} 🐟` : ''}

👥 Team Blue:
${match.teamBlue.map((p) => `• ${p.ign} (${p.selectedRole}) ${p.kda ? `- ${p.kda}` : ''}`).join('\n')}

👥 Team Red:
${match.teamRed.map((p) => `• ${p.ign} (${p.selectedRole}) ${p.kda ? `- ${p.kda}` : ''}`).join('\n')}
━━━━━━━━━━━━━━━━━━━━
Powered by NGD Queue Master`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(match.id);
      setTimeout(() => setCopiedId(null), 2500);
    });
  };

  // Helper to compute category leaders for a match
  const getCategoryLeaders = (match: MatchHistoryRecord) => {
    const all = [...match.teamBlue, ...match.teamRed];

    // 💥 Damage God: Highest heroDamage
    const sortedByDamage = [...all].filter((p) => p.heroDamage && p.heroDamage > 0).sort((a, b) => (b.heroDamage || 0) - (a.heroDamage || 0));
    const damageGod = sortedByDamage[0];

    // 🏰 Tower Eraser: Highest turretDamage
    const sortedByTurret = [...all].filter((p) => p.turretDamage && p.turretDamage > 0).sort((a, b) => (b.turretDamage || 0) - (a.turretDamage || 0));
    const towerEraser = sortedByTurret[0];

    // 🛡️ Pambansang Shield: Highest damageTaken
    const sortedByTank = [...all].filter((p) => p.damageTaken && p.damageTaken > 0).sort((a, b) => (b.damageTaken || 0) - (a.damageTaken || 0));
    const shieldMaster = sortedByTank[0];

    // ⚔️ Teamfight Master: Highest teamfightPct
    const sortedByTf = [...all].filter((p) => p.teamfightPct && p.teamfightPct > 0).sort((a, b) => (b.teamfightPct || 0) - (a.teamfightPct || 0));
    const tfMaster = sortedByTf[0];

    // 🥉 Feeder / Tanso
    const feeder = match.feederIgn
      ? all.find((p) => p.ign.toLowerCase() === match.feederIgn?.toLowerCase()) ||
        all.find((p) => p.isFeeder)
      : all.find((p) => p.isFeeder || p.medal?.toLowerCase() === 'bronze');

    return {
      damageGod,
      towerEraser,
      shieldMaster,
      tfMaster,
      feeder,
    };
  };

  // Filter matches
  const filteredMatches = matchHistory.filter((m) => {
    if (filterWinner !== 'All' && m.winner !== filterWinner) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const inName = m.roomName.toLowerCase().includes(q);
      const inMvp = m.mvpIgn.toLowerCase().includes(q);
      const inFeeder = (m.feederIgn || '').toLowerCase().includes(q);
      const inPlayers =
        m.teamBlue.some((p) => p.ign.toLowerCase().includes(q)) ||
        m.teamRed.some((p) => p.ign.toLowerCase().includes(q));
      if (!inName && !inMvp && !inFeeder && !inPlayers) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats Overview */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border border-indigo-500/30 p-5 sm:p-7 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
              <span>Advance OCR Post-Match Analytics & Posters</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-display font-black text-white tracking-wide flex items-center gap-2.5">
              <span>Game Stats & Logs</span>
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30 font-mono">
                {matchHistory.length} Matches Logged
              </span>
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Detailed damage stats, turret push, damage taken, teamfight %, and instant esports poster generation. Export match graphics for Facebook, Messenger GC, and Discord!
            </p>
          </div>

          {matchHistory.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => openPosterModal(matchHistory[0], 'recap')}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-950 font-display font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-yellow-500/20 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export Latest Match Graphic</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by player IGN, game room, MVP, feeder..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Winner:
          </span>
          <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
            {(['All', 'Blue', 'Red'] as const).map((team) => (
              <button
                key={team}
                type="button"
                onClick={() => setFilterWinner(team)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                  filterWinner === team
                    ? team === 'Blue'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : team === 'Red'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {team}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Match History List */}
      <div className="space-y-5">
        {filteredMatches.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-slate-400">
            <Layers className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="font-semibold text-slate-300">No matches found</p>
            <p className="text-xs text-slate-500 mt-1">
              Try adjusting your search query or record battle results in the 5v5 Match tab.
            </p>
          </div>
        ) : (
          filteredMatches.map((match, matchIndex) => {
            const isExpanded = !!expandedMatchIds[match.id];
            const leaders = getCategoryLeaders(match);
            const isBlueWin = match.winner === 'Blue';

            return (
              <div
                key={match.id}
                className="overflow-hidden rounded-2xl bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 transition shadow-lg"
              >
                {/* Match Header Bar */}
                <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-slate-900/95 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-display font-black text-base shrink-0 shadow-md ${
                        isBlueWin
                          ? 'bg-gradient-to-br from-blue-500 to-indigo-700 text-white ring-2 ring-blue-400/30'
                          : 'bg-gradient-to-br from-rose-500 to-red-700 text-white ring-2 ring-rose-400/30'
                      }`}
                    >
                      <span className="text-[10px] uppercase tracking-wider font-sans font-bold opacity-80">
                        WIN
                      </span>
                      <span>{match.winner.toUpperCase()}</span>
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base sm:text-lg font-display font-black text-white">
                          {match.roomName}
                        </span>
                        {match.seriesScore && (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-mono font-bold">
                            Series: {match.seriesScore}
                          </span>
                        )}
                        <span className="text-xs text-slate-400 font-mono">
                          {match.completedAt}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                        {match.killScore && (
                          <span className="font-mono font-bold text-slate-200 bg-slate-800 px-2 py-0.5 rounded">
                            {match.killScore}
                          </span>
                        )}
                        <span className="text-slate-400">⏱️ {match.durationText || '15:00'}</span>

                        <span className="inline-flex items-center gap-1 text-amber-300 font-semibold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                          <Trophy className="w-3 h-3 text-yellow-400" />
                          <span>MVP: {match.mvpIgn}</span>
                        </span>

                        {match.svpIgn && (
                          <span className="inline-flex items-center gap-1 text-purple-300 font-semibold bg-purple-400/10 px-2 py-0.5 rounded border border-purple-400/20">
                            <Award className="w-3 h-3 text-purple-400" />
                            <span>SVP: {match.svpIgn}</span>
                          </span>
                        )}

                        {(() => {
                          const tansos =
                            match.feederIgns && match.feederIgns.length > 0
                              ? match.feederIgns
                              : match.feederIgn
                                ? [match.feederIgn]
                                : [];
                          if (tansos.length === 0) return null;
                          return (
                            <span className="inline-flex items-center gap-1 text-amber-500 font-semibold bg-amber-950/40 px-2 py-0.5 rounded border border-amber-600/30">
                              <Skull className="w-3 h-3 text-amber-500" />
                              <span>Tanso ({tansos.length}): {tansos.join(', ')}</span>
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Actions on this match */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Poster Export Trigger */}
                    <div className="inline-flex rounded-xl bg-slate-800/80 p-1 border border-slate-700/80">
                      <button
                        type="button"
                        onClick={() => openPosterModal(match, 'recap')}
                        title="Generate official match graphic"
                        className="px-3 py-1.5 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300 font-display font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border border-yellow-500/30"
                      >
                        <Share2 className="w-3.5 h-3.5 text-yellow-400" />
                        <span>Poster</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openPosterModal(match, 'full10')}
                        title="Export 10-player performance ranking poster"
                        className="px-2.5 py-1.5 rounded-lg hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition cursor-pointer"
                      >
                        <Layers className="w-3.5 h-3.5 text-blue-400" />
                        <span>All 10</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openPosterModal(match, 'feeder')}
                        title="Export humorous Tanso / Feeder award graphic"
                        className="px-2.5 py-1.5 rounded-lg hover:bg-slate-700 text-amber-300 text-xs flex items-center gap-1 transition cursor-pointer"
                      >
                        <Skull className="w-3.5 h-3.5 text-amber-400" />
                        <span>Tanso Award</span>
                      </button>
                    </div>

                    {/* View Screenshot button */}
                    <button
                      type="button"
                      onClick={() => openScreenshotModal(match)}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="hidden sm:inline">View Screenshot</span>
                      <span className="sm:hidden">Photo</span>
                    </button>

                    {/* Edit Match Stats button (Admin feature) */}
                    {onEditMatchStats && (
                      <button
                        type="button"
                        onClick={() => onEditMatchStats(match)}
                        className="px-3 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                        title={isAdmin ? 'Edit / Input missing player stats' : 'Admin Only: Edit match stats'}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Edit Stats</span>
                        <span className="sm:hidden">Edit</span>
                        {!isAdmin && <Lock className="w-3 h-3 text-slate-400 ml-0.5" />}
                      </button>
                    )}

                    {/* Copy GC text */}
                    <button
                      type="button"
                      onClick={() => copyGcSummary(match)}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      title="Copy GC announcement text"
                    >
                      {copiedId === match.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Copy GC</span>
                        </>
                      )}
                    </button>

                    {/* Toggle expand breakdown */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(match.id)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition cursor-pointer"
                      title={isExpanded ? 'Collapse breakdown' : 'Expand full stats'}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Match Category Leaders (Data Breakdown Highlights) */}
                <div className="p-4 sm:p-5 bg-slate-950/40 border-b border-slate-800/80">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-yellow-400" />
                    <span>Match Category Leaders (Data Breakdown)</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
                    {/* 💥 Damage God */}
                    <div className="rounded-xl p-3 bg-rose-950/20 border border-rose-500/20 flex flex-col justify-between">
                      <div className="flex items-center gap-1.5 text-rose-400 text-xs font-bold">
                        <Flame className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>Damage God</span>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm font-display font-black text-white truncate">
                          {leaders.damageGod?.ign || 'N/A'}
                        </p>
                        <p className="text-[11px] font-mono text-rose-300 font-semibold">
                          {leaders.damageGod?.heroDamage
                            ? `${(leaders.damageGod.heroDamage / 1000).toFixed(1)}k DMG`
                            : 'Highest Hero DMG'}
                          {leaders.damageGod?.heroDamagePct
                            ? ` (${leaders.damageGod.heroDamagePct}%)`
                            : ''}
                        </p>
                      </div>
                    </div>

                    {/* 🏰 Tower Eraser */}
                    <div className="rounded-xl p-3 bg-amber-950/20 border border-amber-500/20 flex flex-col justify-between">
                      <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold">
                        <Swords className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Tower Eraser</span>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm font-display font-black text-white truncate">
                          {leaders.towerEraser?.ign || 'N/A'}
                        </p>
                        <p className="text-[11px] font-mono text-amber-300 font-semibold">
                          {leaders.towerEraser?.turretDamage
                            ? `${(leaders.towerEraser.turretDamage / 1000).toFixed(1)}k Turret`
                            : 'Highest Push'}
                          {leaders.towerEraser?.turretDamagePct
                            ? ` (${leaders.towerEraser.turretDamagePct}%)`
                            : ''}
                        </p>
                      </div>
                    </div>

                    {/* 🛡️ Pambansang Shield */}
                    <div className="rounded-xl p-3 bg-blue-950/20 border border-blue-500/20 flex flex-col justify-between">
                      <div className="flex items-center gap-1.5 text-blue-400 text-xs font-bold">
                        <Shield className="w-4 h-4 text-blue-400 shrink-0" />
                        <span>Pambansang Shield</span>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm font-display font-black text-white truncate">
                          {leaders.shieldMaster?.ign || 'N/A'}
                        </p>
                        <p className="text-[11px] font-mono text-blue-300 font-semibold">
                          {leaders.shieldMaster?.damageTaken
                            ? `${(leaders.shieldMaster.damageTaken / 1000).toFixed(1)}k Taken`
                            : 'Highest Tank'}
                          {leaders.shieldMaster?.damageTakenPct
                            ? ` (${leaders.shieldMaster.damageTakenPct}%)`
                            : ''}
                        </p>
                      </div>
                    </div>

                    {/* ⚔️ Teamfight Master */}
                    <div className="rounded-xl p-3 bg-indigo-950/20 border border-indigo-500/20 flex flex-col justify-between">
                      <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-bold">
                        <Trophy className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span>Teamfight Master</span>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm font-display font-black text-white truncate">
                          {leaders.tfMaster?.ign || 'N/A'}
                        </p>
                        <p className="text-[11px] font-mono text-indigo-300 font-semibold">
                          {leaders.tfMaster?.teamfightPct
                            ? `${leaders.tfMaster.teamfightPct}% Teamfight`
                            : 'Highest TF %'}
                        </p>
                      </div>
                    </div>

                    {/* 🥉 Feeder / Tanso Award */}
                    <div className="col-span-2 sm:col-span-4 lg:col-span-1 rounded-xl p-3 bg-amber-950/30 border border-amber-600/30 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-amber-500 text-xs font-bold">
                          <Skull className="w-4 h-4 text-amber-500 shrink-0" />
                          <span>Tanso / Feeder</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => openPosterModal(match, 'feeder')}
                          className="text-[10px] text-amber-400 hover:underline font-bold"
                        >
                          Meme Graphic →
                        </button>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm font-display font-black text-amber-200 truncate">
                          {leaders.feeder?.ign || match.feederIgn || 'Walang Tanso!'}
                        </p>
                        <p className="text-[11px] font-mono text-amber-400 font-semibold">
                          {leaders.feeder?.kda
                            ? `KDA: ${leaders.feeder.kda}`
                            : 'Feeder of the match'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Detailed 10-Player Table */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 space-y-6">
                    {/* Blue Team Breakdown */}
                    <div className="rounded-xl overflow-hidden border border-blue-500/20 bg-blue-950/10">
                      <div className="px-4 py-2.5 bg-blue-950/40 border-b border-blue-500/20 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-blue-500 shadow-sm" />
                          <span className="font-display font-bold text-white text-sm">
                            TEAM BLUE
                          </span>
                          {match.winner === 'Blue' && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              VICTORY
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-mono text-blue-300">
                          {match.blueKills ? `${match.blueKills} Kills` : '5 Players'}
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] font-mono tracking-wider border-b border-slate-800">
                            <tr>
                              <th className="py-2.5 px-3">Player</th>
                              <th className="py-2.5 px-2">Role</th>
                              <th className="py-2.5 px-2">KDA</th>
                              <th className="py-2.5 px-2">Rating</th>
                              <th className="py-2.5 px-3">Hero Damage</th>
                              <th className="py-2.5 px-3">Damage Taken</th>
                              <th className="py-2.5 px-2">Turret Push</th>
                              <th className="py-2.5 px-2">Teamfight</th>
                              <th className="py-2.5 px-2 text-right">Badge</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 font-mono">
                            {match.teamBlue.map((player) => {
                              const isMvp = player.ign.toLowerCase() === match.mvpIgn.toLowerCase();
                              const isSvp = match.svpIgn && player.ign.toLowerCase() === match.svpIgn.toLowerCase();
                              const isFeeder =
                                player.isFeeder ||
                                player.medal?.toLowerCase() === 'bronze' ||
                                Boolean(match.feederIgns?.some((f) => f.toLowerCase() === player.ign.toLowerCase())) ||
                                Boolean(match.feederIgn && player.ign.toLowerCase() === match.feederIgn.toLowerCase());

                              return (
                                <tr
                                  key={player.ign}
                                  className={`hover:bg-slate-800/40 transition ${
                                    isMvp ? 'bg-yellow-500/5' : isFeeder ? 'bg-amber-500/5' : ''
                                  }`}
                                >
                                  <td className="py-2.5 px-3 font-sans">
                                    <div className="flex items-center gap-1.5 font-display font-bold text-slate-200">
                                      <span>{player.ign}</span>
                                      {isMvp && (
                                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-yellow-400 text-slate-950 font-black">
                                          MVP
                                        </span>
                                      )}
                                      {isSvp && (
                                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500 text-white font-black">
                                          SVP
                                        </span>
                                      )}
                                      {isFeeder && (
                                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-700 text-amber-100 font-black">
                                          TANSO
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-2 font-sans text-slate-300">
                                    {player.selectedRole}
                                  </td>
                                  <td className="py-2.5 px-2 text-slate-200 font-bold">
                                    {player.kda || '—'}
                                  </td>
                                  <td className="py-2.5 px-2 text-amber-400 font-bold">
                                    {player.rating || '—'}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <div className="text-slate-300">
                                      {player.heroDamage
                                        ? `${(player.heroDamage / 1000).toFixed(1)}k`
                                        : '—'}
                                      {player.heroDamagePct && (
                                        <span className="text-slate-400 ml-1 text-[10px]">
                                          ({player.heroDamagePct}%)
                                        </span>
                                      )}
                                    </div>
                                    {player.heroDamagePct && (
                                      <div className="w-16 h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
                                        <div
                                          className="h-full bg-rose-500 rounded-full"
                                          style={{ width: `${Math.min(100, player.heroDamagePct * 2.5)}%` }}
                                        />
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <div className="text-slate-300">
                                      {player.damageTaken
                                        ? `${(player.damageTaken / 1000).toFixed(1)}k`
                                        : '—'}
                                      {player.damageTakenPct && (
                                        <span className="text-slate-400 ml-1 text-[10px]">
                                          ({player.damageTakenPct}%)
                                        </span>
                                      )}
                                    </div>
                                    {player.damageTakenPct && (
                                      <div className="w-16 h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
                                        <div
                                          className="h-full bg-blue-500 rounded-full"
                                          style={{ width: `${Math.min(100, player.damageTakenPct * 2.5)}%` }}
                                        />
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-2 text-slate-300">
                                    {player.turretDamage
                                      ? `${(player.turretDamage / 1000).toFixed(1)}k`
                                      : '—'}
                                    {player.turretDamagePct && (
                                      <span className="text-slate-400 ml-1 text-[10px]">
                                        ({player.turretDamagePct}%)
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-2 text-indigo-300 font-bold">
                                    {player.teamfightPct ? `${player.teamfightPct}%` : '—'}
                                  </td>
                                  <td className="py-2.5 px-2 text-right">
                                    {player.medal ? (
                                      <span
                                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                          player.medal.toLowerCase() === 'gold'
                                            ? 'bg-yellow-500/20 text-yellow-300'
                                            : player.medal.toLowerCase() === 'silver'
                                            ? 'bg-slate-400/20 text-slate-300'
                                            : 'bg-amber-600/20 text-amber-400'
                                        }`}
                                      >
                                        {player.medal}
                                      </span>
                                    ) : (
                                      '—'
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Red Team Breakdown */}
                    <div className="rounded-xl overflow-hidden border border-rose-500/20 bg-rose-950/10">
                      <div className="px-4 py-2.5 bg-rose-950/40 border-b border-rose-500/20 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-rose-500 shadow-sm" />
                          <span className="font-display font-bold text-white text-sm">
                            TEAM RED
                          </span>
                          {match.winner === 'Red' && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              VICTORY
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-mono text-rose-300">
                          {match.redKills ? `${match.redKills} Kills` : '5 Players'}
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] font-mono tracking-wider border-b border-slate-800">
                            <tr>
                              <th className="py-2.5 px-3">Player</th>
                              <th className="py-2.5 px-2">Role</th>
                              <th className="py-2.5 px-2">KDA</th>
                              <th className="py-2.5 px-2">Rating</th>
                              <th className="py-2.5 px-3">Hero Damage</th>
                              <th className="py-2.5 px-3">Damage Taken</th>
                              <th className="py-2.5 px-2">Turret Push</th>
                              <th className="py-2.5 px-2">Teamfight</th>
                              <th className="py-2.5 px-2 text-right">Badge</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 font-mono">
                            {match.teamRed.map((player) => {
                              const isMvp = player.ign.toLowerCase() === match.mvpIgn.toLowerCase();
                              const isSvp = match.svpIgn && player.ign.toLowerCase() === match.svpIgn.toLowerCase();
                              const isFeeder =
                                player.isFeeder ||
                                player.medal?.toLowerCase() === 'bronze' ||
                                Boolean(match.feederIgns?.some((f) => f.toLowerCase() === player.ign.toLowerCase())) ||
                                Boolean(match.feederIgn && player.ign.toLowerCase() === match.feederIgn.toLowerCase());

                              return (
                                <tr
                                  key={player.ign}
                                  className={`hover:bg-slate-800/40 transition ${
                                    isMvp ? 'bg-yellow-500/5' : isFeeder ? 'bg-amber-500/5' : ''
                                  }`}
                                >
                                  <td className="py-2.5 px-3 font-sans">
                                    <div className="flex items-center gap-1.5 font-display font-bold text-slate-200">
                                      <span>{player.ign}</span>
                                      {isMvp && (
                                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-yellow-400 text-slate-950 font-black">
                                          MVP
                                        </span>
                                      )}
                                      {isSvp && (
                                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500 text-white font-black">
                                          SVP
                                        </span>
                                      )}
                                      {isFeeder && (
                                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-700 text-amber-100 font-black">
                                          TANSO
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-2 font-sans text-slate-300">
                                    {player.selectedRole}
                                  </td>
                                  <td className="py-2.5 px-2 text-slate-200 font-bold">
                                    {player.kda || '—'}
                                  </td>
                                  <td className="py-2.5 px-2 text-amber-400 font-bold">
                                    {player.rating || '—'}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <div className="text-slate-300">
                                      {player.heroDamage
                                        ? `${(player.heroDamage / 1000).toFixed(1)}k`
                                        : '—'}
                                      {player.heroDamagePct && (
                                        <span className="text-slate-400 ml-1 text-[10px]">
                                          ({player.heroDamagePct}%)
                                        </span>
                                      )}
                                    </div>
                                    {player.heroDamagePct && (
                                      <div className="w-16 h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
                                        <div
                                          className="h-full bg-rose-500 rounded-full"
                                          style={{ width: `${Math.min(100, player.heroDamagePct * 2.5)}%` }}
                                        />
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <div className="text-slate-300">
                                      {player.damageTaken
                                        ? `${(player.damageTaken / 1000).toFixed(1)}k`
                                        : '—'}
                                      {player.damageTakenPct && (
                                        <span className="text-slate-400 ml-1 text-[10px]">
                                          ({player.damageTakenPct}%)
                                        </span>
                                      )}
                                    </div>
                                    {player.damageTakenPct && (
                                      <div className="w-16 h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
                                        <div
                                          className="h-full bg-blue-500 rounded-full"
                                          style={{ width: `${Math.min(100, player.damageTakenPct * 2.5)}%` }}
                                        />
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-2 text-slate-300">
                                    {player.turretDamage
                                      ? `${(player.turretDamage / 1000).toFixed(1)}k`
                                      : '—'}
                                    {player.turretDamagePct && (
                                      <span className="text-slate-400 ml-1 text-[10px]">
                                        ({player.turretDamagePct}%)
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-2 text-indigo-300 font-bold">
                                    {player.teamfightPct ? `${player.teamfightPct}%` : '—'}
                                  </td>
                                  <td className="py-2.5 px-2 text-right">
                                    {player.medal ? (
                                      <span
                                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                          player.medal.toLowerCase() === 'gold'
                                            ? 'bg-yellow-500/20 text-yellow-300'
                                            : player.medal.toLowerCase() === 'silver'
                                            ? 'bg-slate-400/20 text-slate-300'
                                            : 'bg-amber-600/20 text-amber-400'
                                        }`}
                                      >
                                        {player.medal}
                                      </span>
                                    ) : (
                                      '—'
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Screenshot Preview Modal */}
      {previewScreenshotUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md">
          <div className="relative max-w-4xl w-full bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                <span className="font-display font-bold text-white text-sm sm:text-base">
                  {previewScreenshotTitle}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewScreenshotUrl(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-slate-950/70">
              <img
                src={previewScreenshotUrl}
                alt="Battle Screenshot"
                className="max-h-[70vh] w-auto object-contain rounded-lg shadow-lg border border-slate-800"
              />
            </div>

            <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Verified OCR Screenshot · MLBB Post-Match Scoreboard / Data</span>
              <button
                type="button"
                onClick={() => setPreviewScreenshotUrl(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Match Poster Export Modal */}
      {selectedMatchForPoster && (
        <MatchPosterModal
          match={selectedMatchForPoster}
          onClose={() => setSelectedMatchForPoster(null)}
        />
      )}
    </div>
  );
};
