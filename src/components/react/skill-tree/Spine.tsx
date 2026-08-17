/* Portrait SkillTree — the phone variant.

   The landscape tree is 2340 units wide; poured into a ~342px phone
   column that renders its labels at ~4.8px. This is a different
   composition rather than a smaller one: a single vertical spine
   with "Me" at the top, domain markers hanging off it, and each
   domain's skills flowing in wrapped rows beside it. The same type
   tokens land at ~15px because the viewBox is ~3× tighter.

   Positions come from the build-time layout engine (PORTRAIT), so
   chip widths here are the same monospace math the landscape
   variant uses and can't drift from it.

   A skill that feeds several domains appears under each of them,
   carrying the accent edge — the site's "this leads somewhere"
   device. Tapping any copy lights every copy and every domain it
   feeds, which is the touch stand-in for desktop hover. */

import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useEntrance } from "../lib/animation";
import { PORTRAIT, domainDimmed, domainLit, skillDimmed } from "./data";
import { useIsLight } from "./hooks";
import { Dim, drawOn, entrance, Legend, MeNode, Pill, TreeDefs } from "./nodes";
import { domainLabel, useTreeText } from "./text";
import { FONT, KINDS, LABEL, PILL, SPINE, SPINE_ENTRANCE } from "./tokens";
import type { PortraitGroup, PortraitChip as Chip } from "./types";

const E = SPINE_ENTRANCE;

/* ── Chip ──────────────────────────────────────────────────── */

function SpineChip({ chip, y, delay, shown, instant, focused, onTap }: {
  chip: Chip; y: number; delay: number; shown: boolean; instant: boolean;
  focused: string | null; onTap: (name: string) => void;
}) {
  const active = focused === chip.name;

  const enter: CSSProperties = instant
    ? {}
    : {
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : `translateX(-${E.chipShift}px)`,
        transition:
          `opacity ${E.chipDuration}s ease ${delay}s, ` +
          `transform ${E.chipDuration}s var(--ease-spring) ${delay}s`,
      };

  // Mirrors the lift Pill applies to itself, so the accent bar
  // travels with the pill instead of detaching from it.
  const lift: CSSProperties = {
    transform: active ? `translateY(${PILL.hoverLift}px)` : "translateY(0px)",
    transition: "transform .25s ease",
  };

  return (
    <g style={enter}>
      <g
        onClick={(e) => { e.stopPropagation(); onTap(chip.name); }}
        style={{ cursor: "pointer" }}
      >
        {/* Tap target, padded out to clear ~44px at render scale. */}
        <rect
          x={chip.x - chip.halfW - SPINE.hitPadX}
          y={y - PILL.height / 2 - SPINE.hitPadY}
          width={chip.halfW * 2 + SPINE.hitPadX * 2}
          height={PILL.height + SPINE.hitPadY * 2}
          fill="transparent"
        />
        <Pill name={chip.name} kind={chip.kind} x={chip.x} y={y} active={active} dead={false} />
        {chip.shared && (
          <g style={lift}>
            {/* Always the domain accent, never the kind color — the
                bar means "also feeds other domains", so colouring it
                by kind would collide with the glyph's own code. */}
            <rect
              x={chip.x - chip.halfW + SPINE.accentInset}
              y={y - PILL.height / 2 + SPINE.accentTrim}
              width={SPINE.accentEdge}
              height={PILL.height - SPINE.accentTrim * 2}
              rx={SPINE.accentEdge / 2}
              style={{
                fill: KINDS.domain.fill,
                fillOpacity: active ? 1 : 0.55,
                transition: "fill-opacity .3s",
              }}
            />
          </g>
        )}
      </g>
    </g>
  );
}

/* ── Domain group ──────────────────────────────────────────── */

