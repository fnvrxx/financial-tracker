// Flush offline queue when back online
import { getPendingTransactions, removePendingTransaction } from "./offline-queue";
import { emitRefresh } from "./events";

let syncing = false;

export async function flushOfflineQueue(): Promise<{ synced: number; failed: number }> {
  if (syncing) return { synced: 0, failed: 0 };
  syncing = true;

  let synced = 0;
  let failed = 0;

  try {
    const pending = await getPendingTransactions();
    if (!pending.length) return { synced: 0, failed: 0 };

    for (const item of pending) {
      try {
        const res = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.data),
        });
        if (res.ok) {
          await removePendingTransaction(item.id!);
          synced++;
        } else {
          failed++;
        }
      } catch {
        // Still offline or server error — stop trying
        failed++;
        break;
      }
    }

    if (synced > 0) {
      emitRefresh();
    }
  } finally {
    syncing = false;
  }

  return { synced, failed };
}

// Auto-flush when coming back online
export function setupOnlineSync() {
  if (typeof window === "undefined") return;

  window.addEventListener("online", () => {
    flushOfflineQueue();
  });

  // Also try on page load in case we came back online while app was closed
  if (navigator.onLine) {
    flushOfflineQueue();
  }
}
