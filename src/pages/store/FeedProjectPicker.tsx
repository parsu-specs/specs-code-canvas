import { useState } from "react";
import { Check, MagnifyingGlass } from "@phosphor-icons/react";
import { Button } from "../../components/Button";
import Input from "../../components/Input";
import Modal from "../../components/Modal";
import type { AppItem, Profile, User } from "../../data/types";
import { isTaggedCollaborator } from "../../utils/notifications";
import { userFacingError } from "../../utils/userFacingError";

type Props = {
  projects: AppItem[];
  profiles: Profile[];
  user: User | null;
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
};

export default function FeedProjectPicker({
  projects,
  profiles,
  user,
  selectedId,
  onSelect,
  onClose,
  loading = false,
  error,
  onRetry,
}: Props) {
  const [scope, setScope] = useState<"mine" | "all">(user ? "mine" : "all");
  const [query, setQuery] = useState("");
  const search = query.trim().toLowerCase();
  const visibleProjects = projects.filter((project) => {
    const mine =
      user &&
      ((project.creatorId
        ? project.creatorId === user.id
        : project.creator.toLowerCase() === user.name.toLowerCase()) ||
        isTaggedCollaborator(project, user, profiles));
    return (
      (scope === "all" || mine) &&
      `${project.title} ${project.creator}`.toLowerCase().includes(search)
    );
  });
  const select = (id: string) => {
    onSelect(id);
    onClose();
  };

  return (
    <Modal
      id="feed-project-picker"
      title="Link a project"
      description="Choose a personal project, a collaboration, or any project in the community."
      onClose={onClose}
      fixedHeight
    >
      <div className="shrink-0">
        <div role="group" aria-label="Filter projects" className="flex flex-wrap gap-2">
          <Button variant="filter" aria-pressed={scope === "mine"} onClick={() => setScope("mine")}>
            My projects
          </Button>
          <Button variant="filter" aria-pressed={scope === "all"} onClick={() => setScope("all")}>
            All projects
          </Button>
        </div>
        <p className="mt-2 text-sm text-muted">
          {scope === "mine" ? "Projects you created or collaborate on." : "All community projects."}
        </p>
        <label className="relative mt-3 block">
          <span className="sr-only">Search projects</span>
          <MagnifyingGlass
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by project or creator..."
            className="min-h-11 pl-9"
          />
        </label>
      </div>
      <div className="scrollbar-minimal -mx-1 mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-1">
        {loading && (
          <p role="status" className="mt-3 text-sm text-muted">
            Loading projects...
          </p>
        )}
        {error && (
          <div role="alert" className="mt-3 text-sm">
            <p>{userFacingError(error)}</p>
            <Button variant="outline" onClick={onRetry} className="mt-2">
              Retry
            </Button>
          </div>
        )}
        <ul aria-label="Projects" className="space-y-2">
          {visibleProjects.map((project) => (
            <li key={project.id}>
              <Button
                variant="outline"
                fullWidth
                aria-pressed={selectedId === project.id}
                onClick={() => select(project.id)}
                className="min-h-11 justify-between! bg-surface text-left"
              >
                <span className="min-w-0">
                  <span className="block font-black">{project.title}</span>
                  <span className="block text-sm font-normal text-muted">by {project.creator}</span>
                </span>
                {selectedId === project.id && <Check size={20} weight="bold" aria-hidden="true" />}
              </Button>
            </li>
          ))}
        </ul>
        {!loading && !error && !visibleProjects.length && (
          <p role="status" className="py-6 text-center text-sm text-muted">
            {search
              ? "No matching projects. Try another search or filter."
              : scope === "mine"
                ? "No personal projects or collaborations yet. Browse All projects to link one."
                : "No projects available yet."}
          </p>
        )}
      </div>
    </Modal>
  );
}
