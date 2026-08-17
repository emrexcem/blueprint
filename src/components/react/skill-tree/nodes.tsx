/* Shared presentational pieces for both SkillTree variants.
   All colors go through the style prop — SVG presentation
   attributes cannot substitute var(). */

import type { CSSProperties, ReactNode } from "react";
import { branchPath, pillMetrics } from "./geometry";
import { DIM, DOMAIN_NODE, ENTRANCE, FONT, KINDS, LABEL, ME_NODE, PILL, ROPE } from "./tokens";
import { domainLabel, useTreeText } from "./text";
import type { LayoutDomain, SkillKind } from "./types";

/** Stroke draw-on. pathLength="1" normalises the geometry, so the dash
    offset runs 1 → 0 regardless of the path's real length — no
    getTotalLength call, and it works identically for lines and curves. */
export function drawOn(drawn: boolean, duration: number, delay = 0): CSSProperties {
  return {
    strokeDasharray: 1,
    strokeDashoffset: drawn ? 0 : 1,
    transition: `stroke-dashoffset ${duration}s ease-out ${delay}s`,
  };
}

/** Entrance transform + fade, settling when `shown` turns true. */
export function entrance(shown: boolean, from: string, duration: number, delay: number): CSSProperties {
  return {
    opacity: shown ? 1 : 0,
    transform: shown ? "none" : from,
    transition: `opacity ${duration}s ease ${delay}s, transform ${duration}s var(--ease-spring) ${delay}s`,
  };
}

/* ── Focus dimming ─────────────────────────────────────────── */

export function Dim({ dimmed, children }: { dimmed: boolean; children: ReactNode }) {
  return <g style={{ opacity: dimmed ? DIM.opacity : 1, transition: DIM.transition }}>{children}</g>;
}

/* ── Defs ──────────────────────────────────────────────────── */

export function TreeDefs({ isLight }: { isLight: boolean }) {
  return (
    <defs>
      <filter id="rootGlow" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="15.6" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <linearGradient id="groundLine" x1="0" y1="0" x2="1" y2="0">
        {[0, 20, 80, 100].map((off) => (
          <stop
            key={off}
            offset={`${off}%`}
            stopOpacity={off === 0 || off === 100 ? 0 : isLight ? 0.35 : 0.15}
            style={{ stopColor: "var(--accent-primary)" }}
          />
        ))}
      </linearGradient>
    </defs>
  );
}

export function GroundLine({ y, x1, x2, instant, isInView }: {
  y: number; x1: number; x2: number; instant: boolean; isInView: boolean;
}) {
  return (
    <line
      x1={x1} y1={y} x2={x2} y2={y}
      stroke="url(#groundLine)" strokeWidth={2.6}
      pathLength={1}
      style={instant ? undefined : drawOn(isInView, ENTRANCE.drawDuration)}
    />
  );
}

/* ── Trunks (domain → Me) ──────────────────────────────────── */

export function Trunk({ dom, me, lit, isLight, index, instant, isInView }: {
  dom: LayoutDomain; me: { x: number; y: number }; lit: boolean; isLight: boolean;
  index: number; instant: boolean; isInView: boolean;
}) {
  const base = lit ? ROPE.trunk.active : isLight ? ROPE.trunk.idle.light : ROPE.trunk.idle.dark;
  const delay = ENTRANCE.domainDelay + index * ENTRANCE.domainStagger;
  const draw = instant ? {} : drawOn(isInView, ENTRANCE.drawDuration, delay);
  return (
    <path
      d={branchPath(dom.x, dom.y + DOMAIN_NODE.ring, me.x, me.y - ME_NODE.height / 2)}
      fill="none"
      strokeWidth={base.width} strokeOpacity={base.opacity}
      pathLength={1}
      style={{
        ...draw,
        stroke: KINDS.domain.fill,
        transition: [draw.transition, "stroke-width .4s", "stroke-opacity .4s"]
          .filter(Boolean)
          .join(", "),
      }}
    />
  );
}

