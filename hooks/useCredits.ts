// hooks/useCredits.ts
"use client";

import { useState, useEffect, useContext, useRef } from "react";
import { getAuth } from "firebase/auth";
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

  const getAuthToken = async (): Promise<string> => {
    const currentUser = getAuth().currentUser;
    if (!currentUser) throw new Error("Not authenticated");
    return currentUser.getIdToken();
  };

  // Fetch credits from MongoDB API (replaces Firebase onValue subscription)
  const unauthorizedRef = useRef(0);
  const intervalRef = useRef<number | undefined>(undefined);

  const fetchCredits = async () => {
    if (!user?.userId) return;
    try {
      const token = await getAuthToken();
      let res = await fetch("/api/user/credits", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      // If token expired / invalid, try to refresh once and retry
      if (res.status === 401) {
        const currentUser = getAuth().currentUser;
        if (currentUser) {
          await currentUser.getIdToken(true);
          const newToken = await getAuthToken();
          res = await fetch("/api/user/credits", {
            headers: { Authorization: `Bearer ${newToken}` },
            cache: "no-store",
          });
        }
      }

      if (res.status === 401) {
        // count repeated 401s and stop polling after a few attempts
        unauthorizedRef.current += 1;
        if (unauthorizedRef.current >= 3 && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = undefined;
        }
        return;
      }

      if (!res.ok) return;
      const data = await res.json();
      unauthorizedRef.current = 0;
      setState({
        credits: data.credits ?? 0,
        plan: data.plan ?? "free",
        loading: false,
      });
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  };

  useEffect(() => {
    if (!user?.userId) return;

    const auth = getAuth();

    const startPolling = () => {
      // immediate fetch then start interval
      fetchCredits();
      if (!intervalRef.current) {
        intervalRef.current = window.setInterval(
          fetchCredits,
          8000,
        ) as unknown as number;
      }
    };

    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
    };

    // Start polling only when Firebase has a current user / token
    const unsubscribe = auth.onIdTokenChanged((currentUser) => {
      if (currentUser) startPolling();
      else stopPolling();
    });

    // If auth already has a user, start polling immediately
    if (auth.currentUser) startPolling();

    return () => {
      unsubscribe();
      stopPolling();
    };
  }, [user?.userId]);

  // Earn credits via engagement action (share, like, daily visit, free pack)
  const earnCredits = async (
    action: string,
  ): Promise<{ success: boolean; creditsAwarded?: number; error?: string }> => {
    try {
      const token = await getAuthToken();
      const res = await fetch("/api/credits/earn", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.error || "Failed to earn credits",
        };
      }
      // Update local state immediately
      setState((s) => ({
        ...s,
        credits: data.totalCredits ?? s.credits + (data.creditsAwarded ?? 0),
      }));
      return { success: true, creditsAwarded: data.creditsAwarded };
    } catch {
      return { success: false, error: "Network error" };
    }
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
    earnCredits,
    refetchCredits: fetchCredits,
  };
}
