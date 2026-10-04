import React, { useEffect, useState, useRef } from "react";

export interface WolfLoaderProps {
  mode?: "centered" | "inline" | "card";
  size?: "sm" | "md" | "lg";
  message?: string;
  subMessage?: string;
  durationMs?: number; // default 1000ms
  onComplete?: () => void;
}

/**
 * Triggers the small centered Cyber Wolf loading animation programmatically
 * for any custom event or server fetch action across the application.
 */
export const triggerWolfLoad = (
  message?: string,
  durationMs: number = 1000,
  subMessage?: string
) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("nexus-wolf-load", {
        detail: {
          message: message || "Connecting to Server...",
          subMessage: subMessage || "Fetching live data...",
          durationMs,
        },
      })
    );
  }
};

export const WolfLoader: React.FC<WolfLoaderProps> = ({
  mode = "centered",
  size = "md",
  message = "Loading...",
  subMessage,
  durationMs = 1000,
  onComplete,
}) => {
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    // Smooth progress animation over durationMs (0% -> 100% in 1s)
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.max(15, Math.floor((elapsed / durationMs) * 100)));
      setProgress(pct);

      if (elapsed >= durationMs) {
        clearInterval(interval);
        if (onComplete) onComplete();
      }
    }, 25);

    return () => clearInterval(interval);
  }, [durationMs, onComplete]);

  const cardWidth = size === "sm" ? "125px" : size === "lg" ? "170px" : "150px";
  const imgSize = size === "sm" ? "105px" : size === "lg" ? "150px" : "130px";

  // Card Content
  const loaderCard = (
    <div
      style={{
        width: cardWidth,
        background: "rgba(10, 15, 29, 0.94)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(56, 189, 248, 0.5)",
        borderRadius: "16px",
        padding: "10px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        boxShadow: "0 12px 40px rgba(0, 0, 0, 0.8), 0 0 30px rgba(56, 189, 248, 0.4)",
        overflow: "hidden",
        animation: "wolfCardPop 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
        pointerEvents: "auto",
        userSelect: "none",
      }}
    >
      {/* Wolf Howling at Moon Image Container */}
      <div
        style={{
          width: imgSize,
          height: imgSize,
          borderRadius: "12px",
          overflow: "hidden",
          position: "relative",
          boxShadow: "0 0 16px rgba(56, 189, 248, 0.5)",
          border: "1px solid rgba(56, 189, 248, 0.35)",
          background: "#050b14",
        }}
      >
        <img
          src="/wolf-moon-loading.jpg"
          alt="Wolf Loading"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            animation: "wolfImagePulse 1.6s ease-in-out infinite",
          }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/wolf-loader.jpg";
          }}
        />

        {/* Dynamic Moonlight Glow Overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(circle at 50% 28%, rgba(56, 189, 248, 0.22) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Dynamic Animated Progress Bar */}
      <div
        style={{
          width: "100%",
          marginTop: "10px",
          display: "flex",
          flexDirection: "column",
          gap: "5px",
        }}
      >
        {/* Glow Bar Track */}
        <div
          style={{
            width: "100%",
            height: "5px",
            background: "rgba(255, 255, 255, 0.12)",
            borderRadius: "10px",
            overflow: "hidden",
            position: "relative",
            border: "1px solid rgba(56, 189, 248, 0.35)",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "linear-gradient(90deg, #0284c7, #38bdf8, #818cf8)",
              borderRadius: "10px",
              boxShadow: "0 0 12px #38bdf8",
              transition: "width 0.04s linear",
            }}
          />
        </div>

        {/* Loading Action Label */}
        <div
          style={{
            fontSize: size === "sm" ? "10px" : "11px",
            fontWeight: "700",
            color: "#38bdf8",
            textAlign: "center",
            letterSpacing: "0.3px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            textShadow: "0 0 8px rgba(56, 189, 248, 0.6)",
          }}
        >
          {message}
        </div>
        {subMessage && (
          <div
            style={{
              fontSize: "9px",
              color: "#94a3b8",
              textAlign: "center",
              marginTop: "1px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {subMessage}
          </div>
        )}
      </div>

      {/* Embedded Animations */}
      <style>{`
        @keyframes wolfCardPop {
          0% { transform: scale(0.85); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes wolfImagePulse {
          0%, 100% { filter: brightness(1) drop-shadow(0 0 4px rgba(56, 189, 248, 0.35)); }
          50% { filter: brightness(1.12) drop-shadow(0 0 12px rgba(56, 189, 248, 0.7)); }
        }
      `}</style>
    </div>
  );

  // Centered mode is placed compactly in the center of the viewport (NOT full screen)
  if (mode === "centered") {
    return (
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 999999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        {loaderCard}
      </div>
    );
  }

  return loaderCard;
};