/* ── Domain node: survey marker (core dot in an open ring) ─── */

export function DomainNode({ dom, lit, isLight, index, instant, isInView, onEnter, onLeave }: {
  dom: LayoutDomain; lit: boolean; isLight: boolean; index: number;
  instant: boolean; isInView: boolean; onEnter: () => void; onLeave: () => void;
}) {
  const K = KINDS.domain;
  const D = DOMAIN_NODE;
  const text = useTreeText();
  const label = LABEL.domain[isLight ? "light" : "dark"];
  const delay = ENTRANCE.domainDelay + index * ENTRANCE.domainStagger;
  return (
    <g
      onMouseEnter={onEnter} onMouseLeave={onLeave}
      style={{
        cursor: "pointer",
        ...(instant ? {} : entrance(isInView, "translateY(52px)", ENTRANCE.domainDuration, delay)),
      }}
    >
      <circle
        cx={dom.x} cy={dom.y} r={lit ? D.glowLit : D.glow}
        style={{ fill: lit ? K.glow : "transparent", transition: "all .4s", filter: "blur(20.8px)" }}
      />
      <circle
        cx={dom.x} cy={dom.y} r={lit ? D.ringLit : D.ring}
        fill="none" strokeWidth={D.stroke} strokeOpacity={lit || isLight ? 0.9 : 0.5}
        style={{ stroke: K.fill, transition: "r .3s ease, stroke-opacity .3s" }}
      />
      <circle
        cx={dom.x} cy={dom.y} r={D.core}
        fillOpacity={lit || isLight ? 1 : 0.6} filter="url(#rootGlow)"
        style={{ fill: K.fill, transition: "fill-opacity .3s" }}
      />
      <text
        x={dom.x} y={dom.y - D.labelRise}
        textAnchor="middle" fontSize={D.fontSize}
        fontWeight={600} letterSpacing=".08em"
        fillOpacity={lit ? label.lit : label.idle}
        style={{
          fontFamily: FONT.family, fill: K.fill,
          transition: "fill-opacity .3s", userSelect: "none",
        }}
      >
        {domainLabel(text, dom.name)}
      </text>
    </g>
  );
}

/* ── Me node ───────────────────────────────────────────────── */

export function MeNode({ me, instant, isInView, onEnter, onLeave }: {
  me: { x: number; y: number }; instant: boolean; isInView: boolean;
  onEnter: () => void; onLeave: () => void;
}) {
  const K = KINDS.domain;
  const text = useTreeText();
  return (
    <g
      onMouseEnter={onEnter} onMouseLeave={onLeave}
      style={{
        cursor: "pointer",
        // fill-box so the scale pivots on the node, not the SVG origin
        transformBox: "fill-box",
        transformOrigin: "center",
        ...(instant ? {} : entrance(isInView, "scale(0.8)", ENTRANCE.meDuration, ENTRANCE.me)),
      }}
    >
      <circle cx={me.x} cy={me.y} r={ME_NODE.glow} style={{ fill: K.glow, filter: "blur(31.2px)" }} />
      <rect
        x={me.x - ME_NODE.width / 2} y={me.y - ME_NODE.height / 2}
        width={ME_NODE.width} height={ME_NODE.height} rx={ME_NODE.rx}
        strokeWidth={PILL.stroke}
        style={{ fill: K.fill, stroke: K.fill }}
      />
      <text
        x={me.x} y={me.y + PILL.baseline}
        textAnchor="middle" fontSize={ME_NODE.fontSize}
        fontWeight={800} letterSpacing=".05em"
        style={{
          fontFamily: FONT.family, fill: "var(--text-on-accent)",
          userSelect: "none",
        }}
      >
        {text.me}
      </text>
    </g>
  );
}

/* ── Skill pill ────────────────────────────────────────────── */

