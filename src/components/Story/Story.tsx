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
    title: string;
    imageUrl: string;
    paragraphs: Array<{ paragraph: string }>;
  };
  region: string;
  likes?: { [key: string]: boolean };
  status: boolean;
  viewCount: number;
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

  return (
    <div className={styles.page}>
      {/* ── Hero image ── */}
      <div className={styles.hero}>
        {story.story.imageUrl && (
          <img
            src={story.story.imageUrl}
            alt={story.story.title}
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
          <h1 className={styles.storyTitle}>{story.story.title}</h1>
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

        {/* Story body */}
        <div className={styles.storyBody}>
          {story.story.paragraphs.map((p, i) => (
            <>
              <p key={i} className={styles.paragraph}>
                {p.paragraph}
              </p>
              {/* decorative separator every 5 paragraphs */}
              {(i + 1) % 5 === 0 && i !== story.story.paragraphs.length - 1 && (
                <div key={`sep-${i}`} className={styles.paragraphSep}>
                  ✦ ✦ ✦
                </div>
              )}
            </>
          ))}
        </div>

        {/* Bottom like */}
        <div className={styles.bottomActions}>
          <button
            className={`${styles.likeBtnLarge} ${liked ? styles.likeBtnLargeActive : ""}`}
            onClick={handleLike}
          >
            <HeartIcon filled={liked} />
            {liked ? "You liked this tale" : "Like this tale"}
            <span className={styles.likeCount}>{likeCount}</span>
          </button>
        </div>
      </div>

      <ToastContainer />
    </div>
  );
}
