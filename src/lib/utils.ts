import { clsx, type ClassValue } from "clsx";
export function cn(...inputs: ClassValue[]) { return clsx(inputs); }
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}
export function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}
