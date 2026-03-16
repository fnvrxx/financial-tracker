"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { emitRefresh } from "@/lib/events";

const TransactionForm = dynamic(() => import("@/components/TransactionForm"), {
  ssr: false,
});

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isCategoryPage = pathname === "/category";

  return (
    <>
      {children}
      {!isCategoryPage && <TransactionForm onSuccess={emitRefresh} />}
      <BottomNav />
    </>
  );
}
