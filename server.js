var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server.ts
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

// src/lib/firebase-admin.ts
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// firebase-applet-config.json
var firebase_applet_config_default = {
  projectId: "elaborate-cosine-pvxch",
  appId: "1:554612101294:web:fde9784d4f20a869659d3f",
  apiKey: "AIzaSyAHI3oOQINbi5K9uYl8fvHULCAiD7-gh4s",
  authDomain: "elaborate-cosine-pvxch.firebaseapp.com",
  storageBucket: "elaborate-cosine-pvxch.firebasestorage.app",
  messagingSenderId: "554612101294",
  measurementId: "",
  oAuthClientId: "554612101294-39mm6ca91581djbqdmk6udn7onl948u7.apps.googleusercontent.com",
  recaptchaSiteKey: ""
};

// src/lib/firebase-admin.ts
if (!getApps().length) {
  initializeApp({
    projectId: firebase_applet_config_default.projectId
  });
}
var adminAuth = getAuth();

// src/middleware/auth.ts
var requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }
  const token = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Error verifying Firebase ID token:", error);
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};

// src/db/index.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// src/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  matchHistory: () => matchHistory,
  players: () => players,
  scrimMatches: () => scrimMatches,
  scrimSlots: () => scrimSlots,
  scrimSlotsRelations: () => scrimSlotsRelations,
  users: () => users,
  usersRelations: () => usersRelations
});
import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp
} from "drizzle-orm/pg-core";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  createdAt: timestamp("created_at").defaultNow()
});
var scrimSlots = pgTable("scrim_slots", {
  slotNumber: integer("slot_number").primaryKey(),
  ign: text("ign").notNull(),
  role: text("role").notNull(),
  secondaryRole: text("secondary_role"),
  roleLabel: text("role_label").notNull(),
  isReady: boolean("is_ready").notNull().default(true),
  assignedAt: text("assigned_at").notNull(),
  userUid: text("user_uid").references(() => users.uid),
  updatedAt: timestamp("updated_at").defaultNow()
});
var players = pgTable("players", {
  id: serial("id").primaryKey(),
  ign: text("ign").notNull().unique(),
  squadTag: text("squad_tag").notNull().default("NGD"),
  primaryRole: text("primary_role").notNull(),
  secondaryRole: text("secondary_role").notNull(),
  roleLabel: text("role_label").notNull(),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  mvpCount: integer("mvp_count").notNull().default(0),
  streak: integer("streak").notNull().default(0),
  roleCountsJson: text("role_counts_json").notNull().default("{}"),
  updatedAt: timestamp("updated_at").defaultNow()
});
var scrimMatches = pgTable("scrim_matches", {
  id: text("id").primaryKey(),
  matchId: text("match_id").notNull(),
  roomName: text("room_name").notNull(),
  startedAt: text("started_at").notNull(),
  teamBlueJson: text("team_blue_json").notNull(),
  teamRedJson: text("team_red_json").notNull(),
  mvpIgn: text("mvp_ign").notNull(),
  shuffleNote: text("shuffle_note"),
  updatedAt: timestamp("updated_at").defaultNow()
});
var matchHistory = pgTable("match_history", {
  id: serial("id").primaryKey(),
  matchCode: text("match_code").notNull(),
  roomName: text("room_name").notNull(),
  completedAt: text("completed_at").notNull(),
  winner: text("winner").notNull(),
  mvpIgn: text("mvp_ign").notNull(),
  teamBlueJson: text("team_blue_json").notNull(),
  teamRedJson: text("team_red_json").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var usersRelations = relations(users, ({ many }) => ({
  slots: many(scrimSlots)
}));
var scrimSlotsRelations = relations(scrimSlots, ({ one }) => ({
  user: one(users, {
    fields: [scrimSlots.userUid],
    references: [users.uid]
  })
}));

// src/db/index.ts
var createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      connectionTimeoutMillis: 15e3
    });
    global._postgresPool.on("error", (err) => {
      console.error("Unexpected error on idle SQL pool client:", err);
    });
  }
  return global._postgresPool;
};
var pool = createPool();
var db = drizzle(pool, { schema: schema_exports });

// src/db/users.ts
async function getOrCreateUser(uid, email, displayName) {
  try {
    const result = await db.insert(users).values({
      uid,
      email,
      displayName: displayName || null
    }).onConflictDoUpdate({
      target: users.uid,
      set: {
        email,
        displayName: displayName || null
      }
    }).returning();
    return result[0];
  } catch (error) {
    console.error("Database query failed in getOrCreateUser:", error);
    throw new Error("Failed to synchronize user profile.", { cause: error });
  }
}

// src/db/scrimRepository.ts
import { asc, desc, notInArray } from "drizzle-orm";

