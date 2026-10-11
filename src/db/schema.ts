import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const scrimSlots = pgTable('scrim_slots', {
  slotNumber: integer('slot_number').primaryKey(),
  ign: text('ign').notNull(),
  role: text('role').notNull(),
  secondaryRole: text('secondary_role'),
  roleLabel: text('role_label').notNull(),
  isReady: boolean('is_ready').notNull().default(true),
  assignedAt: text('assigned_at').notNull(),
  userUid: text('user_uid').references(() => users.uid),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const players = pgTable('players', {
  id: serial('id').primaryKey(),
  ign: text('ign').notNull().unique(),
  squadTag: text('squad_tag').notNull().default('NGD'),
  primaryRole: text('primary_role').notNull(),
  secondaryRole: text('secondary_role').notNull(),
  roleLabel: text('role_label').notNull(),
  wins: integer('wins').notNull().default(0),
  losses: integer('losses').notNull().default(0),
  mvpCount: integer('mvp_count').notNull().default(0),
  streak: integer('streak').notNull().default(0),
  roleCountsJson: text('role_counts_json').notNull().default('{}'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const scrimMatches = pgTable('scrim_matches', {
  id: text('id').primaryKey(),
  matchId: text('match_id').notNull(),
  roomName: text('room_name').notNull(),
  startedAt: text('started_at').notNull(),
  teamBlueJson: text('team_blue_json').notNull(),
  teamRedJson: text('team_red_json').notNull(),
  mvpIgn: text('mvp_ign').notNull(),
  shuffleNote: text('shuffle_note'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const matchHistory = pgTable('match_history', {
  id: serial('id').primaryKey(),
  matchCode: text('match_code').notNull(),
  roomName: text('room_name').notNull(),
  completedAt: text('completed_at').notNull(),
  winner: text('winner').notNull(),
  mvpIgn: text('mvp_ign').notNull(),
  teamBlueJson: text('team_blue_json').notNull(),
  teamRedJson: text('team_red_json').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  slots: many(scrimSlots),
}));

export const scrimSlotsRelations = relations(scrimSlots, ({ one }) => ({
  user: one(users, {
    fields: [scrimSlots.userUid],
    references: [users.uid],
  }),
}));
