"use client";
import { useContext, useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { useSearchParams } from "next/navigation";
import Preloader from "@/components/Preloader/Preloader";
import BtnBack from "@/components/BtnBack/BtnBack";
import { UserAuthBuilder } from "../../../context/context";
import { ToastContainer } from "react-toastify";
import { showNotification } from "@/helpers/showNotification";
import styles from "./Story.module.css";
import CommentsSection from "@/components/CommentsSection/CommentsSection";

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
  ratings?: { [key: string]: number };
  avgRating?: number;
  ratingCount?: number;
  isPublic: boolean;
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

  // Edit mode (owner only): manual edits or AI edits (paid)
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBodyText, setEditBodyText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiInstruction, setAiInstruction] = useState("");

  // Rating & share
  const [userRating, setUserRating] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [shareUrl, setShareUrl] = useState("");

  // ── Fetch + increment view ──────────────────────
  useEffect(() => {
    const fetchAndUpdateStory = async () => {
      if (!region || !id) return;
      try {
        const token =
          user?.token || (await getAuth().currentUser?.getIdToken());
        const res = await fetch(
          `/api/maps/${region}`,
          token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
        );
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

        // Prefer pre-computed DB values; fall back to client computation for legacy docs
        const ratings = updated.ratings || {};
        const rKeys = Object.keys(ratings);
        setRatingCount(updated.ratingCount ?? rKeys.length);
        setAvgRating(
          updated.avgRating ??
            (rKeys.length
              ? rKeys.reduce((s, k) => s + ratings[k], 0) / rKeys.length
              : 0),
        );
        setUserRating(ratings[user.userId] || 0);
        setShareUrl(window.location.href);

        await fetch(`/api/maps/${region}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ storyId: id, incrementView: true }),
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

    // Auth token for translate API
    const token = user.token || (await getAuth().currentUser?.getIdToken());

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
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
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
      const token = user.token || (await getAuth().currentUser?.getIdToken());
      const res = await fetch(
        `/api/maps/${region}`,
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
      );
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
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ storyId: id, likes: updatedLikes }),
      });

      // Award credit for liking (only on like, not unlike)
      if (!liked && token) {
        fetch("/api/credits/earn", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action: "like" }),
        }).catch(() => {});
      }
    } catch (err) {
      console.error("Error liking story:", err);
    }
  };

  // ── Star rating ─────────────────────────────────
  const handleRate = async (stars: number) => {
    if (!user.userId || !user.isAuthenticated) {
      showNotification("Sign in to rate stories", "success");
      return;
    }
    if (!story || !region || !id) return;
    const newRating = userRating === stars ? 0 : stars; // click same star = remove
    try {
      const token = user.token || (await getAuth().currentUser?.getIdToken());
      const res = await fetch(
        `/api/maps/${region}`,
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
      );
      if (!res.ok) return;
      const { stories } = await res.json();
      const idx = stories.findIndex((s: any) => s.id === id);
      if (idx === -1) return;

      let updatedRatings: Record<string, number>;
      if (newRating === 0) {
        const { [user.userId]: _, ...rest } = stories[idx].ratings || {};
        updatedRatings = rest;
      } else {
        updatedRatings = {
          ...(stories[idx].ratings || {}),
          [user.userId]: newRating,
        };
      }

      setUserRating(newRating);
      const rKeys = Object.keys(updatedRatings);
      const count = rKeys.length;
      const avg = count
        ? Math.round(
            (rKeys.reduce((s, k) => s + updatedRatings[k], 0) / count) * 10,
          ) / 10
        : 0;
      setRatingCount(count);
      setAvgRating(avg);

      await fetch(`/api/maps/${region}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ storyId: id, ratings: updatedRatings }),
      });
    } catch (err) {
      console.error("Error rating story:", err);
    }
  };

  // ── Edit handlers (owner) ──────────────────────
  const startEdit = () => {
    setEditMode(true);
    setEditTitle(englishTitle);
    setEditBodyText(englishParagraphs.map((p) => p.paragraph).join("\n\n"));
  };

  const cancelEdit = () => {
    setEditMode(false);
  };

  const handleManualSave = async () => {
    if (!user?.userId || !user?.isAuthenticated) {
      showNotification("Sign in to save edits", "error");
      return;
    }
    if (!region || !id) return;

    setIsSaving(true);
    try {
      const token = user.token || (await getAuth().currentUser?.getIdToken());
      if (!token) {
        showNotification("Sign in to save edits", "error");
        setIsSaving(false);
        return;
      }

      // Fetch current map entry
      const mapRes = await fetch(`/api/maps/${region}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!mapRes.ok) {
        showNotification("Failed to fetch map", "error");
        setIsSaving(false);
        return;
      }
      const mapData = await mapRes.json();
      const stories = mapData.stories ?? [];
      const idx = stories.findIndex((s: any) => s.id === id);
      if (idx === -1) {
        showNotification("Story not found", "error");
        setIsSaving(false);
        return;
      }

      const paragraphs = editBodyText
        .split(/\n\s*\n/)
        .map((p) => ({ paragraph: p.trim() }))
        .filter((p) => p.paragraph.length > 0);

      const updatedStory = {
        ...stories[idx],
        story: {
          title: editTitle,
          paragraphs,
          imageUrl: stories[idx].story?.imageUrl,
        },
      } as any;

      const updatedStories = [...stories];
      updatedStories[idx] = updatedStory;

      // Persist map entry
      const putRes = await fetch(`/api/maps/${region}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ info: mapData.info, stories: updatedStories }),
      });

      if (!putRes.ok) {
        const err = await putRes.json().catch(() => ({}));
        showNotification(err?.error || "Failed to save map", "error");
        setIsSaving(false);
        return;
      }

      // Update user's stories list (if present)
      const userRes = await fetch(`/api/user/data`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (userRes.ok) {
        const udata = await userRes.json();
        const userStories = udata.stories ?? [];
        const updatedUserStories = userStories.map((us: any) =>
          us.link === id || us.id === id
            ? {
                ...us,
                nameStory: editTitle,
                imageUrl: updatedStory.story?.imageUrl ?? us.imageUrl,
              }
            : us,
        );

        await fetch(`/api/user/data`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ stories: updatedUserStories }),
        });
      }

      setStory(updatedStories[idx]);
      showNotification("Saved changes", "success");
      setEditMode(false);
    } catch (err) {
      console.error(err);
      showNotification("Save error", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAiEdit = async () => {
    if (!user?.userId || !user?.isAuthenticated) {
      showNotification("Sign in to use AI edit", "error");
      return;
    }
    if (!region || !id || !story) return;

    setIsAiProcessing(true);
    try {
      const token = user.token || (await getAuth().currentUser?.getIdToken());
      if (!token) {
        showNotification("Sign in to use AI edit", "error");
        setIsAiProcessing(false);
        return;
      }

      const res = await fetch(`/api/openai/edit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          region,
          story: story.story,
          instruction: aiInstruction,
        }),
      });

      const data = await res.json();
      if (res.status === 402) {
        showNotification(data.message || "Not enough credits", "error");
        setIsAiProcessing(false);
        return;
      }
      if (!res.ok) {
        showNotification(data.error || "AI edit failed", "error");
        setIsAiProcessing(false);
        return;
      }

      // Build paragraphs from AI response
      const paragraphs = (data.paragraphs || []).map((p: any) => ({
        paragraph: p.paragraph || p,
      }));

      // Fetch current map entry and persist updated story
      const mapRes = await fetch(`/api/maps/${region}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!mapRes.ok) {
        showNotification("Failed to fetch map", "error");
        setIsAiProcessing(false);
        return;
      }
      const mapData = await mapRes.json();
      const stories = mapData.stories ?? [];
      const idx = stories.findIndex((s: any) => s.id === id);
      if (idx === -1) {
        showNotification("Story not found", "error");
        setIsAiProcessing(false);
        return;
      }

      const updatedStory = {
        ...stories[idx],
        story: {
          title: data.title || stories[idx].story?.title || "",
          paragraphs,
          imageUrl: stories[idx].story?.imageUrl,
        },
      } as any;

      const updatedStories = [...stories];
      updatedStories[idx] = updatedStory;

      const putRes = await fetch(`/api/maps/${region}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ info: mapData.info, stories: updatedStories }),
      });

      if (!putRes.ok) {
        const err = await putRes.json().catch(() => ({}));
        showNotification(err?.error || "Failed to save map", "error");
        setIsAiProcessing(false);
        return;
      }

      // Update user stories list (if present)
      const userRes = await fetch(`/api/user/data`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (userRes.ok) {
        const udata = await userRes.json();
        const userStories = udata.stories ?? [];
        const updatedUserStories = userStories.map((us: any) =>
          us.link === id || us.id === id
            ? {
                ...us,
                nameStory: updatedStory.story?.title ?? us.nameStory,
                imageUrl: updatedStory.story?.imageUrl ?? us.imageUrl,
              }
            : us,
        );

        await fetch(`/api/user/data`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ stories: updatedUserStories }),
        });
      }

      setStory(updatedStories[idx]);
      showNotification("AI edit applied", "success");
      setEditMode(false);
    } catch (err) {
      console.error(err);
      showNotification("AI edit error", "error");
    } finally {
      setIsAiProcessing(false);
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
            aria-label={
              liked
                ? `Unlike this story. ${likeCount} likes`
                : `Like this story. ${likeCount} likes`
            }
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
          {avgRating > 0 && (
            <span className={styles.statItem}>
              ★ {avgRating.toFixed(1)} ({ratingCount})
            </span>
          )}
          <span className={styles.statItem}>{story.region}</span>
        </div>

        {/* Owner edit controls */}
        {user?.userId === story.userId && (
          <div className={styles.editWrapper}>
            {!editMode ? (
              <button onClick={startEdit} className={styles.editButton}>
                Edit story
              </button>
            ) : (
              <div className={styles.editPanel}>
                <input
                  aria-label="Edit title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Story title"
                  className={styles.editInput}
                />
                <textarea
                  aria-label="Edit paragraphs"
                  value={editBodyText}
                  onChange={(e) => setEditBodyText(e.target.value)}
                  rows={8}
                  className={styles.editTextarea}
                />
                <div className={styles.editActions}>
                  <button
                    onClick={handleManualSave}
                    disabled={isSaving}
                    className={styles.editPrimaryBtn}
                  >
                    {isSaving ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={handleAiEdit}
                    disabled={isAiProcessing}
                    className={styles.editSecondaryBtn}
                  >
                    {isAiProcessing ? "Processing…" : "AI Edit · 30 credits"}
                  </button>
                  <button
                    onClick={cancelEdit}
                    disabled={isSaving || isAiProcessing}
                    className={styles.editSecondaryBtn}
                  >
                    Cancel
                  </button>
                </div>
                <div className={styles.aiInstruction}>
                  <input
                    value={aiInstruction}
                    onChange={(e) => setAiInstruction(e.target.value)}
                    placeholder="Optional AI instruction (tone, shorten, expand...)"
                    className={styles.editInput}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Language tabs */}
        <div
          className={styles.langTabs}
          role="tablist"
          aria-label="Story language"
        >
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
                <div className={styles.paragraphSep} aria-hidden="true">
                  ✦ ✦ ✦
                </div>
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

        {/* ── Star rating ── */}
        <div className={styles.starsSection}>
          <p className={styles.starsLabel}>Rate this story</p>
          <div className={styles.stars} role="group" aria-label="Star rating">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                className={`${styles.starBtn} ${(hoverRating || userRating) >= s ? styles.starBtnActive : ""}`}
                onClick={() => handleRate(s)}
                onMouseEnter={() => setHoverRating(s)}
                onMouseLeave={() => setHoverRating(0)}
                aria-label={`Rate ${s} out of 5`}
              >
                ★
              </button>
            ))}
          </div>
          {userRating > 0 && (
            <span className={styles.yourRating}>
              Your rating: {userRating} ★
            </span>
          )}
        </div>

        {/* ── Share ── */}
        <div className={styles.shareSection}>
          <p className={styles.shareLabel}>Share this tale</p>
          <div className={styles.shareButtons}>
            <button
              className={styles.shareBtn}
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                showNotification("Link copied!", "success");
              }}
            >
              Copy link
            </button>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(englishTitle + (englishParagraphs[0]?.paragraph ? "\n\n" + englishParagraphs[0].paragraph.slice(0, 180) + "…" : ""))}&url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.shareBtn}
            >
              X / Twitter
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.shareBtn}
            >
              Facebook
            </a>
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(englishTitle)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.shareBtn}
            >
              Telegram
            </a>
          </div>
        </div>
      </div>

      {/* Comments */}
      <CommentsSection
        storyId={id ?? ""}
        regionId={region ?? ""}
        storyAuthorUid={story.userId}
      />

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