// src/data/ngdData.ts
var INITIAL_PLAYERS = [
  {
    id: "p-estranghero",
    ign: "Estranghero",
    squadTag: "NGD",
    primaryRole: "Jungle",
    secondaryRole: "Roamer",
    roleLabel: "Jungler/Roam",
    wins: 46,
    losses: 18,
    mvpCount: 17,
    streak: 4,
    roleCounts: {
      Jungle: 42,
      Roamer: 16,
      "EXP Lane": 4,
      "Mid Lane": 1,
      "Gold Lane": 0,
      "Flex Role": 1
    },
    recentForm: ["W", "W", "L", "W", "W"],
    signatureHeroes: ["Ling", "Hayabusa", "Khufra"],
    mythicStars: 138
  },
  {
    id: "p-akira",
    ign: "Akira",
    squadTag: "NGD",
    primaryRole: "Mid Lane",
    secondaryRole: "Gold Lane",
    roleLabel: "Mid/Gold",
    wins: 41,
    losses: 19,
    mvpCount: 14,
    streak: 3,
    roleCounts: {
      "Mid Lane": 36,
      "Gold Lane": 19,
      "Flex Role": 3,
      Roamer: 2,
      Jungle: 0,
      "EXP Lane": 0
    },
    recentForm: ["L", "W", "W", "W", "W"],
    signatureHeroes: ["Valentina", "Claude", "Kagura"],
    mythicStars: 126
  },
  {
    id: "p-takeshi",
    ign: "Takeshi",
    squadTag: "NGD",
    primaryRole: "EXP Lane",
    secondaryRole: "Gold Lane",
    roleLabel: "Exp/Gold",
    wins: 39,
    losses: 20,
    mvpCount: 11,
    streak: 2,
    roleCounts: {
      "EXP Lane": 35,
      "Gold Lane": 18,
      Jungle: 3,
      "Flex Role": 3,
      "Mid Lane": 0,
      Roamer: 0
    },
    recentForm: ["W", "L", "W", "W", "W"],
    signatureHeroes: ["Yu Zhong", "Terizla", "Karrie"],
    mythicStars: 118
  },
  {
    id: "p-sion",
    ign: "Sion",
    squadTag: "NGD",
    primaryRole: "EXP Lane",
    secondaryRole: "EXP Lane",
    roleLabel: "Exp",
    wins: 37,
    losses: 19,
    mvpCount: 9,
    streak: 1,
    roleCounts: {
      "EXP Lane": 48,
      Roamer: 5,
      Jungle: 2,
      "Flex Role": 1,
      "Mid Lane": 0,
      "Gold Lane": 0
    },
    recentForm: ["W", "W", "L", "L", "W"],
    signatureHeroes: ["Arlott", "Lapu-Lapu", "Paquito"],
    mythicStars: 114
  },
  {
    id: "p-miamor",
    ign: "mi amor",
    squadTag: "NGD",
    primaryRole: "Flex Role",
    secondaryRole: "Gold Lane",
    roleLabel: "Multi",
    wins: 44,
    losses: 17,
    mvpCount: 15,
    streak: 5,
    roleCounts: {
      "Flex Role": 24,
      "Gold Lane": 14,
      "Mid Lane": 10,
      Jungle: 6,
      Roamer: 4,
      "EXP Lane": 3
    },
    recentForm: ["W", "W", "W", "W", "W"],
    signatureHeroes: ["Beatrix", "Faramis", "Joy"],
    mythicStars: 141
  },
  {
    id: "p-kingaha",
    ign: "king aha",
    squadTag: "NGD",
    primaryRole: "Roamer",
    secondaryRole: "EXP Lane",
    roleLabel: "Roam",
    wins: 36,
    losses: 18,
    mvpCount: 8,
    streak: 2,
    roleCounts: {
      Roamer: 45,
      "EXP Lane": 6,
      "Mid Lane": 2,
      "Flex Role": 1,
      Jungle: 0,
      "Gold Lane": 0
    },
    recentForm: ["L", "W", "L", "W", "W"],
    signatureHeroes: ["Tigreal", "Minotaur", "Chou"],
    mythicStars: 110
  },
  {
    id: "p-aviona",
    ign: "aviona",
    squadTag: "NGD",
    primaryRole: "Mid Lane",
    secondaryRole: "Gold Lane",
    roleLabel: "Mid/Gold",
    wins: 38,
    losses: 18,
    mvpCount: 12,
    streak: 3,
    roleCounts: {
      "Mid Lane": 31,
      "Gold Lane": 21,
      Roamer: 2,
      "Flex Role": 2,
      Jungle: 0,
      "EXP Lane": 0
    },
    recentForm: ["W", "L", "W", "W", "W"],
    signatureHeroes: ["Lunox", "Wanwan", "Novaria"],
    mythicStars: 122
  },
  {
    id: "p-favian",
    ign: "Favian",
    squadTag: "NGD",
    primaryRole: "Mid Lane",
    secondaryRole: "EXP Lane",
    roleLabel: "Mid",
    wins: 43,
    losses: 17,
    mvpCount: 16,
    streak: 4,
    roleCounts: {
      "Mid Lane": 42,
      "EXP Lane": 12,
      Jungle: 4,
      "Flex Role": 2,
      "Gold Lane": 0,
      Roamer: 0
    },
    recentForm: ["W", "W", "W", "L", "W"],
    signatureHeroes: ["Yve", "Pharsa", "Xavier"],
    mythicStars: 132
  },
  {
    id: "p-joshy",
    ign: "joshy",
    squadTag: "NGD",
    primaryRole: "Jungle",
    secondaryRole: "Roamer",
    roleLabel: "Jungler/Roam",
    wins: 49,
    losses: 15,
    mvpCount: 21,
    streak: 6,
    roleCounts: {
      Jungle: 45,
      Roamer: 14,
      "EXP Lane": 3,
      "Gold Lane": 1,
      "Mid Lane": 0,
      "Flex Role": 1
    },
    recentForm: ["W", "W", "W", "W", "W"],
    signatureHeroes: ["Fanny", "Nolan", "Lancelot"],
    mythicStars: 148
  },
  {
    id: "p-whis",
    ign: "whis",
    squadTag: "NGD",
    primaryRole: "Gold Lane",
    secondaryRole: "Roamer",
    roleLabel: "Gold/Roam",
    wins: 40,
    losses: 18,
    mvpCount: 13,
    streak: 2,
    roleCounts: {
      "Gold Lane": 36,
      Roamer: 17,
      "Mid Lane": 3,
      "Flex Role": 2,
      Jungle: 0,
      "EXP Lane": 0
    },
    recentForm: ["L", "W", "W", "L", "W"],
    signatureHeroes: ["Harith", "Moskov", "Mathilda"],
    mythicStars: 125
  },
  {
    id: "p-setsuko",
    ign: "Setsuko",
    squadTag: "NGD",
    primaryRole: "Gold Lane",
    secondaryRole: "Mid Lane",
    roleLabel: "Gold/Mid",
    wins: 35,
    losses: 17,
    mvpCount: 11,
    streak: 1,
    roleCounts: {
      "Gold Lane": 34,
      "Mid Lane": 12,
      "Flex Role": 6,
      Jungle: 0,
      "EXP Lane": 0,
      Roamer: 0
    },
    recentForm: ["W", "L", "W", "L", "W"],
    signatureHeroes: ["Clint", "Brody", "Cecilion"],
    mythicStars: 116
  },
  {
    id: "p-sintopia",
    ign: "Sintopia",
    squadTag: "NGD",
    primaryRole: "Roamer",
    secondaryRole: "EXP Lane",
    roleLabel: "Roam/Exp",
    wins: 34,
    losses: 16,
    mvpCount: 8,
    streak: 2,
    roleCounts: {
      Roamer: 35,
      "EXP Lane": 11,
      "Flex Role": 4,
      Jungle: 0,
      "Mid Lane": 0,
      "Gold Lane": 0
    },
    recentForm: ["L", "W", "W", "W", "W"],
    signatureHeroes: ["Atlas", "Edith", "gatotkaca"],
    mythicStars: 112
  }
];
var INITIAL_SLOTS = Array.from(
  { length: 20 },
  (_, idx) => {
    const num = idx + 1;
    const warmupPreset = {
      1: {
        ign: "Estranghero",
        role: "Jungle",
        secondaryRole: "Roamer",
        roleLabel: "Jungler/Roam",
        assignedAt: "20:01"
      },
      2: {
        ign: "Akira",
        role: "Mid Lane",
        secondaryRole: "Gold Lane",
        roleLabel: "Mid/Gold",
        assignedAt: "20:02"
      },
      3: {
        ign: "Takeshi",
        role: "EXP Lane",
        secondaryRole: "Gold Lane",
        roleLabel: "Exp/Gold",
        assignedAt: "20:03"
      },
      4: {
        ign: "Sion",
        role: "EXP Lane",
        secondaryRole: "EXP Lane",
        roleLabel: "Exp",
        assignedAt: "20:04"
      },
      5: {
        ign: "mi amor",
        role: "Flex Role",
        secondaryRole: "Gold Lane",
        roleLabel: "Multi",
        assignedAt: "20:05"
      },
      6: {
        ign: "king aha",
        role: "Roamer",
        secondaryRole: "EXP Lane",
        roleLabel: "Roam",
        assignedAt: "20:06"
      },
      7: {
        ign: "aviona",
        role: "Mid Lane",
        secondaryRole: "Gold Lane",
        roleLabel: "Mid/Gold",
        assignedAt: "20:07"
      },
      8: {
        ign: "Favian",
        role: "Mid Lane",
        secondaryRole: "EXP Lane",
        roleLabel: "Mid",
        assignedAt: "20:08"
      },
      9: {
        ign: "joshy",
        role: "Jungle",
        secondaryRole: "Roamer",
        roleLabel: "Jungler/Roam",
        assignedAt: "20:09"
      },
      10: {
        ign: "whis",
        role: "Gold Lane",
        secondaryRole: "Roamer",
        roleLabel: "Gold/Roam",
        assignedAt: "20:10"
      },
      11: {
        ign: "Setsuko",
        role: "Gold Lane",
        secondaryRole: "Mid Lane",
        roleLabel: "Gold/Mid",
        assignedAt: "20:14"
      },
      12: {
        ign: "Sintopia",
        role: "Roamer",
        secondaryRole: "EXP Lane",
        roleLabel: "Roam/Exp",
        assignedAt: "20:15"
      }
    };
    const item = warmupPreset[num];
    if (item) {
      return {
        slotNumber: num,
        ign: item.ign,
        role: item.role,
        secondaryRole: item.secondaryRole,
        roleLabel: item.roleLabel,
        isReady: true,
        assignedAt: item.assignedAt
      };
    }
    return null;
  }
);
var INITIAL_LIVE_MATCH = {
  matchId: "NGD-WARMUP-01",
  roomName: "Scrim Warmup \xB7 Friendly 5v5 Custom Draft",
  hostIgn: "joshy",
  seriesFormat: "BO3",
  startedAt: "20:25",
  mvpIgn: "joshy",
  shuffleNote: "Balanced 5v5 from Slots 1\u201310 \xB7 Multi-role resolved (Blue 69.8% WR vs Red 69.5% WR)",
  teamBlue: [
    {
      ign: "Estranghero",
      selectedRole: "Jungle",
      secondaryRole: "Roamer",
      roleLabel: "Jungler/Roam",
      assignedLane: "Jungle",
      winrateSnapshot: 71.9
    },
    {
      ign: "Takeshi",
      selectedRole: "EXP Lane",
      secondaryRole: "Gold Lane",
      roleLabel: "Exp/Gold",
      assignedLane: "EXP Lane",
      winrateSnapshot: 66.1
    },
    {
      ign: "Favian",
      selectedRole: "Mid Lane",
      secondaryRole: "EXP Lane",
      roleLabel: "Mid",
      assignedLane: "Mid Lane",
      winrateSnapshot: 71.7
    },
    {
      ign: "Akira",
      selectedRole: "Mid Lane",
      secondaryRole: "Gold Lane",
      roleLabel: "Mid/Gold",
      assignedLane: "Gold Lane",
      winrateSnapshot: 68.3
    },
    {
      ign: "king aha",
      selectedRole: "Roamer",
      secondaryRole: "EXP Lane",
      roleLabel: "Roam",
      assignedLane: "Roamer",
      winrateSnapshot: 66.7
    }
  ],
  teamRed: [
    {
      ign: "joshy",
      selectedRole: "Jungle",
      secondaryRole: "Roamer",
      roleLabel: "Jungler/Roam",
      assignedLane: "Jungle",
      winrateSnapshot: 76.6
    },
    {
      ign: "Sion",
      selectedRole: "EXP Lane",
      secondaryRole: "EXP Lane",
      roleLabel: "Exp",
      assignedLane: "EXP Lane",
      winrateSnapshot: 66.1
    },
    {
      ign: "aviona",
      selectedRole: "Mid Lane",
      secondaryRole: "Gold Lane",
      roleLabel: "Mid/Gold",
      assignedLane: "Mid Lane",
      winrateSnapshot: 67.9
    },
    {
      ign: "mi amor",
      selectedRole: "Flex Role",
      secondaryRole: "Gold Lane",
      roleLabel: "Multi",
      assignedLane: "Gold Lane",
      winrateSnapshot: 72.1
    },
    {
      ign: "whis",
      selectedRole: "Gold Lane",
      secondaryRole: "Roamer",
      roleLabel: "Gold/Roam",
      assignedLane: "Roamer",
      winrateSnapshot: 69
    }
  ]
};
var INITIAL_MATCH_HISTORY = [
  {
    id: "NGD-WARMUP-01",
    roomName: "Scrim Warmup \xB7 Game 1",
    completedAt: "Tonight \xB7 20:00",
    winner: "Blue",
    mvpIgn: "joshy",
    svpIgn: "aviona",
    feederIgn: "mi amor",
    killScore: "Blue 24 - 18 Red",
    blueKills: 24,
    redKills: 18,
    seriesGameNumber: 1,
    seriesScore: "1 - 0 (BO3)",
    durationText: "17m 24s",
    teamBlue: [
      {
        ign: "joshy",
        selectedRole: "Jungle",
        roleLabel: "Jungler/Roam",
        assignedLane: "Jungle",
        winrateSnapshot: 76.2,
        kda: "9/1/8",
        rating: "11.8",
        medal: "MVP",
        heroDamage: 112450,
        heroDamagePct: 34,
        damageTaken: 45200,
        damageTakenPct: 18,
        turretDamage: 6800,
        turretDamagePct: 42,
        teamfightPct: 71,
        gold: 13200
      },
      {
        ign: "Takeshi",
        selectedRole: "EXP Lane",
        roleLabel: "Exp/Gold",
        assignedLane: "EXP Lane",
        winrateSnapshot: 65.5,
        kda: "4/2/9",
        rating: "9.4",
        medal: "Gold",
        heroDamage: 68300,
        heroDamagePct: 21,
        damageTaken: 89600,
        damageTakenPct: 35,
        turretDamage: 4200,
        turretDamagePct: 26,
        teamfightPct: 62,
        gold: 11800
      },
      {
        ign: "Akira",
        selectedRole: "Mid Lane",
        roleLabel: "Mid/Gold",
        assignedLane: "Mid Lane",
        winrateSnapshot: 67.8,
        kda: "6/3/11",
        rating: "10.2",
        medal: "Gold",
        heroDamage: 94800,
        heroDamagePct: 29,
        damageTaken: 36400,
        damageTakenPct: 14,
        turretDamage: 2100,
        turretDamagePct: 13,
        teamfightPct: 74,
        gold: 12100
      },
      {
        ign: "whis",
        selectedRole: "Gold Lane",
        roleLabel: "Gold/Roam",
        assignedLane: "Gold Lane",
        winrateSnapshot: 68.4,
        kda: "4/4/6",
        rating: "7.8",
        medal: "Silver",
        heroDamage: 42100,
        heroDamagePct: 13,
        damageTaken: 31200,
        damageTakenPct: 12,
        turretDamage: 2800,
        turretDamagePct: 17,
        teamfightPct: 45,
        gold: 10900
      },
      {
        ign: "king aha",
        selectedRole: "Roamer",
        roleLabel: "Roam",
        assignedLane: "Roamer",
        winrateSnapshot: 66,
        kda: "1/8/16",
        rating: "8.1",
        medal: "Silver",
        heroDamage: 11200,
        heroDamagePct: 3,
        damageTaken: 54100,
        damageTakenPct: 21,
        turretDamage: 300,
        turretDamagePct: 2,
        teamfightPct: 78,
        gold: 8400
      }
    ],
    teamRed: [
      {
        ign: "aviona",
        selectedRole: "Mid Lane",
        roleLabel: "Mid/Gold",
        assignedLane: "Mid Lane",
        winrateSnapshot: 68.5,
        kda: "7/3/6",
        rating: "10.6",
        medal: "SVP",
        heroDamage: 104200,
        heroDamagePct: 38,
        damageTaken: 38900,
        damageTakenPct: 15,
        turretDamage: 1400,
        turretDamagePct: 15,
        teamfightPct: 76,
        gold: 12400
      },
      {
        ign: "Estranghero",
        selectedRole: "Jungle",
        roleLabel: "Jungler/Roam",
        assignedLane: "Jungle",
        winrateSnapshot: 72.5,
        kda: "5/4/5",
        rating: "8.4",
        medal: "Gold",
        heroDamage: 72100,
        heroDamagePct: 26,
        damageTaken: 49200,
        damageTakenPct: 19,
        turretDamage: 3800,
        turretDamagePct: 40,
        teamfightPct: 56,
        gold: 11600
      },
      {
        ign: "Sion",
        selectedRole: "EXP Lane",
        roleLabel: "Exp",
        assignedLane: "EXP Lane",
        winrateSnapshot: 66.7,
        kda: "3/4/4",
        rating: "6.9",
        medal: "Silver",
        heroDamage: 45600,
        heroDamagePct: 17,
        damageTaken: 92300,
        damageTakenPct: 36,
        turretDamage: 3100,
        turretDamagePct: 33,
        teamfightPct: 44,
        gold: 10200
      },
      {
        ign: "Favian",
        selectedRole: "Mid Lane",
        roleLabel: "Mid",
        assignedLane: "Gold Lane",
        winrateSnapshot: 72.4,
        kda: "2/5/5",
        rating: "5.8",
        medal: "Silver",
        heroDamage: 38400,
        heroDamagePct: 14,
        damageTaken: 32100,
        damageTakenPct: 12,
        turretDamage: 900,
        turretDamagePct: 10,
        teamfightPct: 41,
        gold: 9800
      },
      {
        ign: "mi amor",
        selectedRole: "Flex Role",
        roleLabel: "Multi",
        assignedLane: "Roamer",
        winrateSnapshot: 72.9,
        kda: "1/8/8",
        rating: "4.6",
        medal: "Bronze",
        isFeeder: true,
        heroDamage: 14200,
        heroDamagePct: 5,
        damageTaken: 46200,
        damageTakenPct: 18,
        turretDamage: 200,
        turretDamagePct: 2,
        teamfightPct: 52,
        gold: 7900
      }
    ]
  }
];

