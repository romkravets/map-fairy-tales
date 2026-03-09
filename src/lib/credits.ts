export type UserPlan = "free" | "premium";

export interface UserCredits {
  credits: number;
  plan: UserPlan;
}

export const FREE_CREDITS_ON_SIGNUP = 3;

export const CREDIT_COST = {
  basic: 1, // базова генерація без кастомізації
  custom: 2, // з customValueForStory (heroes / team / events)
};

// Пакети кредитів — ціни в гривнях для WayForPay
export const CREDIT_PACKAGES = [
  { id: "pack_10", credits: 10, priceUAH: 1, label: "Starter" },
  { id: "pack_30", credits: 30, priceUAH: 2, label: "Popular" },
  { id: "pack_100", credits: 100, priceUAH: 3, label: "Pro" },
] as const;

import { connectDB } from "@/db/mongodb";
import User from "@/models/User";

// ── Отримати кредити юзера ──────────────────────────
export async function getUserCredits(userId: string): Promise<UserCredits> {
  await connectDB();
  const user = await User.findOne({ firebaseUid: userId }).lean();

  if (!user) {
    // Перший вхід — створюємо юзера з безкоштовними кредитами
    await User.create({ firebaseUid: userId, credits: FREE_CREDITS_ON_SIGNUP, plan: "free" });
    return { credits: FREE_CREDITS_ON_SIGNUP, plan: "free" };
  }

  return { credits: user.credits ?? 0, plan: user.plan ?? "free" };
}

// ── Перевірити і списати кредити (атомарна операція) ─
export async function deductCredit(
  userId: string,
  isCustom: boolean,
): Promise<{ success: boolean; remainingCredits: number; error?: string }> {
  const cost = isCustom ? CREDIT_COST.custom : CREDIT_COST.basic;
  await connectDB();

  // findOneAndUpdate з $inc atomically reads and writes — safe against races
  const updated = await User.findOneAndUpdate(
    { firebaseUid: userId, credits: { $gte: cost } },
    { $inc: { credits: -cost } },
    { new: true },
  ).lean();

  if (!updated) {
    const current = await User.findOne({ firebaseUid: userId }).lean();
    const currentCredits = current?.credits ?? 0;
    return {
      success: false,
      remainingCredits: currentCredits,
      error: `Not enough credits. Need ${cost}, have ${currentCredits}.`,
    };
  }

  return { success: true, remainingCredits: updated.credits };
}

// ── Додати кредити (після успішної оплати через webhook) ─
export async function addCredits(
  userId: string,
  amount: number,
): Promise<void> {
  await connectDB();
  await User.findOneAndUpdate(
    { firebaseUid: userId },
    { $inc: { credits: amount } },
    { upsert: true },
  );
}