/**
 * Helper to generate human-readable loading messages from button text
 */
function formatActionMessage(rawText: string): string {
  const clean = rawText.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  if (!clean || clean.length > 32) return "Fetching Data...";

  const lower = clean.toLowerCase();

  // Smart verb heuristics for common super-app buttons
  if (lower.includes("book")) return "Booking Ride...";
  if (lower.includes("order") && lower.includes("place")) return "Placing Order...";
  if (lower.includes("order")) return "Ordering...";
  if (lower.includes("cart") && lower.includes("add")) return "Adding to Cart...";
  if (lower.includes("checkout")) return "Processing Checkout...";
  if (lower.includes("top up") || lower.includes("topup")) return "Processing Top Up...";
  if (lower.includes("pay") || lower.includes("send money")) return "Processing Payment...";
  if (lower.includes("send")) return "Sending Message...";
  if (lower.includes("search")) return "Searching...";
  if (lower.includes("filter")) return "Filtering Results...";
  if (lower.includes("track")) return "Fetching Status...";
  if (lower.includes("login") || lower.includes("sign in")) return "Signing in...";
  if (lower.includes("logout") || lower.includes("sign out")) return "Signing out...";
  if (lower.includes("switch")) return "Switching Role...";
  if (lower.includes("services")) return "Opening Services...";
  if (lower.includes("shop") || lower.includes("market")) return "Loading Shop...";
  if (lower.includes("chat")) return "Opening Chat...";
  if (lower.includes("wallet")) return "Opening Wallet...";
  if (lower.includes("home")) return "Opening Home...";
  if (lower.includes("food")) return "Opening Food...";
  if (lower.includes("mobility")) return "Opening Mobility...";

  if (clean.endsWith("...")) return clean;
  return `${clean}...`;
}

/**
 * GlobalWolfLoader component:
 * Mounts at the root of the app and automatically captures EVERY button click across
 * the entire application (including nested sub-portals, modals, feature cards, and bottom tabs)
 * triggering the small centered WolfLoader for 1.0 second (1000ms) with zero latency delay!
 */
export const GlobalWolfLoader: React.FC = () => {
  const [loadingState, setLoadingState] = useState<{
    active: boolean;
    message: string;
    subMessage?: string;
    durationMs: number;
    key: number;
  } | null>(null);

  const timeoutRef = useRef<any>(null);

  useEffect(() => {
    // 1. Listen for programmatic triggerWolfLoad() events
    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{
        message?: string;
        subMessage?: string;
        durationMs?: number;
      }>;
      const message = customEvent.detail?.message || "Connecting to Server...";
      const subMessage = customEvent.detail?.subMessage || "Fetching live data...";
      const durationMs = customEvent.detail?.durationMs || 1000;

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setLoadingState({
        active: true,
        message,
        subMessage,
        durationMs,
        key: Date.now(),
      });

      timeoutRef.current = setTimeout(() => {
        setLoadingState(null);
      }, durationMs);
    };

    // 2. Global Button Click Interceptor for EVERY button activity across the entire app
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Ignore text input focus, typing, selects and textareas
      const isInput = target.closest("input:not([type='button']):not([type='submit']), textarea, select");
      if (isInput) return;

      // Find nearest button or clickable action element
      const clickable = target.closest(
        "button, [role='button'], input[type='button'], input[type='submit'], a, .nexus-btn, .tab-btn, .feature-card, [data-wolf-btn='true']"
      ) as HTMLElement | null;

      if (!clickable) return;

      // Don't show if explicitly opted out
      if (clickable.getAttribute("data-no-wolf") === "true") return;

      // Extract button label or title
      const rawText = (
        clickable.innerText ||
        clickable.getAttribute("aria-label") ||
        clickable.getAttribute("title") ||
        ""
      ).trim();

      const actionMsg = formatActionMessage(rawText);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setLoadingState({
        active: true,
        message: actionMsg,
        subMessage: "Server fetching data...",
        durationMs: 1000,
        key: Date.now(),
      });

      timeoutRef.current = setTimeout(() => {
        setLoadingState(null);
      }, 1000);
    };

    window.addEventListener("nexus-wolf-load", handleCustomEvent);
    document.addEventListener("click", handleGlobalClick, { capture: true, passive: true });

    return () => {
      window.removeEventListener("nexus-wolf-load", handleCustomEvent);
      document.removeEventListener("click", handleGlobalClick, { capture: true });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!loadingState?.active) return null;

  return (
    <WolfLoader
      key={loadingState.key}
      mode="centered"
      size="md"
      message={loadingState.message}
      subMessage={loadingState.subMessage}
      durationMs={loadingState.durationMs}
    />
  );
};
