"use client";
import { useState, useRef, useEffect } from "react";
import { useAccessibility } from "@/context/AccessibilityContext";
import styles from "./AccessibilityPanel.module.css";

export default function AccessibilityPanel() {
  const { settings, update, reset } = useAccessibility();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggles: { key: keyof typeof settings; label: string; icon: string }[] =
    [
      { key: "reducedMotion", label: "Reduce animations", icon: "🎬" },
      { key: "highContrast", label: "High contrast", icon: "🔆" },
      { key: "largeText", label: "Large text", icon: "🔤" },
      { key: "dyslexiaFont", label: "Dyslexia-friendly font", icon: "📖" },
    ];

  const anyActive = Object.values(settings).some(Boolean);

  return (
    <div className={styles.wrapper} ref={panelRef}>
      <button
        ref={btnRef}
        className={`${styles.trigger} ${anyActive ? styles.triggerActive : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Accessibility settings"
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Accessibility settings"
      >
        <svg
          aria-hidden="true"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="4.5" r="2.5" />
          <path d="M12 7v5" />
          <path d="M8 11l4 1 4-1" />
          <path d="M10 17l2 5" />
          <path d="M14 17l-2 5" />
        </svg>
      </button>

      {open && (
        <div
          className={styles.panel}
          role="dialog"
          aria-label="Accessibility settings"
        >
          <h3 className={styles.title}>Accessibility</h3>

          {toggles.map(({ key, label, icon }) => (
            <label key={key} className={styles.toggle}>
              <span className={styles.toggleLabel}>
                <span aria-hidden="true">{icon}</span> {label}
              </span>
              <input
                type="checkbox"
                className={styles.toggleInput}
                checked={settings[key]}
                onChange={(e) => update(key, e.target.checked)}
                role="switch"
                aria-checked={settings[key]}
              />
              <span
                className={`${styles.toggleTrack} ${settings[key] ? styles.toggleTrackOn : ""}`}
              >
                <span className={styles.toggleThumb} />
              </span>
            </label>
          ))}

          {anyActive && (
            <button className={styles.resetBtn} onClick={reset}>
              Reset all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
