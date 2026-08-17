/* Static SkillTree — SSR-safe, no physics. Renders during SSR and
   first paint everywhere; stays permanently on touch devices and
   under prefers-reduced-motion (with sway/entrances disabled). */

import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useEntrance } from "../lib/animation";
import { DOMAINS, GROUND_Y, ME, PAD_X, SKILLS, VIEWBOX, domainDimmed, domainLit, ropeAnchor, skillDimmed } from "./data";
import { branchPath, entranceDelay } from "./geometry";
import { useIsLight } from "./hooks";
import { Dim, DomainNode, GroundLine, Legend, MeNode, Pill, TreeDefs, Trunk } from "./nodes";
import { ENTRANCE, KINDS, ROPE } from "./tokens";
import type { LayoutSkill } from "./types";

function StaticLeaf({ skill, isInView, instant, sway, hovered, setHovered, isLight }: {
  skill: LayoutSkill; isInView: boolean; instant: boolean; sway: boolean;
  hovered: string | null; setHovered: (n: string | null) => void; isLight: boolean;
}) {
  const k = KINDS[skill.kind];
  const active = hovered === skill.name;
  const delay = entranceDelay(skill.x, VIEWBOX.width);

  const enter: CSSProperties = instant
    ? {}
    : {
        opacity: isInView ? 1 : 0,
        transform: isInView ? "none" : "translateY(40px)",
        transition:
          `opacity ${ENTRANCE.pillDuration}s ease ${delay}s, ` +
          `transform ${ENTRANCE.pillDuration}s var(--ease-spring) ${delay}s`,
      };

  return (
    <Dim dimmed={skillDimmed(skill, hovered)}>
      <g style={enter}>
        {skill.domains.map((dn) => {
          const a = ropeAnchor(dn);
          const on = active || hovered === dn || hovered === "Me";
          const base = on ? ROPE.active : isLight ? ROPE.idle.light : ROPE.idle.dark;
          return (
            <path
              key={dn}
              d={branchPath(skill.x, skill.y, a.x, a.y)} fill="none"
              strokeWidth={base.width} strokeOpacity={base.opacity}
              style={{ stroke: k.fill, transition: "stroke-width .4s, stroke-opacity .4s" }}
            />
          );
        })}
        <g
          className={sway ? "skill-sway" : undefined}
          onMouseEnter={() => setHovered(skill.name)}
          onMouseLeave={() => setHovered(null)}
          style={{
            cursor: "pointer",
            // Amplitude and phase per skill; the keyframes live in CSS
            "--sway-amp": `${skill.swayAmp}px`,
            "--sway-delay": `${skill.swayDelay}s`,
            "--sway-duration": `${5.5 + skill.swayDelay}s`,
          } as CSSProperties}
        >
          <Pill name={skill.name} kind={skill.kind} x={skill.x} y={skill.y} active={active} dead={false} />
        </g>
      </g>
    </Dim>
  );
}

export default function Static({ sway = true, instant = false }: { sway?: boolean; instant?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const phase = useEntrance(ref, "-156px");
  // `idle` means the tree was on screen before it could be hidden — draw
  // it settled rather than blanking it out to re-animate.
  const settled = instant || phase === "idle";
  const isInView = settled || phase === "shown";
  const [hovered, setHovered] = useState<string | null>(null);
  const isLight = useIsLight();

  return (
    <div ref={ref} className="relative w-full flex flex-col items-center py-20">
      <svg viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`} className="w-full max-w-[2000px]" style={{ overflow: "visible" }}>
        <TreeDefs isLight={isLight} />
        {DOMAINS.map((dom, i) => (
          <Dim key={`trunk-${dom.name}`} dimmed={domainDimmed(dom.name, hovered)}>
            <Trunk
              dom={dom} me={ME}
              lit={domainLit(dom.name, hovered)} isLight={isLight}
              index={i} instant={settled} isInView={isInView}
            />
          </Dim>
        ))}
        <GroundLine y={GROUND_Y} x1={PAD_X} x2={VIEWBOX.width - PAD_X} instant={settled} isInView={isInView} />
        {DOMAINS.map((dom, i) => (
          <Dim key={dom.name} dimmed={domainDimmed(dom.name, hovered)}>
            <DomainNode
              dom={dom} lit={domainLit(dom.name, hovered)} isLight={isLight}
              index={i} instant={settled} isInView={isInView}
              onEnter={() => setHovered(dom.name)} onLeave={() => setHovered(null)}
            />
          </Dim>
        ))}
        {SKILLS.map((s) => (
          <StaticLeaf
            key={s.name} skill={s} isInView={isInView} instant={settled} sway={sway}
            hovered={hovered} setHovered={setHovered} isLight={isLight}
          />
        ))}
        <MeNode me={ME} instant={settled} isInView={isInView} onEnter={() => setHovered("Me")} onLeave={() => setHovered(null)} />
      </svg>
      <Legend />
    </div>
  );
}
