"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useContext, ChangeEvent } from "react";
import { getAuth } from "firebase/auth";
import Login from "@/components/Auth/Login/Login";
import { showNotification } from "@/helpers/showNotification";
import { ToastContainer } from "react-toastify";
import { v4 as uuid } from "uuid";
import { storyOptions } from "@/helpers/storyoptions";
import {
  CountryInfo,
  CountryStoryItem,
  StoryData,
  UserData,
} from "@/helpers/types";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import Select from "react-select";
import { UserAuthBuilder } from "../../../context/context";
import { useCredits } from "@/hooks/useCredits";
import Preloader from "@/components/Preloader/Preloader";
import Link from "next/link";
import BtnBack from "@/components/BtnBack/BtnBack";
import TextField from "@mui/material/TextField";
import styles from "./CountryStories.module.css";
import CountryInfoBlock from "./CountryInfoBlock";
import StoryPreview from "../Story/StoryPreview";

interface CustomValueForStory {
  team: string;
  heroes: string;
  events: string;
}

const selectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    background: "rgba(10, 25, 60, 0.5)",
    border: `1px solid ${state.isFocused ? "rgba(100,180,255,0.7)" : "rgba(80,140,210,0.3)"}`,
    borderRadius: "8px",
    boxShadow: state.isFocused ? "0 0 0 3px rgba(80,150,255,0.1)" : "none",
    minHeight: "40px",
    padding: "16px!important",
    cursor: "pointer",
    "&:hover": { borderColor: "rgba(100,170,255,0.5)" },
  }),
  valueContainer: (base: any) => ({ ...base, padding: "2px 14px" }),
  input: (base: any) => ({
    ...base,
    color: "#c8dff5",
    fontFamily: "'Crimson Pro', serif",
    fontSize: "15px",
    margin: 0,
    padding: 0,
  }),
  placeholder: (base: any) => ({
    ...base,
    color: "rgba(100,150,200,0.45)",
    fontFamily: "'Crimson Pro', serif",
    fontSize: "15px",
  }),
  singleValue: (base: any) => ({
    ...base,
    color: "#c8dff5",
    fontFamily: "'Crimson Pro', serif",
    fontSize: "15px",
  }),
  menu: (base: any) => ({
    ...base,
    background: "rgba(8, 20, 50, 0.97)",
    border: "1px solid rgba(80,140,210,0.25)",
    borderRadius: "8px",
    backdropFilter: "blur(16px)",
    boxShadow: "0 8px 32px rgba(0,10,40,0.6)",
    zIndex: 100,
  }),
  menuList: (base: any) => ({ ...base, padding: "4px!important" }),
  option: (base: any, state: any) => ({
    ...base,
    borderRadius: "6px",
    fontFamily: "'Crimson Pro', serif",
    fontSize: "15px",
    padding: "16px!important",
    color: state.isSelected ? "#e8f4ff" : "rgba(160,205,245,0.85)",
    background: state.isSelected
      ? "rgba(40, 90, 180, 0.55)"
      : state.isFocused
        ? "rgba(30, 65, 140, 0.45)"
        : "transparent",
    cursor: "pointer",
    "&:active": { background: "rgba(50,100,200,0.5)" },
  }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: (base: any) => ({
    ...base,
    color: "rgba(100,160,220,0.5)",
    padding: "0 10px 0 0",
    "&:hover": { color: "rgba(140,190,255,0.8)" },
  }),
  clearIndicator: (base: any) => ({
    ...base,
    color: "rgba(100,150,200,0.4)",
    "&:hover": { color: "rgba(200,100,100,0.7)" },
  }),
};

const textFieldSx = {
  "& .MuiOutlinedInput-root": {
    background: "rgba(10,25,60,0.5)",
    borderRadius: "8px",
    fontFamily: "'Crimson Pro', serif",
    fontSize: "16px",
    padding: "16px!important",
    color: "#c8dff5",
    "& fieldset": { borderColor: "rgba(80,140,210,0.3)" },
    "&:hover fieldset": { borderColor: "rgba(100,170,255,0.5)" },
    "&.Mui-focused fieldset": { borderColor: "rgba(100,180,255,0.7)" },
  },
  "& input::placeholder": { color: "rgba(100,150,200,0.5)" },
};

