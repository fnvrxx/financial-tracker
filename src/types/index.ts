import type { Account, Category, Transaction, Budget } from "@/db/schema";

export interface TransactionWithRelations { transaction: Transaction; category: Category; account: Account; }
export interface ReportSummary { income: number; expense: number; net: number; transactionCount: number; period: { from: string; to: string }; }
export interface CategoryBreakdown { categoryId: number; categoryName: string; categoryIcon: string; categoryColor: string; type: "income" | "expense"; total: number; count: number; }
export interface MonthlyTrend { month: string; income: number; expense: number; net: number; }
export interface SyncStatus { total: number; synced: number; unsynced: number; pendingQueue: number; failedQueue: number; }
export interface BudgetStatus { budgetId: number; categoryId: number; categoryName: string; categoryIcon: string; categoryColor: string; limitAmount: number; spent: number; remaining: number; percentage: number; period: string; isOverBudget: boolean; isNearLimit: boolean; }
export interface TransactionForm { accountId: number; categoryId: number; type: "income" | "expense"; amount: number; note: string; date: string; }
export type { Account, Category, Transaction, Budget };
