import {
  LiveMatchState,
  PlayerProfile,
  QueuedPlayer,
  ScrimSlot,
} from '../data/ngdData';

export function buildStandaloneSingleFileHtml(
  players: PlayerProfile[],
  slots: (ScrimSlot | null)[],
  queue: QueuedPlayer[],
  liveMatch: LiveMatchState
): string {
  const initialDataJson = JSON.stringify(
    {
      players,
      slots,
      queue,
      liveMatch,
    },
    null,
    2
  );

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NGD Scrim Management System — 5v5 MLBB In-House Palist</title>
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Outfit:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=UnifrakturMaguntia&display=swap" rel="stylesheet" />
  <style>
    body {
      background-color: #0b0f19;
      color: #f1f5f9;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }
    h1, h2, h3, .font-display {
      font-family: 'Outfit', sans-serif;
    }
    .font-mono-num {
      font-family: 'JetBrains Mono', monospace;
      font-variant-numeric: tabular-nums;
    }
    .font-gothic {
      font-family: 'UnifrakturMaguntia', serif;
    }
  </style>
</head>
<body class="min-h-screen bg-[#0b0f19] text-slate-100 pb-20">
  <!-- Top Bar -->
  <header class="sticky top-0 z-30 bg-[#0b0f19]/95 backdrop-blur border-b border-slate-800 px-4 md:px-8 py-3 flex items-center justify-between gap-4">
    <div class="flex items-center gap-3 shrink-0">
      <div class="px-2.5 py-1 bg-[#05070c] border border-[#f1c40f]/40 rounded text-[#f1c40f] font-display font-extrabold tracking-wider text-sm">
        NGD <span class="font-gothic font-normal text-xs">NextGenDominator</span>
      </div>
      <span class="font-display font-bold text-base md:text-lg tracking-tight text-white whitespace-nowrap">NGD Scrim System</span>
    </div>
    <nav class="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
      <button onclick="switchTab('queue')" id="nav-queue" class="text-[#00f2fe] whitespace-nowrap">Scrim Queue & Slots</button>
      <button onclick="switchTab('match')" id="nav-match" class="hover:text-white whitespace-nowrap">Live 5v5 Match</button>
      <button onclick="switchTab('stats')" id="nav-stats" class="hover:text-white whitespace-nowrap">Leaderboard & Player Stats</button>
    </nav>
    <button onclick="copyGcText()" class="px-3.5 py-2 rounded-lg bg-[#f1c40f] text-slate-950 font-semibold text-xs hover:bg-yellow-300 transition whitespace-nowrap">
      Copy 20-Slot GC Text
    </button>
  </header>

  <!-- Mobile Tab Switcher -->
  <div class="max-w-7xl mx-auto px-4 pt-4 md:hidden">
    <div class="grid grid-cols-3 gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
      <button onclick="switchTab('queue')" id="mnav-queue" class="py-2 text-xs font-semibold rounded-lg bg-[#00f2fe]/15 text-[#00f2fe]">Queue & Slots</button>
      <button onclick="switchTab('match')" id="mnav-match" class="py-2 text-xs font-semibold rounded-lg text-slate-400">Live 5v5</button>
      <button onclick="switchTab('stats')" id="mnav-stats" class="py-2 text-xs font-semibold rounded-lg text-slate-400">Leaderboard</button>
    </div>
  </div>

  <!-- Toast Notification -->
  <div id="toast" class="fixed bottom-5 right-5 z-50 hidden px-4 py-3 rounded-xl bg-slate-900 border border-[#00f2fe]/50 text-xs font-medium text-[#00f2fe] shadow-xl"></div>

  <main class="max-w-7xl mx-auto px-4 md:px-8 py-6">
    <!-- TAB 1: QUEUE & SLOTS -->
    <section id="tab-queue" class="space-y-6">
      <!-- Palist Join Queue Form -->
      <div class="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 class="text-lg font-bold text-white">One-Tap Palist / Join Scrim Queue</h2>
            <p class="text-xs text-slate-400">Enter your MLBB IGN, pick your primary role, and join the queue or claim an open slot.</p>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="autoBalance5v5()" class="px-4 py-2 rounded-lg bg-[#00f2fe] text-slate-950 font-bold text-xs hover:opacity-90 transition">
              Auto-Balance 5v5
            </button>
            <button onclick="copyGcText()" class="px-4 py-2 rounded-lg border border-[#f1c40f]/50 text-[#f1c40f] font-semibold text-xs hover:bg-[#f1c40f]/10 transition">
              Copy GC Text
            </button>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-12 gap-3">
          <input id="palist-ign" type="text" placeholder="Type MLBB IGN (e.g., Joshy, Faviannn)..." class="md:col-span-5 px-3.5 py-2.5 rounded-lg bg-[#0b0f19] border border-slate-700 text-sm text-white focus:outline-none focus:border-[#00f2fe]" />
          <select id="palist-role" class="md:col-span-3 px-3.5 py-2.5 rounded-lg bg-[#0b0f19] border border-slate-700 text-sm text-white focus:outline-none focus:border-[#00f2fe]">
            <option value="EXP Lane">EXP Lane</option>
            <option value="Gold Lane">Gold Lane</option>
            <option value="Mid Lane">Mid Lane</option>
            <option value="Jungle">Jungle</option>
            <option value="Roamer">Roamer</option>
            <option value="Flex Role">Flex Role</option>
          </select>
          <select id="palist-slot" class="md:col-span-2 px-3 py-2.5 rounded-lg bg-[#0b0f19] border border-slate-700 text-sm text-white">
            <option value="auto">Auto Next Open Slot</option>
            <option value="queue">Waiting Queue Only</option>
          </select>
          <button onclick="joinPalist()" class="md:col-span-2 px-4 py-2.5 rounded-lg bg-[#f1c40f] text-slate-950 font-bold text-sm hover:bg-yellow-300 transition">
            Palist / Join Queue
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- Waiting Queue List -->
        <div class="lg:col-span-4 p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-bold text-white">Waiting Queue Pool</h3>
            <span id="queue-count" class="text-xs font-mono-num text-slate-400">0 Queued</span>
          </div>
          <div id="queue-list" class="space-y-2"></div>
        </div>

        <!-- 20-Slot Official Scrim List -->
        <div class="lg:col-span-8 p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-bold text-white">Official 20-Slot Scrim Board</h3>
            <span id="slots-count" class="text-xs font-mono-num text-[#00f2fe]">0/20 Filled</span>
          </div>
          <div id="slots-grid" class="grid grid-cols-1 md:grid-cols-2 gap-2.5"></div>
        </div>
      </div>
    </section>

    <!-- TAB 2: LIVE 5v5 MATCH -->
    <section id="tab-match" class="hidden space-y-6">
      <div class="p-5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-white" id="match-room-title">NGD In-House 5v5 Match Room</h2>
          <p class="text-xs text-slate-400">Finish the match below to automatically update player lifetime wins, losses, and winrates.</p>
        </div>
        <div class="flex items-center gap-3">
          <button onclick="finishMatch('Blue')" class="px-4 py-2.5 rounded-lg bg-[#00f2fe] text-slate-950 font-bold text-xs hover:opacity-90 transition">
            Team Blue Won
          </button>
          <button onclick="finishMatch('Red')" class="px-4 py-2.5 rounded-lg bg-rose-500 text-white font-bold text-xs hover:bg-rose-400 transition">
            Team Red Won
          </button>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="p-5 rounded-xl bg-slate-900/90 border border-[#00f2fe]/30 space-y-3">
          <h3 class="text-base font-bold text-[#00f2fe]">Team Blue (First Pick)</h3>
          <div id="team-blue-list" class="space-y-2"></div>
        </div>
        <div class="p-5 rounded-xl bg-slate-900/90 border border-rose-500/30 space-y-3">
          <h3 class="text-base font-bold text-rose-400">Team Red (Second Pick)</h3>
          <div id="team-red-list" class="space-y-2"></div>
        </div>
      </div>
    </section>

    <!-- TAB 3: LEADERBOARD & PLAYER STATS -->
    <section id="tab-stats" class="hidden space-y-6">
      <div class="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-xl font-bold text-white">NGD Scrim Leaderboard & Lifetime Stats</h2>
            <p class="text-xs text-slate-400">Ranked by Total Wins, Scrim Winrate (%), and Total Matches Played.</p>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-slate-800 text-xs text-slate-400">
                <th class="py-3 px-3">Rank</th>
                <th class="py-3 px-3">Player IGN</th>
                <th class="py-3 px-3">Main Role</th>
                <th class="py-3 px-3 text-right">Matches</th>
                <th class="py-3 px-3 text-right">Wins</th>
                <th class="py-3 px-3 text-right">Losses</th>
                <th class="py-3 px-3 text-right">Winrate %</th>
              </tr>
            </thead>
            <tbody id="leaderboard-body" class="divide-y divide-slate-800/70 text-sm"></tbody>
          </table>
        </div>
      </div>
    </section>
  </main>

  <script>
    const STATE = ${initialDataJson};

    function showToast(msg) {
      const el = document.getElementById('toast');
      el.textContent = msg;
      el.classList.remove('hidden');
      setTimeout(() => el.classList.add('hidden'), 2800);
    }

    function switchTab(tab) {
      ['queue', 'match', 'stats'].forEach(t => {
        document.getElementById('tab-' + t).classList.toggle('hidden', t !== tab);
        const nav = document.getElementById('nav-' + t);
        if (nav) nav.className = t === tab ? 'text-[#00f2fe] font-semibold whitespace-nowrap' : 'text-slate-400 hover:text-white whitespace-nowrap';
        const mnav = document.getElementById('mnav-' + t);
        if (mnav) mnav.className = t === tab ? 'py-2 text-xs font-semibold rounded-lg bg-[#00f2fe]/15 text-[#00f2fe]' : 'py-2 text-xs font-semibold rounded-lg text-slate-400';
      });
      renderAll();
    }

    function joinPalist() {
      const ignInput = document.getElementById('palist-ign');
      const roleSelect = document.getElementById('palist-role');
      const slotMode = document.getElementById('palist-slot').value;
      const ign = ignInput.value.trim();
      const role = roleSelect.value;
      if (!ign) return showToast('Please enter an MLBB IGN first.');

      if (slotMode === 'auto') {
        const emptyIdx = STATE.slots.findIndex(s => s === null);
        if (emptyIdx !== -1) {
          STATE.slots[emptyIdx] = { slotNumber: emptyIdx + 1, ign, role, assignedAt: 'Now' };
          ignInput.value = '';
          renderAll();
          return showToast(ign + ' assigned to Slot #' + String(emptyIdx + 1).padStart(2, '0'));
        }
      }
      STATE.queue.push({ id: 'q-' + Date.now(), ign, role, joinedAt: 'Now' });
      ignInput.value = '';
      renderAll();
      showToast(ign + ' added to Waiting Queue (' + role + ')');
    }

    function assignQueueToSlot(qIdx) {
      const q = STATE.queue[qIdx];
      if (!q) return;
      const emptyIdx = STATE.slots.findIndex(s => s === null);
      if (emptyIdx === -1) return showToast('All 20 slots are currently full.');
      STATE.slots[emptyIdx] = { slotNumber: emptyIdx + 1, ign: q.ign, role: q.role, assignedAt: 'Now' };
      STATE.queue.splice(qIdx, 1);
      renderAll();
      showToast(q.ign + ' moved to Slot #' + String(emptyIdx + 1).padStart(2, '0'));
    }

    function removeSlot(idx) {
      STATE.slots[idx] = null;
      renderAll();
    }

    function removeQueue(qIdx) {
      STATE.queue.splice(qIdx, 1);
      renderAll();
    }

    function autoBalance5v5() {
      const pool = [];
      STATE.slots.forEach(s => { if (s && pool.length < 10) pool.push({ ign: s.ign, role: s.role }); });
      STATE.queue.forEach(q => { if (pool.length < 10) pool.push({ ign: q.ign, role: q.role }); });
      STATE.players.forEach(p => {
        if (pool.length < 10 && !pool.some(x => x.ign.toLowerCase() === p.ign.toLowerCase())) {
          pool.push({ ign: p.ign, role: p.primaryRole });
        }
      });
      const top10 = pool.slice(0, 10);
      STATE.liveMatch.teamBlue = top10.filter((_, i) => i % 2 === 0).map(p => ({
        ign: p.ign, selectedRole: p.role, assignedLane: p.role, winrateSnapshot: 65.0
      }));
      STATE.liveMatch.teamRed = top10.filter((_, i) => i % 2 === 1).map(p => ({
        ign: p.ign, selectedRole: p.role, assignedLane: p.role, winrateSnapshot: 65.0
      }));
      switchTab('match');
      showToast('Auto-Balanced 5v5 Match Room Ready!');
    }

    function finishMatch(winner) {
      const updatePlayer = (ign, won) => {
        let p = STATE.players.find(x => x.ign.toLowerCase() === ign.toLowerCase());
        if (!p) {
          p = {
            id: 'p-' + Date.now() + Math.random(),
            ign,
            squadTag: 'NGD',
            primaryRole: 'Flex Role',
            secondaryRole: 'Flex Role',
            wins: 0,
            losses: 0,
            mvpCount: 0,
            streak: 0,
            roleCounts: { 'EXP Lane': 0, 'Gold Lane': 0, 'Mid Lane': 0, 'Jungle': 0, 'Roamer': 0, 'Flex Role': 1 },
            recentForm: [],
            signatureHeroes: [],
            mythicStars: 50
          };
          STATE.players.push(p);
        }
        if (won) p.wins += 1;
        else p.losses += 1;
      };
      STATE.liveMatch.teamBlue.forEach(m => updatePlayer(m.ign, winner === 'Blue'));
      STATE.liveMatch.teamRed.forEach(m => updatePlayer(m.ign, winner === 'Red'));
      renderAll();
      switchTab('stats');
      showToast('Team ' + winner + ' victory recorded! Player winrates updated.');
    }

    function copyGcText() {
      const lines = ['⚔️ NGD OFFICIAL 20-SLOT SCRIM LIST ⚔️'];
      STATE.slots.forEach((s, i) => {
        const num = String(i + 1).padStart(2, '0');
        lines.push(s ? num + '. ' + s.ign + ' [' + s.role + ']' : num + '. -- OPEN --');
      });
      navigator.clipboard.writeText(lines.join('\\n'));
      showToast('Copied 20-Slot GC List to Clipboard!');
    }

    function renderAll() {
      // Queue
      document.getElementById('queue-count').textContent = STATE.queue.length + ' Queued';
      document.getElementById('queue-list').innerHTML = STATE.queue.map((q, idx) => \`
        <div class="flex items-center justify-between p-2.5 rounded-lg bg-[#0b0f19] border border-slate-800">
          <div>
            <div class="text-sm font-semibold text-white">\${q.ign}</div>
            <div class="text-xs text-[#00f2fe]">\${q.role}</div>
          </div>
          <div class="flex items-center gap-1.5">
            <button onclick="assignQueueToSlot(\${idx})" class="px-2.5 py-1 rounded bg-[#00f2fe]/15 text-[#00f2fe] text-xs font-medium">+ Slot</button>
            <button onclick="removeQueue(\${idx})" class="px-2 py-1 rounded bg-slate-800 text-slate-400 text-xs">×</button>
          </div>
        </div>
      \`).join('') || '<p class="text-xs text-slate-500 py-4 text-center">No players waiting in queue.</p>';

      // Slots
      const filled = STATE.slots.filter(Boolean).length;
      document.getElementById('slots-count').textContent = filled + '/20 Filled';
      document.getElementById('slots-grid').innerHTML = STATE.slots.map((s, idx) => {
        const num = String(idx + 1).padStart(2, '0');
        if (!s) {
          return \`<div class="flex items-center justify-between px-3 py-2 rounded-lg bg-[#0b0f19]/60 border border-slate-800/70 text-xs text-slate-500">
            <span class="font-mono-num">#\${num}</span>
            <span>-- OPEN SLOT --</span>
          </div>\`;
        }
        return \`<div class="flex items-center justify-between px-3 py-2 rounded-lg bg-[#0b0f19] border border-slate-800 text-xs">
          <div class="flex items-center gap-2.5">
            <span class="font-mono-num text-[#f1c40f] font-semibold">#\${num}</span>
            <span class="font-semibold text-white text-sm">\${s.ign}</span>
            <span class="text-slate-400">· \${s.role}</span>
          </div>
          <button onclick="removeSlot(\${idx})" class="text-slate-400 hover:text-rose-400 px-1.5">×</button>
        </div>\`;
      }).join('');

      // Live Match
      document.getElementById('team-blue-list').innerHTML = STATE.liveMatch.teamBlue.map(p => \`
        <div class="flex items-center justify-between p-3 rounded-lg bg-[#0b0f19] border border-slate-800">
          <span class="font-semibold text-white">\${p.ign}</span>
          <span class="text-xs text-[#00f2fe] font-mono-num">\${p.assignedLane}</span>
        </div>
      \`).join('');
      document.getElementById('team-red-list').innerHTML = STATE.liveMatch.teamRed.map(p => \`
        <div class="flex items-center justify-between p-3 rounded-lg bg-[#0b0f19] border border-slate-800">
          <span class="font-semibold text-white">\${p.ign}</span>
          <span class="text-xs text-rose-400 font-mono-num">\${p.assignedLane}</span>
        </div>
      \`).join('');

      // Leaderboard
      const sorted = [...STATE.players].sort((a, b) => b.wins - a.wins);
      document.getElementById('leaderboard-body').innerHTML = sorted.map((p, i) => {
        const total = p.wins + p.losses;
        const wr = total > 0 ? ((p.wins / total) * 100).toFixed(1) : '0.0';
        return \`<tr>
          <td class="py-3 px-3 font-mono-num text-[#f1c40f] font-bold">#\${i + 1}</td>
          <td class="py-3 px-3 font-semibold text-white">\${p.ign}</td>
          <td class="py-3 px-3 text-slate-300">\${p.primaryRole}</td>
          <td class="py-3 px-3 text-right font-mono-num">\${total}</td>
          <td class="py-3 px-3 text-right font-mono-num text-emerald-400">\${p.wins}</td>
          <td class="py-3 px-3 text-right font-mono-num text-rose-400">\${p.losses}</td>
          <td class="py-3 px-3 text-right font-mono-num font-bold text-[#00f2fe]">\${wr}%</td>
        </tr>\`;
      }).join('');
    }

    renderAll();
  </script>
</body>
</html>`;
}
