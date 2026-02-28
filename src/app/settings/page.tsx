"use client";

import { useContext, useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { UserAuthBuilder } from "../../../context/context";
import { child, get, ref as dbRef, update } from "firebase/database";
import { db } from "@/db/firebase";
import { UserData } from "@/helpers/types";
import Link from "next/link";
import { getStorage, ref as storageRef, deleteObject } from "firebase/storage";
import { ToastContainer } from "react-toastify";
import { showNotification } from "@/helpers/showNotification";
import { useCountdown } from "@/helpers/useCountdown";
import Preloader from "@/components/Preloader/Preloader";
import BtnBack from "../../components/BtnBack/BtnBack";
import styles from "./pages.module.css";

// ── Icons ───────────────────────────────────────────
const MapIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
    <line x1="9" y1="3" x2="9" y2="18" />
    <line x1="15" y1="6" x2="15" y2="21" />
  </svg>
);

const TrashIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4h6v2" />
  </svg>
);

const SpinnerIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeOpacity="0.4" />
    <path d="M21 12a9 9 0 0 0-6.219-8.56">
      <animateTransform
        attributeName="transform"
        type="rotate"
        from="0 12 12"
        to="360 12 12"
        dur="0.7s"
        repeatCount="indefinite"
      />
    </path>
  </svg>
);

