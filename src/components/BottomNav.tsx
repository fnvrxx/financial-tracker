"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const items = [
  { href: "/", label: "Home", d: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10" },
  { href: "/graph", label: "Graph", d: "M18 20V10 M12 20V4 M6 20v-6" },
  { href: "/transactions", label: "Transaksi", d: "M17 1l4 4-4 4 M3 11V9a4 4 0 014-4h14 M7 23l-4-4 4-4 M21 13v2a4 4 0 01-4 4H3" },
  { href: "/category", label: "Kategori", d: "M10 3H3v7h7V3z M21 3h-7v7h7V3z M21 14h-7v7h7v-7z M10 14H3v7h7v-7z" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto flex justify-around items-center h-16">
        {items.map((item) => {
          const active = item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center gap-0.5 px-4 py-1.5 transition-all ${
                active ? "text-primary-500" : "text-gray-400"
              }`}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={item.d} />
              </svg>
              <span className="text-[10px] font-semibold tracking-tight">
                {item.label}
              </span>
              {active && (
                <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary-500" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
