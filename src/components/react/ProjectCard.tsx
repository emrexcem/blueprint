import { useState, useRef, type MouseEvent } from "react";
import { entranceStyle, useEntrance, usePrefersReducedMotion } from "./lib/animation";
import { values } from "../../config";

/*  ================================================================
    ProjectCard.tsx
    Interactive 3D plaque with:
    - Perspective tilt following mouse position
    - Radial light-refraction spotlight
    - Shimmer gradient border on hover
    - Magnetic pull when cursor is nearby (handled by parent grid)
    - Reduced-motion: disables tilt, keeps spotlight & shimmer
    ================================================================ */

interface ProjectCardProps {
  title: string;
  description: string;
  techStack: string[];
  link?: string;
  index: number;
  /** Localised label for the outbound link. */
  viewLabel: string;
}

export default function ProjectCard({
  title,
  description,
  techStack,
  link,
  index,
  viewLabel,
}: ProjectCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const phase = useEntrance(cardRef, "-50px");

  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const [spotlight, setSpotlight] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // 3D tilt — disabled when reduced motion preferred. The knob is
    // the angle at the corner, so the travel across the card is twice
    // it in each axis.
    if (!reducedMotion) {
      setTilt({
        rotateX: (y - 0.5) * -2 * values.tiltMaxDeg,
        rotateY: (x - 0.5) * 2 * values.tiltMaxDeg,
      });
    }

    // Spotlight position (percentage) — kept for reduced-motion (color only)
    setSpotlight({ x: x * 100, y: y * 100 });
  };

  const handleMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0 });
    setIsHovered(false);
  };

  return (
    <div
      ref={cardRef}
      className="group relative h-full"
      style={{
        perspective: "800px",
        ...entranceStyle(phase, "translateY(40px)", index * 0.15),
      }}
    >
      {/* Tilt and lift ride on this wrapper, not on the plate itself.
          `.plate-notch` sets a clip-path, and a clip-path clips the
          element's own shadow too — a box-shadow declared alongside it
          is 100% invisible. Drawn one level out it actually paints, and
          it tilts with the card instead of lying flat under it.
          The idle state is the same shadow at zero alpha rather than
          `none`, so the fade interpolates instead of popping. */}
      <div
        className="relative h-full"
        style={{
          transform: `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
          transformStyle: "preserve-3d",
          boxShadow: `0 20px 60px rgb(var(--accent-primary-rgb) / ${isHovered ? 0.14 : 0})`,
          transition: "transform 200ms ease-out, box-shadow 350ms ease-out",
        }}
      >
        <div
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={handleMouseLeave}
          className="plate plate-notch relative p-6 md:p-8 h-full cursor-pointer"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Shimmer gradient border overlay */}
          <div
            className="plate-notch absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{
              background: `linear-gradient(${
                tilt.rotateY * 3 + 135
              }deg, var(--accent-primary), var(--accent-tertiary), var(--accent-secondary))`,
              padding: "1px",
              mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
              maskComposite: "exclude",
              WebkitMaskComposite: "xor",
            }}
          />

          {/* Light refraction spotlight */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{
              background: `radial-gradient(circle at ${spotlight.x}% ${spotlight.y}%, color-mix(in srgb, var(--accent-primary) 8%, transparent) 0%, transparent 60%)`,
            }}
          />

          {/* Content (raised with transform for 3D depth) */}
          <div className="h-full flex flex-col" style={{ transform: "translateZ(30px)" }}>
            <h3 className="type-card mb-3 text-[var(--text-primary)]">
              {title}
            </h3>
            <p className="text-[var(--text-muted)] text-sm leading-relaxed mb-5">
              {description}
            </p>

            {/* Tech stack tags — pushed down so the link sits on the
                card's bottom edge whatever height the row settles at */}
            <div className="flex flex-wrap gap-2 mb-4 mt-auto">
              {techStack.map((tech) => (
                <span
                  key={tech}
                  className="eyebrow px-2 py-1 border text-[var(--accent-primary)]"
                  style={{ borderColor: "var(--border-subtle)", borderRadius: "var(--radius-chip)" }}
                >
                  {tech}
                </span>
              ))}
            </div>

            {/* View link. Always drawn: hiding it until hover left the
                card with dead space at the bottom, gave touch visitors no
                affordance at all, and — since it stayed focusable — sent
                keyboard focus to something invisible. Only the arrow
                moves on hover now — the 0.8 idle opacity it used to
                carry went with it, because it put the label at 3.87:1
                in light mode, under AA. */}
            {link && (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-mono text-xs text-[var(--accent-primary)]"
              >
                {viewLabel}
                <svg
                  className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
