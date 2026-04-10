import { db, client } from "./index";
import { accounts, categories, budgets } from "./schema";
import { eq, sql } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...\n");

  // Create enums + tables via drizzle push (run db:push first)
  // Seed accounts
  const existingAccounts = await db.select().from(accounts);
  if (existingAccounts.length === 0) {
    await db.insert(accounts).values([
      { name: "Cash", type: "cash", balance: 0, icon: "banknote" },
      { name: "Bank BCA", type: "bank", balance: 0, icon: "landmark" },
      { name: "GoPay", type: "ewallet", balance: 0, icon: "smartphone" },
      { name: "OVO", type: "ewallet", balance: 0, icon: "smartphone" },
    ]);
    console.log("✅ Accounts created");
  }

  const existingCats = await db.select().from(categories);
  if (existingCats.length === 0) {
    await db.insert(categories).values([
      { name: "Gaji", icon: "briefcase", type: "income", color: "#10b981" },
      { name: "Freelance", icon: "laptop", type: "income", color: "#06b6d4" },
      {
        name: "Investasi",
        icon: "trending-up",
        type: "income",
        color: "#3b82f6",
      },
      {
        name: "Lainnya",
        icon: "plus-circle",
        type: "income",
        color: "#8b5cf6",
      },
      {
        name: "Makan & Minum",
        icon: "utensils",
        type: "expense",
        color: "#ef4444",
      },
      { name: "Transportasi", icon: "car", type: "expense", color: "#f97316" },
      {
        name: "Belanja",
        icon: "shopping-bag",
        type: "expense",
        color: "#ec4899",
      },
      { name: "Tagihan", icon: "receipt", type: "expense", color: "#8b5cf6" },
      { name: "Hiburan", icon: "gamepad-2", type: "expense", color: "#06b6d4" },
      {
        name: "Kesehatan",
        icon: "heart-pulse",
        type: "expense",
        color: "#10b981",
      },
      {
        name: "Pendidikan",
        icon: "graduation-cap",
        type: "expense",
        color: "#3b82f6",
      },
      {
        name: "Lainnya",
        icon: "more-horizontal",
        type: "expense",
        color: "#6b7280",
      },
    ]);
    console.log("✅ Categories created");
  }

  const existingBudgets = await db.select().from(budgets);
  if (existingBudgets.length === 0) {
    const expCats = await db
      .select()
      .from(categories)
      .where(eq(categories.type, "expense"));
    const limits: Record<string, number> = {
      "Makan & Minum": 2000000,
      Transportasi: 800000,
      Belanja: 1000000,
      Tagihan: 1500000,
      Hiburan: 500000,
    };
    const vals = expCats
      .filter((c) => limits[c.name])
      .map((c) => ({
        categoryId: c.id,
        limitAmount: limits[c.name],
        period: "monthly" as const,
      }));
    if (vals.length) {
      await db.insert(budgets).values(vals);
      console.log("✅ Budgets created");
    }
  }

  console.log("\n🎉 Seeding complete!");
  await client.end();
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
