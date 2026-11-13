import { ArrowUpRight, Megaphone, Sparkle } from "@phosphor-icons/react";
import { Button } from "../../components/Button";
import ProjectImage from "../../components/ProjectImage";
import ProjectPlaceholder from "../../components/ProjectPlaceholder";
import type { AppItem } from "../../data/types";
import type { OfficialAnnouncement } from "../../data/feedHighlights";

type Props = {
  projects: AppItem[];
  announcements: OfficialAnnouncement[];
  openApp: (id: string) => void;
};

export default function FeedHighlights({ projects, announcements, openApp }: Props) {
  return (
    <div className="space-y-6">
      <section aria-labelledby="feed-featured-title" className="toon-card bg-surface p-4 sm:p-5">
        <h2 id="feed-featured-title" className="flex items-center gap-2 text-lg font-black">
          <Sparkle size={22} weight="duotone" className="text-primary" aria-hidden="true" />
          Featured apps
        </h2>
        <p className="mt-1 text-sm text-muted">Selected projects from the community.</p>
        {projects.length ? (
          <ul className="mt-4 space-y-3">
            {projects.map((project) => (
              <li key={project.id}>
                <Button
                  variant="plain"
                  onClick={() => openApp(project.id)}
                  aria-label={`Open ${project.title}`}
                  className="flex min-h-11 w-full items-start gap-3 rounded-xl p-2 text-left transition-colors hover:bg-background"
                >
                  <span className="relative block aspect-square w-16 shrink-0 overflow-hidden rounded-lg border-2 border-outline">
                    {project.screenshots?.[0] ? (
                      <ProjectImage
                        src={project.screenshots[0]}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ProjectPlaceholder
                        title={project.title}
                        color={project.color}
                        className="h-full w-full"
                        letterClassName="text-2xl"
                      />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black">{project.title}</span>
                    <span className="mt-0.5 block text-xs text-muted">by {project.creator}</span>
                    <span className="mt-1 line-clamp-2 block text-sm text-body">
                      {project.description}
                    </span>
                  </span>
                  <ArrowUpRight size={18} className="shrink-0 text-primary" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-xl bg-background p-4 text-sm text-muted">
            Featured apps will appear here. Check back soon.
          </p>
        )}
      </section>
      <section
        aria-labelledby="feed-announcements-title"
        className="toon-card bg-surface p-4 sm:p-5"
      >
        <h2 id="feed-announcements-title" className="flex items-center gap-2 text-lg font-black">
          <Megaphone size={22} weight="duotone" className="text-primary" aria-hidden="true" />
          Official announcements
        </h2>
        <p className="mt-1 text-sm text-muted">Updates from the CodeCanvas team.</p>
        {announcements.length ? (
          <ul className="mt-4 space-y-4">
            {announcements.map((announcement) => (
              <li key={announcement.id} className="border-t-2 border-dashed border-divider pt-4">
                <article>
                  <time
                    dateTime={announcement.publishedAt}
                    className="text-xs font-bold text-muted"
                  >
                    {new Date(announcement.publishedAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      ...(announcement.publishedAt.length === 10 ? { timeZone: "UTC" } : {}),
                    })}
                  </time>
                  <h3 className="mt-1 text-base font-black">{announcement.title}</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-body">
                    {announcement.body}
                  </p>
                </article>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-xl bg-background p-4 text-sm text-muted">
            No official announcements yet.
          </p>
        )}
      </section>
    </div>
  );
}
