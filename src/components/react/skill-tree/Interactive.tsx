/* Interactive SkillTree — desktop upgrade with elastic drag physics.
   Continuous motion runs in TreeEngine (one RAF loop, direct DOM
   writes); React re-renders only on discrete events. */

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useEntrance } from "../lib/animation";
import { DOMAINS, GROUND_Y, ME, PAD_X, SKILLS, VIEWBOX, domainDimmed, domainLit, ropeAnchor, skillDimmed } from "./data";
import { TreeEngine } from "./engine";
import { branchPath, entranceDelay, pillMetrics } from "./geometry";
import { useIsLight } from "./hooks";
import { Dim, DomainNode, GroundLine, Legend, MeNode, Pill, TreeDefs, Trunk } from "./nodes";
import { Panel } from "./Panel";
import { useTreeText } from "./text";
import { sfx } from "./sfx";
import { ENTRANCE, FONT, KINDS, PHYSICS_DEFAULTS, PILL, ROPE } from "./tokens";
import type { LayoutSkill, PhysicsConfig } from "./types";

/** Leaf entrance. Once settled the transform must read exactly "none",
    since the engine writes its own transform to these nodes afterwards. */
function leafEntrance(shown: boolean, delay: number, settled: boolean): CSSProperties {
  if (settled) return {};
  return {
    opacity: shown ? 1 : 0,
    transform: shown ? "none" : "translateY(40px)",
    transition:
      `opacity ${ENTRANCE.pillDuration}s ease ${delay}s, ` +
      `transform ${ENTRANCE.pillDuration}s var(--ease-spring) ${delay}s`,
  };
}

function toSvg(svg: SVGSVGElement, clientX: number, clientY: number) {
  const pt = svg.createSVGPoint();
  pt.x = clientX; pt.y = clientY;
  const m = svg.getScreenCTM();
  return m ? pt.matrixTransform(m.inverse()) : { x: 0, y: 0 };
}

function Leaf({ skill, engine, svgRef, isInView, settled, hovered, setHovered, isLight }: {
  skill: LayoutSkill; engine: TreeEngine;
  svgRef: React.RefObject<SVGSVGElement | null>;
  isInView: boolean; settled: boolean; hovered: string | null;
  setHovered: (n: string | null) => void; isLight: boolean;
}) {
  const k = KINDS[skill.kind];
  const m = pillMetrics(skill.name);
  const [dead, setDead] = useState<ReadonlySet<string>>(() => new Set());
  const [phase, setPhase] = useState(0);
  const [dragging, setDragging] = useState(false);

  const clickTimes = useRef<number[]>([]);
  const clickPos = useRef<{ x: number; y: number } | null>(null);
  const clickT = useRef(0);
  const captured = useRef<{ el: Element; id: number } | null>(null);

  const release = () => {
    if (!captured.current) return;
    try { captured.current.el.releasePointerCapture(captured.current.id); } catch { /* already released */ }
    captured.current = null;
  };

  useEffect(() => engine.setListener(skill.name, (ev) => {
    switch (ev.type) {
      case "snap": setDead((s) => new Set(s).add(ev.domain)); break;
      case "unsnap": setDead((s) => { const n = new Set(s); n.delete(ev.domain); return n; }); break;
      case "popped": setPhase(1); setDragging(false); release(); setHovered(null); break;
      case "reforming": setPhase(2); break;
      case "restored": setPhase(0); break;
      case "reset": setDead(new Set()); setPhase(0); setDragging(false); release(); break;
    }
  }), [engine, skill.name, setHovered]);

  const allDead = dead.size === skill.domains.length;
  const active = hovered === skill.name && !allDead;

  const onDown = (e: React.PointerEvent) => {
    clickPos.current = { x: e.clientX, y: e.clientY };
    clickT.current = performance.now();
    if (!engine.canInteract(skill.name)) return;
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    captured.current = { el: e.currentTarget as Element, id: e.pointerId };
    setDragging(true);
    engine.beginDrag(skill.name);
  };

  const onMove = (e: React.PointerEvent) => {
    if (!captured.current || !svgRef.current) return;
    const p = toSvg(svgRef.current, e.clientX, e.clientY);
    engine.drag(skill.name, p.x, p.y);
  };

  const onUp = (e: React.PointerEvent) => {
    const cp = clickPos.current;
    if (cp && engine.canInteract(skill.name)) {
      const moved = Math.hypot(e.clientX - cp.x, e.clientY - cp.y);
      if (moved < 8 && performance.now() - clickT.current < 300) {
        const now = performance.now();
        const t = clickTimes.current;
        t.push(now);
        while (t.length > 0 && now - t[0] > 700) t.shift();
        if (t.length >= 3) { // triple-click pops the pill
          t.length = 0;
          release(); setDragging(false);
          engine.pop(skill.name);
          return;
        }
      }
    }
    clickPos.current = null;
    release();
    setDragging(false);
    engine.endDrag(skill.name);
  };

  const idle = isLight ? ROPE.idle.light : ROPE.idle.dark;
  const adv = PILL.fontSize * FONT.advance;

  return (
    <Dim dimmed={skillDimmed(skill, hovered)}>
      <g style={leafEntrance(isInView, entranceDelay(skill.x, VIEWBOX.width), settled)}>
        {skill.domains.map((dn) => {
          const a = ropeAnchor(dn);
          return dead.has(dn) ? (
            // Frayed stub left at the anchor after a snap
            <path
              key={dn}
              d={`M ${a.x} ${a.y} Q ${a.x + 6} ${a.y - 28}, ${a.x - 4} ${a.y - 35}`}
              fill="none" strokeWidth={1} strokeOpacity={isLight ? 0.3 : 0.12} strokeDasharray="3 3"
              style={{ stroke: k.fill }}
            />
          ) : (
            <path
              key={dn}
              ref={(el) => engine.registerRope(skill.name, dn, el)}
              d={branchPath(skill.x, skill.y, a.x, a.y)} fill="none"
              strokeWidth={idle.width} strokeOpacity={idle.opacity}
              style={{ stroke: k.fill }}
            />
          );
        })}
        <g
          ref={(el) => engine.registerBalloon(skill.name, el)}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
          onMouseEnter={() => { if (!allDead) setHovered(skill.name); }}
          onMouseLeave={() => { if (!dragging) setHovered(null); }}
          style={{
            cursor: phase > 0 || allDead ? "default" : dragging ? "grabbing" : "grab",
            touchAction: "none",
          }}
        >
          {[...dead].map((dn) => (
            // Frayed stub hanging from the balloon (rides its transform)
            <path
              key={dn}
              d={`M ${skill.x} ${skill.y} Q ${skill.x + 4} ${skill.y + 15}, ${skill.x - 3} ${skill.y + 25}`}
              fill="none" strokeWidth={0.8} strokeOpacity={isLight ? 0.25 : 0.1} strokeDasharray="2 2"
              style={{ stroke: k.fill }}
            />
          ))}
          {phase === 1 && skill.name.split("").map((ch, i) => (
            <text
              key={i}
              ref={(el) => engine.registerParticle(skill.name, i, el)}
              x={0} y={0} textAnchor="middle"
              fontSize={PILL.fontSize} fillOpacity={0.85}
              transform={`translate(${skill.x + m.textX + (i + 0.5) * adv} ${skill.y + PILL.baseline})`}
              style={{
                fontFamily: FONT.family, fill: k.fill,
                pointerEvents: "none", userSelect: "none",
              }}
            >
              {ch}
            </text>
          ))}
          {phase !== 1 && (
            <g ref={(el) => engine.registerShell(skill.name, el)}>
              <Pill name={skill.name} kind={skill.kind} x={skill.x} y={skill.y} active={active} dead={allDead} />
            </g>
          )}
        </g>
      </g>
    </Dim>
  );
}

