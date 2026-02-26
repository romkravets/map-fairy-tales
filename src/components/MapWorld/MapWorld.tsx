"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import { useRouter } from "next/navigation";
import styles from "./Mapworld.module.css";

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
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
};

const COMPASS_DIRS = [
  { label: "N", angle: 0 },
  { label: "S", angle: 180 },
  { label: "E", angle: 90 },
  { label: "W", angle: 270 },
];

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
    const timer = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleClick = useCallback(
    (region: string, id: string) => () => {
      setClickedCountry(region);
      setTimeout(() => {
        router.push(`/stories?region=${region}&id=${id}`);
      }, 600);
    },
    [router],
  );

  const handleMouseMove = useCallback(
    (name: string) => (e: React.MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setTooltip({ name, x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
      setHoveredCountry(name);
    },
    [],
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
    setHoveredCountry(null);
  }, []);

  const handleMoveEnd = useCallback(
    (pos: { coordinates: [number, number]; zoom: number }) => {
      setPosition(pos);
    },
    [],
  );

  return (
    <div className={styles.mapUniverse} ref={containerRef}>
      <div className={styles.starsLayer} />
      <div className={styles.oceanGlow} />
      <div className={styles.vignette} />

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
            onMoveEnd={handleMoveEnd}
            maxZoom={8}
          >
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
          </ZoomableGroup>
        </ComposableMap>
      </div>

      {tooltip && (
        <div
          className={styles.mapTooltip}
          style={{ left: tooltip.x, top: tooltip.y - 8 }}
        >
          <div className={styles.tooltipInner}>
            <div className={styles.tooltipCountry}>{tooltip.name}</div>
            <div className={styles.tooltipCta}>click to explore tales</div>
          </div>
          <div className={styles.tooltipArrow} />
        </div>
      )}

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

      <div className={styles.compass}>
        <svg
          className={styles.compassSvg}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
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
