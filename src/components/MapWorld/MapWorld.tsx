"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
  Marker,
} from "react-simple-maps";
import { useRouter } from "next/navigation";
import styles from "./Mapworld.module.css";
import { COUNTRY_EMOJIS } from "@/helpers/countryEmojis";

const geoUrl = "/features.json";

const PALETTE = [
  "#1a3a5c",
  "#1e4976",
  "#16344f",
  "#0f2a3d",
  "#163d5a",
  "#1b4068",
  "#122e45",
  "#0d2535",
  "#1c3f61",
  "#17395a",
  "#0e2840",
  "#1a3b5e",
];

const getCountryColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
};

const COMPASS_DIRS = [
  { label: "N", angle: 0 },
  { label: "S", angle: 180 },
  { label: "E", angle: 90 },
  { label: "W", angle: 270 },
];

// ── Маркери прив'язані до географічних координат ─────
// [longitude, latitude]
const GEO_MARKERS = [
  // Країни
  { id: "ru", coords: [95, 62] as [number, number], emoji: "🏔️", label: "" },
  { id: "ca", coords: [-96, 62] as [number, number], emoji: "🍁", label: "" },
  { id: "us", coords: [-98, 38] as [number, number], emoji: "🗽", label: "" },
  { id: "br", coords: [-53, -12] as [number, number], emoji: "🌴", label: "" },
  { id: "au", coords: [134, -25] as [number, number], emoji: "🦘", label: "" },
  { id: "cn", coords: [103, 36] as [number, number], emoji: "🐉", label: "" },
  { id: "in", coords: [79, 22] as [number, number], emoji: "🐘", label: "" },
  { id: "cd", coords: [24, -4] as [number, number], emoji: "🦁", label: "" }, // Конго/Африка
  { id: "eg", coords: [30, 27] as [number, number], emoji: "🐫", label: "" },
  { id: "mx", coords: [-102, 24] as [number, number], emoji: "🌵", label: "" },
  { id: "ar", coords: [-64, -34] as [number, number], emoji: "🐧", label: "" },
  { id: "no", coords: [15, 68] as [number, number], emoji: "🌌", label: "" },
  { id: "jp", coords: [138, 37] as [number, number], emoji: "⛩️", label: "" },
  { id: "sa", coords: [45, 24] as [number, number], emoji: "🕌", label: "" },
  { id: "pe", coords: [-75, -9] as [number, number], emoji: "🦜", label: "" },
  { id: "mn", coords: [103, 46] as [number, number], emoji: "🏕️", label: "" },
  { id: "is", coords: [-19, 65] as [number, number], emoji: "🌋", label: "" },
  { id: "ua", coords: [32, 49] as [number, number], emoji: "🌻", label: "" },
  { id: "fr", coords: [2, 46] as [number, number], emoji: "🗼", label: "" },
  { id: "de", coords: [10, 51] as [number, number], emoji: "🏰", label: "" },
  { id: "gr", coords: [22, 39] as [number, number], emoji: "⚡", label: "" },
  { id: "nz", coords: [172, -41] as [number, number], emoji: "🧙", label: "" }, // Нова Зеландія
  { id: "ke", coords: [37, 0] as [number, number], emoji: "🦒", label: "" }, // Кенія
  { id: "th", coords: [101, 15] as [number, number], emoji: "🐯", label: "" }, // Таїланд

  // Океанські об'єкти
  {
    id: "ship_atlantic1",
    coords: [-35, 35] as [number, number],
    emoji: "⛵",
    label: "",
  },
  {
    id: "ship_atlantic2",
    coords: [-45, 15] as [number, number],
    emoji: "🚢",
    label: "",
  },
  {
    id: "whale_atlantic",
    coords: [-30, 48] as [number, number],
    emoji: "🐋",
    label: "",
  },
  {
    id: "dolphin_atlantic",
    coords: [-25, 22] as [number, number],
    emoji: "🐬",
    label: "",
  },

  {
    id: "ship_pacific1",
    coords: [-150, 30] as [number, number],
    emoji: "⛵",
    label: "",
  },
  {
    id: "ship_pacific2",
    coords: [-170, -5] as [number, number],
    emoji: "🚢",
    label: "",
  },
  {
    id: "whale_pacific",
    coords: [-160, 45] as [number, number],
    emoji: "🐳",
    label: "",
  },
  {
    id: "fish_pacific",
    coords: [-140, -15] as [number, number],
    emoji: "🐠",
    label: "",
  },

  {
    id: "ship_indian1",
    coords: [72, -15] as [number, number],
    emoji: "⛵",
    label: "",
  },
  {
    id: "turtle_indian",
    coords: [80, -25] as [number, number],
    emoji: "🐢",
    label: "",
  },
  {
    id: "dolphin_indian",
    coords: [65, -5] as [number, number],
    emoji: "🐬",
    label: "",
  },

  // Арктика
  {
    id: "polar_bear",
    coords: [0, 82] as [number, number],
    emoji: "🐻‍❄️",
    label: "",
  },
  { id: "ice1", coords: [60, 78] as [number, number], emoji: "🧊", label: "" },

  // Антарктика
  {
    id: "penguin1",
    coords: [0, -80] as [number, number],
    emoji: "🐧",
    label: "",
  },
  {
    id: "penguin2",
    coords: [90, -75] as [number, number],
    emoji: "🐧",
    label: "",
  },
];

