import { ListBullets, SquaresFour } from "@phosphor-icons/react";
import { Button } from "./Button";

type Layout = "grid" | "list";
type Props = { value: Layout; onChange: (layout: Layout) => void; label: string };

const views = [
  { value: "grid", label: "Grid view", Icon: SquaresFour },
  { value: "list", label: "List view", Icon: ListBullets },
] as const;

export default function ViewLayoutControl({ value, onChange, label }: Props) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex shrink-0 items-center gap-1 rounded-2xl border-2 border-outline p-1"
    >
      {views.map(({ value: layout, label: title, Icon }) => (
        <Button
          key={layout}
          variant="plain"
          size="compact-icon"
          aria-label={title}
          title={title}
          aria-pressed={value === layout}
          onClick={() => onChange(layout)}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border-0 bg-transparent p-0 leading-none text-foreground shadow-none transition-colors hover:bg-secondary aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary motion-reduce:transition-none [&>svg]:block"
        >
          <Icon size={18} weight="regular" aria-hidden="true" />
        </Button>
      ))}
    </div>
  );
}
