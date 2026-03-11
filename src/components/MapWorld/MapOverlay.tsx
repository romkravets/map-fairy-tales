// MapOverlay.tsx
// SVG overlay з корабликами, хмарами, літаками і казковими іконками на великих країнах
// Розміщується поверх мапи, pointer-events: none — не заважає кліку по країнах

import React from "react";

// ── Типи ────────────────────────────────────────────
interface FloatingItem {
  id: string;
  emoji: string;
  x: string;   // % від ширини контейнера
  y: string;   // % від висоти
  size: number;
  animClass: string;
  opacity: number;
}

// ── Кораблики та об'єкти в океані ───────────────────
const OCEAN_ITEMS: FloatingItem[] = [
  // Атлантика
  { id: "ship1",    emoji: "⛵", x: "22%", y: "42%", size: 22, animClass: "sailLeft",  opacity: 0.75 },
  { id: "ship2",    emoji: "🚢", x: "18%", y: "55%", size: 18, animClass: "sailRight", opacity: 0.6  },
  { id: "whale1",   emoji: "🐋", x: "14%", y: "48%", size: 20, animClass: "bob",       opacity: 0.65 },
  { id: "fish1",    emoji: "🐬", x: "25%", y: "60%", size: 16, animClass: "sailLeft",  opacity: 0.55 },
  // Тихий океан
  { id: "ship3",    emoji: "⛵", x: "78%", y: "38%", size: 22, animClass: "sailRight", opacity: 0.7  },
  { id: "ship4",    emoji: "🚢", x: "82%", y: "52%", size: 20, animClass: "sailLeft",  opacity: 0.6  },
  { id: "whale2",   emoji: "🐳", x: "86%", y: "45%", size: 24, animClass: "bob",       opacity: 0.6  },
  { id: "fish2",    emoji: "🐠", x: "75%", y: "58%", size: 16, animClass: "sailRight", opacity: 0.5  },
  // Індійський океан
  { id: "ship5",    emoji: "⛵", x: "64%", y: "62%", size: 20, animClass: "sailLeft",  opacity: 0.65 },
  { id: "turtle1",  emoji: "🐢", x: "60%", y: "68%", size: 16, animClass: "bob",       opacity: 0.55 },
  // Арктика / північ
  { id: "ice1",     emoji: "🧊", x: "48%", y: "8%",  size: 18, animClass: "bob",       opacity: 0.45 },
  { id: "polar1",   emoji: "🐻‍❄️", x: "52%", y: "6%", size: 20, animClass: "bob",      opacity: 0.5  },
  // Антарктика
  { id: "penguin1", emoji: "🐧", x: "45%", y: "92%", size: 20, animClass: "bob",       opacity: 0.6  },
  { id: "penguin2", emoji: "🐧", x: "55%", y: "94%", size: 18, animClass: "bob",       opacity: 0.5  },
];

// ── Хмари і літаки ───────────────────────────────────
const SKY_ITEMS: FloatingItem[] = [
  { id: "cloud1",   emoji: "☁️",  x: "8%",  y: "12%", size: 28, animClass: "cloudDrift1", opacity: 0.35 },
  { id: "cloud2",   emoji: "⛅",  x: "35%", y: "7%",  size: 24, animClass: "cloudDrift2", opacity: 0.3  },
  { id: "cloud3",   emoji: "☁️",  x: "65%", y: "10%", size: 32, animClass: "cloudDrift1", opacity: 0.3  },
  { id: "cloud4",   emoji: "☁️",  x: "88%", y: "15%", size: 26, animClass: "cloudDrift2", opacity: 0.25 },
  { id: "plane1",   emoji: "✈️",  x: "30%", y: "14%", size: 20, animClass: "flyRight",    opacity: 0.55 },
  { id: "plane2",   emoji: "✈️",  x: "70%", y: "20%", size: 18, animClass: "flyLeft",     opacity: 0.45 },
  { id: "balloon1", emoji: "🎈",  x: "92%", y: "25%", size: 20, animClass: "balloonRise", opacity: 0.5  },
  { id: "star1",    emoji: "⭐",  x: "5%",  y: "5%",  size: 14, animClass: "twinkle",     opacity: 0.4  },
  { id: "star2",    emoji: "🌟",  x: "95%", y: "8%",  size: 16, animClass: "twinkle",     opacity: 0.35 },
  { id: "moon1",    emoji: "🌙",  x: "96%", y: "4%",  size: 22, animClass: "bob",         opacity: 0.5  },
];

