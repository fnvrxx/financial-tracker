import { pgTable, serial, text, real, timestamp, boolean, integer, pgEnum } from "drizzle-orm/pg-core";

export const accountTypeEnum = pgEnum("account_type", ["cash", "bank", "ewallet"]);
export const txTypeEnum = pgEnum("tx_type", ["income", "expense"]);
export const periodEnum = pgEnum("period_type", ["monthly", "weekly"]);
export const syncStatusEnum = pgEnum("sync_status", ["pending", "done", "failed"]);

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: accountTypeEnum("type").notNull().default("cash"),
  balance: real("balance").notNull().default(0),
  icon: text("icon").default("wallet"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon").default("tag"),
  type: txTypeEnum("type").notNull().default("expense"),
  color: text("color").default("#7c4dff"),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => accounts.id),
  categoryId: integer("category_id").notNull().references(() => categories.id),
  type: txTypeEnum("type").notNull(),
  amount: real("amount").notNull(),
  note: text("note").default(""),
  date: text("date").notNull(),
  synced: boolean("synced").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const budgets = pgTable("budgets", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull().references(() => categories.id),
  limitAmount: real("limit_amount").notNull(),
  period: periodEnum("period").notNull().default("monthly"),
});

export const syncQueue = pgTable("sync_queue", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").notNull().references(() => transactions.id),
  status: syncStatusEnum("status").notNull().default("pending"),
  retries: integer("retries").notNull().default(0),
  lastError: text("last_error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Account = typeof accounts.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
