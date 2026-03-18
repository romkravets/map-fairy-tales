"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import styles from "./ExploreFeed.module.css";

type SortType = "views" | "likes" | "comments";

interface StoryCard {
  storyId: string;
  countryId: string;
  region: string;
  title: string;
  imageUrl: string;
  viewCount: number;
  likesCount: number;
  commentsCount: number;
  excerpt: string;
  avgRating?: number;
  ratingCount?: number;
}

const SORT_LABELS: Record<SortType, string> = {
  views: "👁 Views",
  likes: "♥ Likes",
  comments: "💬 Comments",
};

export default function ExploreFeed() {
  const [stories, setStories] = useState<StoryCard[]>([]);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState<SortType>("views");
  const [search, setSearch] = useState("");
  const [minRating, setMinRating] = useState<number>(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchStories = async (
    s: SortType,
    q: string,
    p: number,
    append: boolean,
  ) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);
    try {
      const params = new URLSearchParams({
        sort: s,
        search: q,
        page: String(p),
      });
      if (minRating && minRating > 0)
        params.set("minRating", String(minRating));
      const res = await fetch(`/api/stories/feed?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setStories((prev) =>
        append ? [...prev, ...data.stories] : data.stories,
      );
      setTotal(data.total);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Re-fetch when sort changes
  useEffect(() => {
    setPage(0);
    fetchStories(sort, search, 0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, minRating]);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(0);
      fetchStories(sort, search, 0, false);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, minRating]);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchStories(sort, search, next, true);
  };

  const hasMore = stories.length < total;

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.hero}>
        <h1 className={styles.title}>✦ Explore Stories</h1>
        <p className={styles.subtitle}>
          Public stories from around the world — sorted by what matters
        </p>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.searchWrap}>
          <svg
            className={styles.searchIcon}
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
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className={styles.searchInput}
            type="search"
            placeholder="Search stories by title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search stories"
          />
        </div>

        <div className={styles.sortTabs} role="tablist" aria-label="Sort by">
          {(Object.keys(SORT_LABELS) as SortType[]).map((s) => (
            <button
              key={s}
              role="tab"
              aria-selected={sort === s}
              className={`${styles.sortTab} ${sort === s ? styles.sortTabActive : ""}`}
              onClick={() => setSort(s)}
            >
              {SORT_LABELS[s]}
            </button>
          ))}
        </div>
        <div className={styles.ratingFilter}>
          <span className={styles.ratingLabel}>Rating</span>
          <div
            className={styles.ratingStars}
            role="group"
            aria-label="Minimum rating filter"
          >
            {[1, 2, 3, 4, 5].map((r) => (
              <button
                key={r}
                type="button"
                className={`${styles.starBtn} ${minRating >= r ? styles.starActive : ""}`}
                onClick={() => setMinRating(minRating === r ? 0 : r)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setMinRating(minRating === r ? 0 : r);
                  }
                }}
                aria-pressed={minRating >= r}
                aria-label={`${r} star${r > 1 ? "s" : ""} and up`}
              >
                ★
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results count */}
      {!loading && (
        <p className={styles.resultsInfo}>
          {total} {total === 1 ? "story" : "stories"} found
        </p>
      )}

      {/* Grid */}
      {loading ? (
        <div className={styles.loadingWrap} aria-label="Loading stories">
          <span className={styles.loadingDot} />
          <span className={styles.loadingDot} />
          <span className={styles.loadingDot} />
        </div>
      ) : stories.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>✦</span>
          <p className={styles.emptyText}>No stories found</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {stories.map((s) => (
            <Link
              key={`${s.countryId}-${s.storyId}`}
              href={`/story?region=${s.countryId}&id=${s.storyId}`}
              className={styles.card}
            >
              {s.imageUrl ? (
                <img
                  src={s.imageUrl}
                  alt={s.title}
                  className={styles.cardImage}
                  loading="lazy"
                />
              ) : (
                <div className={styles.cardImagePlaceholder} aria-hidden="true">
                  ✦
                </div>
              )}
              <div className={styles.cardBody}>
                {(s.region || s.countryId) && (
                  <span className={styles.cardCountry}>
                    {s.region || s.countryId}
                  </span>
                )}
                <h2 className={styles.cardTitle}>{s.title}</h2>
                {s.excerpt && <p className={styles.cardExcerpt}>{s.excerpt}</p>}
                <div className={styles.cardMeta}>
                  <span title="Views">👁 {s.viewCount}</span>
                  <span title="Likes">♥ {s.likesCount}</span>
                  <span title="Comments">💬 {s.commentsCount}</span>
                  <span title="Rating" className={styles.cardRating}>
                    ★{" "}
                    {typeof s.avgRating === "number"
                      ? s.avgRating.toFixed(1)
                      : "—"}
                    {s.ratingCount ? ` (${s.ratingCount})` : ""}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && !loading && (
        <div className={styles.loadMoreWrap}>
          <button
            className={styles.loadMoreBtn}
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading…" : "Load more stories"}
          </button>
        </div>
      )}
    </div>
  );
}
