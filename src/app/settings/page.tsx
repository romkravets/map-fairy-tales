"use client";

import {
  Suspense,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UserAuthBuilder } from "../../../context/context";
import { getAuth } from "firebase/auth";
import { UserData } from "@/helpers/types";
import Link from "next/link";
import { getStorage, ref as storageRef, deleteObject } from "firebase/storage";
import { ToastContainer } from "react-toastify";
import { showNotification } from "@/helpers/showNotification";
import { useCredits } from "../../../hooks/useCredits";
import CreditsPanel from "@/components/CreditsPanel/CreditsPanel";
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

const CreditIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

type ActiveTab = "stories" | "visited" | "liked";

// ── Component ───────────────────────────────────────
function SettingsPageContent() {
  const { user } = useContext(UserAuthBuilder);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<ActiveTab>("stories");

  const [userDB, setUserDB] = useState<UserData>({
    userName: "",
    countStoryOfDay: 0,
    expiryTime: 0,
    stories: [],
    visitedCountries: [],
    likedStories: [],
  });

  const [loadingUser, setLoadingUser] = useState(false);
  const [deleteStoryMap, setDeleteStoryMap] = useState<Record<string, boolean>>(
    {},
  );
  const [visibilityLoadingMap, setVisibilityLoadingMap] = useState<
    Record<string, boolean>
  >({});
  const [activeCountry, setActiveCountry] = useState<string>("all");
  const [showCreditsPanel, setShowCreditsPanel] = useState(false);

  const { credits, loading: creditsLoading } = useCredits();

  // ── Show notification after Stripe return ───────────
  useEffect(() => {
    const payment = searchParams?.get("payment");
    const addedCredits = searchParams?.get("credits");

    if (payment === "success" && addedCredits) {
      showNotification(
        `✅ ${addedCredits} credits added to your account!`,
        "success",
      );
      window.history.replaceState({}, "", "/settings");
    }
    if (payment === "cancelled") {
      showNotification("Payment cancelled", "error");
      window.history.replaceState({}, "", "/settings");
    }
  }, [searchParams]);

  // ── Fetch user data ──────────────────────────────────
  const getUserData = useCallback(async () => {
    if (!user || !user.isAuthenticated) {
      router.push("/auth");
      return;
    }
    setLoadingUser(true);
    try {
      const token = user.token || (await getAuth().currentUser?.getIdToken());
      if (!token) {
        router.push("/auth");
        return;
      }
      const [dataRes, visitedRes, likedRes] = await Promise.all([
        fetch("/api/user/data", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/user/visited", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/user/liked", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const data = dataRes.ok ? await dataRes.json() : {};
      const visitedData = visitedRes.ok ? await visitedRes.json() : {};
      const likedData = likedRes.ok ? await likedRes.json() : {};

      setUserDB({
        userName: data.userName ?? "",
        countStoryOfDay: 0,
        expiryTime: 0,
        stories: data.stories ?? [],
        visitedCountries: visitedData.visitedCountries ?? [],
        likedStories: likedData.likedStories ?? [],
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingUser(false);
    }
  }, [user?.userId]);

  useEffect(() => {
    if (typeof window !== "undefined") getUserData().catch(console.error);
  }, [getUserData]);

  // ── Delete story ─────────────────────────────────────
  const handleDeleteStory = async (
    storyId: string | undefined,
    userId: string | undefined,
    countryId: string | undefined,
  ) => {
    if (!storyId || !userId || !countryId) return;
    setDeleteStoryMap((prev) => ({ ...prev, [storyId]: true }));

    const storage = getStorage();
    try {
      const token = user.token || (await getAuth().currentUser?.getIdToken());
      if (!token) {
        router.push("/auth");
        return;
      }

      const [mapRes, userRes] = await Promise.all([
        fetch(`/api/maps/${countryId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/user/data", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const mapData = mapRes.ok ? await mapRes.json() : { stories: [] };
      const userData = userRes.ok ? await userRes.json() : { stories: [] };

      const updatedMap = (mapData.stories ?? []).filter(
        (s: any) => s.id !== storyId,
      );
      const updatedUser = (userData.stories ?? []).filter(
        (s: any) => s.id !== storyId,
      );

      await Promise.all([
        fetch(`/api/maps/${countryId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ stories: updatedMap }),
        }),
        fetch("/api/user/data", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ stories: updatedUser }),
        }),
        deleteObject(
          storageRef(
            storage,
            `stories/${userId}/${countryId}/${storyId}/${storyId}.jpg`,
          ),
        ).catch(() => {}),
      ]);

      await getUserData();
      showNotification("Deleted", "success");
    } catch (error) {
      console.error("Error deleting story:", error);
    } finally {
      setDeleteStoryMap((prev) => ({ ...prev, [storyId]: false }));
    }
  };

  // ── Toggle story visibility ──────────────────────────
  const handleToggleVisibility = async (
    storyId: string,
    countryId: string,
    currentIsPublic: boolean,
  ) => {
    setVisibilityLoadingMap((prev) => ({ ...prev, [storyId]: true }));
    try {
      const token = user.token || (await getAuth().currentUser?.getIdToken());
      if (!token) {
        router.push("/auth");
        return;
      }
      const res = await fetch(`/api/user/stories/${storyId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isPublic: !currentIsPublic, countryId }),
      });
      if (res.ok) {
        setUserDB((prev) => ({
          ...prev,
          stories: (prev.stories ?? []).map((s) =>
            s.id === storyId ? { ...s, isPublic: !currentIsPublic } : s,
          ),
        }));
        showNotification(
          !currentIsPublic ? "Story is now public" : "Story is now private",
          "success",
        );
      }
    } catch (error) {
      console.error(error);
    } finally {
      setVisibilityLoadingMap((prev) => ({ ...prev, [storyId]: false }));
    }
  };

  // ── Filter logic ─────────────────────────────────────
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

  // ── Render ───────────────────────────────────────────
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
            {creditsLoading ? (
              <div className={styles.statPill}>
                <span className={styles.statDot} />
                Loading...
              </div>
            ) : credits === 0 ? (
              <button
                className={`${styles.statPill} ${styles.statPillWarning}`}
                onClick={() => setShowCreditsPanel(true)}
              >
                <span
                  className={`${styles.statDot} ${styles.statDotWarning}`}
                />
                No credits · Buy more
              </button>
            ) : (
              <button
                className={styles.statPill}
                onClick={() => setShowCreditsPanel((v) => !v)}
              >
                <CreditIcon />
                {credits} {credits === 1 ? "credit" : "credits"} available
              </button>
            )}

            <Link href="/" className={styles.goMapBtn}>
              <MapIcon />
              World Map
            </Link>
          </div>
        </div>

        {showCreditsPanel && (
          <div className={styles.creditsPanelWrap}>
            <CreditsPanel />
          </div>
        )}

        <div className={styles.divider} />

        {/* ── Tabs ── */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === "stories" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("stories")}
          >
            My Stories
            {userDB.stories?.length ? ` (${userDB.stories.length})` : ""}
          </button>
          <button
            className={`${styles.tab} ${activeTab === "visited" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("visited")}
          >
            Visited
            {userDB.visitedCountries?.length
              ? ` (${userDB.visitedCountries.length})`
              : ""}
          </button>
          <button
            className={`${styles.tab} ${activeTab === "liked" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("liked")}
          >
            Liked
            {userDB.likedStories?.length
              ? ` (${userDB.likedStories.length})`
              : ""}
          </button>
        </div>

        {/* ══ TAB: My Stories ══════════════════════════════ */}
        {activeTab === "stories" && (
          <>
            {!userDB.stories || userDB.stories.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>🗺️</div>
                <h2 className={styles.emptyTitle}>No stories yet</h2>
                <p className={styles.emptyText}>
                  Click on any country on the map to generate your first fairy
                  tale
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

                <p className={styles.resultsInfo}>
                  {filteredStories.length === userDB.stories.length
                    ? `${filteredStories.length} stories in your collection`
                    : `${filteredStories.length} of ${userDB.stories.length} stories`}
                </p>

                <div className={styles.grid}>
                  {filteredStories.map((story, index) => {
                    const isPublic = story.isPublic ?? true;
                    return (
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
                            <p className={styles.cardCountry}>
                              {story.countryId}
                            </p>
                            <h3 className={styles.cardTitle}>
                              {story.nameStory}
                            </h3>
                          </div>
                        </Link>

                        <div className={styles.cardFooter}>
                          {/* Visibility toggle */}
                          <button
                            className={`${styles.visibilityBtn} ${isPublic ? styles.visibilityBtnPublic : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleVisibility(
                                story.id,
                                story.countryId ?? "",
                                isPublic,
                              );
                            }}
                            disabled={!!visibilityLoadingMap[story.id]}
                            title={isPublic ? "Make private" : "Make public"}
                          >
                            {visibilityLoadingMap[story.id] ? (
                              <SpinnerIcon />
                            ) : isPublic ? (
                              "🌍 Public"
                            ) : (
                              "🔒 Private"
                            )}
                          </button>

                          {/* Delete */}
                          <button
                            className={`${styles.deleteBtn} ${deleteStoryMap[story.id] ? styles.deleteBtnLoading : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteStory(
                                story.id,
                                user?.userId,
                                story.countryId,
                              );
                            }}
                            disabled={!!deleteStoryMap[story.id]}
                            title="Delete story"
                          >
                            {deleteStoryMap[story.id] ? (
                              <SpinnerIcon />
                            ) : (
                              <TrashIcon />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {/* ══ TAB: Visited Countries ══════════════════════ */}
        {activeTab === "visited" && (
          <>
            {!userDB.visitedCountries ||
            userDB.visitedCountries.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>🌍</div>
                <h2 className={styles.emptyTitle}>No countries visited yet</h2>
                <p className={styles.emptyText}>
                  Open any country on the map to mark it as visited
                </p>
                <Link href="/" className={styles.goMapBtn}>
                  <MapIcon /> Explore the Map
                </Link>
              </div>
            ) : (
              <>
                <p className={styles.resultsInfo}>
                  {userDB.visitedCountries.length} countries explored
                </p>
                <div className={styles.visitedGrid}>
                  {[...userDB.visitedCountries].sort().map((countryId) => (
                    <Link
                      key={countryId}
                      href={`/stories?region=${countryId}&id=${countryId}`}
                      className={styles.visitedChip}
                    >
                      {countryId}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* ══ TAB: Liked Stories ══════════════════════════ */}
        {activeTab === "liked" && (
          <>
            {!userDB.likedStories || userDB.likedStories.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>♥</div>
                <h2 className={styles.emptyTitle}>No liked stories yet</h2>
                <p className={styles.emptyText}>
                  Like stories while reading to save them here
                </p>
                <Link href="/" className={styles.goMapBtn}>
                  <MapIcon /> Explore the Map
                </Link>
              </div>
            ) : (
              <>
                <p className={styles.resultsInfo}>
                  {userDB.likedStories.length} liked stories
                </p>
                <div className={styles.likedGrid}>
                  {userDB.likedStories.map((s) => (
                    <Link
                      key={s.storyId}
                      href={`/story?region=${s.countryId}&id=${s.storyId}`}
                      className={styles.likedCard}
                    >
                      {s.imageUrl && (
                        <img
                          src={s.imageUrl}
                          alt={s.title}
                          className={styles.likedCardImage}
                        />
                      )}
                      <div className={styles.likedCardBody}>
                        <p className={styles.likedCardCountry}>{s.countryId}</p>
                        <h3 className={styles.likedCardTitle}>{s.title}</h3>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
      <ToastContainer />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Preloader />}>
      <SettingsPageContent />
    </Suspense>
  );
}
