"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface AccessibilitySettings {
  reducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  dyslexiaFont: boolean;
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
  reducedMotion: false,
  highContrast: false,
  largeText: false,
  dyslexiaFont: false,
};

const STORAGE_KEY = "a11y-settings";

interface AccessibilityContextValue {
  settings: AccessibilitySettings;
  update: (key: keyof AccessibilitySettings, value: boolean) => void;
  reset: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue>({
  settings: DEFAULT_SETTINGS,
  update: () => {},
  reset: () => {},
});

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_SETTINGS);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setSettings(JSON.parse(saved));
    } catch {}

    // Respect OS-level prefers-reduced-motion
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setSettings((prev) => ({ ...prev, reducedMotion: true }));
    }
  }, []);

  // Apply classes to <html> whenever settings change
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("a11y-reduced-motion", settings.reducedMotion);
    root.classList.toggle("a11y-high-contrast", settings.highContrast);
    root.classList.toggle("a11y-large-text", settings.largeText);
    root.classList.toggle("a11y-dyslexia-font", settings.dyslexiaFont);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  const update = (key: keyof AccessibilitySettings, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const reset = () => setSettings(DEFAULT_SETTINGS);

  return (
    <AccessibilityContext.Provider value={{ settings, update, reset }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export const useAccessibility = () => useContext(AccessibilityContext);
