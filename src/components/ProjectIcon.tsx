import { isProjectIcon } from "../utils/projectIcon";

export default function ProjectIcon({
  icon,
  className = "",
}: {
  icon?: string;
  className?: string;
}) {
  if (!isProjectIcon(icon)) return null;
  return (
    <img
      src={icon}
      alt=""
      className={`shrink-0 rounded-xl border-2 border-outline bg-surface object-contain ${className}`}
    />
  );
}