export default function CountryStories() {
  const searchParams = useSearchParams();
  const region = searchParams?.get("region") ?? "";
  const id = searchParams?.get("id") ?? "";
  const { user } = useContext(UserAuthBuilder);

  // ── Кредити (замість countStoryOfDay) ──────────────
  const {
    credits,
    loading: creditsLoading,
    packages,
    buyPackage,
  } = useCredits();
  const [buyingPackageId, setBuyingPackageId] = useState<string | null>(null);
  const [showBuyPanel, setShowBuyPanel] = useState(false);

  const [storyCreated, setCreatedStory] = useState<StoryData | null>(null);
  const [isLoadingStory, setIsLoadingStory] = useState(false);
  const [isLoadingSaveToDB, setIsLoadingSaveToDB] = useState(false);
  const [isPublicEnabled, setIsPublicEnabled] = useState(true);
  const [countryMap, setCountryMap] = useState<{
    info: CountryInfo | null;
    stories: CountryStoryItem[];
  }>({ info: null, stories: [] });
  const [loadingCountryMap, setLoadingCountryMap] = useState(true);
  const [selectedValue, setSelectedValue] = useState("random");
  const [customValueForStory, setCustomValueForStory] =
    useState<CustomValueForStory>({ team: "", heroes: "", events: "" });
  // Зберігаємо лише stories для збереження в БД
  const [userStories, setUserStories] = useState<any[]>([]);

  // ── Classic tales (Wikipedia + Gutenberg) ───────────
  const [classics, setClassics] = useState<
    Array<{
      id: string;
      title: string;
      description: string;
      imageUrl: string | null;
      linkUrl: string;
      source: "wikipedia" | "gutenberg";
    }>
  >([]);

  // Кастомна = хоча б одне поле заповнене
  const isCustom = !!(
    customValueForStory.team ||
    customValueForStory.heroes ||
    customValueForStory.events
  );
  const creditCost = isCustom ? 2 : 1;

  const getUserStories = async () => {
    if (!user?.userId) return;
    try {
      const token = user.token || (await getAuth().currentUser?.getIdToken());
      if (!token) return;
      const res = await fetch("/api/user/data", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUserStories(data.stories ?? []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getCountryStories = async () => {
    try {
      const res = await fetch(`/api/maps/${id}`);
      if (res.ok) {
        const data = await res.json();
        setCountryMap(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingCountryMap(false);
    }
  };

  // ── Генерація — тепер з токеном авторизації ────────
  const createAIStory = async () => {
    if (!region || credits < creditCost) return;
    setIsLoadingStory(true);
    try {
      const token = user.token || (await getAuth().currentUser?.getIdToken());
      if (!token) {
        showNotification("Sign in to generate stories", "error");
        return;
      }
      const response = await fetch("/api/openai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ region, customValueForStory }),
      });

      const data = await response.json();

      if (response.status === 402) {
        // Недостатньо кредитів — показати панель покупки
        showNotification(data.message || "Not enough credits", "error");
        setShowBuyPanel(true);
        return;
      }

      if (!response.ok) {
        showNotification(data.error || "Generation failed", "error");
        return;
      }

      setCreatedStory(data);
      // credits will refresh on next poll cycle in useCredits
    } catch (error) {
      console.error(error);
      showNotification("Generation error", "error");
    } finally {
      setIsLoadingStory(false);
      setCustomValueForStory({ team: "", heroes: "", events: "" });
      setSelectedValue("random");
    }
  };

  const setStoryToDB = async () => {
    if (!storyCreated || !user?.userId || !id) return;
    const newStoryId = uuid();
    const storage = getStorage();
    try {
      setIsLoadingSaveToDB(true);
      const blob = await (await fetch(storyCreated.imageUrl)).blob();
      const snap = await uploadBytes(
        storageRef(
          storage,
          `stories/${user.userId}/${id}/${newStoryId}/${newStoryId}.jpg`,
        ),
        blob,
      );
      const imageDownloadUrl = await getDownloadURL(snap.ref);

      const newStory = {
        id: newStoryId,
        userId: user.userId,
        regionId: id,
        story: { ...storyCreated, imageUrl: imageDownloadUrl },
        region,
        like: 0,
        isPublic: isPublicEnabled,
        viewCount: 0,
      };

      const updatedUserStories = [
        ...(userStories || []),
        {
          id: newStoryId,
          nameStory: storyCreated.title,
          link: newStoryId,
          imageUrl: imageDownloadUrl,
          countryId: id,
          isPublic: isPublicEnabled,
        },
      ];

      const token = user.token || (await getAuth().currentUser?.getIdToken());
      if (!token) return;
      // Save user's story list to MongoDB
      await fetch("/api/user/data", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ stories: updatedUserStories }),
      });
      // Save map stories to MongoDB
      await fetch(`/api/maps/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...countryMap,
          stories: [...(countryMap.stories || []), newStory],
        }),
      });

      showNotification("Saved in DB", "success");
      setCreatedStory(null);
      await getCountryStories();
      await getUserStories();
    } catch (error) {
      console.error(error);
      showNotification("Error saving story", "error");
    } finally {
      setIsLoadingSaveToDB(false);
    }
  };

  // ── Купити пакет прямо зі сторінки ─────────────────
  const handleBuyPackage = async (packageId: string) => {
    setBuyingPackageId(packageId);
    try {
      await buyPackage(packageId);
    } catch (err: any) {
      showNotification(err.message || "Payment error", "error");
      setBuyingPackageId(null);
    }
  };

  useEffect(() => {
    if (id && typeof window !== "undefined") {
      getCountryStories().catch(console.error);
      if (user?.userId) {
        getUserStories().catch(console.error);
        // Track country visit
        (async () => {
          const token =
            user.token || (await getAuth().currentUser?.getIdToken());
          if (!token) return;
          fetch("/api/user/visited", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ countryId: id }),
          }).catch(console.error);
        })();
      }
      // Fetch classic tales (Wikipedia + Gutenberg, no auth)
      fetch(`/api/classic-tales?country=${encodeURIComponent(id)}`)
        .then((r) => (r.ok ? r.json() : { classics: [] }))
        .then((data) => setClassics(data.classics ?? []))
        .catch(console.error);
    }
  }, [id, user]);

  return (
    <div className={styles.page}>
      <BtnBack linkUrl="/" />
      <h1 className={styles.pageTitle}>{region}</h1>
      <CountryInfoBlock region={region} />
      {/* ── Stories grid ── */}
      {countryMap.stories?.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>Stories</h2>
          <div className={styles.storiesGrid}>
            {countryMap.stories.map((item, index) => (
              <Link
                key={index}
                href={`/story?region=${item.regionId}&id=${item.id}`}
                className={styles.storyCard}
              >
                {item.story.imageUrl && (
                  <img
                    src={item.story.imageUrl}
                    alt={item.story.title}
                    className={styles.storyCardImage}
                  />
                )}
                <div className={styles.storyCardBody}>
                  <div className={styles.storyCardTitle}>
                    {item.story.title}
                  </div>
                  {item.story.paragraphs?.[0] && (
                    <div className={styles.storyCardExcerpt}>
                      {item.story.paragraphs[0].paragraph}
                    </div>
                  )}
                  <div className={styles.storyCardMeta}>
                    <span aria-hidden="true">👁</span> {item.viewCount} views
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
      {/* ── Classic fairy tales from Wikipedia + Project Gutenberg ── */}
      {classics.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>Classic Fairy Tales</h2>
          <p className={styles.classicSubtitle}>
            From Wikipedia &amp; Project Gutenberg
          </p>
          <div className={styles.storiesGrid}>
            {classics.map((item) => (
              <a
                key={item.id}
                href={item.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.storyCard}
              >
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className={styles.storyCardImage}
                  />
                ) : (
                  <div className={styles.storyCardImagePlaceholder}>
                    {item.source === "gutenberg" ? "📖" : "📜"}
                  </div>
                )}
                <div className={styles.storyCardBody}>
                  <div className={styles.storyCardTitle}>{item.title}</div>
                  <div className={styles.storyCardExcerpt}>
                    {item.description}
                  </div>
                  <div className={styles.storyCardMeta}>
                    <span
                      className={
                        item.source === "gutenberg"
                          ? styles.classicBadge
                          : styles.classicBadgeWiki
                      }
                    >
                      {item.source === "gutenberg" ? "Gutenberg" : "Wikipedia"}
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </>
      )}
      {/* ── Create story panel ── */}{" "}
      <div className={styles.createPanel}>
        <div className={styles.createPanelHeader}>
          <h2 className={styles.createTitle}>
            <span aria-hidden="true">✦</span> Create a Story
          </h2>
          {!user?.userId && !user?.isAuthenticated && (
            <div className={styles.authGate}>
              <span className={styles.authGateText}>
                Sign in to create stories
              </span>
              <Login />
            </div>
          )}
        </div>

        {user?.userId && user?.isAuthenticated && (
          <>
            {/* ── Credits badge ── */}
            <div className={styles.creditsRow} aria-live="polite">
              {creditsLoading ? (
                <span className={styles.creditsBadge} role="status">
                  Loading...
                </span>
              ) : (
                <span
                  className={`${styles.creditsBadge} ${credits === 0 ? styles.creditsBadgeEmpty : ""}`}
                >
                  <span aria-hidden="true">✦</span> {credits}{" "}
                  {credits === 1 ? "credit" : "credits"} available
                  {credits > 0 && (
                    <span className={styles.creditsCost}>
                      · This story costs {creditCost} credit
                      {creditCost > 1 ? "s" : ""}
                    </span>
                  )}
                </span>
              )}
              <button
                className={styles.buyCreditsLink}
                onClick={() => setShowBuyPanel((v) => !v)}
                aria-expanded={showBuyPanel}
              >
                {showBuyPanel ? "Hide" : "Buy credits"}
              </button>
            </div>

            {/* ── Buy panel (inline) ── */}
            {showBuyPanel && (
              <div className={styles.buyPanel}>
                <p className={styles.buyPanelTitle}>Choose a package</p>
                <p className={styles.buyPanelSub}>
                  Payment via WayForPay · Visa / Mastercard / Privat24
                </p>
                <div className={styles.buyPackages}>
                  {packages.map((pack) => (
                    <button
                      key={pack.id}
                      className={`${styles.buyPackageBtn} ${pack.id === "pack_30" ? styles.buyPackageBtnFeatured : ""}`}
                      onClick={() => handleBuyPackage(pack.id)}
                      disabled={buyingPackageId !== null}
                    >
                      {buyingPackageId === pack.id ? (
                        "Redirecting..."
                      ) : (
                        <>
                          <span className={styles.buyPackageCredits}>
                            {pack.credits} credits
                          </span>
                          <span className={styles.buyPackagePrice}>
                            {pack.priceUAH} ₴
                          </span>
                        </>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Radio: Random / Custom */}
            <fieldset className={styles.fieldset}>
              <legend className={styles.fieldsetLegend}>Story type</legend>
              <div className={styles.radioGroup}>
                {["random", "custom"].map((val) => (
                  <label key={val} className={styles.radioLabel}>
                    <input
                      type="radio"
                      className={styles.radioInput}
                      value={val}
                      checked={selectedValue === val}
                      onChange={() => setSelectedValue(val)}
                    />
                    {val.charAt(0).toUpperCase() + val.slice(1)}
                    {val === "custom" && (
                      <span className={styles.customBadge}>2 credits</span>
                    )}
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Custom inputs */}
            {selectedValue === "custom" && (
              <div className={styles.customSection}>
                <p className={styles.customSectionTitle}>
                  Choose story details
                </p>
                <Select
                  name="team"
                  styles={selectStyles}
                  options={storyOptions}
                  placeholder="Theme..."
                  aria-label="Choose story theme"
                  value={
                    storyOptions.find(
                      (o) => o.value === customValueForStory.team,
                    ) || null
                  }
                  onChange={(e) =>
                    setCustomValueForStory({
                      ...customValueForStory,
                      team: e ? e.value : "",
                    })
                  }
                />
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Hero name"
                  aria-label="Hero name"
                  value={customValueForStory.heroes}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setCustomValueForStory({
                      ...customValueForStory,
                      heroes: e.target.value,
                    })
                  }
                  sx={textFieldSx}
                />
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Key event in the story"
                  aria-label="Key event in the story"
                  value={customValueForStory.events}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setCustomValueForStory({
                      ...customValueForStory,
                      events: e.target.value,
                    })
                  }
                  sx={textFieldSx}
                />
              </div>
            )}

            {/* Generate / No credits */}
            {credits > 0 ? (
              <button
                className={styles.btnPrimary}
                onClick={createAIStory}
                disabled={isLoadingStory || credits < creditCost}
              >
                {isLoadingStory
                  ? "✦ Generating…"
                  : `✦ Generate Story · ${creditCost} credit${creditCost > 1 ? "s" : ""}`}
              </button>
            ) : (
              // Немає кредитів — показуємо CTA замість таймера
              <div className={styles.limitBox}>
                <span className={styles.limitText}>No credits left</span>
                <button
                  className={styles.limitBuyBtn}
                  onClick={() => setShowBuyPanel(true)}
                >
                  Buy credits to continue →
                </button>
              </div>
            )}

            {/* Story preview */}
            <div className={styles.storyPreviewContainer}>
              {storyCreated && <StoryPreview storyData={storyCreated} />}
              {storyCreated && (
                <div className={styles.storyPreview}>
                  <label className={styles.publicToggle}>
                    <input
                      type="checkbox"
                      checked={isPublicEnabled}
                      onChange={(e) => setIsPublicEnabled(e.target.checked)}
                      className={styles.publicToggleInput}
                    />
                    <span className={styles.publicToggleLabel}>
                      {isPublicEnabled
                        ? "🌍 Public — visible to everyone"
                        : "🔒 Private — only you can see it"}
                    </span>
                  </label>
                  <button
                    className={styles.btnSave}
                    onClick={setStoryToDB}
                    disabled={isLoadingSaveToDB}
                  >
                    {isLoadingSaveToDB ? "✦ Saving…" : "✦ Save Story"}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <ToastContainer
        position="bottom-right"
        toastStyle={{
          background: "rgba(4, 13, 26, 0.85)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(80,150,220,0.15)",
          borderRadius: "12px",
          color: "#e8f4ff",
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: 14,
          lineHeight: 1.5,
          boxShadow: "0 8px 32px rgba(0,10,40,0.5)",
        }}
      />
    </div>
  );
}
