import { useEffect, useId, useState, type ComponentProps } from "react";
import { Check, CircleNotch, X } from "@phosphor-icons/react";
import { isValidUsername, USERNAME_HELP, USERNAME_PATTERN } from "../utils/username";
import Input from "./Input";
import { getProfileRepo } from "../data/factory";

export type DisplayNameStatus = "idle" | "checking" | "available" | "taken" | "error";

type Props = Omit<ComponentProps<typeof Input>, "value"> & {
  value: string;
  profileId: string;
  currentName: string;
  /** Reports availability changes so forms can block submit on "taken". */
  onStatusChange?: (status: DisplayNameStatus) => void;
  showStatus?: boolean;
};

export default function DisplayNameInput({
  value,
  profileId,
  currentName,
  onStatusChange,
  showStatus = false,
  ...props
}: Props) {
  const statusId = useId();
  const name = value.trim();
  const [result, setResult] = useState<{
    name: string;
    status: "available" | "taken" | "error";
  } | null>(null);
  const unchanged = !!name && name.toLowerCase() === currentName.trim().toLowerCase();
  const valid = unchanged || isValidUsername(name);
  const status = !valid
    ? "idle"
    : unchanged
      ? "available"
      : result?.name === name
        ? result.status
        : "checking";

  useEffect(() => {
    if (!valid || unchanged) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const existing = await getProfileRepo().getProfileByName(name);
        if (!cancelled)
          setResult({
            name,
            status: existing && existing.id !== profileId ? "taken" : "available",
          });
      } catch {
        if (!cancelled) setResult({ name, status: "error" });
      }
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [name, profileId, valid, unchanged]);

  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  const message =
    status === "taken"
      ? "That username is already taken."
      : status === "available"
        ? "Username available."
        : status === "checking"
          ? "Checking username…"
          : status === "error"
            ? "Could not check availability. Try saving again."
            : "";
  return (
    <span className="block">
      <span className="relative block">
        <Input
          {...props}
          minLength={unchanged ? undefined : 3}
          maxLength={unchanged ? Math.max(30, value.length) : 30}
          pattern={unchanged ? undefined : USERNAME_PATTERN}
          title={USERNAME_HELP}
          value={value}
          className={`pr-12 ${props.className ?? ""}`}
          aria-invalid={status === "taken" || (!!name && !valid) || undefined}
          aria-describedby={statusId}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-4 flex items-center"
        >
          {status === "available" && <Check size={22} weight="bold" className="text-green-600" />}
          {status === "taken" && <X size={22} weight="bold" className="text-red-600" />}
          {status === "checking" && <CircleNotch size={22} className="animate-spin text-muted" />}
        </span>
      </span>
      <span className="mt-2 block text-xs text-muted">{USERNAME_HELP}</span>
      <span
        id={statusId}
        role="status"
        className={
          showStatus || status === "taken" || status === "error"
            ? "mt-2 block text-sm font-bold"
            : "sr-only"
        }
      >
        {message}
      </span>
    </span>
  );
}
