// components/CreditsPanel/CreditsPanel.tsx
"use client";

import { useState } from "react";
import { useCredits } from "@/hooks/useCredits";
import styles from "./CreditsPanel.module.css";

const CheckIcon = () => (
  <svg
    aria-hidden="true"
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const WayForPayIcon = () => (
  <svg
    aria-hidden="true"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

export default function CreditsPanel() {
  const { credits, plan, loading, buying, packages, buyPackage } = useCredits();
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBuy = async (packageId: string) => {
    setError(null);
    setBuyingId(packageId);
    try {
      await buyPackage(packageId);
      // Після buyPackage — редірект, тому setBuyingId(null) не потрібен
    } catch (err: any) {
      setError(err.message || "Помилка оплати. Спробуйте ще раз.");
      setBuyingId(null);
    }
  };

  if (loading) return <div className={styles.loading}>Завантаження...</div>;

  return (
    <div className={styles.panel}>
      {/* ── Баланс ── */}
      <div className={styles.balance}>
        <div>
          <p className={styles.balanceLabel}>Доступно кредитів</p>
          <p className={styles.balanceCount}>
            {credits}
            <span className={styles.balancePlan}>
              {plan === "free" ? " · Free" : " · Premium"}
            </span>
          </p>
        </div>
      </div>

      {/* ── Вартість генерації ── */}
      <div className={styles.costInfo}>
        <div className={styles.costRow}>
          <span className={styles.costLabel}>Базова історія (за регіоном)</span>
          <span className={styles.costValue}>1 кредит</span>
        </div>
        <div className={styles.costRow}>
          <span className={styles.costLabel}>
            Кастомна (герой / тема / подія)
          </span>
          <span className={styles.costValue}>2 кредити</span>
        </div>
      </div>

      <div className={styles.divider} />

      <p className={styles.packagesTitle}>Купити кредити</p>
      <p className={styles.paymentNote}>
        <WayForPayIcon /> Оплата через WayForPay · Visa / Mastercard / Privat24
        / Google Pay
      </p>

      {error && <p className={styles.error} role="alert">{error}</p>}

      {/* ── Пакети ── */}
      <div className={styles.packages}>
        {packages.map((pack) => (
          <div
            key={pack.id}
            className={`${styles.packageCard} ${pack.id === "pack_30" ? styles.packageCardFeatured : ""}`}
          >
            {pack.id === "pack_30" && (
              <span className={styles.badge}>Популярний</span>
            )}

            <p className={styles.packageCredits}>{pack.credits}</p>
            <p className={styles.packageCreditsLabel}>кредитів</p>
            <p className={styles.packagePrice}>{pack.priceUAH} ₴</p>
            <p className={styles.packagePerCredit}>
              {(pack.priceUAH / pack.credits).toFixed(1)} ₴ / кредит
            </p>

            <ul className={styles.packageFeatures}>
              <li>
                <CheckIcon /> Базові історії
              </li>
              {pack.credits >= 10 && (
                <li>
                  <CheckIcon /> Кастомні персонажі
                </li>
              )}
              {pack.credits >= 30 && (
                <li>
                  <CheckIcon /> Теми та події
                </li>
              )}
              {pack.credits >= 100 && (
                <li>
                  <CheckIcon /> Пріоритетна генерація
                </li>
              )}
            </ul>

            <button
              className={`${styles.buyBtn} ${pack.id === "pack_30" ? styles.buyBtnFeatured : ""}`}
              onClick={() => handleBuy(pack.id)}
              disabled={buying || buyingId !== null}
              aria-label={`Buy ${pack.credits} credits for ${pack.priceUAH} hryvnias`}
            >
              {buyingId === pack.id
                ? "Переходимо до оплати..."
                : `Купити за ${pack.priceUAH} ₴`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
