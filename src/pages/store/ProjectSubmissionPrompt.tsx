import { CloseButton } from "../../components/CloseButton";
import { Plus, RocketLaunch } from "@phosphor-icons/react";
import { Button } from "../../components/Button";

type Props = {
  hasSubmittedProject: boolean;
  showForm: boolean;
  onSubmit: () => void;
  onDismiss?: () => void;
  className?: string;
  loading?: boolean;
};

export default function ProjectSubmissionPrompt({
  hasSubmittedProject,
  showForm,
  onSubmit,
  onDismiss,
  className = "",
  loading = false,
}: Props) {
  return (
    <div
      className={`toon-card relative min-w-0 rounded-2xl bg-secondary p-4 text-foreground ${loading ? "startup-placeholder pointer-events-none" : "motion-safe:animate-content-in"} ${className}`}
      aria-busy={loading}
      aria-hidden={loading || undefined}
    >
      <div className="flex items-start gap-2">
        <RocketLaunch size={22} weight="duotone" aria-hidden="true" className="shrink-0" />
        <h2
          className={`grid min-w-0 flex-1 text-base font-black leading-tight ${loading ? "animate-pulse motion-reduce:animate-none rounded-lg bg-divider/40 text-transparent" : ""}`}
          aria-hidden={loading || undefined}
        >
          <span aria-hidden="true" className="invisible col-start-1 row-start-1">
            No projects submitted yet
          </span>
          <span className="col-start-1 row-start-1">
            {hasSubmittedProject ? "Share your next build" : "No projects submitted yet"}
          </span>
        </h2>
        {onDismiss && (
          <CloseButton
            onClick={onDismiss}
            disabled={loading}
            aria-label="Dismiss project submission prompt"
          />
        )}
      </div>
      <p
        className={`mt-2 grid text-sm font-bold ${loading ? "animate-pulse motion-reduce:animate-none rounded-lg bg-divider/40 text-transparent" : "text-body"}`}
        aria-hidden={loading || undefined}
      >
        <span aria-hidden="true" className="invisible col-start-1 row-start-1">
          Share your build and get community feedback.
        </span>
        <span className="col-start-1 row-start-1">
          {hasSubmittedProject
            ? "Share something new with the community."
            : "Share your build and get community feedback."}
        </span>
      </p>
      <Button
        variant="primary"
        size="small"
        onClick={onSubmit}
        aria-haspopup="dialog"
        aria-expanded={showForm}
        aria-controls="submit-project"
        className="mt-3"
        disabled={loading}
      >
        <Plus size={18} weight="bold" aria-hidden="true" />
        Submit project
      </Button>
    </div>
  );
}