// src/db/scrimRepository.ts
var hasCheckedInitialSeed = false;
async function ensureInitialSeedData() {
  if (hasCheckedInitialSeed) return;
  hasCheckedInitialSeed = true;
  try {
    const existingPlayers = await db.select().from(players).limit(1);
    if (existingPlayers.length > 0) {
      return;
    }
    for (const p of INITIAL_PLAYERS) {
      await db.insert(players).values({
        ign: p.ign,
        squadTag: p.squadTag,
        primaryRole: p.primaryRole,
        secondaryRole: p.secondaryRole,
        roleLabel: p.roleLabel,
        wins: p.wins,
        losses: p.losses,
        mvpCount: p.mvpCount,
        streak: p.streak,
        roleCountsJson: JSON.stringify(p.roleCounts)
      }).onConflictDoNothing();
    }
    for (const s of INITIAL_SLOTS) {
      if (s) {
        await db.insert(scrimSlots).values({
          slotNumber: s.slotNumber,
          ign: s.ign,
          role: s.role,
          secondaryRole: s.secondaryRole || null,
          roleLabel: s.roleLabel,
          isReady: s.isReady,
          assignedAt: s.assignedAt,
          userUid: null
        }).onConflictDoNothing();
      }
    }
    await db.insert(scrimMatches).values({
      id: "active",
      matchId: INITIAL_LIVE_MATCH.matchId,
      roomName: INITIAL_LIVE_MATCH.roomName,
      startedAt: INITIAL_LIVE_MATCH.startedAt,
      teamBlueJson: JSON.stringify(INITIAL_LIVE_MATCH.teamBlue),
      teamRedJson: JSON.stringify(INITIAL_LIVE_MATCH.teamRed),
      mvpIgn: INITIAL_LIVE_MATCH.mvpIgn,
      shuffleNote: INITIAL_LIVE_MATCH.shuffleNote || null
    }).onConflictDoNothing();
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
          teamRedJson: JSON.stringify(h.teamRed)
        });
      }
    }
  } catch (error) {
    console.error("Database seed failed:", error);
    throw new Error("Failed to initialize scrim database.", { cause: error });
  }
}
async function getFullScrimState() {
  try {
    await ensureInitialSeedData();
    const dbPlayers = await db.select().from(players).orderBy(asc(players.id));
    const dbSlots = await db.select().from(scrimSlots).orderBy(asc(scrimSlots.slotNumber));
    const dbMatches = await db.select().from(scrimMatches);
    const dbHistory = await db.select().from(matchHistory).orderBy(desc(matchHistory.id)).limit(25);
    const mappedPlayers = dbPlayers.map((row) => {
      let parsedCounts = {
        Jungle: 0,
        "EXP Lane": 0,
        "Mid Lane": 0,
        "Gold Lane": 0,
        Roamer: 0,
        "Flex Role": 0
      };
      try {
        parsedCounts = JSON.parse(row.roleCountsJson);
      } catch {
      }
      return {
        id: String(row.id),
        ign: row.ign,
        squadTag: row.squadTag,
        primaryRole: row.primaryRole,
        secondaryRole: row.secondaryRole,
        roleLabel: row.roleLabel,
        wins: row.wins,
        losses: row.losses,
        mvpCount: row.mvpCount,
        streak: row.streak,
        roleCounts: parsedCounts,
        recentForm: [],
        signatureHeroes: [],
        mythicStars: 50
      };
    });
    const mappedSlots = Array.from(
      { length: 20 },
      (_, idx) => {
        const found = dbSlots.find((s) => s.slotNumber === idx + 1);
        if (!found) return null;
        return {
          slotNumber: found.slotNumber,
          ign: found.ign,
          role: found.role,
          secondaryRole: found.secondaryRole || void 0,
          roleLabel: found.roleLabel,
          isReady: found.isReady,
          assignedAt: found.assignedAt
        };
      }
    );
    const activeRow = dbMatches.find((m) => m.id === "active");
    const mappedLiveMatch = activeRow ? {
      matchId: activeRow.matchId,
      roomName: activeRow.roomName,
      hostIgn: INITIAL_LIVE_MATCH.hostIgn,
      seriesFormat: INITIAL_LIVE_MATCH.seriesFormat,
      startedAt: activeRow.startedAt,
      teamBlue: JSON.parse(activeRow.teamBlueJson),
      teamRed: JSON.parse(activeRow.teamRedJson),
      mvpIgn: activeRow.mvpIgn,
      shuffleNote: activeRow.shuffleNote || void 0
    } : INITIAL_LIVE_MATCH;
    const mappedHistory = dbHistory.map((h) => ({
      id: h.matchCode,
      roomName: h.roomName,
      completedAt: h.completedAt,
      winner: h.winner === "Red" ? "Red" : "Blue",
      mvpIgn: h.mvpIgn,
      teamBlue: JSON.parse(h.teamBlueJson),
      teamRed: JSON.parse(h.teamRedJson),
      durationText: "Finished"
    }));
    return {
      players: mappedPlayers,
      slots: mappedSlots,
      liveMatch: mappedLiveMatch,
      matchHistory: mappedHistory
    };
  } catch (error) {
    console.error("Database query failed in getFullScrimState:", error);
    throw new Error("Failed to load scrim state from database.", {
      cause: error
    });
  }
}
async function saveFullScrimState(payload, userUid) {
  try {
    if (payload.players.length === 0) {
      await db.delete(players);
    } else {
      const activeIgns = payload.players.map((p) => p.ign);
      await db.delete(players).where(notInArray(players.ign, activeIgns));
    }
    for (const p of payload.players) {
      await db.insert(players).values({
        ign: p.ign,
        squadTag: p.squadTag || "NGD",
        primaryRole: p.primaryRole,
        secondaryRole: p.secondaryRole,
        roleLabel: p.roleLabel,
        wins: p.wins,
        losses: p.losses,
        mvpCount: p.mvpCount || 0,
        streak: p.streak || 0,
        roleCountsJson: JSON.stringify(p.roleCounts || {}),
        updatedAt: /* @__PURE__ */ new Date()
      }).onConflictDoUpdate({
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
          updatedAt: /* @__PURE__ */ new Date()
        }
      });
    }
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
          updatedAt: /* @__PURE__ */ new Date()
        });
      }
    }
    await db.insert(scrimMatches).values({
      id: "active",
      matchId: payload.liveMatch.matchId,
      roomName: payload.liveMatch.roomName,
      startedAt: payload.liveMatch.startedAt,
      teamBlueJson: JSON.stringify(payload.liveMatch.teamBlue),
      teamRedJson: JSON.stringify(payload.liveMatch.teamRed),
      mvpIgn: payload.liveMatch.mvpIgn,
      shuffleNote: payload.liveMatch.shuffleNote || null,
      updatedAt: /* @__PURE__ */ new Date()
    }).onConflictDoUpdate({
      target: scrimMatches.id,
      set: {
        matchId: payload.liveMatch.matchId,
        roomName: payload.liveMatch.roomName,
        startedAt: payload.liveMatch.startedAt,
        teamBlueJson: JSON.stringify(payload.liveMatch.teamBlue),
        teamRedJson: JSON.stringify(payload.liveMatch.teamRed),
        mvpIgn: payload.liveMatch.mvpIgn,
        shuffleNote: payload.liveMatch.shuffleNote || null,
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
    if (payload.newHistoryRecord) {
      await db.insert(matchHistory).values({
        matchCode: payload.newHistoryRecord.id,
        roomName: payload.newHistoryRecord.roomName,
        completedAt: payload.newHistoryRecord.completedAt,
        winner: payload.newHistoryRecord.winner,
        mvpIgn: payload.newHistoryRecord.mvpIgn,
        teamBlueJson: JSON.stringify(payload.newHistoryRecord.teamBlue),
        teamRedJson: JSON.stringify(payload.newHistoryRecord.teamRed)
      });
    }
    return { ok: true };
  } catch (error) {
    console.error("Database save failed in saveFullScrimState:", error);
    throw new Error("Failed to save scrim state to database.", {
      cause: error
    });
  }
}

// src/server/screenshotAnalyzer.ts
import { GoogleGenAI, Type } from "@google/genai";
var RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    winner: {
      type: Type.STRING,
      description: "Winning team: 'Blue' (left side) or 'Red' (right side). Look at VICTORY/DEFEAT banner or winning gold MVP badge."
    },
    blueKills: {
      type: Type.INTEGER,
      description: "Total kills for Team Blue (left score, e.g. 22). If only Data tab is uploaded, extract or estimate 0."
    },
    redKills: {
      type: Type.INTEGER,
      description: "Total kills for Team Red (right score, e.g. 21). If only Data tab is uploaded, extract or estimate 0."
    },
    duration: {
      type: Type.STRING,
      description: "Match duration in MM:SS format (e.g. 17:44 or 15:03). Empty string if not visible."
    },
    mvpIgn: {
      type: Type.STRING,
      description: "IGN of the winning team MVP (or highest performance player)."
    },
    mvpKda: {
      type: Type.STRING,
      description: "KDA or stats of winning MVP (e.g. 3/2/14 \xB7 10.5 or 37% DMG)."
    },
    svpIgn: {
      type: Type.STRING,
      description: "IGN of the losing team Defeat MVP / SVP."
    },
    svpKda: {
      type: Type.STRING,
      description: "KDA or stats of losing SVP."
    },
    feederIgn: {
      type: Type.STRING,
      description: "IGN of the match feeder / lowest performer / bronze medal player with most deaths or lowest rating."
    },
    teamBlue: {
      type: Type.ARRAY,
      description: "5 players of Team Blue (left column, top to bottom)",
      items: {
        type: Type.OBJECT,
        properties: {
          ign: { type: Type.STRING },
          kda: { type: Type.STRING },
          rating: { type: Type.STRING },
          isMvp: { type: Type.BOOLEAN },
          heroDamage: { type: Type.INTEGER, description: "Hero Damage dealt (e.g. 98450)" },
          heroDamagePct: { type: Type.INTEGER, description: "Hero Damage percentage (e.g. 34 for 34%)" },
          damageTaken: { type: Type.INTEGER, description: "Damage Taken (e.g. 82100)" },
          damageTakenPct: { type: Type.INTEGER, description: "Damage Taken percentage (e.g. 31 for 31%)" },
          turretDamage: { type: Type.INTEGER, description: "Turret/Push Damage (e.g. 5400)" },
          turretDamagePct: { type: Type.INTEGER, description: "Turret Damage percentage (e.g. 42 for 42%)" },
          teamfightPct: { type: Type.INTEGER, description: "Teamfight participation rate (e.g. 72 for 72%)" },
          gold: { type: Type.INTEGER, description: "Total Gold / Net worth" },
          medal: { type: Type.STRING, description: "MVP, SVP, Gold, Silver, or Bronze" },
          isFeeder: { type: Type.BOOLEAN, description: "True for the player with lowest score or highest deaths" }
        },
        required: ["ign"]
      }
    },
    teamRed: {
      type: Type.ARRAY,
      description: "5 players of Team Red (right column, top to bottom)",
      items: {
        type: Type.OBJECT,
        properties: {
          ign: { type: Type.STRING },
          kda: { type: Type.STRING },
          rating: { type: Type.STRING },
          isMvp: { type: Type.BOOLEAN },
          heroDamage: { type: Type.INTEGER, description: "Hero Damage dealt (e.g. 98450)" },
          heroDamagePct: { type: Type.INTEGER, description: "Hero Damage percentage (e.g. 34 for 34%)" },
          damageTaken: { type: Type.INTEGER, description: "Damage Taken (e.g. 82100)" },
          damageTakenPct: { type: Type.INTEGER, description: "Damage Taken percentage (e.g. 31 for 31%)" },
          turretDamage: { type: Type.INTEGER, description: "Turret/Push Damage (e.g. 5400)" },
          turretDamagePct: { type: Type.INTEGER, description: "Turret Damage percentage (e.g. 42 for 42%)" },
          teamfightPct: { type: Type.INTEGER, description: "Teamfight participation rate (e.g. 72 for 72%)" },
          gold: { type: Type.INTEGER, description: "Total Gold / Net worth" },
          medal: { type: Type.STRING, description: "MVP, SVP, Gold, Silver, or Bronze" },
          isFeeder: { type: Type.BOOLEAN, description: "True for the player with lowest score or highest deaths" }
        },
        required: ["ign"]
      }
    }
  },
  required: [
    "winner",
    "teamBlue",
    "teamRed"
  ]
};
async function analyzeMlbbScreenshot(params) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
  if (!apiKey) {
    throw new Error(
      "Missing GEMINI_API_KEY on server. Make sure GEMINI_API_KEY is configured in your Vercel Environment Variables."
    );
  }
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
  const rawImageInputs = Array.isArray(params.images) && params.images.length > 0 ? params.images : params.imageBase64 ? [{ imageBase64: params.imageBase64, mimeType: params.mimeType }] : [];
  if (rawImageInputs.length === 0) {
    throw new Error("No screenshot image data provided.");
  }
  const imageParts = rawImageInputs.slice(0, 4).map((img) => ({
    inlineData: {
      mimeType: img.mimeType || "image/jpeg",
      data: img.imageBase64.replace(
        /^data:image\/[a-zA-Z0-9+.-]+;base64,/,
        ""
      )
    }
  }));
  const knownRosterHint = params.knownIgns && params.knownIgns.length > 0 ? `
Known NGD Squad & Scrim player IGNs (ONLY use one of these if a player name in the screenshot actually matches it; otherwise keep the exact IGN shown in the screenshot, stripping gender symbols like \u2642/\u2640): ${params.knownIgns.join(", ")}` : "";
  const promptText = `Analyze the provided Mobile Legends: Bang Bang (MLBB) post-match Battle Result screenshot(s).
The screenshots can be:
- The DATA screen (columns: Hero Avatar/IGN, Hero Damage + %, Damage Taken + %, Turret Damage/Push + %, Teamfight Rate %, Gold/Net Worth).
- The SCOREBOARD/EQUIPMENT screen (columns: Hero Avatar/IGN, KDA e.g. 12/2/8, Medal Rating e.g. 10.5, Gold, Items).
- Or both uploaded together.

Instructions:
1. Team Blue is on the left side (5 players, ordered top-to-bottom).
2. Team Red is on the right side (5 players, ordered top-to-bottom).
3. Winner: Look at the top banner (VICTORY on left = Blue won; VICTORY on right / DEFEAT on left = Red won) or the gold winning MVP crown badge vs losing Defeat MVP (SVP) badge. Winner must be 'Blue' or 'Red'.
4. Score & Duration:
   - Blue kills & Red kills (big team score numbers at the top). If only the Data screen is uploaded without kills, estimate or default to 0.
   - Duration (MM:SS, e.g. "17:44" or "15:03" usually at the top right).
5. For each player on Team Blue and Team Red (in exact top-to-bottom order):
   - ign: Player's exact in-game name (strip gender icons \u2642/\u2640 and decorative bracket artifacts).
   - kda: "K/D/A" string (e.g. "12/2/2", "1/7/4"). If on Data screen without KDA, format as "34% DMG \xB7 65% TF".
   - rating: Medal rating number (e.g. "10.8", "7.4", "3.2").
   - medal: "MVP", "SVP", "Gold", "Silver", or "Bronze" based on the medal emblem.
   - heroDamage: Raw hero damage dealt number if visible (e.g. 104231).
   - heroDamagePct: Percentage of team damage (e.g. 37 for 37%).
   - damageTaken: Raw damage taken number if visible (e.g. 89450).
   - damageTakenPct: Percentage of team damage taken (e.g. 31 for 31%).
   - turretDamage: Raw turret push damage number if visible (e.g. 5600).
   - turretDamagePct: Percentage of turret damage (e.g. 45 for 45%).
   - teamfightPct: Teamfight participation rate (e.g. 74 for 74%).
   - gold: Total gold if visible.
   - isMvp: true ONLY for the 1 best player on Team Blue and the 1 best player on Team Red.
   - isFeeder: true for the player with lowest score, bronze medal, or most deaths.
6. Identify mvpIgn (winning team's MVP), svpIgn (losing team's Defeat MVP), and feederIgn (player with bronze medal / lowest score / feeder in the match).${knownRosterHint}`;
  const contents = {
    parts: [
      ...imageParts,
      {
        text: promptText
      }
    ]
  };
  const candidateModels = [
    "gemini-flash-latest",
    "gemini-3.8-flash",
    "gemini-3.1-flash-lite"
  ];
  let rawText;
  let lastError = null;
  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA
        }
      });
      if (response.text && response.text.trim()) {
        rawText = response.text;
        break;
      }
    } catch (err) {
      lastError = err;
      try {
        const fallbackRes = await ai.models.generateContent({
          model,
          contents: {
            parts: [
              ...imageParts,
              {
                text: `${promptText}

IMPORTANT: Return ONLY a valid JSON object matching this structure: { "winner": "Blue"|"Red", "blueKills": number, "redKills": number, "duration": string, "mvpIgn": string, "mvpKda": string, "svpIgn": string, "svpKda": string, "feederIgn": string, "teamBlue": [{ "ign": string, "kda": string, "rating": string, "isMvp": boolean, "heroDamage": number, "heroDamagePct": number, "damageTaken": number, "damageTakenPct": number, "turretDamage": number, "turretDamagePct": number, "teamfightPct": number, "gold": number, "medal": string, "isFeeder": boolean }], "teamRed": [{ "ign": string, "kda": string, "rating": string, "isMvp": boolean, "heroDamage": number, "heroDamagePct": number, "damageTaken": number, "damageTakenPct": number, "turretDamage": number, "turretDamagePct": number, "teamfightPct": number, "gold": number, "medal": string, "isFeeder": boolean }] }`
              }
            ]
          },
          config: {
            responseMimeType: "application/json"
          }
        });
        if (fallbackRes.text && fallbackRes.text.trim()) {
          rawText = fallbackRes.text;
          break;
        }
      } catch (innerErr) {
        lastError = innerErr;
      }
    }
  }
  if (!rawText) {
    throw lastError instanceof Error ? lastError : new Error("Empty response from Gemini Vision.");
  }
  const cleanedJson = rawText.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const parsed = JSON.parse(cleanedJson);
  const sanitizeTeam = (list) => {
    if (!Array.isArray(list)) return [];
    return list.map((item, idx) => {
      const obj = item || {};
      const parseNum = (val) => {
        if (typeof val === "number" && !Number.isNaN(val)) return Math.round(val);
        if (typeof val === "string") {
          const clean = val.replace(/[^0-9.-]/g, "");
          const n = Number(clean);
          if (!Number.isNaN(n)) return Math.round(n);
        }
        return void 0;
      };
      return {
        ign: typeof obj.ign === "string" && obj.ign.trim() ? obj.ign.trim() : `Player ${idx + 1}`,
        kda: typeof obj.kda === "string" ? obj.kda.trim() : "",
        rating: typeof obj.rating === "string" ? obj.rating.trim() : "",
        isMvp: Boolean(obj.isMvp),
        heroDamage: parseNum(obj.heroDamage),
        heroDamagePct: parseNum(obj.heroDamagePct),
        damageTaken: parseNum(obj.damageTaken),
        damageTakenPct: parseNum(obj.damageTakenPct),
        turretDamage: parseNum(obj.turretDamage),
        turretDamagePct: parseNum(obj.turretDamagePct),
        teamfightPct: parseNum(obj.teamfightPct),
        gold: parseNum(obj.gold),
        medal: typeof obj.medal === "string" ? obj.medal.trim() : void 0,
        isFeeder: Boolean(obj.isFeeder)
      };
    });
  };
  return {
    winner: typeof parsed.winner === "string" && parsed.winner.toLowerCase().includes("red") ? "Red" : "Blue",
    blueKills: typeof parsed.blueKills === "number" && !Number.isNaN(parsed.blueKills) ? parsed.blueKills : Number(parsed.blueKills) || 0,
    redKills: typeof parsed.redKills === "number" && !Number.isNaN(parsed.redKills) ? parsed.redKills : Number(parsed.redKills) || 0,
    duration: typeof parsed.duration === "string" ? parsed.duration.trim() : "",
    mvpIgn: typeof parsed.mvpIgn === "string" ? parsed.mvpIgn.trim() : "",
    mvpKda: typeof parsed.mvpKda === "string" ? parsed.mvpKda.trim() : "",
    svpIgn: typeof parsed.svpIgn === "string" ? parsed.svpIgn.trim() : "",
    svpKda: typeof parsed.svpKda === "string" ? parsed.svpKda.trim() : "",
    feederIgn: typeof parsed.feederIgn === "string" ? parsed.feederIgn.trim() : void 0,
    teamBlue: sanitizeTeam(parsed.teamBlue),
    teamRed: sanitizeTeam(parsed.teamRed)
  };
}

