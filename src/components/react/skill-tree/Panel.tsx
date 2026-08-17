/* Physics settings panel (desktop only). */

import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useDelayedUnmount } from "../lib/animation";
import { useTreeText } from "./text";
import type { PhysicsConfig } from "./types";

const EXIT_MS = 200;

const mono: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "10px",
  letterSpacing: ".08em",
};

/* Matches the .plate utility; inline because this renders inside SVG-
   adjacent absolutely-positioned chrome with no class hooks. */
const plate: CSSProperties = {
  background: "var(--surface-plate)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-plate)",
};

/* ── Button marks ──────────────────────────────────────────────
   Drawn, not typed. The three characters these replace — U+2699
   GEAR, U+2715 MULTIPLICATION X and U+21BA ANTICLOCKWISE OPEN
   CIRCLE ARROW — are in the cmap of neither Geist nor Geist Mono,
   so each fell through to whatever the OS offers; U+2699 in
   particular arrives as a full-colour emoji on
   Android and most Linux desktops, which is the one thing a
   monochrome drafting set cannot absorb.

   Hairline strokes in currentColor, so they inherit the button's
   own colour and its hover/disabled states. Each sits beside its
   own text label, so all three are aria-hidden rather than
   labelled — a name here would only be read out twice. */
const mark: CSSProperties = { flex: "none" };

function Mark({ children }: { children: ReactNode }) {
  return (
    <svg
      width={11} height={11} viewBox="0 0 14 14"
      fill="none" stroke="currentColor" strokeWidth={1.2}
      aria-hidden="true" focusable="false" style={mark}
    >
      {children}
    </svg>
  );
}

/** Two ruled tracks with a slider handle on each — the panel's own
    contents, standing in for the gear. */
const SlidersMark = () => (
  <Mark>
    <path d="M1.5 4.5H12.5M1.5 9.5H12.5" />
    <path d="M9 2.6V6.4M5 7.6V11.4" />
  </Mark>
);

const CloseMark = () => (
  <Mark>
    <path d="M3.2 3.2L10.8 10.8M10.8 3.2L3.2 10.8" />
  </Mark>
);

/** Open circle running clockwise into an arrowhead at the top. */
const ResetMark = () => (
  <Mark>
    <path d="M9.2 3.19A4.4 4.4 0 1 1 7 2.6" />
    <path d="M5.9 1.35L7.75 2.6L5.9 3.85" />
  </Mark>
);

/** Labels still carrying one of those characters lose it here, so the
    mark is never drawn twice. Harmless once src/i18n/ui.ts drops them. */
const strip = (s: string) => s.replace(/^[^\p{L}\p{N}]+/u, "");

/* `label` names a key under tree.panel in src/i18n/ui.ts, not the
   text itself — the panel is the one piece of chrome here that is
   all words. `fmt` takes the localised "off" label because the heal
   slider reads as a switch at zero. */
const SLIDERS = [
  { label: "spring", key: "springK", min: 0.003, max: 0.05, step: 0.001, fmt: (v: number, _off: string) => (v * 1000).toFixed(0) },
  { label: "damping", key: "damping", min: 0.85, max: 0.99, step: 0.005, fmt: (v: number, _off: string) => v.toFixed(3) },
  { label: "breakAt", key: "breakThreshold", min: 1.3, max: 2.5, step: 0.05, fmt: (v: number, _off: string) => `${v.toFixed(1)}×` },
  { label: "heal", key: "healRate", min: 0, max: 0.003, step: 0.0001, fmt: (v: number, off: string) => (v > 0 ? (v * 10000).toFixed(1) : off) },
] as const;

export function Panel({ cfg, setCfg, onReset, snd, setSnd }: {
  cfg: PhysicsConfig;
  setCfg: (c: PhysicsConfig) => void;
  onReset: () => void;
  snd: boolean;
  setSnd: (b: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const text = useTreeText();
  // Stay mounted through the close transition
  const [rendered, closing] = useDelayedUnmount(open, EXIT_MS);
  return (
    <div style={{ position: "absolute", top: 12, right: 12, zIndex: 20, userSelect: "none" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ ...mono, ...plate, display: "flex", alignItems: "center", gap: "6px", marginLeft: "auto", color: "var(--text-muted)", padding: "6px 10px", cursor: "pointer", textTransform: "uppercase", letterSpacing: ".12em" }}
      >
        {open ? <CloseMark /> : <SlidersMark />}
        {strip(open ? text.panel.close : text.panel.open)}
      </button>
      {rendered && (
          <div
            style={{
              ...mono, ...plate, marginTop: 6, padding: "14px 16px", minWidth: 200,
              // Animations (not transitions) so the enter plays on mount
              animation: `${closing ? "panelOut" : "panelIn"} ${EXIT_MS}ms ease forwards`,
            }}
          >
            {SLIDERS.map(({ label, key, min, max, step, fmt }) => (
              <div key={key} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", marginBottom: 4 }}>
                  <span>{text.panel[label]}</span>
                  <span style={{ color: "var(--accent-primary)" }}>{fmt(cfg[key], text.panel.off)}</span>
                </div>
                <input
                  type="range" min={min} max={max} step={step} value={cfg[key]}
                  onChange={(e) => setCfg({ ...cfg, [key]: parseFloat(e.target.value) })}
                  style={{ width: "100%", accentColor: "var(--accent-primary)", height: 3, cursor: "pointer" }}
                />
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, color: "var(--text-muted)" }}>
              <span>{text.panel.sound}</span>
              <button
                onClick={() => setSnd(!snd)}
                style={{ ...mono, background: snd ? "var(--accent-primary)" : "transparent", border: "1px solid var(--border-subtle)", borderRadius: "2px", color: snd ? "var(--text-on-accent)" : "var(--text-muted)", padding: "2px 8px", cursor: "pointer", fontSize: "9px" }}
              >
                {snd ? text.panel.on : text.panel.off}
              </button>
            </div>
            <button
              onClick={onReset}
              style={{ ...mono, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", width: "100%", background: "transparent", border: "1px solid var(--accent-primary)", borderRadius: "2px", color: "var(--accent-primary)", padding: "6px", cursor: "pointer", textTransform: "uppercase", letterSpacing: ".12em" }}
            >
              <ResetMark />
              {strip(text.panel.reset)}
            </button>
          </div>
      )}
    </div>
  );
}