export default function Interactive() {
  const ref = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const phase = useEntrance(ref, "-156px");
  // `idle` means the tree was on screen before it could be hidden — draw
  // it settled rather than blanking it out to re-animate.
  const settled = phase === "idle";
  const isInView = phase !== "hidden";
  const [hovered, setHovered] = useState<string | null>(null);
  const isLight = useIsLight();
  const text = useTreeText();
  const [cfg, setCfg] = useState<PhysicsConfig>(PHYSICS_DEFAULTS);
  const [snd, setSnd] = useState(true);

  const engine = useMemo(() => new TreeEngine(SKILLS, DOMAINS), []);
  useEffect(() => { engine.setTheme(isLight); }, [engine, isLight]);
  useEffect(() => { engine.setConfig(cfg); }, [engine, cfg]);
  useEffect(() => { engine.setSound(snd); }, [engine, snd]);
  useEffect(() => { engine.setHover(hovered); }, [engine, hovered]);

  // Run physics only while the tree is actually on screen
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? engine.start() : engine.stop()));
    io.observe(el);
    return () => { io.disconnect(); engine.stop(); };
  }, [engine]);

  const doReset = () => {
    engine.reset();
    setCfg(PHYSICS_DEFAULTS);
    if (snd) sfx.reset();
  };

  return (
    <div ref={ref} className="relative w-full flex flex-col items-center py-20">
      {isInView && (
        <div style={settled ? undefined : { animation: "fadeIn 0.6s ease 1.5s backwards" }}>
          <Panel cfg={cfg} setCfg={setCfg} onReset={doReset} snd={snd} setSnd={setSnd} />
        </div>
      )}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
        className="w-full max-w-[2000px]"
        style={{ overflow: "visible", touchAction: "pan-y" }}
      >
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
          <Leaf
            key={s.name} skill={s} engine={engine} svgRef={svgRef}
            isInView={isInView} settled={settled} hovered={hovered} setHovered={setHovered} isLight={isLight}
          />
        ))}
        <MeNode me={ME} instant={settled} isInView={isInView} onEnter={() => setHovered("Me")} onLeave={() => setHovered(null)} />
      </svg>
      <Legend />
      {/* No extra dimming in dark: --text-muted is 5.06:1 on the plate,
          and the 0.5 this used to carry took the hint to 2.20:1 — the
          worst text on the page. Light keeps its 0.8: the token is far
          darker there, so it still measures 6.16:1. */}
      <p className="font-mono text-[11px] text-[var(--text-muted)] mt-3 opacity-80 dark:opacity-100">
        {text.hint}
      </p>
    </div>
  );
}
