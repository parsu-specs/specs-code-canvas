import { Suspense, useId, useState } from "react";
import { ShareNetwork } from "@phosphor-icons/react";
import { Button, type ButtonVariant } from "./Button";
import Modal from "./Modal";
import { RowsSkeleton } from "./Skeleton";
import { lazyPage } from "../utils/lazyPage";
import type { AppItem, Profile } from "../data/types";

const ShareDialogContent = lazyPage(() => import("./ShareDialogContent"));

type Props = ({ app: AppItem; profile?: never } | { profile: Profile; app?: never }) & {
  variant?: ButtonVariant;
  size?: "small" | "compact";
  className?: string;
  iconOnly?: boolean;
};

export default function ShareButton({
  app,
  profile,
  variant = "outline-flat",
  size = "small",
  className,
  iconOnly = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const title = app?.title ?? profile!.name;
  return (
    <span
      className={`inline-flex min-w-0 max-w-full ${className ?? ""}`}
      onClick={(event) => event.stopPropagation()}
    >
      <Button
        variant={variant}
        size={size === "compact" && iconOnly ? "compact-icon" : size}
        className={`${iconOnly ? "min-h-8 min-w-8" : ""} max-sm:min-h-11 max-sm:min-w-11 max-sm:gap-0 max-sm:border-0 max-sm:bg-transparent max-sm:p-2 max-sm:hover:bg-transparent`}
        onClick={() => setOpen(true)}
        aria-label={`Share ${title}`}
        title={`Share ${title}`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <ShareNetwork size={size === "compact" ? 16 : 18} weight="bold" aria-hidden="true" />
        {!iconOnly && <span className="hidden sm:inline">Share</span>}
      </Button>
      {open && (
        <Modal
          id={`share-${id}`}
          title={`Share ${title}`}
          description={
            app
              ? "Choose a link or create a share photo for your project."
              : "Share this developer's profile or create a share photo."
          }
          onClose={() => setOpen(false)}
        >
          <Suspense fallback={<RowsSkeleton label="Loading sharing options" />}>
            <ShareDialogContent id={id} app={app} profile={profile} />
          </Suspense>
        </Modal>
      )}
    </span>
  );
}
