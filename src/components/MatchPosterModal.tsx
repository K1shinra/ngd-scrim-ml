import React, { useEffect, useRef, useState } from 'react';
import {
  Download,
  Copy,
  Check,
  X,
  Trophy,
  Flame,
  Shield,
  Swords,
  Skull,
  Share2,
  Sparkles,
  Award,
  Layers,
} from 'lucide-react';
import {
  MatchHistoryRecord,
  MatchParticipant,
  ROLE_META,
} from '../data/ngdData';

export type PosterTemplate = 'recap' | 'full10' | 'feeder' | 'leaders' | 'lineup';

interface MatchPosterModalProps {
  match: MatchHistoryRecord;
  onClose: () => void;
}

export const MatchPosterModal: React.FC<MatchPosterModalProps> = ({
  match,
  onClose,
}) => {
  const [selectedTemplate, setSelectedTemplate] =
    useState<PosterTemplate>('recap');
  const [isCopied, setIsCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Combine and sort 10 players by performance score
  const all10Players = React.useMemo(() => {
    const list = [
      ...match.teamBlue.map((p) => ({ ...p, team: 'Blue' as const })),
      ...match.teamRed.map((p) => ({ ...p, team: 'Red' as const })),
    ];

    return list.sort((a, b) => {
      // Winning MVP is always #1
      const aIsMvp =
        a.ign.toLowerCase() === match.mvpIgn.toLowerCase() &&
        a.team === match.winner;
      const bIsMvp =
        b.ign.toLowerCase() === match.mvpIgn.toLowerCase() &&
        b.team === match.winner;
      if (aIsMvp) return -1;
      if (bIsMvp) return 1;

      // SVP is #2 if matched
      const aIsSvp =
        match.svpIgn && a.ign.toLowerCase() === match.svpIgn.toLowerCase();
      const bIsSvp =
        match.svpIgn && b.ign.toLowerCase() === match.svpIgn.toLowerCase();
      if (aIsSvp && !bIsMvp) return -1;
      if (bIsSvp && !aIsMvp) return 1;

      // Numerical rating
      const rateA = parseFloat(a.rating || '0') || 0;
      const rateB = parseFloat(b.rating || '0') || 0;
      if (rateB !== rateA) return rateB - rateA;

      // Hero damage
      const dmgA = a.heroDamage || 0;
      const dmgB = b.heroDamage || 0;
      return dmgB - dmgA;
    });
  }, [match]);

  // Identify Category Leaders
  const categoryLeaders = React.useMemo(() => {
    let topDamage = all10Players[0];
    let topPush = all10Players[0];
    let topShield = all10Players[0];
    let topTf = all10Players[0];
    let topFeeder = all10Players[all10Players.length - 1];

    for (const p of all10Players) {
      if ((p.heroDamage || 0) > (topDamage?.heroDamage || 0)) topDamage = p;
      if ((p.turretDamage || 0) > (topPush?.turretDamage || 0)) topPush = p;
      if ((p.damageTaken || 0) > (topShield?.damageTaken || 0)) topShield = p;
      if ((p.teamfightPct || 0) > (topTf?.teamfightPct || 0)) topTf = p;
    }

    // Feeder: explicit feeder or lowest rating/bronze or highest deaths
    const explicitFeeder = all10Players.find(
      (p) =>
        p.isFeeder ||
        (match.feederIgn &&
          p.ign.toLowerCase() === match.feederIgn.toLowerCase())
    );

    if (explicitFeeder) {
      topFeeder = explicitFeeder;
    } else {
      // Find lowest rating or most deaths in KDA
      let lowestScore = 999;
      let worst = all10Players[all10Players.length - 1];
      for (const p of all10Players) {
        const score = parseFloat(p.rating || '6.0');
        if (score < lowestScore) {
          lowestScore = score;
          worst = p;
        }
      }
      topFeeder = worst;
    }

    return { topDamage, topPush, topShield, topTf, topFeeder };
  }, [all10Players, match]);

  // Render Canvas graphics with ultra high fidelity
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1200;
    const height =
      selectedTemplate === 'full10'
        ? 1350
        : selectedTemplate === 'feeder'
          ? 900
          : selectedTemplate === 'leaders'
            ? 960
            : selectedTemplate === 'lineup'
              ? 880
              : 850;

    canvas.width = width;
    canvas.height = height;

    // Background Gradient (Dark Esports Arena)
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#0a0d14');
    bgGrad.addColorStop(0.5, '#0f172a');
    bgGrad.addColorStop(1, '#080a10');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle Grid / Accent Glow
    ctx.fillStyle =
      match.winner === 'Blue'
        ? 'rgba(0, 242, 254, 0.04)'
        : 'rgba(244, 63, 94, 0.04)';
    ctx.fillRect(0, 0, width, height);

    // Glow Circles
    const radGlow = ctx.createRadialGradient(
      width / 2,
      120,
      10,
      width / 2,
      120,
      450
    );
    if (selectedTemplate === 'feeder') {
      radGlow.addColorStop(0, 'rgba(217, 119, 6, 0.25)');
      radGlow.addColorStop(1, 'transparent');
    } else {
      radGlow.addColorStop(0, 'rgba(241, 196, 15, 0.22)');
      radGlow.addColorStop(1, 'transparent');
    }
    ctx.fillStyle = radGlow;
    ctx.fillRect(0, 0, width, height);

    // Top Header: NGD LOGO & EVENT BANNER
    ctx.save();
    // Border Outline Card
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    // Gold Top Accent Line
    const goldGrad = ctx.createLinearGradient(0, 20, width, 20);
    goldGrad.addColorStop(0, '#f1c40f');
    goldGrad.addColorStop(0.5, '#00f2fe');
    goldGrad.addColorStop(1, '#f1c40f');
    ctx.fillStyle = goldGrad;
    ctx.fillRect(20, 20, width - 40, 6);

    // Header Badge: NGD TOURNAMENT / SCRIMS
    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 16px "Montserrat", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ NGD GAMING SCRIM MANAGEMENT SYSTEM · MLBB 5v5 ⚡', width / 2, 60);

    // Series Room Title & Date
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 36px "Montserrat", sans-serif';
    ctx.fillText(
      (match.roomName || 'CUSTOM 5v5 MATCH').toUpperCase(),
      width / 2,
      105
    );

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 15px "JetBrains Mono", monospace';
    const subMeta = `${match.completedAt} · DURATION: ${match.durationText || '15:00'} · ${match.seriesScore || 'OFFICIAL SCRIM'}`;
    ctx.fillText(subMeta, width / 2, 132);

    // ----------------------------------------------------
    // TEMPLATE 1: OFFICIAL MATCH RECAP
    // ----------------------------------------------------
    if (selectedTemplate === 'recap') {
      // Winner Announcement Banner
      const winBannerY = 160;
      const isBlueWin = match.winner === 'Blue';
      ctx.fillStyle = isBlueWin ? 'rgba(0, 242, 254, 0.18)' : 'rgba(244, 63, 94, 0.18)';
      ctx.strokeStyle = isBlueWin ? '#00f2fe' : '#f43f5e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(width / 2 - 280, winBannerY, 560, 64, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isBlueWin ? '#00f2fe' : '#f43f5e';
      ctx.font = '900 28px "Montserrat", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        `🏆 VICTORY: TEAM ${match.winner.toUpperCase()} 🏆`,
        width / 2,
        winBannerY + 38
      );

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 14px "JetBrains Mono", monospace';
      ctx.fillText(
        match.killScore || `Blue ${match.blueKills || 0} - ${match.redKills || 0} Red`,
        width / 2,
        winBannerY + 56
      );

      // MVP Spotlight Box
      const mvpBoxY = 245;
      const mvpBoxH = 110;
      const mvpGrad = ctx.createLinearGradient(60, mvpBoxY, width - 120, mvpBoxY);
      mvpGrad.addColorStop(0, 'rgba(241, 196, 15, 0.14)');
      mvpGrad.addColorStop(1, 'rgba(241, 196, 15, 0.04)');
      ctx.fillStyle = mvpGrad;
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(60, mvpBoxY, width - 120, mvpBoxH, 14);
      ctx.fill();
      ctx.stroke();

      // MVP Badge text
      ctx.fillStyle = '#f1c40f';
      ctx.font = '900 20px "Montserrat", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('👑 MATCH MVP SPOTLIGHT', 90, mvpBoxY + 36);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 32px "Montserrat", sans-serif';
      ctx.fillText(match.mvpIgn, 90, mvpBoxY + 76);

      const winningMvpData = all10Players.find(
        (p) => p.ign.toLowerCase() === match.mvpIgn.toLowerCase()
      );

      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 15px "JetBrains Mono", monospace';
      const mvpStatsText = `RATING: ${winningMvpData?.rating || '10.5'}  ·  KDA: ${winningMvpData?.kda || 'MVP'}  ·  ROLE: ${winningMvpData ? ROLE_META[winningMvpData.assignedLane]?.gcLabel : 'Core'}`;
      ctx.fillText(mvpStatsText, 90, mvpBoxY + 98);

      // Defeat MVP / SVP Tag on right side of MVP box
      if (match.svpIgn) {
        ctx.textAlign = 'right';
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 14px "Montserrat", sans-serif';
        ctx.fillText('DEFEAT MVP (SVP):', width - 90, mvpBoxY + 38);
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '900 24px "Montserrat", sans-serif';
        ctx.fillText(match.svpIgn, width - 90, mvpBoxY + 72);
      }

      // Two Column Lineup: Team Blue (Left) vs Team Red (Right)
      const tableY = 380;
      const colW = (width - 150) / 2;

      // Draw Team Blue Column
      drawTeamColumn(
        ctx,
        'TEAM BLUE',
        match.teamBlue,
        60,
        tableY,
        colW,
        '#00f2fe',
        match.winner === 'Blue',
        match.mvpIgn
      );

      // Draw Team Red Column
      drawTeamColumn(
        ctx,
        'TEAM RED',
        match.teamRed,
        60 + colW + 30,
        tableY,
        colW,
        '#f43f5e',
        match.winner === 'Red',
        match.mvpIgn
      );
    }

    // ----------------------------------------------------
    // TEMPLATE 2: 10-PLAYER FULL RANKING LEADERBOARD
    // ----------------------------------------------------
    if (selectedTemplate === 'full10') {
      const bannerY = 160;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(60, bannerY, width - 120, 56, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f1c40f';
      ctx.font = '900 24px "Montserrat", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        '📊 COMPLETE 10-PLAYER PERFORMANCE RANKING (TOP 1 TO 10)',
        width / 2,
        bannerY + 36
      );

      // Table Header
      const listStartY = 240;
      const rowH = 95;

      all10Players.slice(0, 10).forEach((player, index) => {
        const y = listStartY + index * rowH;
        const isMvp =
          player.ign.toLowerCase() === match.mvpIgn.toLowerCase() &&
          player.team === match.winner;
        const isSvp =
          match.svpIgn &&
          player.ign.toLowerCase() === match.svpIgn.toLowerCase();
        const isBlue = player.team === 'Blue';

        // Row Card Background
        ctx.fillStyle = isMvp
          ? 'rgba(241, 196, 15, 0.15)'
          : isSvp
            ? 'rgba(168, 85, 247, 0.12)'
            : index % 2 === 0
              ? 'rgba(255, 255, 255, 0.03)'
              : 'rgba(255, 255, 255, 0.015)';
        ctx.strokeStyle = isMvp
          ? '#f1c40f'
          : isSvp
            ? '#a855f7'
            : isBlue
              ? 'rgba(0, 242, 254, 0.2)'
              : 'rgba(244, 63, 94, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(60, y, width - 120, rowH - 12, 10);
        ctx.fill();
        ctx.stroke();

        // Rank Badge
        ctx.textAlign = 'center';
        ctx.font = '900 24px "Montserrat", sans-serif';
        if (index === 0) {
          ctx.fillStyle = '#f1c40f';
          ctx.fillText('👑 #1', 110, y + 50);
        } else if (index === 1) {
          ctx.fillStyle = '#e2e8f0';
          ctx.fillText('🥈 #2', 110, y + 50);
        } else if (index === 2) {
          ctx.fillStyle = '#d97706';
          ctx.fillText('🥉 #3', 110, y + 50);
        } else {
          ctx.fillStyle = '#94a3b8';
          ctx.fillText(`#${index + 1}`, 110, y + 50);
        }

        // Team Indicator Tag
        ctx.font = 'bold 12px "JetBrains Mono", monospace';
        ctx.fillStyle = isBlue ? '#00f2fe' : '#f43f5e';
        ctx.fillText(isBlue ? 'TEAM BLUE' : 'TEAM RED', 190, y + 32);

        // Player IGN
        ctx.textAlign = 'left';
        ctx.font = '900 22px "Montserrat", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(player.ign, 170, y + 58);

        // Assigned Role
        const roleInfo = ROLE_META[player.assignedLane];
        ctx.fillStyle = roleInfo?.accentHex || '#38bdf8';
        ctx.font = 'bold 14px "JetBrains Mono", monospace';
        ctx.fillText(roleInfo?.gcLabel || 'Flex', 360, y + 56);

        // KDA & Score Rating
        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 15px "JetBrains Mono", monospace';
        ctx.fillText(`KDA: ${player.kda || '—'}`, 480, y + 56);

        // Medal Badge
        const medalText = player.medal || (isMvp ? 'MVP' : isSvp ? 'SVP' : 'Gold');
        ctx.fillStyle =
          medalText === 'MVP'
            ? '#f1c40f'
            : medalText === 'SVP'
              ? '#c084fc'
              : medalText === 'Bronze'
                ? '#d97706'
                : '#38bdf8';
        ctx.font = '900 16px "Montserrat", sans-serif';
        ctx.fillText(`⭐ ${medalText} (${player.rating || '8.0'})`, 670, y + 56);

        // Data Breakdown: Damage & Teamfight %
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 13px "JetBrains Mono", monospace';
        const dmgText = player.heroDamage
          ? `DMG: ${player.heroDamage.toLocaleString()} (${player.heroDamagePct || 0}%)`
          : `TF: ${player.teamfightPct || 50}%`;
        ctx.fillText(dmgText, 890, y + 56);

        const pushText = player.turretDamage
          ? `PUSH: ${player.turretDamage.toLocaleString()}`
          : `TF: ${player.teamfightPct || 50}%`;
        ctx.fillText(pushText, 1030, y + 56);
      });
    }

    // ----------------------------------------------------
    // TEMPLATE 3: BRONZE AWARD / MOST FEEDER OF THE MATCH
    // ----------------------------------------------------
    if (selectedTemplate === 'feeder') {
      const feeder = categoryLeaders.topFeeder;

      // Certificate / Meme Card Glow
      const memeBoxY = 165;
      const memeBoxH = 640;
      const feederGrad = ctx.createLinearGradient(
        width / 2,
        memeBoxY,
        width / 2,
        memeBoxY + memeBoxH
      );
      feederGrad.addColorStop(0, 'rgba(217, 119, 6, 0.18)');
      feederGrad.addColorStop(0.5, 'rgba(180, 83, 9, 0.08)');
      feederGrad.addColorStop(1, 'rgba(10, 10, 15, 0.95)');
      ctx.fillStyle = feederGrad;
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(80, memeBoxY, width - 160, memeBoxH, 20);
      ctx.fill();
      ctx.stroke();

      // Humorous Banner Header
      ctx.textAlign = 'center';
      ctx.fillStyle = '#d97706';
      ctx.font = '900 20px "Montserrat", sans-serif';
      ctx.fillText('🥉 OFFICIAL NGD BRONZE MEDALIST AWARD 🥉', width / 2, memeBoxY + 50);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 44px "Montserrat", sans-serif';
      ctx.fillText('PAMBANSANG FEEDER NG GAME', width / 2, memeBoxY + 105);

      ctx.fillStyle = '#f59e0b';
      ctx.font = 'italic 16px "Montserrat", sans-serif';
      ctx.fillText('"Certified Gold Donor · Tulog sa Clash · Babawi sa Next Scrim"', width / 2, memeBoxY + 140);

      // Feeder IGN Card in the Center
      const playerCardY = memeBoxY + 175;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(width / 2 - 250, playerCardY, 500, 110, 16);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.font = '900 16px "JetBrains Mono", monospace';
      ctx.fillText('🚨 HALL OF SHAME WINNER 🚨', width / 2, playerCardY + 36);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 40px "Montserrat", sans-serif';
      ctx.fillText(feeder?.ign || 'Unknown Feeder', width / 2, playerCardY + 84);

      // Feeder Stats Breakdown
      const statsY = playerCardY + 150;
      const statW = 200;
      const statGap = 25;
      const totalStatsW = statW * 3 + statGap * 2;
      const statStartX = (width - totalStatsW) / 2;

      // Box 1: KDA & Deaths
      drawFeederStatBox(
        ctx,
        statStartX,
        statsY,
        statW,
        110,
        '💀 RECORD KDA',
        feeder?.kda || '1/8/2',
        'Certified Feeder'
      );

      // Box 2: Rating
      drawFeederStatBox(
        ctx,
        statStartX + statW + statGap,
        statsY,
        statW,
        110,
        '⭐ TANSO RATING',
        feeder?.rating || '3.8',
        'Bronze Grade'
      );

      // Box 3: Damage Taken / TF
      drawFeederStatBox(
        ctx,
        statStartX + (statW + statGap) * 2,
        statsY,
        statW,
        110,
        '🛡️ DAMAGE TAKEN',
        feeder?.damageTaken
          ? `${(feeder.damageTaken / 1000).toFixed(0)}k`
          : 'High',
        'Nag-dive sa tore'
      );

      // Stamp / Seal on the bottom
      ctx.fillStyle = '#d97706';
      ctx.font = '900 14px "JetBrains Mono", monospace';
      ctx.fillText(
        '🏅 CERTIFIED BY NGD SCRIM MANAGEMENT · STRICTLY FOR FRIENDLY BANTER IN GC 🏅',
        width / 2,
        memeBoxY + memeBoxH - 40
      );
    }

    // ----------------------------------------------------
    // TEMPLATE 4: CATEGORY LEADERS (DATA GODS)
    // ----------------------------------------------------
    if (selectedTemplate === 'leaders') {
      const bannerY = 160;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.strokeStyle = '#00f2fe';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(60, bannerY, width - 120, 56, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#00f2fe';
      ctx.font = '900 24px "Montserrat", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        '⚔️ ADVANCED MATCH DATA LEADERS & RECOGNITION ⚔️',
        width / 2,
        bannerY + 36
      );

      // 4 Big Leader Cards (2x2 Grid)
      const gridY = 245;
      const cardW = (width - 150) / 2;
      const cardH = 150;
      const rowGap = 20;

      // 1. Damage God
      drawCategoryLeaderCard(
        ctx,
        60,
        gridY,
        cardW,
        cardH,
        '💥 DAMAGE GOD (HIGHEST HERO DAMAGE)',
        categoryLeaders.topDamage?.ign || 'Unknown',
        categoryLeaders.topDamage
          ? `${categoryLeaders.topDamage.heroDamage?.toLocaleString() || '112,000'} (${categoryLeaders.topDamage.heroDamagePct || 35}% Team DMG)`
          : 'High Output',
        '#f59e0b',
        categoryLeaders.topDamage?.team || 'Blue'
      );

      // 2. Tower Eraser
      drawCategoryLeaderCard(
        ctx,
        60 + cardW + 30,
        gridY,
        cardW,
        cardH,
        '🏰 TOWER ERASER (OBJECTIVE & PUSH)',
        categoryLeaders.topPush?.ign || 'Unknown',
        categoryLeaders.topPush
          ? `${categoryLeaders.topPush.turretDamage?.toLocaleString() || '6,800'} Turret Damage`
          : 'Objective Core',
        '#00f2fe',
        categoryLeaders.topPush?.team || 'Blue'
      );

      // 3. Pambansang Shield
      drawCategoryLeaderCard(
        ctx,
        60,
        gridY + cardH + rowGap,
        cardW,
        cardH,
        '🛡️ PAMBANSANG SHIELD (DAMAGE TAKEN)',
        categoryLeaders.topShield?.ign || 'Unknown',
        categoryLeaders.topShield
          ? `${categoryLeaders.topShield.damageTaken?.toLocaleString() || '89,000'} Damage Absorbed`
          : 'Frontline Anchor',
        '#10b981',
        categoryLeaders.topShield?.team || 'Blue'
      );

      // 4. Teamfight Master
      drawCategoryLeaderCard(
        ctx,
        60 + cardW + 30,
        gridY + cardH + rowGap,
        cardW,
        cardH,
        '⚔️ TEAMFIGHT MASTER (TF PARTICIPATION)',
        categoryLeaders.topTf?.ign || 'Unknown',
        categoryLeaders.topTf
          ? `${categoryLeaders.topTf.teamfightPct || 75}% Teamfight Rate`
          : 'Clash Present',
        '#a855f7',
        categoryLeaders.topTf?.team || 'Blue'
      );

      // Bottom Row: Feeder Alert Card
      const feederAlertY = gridY + (cardH + rowGap) * 2;
      ctx.fillStyle = 'rgba(217, 119, 6, 0.12)';
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(60, feederAlertY, width - 120, 105, 14);
      ctx.fill();
      ctx.stroke();

      const allTansos = all10Players.filter(
        (p) =>
          p.isFeeder ||
          p.medal?.toLowerCase() === 'bronze' ||
          Boolean(
            match.feederIgns &&
              match.feederIgns.some(
                (f) => f.toLowerCase() === p.ign.toLowerCase()
              )
          ) ||
          Boolean(
            match.feederIgn &&
              p.ign.toLowerCase() === match.feederIgn.toLowerCase()
          )
      );

      const feederNames =
        allTansos.length > 1
          ? allTansos.map((t) => t.ign).join(' · ')
          : categoryLeaders.topFeeder?.ign || 'Player';

      ctx.textAlign = 'left';
      ctx.fillStyle = '#f59e0b';
      ctx.font = '900 16px "Montserrat", sans-serif';
      ctx.fillText(
        allTansos.length > 1
          ? `🪓 TANSO SQUAD ALERT (${allTansos.length} PLAYERS WITH BRONZE)`
          : '🪓 TANSO / FEEDER ALERT (MOST CASUALTIES)',
        90,
        feederAlertY + 36
      );

      ctx.fillStyle = '#ffffff';
      ctx.font =
        allTansos.length > 2
          ? '900 20px "Montserrat", sans-serif'
          : '900 28px "Montserrat", sans-serif';
      ctx.fillText(
        feederNames,
        90,
        feederAlertY + 74
      );

      ctx.textAlign = 'right';
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 16px "JetBrains Mono", monospace';
      ctx.fillText(
        `KDA: ${categoryLeaders.topFeeder?.kda || '1/8/8'} · RATING: ${categoryLeaders.topFeeder?.rating || '4.6'}`,
        width - 90,
        feederAlertY + 62
      );
    }

    // ==========================================
    // TEMPLATE 5: PRE-MATCH FACEOFF LINEUP
    // ==========================================
    if (selectedTemplate === 'lineup') {
      const bannerY = 160;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.strokeStyle = '#00f2fe';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(60, bannerY, width - 120, 56, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#00f2fe';
      ctx.font = '900 18px "Montserrat", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        `⚔️ OFFICIAL 5v5 SCRIM MATCHUP · ${match.durationText || 'BEST OF SERIES'} · PRE-MATCH FACEOFF ⚔️`,
        width / 2,
        bannerY + 35
      );

      // VS Badge in Center
      const vsY = 460;
      ctx.fillStyle = '#f1c40f';
      ctx.font = '900 24px "Montserrat", sans-serif';
      ctx.fillText('VS', width / 2, vsY);

      // Draw Team Blue Column
      const colW = (width - 120 - 50) / 2;
      const leftColX = 60;
      const rightColX = width / 2 + 25;
      const colY = bannerY + 75;

      drawLineupTeamColumn(
        ctx,
        'TEAM BLUE',
        match.teamBlue,
        leftColX,
        colY,
        colW,
        '#00f2fe',
        match.blueAvgWr
      );

      drawLineupTeamColumn(
        ctx,
        'TEAM RED',
        match.teamRed,
        rightColX,
        colY,
        colW,
        '#f43f5e',
        match.redAvgWr
      );
    }

    // Footer Branding
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = '500 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GENERATED BY NGD SCRIM SYSTEM · AI STUDIO BUILD · FOR MOBILE LEGENDS: BANG BANG', width / 2, height - 32);

    ctx.restore();
  }, [match, selectedTemplate, all10Players, categoryLeaders]);

  function drawLineupTeamColumn(
    ctx: CanvasRenderingContext2D,
    teamName: string,
    players: MatchParticipant[],
    x: number,
    y: number,
    w: number,
    colorHex: string,
    avgWr?: number
  ) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, 44, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = colorHex;
    ctx.font = '900 18px "Montserrat", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(teamName, x + 16, y + 28);

    if (typeof avgWr === 'number' && avgWr > 0) {
      ctx.textAlign = 'right';
      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      ctx.fillText(`AVG WR: ${avgWr.toFixed(1)}%`, x + w - 16, y + 28);
      ctx.textAlign = 'left';
    }

    const rowH = 68;
    players.slice(0, 5).forEach((p, idx) => {
      const rowY = y + 54 + idx * (rowH + 6);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, rowY, w, rowH, 8);
      ctx.fill();
      ctx.stroke();

      const roleMeta = ROLE_META[p.assignedLane];
      ctx.fillStyle = roleMeta?.accentHex || '#38bdf8';
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.fillText(roleMeta?.shortLabel || 'FLEX', x + 16, rowY + 26);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 18px "Montserrat", sans-serif';
      ctx.fillText(p.ign, x + 62, rowY + 28);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 13px "JetBrains Mono", monospace';
      ctx.fillText(
        `Lane: ${roleMeta?.gcLabel || p.assignedLane} · WR: ${p.winrateSnapshot}%`,
        x + 16,
        rowY + 52
      );
    });
  }

  // Helper function to draw a team column for Match Recap
  function drawTeamColumn(
    ctx: CanvasRenderingContext2D,
    teamName: string,
    players: MatchParticipant[],
    x: number,
    y: number,
    w: number,
    colorHex: string,
    isWinner: boolean,
    mvpIgn: string
  ) {
    // Column Header
    ctx.fillStyle = isWinner ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.3)';
    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, 44, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = colorHex;
    ctx.font = '900 18px "Montserrat", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${teamName} ${isWinner ? '👑 WINNER' : ''}`, x + 16, y + 28);

    // 5 Players Rows
    const rowH = 68;
    players.slice(0, 5).forEach((p, idx) => {
      const rowY = y + 54 + idx * (rowH + 6);
      const isPlayerMvp = p.ign.toLowerCase() === mvpIgn.toLowerCase();

      ctx.fillStyle = isPlayerMvp
        ? 'rgba(241, 196, 15, 0.12)'
        : 'rgba(255, 255, 255, 0.03)';
      ctx.strokeStyle = isPlayerMvp ? '#f1c40f' : 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, rowY, w, rowH, 8);
      ctx.fill();
      ctx.stroke();

      // Role Icon / Label
      const roleMeta = ROLE_META[p.assignedLane];
      ctx.fillStyle = roleMeta?.accentHex || '#38bdf8';
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.fillText(roleMeta?.shortLabel || 'FLEX', x + 16, rowY + 26);

      // Player IGN
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 18px "Montserrat", sans-serif';
      ctx.fillText(p.ign, x + 62, rowY + 28);

      // KDA & Rating
      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 13px "JetBrains Mono", monospace';
      const statsStr = `${p.kda || '—'} ${p.rating ? `· ⭐ ${p.rating}` : ''}`;
      ctx.fillText(statsStr, x + 16, rowY + 52);

      // Hero DMG or Push
      if (p.heroDamage) {
        ctx.textAlign = 'right';
        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'bold 12px "JetBrains Mono", monospace';
        ctx.fillText(`${p.heroDamage.toLocaleString()} DMG`, x + w - 16, rowY + 52);
        ctx.textAlign = 'left';
      }
    });
  }

  // Helper function for Category Leader Cards
  function drawCategoryLeaderCard(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    title: string,
    ign: string,
    statDesc: string,
    accentHex: string,
    team: 'Blue' | 'Red'
  ) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 14);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = accentHex;
    ctx.font = '900 14px "Montserrat", sans-serif';
    ctx.fillText(title, x + 20, y + 34);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 32px "Montserrat", sans-serif';
    ctx.fillText(ign, x + 20, y + 80);

    ctx.fillStyle = team === 'Blue' ? '#00f2fe' : '#f43f5e';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillText(team === 'Blue' ? 'TEAM BLUE' : 'TEAM RED', x + 20, y + 104);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 16px "JetBrains Mono", monospace';
    ctx.fillText(statDesc, x + w - 20, y + 125);
  }

  // Helper function for Feeder Box
  function drawFeederStatBox(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    value: string,
    sub: string
  ) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#d97706';
    ctx.font = 'bold 12px "Montserrat", sans-serif';
    ctx.fillText(label, x + w / 2, y + 30);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 28px "JetBrains Mono", monospace';
    ctx.fillText(value, x + w / 2, y + 68);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 12px "Montserrat", sans-serif';
    ctx.fillText(sub, x + w / 2, y + 92);
  }

  // Download high-resolution PNG
  const handleDownloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsGenerating(true);
    try {
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = `NGD-SCRIM-${match.id}-${selectedTemplate}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy PNG to Clipboard
  const handleCopyImageToClipboard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsGenerating(true);
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2500);
        } catch {
          // Fallback download if clipboard item not supported
          handleDownloadImage();
        } finally {
          setIsGenerating(false);
        }
      }, 'image/png');
    } catch {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-4 sm:p-6 text-slate-100 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#f1c40f]/20 border border-[#f1c40f]/50 flex items-center justify-center text-[#f1c40f]">
              <Share2 className="w-5 h-5 stroke-[2.3]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-display font-bold text-white">
                Shareable Match Result & Leaderboard Poster
              </h2>
              <p className="text-xs text-slate-400">
                Generate high-resolution PNG graphics ready for Messenger GC,
                Discord, or Facebook.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Template Selector Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-4 pb-3">
          <button
            type="button"
            onClick={() => setSelectedTemplate('recap')}
            className={`px-2.5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              selectedTemplate === 'recap'
                ? 'bg-[#f1c40f] text-slate-950 shadow-md font-display'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">🏆 Recap</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTemplate('lineup')}
            className={`px-2.5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              selectedTemplate === 'lineup'
                ? 'bg-blue-600 text-white shadow-md font-display'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            <Swords className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">⚔️ Lineup Card</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTemplate('full10')}
            className={`px-2.5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              selectedTemplate === 'full10'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-display'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">📊 10-Player</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTemplate('feeder')}
            className={`px-2.5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              selectedTemplate === 'feeder'
                ? 'bg-amber-600 text-white shadow-md font-display'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            <Skull className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">🥉 Feeder Award</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTemplate('leaders')}
            className={`px-2.5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              selectedTemplate === 'leaders'
                ? 'bg-purple-600 text-white shadow-md font-display'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">⚔️ Data Leaders</span>
          </button>
        </div>

        {/* Canvas Display Viewport (Scrollable with zoom scaling) */}
        <div className="flex-1 overflow-auto bg-slate-950/70 rounded-xl border border-slate-800 p-2 sm:p-4 flex items-center justify-center my-2">
          <canvas
            ref={canvasRef}
            className="w-full max-w-[850px] h-auto object-contain rounded-lg shadow-xl border border-slate-800"
          />
        </div>

        {/* Modal Action Footer */}
        <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {selectedTemplate === 'recap' && 'Official winner, MVP spotlight, and team rosters.'}
            {selectedTemplate === 'lineup' && 'Pre-match hype graphic with 5v5 rosters, average winrates, and lanes.'}
            {selectedTemplate === 'full10' && 'All 10 scrimmage players ranked #1 to #10.'}
            {selectedTemplate === 'feeder' && 'Entertaining Bronze Feeder of the Match card for GC banter.'}
            {selectedTemplate === 'leaders' && 'Damage God, Tower Eraser, Pambansang Shield, and Teamfight Master.'}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopyImageToClipboard}
              disabled={isGenerating}
              className="flex-1 sm:flex-none min-h-[40px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-display font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 shrink-0" />
                  <span>Copy Image</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isGenerating}
              className="flex-1 sm:flex-none min-h-[40px] px-4 py-2 rounded-xl bg-[#f1c40f] hover:bg-yellow-300 text-slate-950 font-display font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition shadow-md cursor-pointer"
            >
              <Download className="w-4 h-4 stroke-[2.5] shrink-0" />
              <span>Download PNG (@2x)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
