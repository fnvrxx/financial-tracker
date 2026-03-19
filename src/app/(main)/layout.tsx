"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import OfflineIndicator from "@/components/OfflineIndicator";
import ErrorBoundary from "@/components/ErrorBoundary";
import { emitRefresh } from "@/lib/events";
import { preloadPages } from "@/lib/api-client";

const TransactionForm = dynamic(() => import("@/components/TransactionForm"), {
  ssr: false,
});

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isCategoryPage = pathname === "/category";

  // Preload API data on mount so page transitions are instant
  useEffect(() => {
    preloadPages();
  }, []);

  return (
    <>
      <ErrorBoundary>{children}</ErrorBoundary>
      <OfflineIndicator />
      {!isCategoryPage && <TransactionForm onSuccess={emitRefresh} />}
      <BottomNav />
    </>
  );
}