// server.ts
async function startServer() {
  const app = express();
  const PORT = 3e3;
  app.use(express.json({ limit: "15mb" }));
  app.post("/api/scrim/analyze-screenshot", async (req, res) => {
    try {
      const { imageBase64, mimeType, images, knownIgns } = req.body || {};
      const hasSingle = typeof imageBase64 === "string" && imageBase64.length > 0;
      const hasMulti = Array.isArray(images) && images.length > 0;
      if (!hasSingle && !hasMulti) {
        res.status(400).json({ error: "Missing screenshot image data." });
        return;
      }
      const result = await analyzeMlbbScreenshot({
        imageBase64: hasSingle ? imageBase64 : void 0,
        mimeType: mimeType || "image/jpeg",
        images: hasMulti ? images : void 0,
        knownIgns: Array.isArray(knownIgns) ? knownIgns : []
      });
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to analyze MLBB screenshot";
      console.error("Error in POST /api/scrim/analyze-screenshot:", error);
      res.status(500).json({ error: message });
    }
  });
  app.get("/api/scrim/state", requireAuth, async (req, res) => {
    try {
      if (req.user) {
        await getOrCreateUser(
          req.user.uid,
          req.user.email || "player@ngd.gg",
          req.user.name || null
        );
      }
      const state = await getFullScrimState();
      res.json(state);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch scrim state";
      console.error("Error in GET /api/scrim/state:", error);
      res.status(500).json({ error: message });
    }
  });
  app.post("/api/scrim/state", requireAuth, async (req, res) => {
    try {
      let userUid;
      if (req.user) {
        const dbUser = await getOrCreateUser(
          req.user.uid,
          req.user.email || "player@ngd.gg",
          req.user.name || null
        );
        userUid = dbUser.uid;
      }
      const { players: players2, slots, liveMatch, newHistoryRecord } = req.body;
      const result = await saveFullScrimState(
        { players: players2, slots, liveMatch, newHistoryRecord },
        userUid
      );
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save scrim state";
      console.error("Error in POST /api/scrim/state:", error);
      res.status(500).json({ error: message });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
