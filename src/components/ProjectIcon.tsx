import { isProjectIcon } from "../utils/projectIcon";
import { useState } from "react";
import { initials } from "./Avatar";
import ProjectPlaceholder from "./ProjectPlaceholder";

export default function ProjectIcon({
  icon,
  className = "",
  fallback,
  color = "primary",
}: {
  icon?: string;
  className?: string;
  fallback?: string;
  color?: string;
}) {
  const [failedIcon, setFailedIcon] = useState<string | null>(null);
  const classes = `shrink-0 rounded-xl border-2 border-outline bg-surface object-contain ${className}`;
  if (!isProjectIcon(icon) || failedIcon === icon) {
    return fallback !== undefined ? (
      <span
        data-project-icon-placeholder
        aria-hidden="true"
        className={`inline-flex overflow-hidden ${classes}`}
      >
        <ProjectPlaceholder
          as="span"
          title={fallback}
          color={color}
          monogram={initials(fallback) || "?"}
          className="h-full w-full"
          letterClassName="text-inherit"
        />
      </span>
    ) : null;
  }
  return (
    <img
      src={icon}
      alt=""
      onError={() => setFailedIcon(icon)}
      loading="lazy"
      decoding="async"
      className={classes}
    />
  );
}
