"use client";
import { useContext, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Preloader from "@/components/Preloader/Preloader";
import BtnBack from "@/components/BtnBack/BtnBack";
import { UserAuthBuilder } from "../../../context/context";
import { ToastContainer } from "react-toastify";
import { showNotification } from "@/helpers/showNotification";
import styles from "./Story.module.css";

// ── Icons ───────────────────────────────────────────
const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg
    aria-hidden="true"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const EyeIcon = () => (
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
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

// ── Types ───────────────────────────────────────────
interface Story {
  id: string;
  userId: string;
  regionId: string;
  story: {
    title?: string;
    imageUrl?: string;
    paragraphs?: Array<{ paragraph: string }>;
    // legacy fields (old stories may still have them)
    english?: {
      title?: string;
      paragraphs?: Array<{ paragraph: string }>;
      language?: string;
    };
    native?: {
      title?: string;
      paragraphs?: Array<{ paragraph: string }>;
      language?: string;
    };
  };
  region: string;
  likes?: { [key: string]: boolean };
  status: boolean;
  viewCount: number;
}

interface TranslationCache {
  title: string;
  paragraphs: Array<{ paragraph: string }>;
  language: string;
}

// ── Component ───────────────────────────────────────
export default function StoryPage() {
  const searchParams = useSearchParams();
  const region = searchParams?.get("region") ?? "";
  const id = searchParams?.get("id") ?? "";
  const { user } = useContext(UserAuthBuilder);

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [story, setStory] = useState<Story | null>(null);
  const [lang, setLang] = useState<"english" | "native">("english");
  const [translation, setTranslation] = useState<TranslationCache | null>(null);
  const [translating, setTranslating] = useState(false);

  // ── Fetch + increment view ──────────────────────
  useEffect(() => {
    const fetchAndUpdateStory = async () => {
      if (!region || !id) return;
      try {
        const res = await fetch(`/api/maps/${region}`);
        if (!res.ok) return;
        const { stories } = await res.json();
        if (!Array.isArray(stories)) return;

        const idx = stories.findIndex((s: any) => s.id === id);
        if (idx === -1) return;

        const updated = {
          ...stories[idx],
          viewCount: (stories[idx].viewCount || 0) + 1,
        };
        setStory(updated);
        setLikeCount(Object.keys(updated.likes || {}).length);
        setLiked(!!updated.likes?.[user.userId]);

        await fetch(`/api/maps/${region}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storyId: id, viewCount: updated.viewCount }),
        });
      } catch (err) {
        console.error("Error fetching story:", err);
      }
    };
    fetchAndUpdateStory().catch(console.error);
  }, [region, id, user.userId]);

  // Translate on demand when user switches to native tab
  const handleNativeTab = async () => {
    setLang("native");
    if (translation) return; // already cached

    // Check legacy pre-translated data first
    if (story?.story?.native?.paragraphs?.length) {
      setTranslation({
        title: story.story.native.title || story.story.title || "",
        paragraphs: story.story.native.paragraphs,
        language: story.story.native.language || story.region,
      });
      return;
    }

    const paragraphs =
      story?.story?.paragraphs || story?.story?.english?.paragraphs || [];
    const title = story?.story?.title || story?.story?.english?.title || "";
    if (!paragraphs.length) return;

    setTranslating(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paragraphs,
          title,
          region: story?.region || region,
        }),
      });
      if (!res.ok) throw new Error("Translation failed");
      const data = await res.json();
      setTranslation({
        title: data.title || title,
        paragraphs: data.paragraphs || [],
        language: data.language || story?.region || "Native",
      });
    } catch (err) {
      console.error("Translation error:", err);
    } finally {
      setTranslating(false);
    }
  };

  // ── Like handler ────────────────────────────────
  const handleLike = async () => {
    if (!user.userId || !user.isAuthenticated) {
      showNotification("Sign in to like stories", "success");
      return;
    }
    if (!story || !region || !id) return;

    try {
      const res = await fetch(`/api/maps/${region}`);
      if (!res.ok) return;
      const { stories } = await res.json();
      if (!Array.isArray(stories)) return;

      const idx = stories.findIndex((s: any) => s.id === id);
      if (idx === -1) return;

      let updatedLikes: Record<string, boolean>;
      if (liked) {
        const { [user.userId]: _, ...rest } = stories[idx].likes || {};
        updatedLikes = rest;
        setLiked(false);
        setLikeCount(Object.keys(rest).length);
      } else {
        updatedLikes = { ...(stories[idx].likes || {}), [user.userId]: true };
        setLiked(true);
        setLikeCount(Object.keys(updatedLikes).length);
      }

      await fetch(`/api/maps/${region}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId: id, likes: updatedLikes }),
      });
    } catch (err) {
      console.error("Error liking story:", err);
    }
  };

  if (!story) return <Preloader />;

  // Resolve title & paragraphs from legacy or new shape
  const englishTitle = story.story.english?.title || story.story.title || "";
  const englishParagraphs =
    story.story.english?.paragraphs || story.story.paragraphs || [];

  const activeTitle =
    lang === "native" && translation ? translation.title : englishTitle;
  const activeParagraphs =
    lang === "native" && translation
      ? translation.paragraphs
      : englishParagraphs;
  const nativeLabel =
    translation?.language ||
    story.story.native?.language ||
    story.region ||
    "Native";

  return (
    <div className={styles.page}>
      {/* ── Hero image ── */}
      <div className={styles.hero}>
        {story.story.imageUrl && (
          <img
            src={story.story.imageUrl}
            alt={activeTitle}
            className={styles.heroImg}
          />
        )}
        <div className={styles.heroOverlay} />

        {/* ── Navbar over hero ── */}
        <div className={styles.navbar}>
          <BtnBack linkUrl="back" />

          <div className={styles.navMeta}>
            <span className={styles.regionBadge}>{story.region}</span>
            <span className={styles.navStat}>
              <EyeIcon /> {story.viewCount}
            </span>
          </div>

          {/* like button top-right */}
          <button
            className={`${styles.likeBtn} ${liked ? styles.likeBtnActive : ""}`}
            onClick={handleLike}
            aria-label={liked ? `Unlike this story. ${likeCount} likes` : `Like this story. ${likeCount} likes`}
          >
            <HeartIcon filled={liked} />
            {likeCount}
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className={styles.content}>
        {/* Title */}
        <div className={styles.titleBlock}>
          <h1 className={styles.storyTitle}>{activeTitle}</h1>
          <div className={styles.titleDivider}>
            <div className={styles.titleDividerLine} />
            <div className={styles.titleDividerDot} />
            <div className={styles.titleDividerLine} />
          </div>
        </div>

        {/* Stats */}
        <div className={styles.statsBar}>
          <span className={styles.statItem}>
            <EyeIcon /> {story.viewCount} views
          </span>
          <span className={styles.statItem}>
            <HeartIcon filled={liked} /> {likeCount} likes
          </span>
          <span className={styles.statItem}>{story.region}</span>
        </div>

        {/* Language tabs */}
        <div className={styles.langTabs} role="tablist" aria-label="Story language">
          <button
            className={`${styles.langTab} ${lang === "english" ? styles.langTabActive : ""}`}
            onClick={() => setLang("english")}
            role="tab"
            aria-selected={lang === "english"}
          >
            English
          </button>
          <button
            className={`${styles.langTab} ${lang === "native" ? styles.langTabActive : ""}`}
            onClick={handleNativeTab}
            disabled={translating}
            role="tab"
            aria-selected={lang === "native"}
            aria-busy={translating}
          >
            {translating ? "Перекладаю…" : nativeLabel}
          </button>
        </div>

        {/* Story body */}
        <div className={styles.storyBody} role="tabpanel" aria-live="polite">
          {activeParagraphs.map((p, i) => (
            <div key={i}>
              <p className={styles.paragraph}>{p.paragraph}</p>
              {(i + 1) % 5 === 0 && i !== activeParagraphs.length - 1 && (
                <div className={styles.paragraphSep} aria-hidden="true">✦ ✦ ✦</div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom like */}
        <div className={styles.bottomActions}>
          <button
            className={`${styles.likeBtnLarge} ${liked ? styles.likeBtnLargeActive : ""}`}
            onClick={handleLike}
            aria-label={liked ? "Unlike this story" : "Like this story"}
          >
            <HeartIcon filled={liked} />
            {liked ? "You liked this tale" : "Like this tale"}
            <span className={styles.likeCount}>{likeCount}</span>
          </button>
        </div>
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
