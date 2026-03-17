import { db } from "@/db";
import { transactions, categories, accounts, syncQueue } from "@/db/schema";
import { eq, and, lt, sql, inArray } from "drizzle-orm";
import { appendTransaction, batchAppendTransactions } from "./sheets";

const MAX_RETRIES = 3;
const QUEUE_BATCH_LIMIT = 50;

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
    .where(and(eq(syncQueue.status, "pending"), lt(syncQueue.retries, MAX_RETRIES)))
    .limit(QUEUE_BATCH_LIMIT);

  if (!pending.length) return { processed: 0 };

  // Batch fetch all related data in 3 queries instead of N*3
  const txIds = pending.map((p) => p.transactionId);
  const txList = await db.select().from(transactions).where(inArray(transactions.id, txIds));

  const catIds = [...new Set(txList.map((t) => t.categoryId))];
  const accIds = [...new Set(txList.map((t) => t.accountId))];

  const [catList, accList] = await Promise.all([
    db.select().from(categories).where(inArray(categories.id, catIds)),
    db.select().from(accounts).where(inArray(accounts.id, accIds)),
  ]);

  const txMap = new Map(txList.map((t) => [t.id, t]));
  const catMap = new Map(catList.map((c) => [c.id, c]));
  const accMap = new Map(accList.map((a) => [a.id, a]));

  const rows = pending
    .map((item) => {
      const tx = txMap.get(item.transactionId);
      if (!tx) return null;
      const cat = catMap.get(tx.categoryId);
      const acc = accMap.get(tx.accountId);
      if (!cat || !acc) return null;
      return { tx, category: cat, account: acc, queueId: item.id, retries: item.retries };
    })
    .filter(Boolean) as { tx: typeof txList[0]; category: typeof catList[0]; account: typeof accList[0]; queueId: number; retries: number }[];

  if (!rows.length) return { processed: 0 };

  const result = await batchAppendTransactions(rows);

  if (result.success) {
    const queueIds = rows.map((r) => r.queueId);
    const txIds = rows.map((r) => r.tx.id);
    await Promise.all([
      db.update(syncQueue).set({ status: "done" }).where(inArray(syncQueue.id, queueIds)),
      db.update(transactions).set({ synced: true }).where(inArray(transactions.id, txIds)),
    ]);
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
  const [totalResult, syncedResult, pendingResult, failedResult] = await Promise.all([
    db.select({ count: sql<number>`COUNT(*)` }).from(transactions),
    db.select({ count: sql<number>`COUNT(*)` }).from(transactions).where(eq(transactions.synced, true)),
    db.select({ count: sql<number>`COUNT(*)` }).from(syncQueue).where(eq(syncQueue.status, "pending")),
    db.select({ count: sql<number>`COUNT(*)` }).from(syncQueue).where(eq(syncQueue.status, "failed")),
  ]);

  const total = totalResult[0]?.count || 0;
  const synced = syncedResult[0]?.count || 0;

  return {
    total,
    synced,
    unsynced: total - synced,
    pendingQueue: pendingResult[0]?.count || 0,
    failedQueue: failedResult[0]?.count || 0,
  };
}
