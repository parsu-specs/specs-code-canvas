import { useId, type ReactNode } from "react";
import Info from "./Info";
import Toggle from "./Toggle";

export default function SettingToggle({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const descriptionId = useId();
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 py-1">
      <div className="flex min-w-0 items-center gap-1 flex-1">
        <h3 className="text-sm font-black flex-1">{label}</h3>
        <Info label={label}>{description}</Info>
      </div>
      <span id={descriptionId} className="sr-only">
        {description}
      </span>
      <Toggle
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={label}
        aria-describedby={descriptionId}
      />
    </div>
  );
}
