import { useState, useEffect } from "react";
import ProjectCard from "./ProjectCard";
import ProjectCardStatic from "./ProjectCardStatic";

/* ================================================================
    ProjectsGridAdapter.tsx
    Renders static flat cards initially (SSR-safe).
    Upgrades to 3D tilt cards on desktop after hydration.

    Purely presentational: every card's title, description, tech
    stack and link are resolved server-side by Projects.astro (from
    src/config.ts, in the page's language) and passed in as props —
    this component imports no data of its own.
    ================================================================ */

interface ProjectItem {
  title: string;
  description: string;
  tech: string[];
  link: string;
}

interface Props {
  items: ProjectItem[];
  viewLabel: string;
}

export default function ProjectsGridAdapter({ items, viewLabel }: Props) {
  const [useInteractive, setUseInteractive] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) setUseInteractive(true);
  }, []);

  const Card = useInteractive ? ProjectCard : ProjectCardStatic;

  return (
    <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
      {items.map((item, i) => (
        <Card
          key={item.title}
          index={i}
          title={item.title}
          description={item.description}
          techStack={item.tech}
          link={item.link}
          viewLabel={viewLabel}
        />
      ))}
    </div>
  );
}
