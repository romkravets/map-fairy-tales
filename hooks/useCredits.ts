// hooks/useCredits.ts
"use client";

import { useState, useEffect, useContext } from "react";
import { getAuth } from "firebase/auth";
import { ref as dbRef, onValue } from "firebase/database";
import { db } from "@/db/firebase";
import { UserAuthBuilder } from "@/context/context";

export interface CreditsState {
  credits: number;
  plan: string;
  loading: boolean;
}

export const CREDIT_PACKAGES = [
  { id: "pack_10", credits: 10, priceUAH: 1, label: "Starter" },
  { id: "pack_30", credits: 30, priceUAH: 2, label: "Popular" },
  { id: "pack_100", credits: 100, priceUAH: 3, label: "Pro" },
] as const;

export function useCredits() {
  const { user } = useContext(UserAuthBuilder);
  const [state, setState] = useState<CreditsState>({
    credits: 0,
    plan: "free",
    loading: true,
  });
  const [buying, setBuying] = useState(false);

  // Підписка в реальному часі — оновиться автоматично після webhook
  useEffect(() => {
    if (!user?.userId) return;

    const userRef = dbRef(db, `users/${user.userId}`);
    const unsubscribe = onValue(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setState({
          credits: data.credits ?? 0,
          plan: data.plan ?? "free",
          loading: false,
        });
      } else {
        setState((s) => ({ ...s, loading: false }));
      }
    });

    return () => unsubscribe();
  }, [user?.userId]);

  const getAuthToken = async (): Promise<string> => {
    const currentUser = getAuth().currentUser;
    if (!currentUser) throw new Error("Not authenticated");
    return currentUser.getIdToken();
  };

  // Отримати URL інвойсу і зробити редірект на WayForPay
  const buyPackage = async (packageId: string) => {
    setBuying(true);
    try {
      const token = await getAuthToken();
      const response = await fetch("/api/wayforpay/create-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ packageId }),
      });

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to create invoice");

      // Редірект на сторінку оплати WayForPay
      window.location.href = data.invoiceUrl;
    } catch (err) {
      setBuying(false);
      throw err;
    }
  };

  return {
    ...state,
    buying,
    packages: CREDIT_PACKAGES,
    getAuthToken,
    buyPackage,
  };
}
