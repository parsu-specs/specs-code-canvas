import { useId, useState, type ReactNode } from "react";
import { Info as InfoIcon } from "@phosphor-icons/react";
import { Button } from "./Button";
import Popover from "./Popover";

/** Reusable description popup, independent of experimental settings. */
export default function Info({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <Popover
      autoFlip
      id={id}
      label={`About ${label}`}
      open={open}
      onOpenChange={setOpen}
      className="w-48 lg:w-72 gap-2 p-4"
      trigger={
        <Button
          variant="plain"
          aria-label={`About ${label}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? id : undefined}
          onClick={() => setOpen(!open)}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <InfoIcon size={19} weight="duotone" aria-hidden="true" />
        </Button>
      }
    >
      <p className="text-sm font-black">{label}</p>
      <div className="text-sm font-bold text-body">{children}</div>
    </Popover>
  );
}