function SpineGroup({ group, focused, setFocused, isLight, instant }: {
  group: PortraitGroup; focused: string | null; setFocused: (n: string | null) => void;
  isLight: boolean; instant: boolean;
}) {
  const ref = useRef<SVGGElement>(null);
  // Each group owns its entrance, so the spine keeps drawing itself
  // as the visitor scrolls rather than firing all at once far above.
  const phase = useEntrance(ref, "0px 0px 12% 0px");
  const settled = instant || phase === "idle";
  const shown = settled || phase === "shown";

  const x = PORTRAIT.spineX;
  const lit = domainLit(group.name, focused);
  const dimmed = domainDimmed(group.name, focused);
  const text = useTreeText();
  const theme = isLight ? "light" : "dark";
  const label = LABEL.domain[theme];

  return (
    <g ref={ref}>
      {/* The spine is the constant — it never dims with focus. */}
      <path
        d={`M ${x} ${group.segTop} L ${x} ${group.segBottom}`}
        fill="none"
        strokeWidth={SPINE.spine.width}
        strokeOpacity={SPINE.spine.opacity[theme]}
        pathLength={1}
        style={{ ...(settled ? {} : drawOn(shown, E.segmentDuration)), stroke: KINDS.domain.fill }}
      />

      {/* Marker + label. Dimming is applied here and per chip, never
          nested around both — two 0.35 layers would compound. */}
      <Dim dimmed={dimmed}>
        <g
          onClick={(e) => { e.stopPropagation(); setFocused(focused === group.name ? null : group.name); }}
          style={{
            cursor: "pointer",
            ...(settled ? {} : entrance(shown, "translateX(-20px)", E.markerDuration, E.markerDelay)),
          }}
        >
          <rect
            x={x - SPINE.glow} y={group.markerY - SPINE.hitPadY - 18}
            width={SPINE.glow * 2 + 320} height={SPINE.hitPadY * 2 + 36}
            fill="transparent"
          />
          <circle
            cx={x} cy={group.markerY} r={lit ? SPINE.glowLit : SPINE.glow}
            style={{ fill: lit ? KINDS.domain.glow : "transparent", transition: "all .4s", filter: "blur(18px)" }}
          />
          <circle
            cx={x} cy={group.markerY} r={lit ? SPINE.ringLit : SPINE.ring}
            fill="none" strokeWidth={SPINE.stroke} strokeOpacity={lit || isLight ? 0.9 : 0.5}
            style={{ stroke: KINDS.domain.fill, transition: "r .3s ease, stroke-opacity .3s" }}
          />
          <circle
            cx={x} cy={group.markerY} r={SPINE.core}
            fillOpacity={lit || isLight ? 1 : 0.6} filter="url(#rootGlow)"
            style={{ fill: KINDS.domain.fill, transition: "fill-opacity .3s" }}
          />
          <text
            x={x + SPINE.labelGap} y={group.markerY + 11}
            fontSize={SPINE.labelSize}
            fontWeight={500} letterSpacing=".08em"
            fillOpacity={lit ? label.lit : label.idle}
            style={{
              fontFamily: FONT.family, fill: KINDS.domain.fill,
              transition: "fill-opacity .3s", userSelect: "none",
            }}
          >
            {domainLabel(text, group.name)}
          </text>
        </g>
      </Dim>

      {/* Rows: a leader off the spine, then the chips */}
      {group.rows.map((row, i) => {
        const delay = E.rowBase + i * E.rowStagger;
        const first = row.chips[0];
        return (
          <g key={row.y}>
            <Dim dimmed={dimmed}>
              <line
                x1={x} y1={row.y} x2={first.x - first.halfW} y2={row.y}
                strokeWidth={SPINE.leader.width}
                strokeOpacity={SPINE.leader.opacity[theme]}
                pathLength={1}
                style={{ ...(settled ? {} : drawOn(shown, E.leaderDuration, delay)), stroke: KINDS.domain.fill }}
              />
            </Dim>
            {row.chips.map((chip) => (
              <Dim key={chip.name} dimmed={skillDimmed(chip, focused)}>
                <SpineChip
                  chip={chip} y={row.y} delay={delay} shown={shown} instant={settled}
                  focused={focused} onTap={(n) => setFocused(focused === n ? null : n)}
                />
              </Dim>
            ))}
          </g>
        );
      })}
    </g>
  );
}

/* ── Variant ───────────────────────────────────────────────── */

export default function Spine({ instant = false }: { instant?: boolean }) {
  const meRef = useRef<SVGGElement>(null);
  const mePhase = useEntrance(meRef, "0px 0px 12% 0px");
  const meSettled = instant || mePhase === "idle";
  const [focused, setFocused] = useState<string | null>(null);
  const isLight = useIsLight();
  const text = useTreeText();

  const P = PORTRAIT;

  return (
    // Capped and centered: the spine is sized for a phone column, so
    // on a tablet it holds that column rather than stretching its
    // labels to twice the size of the desktop tree's.
    <div className="relative w-full max-w-[400px] mx-auto py-10">
      <svg
        viewBox={`0 0 ${P.viewBox.width} ${P.viewBox.height}`}
        className="w-full"
        style={{ overflow: "visible" }}
        role="img"
        aria-label={text.aria}
        onClick={() => setFocused(null)}
      >
        <TreeDefs isLight={isLight} />
        <g
          ref={meRef}
          style={{
            // fill-box so the scale pivots on the node, not the SVG origin
            transformBox: "fill-box",
            transformOrigin: "center",
            ...(meSettled ? {} : entrance(mePhase === "shown", "scale(0.85)", 0.6, 0)),
          }}
        >
          <MeNode
            me={P.me} instant
            isInView
            onEnter={() => {}} onLeave={() => {}}
          />
        </g>
        {P.groups.map((g) => (
          <SpineGroup
            key={g.name} group={g}
            focused={focused} setFocused={setFocused}
            isLight={isLight} instant={instant}
          />
        ))}
      </svg>
      <Legend compact shared />
    </div>
  );
}
