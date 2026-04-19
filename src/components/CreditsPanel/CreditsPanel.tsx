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

const GiftIcon = () => (
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
    <polyline points="20 12 20 22 4 22 4 12" />
    <rect x="2" y="7" width="20" height="5" />
    <line x1="12" y1="22" x2="12" y2="7" />
    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
  </svg>
);

const ShareIcon = () => (
  <svg
    aria-hidden="true"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

const HeartIcon = () => (
  <svg
    aria-hidden="true"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const SunIcon = () => (
  <svg
    aria-hidden="true"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const EARN_ACTIONS = [
  {
    action: "daily_visit",
    icon: <SunIcon />,
    title: "Щоденний візит",
    desc: "+1 кредит · раз на день",
    credits: 1,
  },
  {
    action: "share",
    icon: <ShareIcon />,
    title: "Поділитись сайтом",
    desc: "+2 кредити · раз на день",
    credits: 2,
  },
  {
    action: "like",
    icon: <HeartIcon />,
    title: "Вподобати історію",
    desc: "+1 кредит · до 3 разів на день",
    credits: 1,
  },
];

export default function CreditsPanel() {
  const { credits, plan, loading, buying, packages, earnCredits } =
    useCredits();
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleEarn = async (action: string) => {
    setError(null);
    setSuccessMsg(null);
    setClaimingId(action);
    try {
      const result = await earnCredits(action);
      if (result.success) {
        setClaimedIds((prev) => new Set(prev).add(action));
        setSuccessMsg(`+${result.creditsAwarded} кредитів отримано!`);
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        if (result.error === "Daily limit reached") {
          setError("Ви вже отримали цю нагороду сьогодні");
        } else {
          setError(result.error || "Помилка");
        }
        setTimeout(() => setError(null), 3000);
      }
    } catch {
      setError("Помилка мережі");
    } finally {
      setClaimingId(null);
    }
  };

  const handleClaimPack = async (packId: string) => {
    const action = `free_${packId}`;
    await handleEarn(action);
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Map Fairy Tales — AI казки для кожної країни",
          text: "Генеруй унікальні казки для будь-якої країни світу з AI!",
          url: window.location.origin,
        });
      } else {
        await navigator.clipboard.writeText(window.location.origin);
      }
      await handleEarn("share");
    } catch {
      // user cancelled share dialog — that's ok
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

      {/* ── Notifications ── */}
      {successMsg && (
        <p className={styles.success} role="status">
          {successMsg}
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.divider} />

      {/* ── Earn Credits ── */}
      <p className={styles.packagesTitle}>
        <GiftIcon /> Отримати безкоштовні кредити
      </p>
      <p className={styles.paymentNote}>
        Виконуйте дії — отримуйте кредити для генерації казок
      </p>

      <div className={styles.earnGrid}>
        {EARN_ACTIONS.map((ea) => {
          const isClaimed = claimedIds.has(ea.action);
          const isClaiming = claimingId === ea.action;
          return (
            <button
              key={ea.action}
              className={`${styles.earnCard} ${isClaimed ? styles.earnCardClaimed : ""}`}
              onClick={() =>
                ea.action === "share" ? handleShare() : handleEarn(ea.action)
              }
              disabled={isClaiming}
            >
              <span className={styles.earnIcon}>{ea.icon}</span>
              <span className={styles.earnTitle}>{ea.title}</span>
              <span className={styles.earnDesc}>{ea.desc}</span>
              <span className={styles.earnBadge}>
                {isClaiming ? "..." : isClaimed ? "✓" : `+${ea.credits}`}
              </span>
            </button>
          );
        })}
      </div>

      <div className={styles.divider} />

      {/* ── Free Packs (payment UI preserved for portfolio) ── */}
      <p className={styles.packagesTitle}>Пакети кредитів</p>
      <p className={styles.paymentNote}>
        🎁 Демо-режим — отримайте кредити безкоштовно (раз на день)
      </p>

      <div className={styles.packages}>
        {packages.map((pack) => {
          const freeAction = `free_${pack.id}`;
          const isClaimed = claimedIds.has(freeAction);
          const isClaiming = claimingId === freeAction;
          return (
            <div
              key={pack.id}
              className={`${styles.packageCard} ${pack.id === "pack_30" ? styles.packageCardFeatured : ""}`}
            >
              {pack.id === "pack_30" && (
                <span className={styles.badge}>Популярний</span>
              )}

              <p className={styles.packageCredits}>{pack.credits}</p>
              <p className={styles.packageCreditsLabel}>кредитів</p>
              <p className={styles.packagePrice}>
                <s className={styles.originalPrice}>{pack.priceUAH} ₴</s>{" "}
                <span className={styles.freeLabel}>Безкоштовно</span>
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
                className={`${styles.buyBtn} ${pack.id === "pack_30" ? styles.buyBtnFeatured : ""} ${isClaimed ? styles.buyBtnClaimed : ""}`}
                onClick={() => handleClaimPack(pack.id)}
                disabled={buying || isClaiming}
                aria-label={`Claim ${pack.credits} free credits`}
              >
                {isClaiming
                  ? "Нараховуємо..."
                  : isClaimed
                    ? `✓ ${pack.credits} кредитів отримано`
                    : `Отримати ${pack.credits} кредитів`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
