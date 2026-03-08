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

import { getAdmin } from "@/db/firebaseAdmin";

// ── Отримати кредити юзера ──────────────────────────
export async function getUserCredits(userId: string): Promise<UserCredits> {
  const { adminDb } = getAdmin();
  const snap = await adminDb.ref(`users/${userId}`).once("value");
  if (!snap.exists()) throw new Error("User not found");

  const data = snap.val();

  // Старий юзер без credits — даємо 3 безкоштовних
  if (data.credits === undefined || data.credits === null) {
    await adminDb.ref(`users/${userId}`).update({
      credits: FREE_CREDITS_ON_SIGNUP,
      plan: "free",
    });
    return { credits: FREE_CREDITS_ON_SIGNUP, plan: "free" };
  }

  return { credits: data.credits ?? 0, plan: data.plan ?? "free" };
}

// ── Перевірити і списати кредити (атомарна операція) ─
export async function deductCredit(
  userId: string,
  isCustom: boolean,
): Promise<{ success: boolean; remainingCredits: number; error?: string }> {
  const cost = isCustom ? CREDIT_COST.custom : CREDIT_COST.basic;
  const { adminDb } = getAdmin();
  const userRef = adminDb.ref(`users/${userId}`);

  const result = await userRef.transaction((userData: any) => {
    if (!userData) return userData;
    if ((userData.credits ?? 0) < cost) return null;
    userData.credits = (userData.credits ?? 0) - cost;
    return userData;
  });

  if (!result.committed) {
    const snap = await userRef.once("value");
    const current = snap.val()?.credits ?? 0;
    return {
      success: false,
      remainingCredits: current,
      error: `Not enough credits. Need ${cost}, have ${current}.`,
    };
  }

  return {
    success: true,
    remainingCredits: result.snapshot.val()?.credits ?? 0,
  };
}

// ── Додати кредити (після успішної оплати через webhook) ─
export async function addCredits(
  userId: string,
  amount: number,
): Promise<void> {
  const { adminDb } = getAdmin();
  await adminDb.ref(`users/${userId}`).transaction((userData: any) => {
    if (!userData) return userData;
    userData.credits = (userData.credits ?? 0) + amount;
    return userData;
  });
}