function Glyph({ kind, x, y, active }: { kind: SkillKind; x: number; y: number; active: boolean }) {
  const k = KINDS[kind];
  const r = PILL.dotRadius;
  const style: CSSProperties = { fill: k.fill, transition: "fill-opacity .3s" };
  return k.glyph === "diamond" ? (
    <path d={`M ${x} ${y - r} L ${x + r} ${y} L ${x} ${y + r} L ${x - r} ${y} Z`} fillOpacity={active ? 1 : 0.4} style={style} />
  ) : (
    <circle cx={x} cy={y} r={r * 0.95} fillOpacity={active ? 1 : 0.4} style={style} />
  );
}

/** Uniform pill: same height, same padding, same glyph inset on every
    node — width hugs the text exactly (monospace math, no measuring). */
export function Pill({ name, kind, x, y, active, dead }: {
  name: string; kind: SkillKind; x: number; y: number; active: boolean; dead: boolean;
}) {
  const m = pillMetrics(name);
  const k = KINDS[kind];
  return (
    <g style={{ transform: active ? `translateY(${PILL.hoverLift}px)` : "translateY(0px)", transition: "transform .25s ease" }}>
      {active && (
        <ellipse cx={x} cy={y} rx={m.halfW} ry={PILL.height / 2} style={{ fill: k.glow, filter: `blur(${PILL.glowBlur}px)` }} />
      )}
      <rect
        x={x - m.halfW} y={y - PILL.height / 2}
        width={m.halfW * 2} height={PILL.height} rx={PILL.rx}
        strokeWidth={PILL.stroke}
        style={{
          fill: active ? `color-mix(in srgb, ${k.fill} 9%, transparent)` : PILL.fill,
          stroke: active ? k.fill : "var(--pill-stroke)",
          transition: "fill .3s, stroke .3s",
        }}
      />
      <Glyph kind={kind} x={x + m.dotX} y={y} active={active} />
      <text
        x={x + m.textX} y={y + PILL.baseline}
        fontSize={PILL.fontSize}
        style={{
          fontFamily: FONT.family,
          fill: active ? k.fill : dead ? "var(--skill-label-dead)" : "var(--skill-label)",
          transition: "fill .3s",
          userSelect: "none",
        }}
      >
        {name}
      </text>
    </g>
  );
}

/* ── Legend (derived from KINDS — new kinds appear automatically) ── */

/** `compact` sizes the legend for the portrait variant, where the
    landscape 15.6px would out-shout the node labels themselves.
    `shared` documents the accent bar the spine uses for skills that
    feed more than one domain. */
export function Legend({ compact = false, shared = false }: { compact?: boolean; shared?: boolean } = {}) {
  const size = compact ? 11 : 13;
  const text = useTreeText();
  return (
    <div
      className={
        compact
          ? "flex flex-wrap justify-center gap-x-5 gap-y-2 mt-8 text-[12.5px] font-mono"
          : "flex gap-8 mt-10 text-[15.6px] font-mono"
      }
    >
      {(Object.keys(KINDS) as (keyof typeof KINDS)[]).map((key) => {
        const k = KINDS[key];
        return (
          <span key={key} className="flex items-center gap-2" style={{ color: k.fill }}>
            <svg width={size} height={size} viewBox="-6.5 -6.5 13 13" aria-hidden="true">
              {key === "domain" ? (
                <circle r={4.5} fill="none" stroke="currentColor" strokeWidth={2} />
              ) : k.glyph === "diamond" ? (
                <path d="M 0 -5.5 L 5.5 0 L 0 5.5 L -5.5 0 Z" fill="currentColor" />
              ) : (
                <circle r={5} fill="currentColor" />
              )}
            </svg>
            {text.legend[key]}
          </span>
        );
      })}
      {shared && (
        <span className="flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
          <svg width={size} height={size} viewBox="-6.5 -6.5 13 13" aria-hidden="true">
            <rect x={-5} y={-5} width={2.6} height={10} rx={1.3} style={{ fill: KINDS.domain.fill }} />
          </svg>
          {text.legend.shared}
        </span>
      )}
    </div>
  );
}
