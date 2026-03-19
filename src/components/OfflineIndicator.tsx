"use client";

import { useState, useEffect, useCallback } from "react";
import { getPendingCount } from "@/lib/offline-queue";
import { setupOnlineSync, flushOfflineQueue } from "@/lib/offline-sync";

export default function OfflineIndicator() {
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshCount = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
    } catch {
      // IndexedDB may not be available
    }
  }, []);

  useEffect(() => {
    setOnline(navigator.onLine);
    setupOnlineSync();
    refreshCount();

    function goOnline() {
      setOnline(true);
      refreshCount();
    }
    function goOffline() {
      setOnline(false);
    }

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    const interval = setInterval(refreshCount, 5000);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      clearInterval(interval);
    };
  }, [refreshCount]);

  async function handleManualSync() {
    setSyncing(true);
    try {
      await flushOfflineQueue();
      await refreshCount();
    } finally {
      setSyncing(false);
    }
  }

  // Nothing to show
  if (online && pendingCount === 0) return null;

  return (
    <div className={`mx-5 md:mx-8 mt-3 rounded-2xl px-4 py-3 flex items-center gap-3 animate-fade-in ${
      online ? "bg-amber-50" : "bg-gray-100"
    }`}>
      {/* Status icon */}
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
        online ? "bg-amber-100" : "bg-gray-200"
      }`}>
        {online ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round">
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01" />
          </svg>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        {!online ? (
          <>
            <p className="text-xs font-bold text-gray-700">Anda sedang offline</p>
            <p className="text-[10px] text-gray-400">
              {pendingCount > 0
                ? `${pendingCount} transaksi menunggu sinkronisasi`
                : "Data akan disimpan saat kembali online"}
            </p>
          </>
        ) : (
          <>
            <p className="text-xs font-bold text-amber-700">
              {pendingCount} transaksi belum tersinkron
            </p>
            <p className="text-[10px] text-amber-500">Tap sync untuk mengirim ke server</p>
          </>
        )}
      </div>

      {/* Sync button */}
      {online && pendingCount > 0 && (
        <button
          onClick={handleManualSync}
          disabled={syncing}
          className="px-3 py-1.5 rounded-xl bg-amber-500 text-white text-[11px] font-bold hover:bg-amber-600 transition-colors disabled:opacity-50 shrink-0"
        >
          {syncing ? "Syncing..." : "Sync"}
        </button>
      )}
    </div>
  );
}
