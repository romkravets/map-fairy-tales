export default function Preloader() {
  return (
    <div
      role="status"
      aria-label="Loading content"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "50vh",
        gap: "16px",
      }}
    >
      {/* Spinning ring */}
      <div
        style={{
          width: "44px",
          height: "44px",
          borderRadius: "50%",
          border: "2px solid rgba(80, 140, 220, 0.12)",
          borderTop: "2px solid rgba(100, 180, 255, 0.8)",
          animation: "preloaderSpin 0.9s linear infinite",
        }}
      />

      <p
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: "10px",
          letterSpacing: "0.35em",
          textTransform: "uppercase",
          color: "rgba(100, 160, 220, 0.5)",
          margin: 0,
          animation: "preloaderPulse 1.8s ease-in-out infinite",
        }}
      ></p>

      <style>{`
        @keyframes preloaderSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes preloaderPulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