// ── Хмари і літаки (% від контейнера, не рухаються з картою) ──
const SKY_ITEMS = [
  {
    id: "cloud1",
    emoji: "☁️",
    x: "8%",
    y: "10%",
    size: 28,
    anim: "cloudDrift1",
    dur: "18s",
    delay: "0s",
    opacity: 0.3,
  },
  {
    id: "cloud2",
    emoji: "⛅",
    x: "38%",
    y: "6%",
    size: 24,
    anim: "cloudDrift2",
    dur: "22s",
    delay: "4s",
    opacity: 0.28,
  },
  {
    id: "cloud3",
    emoji: "☁️",
    x: "68%",
    y: "9%",
    size: 30,
    anim: "cloudDrift1",
    dur: "20s",
    delay: "8s",
    opacity: 0.28,
  },
  {
    id: "cloud4",
    emoji: "☁️",
    x: "88%",
    y: "13%",
    size: 22,
    anim: "cloudDrift2",
    dur: "25s",
    delay: "2s",
    opacity: 0.25,
  },
  {
    id: "plane1",
    emoji: "✈️",
    x: "-5%",
    y: "14%",
    size: 20,
    anim: "flyRight",
    dur: "14s",
    delay: "0s",
    opacity: 0.55,
  },
  {
    id: "plane2",
    emoji: "✈️",
    x: "105%",
    y: "22%",
    size: 18,
    anim: "flyLeft",
    dur: "18s",
    delay: "6s",
    opacity: 0.45,
  },
  {
    id: "balloon1",
    emoji: "🎈",
    x: "91%",
    y: "28%",
    size: 20,
    anim: "balloonRise",
    dur: "6s",
    delay: "1s",
    opacity: 0.5,
  },
  {
    id: "moon1",
    emoji: "🌙",
    x: "94%",
    y: "4%",
    size: 24,
    anim: "bob",
    dur: "8s",
    delay: "0s",
    opacity: 0.55,
  },
  {
    id: "star1",
    emoji: "⭐",
    x: "4%",
    y: "4%",
    size: 14,
    anim: "twinkle",
    dur: "3s",
    delay: "0.5s",
    opacity: 0.4,
  },
  {
    id: "star2",
    emoji: "🌟",
    x: "93%",
    y: "88%",
    size: 16,
    anim: "twinkle",
    dur: "4s",
    delay: "1.5s",
    opacity: 0.35,
  },
];

