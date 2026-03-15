"use client";
import { useContext, useEffect, useState } from "react";
import { UserAuthBuilder } from "../../../context/context";
import { showNotification } from "@/helpers/showNotification";
import styles from "./CommentsSection.module.css";

// ── Types ────────────────────────────────────────────────────────────────

interface ReplyData {
  _id: string;
  authorUid: string;
  authorName: string;
  text: string;
  createdAt: string;
}

interface CommentData {
  _id: string;
  authorUid: string;
  authorName: string;
  text: string;
  createdAt: string;
  replies: ReplyData[];
}

interface Props {
  storyId: string;
  regionId: string;
  storyAuthorUid: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Icons ────────────────────────────────────────────────────────────────

const TrashIcon = () => (
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
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4h6v2" />
  </svg>
);

const ReplyIcon = () => (
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
    <polyline points="9 17 4 12 9 7" />
    <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
  </svg>
);

// ── Component ────────────────────────────────────────────────────────────

export default function CommentsSection({
  storyId,
  regionId,
  storyAuthorUid,
}: Props) {
  const { user } = useContext(UserAuthBuilder);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyOpen, setReplyOpen] = useState<Record<string, boolean>>({});
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replySubmitting, setReplySubmitting] = useState<
    Record<string, boolean>
  >({});

  // ── Fetch comments on mount ──────────────────────────────────────────
  useEffect(() => {
    if (!storyId) return;
    fetch(`/api/comments?storyId=${encodeURIComponent(storyId)}`)
      .then((r) => r.json())
      .then((data) => setComments(data.comments ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [storyId]);

  // ── Post comment ─────────────────────────────────────────────────────
  const handleSubmitComment = async () => {
    if (!user.isAuthenticated) {
      showNotification("Sign in to leave a comment", "success");
      return;
    }
    const trimmed = commentText.trim();
    if (!trimmed) return;
    if (trimmed.length > 2000) {
      showNotification("Comment is too long (max 2000 characters)", "success");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          storyId,
          regionId,
          text: trimmed,
          authorName: user.userName,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const { comment } = await res.json();
      setComments((prev) => [...prev, { ...comment, replies: [] }]);
      setCommentText("");
    } catch {
      showNotification("Could not post comment, please try again", "success");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete comment ───────────────────────────────────────────────────
  const handleDeleteComment = async (commentId: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (!res.ok) throw new Error();
      setComments((prev) => prev.filter((c) => c._id !== commentId));
    } catch {
      showNotification("Could not delete comment", "success");
    }
  };

  // ── Post reply ───────────────────────────────────────────────────────
  const handleSubmitReply = async (commentId: string) => {
    const trimmed = (replyText[commentId] ?? "").trim();
    if (!trimmed) return;
    if (trimmed.length > 1000) {
      showNotification("Reply is too long (max 1000 characters)", "success");
      return;
    }
    setReplySubmitting((prev) => ({ ...prev, [commentId]: true }));
    try {
      const res = await fetch(`/api/comments/${commentId}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ text: trimmed, authorName: user.userName }),
      });
      if (!res.ok) throw new Error();
      const { reply } = await res.json();
      setComments((prev) =>
        prev.map((c) =>
          c._id === commentId ? { ...c, replies: [...c.replies, reply] } : c,
        ),
      );
      setReplyText((prev) => ({ ...prev, [commentId]: "" }));
      setReplyOpen((prev) => ({ ...prev, [commentId]: false }));
    } catch {
      showNotification("Could not post reply", "success");
    } finally {
      setReplySubmitting((prev) => ({ ...prev, [commentId]: false }));
    }
  };

  // ── Delete reply ─────────────────────────────────────────────────────
  const handleDeleteReply = async (commentId: string, replyId: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}/reply/${replyId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (!res.ok) throw new Error();
      setComments((prev) =>
        prev.map((c) =>
          c._id === commentId
            ? { ...c, replies: c.replies.filter((r) => r._id !== replyId) }
            : c,
        ),
      );
    } catch {
      showNotification("Could not delete reply", "success");
    }
  };

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <section className={styles.section} aria-label="Comments">
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLine} />
        <h2 className={styles.headerTitle}>Scroll of Voices</h2>
        <div className={styles.headerLine} />
      </div>

      {/* New comment form */}
      {user.isAuthenticated ? (
        <div className={styles.form}>
          <textarea
            className={styles.textarea}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Share your thoughts about this tale…"
            maxLength={2000}
            rows={3}
            aria-label="Write a comment"
          />
          <div className={styles.formFooter}>
            <span className={styles.charCount}>
              {commentText.length} / 2000
            </span>
            <button
              className={styles.submitBtn}
              onClick={handleSubmitComment}
              disabled={submitting || !commentText.trim()}
            >
              {submitting ? "Posting…" : "Post Comment"}
            </button>
          </div>
        </div>
      ) : (
        <p className={styles.authPrompt}>Sign in to join the conversation</p>
      )}

      {/* Comment list */}
      {loading ? (
        <p className={styles.loadingText}>Loading voices…</p>
      ) : comments.length === 0 ? (
        <p className={styles.emptyText}>
          Be the first to leave a mark on this tale.
        </p>
      ) : (
        <ul className={styles.list} aria-label="Comment list">
          {comments.map((comment) => {
            const isCommentOwner = user.userId === comment.authorUid;
            const isStoryAuthor = comment.authorUid === storyAuthorUid;

            return (
              <li key={comment._id} className={styles.commentItem}>
                {/* Comment header */}
                <div className={styles.commentHeader}>
                  <div className={styles.authorBlock}>
                    <span className={styles.authorName}>
                      {comment.authorName || "Anonymous"}
                    </span>
                    {isStoryAuthor && (
                      <span
                        className={styles.authorBadge}
                        aria-label="Story author"
                      >
                        Author
                      </span>
                    )}
                  </div>
                  <div className={styles.commentMeta}>
                    <span className={styles.commentDate}>
                      {formatDate(comment.createdAt)}
                    </span>
                    {isCommentOwner && (
                      <button
                        className={styles.deleteBtn}
                        onClick={() => handleDeleteComment(comment._id)}
                        aria-label="Delete comment"
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                </div>

                {/* Comment body */}
                <p className={styles.commentText}>{comment.text}</p>

                {/* Replies */}
                {comment.replies.length > 0 && (
                  <ul className={styles.replyList} aria-label="Replies">
                    {comment.replies.map((reply) => {
                      const isReplyOwner = user.userId === reply.authorUid;
                      const isReplyAuthor = reply.authorUid === storyAuthorUid;
                      return (
                        <li key={reply._id} className={styles.replyItem}>
                          <div className={styles.commentHeader}>
                            <div className={styles.authorBlock}>
                              <span className={styles.authorName}>
                                {reply.authorName || "Anonymous"}
                              </span>
                              {isReplyAuthor && (
                                <span
                                  className={styles.authorBadge}
                                  aria-label="Story author"
                                >
                                  Author
                                </span>
                              )}
                            </div>
                            <div className={styles.commentMeta}>
                              <span className={styles.commentDate}>
                                {formatDate(reply.createdAt)}
                              </span>
                              {isReplyOwner && (
                                <button
                                  className={styles.deleteBtn}
                                  onClick={() =>
                                    handleDeleteReply(comment._id, reply._id)
                                  }
                                  aria-label="Delete reply"
                                >
                                  <TrashIcon />
                                </button>
                              )}
                            </div>
                          </div>
                          <p className={styles.commentText}>{reply.text}</p>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* Reply toggle + form */}
                {user.isAuthenticated && (
                  <div className={styles.replySection}>
                    {!replyOpen[comment._id] ? (
                      <button
                        className={styles.replyToggleBtn}
                        onClick={() =>
                          setReplyOpen((prev) => ({
                            ...prev,
                            [comment._id]: true,
                          }))
                        }
                      >
                        <ReplyIcon /> Reply
                      </button>
                    ) : (
                      <div className={styles.replyForm}>
                        <textarea
                          className={`${styles.textarea} ${styles.textareaSmall}`}
                          value={replyText[comment._id] ?? ""}
                          onChange={(e) =>
                            setReplyText((prev) => ({
                              ...prev,
                              [comment._id]: e.target.value,
                            }))
                          }
                          placeholder="Write a reply…"
                          maxLength={1000}
                          rows={2}
                          aria-label="Write a reply"
                        />
                        <div className={styles.formFooter}>
                          <button
                            className={styles.cancelBtn}
                            onClick={() =>
                              setReplyOpen((prev) => ({
                                ...prev,
                                [comment._id]: false,
                              }))
                            }
                          >
                            Cancel
                          </button>
                          <button
                            className={styles.submitBtn}
                            onClick={() => handleSubmitReply(comment._id)}
                            disabled={
                              replySubmitting[comment._id] ||
                              !(replyText[comment._id] ?? "").trim()
                            }
                          >
                            {replySubmitting[comment._id]
                              ? "Posting…"
                              : "Reply"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