// ── Component ───────────────────────────────────────
export default function Page() {
  const tasksRef = dbRef(db);
  const { user } = useContext(UserAuthBuilder);
  const router = useRouter();

  const [userDB, setUserDB] = useState<UserData>({
    userName: "",
    countStoryOfDay: 0,
    expiryTime: 0,
    stories: [],
  });

  const [loadingUser, setLoadingUser] = useState(false);
  const [deleteStoryMap, setDeleteStoryMap] = useState<Record<string, boolean>>(
    {},
  );
  const [activeCountry, setActiveCountry] = useState<string>("all");

  // ── useCallback — стабільна референція, не перестворюється при кожному рендері
  const getUserData = useCallback(async () => {
    if (!user) {
      router.push("/auth");
      return;
    }
    setLoadingUser(true);
    try {
      const snapshot = await get(child(tasksRef, `users/${user.userId}`));
      if (snapshot.exists()) {
        const data = snapshot.val();
        setUserDB(data);
        if (data.countStoryOfDay <= 2 && !data.expiryTime) {
          await update(dbRef(db, `users/${user.userId}`), {
            countStoryOfDay: 3,
          });
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingUser(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId]);

  useEffect(() => {
    if (typeof window !== "undefined") getUserData().catch(console.error);
  }, [getUserData]);

  // ── Delete story ────────────────────────────────
  const handleDeleteStory = async (
    storyId: string | undefined,
    userId: string | undefined,
    countryId: string | undefined,
  ) => {
    if (!storyId || !userId || !countryId) return;
    setDeleteStoryMap((prev) => ({ ...prev, [storyId]: true }));

    const storage = getStorage();
    try {
      const [storySnap, userSnap] = await Promise.all([
        get(dbRef(db, `maps/${countryId}/stories`)),
        get(dbRef(db, `users/${userId}/stories`)),
      ]);
      if (!storySnap.exists() || !userSnap.exists()) return;

      const updatedMap = storySnap.val().filter((s: any) => s.id !== storyId);
      const updatedUser = userSnap.val().filter((s: any) => s.id !== storyId);

      await Promise.all([
        update(dbRef(db, `maps/${countryId}`), { stories: updatedMap }),
        update(dbRef(db, `users/${userId}`), { stories: updatedUser }),
        deleteObject(
          storageRef(
            storage,
            `stories/${userId}/${countryId}/${storyId}/${storyId}.jpg`,
          ),
        ),
      ]);

      await getUserData();
      showNotification("Delete", "success");
    } catch (error) {
      console.error("Error deleting story:", error);
    } finally {
      setDeleteStoryMap((prev) => ({ ...prev, [storyId]: false }));
    }
  };

  // ── Filter logic ────────────────────────────────
  const countries = useMemo(() => {
    if (!userDB.stories?.length) return [];
    const map: Record<string, number> = {};
    userDB.stories.forEach((s) => {
      if (s.countryId) map[s.countryId] = (map[s.countryId] || 0) + 1;
    });
    return Object.entries(map).map(([id, count]) => ({ id, count }));
  }, [userDB.stories]);

  const filteredStories = useMemo(() => {
    if (!userDB.stories) return [];
    if (activeCountry === "all") return userDB.stories;
    return userDB.stories.filter((s) => s.countryId === activeCountry);
  }, [userDB.stories, activeCountry]);

  // ← Тепер передаємо лише 2 аргументи (без stories)
  const { hours, minutes, seconds } = useCountdown(
    userDB.expiryTime,
    getUserData,
  );

  // ── Render ──────────────────────────────────────
  if (loadingUser) return <Preloader />;

  if (!user || !user.isAuthenticated) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.noAuth}>
            <Preloader />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <BtnBack linkUrl="/" />

        {/* ── Page header ── */}
        <div className={styles.pageHeader}>
          <div className={styles.headerLeft}>
            <span className={styles.eyebrow}>Your account</span>
            <h1 className={styles.pageTitle}>Settings</h1>
            <p className={styles.userName}>{user?.userName}</p>
          </div>

          <div className={styles.statsRow}>
            {userDB.countStoryOfDay === 0 ? (
              <div className={`${styles.statPill} ${styles.statPillWarning}`}>
                <span
                  className={`${styles.statDot} ${styles.statDotWarning}`}
                />
                Next stories in {hours}h {minutes}m {seconds}s
              </div>
            ) : (
              <div className={styles.statPill}>
                <span className={styles.statDot} />
                {userDB.countStoryOfDay} stories available today
              </div>
            )}

            <Link href="/" className={styles.goMapBtn}>
              <MapIcon />
              World Map
            </Link>
          </div>
        </div>

        <div className={styles.divider} />

        {/* ── No stories ── */}
        {!userDB.stories || userDB.stories.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🗺️</div>
            <h2 className={styles.emptyTitle}>No stories yet</h2>
            <p className={styles.emptyText}>
              Click on any country on the map to generate your first fairy tale
            </p>
            <Link href="/" className={styles.goMapBtn}>
              <MapIcon /> Explore the Map
            </Link>
          </div>
        ) : (
          <>
            {/* ── Country filter ── */}
            <div className={styles.filterSection}>
              <span className={styles.filterLabel}>Filter by country</span>
              <div className={styles.filterScroll}>
                <button
                  className={`${styles.filterChip} ${activeCountry === "all" ? styles.filterChipActive : ""}`}
                  onClick={() => setActiveCountry("all")}
                >
                  All stories
                  <span className={styles.filterCount}>
                    {userDB.stories.length}
                  </span>
                </button>

                {countries.map(({ id, count }) => (
                  <button
                    key={id}
                    className={`${styles.filterChip} ${activeCountry === id ? styles.filterChipActive : ""}`}
                    onClick={() => setActiveCountry(id)}
                  >
                    {id}
                    <span className={styles.filterCount}>{count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Results count ── */}
            <p className={styles.resultsInfo}>
              {filteredStories.length === userDB.stories.length
                ? `${filteredStories.length} stories in your collection`
                : `${filteredStories.length} of ${userDB.stories.length} stories`}
            </p>

            {/* ── Grid ── */}
            <div className={styles.grid}>
              {filteredStories.map((story, index) => (
                <div
                  className={styles.card}
                  key={story.id || index}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <Link
                    href={`/story?region=${story.countryId}&id=${story.link}`}
                    className={styles.cardLink}
                  >
                    {story.imageUrl && (
                      <div className={styles.cardImageWrap}>
                        <img
                          src={story.imageUrl}
                          alt={story.nameStory}
                          className={styles.cardImage}
                        />
                      </div>
                    )}
                    <div className={styles.cardBody}>
                      <p className={styles.cardCountry}>{story.countryId}</p>
                      <h3 className={styles.cardTitle}>{story.nameStory}</h3>
                    </div>
                  </Link>

                  <div className={styles.cardFooter}>
                    {/* Delete button (commented out) */}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <ToastContainer />
    </div>
  );
}
