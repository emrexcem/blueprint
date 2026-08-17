import { useRef } from "react";
import { entranceStyle, useEntrance } from "./lib/animation";

/* ================================================================
    ProjectCardStatic.tsx — Flat card for mobile / touch devices.
    No 3D tilt, no spotlight, no mouse tracking.
    Just a clean fade-in with hover border accent.
    ================================================================ */

interface Props {
  title: string;
  description: string;
  techStack: string[];
  link?: string;
  index: number;
  /** Localised label for the outbound link. */
  viewLabel: string;
}

export default function ProjectCardStatic({ title, description, techStack, link, index, viewLabel }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const phase = useEntrance(ref, "-50px");

  return (
    /* h-full down the chain, so a card matched to a taller neighbour
       puts the extra height between the tags and the link instead of
       leaving it stranded below them. */
    <div ref={ref} className="h-full" style={entranceStyle(phase, "translateY(40px)", index * 0.15)}>
      <div className="plate plate-notch relative p-6 md:p-8 h-full flex flex-col">
        <h3 className="type-card mb-3 text-[var(--text-primary)]">{title}</h3>
        <p className="text-[var(--text-muted)] text-sm leading-relaxed mb-5">
          {description}
        </p>
        <div className="flex flex-wrap gap-2 mb-4 mt-auto">
          {techStack.map(tech => (
            <span
              key={tech}
              className="eyebrow px-2 py-1 border text-[var(--accent-primary)]"
              style={{ borderColor: "var(--border-subtle)", borderRadius: "var(--radius-chip)" }}
            >
              {tech}
            </span>
          ))}
        </div>
        {link && (
          <a href={link} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-mono text-xs text-[var(--accent-primary)]">
            {viewLabel}
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}