// ── Казкові іконки на великих країнах ────────────────
// Координати підібрані відносно проєкції мапи (rotate: [-10,0,0], scale: 155)
const COUNTRY_ICONS: FloatingItem[] = [
  // Росія
  { id: "ru",  emoji: "🏔️", x: "62%", y: "22%", size: 20, animClass: "bob", opacity: 0.6 },
  // Канада
  { id: "ca",  emoji: "🍁", x: "17%", y: "20%", size: 22, animClass: "bob", opacity: 0.65 },
  // США
  { id: "us",  emoji: "🗽", x: "15%", y: "33%", size: 20, animClass: "bob", opacity: 0.6 },
  // Бразилія
  { id: "br",  emoji: "🌴", x: "30%", y: "62%", size: 20, animClass: "bob", opacity: 0.6 },
  // Австралія
  { id: "au",  emoji: "🦘", x: "76%", y: "68%", size: 22, animClass: "bob", opacity: 0.65 },
  // Китай
  { id: "cn",  emoji: "🐉", x: "70%", y: "30%", size: 22, animClass: "bob", opacity: 0.6 },
  // Індія
  { id: "in",  emoji: "🐘", x: "64%", y: "38%", size: 20, animClass: "bob", opacity: 0.6 },
  // Африка
  { id: "af",  emoji: "🦁", x: "51%", y: "55%", size: 22, animClass: "bob", opacity: 0.6 },
  // Єгипет
  { id: "eg",  emoji: "🐫", x: "53%", y: "38%", size: 18, animClass: "bob", opacity: 0.55 },
  // Мексика
  { id: "mx",  emoji: "🌵", x: "13%", y: "40%", size: 18, animClass: "bob", opacity: 0.55 },
  // Аргентина
  { id: "ar",  emoji: "🐧", x: "27%", y: "78%", size: 18, animClass: "bob", opacity: 0.55 },
  // Норвегія
  { id: "no",  emoji: "🌌", x: "49%", y: "15%", size: 18, animClass: "twinkle", opacity: 0.55 },
  // Японія
  { id: "jp",  emoji: "⛩️", x: "77%", y: "30%", size: 18, animClass: "bob", opacity: 0.55 },
  // Саудівська Аравія
  { id: "sa",  emoji: "🕌", x: "58%", y: "38%", size: 18, animClass: "bob", opacity: 0.5 },
  // Перу / Амазонія
  { id: "pe",  emoji: "🦜", x: "23%", y: "58%", size: 18, animClass: "bob", opacity: 0.55 },
  // Монголія
  { id: "mn",  emoji: "🏕️", x: "68%", y: "24%", size: 18, animClass: "bob", opacity: 0.5 },
  // Ісландія
  { id: "is",  emoji: "🌋", x: "38%", y: "14%", size: 18, animClass: "bob", opacity: 0.55 },
  // Казка — чарівна паличка
  { id: "magic1", emoji: "🪄", x: "44%", y: "30%", size: 16, animClass: "twinkle", opacity: 0.4 },
  { id: "magic2", emoji: "✨",  x: "56%", y: "25%", size: 14, animClass: "twinkle", opacity: 0.35 },
];

// ── CSS анімації (inline, без гідратації) ────────────
const ANIMATIONS = `
  @keyframes sailLeft {
    0%   { transform: translateX(0px) rotate(0deg); }
    50%  { transform: translateX(-18px) rotate(-2deg); }
    100% { transform: translateX(0px) rotate(0deg); }
  }
  @keyframes sailRight {
    0%   { transform: translateX(0px) rotate(0deg); }
    50%  { transform: translateX(18px) rotate(2deg); }
    100% { transform: translateX(0px) rotate(0deg); }
  }
  @keyframes bob {
    0%   { transform: translateY(0px); }
    50%  { transform: translateY(-6px); }
    100% { transform: translateY(0px); }
  }
  @keyframes cloudDrift1 {
    0%   { transform: translateX(0px); }
    50%  { transform: translateX(24px); }
    100% { transform: translateX(0px); }
  }
  @keyframes cloudDrift2 {
    0%   { transform: translateX(0px); }
    50%  { transform: translateX(-20px); }
    100% { transform: translateX(0px); }
  }
  @keyframes flyRight {
    0%   { transform: translateX(-30px); opacity: 0; }
    10%  { opacity: 0.55; }
    90%  { opacity: 0.55; }
    100% { transform: translateX(120px); opacity: 0; }
  }
  @keyframes flyLeft {
    0%   { transform: translateX(30px) scaleX(-1); opacity: 0; }
    10%  { opacity: 0.45; }
    90%  { opacity: 0.45; }
    100% { transform: translateX(-120px) scaleX(-1); opacity: 0; }
  }
  @keyframes balloonRise {
    0%   { transform: translateY(0px) rotate(-3deg); }
    50%  { transform: translateY(-20px) rotate(3deg); }
    100% { transform: translateY(0px) rotate(-3deg); }
  }
  @keyframes twinkle {
    0%, 100% { opacity: 0.2; transform: scale(0.85); }
    50%      { opacity: 0.7; transform: scale(1.15); }
  }
`;

// ── Тривалості анімацій ──────────────────────────────
const ANIM_DURATIONS: Record<string, string> = {
  sailLeft:    "8s",
  sailRight:   "10s",
  bob:         "4s",
  cloudDrift1: "18s",
  cloudDrift2: "22s",
  flyRight:    "14s",
  flyLeft:     "16s",
  balloonRise: "6s",
  twinkle:     "3s",
};

// ── Затримки (щоб не всі синхронно) ──────────────────
const getDelay = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 3) - h);
  return `${(Math.abs(h) % 80) / 10}s`;
};

// ── Компонент ────────────────────────────────────────
const MapOverlay: React.FC = () => {
  const all = [...OCEAN_ITEMS, ...SKY_ITEMS, ...COUNTRY_ICONS];

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 2,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <style>{ANIMATIONS}</style>

      {all.map((item) => (
        <div
          key={item.id}
          style={{
            position: "absolute",
            left: item.x,
            top: item.y,
            fontSize: item.size,
            opacity: item.opacity,
            lineHeight: 1,
            userSelect: "none",
            animation: `${item.animClass} ${ANIM_DURATIONS[item.animClass]} ease-in-out ${getDelay(item.id)} infinite`,
            filter: "drop-shadow(0 1px 4px rgba(0,10,40,0.5))",
            // flyRight/flyLeft — абсолютний незалежний цикл
            ...(item.animClass === "flyRight" || item.animClass === "flyLeft"
              ? { animationIterationCount: "infinite" }
              : {}),
          }}
        >
          {item.emoji}
        </div>
      ))}
    </div>
  );
};

export default MapOverlay;