const OVERLAY_CSS = `
  @keyframes cloudDrift1 { 0%,100%{transform:translateX(0)} 50%{transform:translateX(24px)} }
  @keyframes cloudDrift2 { 0%,100%{transform:translateX(0)} 50%{transform:translateX(-20px)} }
  @keyframes flyRight  { 0%{transform:translateX(0);opacity:0} 8%{opacity:0.55} 92%{opacity:0.55} 100%{transform:translateX(110vw);opacity:0} }
  @keyframes flyLeft   { 0%{transform:translateX(0) scaleX(-1);opacity:0} 8%{opacity:0.45} 92%{opacity:0.45} 100%{transform:translateX(-110vw) scaleX(-1);opacity:0} }
  @keyframes balloonRise { 0%,100%{transform:translateY(0) rotate(-3deg)} 50%{transform:translateY(-22px) rotate(3deg)} }
  @keyframes bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
  @keyframes twinkle { 0%,100%{opacity:0.15;transform:scale(0.8)} 50%{opacity:0.75;transform:scale(1.2)} }
  @keyframes markerBob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
`;

// ── Компонент ────────────────────────────────────────
const MapWorld = () => {
  const router = useRouter();
  const [tooltip, setTooltip] = useState<{
    name: string;
    x: number;
    y: number;
  } | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [clickedCountry, setClickedCountry] = useState<string | null>(null);
  const [position, setPosition] = useState({
    coordinates: [0, 0] as [number, number],
    zoom: 1,
  });
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  const handleClick = useCallback(
    (region: string, id: string) => () => {
      setClickedCountry(region);
      setTimeout(() => router.push(`/stories?region=${region}&id=${id}`), 600);
    },
    [router],
  );

  const handleMouseMove = useCallback(
    (name: string) => (e: React.MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect)
        setTooltip({ name, x: e.clientX - rect.left, y: e.clientY - rect.top });
      setHoveredCountry(name);
    },
    [],
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
    setHoveredCountry(null);
  }, []);

  // Розмір маркерів зменшується при зумі щоб не перекривати карту
  const markerSize = Math.max(12, 22 - position.zoom * 2);

  return (
    <div className={styles.mapUniverse} ref={containerRef}>
      <style>{OVERLAY_CSS}</style>

      <div className={styles.starsLayer} />
      <div className={styles.oceanGlow} />
      <div className={styles.vignette} />

      {/* ── Хмари і літаки (фіксовані, не залежать від зуму) ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        {SKY_ITEMS.map((item) => (
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
              pointerEvents: "none",
              animation: `${item.anim} ${item.dur} ease-in-out ${item.delay} infinite`,
              filter: "drop-shadow(0 1px 4px rgba(0,10,40,0.4))",
            }}
          >
            {item.emoji}
          </div>
        ))}
      </div>

      <header className={styles.mapHeader}>
        <div className={styles.mapTitleBlock}>
          <span className={styles.mapEyebrow}>World Atlas of</span>
          <h1 className={styles.mapTitle}>Fairy Tales</h1>
          <p className={styles.mapSubtitle}>
            Select a country to begin your journey
          </p>
        </div>
      </header>

      <div
        className={`${styles.mapWrapper} ${loaded ? styles.mapWrapperLoaded : ""}`}
      >
        <ComposableMap
          projectionConfig={{
            rotate: [-10, 0, 0],
            scale: 155,
            center: [0, -5],
          }}
          style={{ width: "100%", height: "100%" }}
        >
          <ZoomableGroup
            zoom={position.zoom}
            center={position.coordinates}
            onMoveEnd={(pos) => setPosition(pos)}
            maxZoom={8}
          >
            {/* ── Країни ── */}
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const name = geo.properties.name;
                  const isHovered = hoveredCountry === name;
                  const isClicked = clickedCountry === name;
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={
                        isClicked
                          ? "#c8a84b"
                          : isHovered
                            ? "#2a7abf"
                            : getCountryColor(name)
                      }
                      stroke={
                        isHovered
                          ? "rgba(120,200,255,0.8)"
                          : "rgba(100,180,255,0.15)"
                      }
                      strokeWidth={isHovered ? 0.8 : 0.4}
                      onClick={handleClick(name, geo.id)}
                      onMouseMove={handleMouseMove(name)}
                      onMouseLeave={handleMouseLeave}
                      style={{
                        default: { outline: "none" },
                        hover: { outline: "none", cursor: "pointer" },
                        pressed: { outline: "none", fill: "#c8a84b" },
                      }}
                    />
                  );
                })
              }
            </Geographies>

            {/* ── Geo-прив'язані маркери ── */}
            {GEO_MARKERS.map((m) => (
              <Marker key={m.id} coordinates={m.coords}>
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={markerSize}
                  style={{
                    userSelect: "none",
                    pointerEvents: "none",
                    filter: "drop-shadow(0 1px 3px rgba(0,10,40,0.6))",
                    animation: "markerBob 4s ease-in-out infinite",
                    // унікальна затримка щоб не боббали синхронно
                    animationDelay: `${(m.id.charCodeAt(0) % 8) * 0.5}s`,
                  }}
                >
                  {m.emoji}
                </text>
              </Marker>
            ))}
          </ZoomableGroup>
        </ComposableMap>
      </div>

      {/* ── Тултіп ── */}
      {tooltip && (
        <div
          className={styles.mapTooltip}
          style={{ left: tooltip.x, top: tooltip.y - 8 }}
        >
          <div className={styles.tooltipInner}>
            <div className={styles.tooltipCountry}>{tooltip.name}</div>
            {COUNTRY_EMOJIS[tooltip.name] && (
              <div className={styles.tooltipEmoji}>
                {COUNTRY_EMOJIS[tooltip.name]}
              </div>
            )}
            <div className={styles.tooltipCta}>click to explore tales</div>
          </div>
          <div className={styles.tooltipArrow} />
        </div>
      )}

      {/* ── Zoom controls ── */}
      <div className={styles.zoomControls}>
        <button
          className={styles.zoomBtn}
          onClick={() =>
            setPosition((p) => ({ ...p, zoom: Math.min(p.zoom * 1.5, 8) }))
          }
          title="Zoom in"
        >
          +
        </button>
        <button
          className={styles.zoomBtn}
          onClick={() =>
            setPosition((p) => ({ ...p, zoom: Math.max(p.zoom / 1.5, 1) }))
          }
          title="Zoom out"
        >
          −
        </button>
        <button
          className={styles.zoomBtn}
          style={{ fontSize: 13 }}
          onClick={() => setPosition({ coordinates: [0, 0], zoom: 1 })}
          title="Reset"
        >
          ⊙
        </button>
      </div>

      {/* ── Компас ── */}
      <div className={styles.compass}>
        <svg className={styles.compassSvg} viewBox="0 0 100 100" fill="none">
          <circle
            cx="50"
            cy="50"
            r="48"
            stroke="rgba(100,160,220,0.6)"
            strokeWidth="0.8"
          />
          <circle
            cx="50"
            cy="50"
            r="38"
            stroke="rgba(100,160,220,0.3)"
            strokeWidth="0.5"
            strokeDasharray="4 4"
          />
          <polygon
            points="50,4 54,46 50,50 46,46"
            fill="rgba(200,230,255,0.9)"
          />
          <polygon
            points="50,96 54,54 50,50 46,54"
            fill="rgba(100,150,200,0.5)"
          />
          <polygon
            points="4,50 46,46 50,50 46,54"
            fill="rgba(100,150,200,0.5)"
          />
          <polygon
            points="96,50 54,46 50,50 54,54"
            fill="rgba(100,150,200,0.5)"
          />
          <circle cx="50" cy="50" r="4" fill="rgba(150,200,255,0.8)" />
          {COMPASS_DIRS.map(({ label, angle }) => {
            const rad = ((angle - 90) * Math.PI) / 180;
            const r = 28;
            return (
              <text
                key={label}
                x={50 + r * Math.cos(rad)}
                y={50 + r * Math.sin(rad)}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="rgba(150,200,255,0.7)"
                fontSize="9"
                fontFamily="Cinzel, serif"
                fontWeight="600"
              >
                {label}
              </text>
            );
          })}
        </svg>
      </div>

      <div className={styles.scaleBar}>
        <div className={styles.scaleLine} />
        <span className={styles.scaleLabel}>5,000 km</span>
      </div>

      <p className={styles.mapHint}>
        ✦ &nbsp; Click any country to discover its tales &nbsp; ✦
      </p>
    </div>
  );
};

export default MapWorld;
