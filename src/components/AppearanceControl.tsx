import { useState, useSyncExternalStore } from "react";
import { Desktop, Moon, Sun } from "@phosphor-icons/react";
import { Button } from "./Button";
import { appearanceSnapshot, subscribeAppearance, type Appearance } from "../utils/appearance";
import { useAuth } from "../auth/authContext";

const modes = [
  { id: "light", label: "Light", Icon: Sun },
  { id: "dark", label: "Dark", Icon: Moon },
  { id: "system", label: "System", Icon: Desktop },
] as const;

export default function AppearanceControl({ compact = false }: { compact?: boolean }) {
  const { updateAppearance, appearanceSaving } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const pickAppearance = async (next: Appearance) => {
    setError(null);
    try {
      await updateAppearance(next);
      setError(null);
    } catch {
      setError("Could not save appearance. Please try again.");
    }
  };
  const snapshot = useSyncExternalStore(
    subscribeAppearance,
    appearanceSnapshot,
    () => "system:light",
  );
  const [appearance, resolved] = snapshot.split(":");

  if (compact) {
    const dark = resolved === "dark";
    return (
      <div className="relative">
        <Button
          variant="surface"
          size="compact-icon"
          onClick={() => void pickAppearance(dark ? "light" : "dark")}
          aria-label={`Switch to ${dark ? "light" : "dark"} mode`}
          title={`Switch to ${dark ? "light" : "dark"} mode`}
          className="relative text-foreground"
        >
          {dark ? (
            <Sun size={20} weight="duotone" aria-hidden="true" />
          ) : (
            <Moon size={20} weight="duotone" aria-hidden="true" />
          )}
        </Button>
        {error && (
          <p
            role="alert"
            className="absolute right-0 top-full mt-2 w-60 rounded-xl border-2 border-outline bg-panel p-3 text-sm font-bold text-foreground"
          >
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div
        role="group"
        aria-label="Appearance"
        className="mt-4 flex flex-wrap gap-3"
        aria-busy={appearanceSaving}
      >
        {modes.map(({ id, label, Icon }) => (
          <Button
            key={id}
            variant="filter"
            size="small"
            aria-pressed={appearance === id}
            onClick={() => void pickAppearance(id)}
          >
            <Icon size={20} weight="duotone" aria-hidden="true" />
            {label}
          </Button>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm font-bold">
          {error}
        </p>
      )}
    </div>
  );
}
