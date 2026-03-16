import { db } from "@/db";
import { transactions, categories, accounts, syncQueue } from "@/db/schema";
import { eq, and, lt, sql } from "drizzle-orm";
import { appendTransaction, batchAppendTransactions } from "./sheets";

const MAX_RETRIES = 3;

export async function syncTransaction(txId: number) {
  const [tx] = await db.select().from(transactions).where(eq(transactions.id, txId));
  if (!tx) return { success: false, error: "Not found" };

  const [category] = await db.select().from(categories).where(eq(categories.id, tx.categoryId));
  const [account] = await db.select().from(accounts).where(eq(accounts.id, tx.accountId));
  if (!category || !account) return { success: false, error: "Missing relations" };

  const result = await appendTransaction(tx, category, account);

  if (result.success) {
    await db.update(transactions).set({ synced: true }).where(eq(transactions.id, txId));
    return { success: true };
  }

  await db.insert(syncQueue).values({
    transactionId: txId,
    status: "pending",
    retries: 0,
    lastError: String(result.error),
  });
  return { success: false, queued: true };
}

export async function processSyncQueue() {
  const pending = await db
    .select()
    .from(syncQueue)
    .where(and(eq(syncQueue.status, "pending"), lt(syncQueue.retries, MAX_RETRIES)));

  if (!pending.length) return { processed: 0 };

  const rows = [];
  for (const item of pending) {
    const [tx] = await db.select().from(transactions).where(eq(transactions.id, item.transactionId));
    if (!tx) continue;
    const [cat] = await db.select().from(categories).where(eq(categories.id, tx.categoryId));
    const [acc] = await db.select().from(accounts).where(eq(accounts.id, tx.accountId));
    if (cat && acc) {
      rows.push({ tx, category: cat, account: acc, queueId: item.id, retries: item.retries });
    }
  }

  if (!rows.length) return { processed: 0 };

  const result = await batchAppendTransactions(rows);

  if (result.success) {
    for (const r of rows) {
      await db.update(syncQueue).set({ status: "done" }).where(eq(syncQueue.id, r.queueId));
      await db.update(transactions).set({ synced: true }).where(eq(transactions.id, r.tx.id));
    }
    return { processed: rows.length };
  }

  for (const r of rows) {
    const newRetries = r.retries + 1;
    await db
      .update(syncQueue)
      .set({
        retries: newRetries,
        status: newRetries >= MAX_RETRIES ? "failed" : "pending",
        lastError: String(result.error),
      })
      .where(eq(syncQueue.id, r.queueId));
  }

  return { processed: 0, error: result.error };
}

export async function getSyncStatus() {
  const [totalResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(transactions);
  const [syncedResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(transactions)
    .where(eq(transactions.synced, true));
  const [pendingResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(syncQueue)
    .where(eq(syncQueue.status, "pending"));
  const [failedResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(syncQueue)
    .where(eq(syncQueue.status, "failed"));

  const total = totalResult?.count || 0;
  const synced = syncedResult?.count || 0;

  return {
    total,
    synced,
    unsynced: total - synced,
    pendingQueue: pendingResult?.count || 0,
    failedQueue: failedResult?.count || 0,
  };
}
