// Client-safe constants and types for credit packages.
export type UserPlan = "free" | "premium";

export interface UserCredits {
  credits: number;
  plan: UserPlan;
}

export const FREE_CREDITS_ON_SIGNUP = 3;

export const CREDIT_COST = {
  basic: 1,
  custom: 2,
} as const;

export const CREDIT_PACKAGES = [
  {
    id: "pack_10",
    credits: 10,
    price: 1,
    stripePriceId: process.env.STRIPE_PRICE_PACK_10,
  },
  {
    id: "pack_30",
    credits: 30,
    price: 2,
    stripePriceId: process.env.STRIPE_PRICE_PACK_30,
  },
  {
    id: "pack_100",
    credits: 100,
    price: 3,
    stripePriceId: process.env.STRIPE_PRICE_PACK_100,
  },
] as const;
